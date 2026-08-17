---
description: Plan a feature through the MESH gate — critique, UX, architecture, and the exact implementation steps.
---

Plan the following feature for MESH: **$ARGUMENTS**

Follow `.claude/workflows/new-feature.md` steps 0–4. Do not write
implementation code in this command.

1. **Gate.** Name which of DISCOVERY / TASTE / MATCHING / TRUST / ACTION it
   serves. If none, say so and stop with a recommendation instead.
2. **Critique** as `product-critic`: ship, shrink, or cut — with a reason. A
   "shrink" verdict must name the smaller version.
3. **UX** as `ux-product-designer`: the flow, all four states, `es-AR` copy,
   the non-gesture path, and where the user goes from each state.
4. **Architecture** as `product-architect`, if data changes: schema deltas,
   query shapes, category-agnosticism check, ADR needed or not.
5. **Design system** as `design-system-engineer`: existing components used, new
   ones justified, tokens needed.

Finish with a numbered list of **exact implementation tasks** in dependency
order, each small enough to be a single commit, and the tests each one needs.

Read `docs/product/product-spec.md` and the relevant ADRs before answering.
