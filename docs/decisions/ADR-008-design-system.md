# ADR-008 — Design system inside the app, enforced by lint

**Status:** Proposed · **Date:** 2026-08-17 · **Owner:** design-system-engineer

## Context

The brief requires a centralised design system with tokens and a named
component catalogue, and forbids arbitrary design values inside screens. The
proposed repository structure listed `packages/design-system` as a workspace.

## Problem

Where does the design system live, and what actually stops a raw `#9C2D40` from
appearing in a screen six weeks from now?

## Options — location

**A. `packages/design-system` workspace.** A hard import boundary; publishable;
reusable by a future web app.
**B. `apps/mobile/src/design-system/`.** No build step, no version skew, one
consumer.

## Options — enforcement

**W. Convention and code review.**
**X. ESLint rules that fail the build.**
**Y. A type system that makes raw values unrepresentable** (e.g. branded
tokens, no `style` prop escape hatch).

## Decision

**B** for location, **X** as the primary enforcement with elements of **Y**.

Rules:

- `no-restricted-syntax` forbidding hex colour literals, numeric `padding`/
  `margin`/`gap`/`borderRadius`/`fontSize` values, and raw animation durations
  anywhere outside `src/design-system/`.
- `Text` takes a `role` prop from a closed union; it has no `fontSize` prop at
  all. The same for spacing on `Box`.
- Screens may not import `@supabase/supabase-js` (a layering rule, enforced the
  same way).
- Contrast ratios for every semantic token pair are asserted in a test, not
  judged by eye.

## Why

The design system has exactly one consumer and is coupled to React Native.
Extracting it into a workspace buys an import boundary and costs a build step,
a version boundary, and an indirection on every edit — during the phase where
tokens change most. Moving it later, if a web app appears, is a folder move; the
tokens are already isolated in `tokens/`.

The important half of this decision is enforcement. "No arbitrary values in
screens" is a rule every team has and most teams break, because review is the
weakest possible enforcement mechanism and it fails precisely when someone is
rushing. A lint rule fails the build, is not negotiable at 2am, and does not
require a reviewer to notice. Removing the escape hatch from `Text` and `Box` is
stronger still: you cannot pass a font size that does not exist.

Asserting contrast in a test rather than in a review matters because the
brief's accent colour **fails AA on the dark surface** — a mistake that is
invisible to a designer with good eyesight on a good screen, and obvious to a
test.

## Consequences

- Some legitimate one-off values will be blocked. Correct response: name it and
  add it to `tokens/`, or use a variant. That friction is the feature.
- Lint rules need occasional escape hatches for third-party wrappers; each
  exemption is an inline disable with a comment explaining it, and they are
  reviewed at release time.
- Screens stay short — mostly composition — which makes them easy to read and
  to change.
- The catalogue in
  [`docs/design/design-system.md`](../design/design-system.md) must be updated
  in the same commit as a new component. A component not in the catalogue does
  not exist.
