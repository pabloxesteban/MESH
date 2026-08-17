---
description: Adversarial product review. Can recommend deleting features, including built ones.
---

Critique **$ARGUMENTS** (default: the current state of the product) as
`product-critic`. Read `docs/product/product-spec.md` and
`.claude/agents/product-critic.md` first.

Ask, in order, and answer each honestly rather than defensively:

1. Would a real person in Buenos Aires use this?
2. Why would they come back? (If the answer involves engagement mechanics, the
   feature is wrong.)
3. Is this just Pinterest — does it stop at taste and never reach a person?
4. Is this just Instagram — are we building feeds, follows, a social graph?
5. Is this just Airtasker — bids, quotes, job workflows?
6. Is this just Tinder — does the layout, colour, copy, or register borrow from
   dating?
7. Does it improve DISCOVERY, TASTE, MATCHING, TRUST, or ACTION?
8. What friction did it add?
9. Does it belong in V1?
10. What would we delete to make room for it?

Then raise the standing objections:
- Is a dozen artists in one city too thin for taste-based matching to feel
  different from an alphabetical list — and can a user tell?
- Is the taste profile a payoff, or a chore that kills the funnel?
- Are we optimising the seeker while twelve artists get wildly unequal inbound?

Be specific and brief. Where you recommend cutting, propose the smaller thing
that keeps the value — or say clearly that there isn't one.
