---
name: interaction-critique
description: Critique the interaction MODEL of a flow and propose better patterns — not a checklist. Notices controls that don't earn their place (ceremonial Save/confirm buttons, modals that should be inline, multi-step that should be one) and recommends the superior pattern (live-commit, optimistic UI, undo, direct manipulation). Use for "is this the right interaction", "UX critique", "are these buttons necessary", "polish the UX", or after building an admin flow.
---

This skill critiques **how an interface behaves**, not how it looks. It questions whether each interaction is the right _model_ and proposes a better one. It is the opposite of a rule-checklist: a linter verifies a Save button has a loading state; this asks whether that Save button should exist at all.

It is tuned for **Zita Boutique**: a mobile-first admin used by a **non-technical seller**, built from the **Admin UI Patterns (P1–P8)** in CLAUDE.md, anchored to the **Shopify mobile admin** model. Stay inside that system — propose pattern swaps, not new spacing/layout systems.

## Example prompts

- "Is the Save button here necessary?"
- "Critique the product editor's UX"
- "Are we over-modeling this flow?"
- "Polish pass on the admin interactions"

## The core test: load-bearing vs. ceremonial

For **every** control (button, confirm dialog, step, toggle), ask: _what breaks if it's gone?_

A control is **load-bearing** — keep it — when removing it would:

- commit a **batch/transaction** (e.g. create row + upload images + write variants as a unit),
- persist **partial or invalid** state that shouldn't go live,
- trigger something **irreversible** or with **financial / privacy / security** impact,
- or violate a **deeply held expectation** for that surface (NN/g: don't strip control just to save a tap).

A control is **ceremonial** — replace or remove it — when it only:

- copies a draft into in-memory parent state (no persistence, no risk),
- confirms a **reversible** action that could be an **undo** instead,
- gates a **single field** that could commit live,
- or duplicates a decision the user already made by tapping something.

> Worked example (this codebase): the product editor's **header Save** is load-bearing — it batches create + parallel image uploads + variant writes. The per-field **"Done"** in each `SubScreen` was mostly ceremonial. The resolution split by **field type**, not a blanket rule: prose (description) and one-tap pickers (category, variants) now **commit live** — the ✕ just closes — while **price kept an explicit Done** (✕ discards) because a _value input_ carries the set-then-submit expectation, where close should mean discard. So the same "is this Save necessary?" question yielded _remove it here, keep it there_. Never blanket "remove all saves" or "every form needs a Save."

## Pattern-swap lenses

Walk the flow and look for each of these. For every hit, name the current pattern, the proposed pattern, and the load-bearing/ceremonial verdict.

1. **Ceremonial Save / Done** → live-commit to parent (the ✕ closes), or autosave-with-`Saved`-feedback. Reserve explicit Save for the load-bearing cases above.
2. **Confirm dialog on a reversible action** → optimistic action + **Undo** toast (sonner). Keep the dialog only for truly irreversible/destructive deletes.
3. **Modal/sheet for one tap-target** → inline control or `DropdownMenu` in place. A whole `SubScreen` to pick one of three options may be heavier than the choice deserves.
4. **Multi-step where one would do** → collapse steps; progressive disclosure (P3 → P4) only when the field genuinely needs focus.
5. **Toggle/decision buried** → surface it where the pattern expects (e.g. status belongs in the **P1 header** centre selector, per Shopify, not only as a footer switch).
6. **Disabled buttons / blocking validation** → inline, per-field validation with a reason; let the user act and explain what's missing (the editor already does this — empty title → toast, not a disabled Save).
7. **Direct manipulation missing** → can the user act _on the object_ (tap the row, drag to reorder, toggle in place) instead of opening a form? `VisibilityToggle` is the model: optimistic, in-row, no Save.
8. **Missing states** → does every interactive surface have empty / loading / success / error / and (for lists) a "no matches" state?
9. **Mobile-first reality** → 44×44px targets, no hover-only affordance, thumb-reachable primary actions, input `inputMode` correct for the data.

## Process

1. **Read CLAUDE.md** — the Admin UI Patterns (P1–P8), Mobile-First Guidelines, and Feature Scope. Out-of-scope items (inventory counts, sales channels, cost/margin, payments) are **not** gaps — don't propose them.
2. **Drive the real app, don't just read code.** Use the project's `/run` harness (sign in via `@supabase/ssr` cookie-inject, drive with `playwright-core`) to walk the actual flow at 375px. Observe taps, not JSX. A button's necessity is clearest when you perform the task.
3. **Apply the core test + lenses** to each interaction. Cite the file and the P-pattern.
4. **Produce prioritized pattern-swap proposals** (below). Each must state: current pattern → proposed pattern, the verdict, the effort, and the user benefit. Recommend; don't blanket-apply.
5. **Offer to implement** the high-confidence wins; re-verify each by driving the app.

## Output format

```markdown
# Interaction Critique: [flow]

Anchored to: CLAUDE.md Admin UI Patterns · Shopify mobile · non-technical seller

## Keep as-is (load-bearing)

- **[control]** — why removing it would break something real.

## Replace (ceremonial / wrong model)

1. **[control]** (P#): [current pattern] → [proposed pattern]. _Verdict: ceremonial because …_ _Effort: S/M/L · Benefit: …_

## Could improve

1. **[smaller pattern nudge]** — [proposal].

## Out of scope (noted, not gaps)

- [Shopify-ism we deliberately don't do per Feature Scope].
```

Be specific and opinionated. Distinguish a confident swap from a judgment call. The goal is fewer, better interactions — not more controls, and not change for its own sake.
