# Zita Boutique — CLAUDE.md

## The contract

```bash
make fix      # auto-fix formatting and lint
make check    # prettier, eslint, tsc, file-length, rsc-token, image-alt, theme-contrast
make test     # vitest
```

CI runs exactly these. `make help` lists everything. `npm run build` is the only real check for
server/client boundary violations — run it before believing a refactor.

Two rules govern every gate here, and the project paid for both:

- **A gate is not trusted until it has been observed failing.** Break it on purpose, watch it go
  red, revert. A green check that has never gone red is decoration.
- **Never let a gate skip.** If a check cannot evaluate something, that is a failure, not a pass.

Both come from an incident in which two inherited gates passed while inspecting zero files. The
architecture decisions for both repositories live in the backend repo under `docs/adr/`, and the
write-up is `docs/postmortems/0001-guardrails-that-checked-nothing.md`.

## Token custody — the one rule you cannot see yourself break

Under React Server Components, **any value a Server Component passes as a prop to a Client
Component is serialized into the Flight payload and shipped to the browser.** So is anything a
Server Action returns. No type error. No warning.

So: the access and refresh tokens live in HttpOnly cookies, and only the BFF reads them —
`src/app/api/auth/login/route.ts`, `.../logout/route.ts`, `src/app/api/django/[...path]/route.ts`,
and `src/lib/auth/refresh.ts`. Nothing else may import `@/lib/auth/tokens`.

If a Server Component needs authenticated data, it calls `/api/django/*` like the browser does.
It does not read the cookie. `scripts/check-rsc-token.mjs` enforces this and is part of
`make check`.

## Project Overview

Zita Boutique is a mobile-first fashion ecommerce storefront. The store sells affordable/bargain fashion. There is **no online payment** — the store closes sales the WhatsApp-Shop / cash-on-delivery way. Customers save pieces to a **Selection**, then either **place a no-pay order** (their selection plus name, phone and delivery address) that the seller works from an admin **Orders inbox**, or open **Tubaze** — a live chat with the seller for questions. Order is the primary close-the-sale path; Tubaze is for Q&A. No money is handled in-app; the seller arranges payment and delivery directly with the customer.

---

## Tech Stack

| Layer                      | Choice                                     |
| -------------------------- | ------------------------------------------ |
| Framework                  | Next.js 16 (App Router)                    |
| Database / Auth / Realtime | Supabase                                   |
| ORM & migrations           | Drizzle ORM + drizzle-kit + drizzle-zod    |
| Styling                    | Tailwind CSS + prettier-plugin-tailwindcss |
| Component library          | shadcn/ui (Radix UI + Tailwind)            |
| Icons                      | Lucide React (bundled with shadcn)         |
| Forms                      | React Hook Form + Zod                      |
| Validation                 | Zod                                        |
| Server / async state       | TanStack Query (React Query)               |
| Client persisted state     | Zustand (`persist`)                        |
| Toasts                     | Sonner                                     |
| URL state (filters)        | nuqs                                       |
| Image carousel             | embla-carousel-react (via shadcn Carousel) |
| Drag & drop                | @dnd-kit/core + @dnd-kit/sortable          |
| File upload UX             | react-dropzone                             |
| Data tables                | @tanstack/react-table                      |
| Date formatting            | date-fns                                   |
| Env validation             | @t3-oss/env-nextjs                         |
| File / image storage       | Supabase Storage                           |
| Pre-commit hooks           | husky + lint-staged                        |
| Unit / Integration tests   | Vitest + React Testing Library             |
| E2E tests                  | Playwright                                 |
| Deployment                 | Vercel                                     |

---

## Next.js 16 — Key Differences

