# Design Review: Admin Panel

Reviewed against: CLAUDE.md — **Admin UI Patterns (P1–P8)** + **Mobile-First Guidelines** (no `.design/DESIGN_BRIEF.md` exists; CLAUDE.md is the design source of truth)
Philosophy: Restrained / functional (Dieter-Rams-adjacent) — monochrome palette, borders over shadows, Bricolage Grotesque display + Figtree body
Date: 2026-06-25

> **Status (updated 2026-06-25):** all three Should-Fix items and the Could-Improve cleanups have been **resolved** — see the Resolution Log at the bottom. Findings below are annotated with their outcome.

## Screenshots Captured

| Screenshot                                                               | Breakpoint | Description                            |
| ------------------------------------------------------------------------ | ---------- | -------------------------------------- |
| `screenshots/review-dashboard-{mobile-375,tablet-768,desktop-1280}.png`  | all three  | Dashboard: stat cards + recently-added |
| `screenshots/review-products-{mobile-375,tablet-768,desktop-1280}.png`   | all three  | Products list (P7 chips + P8 rows)     |
| `screenshots/review-categories-{mobile-375,tablet-768,desktop-1280}.png` | all three  | Categories data table                  |
| `screenshots/review-chat-{mobile-375,tablet-768,desktop-1280}.png`       | all three  | Chat inbox empty state                 |
| `screenshots/review-product-editor-mobile-375.png`                       | Mobile     | Product editor (P1/P2/P3/P5)           |
| `screenshots/review-subscreen-variants-mobile-375.png`                   | Mobile     | Variants sub-screen (P4 bottom Sheet)  |
| `screenshots/review-login-mobile-375.png`                                | Mobile     | Login                                  |

> All screenshots are in `.design/admin-panel/screenshots/`. Captured against the running dev server, authenticated.

## Summary

The admin panel is a faithful, disciplined realization of the CLAUDE.md pattern system — the product editor especially (P1 header → P2 media → P3 field rows → P4 sub-screens → P5 section cards) is exactly what the patterns prescribe, and the mobile-first navigation (sidebar ↔ bottom tab bar) is correct rather than a shrunk desktop nav. Token usage is clean throughout (semantic shadcn variables, no hardcoded colors). The biggest gaps were not layout but **finish** — and those have since been closed.

## Must Fix

_None._ Nothing was broken — every page rendered, the editor composed correctly, and no functionality was blocked.

## Should Fix

1. **✅ Resolved — Display face (Bricolage) under-applied on page titles.** The `<h1>` in [PageHeader.tsx](components/admin/PageHeader.tsx) used the body face (Figtree); `font-heading` only reached Card/Dialog/Sheet titles. _Fixed in `f0cbd2e`: `font-heading` applied to the PageHeader `<h1>` and the login wordmark._

2. **✅ Resolved — Icon touch targets below 44×44px.** Row actions rendered at `size-7` (28px). _Fixed in `f0cbd2e`: products-delete and categories edit/delete now use a `size-11 md:size-7` hit area — verified 44×44 on mobile by driving the app._

3. **✅ Resolved — Dark mode tokens existed but were unreachable, with a leftover purple token.** _Fixed in `b79e507`: a class-based dark mode toggle in the sidebar with a server-rendered no-flash script (next-themes was dropped — it renders its script inside a client component, which React 19 rejects), and the purple `--sidebar-primary` neutralized to keep the palette monochrome._

## Could Improve

1. **✅ Done — Leftover test products** ("PROBE Edit…", "VERIFY Multi…") were deleted through the real delete action while driving the app.

2. **✅ Resolved — Graceful broken-image fallback.** _`f0cbd2e`: a shared `ProductThumb` client component swaps to the placeholder on image `error`, used by the products list, list rows, and the dashboard._

3. **Decided — keep it monochrome.** A warm-clay accent was prototyped and then reverted at the owner's call; the palette stays intentionally grayscale. The only colour change kept was neutralizing the stray dark-mode purple.

4. **(Dev-only, not a bug)** The Next.js dev-tools floating button overlaps the "Chat" bottom-tab in these captures — that's why Chat looks dimmed. It does not ship to production.

## What Works Well

- **Product editor is a textbook P1→P5 composition** — sticky Cancel/status/Save header, MediaZone pinned at top, tappable FieldRows opening P4 bottom-sheet sub-screens. Progressive disclosure, not a flat form.
- **Genuinely mobile-first navigation.** Fixed sidebar at `md+`, fixed bottom tab bar below — a real mobile pattern, with clear active states.
- **Disciplined token usage.** Every surface uses semantic shadcn variables — no one-off hex values; radius scale derived from `--radius`.
- **Responsive tables done right.** The categories table drops its Slug column at 375px instead of overflowing horizontally.
- **Consistent, calm empty states.** Chat and empty-products share the dashed-border + centered-icon treatment.

## Resolution Log

Work that followed this review (all on `fix/button-native-link`):

| Commit    | What                                                                                                                                    |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `9ec6302` | Render Button-as-Link without native-button semantics (Base UI warning caught by `/run`)                                                |
| `b79e507` | Sidebar **dark mode** toggle (server no-flash script; dropped next-themes); neutralized the purple token                                |
| `f0cbd2e` | **RWF** currency formatting + review polish: `font-heading` titles, 44px touch targets, `ProductThumb` image fallback                   |
| `c23a50e` | Drop **ceremonial per-field Save** in editor sub-screens (commit-on-close)                                                              |
| `5c7b0cd` | Editor sub-screen UX: full-height placement (field above keyboard), **price** keeps an explicit Done, inline RWF prefix, shorter toasts |
| `19d5768` | **Variant count** in product rows + **status selector** in the editor header (P1)                                                       |
| `3617339` | **Associate product images with variant options** (colour swatches) — schema + migration + action + edit-mode picker                    |

Interaction-model critique that informed several of these lives in the [`interaction-critique`](../../.claude/skills/interaction-critique/SKILL.md) skill (load-bearing vs ceremonial controls, field-type save model).
