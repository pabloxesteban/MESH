---
name: react-native
description: Expo and React Native conventions for MESH — layering, state, gestures, images, lists, and data fetching. Use when writing or reviewing anything in apps/mobile.
---

# React Native / Expo

## Purpose

Keep the client fast, layered, and boring to read.

## When to use

Any change in `apps/mobile/`. Especially the deck, transitions, image loading,
and data fetching.

## Layering

```
screens/         expo-router routes — composition only
features/<x>/    components · hooks · queries.ts (only place supabase-js is called)
design-system/   tokens and components
data/            supabase client, query client, offline queue, error mapping
analytics/       track()
i18n/            es-AR source
```

Lint-enforced: `screens/` may not import `@supabase/supabase-js`; nothing
outside `design-system/` may contain a raw design value; `packages/domain` may
not import react, react-native, or supabase.

## State

| Kind | Tool |
|---|---|
| Server data | TanStack Query |
| Per-frame / gesture | Reanimated shared values — **never** React state |
| Cross-screen session | One small Zustand store |
| Persistence | MMKV |
| Session tokens | `expo-secure-store` only |

## Gestures

- `react-native-gesture-handler` + Reanimated worklets. If React re-renders
  during a drag, it is a bug.
- Velocity-aware thresholds: fast flick past 25% width commits; slow drag needs
  45%; a stalled drag springs back.
- Dismissal direction follows the throw.
- Haptic at the commit point, not on release.
- Every gesture has a button equivalent and an `accessibilityAction`.

## Images

- `expo-image`, always. Blurhash placeholder from `media_assets`, explicit
  `contentFit`, `recyclingKey` in recycled lists.
- Request the right derived size: grids `sm`, deck `md`, full view `lg`.
- Prefetch the next 3 deck images at `md`.
- Reserve space from stored dimensions — no layout shift.

## Lists

FlashList with a real `estimatedItemSize`. Cursor pagination, never `OFFSET`.
Stable `keyExtractor`. Memoise row content on id.

## Data fetching

- Queries live in `features/<x>/queries.ts` and nowhere else.
- Query keys are structured arrays, exported from the feature.
- Never filter by user id in a client query for *security* — RLS does that. A
  client filter is for correctness only.
- Mutations are idempotent where the network can retry them (interactions are
  upserts on `(user_id, portfolio_item_id)`).
- Optimistic updates always ship with a rollback.

## Errors and states

Every remote surface: loading, empty, error+retry (and degraded for discovery).
Errors are mapped in `data/errors.ts` to offline / server / not-found /
permission. Raw Supabase or Postgres strings never reach a user or an
analytics event.

## Example

```tsx
// features/discovery/queries.ts
export const discoveryKeys = {
  feed: (categoryId: string) => ['discovery', 'feed', categoryId] as const,
}

export function useDiscoveryFeed(categoryId: string) {
  return useInfiniteQuery({
    queryKey: discoveryKeys.feed(categoryId),
    queryFn: ({ pageParam }) =>
      supabase.rpc('get_discovery_feed', {
        p_category: categoryId, p_limit: 20, p_cursor: pageParam ?? null,
      }).throwOnError(),
    getNextPageParam: (last) => last.data?.at(-1)?.cursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  })
}
```

## Anti-patterns

`useState` inside a gesture handler · Legacy `Animated` where Reanimated
belongs · Fetching in a screen file · `FlatList` for a long media grid · Images
without `recyclingKey` · `OFFSET` pagination · Blocking network work before the
first frame · `useEffect` chains causing a second mount render · Storing tokens
in AsyncStorage or MMKV · Premature `useMemo` with no measurement.

## Quality checklist

- [ ] No layering violation (lint passes)
- [ ] All four states implemented
- [ ] Gesture has a button + accessibility action equivalent
- [ ] Images use the correct derived size and a `recyclingKey`
- [ ] One round trip for the screen
- [ ] Mutations idempotent, optimistic updates have rollback
- [ ] Tested on a real device if it touches gestures or images
