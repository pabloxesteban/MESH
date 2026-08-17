---
name: testing
description: What to test in MESH and how — unit, RLS, component state, and E2E conventions. Use when writing tests or deciding whether a feature is done.
---

# Testing

## Purpose

Protect the three things that matter: the matching engine, authorization, and
the critical path.

## When to use

Writing any test. Deciding whether a feature is done. Investigating a
regression.

## Layers

| Layer | Tool | Scope |
|---|---|---|
| Unit | Vitest | `packages/domain` — pure logic |
| DB / RLS | Vitest vs local Supabase | Policies, constraints, triggers, RPCs |
| Component | Jest + RNTL | Design-system and feature components |
| E2E | Maestro | Six critical flows |

## The two load-bearing tests

**Generic RLS guarantee** — enumerate `pg_tables` in `public`; fail if any has
RLS off, force off, or zero policies; fail on any `for all` policy or any
insert policy without a `with check`. This makes an insecure table
un-shippable, which code review cannot.

**Fabrication golden test** — given a taste profile and a project, the composed
contact message equals exactly the expected string, containing nothing the user
did not supply. And no match reason may reference an omitted component.

## Cross-user pattern

```ts
// for every user-owned table
const a = await signIn(USER_A)
const b = await signIn(USER_B)

await a.from('projects').insert({ ... })              // ok
const { data } = await b.from('projects').select()     // → [] (silence, not an error)
const { count } = await b.from('projects')
  .update({ title: 'x' }).eq('user_id', USER_A.id)     // → 0 rows affected
await expect(
  b.from('projects').insert({ user_id: USER_A.id, ... })
).rejects.toThrow()                                     // policy violation
```

Zero rows rather than an error on SELECT is deliberate — an error would leak
that the row exists.

## State coverage

Every component rendering remote data is tested for **loading, empty,
error+retry, success**. Use a shared helper so writing it is cheaper than
skipping it. This is the coverage that rots first.

## E2E flows

1. First run → 12 interactions → taste → matches → profile → contact
2. Directed user → project → matches → profile
3. Anonymous → account upgrade → sign out → sign in → data intact
4. **Flow 1 using only buttons, no swipes**
5. Offline mid-deck → queue → reconnect → persisted exactly once
6. Empty match list + forced network failure → correct states → retry recovers

E2E covers flows, never algorithm correctness.

## Fixtures

Matching fixtures are committed with expected values. **Changing an expected
value requires an algorithm version bump and a documented rationale** — the
test is the enforcement mechanism, so never "fix" a failing matching test by
editing the expectation.

## Anti-patterns

Testing implementation details instead of behaviour · Snapshots substituting
for assertions · A flaky test left in the suite · Mocking the thing under
test · Assessing algorithm correctness visually · Editing a fixture to make a
test pass · E2E duplicating unit coverage until the suite is too slow to run ·
Chasing a coverage percentage.

## Quality checklist

- [ ] New pure logic has unit tests in `packages/domain`
- [ ] New table has cross-user RLS tests
- [ ] New constraint has a rejection test
- [ ] Component states all tested
- [ ] Critical-path change re-runs the affected E2E flow
- [ ] No test relies on wall-clock time or random ordering
- [ ] Failing matching tests investigated, never re-baselined