- **Turbopack is the default** for both `next dev` and `next build`. Do not add webpack config — it will break the build.
- **`proxy.ts`** replaces `middleware.ts`. The exported function is named `proxy`. Matcher config is the same.
- **All async Request APIs must be `await`ed**: `cookies()`, `headers()`, `draftMode()`, page `params`, and `searchParams` are all Promises. Always `await` them.
- **`revalidateTag(tag, cacheLife)`** requires a second argument (e.g. `'max'`). Use `updateTag` for immediate read-your-writes in Server Actions.
- **React 19.2** is bundled — View Transitions, `useEffectEvent`, and `Activity` are available.

---

## Architecture Decisions

- **App Router only** — no Pages Router.
- **Server Components by default** — use `"use client"` only when necessary (interactivity, hooks, browser APIs).
- **Drizzle ORM** connects directly to Supabase Postgres. Schema lives in `lib/db/schema.ts`; migrations in `supabase/migrations/` generated via `drizzle-kit`.
- **Zod schemas** are derived from Drizzle table schemas using `drizzle-zod` — single source of truth for types and validation.
- **React Hook Form + Zod** for all forms (admin product editor, category editor, chat guest name). Use `zodResolver`.
- **shadcn/ui** components go in `components/ui/` (auto-managed by the CLI). Do not hand-edit generated shadcn files; add variants via the shadcn config instead.
- **nuqs** manages storefront filter/search state in the URL so links are shareable and the back button works.
- **embla-carousel-react** is used via shadcn's Carousel component for the product image gallery on mobile.
- **@dnd-kit** handles drag-to-reorder product images in the admin and any other sortable lists.
- **react-dropzone** powers the image upload area in the admin product editor.
- **@tanstack/react-table** drives the admin products and categories tables (sorting, pagination).
- **date-fns** for all date formatting (chat timestamps, relative dates). Never use `new Date().toLocaleDateString()` directly.
- **@t3-oss/env-nextjs** validates all environment variables at build time. Env schema lives in `lib/env.ts`.
- **husky + lint-staged** run ESLint and Prettier on staged files before every commit. Never skip with `--no-verify`.
- **prettier-plugin-tailwindcss** auto-sorts Tailwind class names — do not manually order classes.
- **Supabase Storage** for product images. Bucket `product-images` is public; upload is restricted to authenticated admin via RLS policy.
- **Supabase Realtime** powers the live chat feature between customers and the admin/seller.
- **Row Level Security (RLS)** must be enabled on all Supabase tables and storage buckets. Never bypass RLS.
- **Environment variables** — secrets live in `.env.local`, never committed. Supabase anon key is safe to expose; service role key is never sent to the client.

---

## How we do things here (one canonical way per concept)

Reach for the existing primitive before hand-rolling. Each of these has exactly one home:

- **Server / async state → TanStack Query.** Reads are `useQuery`; there is no fetch-in-`useEffect` + `cancelled` guard. Optimistic writes are `useMutation({ onMutate, onError })` — snapshot in `onMutate`, apply immediately, restore the snapshot in `onError` (the `mutationFn` throws on `result.error` so `onError` runs). The `QueryClientProvider` is mounted once in the root layout (`shared/components/QueryProvider`).
- **Realtime → `usePostgresChanges` + `setQueryData`.** `shared/hooks/usePostgresChanges` owns the Supabase channel subscribe/teardown; pass a channel, `{ table, event?, filter? }`, and a handler. Handlers still `router.refresh()` for the server-rendered order/chat inboxes; message hooks write incoming rows into the query cache via `setQueryData`.
- **Client persisted state → Zustand `persist`.** `useBag`, `useUnread`, and the guest session are `create(persist(...))` stores keyed to a `localStorage` name, with a `storage`-event listener for cross-tab sync. Gate client-only data on `useHydrated()` (`shared/hooks`) so SSR output matches the first client render.
- **Customer identity → one source.** `useCustomer()` reads the shared `['customer']` query entry; the single `AuthBridge` (mounted at the root) is the only `onAuthStateChange` listener.
- **Forms → React Hook Form + Zod** (`useForm` + `zodResolver`), never raw `useState` fields.
- **Small helpers:** `slugify` (`shared/lib/slug`), `tempId` (`shared/lib/id`), `firstZodError`/`isUniqueViolation` (`shared/lib/error`), `mapChatRow`/`mapChatItemRow` (`shared/lib/chat`), and the shared `ChatMessage` type (`shared/types`).
- **UI atoms in `shared/components/`:** `CountBadge`, `QuantityStepper`, `IconButton`, `EmptyState`, `AddImageDropzone`, `AddValueInput` (and storefront-local `BuyActions`). Route drift through these — do not re-hand-roll a badge/stepper/empty-state.

