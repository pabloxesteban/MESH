---
name: performance
description: Performance budgets and techniques for MESH — startup, gestures, images, queries, memory. Use when a surface feels slow, before a release, or when touching the discovery or profile path.
---

# Performance

## Purpose

Make MESH feel fast on a real mid-range phone on a mobile network in Buenos
Aires — not on a simulator on a laptop.

## When to use

Anything on the discovery or profile path. Adding a dependency. Before a
release. Whenever something feels slow.

## Budgets

Measured on a **real mid-range Android device**, **release build**, recorded
with the device named. An unrecorded number is not a measurement.

| Budget | Target |
|---|---|
| Cold start → first artwork painted | < 2.5s on 4G |
| Deck gesture | 60fps sustained, 20 swipes, zero dropped frames |
| Profile open → hero painted | < 800ms warm cache |
| Round trips per screen | 1 |
| Memory after 100 deck cards | no unbounded growth |

## Where the time goes, in order

1. **Image bytes** — ~95% of the deck's payload. Verify the client requests the
   right derived size (`sm` grids / `md` deck / `lg` full). This is the highest
   leverage check and it silently regresses.
2. **Round trips** — one per screen. Three queries means an RPC is missing.
3. **Decode and layout** — blurhash + stored dimensions reserve space before
   decode, eliminating layout shift.
4. **Bridge traffic during gestures** — any React state update per frame is a
   bug.
5. **Startup work** — nothing blocks the first frame.

## Techniques

- `expo-image` with disk cache, blurhash, explicit `contentFit`,
  `recyclingKey` in recycled lists.
- Prefetch the next 3 deck images at `md`; the top match's hero at `lg` when
  the match list renders.
- FlashList with a real `estimatedItemSize`.
- Cursor pagination — never `OFFSET`.
- Gestures in Reanimated worklets, never React state.
- At most 3 deck cards mounted; memoise card content on id.
- Fonts and the intro screen ship in the bundle.

## How to investigate

- Network log through a deck session: which size, how many bytes per card, is
  prefetch firing, does the disk cache hit on a second pass?
- `explain analyze` the feed RPC, profile query, and match query **with RLS
  predicates in place** — policy `EXISTS` subqueries are part of the plan.
- Frame timing during a sustained swipe, on device.
- Memory over 100 cards — is `recyclingKey` set, are cards unmounting?
- Startup trace and bundle size after any dependency addition.

## Rules

- **Measure before optimising.** Intuition about React Native performance is
  usually wrong.
- Never "optimise" by removing a loading, empty, or error state.
- Never degrade image quality below what the artwork deserves — this is a
  product about looking at people's work. Find the bytes elsewhere.
- Any caching proposal states its invalidation up front.
- Any new dependency states its startup cost.

## Anti-patterns

`OFFSET` pagination · Images without `recyclingKey` · `FlatList` for a media
grid, or `FlashList` without a real `estimatedItemSize` · Fetching a whole
portfolio for four thumbnails · `useEffect` chains causing a second mount
render · Blocking network before the first frame · Premature `useMemo` ·
Declaring the deck done without a real device.

## Quality checklist

- [ ] Correct derived image size on every surface
- [ ] One round trip per screen
- [ ] `recyclingKey` set; memory flat over 100 cards
- [ ] Gesture runs on the UI thread; 60fps verified on device
- [ ] Query plans checked with RLS applied
- [ ] Budgets measured and recorded with the device named
- [ ] No state removed in the name of speed
