# MESH — Taste & Matching Engine

**Status:** Proposed · **Owner:** matching-engineer · **Algorithm version:** `taste/1` · `match/1`

This document is the specification of record. The implementation in
`packages/domain/src/matching/` must match it exactly, and the fixtures in
`packages/domain/src/matching/__fixtures__/` are derived from the worked
examples here. If the code and this document disagree, that is a bug in one of
them — resolve it, do not let it drift.

---

## 1. Design constraints

1. **Deterministic.** Same inputs → same score, same order, same reasons. No
   randomness, no wall-clock reads inside scoring, no model inference.
2. **Explainable.** Every point of the score is attributable to a named term.
3. **Testable.** Pure functions over plain data. No database, no network.
4. **Versioned.** `TASTE_VERSION` and `MATCHING_VERSION` are stored on every
   persisted taste profile and match row. Changing weights bumps the version
   and invalidates cached results.
5. **Honest under sparsity.** With 8–15 artists the model must degrade to "we
   don't know yet" rather than to confident nonsense.

## 2. Vocabulary

| Symbol | Meaning |
|---|---|
| `S` | The style vocabulary of a category (e.g. tattoo → Fine Line, Blackwork, …) |
| `t_s ∈ [0,1)` | User's taste score for style `s` |
| `a_s ∈ [0,1)` | User's aversion score for style `s` (used internally, never displayed) |
| `p_{a,s} ∈ (0,1]` | Artist `a`'s declared proficiency in style `s` |
| `w_{i,s}` | Weight of style `s` on portfolio item `i`; `Σ_s w_{i,s} = 1` |
| `n` | Count of decisive interactions (like or pass) by the user in a category |

## 3. Taste engine (`taste/1`)

### 3.1 Interaction values

An interaction is stored as one row per (user, portfolio item), holding a
verdict and a save flag — not as an append-only log — so that taste is a pure
function of current state and undo is trivial.

| State | Value `v` |
|---|---|
| `like` | **+1.0** |
| `like` + `saved` | **+1.5** |
| `pass` | **−0.25** |