---

## Feature-Sliced Design (`src/`)

The code is organized as Feature-Sliced Design under `src/`, with `@/*` → `./src/*`:

- `src/app/` — Next routes (thin; render features/widgets).
- `src/features/<group>/<slice>/` — domain slices, each with `components/ hooks/ services/ lib/ consts/ types/` and a public `index.ts` barrel. The two top-level groups are **`features/storefront/*`** (customer app) and **`features/admin/*`** (seller app); **`features/auth`** and **`features/pwa`** stay **flat** (both apps use them).
- `src/widgets/` — multi-feature UI blocks (admin-nav, storefront-nav).
- `src/shared/` — `ui/` (shadcn/Base UI atoms), `components/` (cross-feature UI, e.g. `ProductThumb`, `ProductInquiryCard`), `lib/` (`utils`, `format`, `error`), `types/` (cross-group types, e.g. `CategoryFilter`, `InquiryItem`).
- `src/lib/` — stateful backend infra: `db/` (Drizzle, direct Postgres, **bypasses RLS**, server-only) and `supabase/` (SDK: auth/realtime/storage, the RLS path). Keep these separate — the split is the security boundary.

**Group isolation (enforced):** `features/storefront/*` and `features/admin/*` may depend on `features/auth`, `features/pwa`, `src/shared`, and `src/lib` — but **never on each other**. If a symbol is genuinely needed by both apps, it goes to `src/shared` (UI/types) or is duplicated per group (scope-split reads, e.g. `getCategoryFilters`). Cross-slice imports **within** a group are fine.

- Check: `grep -rn "@/features/admin" src/features/storefront` and `grep -rn "@/features/storefront" src/features/admin` must both be empty.

**Services split by authorization scope, not shared.** Reads live in a feature `services/*-queries.ts`; storefront reads filter `visible = true`, admin reads don't. Writes are `'use server'` action files. There is no `lib/db/queries.ts` god-module — each read lands in exactly one feature.

**Supabase in the UI:** no `@/lib/supabase/client` import outside `hooks/` and `services/`. Components render hook state; hooks own subscriptions/state and call services; services own Supabase IO and return `{ data, error }`.

- Check: `grep -rln "from '@/lib/supabase/client'" $(find src/features -type d -name components)` must be empty.

**Barrel convention (prevents server/client leaks):** a feature's top `index.ts` must **not** re-export **server-only** modules (`import 'server-only'`, anything importing `@/lib/db` — i.e. the `*-queries` read services) **nor** client-only value modules (nuqs parser objects, context singletons). Export **components** and **`'use server'` action files** via the barrel (both are safe — actions are RPC-stubbed on the client). Import server-only read services and client-only parsers **by path**. Type-only re-exports (`export type { … } from './services/…-queries'`) are fine — they're erased at runtime. `npm run build` is the real check: it collects page data and fails on a boundary violation.

---

## Feature Scope

### Storefront (customer-facing)

- Browse products by category
- Product detail page (photos, description, price, size/variant options)
- Search and filter within categories
- Save pieces to a **Selection** (localStorage, no account) — quick-add from the feed cards or from the product page
- **Place a no-pay order** from the Selection: name + phone + delivery address (+ optional note). No online payment — the seller contacts the customer to confirm and arrange delivery
- **Tubaze** live chat — opens a real-time chat with the seller (Supabase Realtime); always reachable and startable with just a name (no selection required)
- Mobile-first layout throughout; desktop is secondary

