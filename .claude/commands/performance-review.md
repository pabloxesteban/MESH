---
description: Measure MESH against its performance budgets and report with real numbers.
---

Review performance of **$ARGUMENTS** (default: the discovery and profile
paths).

Take the role of `performance-engineer`. Read
`docs/architecture/system-architecture.md` §6 and
`docs/testing/test-strategy.md` §7.

Measure — on a real mid-range Android device, release build, and **name the
device in the report**:

| Budget | Target |
|---|---|
| Cold start → first artwork painted | < 2.5s on 4G |
| Deck gesture | 60fps sustained, 20 swipes, zero drops |
| Profile open → hero painted | < 800ms warm |
| Round trips per screen | 1 |
| Memory after 100 deck cards | flat |

Then investigate, in this order:

1. **Image bytes** — which derived size is actually requested on each surface?
   How many bytes per deck card? Is prefetch firing for the next 3? Does the
   disk cache hit on a second pass? This is the highest-leverage check and it
   regresses silently.
2. **Round trips** — anything above one per screen needs an RPC.
3. **Query plans** — `explain analyze` the feed RPC, profile, and match queries
   **with RLS predicates applied**; policy `EXISTS` subqueries are part of the
   plan.
4. **Gesture thread** — any React state update per frame is a bug.
5. **Startup** — anything blocking the first frame.

Rules: measure before proposing; never propose removing a loading/empty/error
state; never propose degrading image quality below what the artwork deserves.
If a budget was not measured, say "not measured" — do not estimate it.
