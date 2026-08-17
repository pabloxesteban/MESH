---
name: matching-system
description: How MESH computes taste, scores professionals, and generates match reasons. Use for any change to packages/domain/src/taste or matching, or to how recommendations are presented.
---

# Matching system

## Purpose

Recommendations that are honest, explainable, reproducible, and testable —
MESH's only original claim.

## When to use

Any change to the taste engine, the scoring function, ranking, reasons, or how
match strength is displayed.

## The specification of record

`docs/product/matching.md`. Code and spec must agree; if they disagree, that is
a bug in one of them. Reasoning lives in `docs/decisions/ADR-005-matching.md`.

## Hard rules

1. **Deterministic.** No randomness, no wall-clock inside scoring, no
   inference. Same inputs → same score, same order, same reasons.
2. **Pure.** No DB, no network, no React. Plain data in, plain data out.
3. **Versioned.** `TASTE_VERSION` / `MATCHING_VERSION` on every persisted row.
4. **Missing components are omitted and weights renormalised** — never scored
   zero. Unknown ≠ bad.
5. **Stale availability (>45 days) is unknown**, so it is omitted from score
   and display.
6. **Reasons are derived**: only components contributing ≥ 0.10 of the score,
   ordered by contribution, max 3, from the closed template set. No fallback.
7. **A reason may never reference an omitted component.**
8. **Nothing below 0.40 is shown**, even if the list ends up empty.
9. **Bands, not percentages**, in the UI.
10. **Aversion is never displayed** as "you dislike X".

## The numbers

```
like +1.0 · like+save +1.5 · pass −0.25
raw_s = Σ (v_i × w_{i,s})           w sums to 1 per item
t_s   = max(0,raw)  / (max(0,raw) + 3.0)
a_s   = max(0,−raw) / (max(0,−raw) + 3.0)
ready ⇔ n ≥ 12 AND ≥3 styles with t_s ≥ 0.30

Style = clamp01( Σ(t_s·p_as)/Σt_s − 0.5·Σ(a_s·p_as)/Σa_s )   over top 6 styles
score = Σ_known(w_c · v_c) / Σ_known(w_c)
weights: style .70 · location .15 · price .10 · availability .05
bands: ≥.75 Fuerte · ≥.55 Bueno · ≥.40 Posible · below → not shown
project blend: t' = 0.75·project + 0.25·taste
```

## Changing anything above

1. Bump the version constant.
2. Update `matching.md` including the **rationale**, not just the number.
3. Recompute and review fixtures.
4. Invalidate cached `taste_profiles` / `matches` on the old version.

Silent tuning is prohibited.

## Testing

The full required list is `matching.md` §8. It is not optional. Property-based:
score always in `[0,1]`; adding a like never lowers a matching artist's score;
reasons are always a subset of contributing components. Never assess algorithm
correctness visually.

## Anti-patterns

Tuning weights so a demo looks good · `Math.random()` tiebreak · Time decay
without an explicit half-life and snapshots · Dwell-time signals (they make
MESH optimise for attention) · Scoring an unknown component as zero · A reason
template that flatters instead of explaining · Making the discovery feed
taste-driven (the engine's input becomes a function of its own output) · "Let
an LLM write the explanation".

## Quality checklist

- [ ] Pure and deterministic (no clock, no random, no IO)
- [ ] Version bumped if any number changed
- [ ] `matching.md` updated with rationale
- [ ] Fixtures recomputed and reviewed
- [ ] Omission-renormalisation test still passes
- [ ] No reason references an omitted component
- [ ] Ordering stable across permuted input
- [ ] Cold-start and empty-input cases produce zeroes, not `NaN`
