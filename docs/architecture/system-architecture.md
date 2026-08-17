# MESH — System Architecture

**Status:** Proposed · **Owner:** product-architect

---

## 1. Shape of the system

```
┌───────────────────────────────────────────────┐
│  apps/mobile  — Expo / React Native / TS      │
│                                               │
│  screens (expo-router)                        │
│  design-system  (tokens + components)         │
│  features/      discovery · taste · match ·   │
│                 profile · project · contact   │
│  data/          TanStack Query + supabase-js  │
│  analytics/     buffered event sink           │
└──────────────┬────────────────────────────────┘
               │ anon key + user JWT, HTTPS
               ▼
┌───────────────────────────────────────────────┐
│  Supabase                                     │
│   Auth   — anonymous + email/password         │
│   Postgres — schema + RLS + RPCs              │
│   Storage — portfolio (public) ·              │
│             references (private)              │
│   Edge Functions — only where a secret or     │
│             cross-user read is required       │
└───────────────────────────────────────────────┘
               ▲
               │ service-role key, local only
┌──────────────┴────────────────────────────────┐
│  tools/seed — content CLI, never bundled      │
└───────────────────────────────────────────────┘

┌───────────────────────────────────────────────┐
│  packages/domain — pure TypeScript            │
│  taxonomy · types · Zod schemas ·             │
│  taste engine · matching engine               │
│  consumed by: mobile, seed, tests             │
└───────────────────────────────────────────────┘
```

No custom backend server. Supabase is the backend; Postgres is the
authorization layer.

## 2. Repository structure, and what was rejected

```
MESH/
├── apps/mobile/            Expo app. Design system lives in src/design-system.
├── packages/domain/        Pure TS. No React, no react-native imports. Ever.
├── tools/seed/             Service-role CLI: validate → upload media → upsert.
├── supabase/
│   ├── migrations/         Numbered SQL. Schema, policies, RPCs, indexes.
│   ├── functions/          Edge functions (few).
│   └── seed.sql            Reference data only: categories, styles, locations.
├── content/artists/        Curated artist content + consent records.
├── docs/
└── .claude/
```

npm workspaces, three workspaces. **`packages/domain` is the only shared
package, and it earns its place**: the taste and matching engines, the
taxonomy, and the content schemas are used by the app, the seeder, and the test
suite. Duplicating them would guarantee they diverge.

**Rejected — `packages/design-system`.** One consumer, and it is coupled to
React Native. Extracting it buys build complexity and an import boundary in
exchange for the appearance of sophistication. It lives at
`apps/mobile/src/design-system/` with a lint rule that screens may not define
raw style values, which is the actual goal.

**Rejected — `packages/config`.** Shared tsconfig and eslint config are two
files. `tsconfig.base.json` and `eslint.config.mjs` at the root, extended by
each workspace.

**Rejected — a monorepo build orchestrator (Turbo/Nx).** Three workspaces and
one developer. npm scripts are sufficient and legible.

See [ADR-001](../decisions/ADR-001-stack-and-repo-structure.md).

## 3. Layering in the app

```
screens/            expo-router route files. Composition only — no logic, no queries.
features/<name>/
    components/     feature UI, built from design-system primitives
    hooks/          useDiscoveryFeed, useTasteProfile, useMatches …
    queries.ts      the only place supabase-js is called for this feature
design-system/      tokens, primitives, motion, haptics
data/               supabase client, query client, offline queue, error mapping
analytics/          track()
i18n/               es-AR source, en target
```

Rules enforced by lint:

- `screens/` may not import `@supabase/supabase-js`.
- `packages/domain` may not import `react`, `react-native`, or `@supabase/*`.
- Nothing outside `design-system/` may contain a raw hex colour, px spacing
  value, or animation duration.

## 4. Data flow

**Read path.** Screen → feature hook → TanStack Query → `queries.ts` →
supabase-js (or an RPC) → Postgres, filtered by RLS. The client never sends a
"give me user X's data" query — it sends "give me my data" and the database
decides what that means.

**Discovery feed.** A Postgres RPC, `get_discovery_feed(p_category, p_limit,
p_cursor)`, `SECURITY INVOKER`, using `auth.uid()`. It excludes already-seen
items, applies the deterministic per-user shuffle and the diversity constraint
(see [`matching.md`](../product/matching.md) §7), and returns items with media
and style tags in one round trip. Doing this client-side would mean fetching
the whole catalogue.

**Interaction write.** Optimistic local update → design-system haptic → queued
upsert. Interactions are idempotent on `(user_id, portfolio_item_id)`, so a
retry after a dropped connection is safe. Offline interactions queue in MMKV
and flush on reconnect.