### Admin Panel (seller-facing)

- The admin user is the **seller**, not a developer — the UI must be clean, self-explanatory, and require zero technical knowledge
- Login via Supabase Auth (email/password)
- Manage products: create, edit, delete, toggle visibility
- Manage categories
- Upload and reorder product images
- **Orders inbox**: view incoming no-pay orders (contact details + item snapshots) and move status `new → contacted → done`
- View and respond to customer chat conversations in real time
- Simple dashboard: new orders, product count, active chats, recently added items

### Explicitly out of scope

- **Online payment** (no Stripe, no card capture, no in-app checkout total). The no-pay order collects contact/delivery details only — money changes hands offline between seller and customer
- Shipping / logistics automation (no carrier integration; the seller arranges delivery manually)
- ~~Customer accounts~~ — customer accounts now exist (Supabase email/password, no email confirmation). Browsing, the Bag, and placing an order stay **guest-allowed**; an account is only required for Favorites. Guests still order and chat anonymously.

---

## Mobile-First Guidelines

- Design for 375px width as the base; scale up to tablet and desktop.
- Touch targets minimum 44×44px.
- Images use `next/image` with responsive sizes.
- Navigation: bottom tab bar on mobile, sidebar or top nav on desktop.
- No hover-only interactions — all actions must work on touch.
- Test every new UI component at 375px, 768px, and 1280px before marking done.

---

## Admin UI Patterns

The admin panel must **not** be hand-designed screen by screen. Every admin screen is **assembled from the named patterns below**, which mirror the **Shopify mobile admin** model (proven for non-technical sellers). When building an admin screen, cite the pattern (e.g. "P3 FieldRow → P4 SubScreen") and compose the existing primitive — **do not invent new layouts, spacing systems, or interaction models.** If a screen needs something no pattern covers, add a new pattern here first, then build it.

Primitives live in `components/admin/ui/` and are composed from our Base UI / shadcn components in `components/ui/` (this project uses **Base UI** `@base-ui/react`, not Radix — use the `render` prop for polymorphism, and `Sheet` with `side="bottom"` for full-height panels).

| ID     | Pattern              | What it is                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Built from                            |
| ------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **P1** | `EditorHeader`       | Sticky top bar: leading dismiss (Cancel/✕) · centered title or status selector · trailing **Save** primary action. Save is always top-right.                                                                                                                                                                                                                                                                                                                                                                                                                  | `Button`, `DropdownMenu` (status)     |
| **P2** | `MediaZone`          | Bordered upload card pinned at the **top** of an editor: "Add images…". Staged photos preview + drag-to-reorder; first image is the main photo. In create mode, files stage locally and upload on Save.                                                                                                                                                                                                                                                                                                                                                       | `Card`, react-dropzone, `@dnd-kit`    |
| **P3** | `FieldRow`           | Tappable row: leading `+`/icon · label or current value · trailing chevron. Opens a focused sub-screen. Used for description, category, price, variants.                                                                                                                                                                                                                                                                                                                                                                                                      | `Button`/`<button>`, `lucide` chevron |
| **P4** | `SubScreen`          | Full-height bottom `Sheet` for one focused field; the edited control sits at the **top**, under the header, above the keyboard. Save model follows the **field type**: prose (description) and one-tap pickers (category, variants) **commit live** — the ✕ just closes, no Save. **Value inputs (price) keep an explicit Done** (✕ discards the draft) because users expect to set-then-submit, and multi-field groups commit as a unit via `onSave`. The parent's header Save is the real persist; header Cancel discards all; nothing persists until then. | `Sheet` (`side="bottom"`)             |
| **P5** | `SectionCard`        | Grouped section with a label and a card body (e.g. Media, Variants, Inventory).                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `Card`                                |
| **P6** | `FloatingLabelInput` | Input with the field label sitting small inside the box, value below; optional helper text underneath ("Customers won't see this").                                                                                                                                                                                                                                                                                                                                                                                                                           | `Input`, `Label`                      |
| **P7** | `FilterChips`        | Segmented chip row for list filtering (All / Active / Draft / Archived).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `Button` (toggle styling)             |
| **P8** | `ListRow`            | List item: leading thumbnail · title · meta line (`19,998 available · 6 variants`) · optional accent warning.                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `<li>`/`Card`, `next/image`           |

