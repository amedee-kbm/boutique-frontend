# Zita Boutique — CLAUDE.md

## Project Overview

Zita Boutique is a mobile-first fashion ecommerce storefront. The store sells affordable/bargain fashion. There is **no payment processing** — the goal is to present products attractively and funnel customers into a live chat conversation with the seller to close the sale.

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

## Feature Scope

### Storefront (customer-facing)

- Browse products by category
- Product detail page (photos, description, price, size/variant options)
- Search and filter within categories
- Live chat widget — opens a real-time chat with the seller (Supabase Realtime)
- Mobile-first layout throughout; desktop is secondary

### Admin Panel (seller-facing)

- The admin user is the **seller**, not a developer — the UI must be clean, self-explanatory, and require zero technical knowledge
- Login via Supabase Auth (email/password)
- Manage products: create, edit, delete, toggle visibility
- Manage categories
- Upload and reorder product images
- View and respond to customer chat conversations in real time
- Simple dashboard: active chats, product count, recently added items

### Explicitly out of scope

- Payment processing (no Stripe, no checkout, no cart)
- Order management
- Shipping / logistics
- Customer accounts (customers chat as guests)

---

## Mobile-First Guidelines

- Design for 375px width as the base; scale up to tablet and desktop.
- Touch targets minimum 44×44px.
- Images use `next/image` with responsive sizes.
- Navigation: bottom tab bar on mobile, sidebar or top nav on desktop.
- No hover-only interactions — all actions must work on touch.
- Test every new UI component at 375px, 768px, and 1280px before marking done.

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
- **Vitest + React Testing Library** for units, hooks, and component logic
- **Playwright** for critical user journeys: browse products, open chat, send message, admin login, add product
- Test files co-located with source: `foo.test.ts` next to `foo.ts`
- E2E tests live in `e2e/` at project root
- Do not mock Supabase in e2e tests — use a dedicated test Supabase project or local Supabase CLI

---

## Git Conventions

- **Commits are the developer's own** — do not add Claude as co-author
- Commit message format: `type(scope): short description`
  - Types: `feat`, `fix`, `refactor`, `test`, `chore`, `docs`, `style`
  - Examples:
    - `feat(storefront): add product detail page`
    - `test(chat): add realtime message delivery tests`
    - `fix(admin): prevent image upload without alt text`
- One logical change per commit — do not bundle unrelated changes
- Branch naming: `feat/slug`, `fix/slug`, `chore/slug`

---

## Project Structure (target)

```
zita-boutique/
├── app/
│   ├── (storefront)/        # Public-facing routes
│   │   ├── page.tsx         # Homepage / featured products
│   │   ├── category/[slug]/ # Category listing
│   │   └── product/[slug]/  # Product detail
│   ├── admin/               # Seller admin panel (auth-gated)
│   │   ├── login/
│   │   ├── products/
│   │   ├── categories/
│   │   └── chat/
│   └── api/                 # Route handlers if needed
├── components/
│   ├── storefront/
│   ├── admin/
│   └── ui/                  # shadcn/ui components (auto-managed, do not hand-edit)
├── lib/
│   ├── supabase/
│   │   ├── client.ts        # Browser Supabase client
│   │   ├── server.ts        # Server Supabase client (awaits cookies())
│   │   └── admin.ts         # Service-role client for admin ops
│   ├── db/
│   │   ├── schema.ts        # Drizzle table definitions (source of truth for types)
│   │   └── index.ts         # Drizzle client instance
│   ├── env.ts               # @t3-oss/env-nextjs validated env vars
│   └── types/               # Additional TypeScript types
├── e2e/                     # Playwright tests
├── supabase/
│   └── migrations/          # SQL migrations generated by drizzle-kit
├── proxy.ts                 # Auth guard for /admin routes (Next.js 16 proxy)
├── drizzle.config.ts
├── vitest.config.mts
├── playwright.config.ts
├── prettier.config.mjs
└── CLAUDE.md
```

---

## Code Style

- TypeScript strict mode enabled
- No `any` — use proper types or `unknown`
- Prefer `async/await` over `.then()` chains
- No comments that describe _what_ the code does — only _why_ if non-obvious
- Keep components small and single-purpose
- Do not add features, abstractions, or error handling beyond what the current task requires

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
