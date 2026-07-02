# Zita Boutique — FSD Refactor Completion & Architecture Hardening

Paste sections of this into a **fresh chat in this project** (fresh chats start cold — this doc
is self-contained). Do the tasks **in order**; P1→P3 are cheap and unblock the rest. After each
task, run the verification in the last section before moving on.

> This continues an FSD (Feature-Sliced Design) refactor modeled on `github.com/nxctf/nxctf`
> (cloned locally at `c:\Users\akwis\nxctf`). A previous chat already **got the app building and
> running again** — see "Already done" below. What remains is cleanup + hardening, listed as
> P1–P6.

---

## Background: what this refactor is

The codebase was reorganized from type-based folders (`components/`, `lib/actions/`) into
**Feature-Sliced Design** under `src/`:

- `src/app/` — Next.js routes (thin; render features/widgets)
- `src/features/<slice>/` — domain slices, each with `components/ hooks/ services/ lib/ types/`
  and a public `index.ts` barrel
- `src/widgets/` — multi-feature UI blocks (admin-nav, storefront-nav)
- `src/shared/` — `ui/` (shadcn/Base UI atoms), `components/`, `lib/` (`utils`, `format`, `error`)
- `src/lib/` — `db/` (Drizzle client), `supabase/` (client/server/admin)
- `@/*` → `./src/*` (see `tsconfig.json`)

nxctf is the **organizational** exemplar. **It is NOT a data-layer exemplar** — see the caveat
below. Study it at `c:\Users\akwis\nxctf` when a pattern is unclear (`src/features/auth`,
`src/features/admin`, `src/shared/contexts/AuthContext.tsx`).

---

## Already done (do NOT redo)

The build is green (`npm run build` passes, dev server boots, all routes serve). A prior chat:

- Fixed broken barrels/imports (products `useProductForm` dead export, variants schema path,
  `FavoritesProvider` export, pwa `Monogram` export).
- Fixed two **server/client barrel leaks**: `src/features/pwa` no longer re-exports the
  server-only `lib/send.ts` (was dragging `postgres`/`tls` into the browser); `src/features/categories`
  no longer re-exports the client-only `lib/filter-params.ts` (nuqs parsers) that broke the admin
  server page. Consumers deep-import these instead.
- Deleted leftover test config (`vitest.config.mts`, `playwright.config.ts`); fixed `drizzle.config.ts`.
- **Consolidated middleware**: the refactor had left the admin auth guard in root `proxy.ts`
  (dead, because with `app` under `src/` Next resolves middleware from `src/`) while a new
  `src/middleware.ts` keep-alive was active — so **admin routes were unguarded**. Now there is a
  single `src/proxy.ts` that (a) always runs the admin auth guard and (b) redirects to
  `/maintenance` **only** when `NEXT_PUBLIC_MAINTENANCE_MODE=yes` (env-gated; no DB-ping auto-trip).
  Added `src/app/maintenance/page.tsx`. `proxy.ts` (root) and `src/middleware.ts` were deleted.