Rules:

- **Progressive disclosure, not flat forms.** A product editor is a short scroll: `MediaZone` (P2) → title → `FieldRow`s (P3) that open `SubScreen`s (P4). Do not dump every field onto one page.
- **Save lives in the header (P1), top-right** — never a stray button mid-form. Sub-screens have their own Save (P4) that commits to parent state only.
- **One source of pattern truth.** Reuse the primitive; never re-implement a header/row/sheet inline.
- Still bound by **Mobile-First Guidelines** above (375px base, 44×44px targets, touch-only).

---

## Catalog Structure

- **Categories only** (e.g. Tops, Bottoms, Dresses, Accessories, Shoes)
- Products belong to one category
- Products have: name, description, price, images (multiple), sizes/variants, visible flag, category

---

## Live Chat Design

- Customers do not create accounts — they enter a display name to start a chat
- Each chat session is a Supabase row; messages are child rows updated via Realtime subscriptions
- Admin sees all open conversations in a list; can reply from the admin panel
- Unread message count badge visible on the admin chat inbox

---

## Testing Approach (TDD)

- Write tests **before** implementation (red → green → refactor)
- **Vitest + React Testing Library** for units, hooks, and component logic. Config in
  `vitest.config.ts`; `make test` runs them.
- Test files co-located with source: `foo.test.ts` next to `foo.ts`
- **There is no E2E suite yet, and no `make test-e2e`.** End-to-end tests must not mock Supabase,
  which means they need a seeded, disposable Supabase project. Until one exists, a `test-e2e`
  target would be a target that cannot run — and a Makefile with one of those is a Makefile
  nobody believes. Add the project first, then the tests, then the target.

### What mocked tests cannot prove (learned the hard way)

Vitest imports modules directly and never applies the framework's runtime contracts. A green unit suite is **not** evidence the app boots or that a mutation reaches the database. Treat these as blind spots that **only** an e2e run (or a real `next build`/`next dev`) can cover:

- **Framework boundary contracts.** Vitest does not enforce `"use server"` rules, RSC serialization, `"use client"` boundaries, or `await`-ing async request APIs (`cookies()`, `params`, …). Example that shipped green but crashed in the browser: a `"use server"` file may export **only async functions** — exporting a `const schema = z.object(...)` from it throws `A "use server" file can only export async functions, found object` at runtime, breaking every action in that module. Mocks sailed past it; e2e caught it.
- **Real wiring.** Auth cookie round-trips, `proxy.ts` redirects, `revalidatePath`/`updateTag`, DB constraints, RLS, and storage only execute against the real stack. A test that mocks `@/lib/db` or a server action proves the caller's logic, not that the action works.
- **Rule of thumb:** if a test mocks the thing that would actually fail, it cannot catch that failure. For every mutation, ensure **one** e2e path exercises it unmocked. When an e2e fails, reproduce against the real runtime before trusting unit-level results — don't "fix" by adjusting mocks.

### Conventions that keep the boundaries testable

