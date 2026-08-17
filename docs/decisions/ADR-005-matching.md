# ADR-005 — Deterministic matching, and bands instead of percentages

**Status:** Proposed · **Date:** 2026-08-17 · **Owner:** matching-engineer

## Context

MESH's differentiator is that it recommends *people* based on demonstrated
taste, and explains why. V1 has 8–15 artists, all in CABA, and users with a
dozen interactions each.

## Problem

Two questions. What computes the recommendation? And how is its confidence
presented?

## Options — computation

**A. Deterministic weighted scoring** over an explicit taste vector.
**B. Collaborative filtering.** Needs users we do not have.
**C. Embedding similarity** (CLIP over artwork, cosine against artist
centroids). Genuinely better at capturing visual style than tags — and
unexplainable, unversionable in the same way, and dependent on inference
infrastructure.
**D. LLM ranking.** Non-deterministic, untestable, and it would happily invent
reasons.

## Options — presentation

**W. Numeric percentage** ("96% match"), as the brief illustrates.
**X. Band** (Fuerte / Bueno / Posible).
**Y. Rank only** (an ordered list, no strength).

## Decision

**A** for computation. **X** for presentation, with the numeric score retained
internally, stored on `matches.score`, and visible in debug builds.

The full algorithm is specified in
[`docs/product/matching.md`](../product/matching.md).

## Why — determinism

Every recommendation must be explainable to the user, reproducible in a test,
and defensible when wrong. Deterministic scoring gives all three; nothing else
on the list gives any. It also costs nothing to run and can be unit-tested
without a simulator or a network.

Embeddings (C) are the real long-term answer for visual style — tags cannot
distinguish two artists who both say "fine line" but look nothing alike. The
correct sequence is: ship the explainable version, learn what "style" actually
means to users, then add embeddings **as an additional scored component with
its own explanation**, not as a replacement for the reasoning.

## Why — bands, against the brief

The brief's example shows "96% match". With 8–15 artists in one city, scores
will cluster in a narrow range, and small differences in tagging will move a
displayed percentage by several points without meaning anything. Two problems
follow:

1. **It is a precision claim the data cannot support.** Two significant figures
   assert a resolution we do not have.
2. **It invites disbelief.** A skeptical user's first reaction to "96%" is
   "based on what, exactly?" — and if the answer is "eleven taps", the number
   undermines the reasons standing next to it. The reasons are the thing that
   actually persuades.

Bands rank just as well, degrade gracefully as the catalogue grows, and are
honest about resolution. Below 0.40 nothing is shown at all — a short list is
better than a padded one.

**We would switch to percentages when:** the catalogue is large enough that
scores spread across the range, style tagging is validated against artist
self-description, and we have evidence that users read the number as relative
rather than absolute.

## Other decisions recorded here

- **Missing components are omitted and weights renormalised**, never scored
  zero. An artist who has not published a price is not a worse match; we just
  know less.
- **Stale availability (>45 days) is treated as unknown.** Asserting freshness
  we do not have is the same class of error as inventing a review.
- **Reasons come from a closed template set**, emitted only for components that
  contributed ≥ 0.10 of the score, capped at three. No generated prose.
- **Discovery ordering is not taste-driven** in V1 — that would make the taste
  engine's input a function of its own output and build a filter bubble before
  the profile is trustworthy.

## Consequences

- Match quality is bounded by tagging quality. Tagging becomes a content-quality
  problem, and artists must be able to correct their own tags.
- The band boundaries (0.75 / 0.55 / 0.40) are assumptions and will need
  calibration against real distributions once there is data.
- Storing `components` and `reasons` on every match row means we can audit
  "why did MESH say that?" months later.
- Any weight change bumps `MATCHING_VERSION`, invalidates cached matches, and
  requires this document to change with it.