**Known out-of-scope issue (flag, don't silently fix):** `drizzle-kit@0.18.1` is badly mismatched
with `drizzle-orm@0.45.2` (needs ~0.31). `drizzle.config.ts` was reshaped to satisfy the installed
type so the build passes, but `db:generate`/`db:migrate` likely won't work until drizzle-kit is
bumped. Ask the user before upgrading.

---

## ⚠️ The one caveat that governs everything below

**nxctf is Next 14 with client-side Supabase.** Its "services" call `supabase.from(...)` **from the
browser**, and security is enforced entirely by the **database** — RLS policies + `SECURITY DEFINER`
RPCs that check `is_admin()` internally (e.g. `grant_event_admin` starts with
`IF NOT is_admin() THEN RAISE EXCEPTION`).

**Zita is different and better on the write path:** mutations go through **server actions →
Drizzle → a direct Postgres connection (`DATABASE_URL`)**, which **bypasses RLS entirely** (Drizzle
does not use PostgREST or the user's JWT). Keep this — do **not** port nxctf's "call Supabase from
the client/service" write model back in; that would reintroduce the barrel-leak class of bug and
lose the server boundary.

Consequences you must respect:

- **The DB is NOT the gate for zita's server-action mutations** (RLS doesn't run on that path).
  Authorization for writes must live **in the server action** (see P3).
- **Admin UI gating must stay server-side** (server-component layout), not a client shell like
  nxctf's `AdminRouteShell`. If gated only on the client, the server component would render and
  Drizzle would return real data to a non-admin before any client redirect — a data leak.
- Take from nxctf its **organization and error discipline** (service→hook→component; `{ error }`
  return objects; thin layouts), not its IO location.

What zita **already** matches from nxctf (don't "add" these — they exist):
error-object returns on every server action + `AuthService`; `getErrorMessage` at
`src/shared/lib/error.ts`; env-validated `src/config.ts` (better than nxctf's raw `process.env`);
DB connection cache in `src/lib/db/index.ts`; realtime decoupled into hooks (storefront chat only —
see P2).

---

## P1 — Restructure admin into `features/admin/*` (nxctf-aligned) _(DECIDED: option A)_

**Decision (user-approved):** finish the exemplar's pattern instead of deleting the empty dirs.
nxctf treats **admin as its own top-level feature domain** — `features/admin/<resource>` per resource

- `features/admin/ui/` for admin shell primitives — and admin slices **depend on the domain feature**
  for shared bits (e.g. nxctf's `admin/challenges` imports `@/features/challenges/lib`). Zita instead
  inlined admin as `features/<domain>/components/admin/`, which left the domain barrels mixed
  (`features/products/index.ts` exports storefront cards **and** heavy admin editors — dnd-kit,
  react-dropzone). Splitting admin out makes each domain barrel lean by construction.

**Three top-level groups** (decided): `features/storefront/*` (customer app), `features/admin/*`
(seller app), and `features/auth/` **flat** — the one genuinely shared feature (customer login +
server `admin-guard`), belonging to neither group. This is symmetric grouping; it **deliberately
diverges from nxctf** (which keeps domain features flat) because zita has a real storefront/admin
duality nxctf lacks. It is safe because **reads split with zero overlap** — no query is used by both
apps (verified), so there are **no `admin → storefront` back-dependencies**.

**Dependency rule:** `features/admin/*` and `features/storefront/*` may both depend on `features/auth`
and on `src/shared` + `src/lib`. They must **not** import each other. Within a group, cross-slice
imports are fine (e.g. `admin/products` pages read `getAllCategories` from `admin/categories`).

Target structure:

```
features/
  storefront/                       # CUSTOMER app  (no inner components/storefront split — grouping is now at top)
    products/     components/ (FeedCard, GridCard, ProductGallery, ProductPanel, ProductSwiper,
                  │            QuickAddButton, ColorSquares, ColorStrip)
                  services/ (storefront reads: getHomeFeed, getHomeFilters, getProductBySlug, getCategorySwipeList)
                  lib/ (feed-rhythm, product-detail)  consts/ (variant-presets)  types/  index.ts
    categories/   components/ (CategoryBanner, AppliedChips, FilterSheet, SortControl)
                  services/ (getCategoryProducts, getCategoryBySlug, getCategoryIndex, getCategoryProductMeta)
                  lib/ (filters, filter-params)  consts/ (category-filter-presets)  index.ts
    chat/         components/ (GuestChat, ChatPresence, ProductInquiryCard)  hooks/  index.ts
    orders/       services/place.ts (placeOrder, getMyLatestOrderDetails — PUBLIC/customer)  index.ts
    bag/          favorites/          # unchanged internals, just relocated under storefront/
  admin/                             # SELLER app
    ui/           # ← shared/components/admin/ui: EditorHeader, MediaZone, FieldRow, SubScreen,
                  #   SectionCard, FloatingLabelInput, FilterChips, ListRow, SortableImageGrid
    overview/     services/ (getDashboardStats, getRecentProducts)
    products/     components/ (ProductEditor, ProductImageManager, ProductThumb, ProductsBulkEdit,
                  │            ProductsList, VariantBuilder, VariantManager, VariantStager)
                  hooks/ (useProductForm — P5)
                  services/ (product+variant WRITES, schemas, reads: getAllProducts, getProductById)
    categories/   components/ (CategoriesTable, CategoryDialog, CategoryFilterManager)
                  services/ (category+filter WRITES, schemas, reads: getAllCategories, getAllCategoryFilters, getCategoryFilters)
    chat/         components/ (ChatConversation, InboxRealtime)  hooks/ (useAdminChat, useInboxRealtime)
                  services/ (sendAdminMessage, reads: getAllChatSessions, getChatSession, getChatMessages)
    orders/       components/ (OrdersList, OrdersRealtime)  hooks/ (useOrdersRealtime)
                  services/ (updateOrderStatus, reads: getAllOrders)
  auth/           components/ (LoginForm, LogoutButton, CustomerAuthForm, AccountView)
                  hooks/ (useCustomer)  services/ (auth.service.ts, admin-guard.ts [P3])  index.ts
  pwa/            components/ (EnableNotifications, ServiceWorkerRegistrar)  services/ (push, push.schema)
                  lib/ (monogram, send)  index.ts      # stays FLAT (app-wide, not storefront-only)
```

`auth` and `pwa` stay **flat** (neither storefront- nor admin-exclusive — both apps use them).

### Infrastructure — `src/lib/` (db + supabase)

Two peers, split on the RLS boundary (the same one that forces `requireAdmin` in P3). Do **not** merge
them — Drizzle bypasses RLS; the Supabase clients are the RLS/auth path. Blurring that hides the one
distinction that governs security here.

```
src/lib/                    # stateful backend infrastructure (connections & clients)
  db/                       # Drizzle — direct Postgres. Server-only. BYPASSES RLS.
    index.ts                #   cached `db` client
    schema.ts               #   table defs = single source of truth (drizzle-zod). Stays central.
    (queries.ts DELETED — dismantled into feature services by P1b)
  supabase/                 # Supabase SDK — auth / realtime / storage. RLS + auth path.
    client.ts (browser/anon)   server.ts (SSR cookie — getUser, admin-guard)   admin.ts (service-role)
```

- **Delete (all empty/dead):** `src/lib/drizzle/` (0-byte client.ts, empty migrate.ts + schema.ts),
  `src/lib/storage/`, `src/lib/scripts/`.
- Add a one-line header comment to each `db`/`supabase` file stating its trust property so nobody
  grabs `db` (RLS-bypassing) where the RLS-scoped client was meant, or vice-versa.
- `src/shared/lib/` (utils: cn, format, error) is a **separate** concern from `src/lib/` (infra
  clients) — matches nxctf; leave it.

**Services are NOT shared** — split by authorization scope like nxctf (`features/teams` reads _my_
team; `features/admin/teams` reads _all_ teams). **Verified: zero query overlap** between the two
apps, so each read lands in exactly one group. The old feature "services" (`products.ts`,
`variants.ts`, `categories.ts`, …) are **100% admin writes**. Full relocation in **P1b**.

### P1a — Components / UI restructure

1. Create `src/features/admin/ui/` and **move** `src/shared/components/admin/ui/*` into it.
   Update every importer: `@/shared/components/admin/ui` → `@/features/admin/ui`
   (grep: `grep -rln "shared/components/admin/ui" src/`). Give it an `index.ts` barrel.
2. **Admin side:** for each domain, move `features/<domain>/components/admin/*` →
   `features/admin/<domain>/components/*` (flat — no inner `admin/`), add `features/admin/<domain>/index.ts`.
3. **Storefront side:** move each storefront feature under the group:
   `features/{products,categories,chat,bag,favorites,orders,pwa}` → `features/storefront/<same>`.
   The inner `components/storefront/` folder **flattens to `components/`** (grouping is now at the top).
   Rewire `@/features/<x>` → `@/features/storefront/<x>`. `features/auth` stays flat.
4. Rewire page imports: `src/app/admin/(panel)/**` → `@/features/admin/<domain>`;
   `src/app/(storefront)/**` → `@/features/storefront/<domain>`. Admin components import primitives from
   `@/features/admin/ui`; both groups may import `@/features/auth`, `@/shared`, `@/lib`.
5. **Services** — do the full scope-split in **P1b** below.
6. Admin nav (`src/widgets/admin-nav/*`) may stay in `widgets/` or move to `features/admin/ui/` — optional.

Also in this pass — **confirmed dead, delete** (verified imported nowhere):

- `src/lib/drizzle/` — a **second, dead Drizzle setup**, entirely empty (`client.ts` 0 bytes,
  `migrate.ts` empty, `schema.ts` 0 lines). Imported **nowhere**; the real one is `@/lib/db` (37 importers).
  Delete the whole dir. Also delete empty `src/lib/storage/` and `src/lib/scripts/`.
- **Root `drizzle/`** (project root, not `src/`) — empty stale drizzle-kit output dir; the config sends
  `out` to `supabase/migrations`. Delete. (Root `supabase/` STAYS — it's the real migrations +
  `meta/` snapshots + `policies/rls.sql`.)
- `src/widgets/notifications/`, `src/widgets/pwa/`, `src/widgets/theme/` — **empty** dirs. Checked the
  use-sites: theme = `ThemeProvider`+`Toaster` cleanly in root layout; PWA pieces are mounted at
  different scopes (`ServiceWorkerRegistrar` in storefront layout, `EnableNotifications` on the chat
  page) so a wrapper would be wrong. Nothing to extract — just delete the empty dirs.
- `src/features/catalog/` — empty `index.ts`, unused (`grep -rn "@/features/catalog" src/`).
- `src/_layouts/NavBar.tsx` / `Footer.tsx` — empty & unused; check `src/_layouts/index.ts` too.
- Any dir left empty by the move: `find src/features src/widgets -type d -empty`.

Verify: `npm run build` passes; storefront and admin groups don't import each other —
`grep -rn "@/features/admin" src/features/storefront` **and** `grep -rn "@/features/storefront" src/features/admin`
are both empty; storefront barrels export no admin components.

### P1b — Split services by authorization scope (dismantle `lib/db/queries.ts`)

nxctf co-locates services per feature and splits **player vs admin** (`features/teams/services/team.service.ts`
= my team; `features/admin/teams/services/admin-teams.service.ts` = all teams). Zita's equivalent is
tangled: **all storefront reads live in one 700-line `src/lib/db/queries.ts` god-module**, and the feature
"services" are 100% admin writes. Untangle both.

**Stays central (do NOT move):** `src/lib/db/schema.ts` (Drizzle table defs — the real single source of
truth) and `src/lib/db/index.ts` (client). Only `queries.ts` is dismantled.

Relocation map:

Read consumers were audited: **no query is used by both apps** (verified by grep across
`app/(storefront)` vs `app/admin`). Each read below goes to exactly one group — do not guess from
the name (e.g. `getAllProducts`/`getAllCategories` are **admin**, not storefront).

| From                                                                    | Symbols                                                                          | → To                                                                 |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `lib/db/queries.ts`                                                     | getHomeFeed, getHomeFilters, getProductBySlug, getCategorySwipeList              | `features/storefront/products/services/product-queries.ts`           |
| `lib/db/queries.ts`                                                     | getCategoryProducts, getCategoryBySlug, getCategoryIndex, getCategoryProductMeta | `features/storefront/categories/services/category-queries.ts`        |
| `lib/db/queries.ts`                                                     | **getAllProducts, getProductById** (admin list/edit)                             | `features/admin/products/services/product-queries.ts`                |
| `lib/db/queries.ts`                                                     | **getAllCategories, getAllCategoryFilters, getCategoryFilters** (admin)          | `features/admin/categories/services/category-queries.ts`             |
| `lib/db/queries.ts`                                                     | getDashboardStats, getRecentProducts                                             | `features/admin/overview/services/`                                  |
| `lib/db/queries.ts`                                                     | getAllOrders                                                                     | `features/admin/orders/services/`                                    |
| `lib/db/queries.ts`                                                     | getAllChatSessions, getChatSession, getChatMessages                              | `features/admin/chat/services/`                                      |
| `products/services/products.ts`                                         | all write actions (create/update/delete/upload/reorder/bulk/…)                   | `features/admin/products/services/products.ts`                       |
| `products/services/products.ts`                                         | **sendAdminMessage** (misplaced — it's chat)                                     | `features/admin/chat/services/`                                      |
| `products/services/variants.ts` (+ variants.schema.ts)                  | all variant writes                                                               | `features/admin/products/services/`                                  |
| `products/services/products.schema.ts`                                  | product form schema (admin-only)                                                 | `features/admin/products/services/`                                  |
| `categories/services/categories.ts` + `category-filters.ts` (+ schemas) | category + filter writes                                                         | `features/admin/categories/services/`                                |
| `orders/services/orders.ts`                                             | updateOrderStatus                                                                | `features/admin/orders/services/`                                    |
| `orders/services/place.ts`                                              | placeOrder, getMyLatestOrderDetails                                              | **stays** → `features/storefront/orders/services/` (public/customer) |

Note the admin `getAllCategories` is consumed by `admin/products` pages too (category picker) — that
`admin/products → admin/categories` cross-slice import is fine (same group).

Rules & gotchas:

- **No `admin*` function-name prefix.** nxctf prefixes because player+admin ops collide on the same
  resource; zita has no player `createProduct`/`deleteCategory` to collide with, so renaming is pure
  churn. Relocate files, keep names.
- **Shared types in `queries.ts`** (`HomeCard`, `SwipeCard`, `HomeFilter`, `AdminOrder`,
  `CategoryFilter`, `CategoryProductMeta`, `OrderDetails`): move each to its owning feature's `types/`;
  if a type is used by two features, put it in `src/shared/types/`. Watch for this during the move.
- Admin read services (getAllOrders, getAllChatSessions, getDashboardStats) are called from admin
  **server components** under the P3-gated layout — fine. If any ever moves into a server _action_,
  it must get `requireAdmin()` (P3).
- Rewire every importer of `@/lib/db/queries` (storefront pages, admin pages, api route) to the new
  paths. `grep -rn "@/lib/db/queries" src/` to find them; the file should end up **deleted**.
- Duplicate schema smell to resolve while here: `features/orders/services/` has **both**
  `order.schema.ts` and `orders.schema.ts` — check which is dead and remove it.

Verify: `grep -rn "@/lib/db/queries" src/` is empty (module deleted); `npm run build` green; storefront
routes still serve real data (drive `/`, `/shop`, `/category/dresses`, `/product/agakanzu`).

---

## P2 — Evict Supabase logic from UI components _(the plan's headline goal)_

**Rule to adopt (add to CLAUDE.md, greppable in CI): no `@/lib/supabase/client` import outside
`hooks/` and `services/`.** Components render hook state; hooks own subscriptions/state and call
services; services own Supabase IO and return `{ data, error }`. This mirrors nxctf exactly
(components never import the Supabase client).

Audited offenders (client components with inline Supabase). **Correct as-is:**
`src/app/admin/(panel)/layout.tsx` (server-component auth — leave; but see P3 for extraction).

**Do P1 first** — paths below are the post-restructure locations (admin chat/orders moved to
`features/admin/*`). Refactor these — move the Supabase logic into a co-located hook, mirroring the
already-done `src/features/chat/hooks/useGuestChat.ts` (co-locate admin hooks under
`features/admin/<slice>/hooks/`):

| Component (post-P1)                                               | Move into                                  | Notes                                                                                                                                 |
| ----------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `features/admin/chat/components/ChatConversation.tsx` (202 lines) | `useAdminChat(sessionId, initialMessages)` | The big one: `.channel()` realtime **+** the `.from('chat_message_items')` fetch. Component keeps render + `useTransition` send only. |
| `features/admin/chat/components/InboxRealtime.tsx`                | `useInboxRealtime()`                       | Component becomes a one-line hook caller; keep only `router.refresh()`.                                                               |
| `features/admin/orders/components/OrdersRealtime.tsx`             | `useOrdersRealtime()`                      | Same shape as InboxRealtime.                                                                                                          |
| `features/storefront/chat/components/ChatPresence.tsx`            | `usePresence(sessionId)`                   | Storefront chat. Presence channel → hook.                                                                                             |
| `features/auth/components/AccountView.tsx`                        | use existing `AuthService.signOut()`       | Delete the inline `createClient().auth.signOut()`; the service already exists.                                                        |

Honest priority within P2: the real wins are **ChatConversation** (mixes IO + render) and
**AccountView** (bypasses an existing service). The three tiny realtime components work fine today;
convert them for consistency but they're low-value.

After: `grep -rln "from '@/lib/supabase/client'" $(find src/features -type d -name components)` must be empty.

---

## P3 — Server-side admin guard: thin the layout **and** protect the mutations _(SECURITY — consider doing first)_

Two problems, one fix.

**Problem A — the layout inlines raw Supabase.** `src/app/admin/(panel)/layout.tsx` hard-codes
`createClient()` + `getUser()` + `rpc('is_admin')`. nxctf keeps layouts thin and puts this behind a
service. **Keep it a server component** (must stay server-side per the caveat) but extract the logic.

**Problem B — admin server actions have NO authorization.** `createProduct`, `deleteProduct`,
`updateCategory`, `bulkUpdateProducts`, variant/order/push actions — none check admin. Because
Drizzle bypasses RLS and layouts don't wrap server actions, an authenticated **customer** (customers
exist now) can invoke these directly. This is the DB-side `IF NOT is_admin() THEN RAISE` that nxctf
has and zita lost when it moved writes to Drizzle. It must live in the action.

Fix — one server-only module, reused by both:

```ts
// src/features/auth/services/admin-guard.ts   (server-only; NOT the browser AuthService)
import 'server-only'
import { createClient } from '@/lib/supabase/server'

export async function getAdminUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser() // getUser(), NOT getSession/getClaims
  if (!user) return { user: null, isAdmin: false }
  const { data: isAdmin } = await supabase.rpc('is_admin')
  return { user, isAdmin: !!isAdmin } // fail-closed: rpc error → false
}

export async function requireAdmin() {
  const { isAdmin } = await getAdminUser()
  return isAdmin ? { error: null } : { error: 'Forbidden' } // matches the {error} return pattern
}
```

Layout becomes declarative:

```tsx
const { user, isAdmin } = await getAdminUser()
if (!user) redirect('/admin/login')
if (!isAdmin) redirect('/') // not /admin/login → avoids loop
// ...render shell, pass user.email
```

Every admin mutation gets a top guard (UI needs no change — same `{ error }` shape):

```ts
export async function deleteProduct(id: string) {
  const gate = await requireAdmin()
  if (gate.error) return { error: gate.error }
  // ...existing body
}
```

**Audit each action before gating** — separate admin-only writes from legitimately public ones so
you don't gate a customer path. Public (do NOT gate): order placement (`src/features/orders/services/place.ts`),
guest chat send, push subscription save, anything the storefront calls. Admin-only (gate): product
CRUD, category CRUD, variant CRUD, order status changes, bulk edit.

Note: `is_admin()` in the layout is the **UI gate** (same as nxctf's UI use); `requireAdmin()` in
actions is the **enforcement** (same as nxctf's in-DB `SECURITY DEFINER` check). Both are needed;
they are different jobs.

---

## P4 — Barrel convention to prevent server/client leaks _(maintainability)_

> Largely **satisfied by P1**: once admin is split into `features/admin/*`, the domain barrels stop
> mixing storefront + admin, so the biggest leak vector is gone. This item is now just the residual
> server-only/client-only rule.

The two leaks already fixed were structural, not flukes: a single feature `index.ts` re-exporting
both server-only and client-only code, imported from both sides. Codify the rule so it can't
regress. Add to CLAUDE.md:

- A feature's top `index.ts` must not re-export **server-only** modules (`import 'server-only'`,
  anything importing `@/lib/db`) **nor** client-only value modules (nuqs parser objects, context
  singletons). Export **components** and **`'use server'` action files** (safe — RPC-stubbed) via
  the barrel; import server-only helpers and client-only parsers **by path**.
- Optionally adopt nxctf's **layered sub-barrels** (`components/index.ts`, `hooks/index.ts`) so the
  top barrel composes clean layers.

Verify no other leaks: `npm run build` is the real check (it collects page data and fails on
server/client boundary violations). Also grep server-only modules and confirm none are in a barrel:
`grep -rln "server-only" src/features` then check each isn't re-exported by that feature's `index.ts`.

**Known instance to fix here:** `app/icon.tsx`, `app/apple-icon.tsx`, `app/icons/[variant]/route.tsx`
import `Monogram` from the `@/features/pwa` barrel, which re-exports `push.ts → @/lib/db` (postgres) —
so favicon generators transitively load the DB client. Change all three to the direct import
`@/features/pwa/lib/monogram`. (The 4 Next metadata files — `favicon.ico`, `icon.tsx`, `apple-icon.tsx`,
`manifest.ts` — must **stay** at `app/` root; Next only recognizes them there. They're already thin
adapters over the single `Monogram` generator — leave the placement alone, only fix the import path.)

---

## P5 — `ProductEditor`: react-hook-form + transactional create _(robustness; largest effort)_

CLAUDE.md mandates RHF+Zod for forms; `ProductEditor` still uses raw `useState`, and it chains
`createProduct` → image-upload loop → variant-group loop **client-side**, so a mid-chain failure
leaves an orphaned half-product.

- Introduce `useProductForm` (RHF + `@hookform/resolvers/zod`, schema from
  `features/admin/products/services/products.schema.ts`) under `features/admin/products/hooks/`.
- Add a single server action `createFullProduct(input)` that creates product + images + variant
  groups in **one** transaction (Drizzle `db.transaction(...)`) so partial creation can't happen.
- Keep the `{ error }` return shape.

This is a real feature-refactor — do it as its own focused change with the app driven end-to-end
(create a product, reload, confirm images + variants persisted) per the "verify against the real
app" rule.

---

## P6 — (optional) Harden the maintenance ping

Only relevant if the user later wants **auto** maintenance (currently env-gated only, so moot).
nxctf pings a dedicated `keep-alive` table and **ignores** RLS `42501` (`permission denied`) so a
policy denial doesn't false-trip maintenance. The inherited version pinged `categories` and would
false-trip. If auto-mode is ever enabled, copy nxctf's `checkKeepAliveTable` error-classification
from `c:\Users\akwis\nxctf\src\middleware.ts`.

---

## Suggested order

1. **P3** (admin-guard) — security fix + thins the layout; independent of the move, so land it first.
2. **P1** (restructure into `features/storefront/*` + `features/admin/*`, `auth` flat) — the big structural change, two phases:
   **P1a** moves admin components + `admin/ui`; **P1b** splits services by scope and **deletes the
   `lib/db/queries.ts` monolith**. Do it one domain at a time (products → categories → chat → orders),
   `npm run build` green after each. This is the largest, highest-risk task — likely several commits.
   Deletes the ghost dirs too.
3. **P2** (evict Supabase from UI) — on the moved files; extract admin hooks under `features/admin/*`.
4. **P4** (residual barrel rule) — mostly done by P1; write the CLAUDE.md rule, verify no leaks.
5. **P5** (ProductEditor RHF + transaction) — own focused change.
6. **P6** — skip unless auto-maintenance is wanted.

Rationale for P1 before P2: the admin chat/orders components move in P1, so extracting their hooks in
P2 should target the new `features/admin/*` locations (avoids rewriting the same imports twice).

## P1 commit sequence (one domain at a time — build green before each commit)

Do **P3 first** (independent security fix), then walk P1 domain-by-domain. Never move all four at
once. After every step: `npx tsc --noEmit && npm run build`, then commit. If a build breaks, fix
before moving on — do not stack a second domain on a red build.

Each domain step moves **both** sides at once (admin → `features/admin/<d>`, storefront →
`features/storefront/<d>`, split its reads out of `queries.ts`) so the domain's churn is one commit.

- [ ] **0. Scaffold** — delete confirmed dead code first (`src/lib/{drizzle,storage,scripts}/`, empty
      `src/widgets/{notifications,pwa,theme}/`, `src/features/catalog/`, empty `_layouts` files).
      Create `src/features/admin/ui/`, move `shared/components/admin/ui/*` in, add `index.ts`,
      rewire `@/shared/components/admin/ui` → `@/features/admin/ui`.
      Commit: `refactor(admin): add features/admin/ui; drop dead scaffolding`
- [ ] **1. Products** — admin: `components/admin/*` → `features/admin/products/components/`;
      `products.ts`+`variants.ts`+schemas + reads `getAllProducts`/`getProductById` →
      `features/admin/products/services/`. Storefront: `features/products` → `features/storefront/products`
      (flatten `components/storefront/`→`components/`), reads `getHomeFeed`/`getHomeFilters`/`getProductBySlug`/
      `getCategorySwipeList` → its `services/product-queries.ts`. Rewire both apps' pages.
      Commit: `refactor(products): split into storefront/products and admin/products`
- [ ] **2. Categories** — admin: components + `categories.ts`/`category-filters.ts` + reads
      `getAllCategories`/`getAllCategoryFilters`/`getCategoryFilters` → `features/admin/categories/`.
      Storefront: → `features/storefront/categories`; reads `getCategoryProducts`/`getCategoryBySlug`/
      `getCategoryIndex`/`getCategoryProductMeta` → its `services/`.
      Commit: `refactor(categories): split into storefront/categories and admin/categories`
- [ ] **3. Chat** — admin: `ChatConversation`/`InboxRealtime` → `features/admin/chat/`; `sendAdminMessage`
      (out of `products.ts`) + reads `getAllChatSessions`/`getChatSession`/`getChatMessages` →
      `features/admin/chat/services/`. Storefront: `GuestChat`/`ChatPresence`/`ProductInquiryCard` + hooks
      → `features/storefront/chat`.
      Commit: `refactor(chat): split admin chat from storefront chat`
- [ ] **4. Orders** — admin: `OrdersList`/`OrdersRealtime` + `updateOrderStatus` + `getAllOrders` →
      `features/admin/orders/`. Storefront: `place.ts` (placeOrder, getMyLatestOrderDetails) →
      `features/storefront/orders`. Resolve duplicate `order.schema.ts`/`orders.schema.ts`.
      Commit: `refactor(orders): split admin orders; keep placeOrder in storefront`
- [ ] **5. Remaining storefront** — move `bag`, `favorites` → `features/storefront/*` (`auth` and
      `pwa` stay flat). `getDashboardStats`/`getRecentProducts` → `features/admin/overview/services/`.
      Confirm `src/lib/db/queries.ts` is **empty and deleted** (`grep -rn "@/lib/db/queries" src/` empty);
      `find src/features src/widgets -type d -empty` clean.
      Commit: `refactor(storefront): group remaining storefront features; remove queries god-module`

(`features/auth` stays flat throughout. P2 hook-extraction then targets the already-moved files.)

## Verification (run after each task)

```bash
npx tsc --noEmit          # clean typecheck
npm run build             # real boundary check — must pass "Collecting page data"
npm run dev               # then drive routes (see below)
```

Drive the app (dev server) and confirm — do NOT trust unit-level results (CLAUDE.md: mocked tests
miss framework-boundary bugs):

- `/admin` unauthenticated → 307 → `/admin/login` (guard alive)
- After P3: an authenticated **non-admin** hitting an admin action returns `{ error: 'Forbidden' }`
- `/`, `/shop`, `/bag`, `/chat`, `/category/dresses`, `/product/agakanzu`, `/api/products/agakanzu` → 200
- Admin chat/orders realtime still refresh after P2

Git: conventional commits, **no Claude co-author**, one logical change per commit (e.g.
`refactor(admin): extract server-side admin guard`, `fix(admin): authorize admin mutations`).

```

```