- **Keep `"use server"` files pure actions.** Zod schemas, types, and helpers shared with client/tests live in a sibling `*.schema.ts` (e.g. `products.schema.ts`); the action file imports them. Never `export` a non-function value from a `"use server"` module.
- **Diagnosing real-runtime errors:** server-action/RSC stack traces are written to `.next/dev/logs/next-development.log` (the browser only shows a generic "server error" digest). Only one `next dev` can run per project dir — reuse the running one and tail that log.
- **Environment caveats when running e2e here:** Next dev compiles routes on first hit, so the first navigation to a route can exceed a 5s assertion timeout — warm it or raise the timeout rather than assuming a bug. Also, a sandboxed test browser may have no external network even when Node does; "Failed to fetch" against Supabase can be the environment, not the code — verify with a Node-side request.
  - **Browser can't reach Supabase → inject auth instead of logging in via the UI.** When the headless browser has no Supabase network, the client-side login (`signInWithPassword`) fails with "Failed to fetch", but server actions still run in the dev server (which does have network). To drive an authenticated flow anyway: sign in through `@supabase/ssr` (`createServerClient` with an in-memory cookie jar) in Node, capture the `sb-<ref>-auth-token` cookie it writes, and `context.addCookies(...)` it into the Playwright context for `localhost`. The server validates the cookie and the action path works end-to-end.
  - **`PostgresError: "sorry, too many clients already"` is infra, not the change.** `lib/db/index.ts` opens a default 10-connection `postgres()` pool against the **direct** connection (`db.<ref>.supabase.co:5432`, not the `:6543` pooler), and Turbopack HMR leaks pools across reloads until the cap is hit. A clean dev-server restart (kill stray `node`, relaunch) clears it. If it recurs, switch local `DATABASE_URL` to the Supabase pooler URL.

---

## Git Conventions

- **Commits are the developer's responsibility, and AI assistance is disclosed.** Every commit is
  understood and defended by a human, but where Claude wrote the code, say so — add the
  `Co-Authored-By: Claude <noreply@anthropic.com>` trailer. `AI_USAGE.md` states this project uses AI
  openly; the commit history should not quietly say otherwise.
- Commit message format: `type(scope): short description`
  - Types: `feat`, `fix`, `refactor`, `test`, `chore`, `docs`, `style`
  - Examples:
    - `feat(storefront): add product detail page`
    - `test(chat): add realtime message delivery tests`
    - `fix(admin): prevent image upload without alt text`
- One logical change per commit — do not bundle unrelated changes
- Branch naming: `feat/slug`, `fix/slug`, `chore/slug`
- **Never commit to `main`.** Always ask before committing: show `git status` and draft the message
  first.

---

## Project Structure

```
frontend/
├── src/
│   ├── app/                 # Next routes (thin; render features/widgets)
│   │   ├── (storefront)/    # Public: home feed, category, product, bag, chat, account
│   │   ├── admin/           # Seller panel (auth-gated by proxy.ts)
│   │   └── api/
│   │       ├── auth/        # BFF: login, logout — token custody
│   │       └── django/      # BFF: same-origin proxy to the Django API
│   ├── features/            # storefront/* and admin/* — never import each other
│   ├── widgets/             # multi-feature blocks (admin-nav, storefront-nav)
│   ├── shared/              # ui/, components/, lib/, types/
│   ├── lib/                 # db/ (Drizzle, bypasses RLS), supabase/ (RLS path), auth/ (tokens)
│   ├── config.ts            # @t3-oss/env-nextjs validated env
│   └── proxy.ts             # Next 16 middleware: admin guard + maintenance mode
├── scripts/                 # the gates: check-rsc-token, check-file-length, audit-*, check-licenses
├── supabase/migrations/     # generated by drizzle-kit
├── Makefile                 # the contract
├── vitest.config.ts
└── CLAUDE.md
```

## Code Style

- TypeScript strict mode enabled
- No `any` — use proper types or `unknown`
- Prefer `async/await` over `.then()` chains
- No comments that describe _what_ the code does — only _why_ if non-obvious
- Keep components small and single-purpose
- Do not add features, abstractions, or error handling beyond what the current task requires

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