**Taste computation.** Runs **client-side** in `packages/domain` from the
user's own interactions, then the resulting vector is persisted to
`taste_profiles` for cross-device continuity. It is a pure function of rows the
user already owns, so there is no trust boundary to defend — and computing it
locally means the taste screen updates instantly with no round trip.

**Matching.** Also `packages/domain`, over the user's taste vector plus the
professional catalogue (which is public read). With ≤ 50 professionals this is
microseconds of work and needs no server. Results are cached in `matches` for
analytics and so a returning user sees a stable list. **This changes at scale**
— once the catalogue is too large to ship to the client, matching moves to an
edge function or a Postgres function with the same pure core. The engine is
written to make that move a hosting change, not a rewrite.

**Contact.** Fully client-side: build the message from local state, show it to
the user for editing, open the WhatsApp/Instagram URL, fire `contact_clicked`.

## 5. State management

| Kind | Tool | Why |
|---|---|---|
| Server state | TanStack Query | Caching, retries, invalidation, offline-aware; removes most of the loading/error boilerplate |
| Ephemeral UI state (deck position, gesture) | Local component state + Reanimated shared values | Gestures must run on the UI thread; nothing that touches a swipe goes through React state |
| Cross-screen session state (current category, filters) | Zustand, one small store | Simpler than Context for a handful of values |
| Persistence (taste cache, interaction queue, analytics buffer, settings) | MMKV | Synchronous, fast enough to read during startup |

No Redux. No global store of server data — that is what the query cache is.

## 6. Performance architecture

- **Startup:** no blocking network before the first frame. Fonts and the intro
  screen ship in the bundle; the feed loads behind a skeleton.
- **Images:** `expo-image` with disk caching, blurhash placeholders from
  `media_assets`, `recyclingKey` set on deck cards, explicit `contentFit`.
  Three derived sizes so the discovery deck never downloads a 1600px image.
- **Prefetch:** the next 3 deck images are prefetched at `md`; the top match's
  hero at `lg` when the match list renders.
- **Lists:** portfolio grids use FlashList with a stable `estimatedItemSize`.
- **Pagination:** cursor-based everywhere; no `OFFSET`.
- **Renders:** the deck holds at most 3 mounted cards. Card content is memoised
  on `portfolio_item_id`. Gesture state never crosses into React.
- **Queries:** the feed, the profile, and the match list are one round trip
  each. Any screen needing three queries gets an RPC instead.

Budgets (measured on a mid-range Android device, release build): cold start to
first artwork visible < 2.5s on 4G; deck gesture at 60fps sustained; profile
open to hero painted < 800ms warm cache.

## 7. Offline and failure behaviour

Every network-driven surface implements **loading / empty / error / retry**,
and discovery additionally implements **degraded**: if the feed cannot refill,
already-loaded cards stay swipeable and interactions queue locally. Errors are
mapped to a small set of user-facing causes (offline, server, not-found,
permission) in `data/errors.ts`; raw Postgres or Supabase messages are never
shown to a user or written to analytics.

## 8. Environments

| | Local | Preview | Production |
|---|---|---|---|
| Supabase | `supabase start` (Docker) | Hosted project (staging) | Hosted project |
| Content | Fixtures allowed | Fixtures allowed | Fixtures rejected by seeder |
| Client keys | Local anon key | Staging anon key | Prod anon key |
| Service role | `.env.local`, gitignored | CI secret | Operator machine only |

Client configuration is `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY` — both are publishable by design. Anything
without the `EXPO_PUBLIC_` prefix must never be read from client code, and a
test asserts the bundle contains no `service_role` string.

## 9. Extending to a second category

Adding *photography* should require:

1. Rows in `categories` and `styles`.
2. Content files for the new professionals.
3. Localised display names.
4. Possibly a category-specific taste readiness threshold.

It should require **no** schema migration, no change to the matching engine,
and no new screens. This is the architectural acceptance test for V1: if
adding a category needs code, the core leaked category knowledge and that is a
defect.

## 10. Known scaling limits (accepted for V1)

| Limit | Bites at | Response |
|---|---|---|
| Whole professional catalogue shipped to the client for matching | ~200 professionals | Move matching to an edge function; the engine is already pure |
| Taste computed client-side from all interactions | ~2,000 interactions/user | Incremental accumulation, or compute in Postgres |
| Deterministic shuffle over the full item set | ~10,000 items | Materialised feed table, or keyset over a precomputed rank |
| No CDN in front of Storage | Real traffic | Supabase image transform / CDN |

These are written down so they are decisions, not surprises.
