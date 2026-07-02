# Zita Boutique — storefront revision build prompts

Copy one block at a time into a **fresh chat in this project**. They are self-contained
(fresh chats start cold). Build roughly in order — later slices depend on earlier ones.

> **Reading the reference images:** every `.jpeg` in `notes/` is a real file Claude Code can
> render. Each prompt tells the chat to **Read** the relevant image first — make sure it
> actually does (use the path from the project root, e.g. `notes/zara-product-list.jpeg`;
> if it complains, give the absolute path `c:\Users\akwis\zita-boutique\notes\...`).

---

## Decisions baked into these prompts (change the `DECISIONS:` line if any are wrong)

1. **Bag = the new Selection.** Its checkout runs the **existing no-pay order flow**
   (`lib/orders/*`), which collects name + phone + address + note. The account holds only email
   - password (no name/phone), so everyone fills the order form; a signed-in user's order is
     **linked to their account** and the form may be **prefilled from their most recent order**.
     No payment, ever.
2. **Guest vs account boundary (Zara's):** browse + add to Bag + place an order = allowed as
   a guest. **Favorites = requires a customer account.**
3. **Auth = email + password** (standard Supabase email/password; email confirmation disabled
   in the dashboard — no OTP, no synthetic emails). **No phone at signup.** The **phone number
   is collected only at ORDER time** (it's the seller's contact channel) and validated there as
   a **Rwandan mobile** (local `07X XXX XXX`, 10 digits, second digit 2/3/8/9 — regex
   `^07[2389]\d{7}$`; optionally accept/normalize a `+250` prefix). Reverses the old "customers
   are guests" premise; CLAUDE.md updated.
4. **No discounts.** The red strike-through/"-35%" in every Zara shot is their content, not a
   requirement. Don't build compare-at pricing unless you decide to (separate slice).
5. **Admin merchandising is scoped tight** — editable home filter strip + optional
   pin/feature — not a CMS.
6. **Standing rules for every slice:** mobile-first at 375px (44px touch targets), then design
   responsively upward; make top/bottom nav and primary buttons sticky where it makes sense;
   verify on the **real app** (`next dev`), not just unit tests.

## Order & dependencies

```
P0 Auth ──► P1 Bag/Favorites model ──► P2 Home
                                   ├──► P3 PDP ──► P4 PDP paging
                                   ├──► P5 Cart area
                                   └──► P6 Chat
P2 ⇄ P7 Admin merchandising (filter strip)
```

---

## P0 — Customer auth (phone + password, no verification)

```
Zita Boutique (Next.js 16 App Router, Supabase, Drizzle, Base UI/shadcn). Read CLAUDE.md and
your auto-memory (storefront design history) first. Read notes/zara-cart-area.jpeg for the
"LOG IN / Don't have an account? REGISTER" pattern.

Add CUSTOMER accounts to the storefront (separate from the existing admin auth).

DECISIONS: Standard Supabase EMAIL + PASSWORD auth, email confirmation DISABLED (no OTP). NO
phone at signup — the phone number is collected only at order time (next slices). Browsing, the
Bag, and placing an order stay guest-allowed; only Favorites (next slice) requires an account.

Build:
- Supabase email/password auth with EMAIL CONFIRMATIONS DISABLED. Register = signUp(email,
  password); Login = signInWithPassword. Document the exact Auth dashboard setting in a comment.
- Register + Login screens in the storefront style (Zara-clean: sharp corners, hairline borders,
  uppercase labels). Fields: Email + Password.
- An "Account" entry in the storefront bottom nav (match notes/zara-product-list.jpeg bottom bar:
  MENU · logo · ACCOUNT · BAG).
- A client hook for the current customer session; keep the existing anonymous-auth order path
  working for guests (don't break lib/chat/funnel.ts ensureAnonUser or lib/orders).
- Update the CLAUDE.md "out of scope: customer accounts" line — accounts now exist (guests still
  allowed for bag/order).

Constraints: mobile-first 375px → responsive; sticky headers; no payment. Verify on the real app:
email+password register then login creates a Supabase user and persists the session.
```

## P1 — Re-model: "Selection" → Bag, plus Favorites (keystone refactor)

```
Zita Boutique (read CLAUDE.md + auto-memory). Depends on P0 being merged.
Read notes/zara-cart-area.jpeg (favorites-requires-login pattern).

Split the single "Selection" concept into TWO, Zara-style, and remove all "selection" language.
DECISIONS: Bag = guest-allowed; its checkout runs the EXISTING no-pay order flow (lib/orders/*)
— if signed in, prefill phone from the account (name too if the profile has one; otherwise
collect it and save it to the profile), and ask for address+note. Favorites = REQUIRES a
customer account, persisted server-side. No discounts.

Build:
- Rename Selection → Bag everywhere (components/storefront/Selection*, lib/selection/*, the
  StoreHeader bag icon, all copy). Keep the localStorage mechanism for the Bag.
- New Favorites: a `favorites` table (user_id + product_id; RLS owner-only) + hook/actions to
  toggle. A guest tapping favorite gets a "log in / register" prompt.
- Wire checkout: everyone fills the order form (name + phone + address + note). If signed in,
  link the order to the account (set orders.created_by / a user_id) and PREFILL the form from the
  customer's most recent order when one exists. Guests order anonymously as today.
- Tighten phone validation in lib/orders/order.schema.ts to a RWANDAN MOBILE: regex
  `^07[2389]\d{7}$` (10 digits), optionally accept/normalize a `+250` prefix; clear error message.

Constraints: mobile-first → responsive; sticky CTAs; no payment; reuse lib/orders. Verify on the
real app: guest adds to Bag + orders; a signed-in user favorites a product and it persists across
reload; an invalid phone is rejected, a valid 07… one is accepted.
```

## P2 — Home: 2-col rhythm grid, "+" add-to-bag w/ size sheet, editable filter strip

```
Zita Boutique (read CLAUDE.md + auto-memory). Depends on P1 (Bag).
Read notes/zara-product-list.jpeg AND notes/zara-size-selection-from-home.jpeg before building.

Build:
- Change the home feed from 1-col to a 2-COLUMN grid, but with an occasional FULL-WIDTH (1-col)
  tile for rhythm (Zara repeats a pattern, e.g. every Nth item full-bleed). Make the
  1-col/2-col pattern a small reusable rule, not hardcoded per item.
- Add a "+" button on each card (bottom-right of the caption, see jpeg). Tapping "+" opens a
  bottom SIZE-PICKER sheet over the feed (the product's sizes) → choosing a size adds that
  concrete line to the Bag. Home cards currently lack size data (StoreCard in lib/db/queries.ts)
  — extend the query or fetch sizes on tap.
- REMOVE the heart from home cards (it moves to the PDP in P3).
- Populate the top filter strip from an admin-editable source (coordinate with P7; for now read
  a home_filters/collection source, fall back to categories).

Constraints: mobile-first 375 → responsive 2→3→4 cols on larger screens; 44px targets; sticky
top filter strip; no discounts. Verify on the real app: "+" → size sheet → item lands in the Bag
with the chosen size.
```

## P3 — Product detail: Zara-clean redesign

```
Zita Boutique (read CLAUDE.md + auto-memory). Depends on P0, P1.
Read notes/zara-product-detail-page.jpeg, notes/zara-product-detail-1.jpeg, and
notes/zara-product-detail-size-picker.jpeg before building.

Rebuild components/storefront/ProductDetail.tsx clean and 1-COLUMN:
- Top bar: ✕ (close) · favorite/bookmark icon · share · Bag-with-count. Favorite requires an
  account → if guest, prompt log in/register (from P1).
- Big image(s). Name + price below.
- Replace "Select a size / Add to selection" with a single full-width "ADD TO CART" (outlined,
  Zara style). NO "selection" language anywhere.
- Sizes are HIDDEN until "Add to cart" is tapped → then a full-screen size picker appears
  (XS/S/M/L/XL/XXL, see size-picker.jpeg). We have no stock field, so omit "Few items left".
- Colours: show them as INLINE COLOUR SQUARES near the price (the small swatch row in
  zara-product-detail-1.jpeg), tappable to switch the image. This REPLACES the current
  sticky-top ColorStrip.
- Keep Tubaze chat reachable but secondary.

Constraints: mobile-first then a responsive desktop split (gallery + info) is fine; sticky top
bar + sticky Add button; no discounts. Verify on the real app: add-to-cart → size sheet →
correct line in Bag; favorite gated behind auth.
```

## P4 — PDP horizontal product browsing (do AFTER P3)

```
Zita Boutique (read CLAUDE.md + auto-memory). Depends on P3.
Read notes/zara-product-detail-1.jpeg (the thumbnail strip at the bottom) before building.

Let users browse OTHER products without leaving the product-detail view: a horizontal,
swipeable strip/pager of adjacent products (same category) at the bottom; selecting one swaps
the detail in place. Start simple (a horizontal thumbnail strip that navigates) before
attempting full swipe-paging of whole products. Add a one-time, dismissable coachmark hint
(localStorage) so users discover the horizontal gesture.

Constraints: mobile-first; smooth touch scrolling; no layout shift; responsive. Verify the strip
scrolls and navigates on the real app at 375px.
```

## P5 — Cart area: Shopping Bag + Favorites tabs

```
Zita Boutique (read CLAUDE.md + auto-memory). Depends on P0, P1.
Read notes/zara-cart-area.jpeg, notes/zara-cart-area-with-item.jpeg, and
notes/zara-empty-shoping-cart.jpeg before building.

Build the cart area with tabs: SHOPPING BAG |n| · FAVORITES (drop "PRE-OWNED", N/A):
- Bag tab: line items (thumb · name · size|colour · price · REMOVE), approx TOTAL with the
  "no payment, seller confirms" note, and a primary CONTINUE that enters the existing no-pay
  order/checkout (P1). Empty state per zara-empty-shoping-cart.jpeg.
- Favorites tab: if signed out, "You must log in to view or save items in your favorites list"
  + LOG IN + REGISTER (zara-cart-area.jpeg). If signed in, list favorited products with a
  move-to-bag affordance.
- Optional "You may also like" strip (same-category suggestions).

Constraints: mobile-first → responsive; sticky CONTINUE bar; no payment/tax/checkout total.
Verify on the real app: bag → continue → order places; favorites gate works guest vs signed-in.
```

## P6 — Chat: drop the auto-message, preload context

```
Zita Boutique (read CLAUDE.md + auto-memory). Depends on P1.

In the Tubaze chat (components/storefront/GuestChat.tsx, lib/chat/funnel.ts):
- Remove the hardcoded opening message "Hi! I'd love to know more about these pieces."
- When chat opens, show the customer's current Bag + Favorites as context chips/cards at the top,
  each with an "✕" to drop it from the context they're asking about. State clearly whether the
  ✕ is chat-local only or also removes from Bag/Favorites — pick one (recommend chat-local only).
- Keep chat as Q&A; do NOT turn it into a second checkout — ordering stays the Bag's job.

Constraints: mobile-first → responsive; sticky composer. Verify on the real app that chat opens
with context and no auto-message.
```

## P7 — Admin: storefront merchandising config (pairs with P2)

```
Zita Boutique (read CLAUDE.md + auto-memory).

Give the seller admin control over storefront merchandising — SCOPE TIGHTLY, not a CMS:
- Edit the home top filter/collection strip entries (label + what they point to).
- Optionally pin/feature products or set home feed ordering.
Build from the existing Admin UI Patterns (P7 FilterChips, P8 ListRow, P3/P4 FieldRow/SubScreen)
— do not invent new admin layouts. Add tables + RLS (admin-write) + a migration.

Constraints: admin is for a non-technical seller — clean and obvious. Verify on the real app that
an edit in admin changes the storefront home.
```