**Rationale for these values.** A save is a stronger, scarcer, more deliberate
signal than a like — it costs an extra action and expresses intent to return —
so it is weighted 1.5×. A pass is *weak* evidence: people pass on good work
because of placement, mood, or scroll speed, so it is damped to a quarter of a
like and can never by itself push a style negative enough to matter. The
asymmetry is intentional: false negatives (missing something you'd like) are
cheaper here than false positives (recommending someone wrong).

**Rejected:** dwell-time and view-count weighting. It would improve the model
slightly and would make MESH optimise for time-on-card, which §44 of the brief
forbids and which we do not want to build a habit of measuring.

A save without a like is not representable in the UI — saving implies liking —
so `saved = true, verdict = pass` is an invalid state, rejected by a database
check constraint.

### 3.2 Accumulation

For each style `s`:

```
raw_s = Σ over interactions i  ( v_i × w_{i,s} )
```

Item style weights sum to 1 per item, so a piece tagged with four styles cannot
outvote a piece tagged with one. Content authoring assigns weights explicitly;
`packages/domain` normalises and the seed validator rejects sets that do not
sum to 1 ± 0.001.

### 3.3 Normalisation

Split into positive and negative components, then saturate:

```
t_s = max(0, raw_s) / ( max(0, raw_s) + K )
a_s = max(0, −raw_s) / ( max(0, −raw_s) + K )
K = 3.0
```

**Why saturating rather than max-normalising.** Dividing by the strongest style
would force some style to 1.0 even for a user with three interactions, which
reads as certainty we do not have. The saturating form is *absolute*: `t_s` is
"how much evidence do we have that you like `s`", asymptotic to 1, never
reaching it. `K = 3.0` means roughly three liked pieces in a style reach 0.5
and about seven reach 0.7 — which lines up with how much evidence a person
would themselves consider convincing.

Worked example, matching the product spec's reveal screen:

| Style | Contributing interactions | `raw` | `t` |
|---|---|---|---|
| Fine Line | 9 likes @ 0.55 + 4 saves @ 0.6 | 13.65 | **0.82** |
| Botanical | 6 likes @ 0.45 + 2 saves @ 0.5 | 8.55 | **0.74** |
| Minimal | 5 likes @ 0.5 + 1 save @ 0.4 | 3.10 | **0.51** |
| Black & Grey | 2 likes @ 0.5, 3 passes @ 0.4 | 0.70 | **0.19** |

### 3.4 Readiness

```
ready  ⇔  n ≥ 12  AND  at least 3 styles have t_s ≥ 0.30
```

Below readiness there is **no taste screen and no match list** — the Matches
tab shows an honest empty state. Two conditions rather than one because twelve
interactions spread evenly across twelve styles is not a taste, it is noise.

`n = 12` is a starting assumption based on how long a user will tolerate the
onboarding deck before wanting a payoff. It is a constant in
`packages/domain/src/taste/config.ts` and must be revisited against real
funnel data (see [`metrics.md`](metrics.md), *taste completion*).

### 3.5 Display filter

A style is shown on the taste screen only if `t_s ≥ 0.15` **and** it is
supported by ≥ 2 interactions. Aversion is never displayed.

### 3.6 Recency

V1 applies **no time decay**. A validation-stage user's taste does not
meaningfully drift within the measurement window, and decay would make taste a
function of wall-clock time — destroying determinism and testability. When
sessions span months, add decay as `taste/2` with an explicit half-life and
snapshot timestamps, not before.

## 4. Match engine (`match/1`) — taste-based

### 4.1 Components

Each component returns `[0,1]`.

**Style (dominant).** Over the user's top 6 styles by `t_s`:

```
style_raw   = Σ_s ( t_s × p_{a,s} ) / Σ_s t_s
aversion    = Σ_s ( a_s × p_{a,s} ) / Σ_s a_s        (0 if the user has no aversion)
Style       = clamp01( style_raw − 0.5 × aversion )
```

`style_raw` reads plainly: *of the taste this person has demonstrated, what
fraction does this artist cover?* The aversion term is halved because passes
are weak evidence (§3.1) and we would rather show a slightly wrong artist than
silently suppress a good one.

**Location.**

| Situation | Value |
|---|---|
| Same city as the user/project | 1.0 |
| Same metro area | 0.7 |
| Different city, artist guests there | 0.4 |
| Different city, no travel | 0.0 |
| User location unknown | *component omitted* |

**Price.** Overlap of the artist's published `[min, max]` with the project's
budget band, as a fraction of the budget band. No budget or no published price
→ *component omitted*.

**Availability.** `open → 1.0`, `limited → 0.7`, `waitlist → 0.5`,
`closed → 0.2`. If `availability_updated_at` is older than 45 days, the status
is considered unknown and the component is *omitted* — MESH does not assert
availability it cannot stand behind.

### 4.2 Weights and the omission rule

| Component | Weight |
|---|---|
| Style | 0.70 |
| Location | 0.15 |
| Price | 0.10 |
| Availability | 0.05 |

**Omitted components do not score zero — they are removed and the remaining
weights are renormalised over what is known.** Missing data must never look
like a bad answer; an artist who has not published a price is not a worse
match, we simply know less about them.

```
score = Σ_{c ∈ known} ( w_c × value_c ) / Σ_{c ∈ known} w_c        ∈ [0,1]
```

**A note on Location in V1.** Every artist in V1 is in CABA, so Location is
effectively constant and contributes no ranking signal. It stays in the model
for forward compatibility and because project-based matching may specify a
different location — but it is never *shown* as a reason unless it actually
discriminated between candidates in the result set.

### 4.3 Ordering and ties

Sort by `score` descending, then by number of overlapping styles descending,
then by `professional.id` ascending. The final key is arbitrary but stable —
so the same query always returns the same order, and the E2E tests are not
flaky.

### 4.4 Presentation

The user sees a **band**, not a percentage:

| Score | Band (es-AR) |
|---|---|
| `≥ 0.75` | Fuerte |
| `0.55 – 0.75` | Bueno |
| `0.40 – 0.55` | Posible |
| `< 0.40` | not shown |

Rationale in [ADR-005](../decisions/ADR-005-matching.md). Short version: with
one city and a dozen artists, most scores land in a narrow band, and a
displayed "96%" is a precision claim the data cannot support. Bands are honest
and still rank. The raw score is available in debug builds and in the
`matches.score` column.

Candidates scoring below 0.40 are **not shown at all**, even if that leaves the
list short or empty. A short honest list beats a padded one.

### 4.5 Reasons

Reasons are derived, never authored. For each component, compute its
contribution `w_c × value_c / Σw`. Emit at most three reasons, ordered by
contribution, only for components contributing ≥ 0.10 of the final score, and
only from this closed set of templates:

| Condition | Reason (es-AR) |
|---|---|
| Top contributing style `s` with `t_s ≥ 0.5`, mostly from likes | Marcaste varios trabajos de **{s}** |
| Top contributing style `s`, mostly from saves | Guardaste diseños de **{s}** |
| Artist is primary in ≥ 2 of the user's top styles | Trabaja **{s1}** y **{s2}** |
| Location discriminated within the result set | En **{ciudad}** |
| Price band overlaps a stated budget | Su rango entra en tu presupuesto |
| Availability fresh and `open` | Está tomando turnos |

If fewer than one reason clears the threshold, the candidate is not shown.
There is no "general vibe" fallback and no generated prose.

## 5. Project-based matching

A project supplies explicit styles, location, and budget. Its style weights are
the user-declared ones, normalised to sum to 1, then **blended** with ambient
taste:

```
t'_s = 0.75 × project_s + 0.25 × t_s
```

The stated brief dominates — the person told us what they want — but ambient
taste still breaks ties between artists who all do "fine line botanical". If
the user has no taste profile yet, `t' = project`, and the match runs normally.
Location and budget come from the project when present, falling back to
profile.

## 6. Cold start

| State | Behaviour |
|---|---|
| `n = 0` | Discover feed only. No matches tab content beyond an invitation. |
| `0 < n < 12` | Progress affordance. Still no matches. |
| Ready, but no candidate ≥ 0.40 | Honest empty state: "Todavía no encontramos a alguien que encaje. Seguí explorando." Plus a link to browse all artists by style. |
| Directed user, no taste, creates a project | Project matching runs immediately — no onboarding required. |

A "new to MESH, start here" ordering may be offered before readiness, but it is
labelled as a starting point, never as a match, and it is ordered by portfolio
depth and recency — not by a fake score.

## 7. Discovery feed ordering

Not a recommender in V1. The feed is:

1. Items in the user's category, published, not yet interacted with.
2. Deterministically shuffled with a seed derived from `user_id` — so each user
   sees a stable personal order and pagination never repeats or skips.
3. Diversity constraint: no two consecutive items from the same professional,
   and at most 3 of any 10 consecutive items from one professional.

Making discovery itself taste-driven would create a filter bubble before the
taste profile is trustworthy, and would make the taste engine's input a
function of its own output. Keep the input unbiased in V1.

## 8. Required tests

Fixtures live in `packages/domain/src/matching/__fixtures__/`. Every case below
has a committed expected value; a change to any of them requires a version bump
and a documented rationale.

**Taste**
- Single like on a single-style item → exact `t_s`.
- Save weighted 1.5× a like, verified numerically.
- Multi-style item splits by weight and does not outvote a single-style item.
- Passes reduce but cannot make `t_s` negative; `a_s` rises instead.
- Undo (delete interaction) returns the vector to its prior state exactly.
- Readiness false at `n = 11`, true at `n = 12` with 3 styles ≥ 0.30.
- Readiness false at `n = 20` spread across 20 styles.
- Empty interaction set → zero vector, not `NaN`, not a divide-by-zero.

**Matching**
- Exact style match → high score, correct reasons, correct band.
- Partial match.
- Zero overlap → below floor → not returned.
- Location mismatch with travel and without.
- Price band: overlapping, adjacent, disjoint, missing.
- Availability: fresh open, fresh closed, stale (must be omitted, and must
  *not* reduce the score relative to a candidate with no availability at all).
- Omission renormalisation: an artist with unknown price and unknown
  availability scores identically to one whose only known component is style.
- Empty taste profile → project matching still works.
- Ordering stability across two identical runs and across a permuted input array.
- Reasons never reference a component that was omitted.
- Reason count ≤ 3 and threshold respected.

**Property-based**
- Score always in `[0,1]`.
- Adding a like for a style never decreases an artist's score in that style.
- Reason set is always a subset of components with non-zero contribution.

## 9. Versioning and change control

`TASTE_VERSION` and `MATCHING_VERSION` are exported constants. Any change to
weights, thresholds, `K`, band boundaries, or the reason set requires:

1. Version bump.
2. Update to this document, including the rationale.
3. Updated fixtures with expected values recomputed and reviewed.
4. Invalidation of `taste_profiles` and `matches` rows carrying the old version.

Silent tuning is prohibited. If the numbers move, the reason moves with them.
