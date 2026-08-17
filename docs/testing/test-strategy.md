# MESH — Test Strategy

**Status:** Proposed · **Owner:** qa-engineer

---

## 1. What we optimise for

Tests exist to protect three things, in order:

1. **Correctness of the taste and matching engines** — the product's only
   original claim. These must be provable, not observed.
2. **Authorization** — a broken policy is a data breach, not a bug.
3. **The critical path** — launch → discover → taste → match → profile →
   contact. If that path breaks, MESH does nothing.

Coverage percentage is not a goal. Coverage of those three things is.

## 2. Layers

| Layer | Tool | Scope | Speed |
|---|---|---|---|
| Unit | Vitest | `packages/domain` — taste, matching, content schemas, formatters | ms |
| Contract | Vitest + Zod | Content files validate; DB types match `packages/domain` types | ms |
| Database / RLS | Vitest against local Supabase | Policies, constraints, triggers, RPCs, cross-user access | seconds |
| Component | Jest + React Native Testing Library | Design-system primitives, cards, states | seconds |
| E2E | Maestro | Critical flows on a real simulator/device | minutes |
| Manual device pass | Checklist | Gesture feel, image loading, haptics, dynamic type | per release |

Two runners is a deliberate trade: Vitest is much faster for pure logic and the
domain suite runs on every save; `jest-expo` remains the mature path for the
React Native component layer.

## 3. Domain tests (`packages/domain`)

The full required list is in
[`matching.md`](../product/matching.md) §8 and is the acceptance criteria for
Phases 9–10. Highlights:

- Taste: interaction weighting, multi-style splitting, saturation, aversion,
  undo symmetry, readiness boundary at `n = 11` vs `n = 12`, empty input.
- Matching: exact / partial / zero overlap, location variants, price band
  variants, availability freshness, **omission renormalisation**, ordering
  stability, reason derivation and thresholds.
- Property-based (fast-check): score always in `[0,1]`; adding a like never
  lowers a matching artist's score; reasons are always a subset of
  contributing components.

Fixtures are committed with expected values. Changing an expected value
requires an algorithm version bump and a documented rationale — the test is the
enforcement mechanism for §9 of the matching spec.

## 4. Database and RLS tests

Run against `supabase start` with real JWTs for two users, A and B.

**The generic guarantee** — one test, applies to every table forever:

```
for every table in schema public:
  assert rowsecurity = true
  assert forcerowsecurity = true
  assert count(policies) > 0
for every "for insert" policy:
  assert with_check is not null
assert no policy has cmd = 'ALL'
```

**Per-table cross-user tests** — for each user-owned table
(`interactions`, `taste_profiles`, `projects`, `project_styles`,
`project_references`, `matches`, `profiles`):

- A can read/write its own rows.
- B gets **zero rows** selecting A's rows (not an error — silence, so existence
  is not leaked).
- B's UPDATE and DELETE against A's rows affect 0 rows.
- B cannot INSERT a row with `user_id = A`.

**Catalogue tests:**

- Unpublished professionals and their portfolio items are invisible to clients.
- `media_assets` for another user's private project reference is invisible.
- `analytics_events` cannot be selected by any client role.
- `audit_events` is inaccessible to `anon` and `authenticated` entirely.

**Constraint tests:** `is_saved` with `verdict = 'pass'` rejected; price
min > max rejected; published professional with no contact channel rejected;
portfolio item style weights summing to ≠ 1 rejected by the validator.

**Storage tests:** user B cannot write to `references/{A}/…`; SVG upload
rejected; over-size upload rejected.

## 5. Component tests

For every component that fetches or displays remote data, assert all four
states render: **loading, empty, error (with retry), success**. This is
mechanical and it is the thing that most reliably rots.

Additional:
- Design-system primitives render from tokens (a snapshot catches a raw hex
  slipping in; a lint rule prevents it in the first place).
- Interactive controls expose an accessibility label and a ≥44pt target —
  asserted, not eyeballed.
- The deck exposes accessibility actions for like/pass/save.
- The contact message composer, given a taste profile and a project, produces
  exactly the expected string and **nothing else** — a golden test against
  fabrication.

## 6. E2E flows (Maestro)

1. **First run → contact.** Fresh install → intro → deck → 12 interactions →
   taste reveal → matches → open profile → open contact → verify pre-filled
   message content → (WhatsApp URL is asserted, not opened).
2. **Directed user.** Fresh install → skip to Projects → create a project →
   receive matches → open a profile.
3. **Account upgrade.** Anonymous session with taste → create account → sign
   out → sign in → taste and saves intact.
4. **Accessibility path.** Complete flow 1 using only buttons, no swipes.
5. **Offline.** Airplane mode mid-deck → interactions queue → reconnect →
   interactions persisted exactly once.
6. **Empty and error.** Empty match list shows the honest empty state; forced
   network failure shows error + retry, and retry recovers.

E2E covers flows, never algorithm correctness — §3 owns that.

## 7. Performance tests

Not automated in V1; a measured checklist per release on a real mid-range
Android device, release build:

- Cold start → first artwork painted: **< 2.5s** on 4G
- Deck gesture: sustained 60fps, no dropped frames over 20 swipes
- Profile open → hero painted: **< 800ms** warm cache
- Memory after 100 deck cards: no unbounded growth
- Feed query, profile query, match query: **1 round trip each**, verified in
  the network log

Numbers recorded in the release check with the device named. An unrecorded
number is not a measurement.

## 8. CI

On every push:

1. Typecheck all workspaces
2. Lint (including the no-raw-design-values and no-supabase-in-screens rules)
3. `packages/domain` unit tests
4. Content validation over `content/artists/**`
5. Start local Supabase → apply migrations → RLS + constraint tests
6. Component tests
7. Bundle secret scan
8. `npm audit` (fail on high/critical)

E2E runs on demand and before a release, not on every push.

## 9. Definition of done for a feature

- [ ] Types pass, lint passes
- [ ] Unit tests for new logic in `packages/domain`
- [ ] RLS tests for any new table or policy
- [ ] Loading / empty / error / retry states implemented **and** tested
- [ ] Accessibility: labels, targets, non-gesture path
- [ ] No raw design values in screens
- [ ] Analytics events added to the catalogue in the same commit
- [ ] Docs updated (spec, ADR, or skill)
- [ ] Manual device pass for anything touching gestures or images
