# ADR-007 — Expo Router and a four-tab structure

**Status:** Proposed · **Date:** 2026-08-17 · **Owner:** ux-product-designer, mobile-engineer

## Context

The brief defines two equal entry points: **Discover** (exploratory) and
**Create a project** (directed). It also requires that a directed user is never
forced through onboarding, and that deep links work (`mesh://artist/:slug`).

## Problem

Which router, and how are the surfaces arranged so both intents are obvious at
first launch without inflating the app?

## Options — router

**A. Expo Router.** File-based, typed routes, deep linking and universal links
built in, layouts map cleanly to tabs and modals.
**B. React Navigation directly.** More explicit, more configuration, deep
linking assembled by hand.

## Options — structure

**W. 3 tabs** — Discover / Matches / You, with Projects nested under You.
**X. 4 tabs** — Discover / Matches / Projects / You.
**Y. 2 tabs + a central action button** — Discover / Matches with a "+".

## Decision

**Expo Router**, and **X — four tabs**: Discover · Matches · Projects · You.

Modals for project creation, contact, filters, and auth. Artist profile is a
pushed screen reachable from every surface.

## Why

Expo Router is built on React Navigation, so nothing is lost, and it gives deep
linking and typed routes without hand-maintained configuration — which matters
because deep-link parameter handling is a security surface
([threat model T7](../security/threat-model.md)) and hand-rolled linking configs
are where those bugs live.

On structure: the brief treats the directed user as a first-class case. Option W
hides their entry point two levels deep behind a tab named after the *user*,
which is where nobody looks for "post what I want". Option Y's central "+"
button is a compose affordance borrowed from social apps and reads as "create
content", which is the wrong verb — a project is a brief, not a post.

Four tabs costs one slot of horizontal space and makes both intents visible on
first launch. The empty Projects tab is not a placeholder: **the empty state is
the create-project entry point.**

Matches carries the taste summary above the ranked people, because taste and
matches are the same idea at two zoom levels. Separating them into two tabs
would make the user assemble the connection MESH exists to draw.

## Consequences

- Four tabs is near the limit before a tab bar feels like a filing cabinet. Any
  fifth surface must displace one of these, not join them.
- This is [open question Q2](../product/product-spec.md#14-open-questions): if
  `project_started` originating from the Projects tab is negligible after the
  first cohort, collapse to three and surface projects from Discover.
- Deep links must validate every parameter before use, and must never mutate
  state. Unauthorized and nonexistent targets resolve to the same not-found
  screen so links cannot probe for existence.
- No tab may carry a badge or a notification dot in V1 — that is engagement
  bait, and the brief forbids it.
