# Workflow — New feature

For anything user-facing. Follow in order; do not skip to implementation.

## 0. Gate

**Which of DISCOVERY, TASTE, MATCHING, TRUST, ACTION does this serve?**
If none — stop. Say so and propose the thing that does.
**Does it belong in V1?** V1 answers one hypothesis. If the feature would be
built regardless of the answer, it is probably not V1.

## 1. Critique — `product-critic`

Runs the ten questions. Reads `docs/product/product-spec.md`.
**Produces:** ship / shrink / cut, with a reason. A "shrink" verdict names the
smaller version explicitly.

## 2. Design — `ux-product-designer`

Reads the spec, `docs/architecture/navigation.md`, `docs/design/`.
**Produces:** the flow, every state (loading / empty / error+retry / success),
the copy in `es-AR`, the accessible non-gesture path, and where the user goes
from each state.
**Rejects:** anything without a forward action or a button equivalent for a
gesture.

## 3. Data & architecture — `product-architect`

Only if new entities, fields, or queries are needed.
**Produces:** schema deltas, query shapes, whether category-agnosticism holds,
and an ADR if the decision is hard to reverse.
→ If the schema changes, run `database-change.md` before continuing.

## 4. Design system — `design-system-engineer`

**Produces:** which existing components are used, which new one is justified
(used twice, or encodes a rule), which tokens are needed.
**Rejects:** any raw design value planned for a screen.

## 5. Implement — `mobile-engineer` (+ `backend-engineer`, `matching-engineer`)

Layering rules hold. Pure logic in `packages/domain`. Queries in
`features/<x>/queries.ts`. All four states built as part of the feature, not
after.

## 6. Test — `qa-engineer`

Unit tests for new domain logic. RLS tests for new tables. Component state
tests. Affected E2E flow re-run. Analytics events added to the catalogue in the
same commit.

## 7. Review — `security-reviewer`, then `performance-engineer`

Security if it touches data, auth, uploads, or deep links.
Performance if it touches discovery, profiles, images, or adds a dependency.

## 8. Document

Update whichever apply: `product-spec.md`, an ADR, the design-system catalogue,
the metrics catalogue, the relevant SKILL.md.

## 9. Verify

Definition of done: implementation works · types pass · lint passes · tests
pass · security reviewed · four states exist · accessibility considered · docs
updated · manual device pass if gestures or images are involved.

## Fast path

A copy change, a token tweak, or a bug fix does not need all nine steps. It
still needs: tests, the four states intact, and lint. Judgement, not ceremony —
but the gate in step 0 is never skipped for anything new.
