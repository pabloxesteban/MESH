---
name: product-thinking
description: How to decide what MESH builds and what it refuses to build. Use before starting any feature, when scope grows mid-task, or when a request conflicts with the product principles.
---

# Product thinking

## Purpose

Keep MESH from becoming mediocre by accumulation. Every feature must pay for
its own existence in user value, and V1 must stay small enough to actually
answer its question.

## When to use

Before starting any feature. When a task grows beyond what was asked. When a
request contradicts a principle. At every milestone.

## Rules

1. **Every feature serves at least one of:** DISCOVERY, TASTE, MATCHING, TRUST,
   ACTION. If none, it does not ship.
2. **V1 is a validation instrument**, not a platform. The question is: *do
   people discover artists better when MESH learns their taste?* Anything that
   does not help answer it is out of scope, however reasonable.
3. **Discovery before administration.** Nothing stands between a first-time
   user and the first artwork.
4. **Visual work before metadata.** The image is the largest element on any
   screen that has one.
5. **People before tasks.** Every path ends at a person, not at a listing.
6. **Explainable before clever.** If we cannot say why, we do not say it.
7. **Trust before monetisation.** There is no monetisation in V1, and no
   pattern that would embarrass us if a user saw the code.
8. **No dark patterns.** Not one, not small, not "just for the demo".

## The critique loop

Ask, in order: Would a real person use this? Why would they come back? Is this
Pinterest / Instagram / Airtasker / Tinder? Does it improve one of the five?
What friction does it add? Does it belong in V1? What would we delete for it?

If "why would they come back" is answered with anything about engagement
mechanics, the feature is wrong.

## Anti-patterns

- Building the general case before the specific one works.
- A feature that exists because it is interesting to build.
- "We'll need it later" as justification for structure now.
- Adding a screen to solve a problem better solved by removing one.
- Measuring time-in-app, swipes, or session length as success.
- Solving a supply-side problem with demand-side polish.

## Conventions

- Scope changes are recorded in `docs/product/product-spec.md`, including what
  was cut and why. Cuts are decisions worth keeping.
- Anything hard to reverse gets an ADR.
- Open questions go in the spec's open-questions table with an owner and a
  phase — not left implicit.

## Example

> "Should we add follow/unfollow for artists?"

Serves DISCOVERY? No — the user already reaches artists through taste. TASTE?
No. MATCHING? No. TRUST? No. ACTION? Marginally, as a bookmark — which `save`
already covers.
It is the Instagram question (#4 of the critique loop), it creates a social
graph we would then have to maintain and moderate, and it turns MESH into a
feed. **Reject.** If the real need is "come back to this artist later", that is
a saved-artist row, not a follow.

## Quality checklist

- [ ] Names which of the five it serves
- [ ] Would exist even if the hypothesis proves true (i.e. it is not a hedge)
- [ ] Adds no friction to the first-run path
- [ ] Contains no fabricated content or inferred claim
- [ ] Contains no engagement mechanic
- [ ] Cut list updated if something was displaced
