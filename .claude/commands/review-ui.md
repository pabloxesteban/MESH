---
description: Review a screen against MESH's UX, accessibility, design-system, and brand rules.
---

Review this screen: **$ARGUMENTS** (default: the screens changed in the current
diff).

Run `.claude/workflows/ui-review.md` in full, taking the roles of
`ux-product-designer`, `design-system-engineer`, `brand-designer`, and
`product-critic` in that order.

Report as a checklist with ✅ / ❌ / ⚠️ per item, then a short list of required
changes ranked by impact. Be specific: "this screen ends at a style with no
path to a person" beats "feels unfinished".

Flag as blocking, not advisory:
- a missing loading / empty / error+retry state
- a gesture with no ≥44pt labelled button equivalent
- a dead end (no forward action from any state)
- a raw design value in a screen
- anything fabricated or inferred beyond the data
- a dark pattern of any size
