# ADR-001 — Stack and repository structure

**Status:** Proposed · **Date:** 2026-08-17 · **Owner:** product-architect

## Context

MESH V1 is a mobile-first validation product built by one developer, targeting
iOS and Android in Buenos Aires, with a catalogue of 8–15 artists and no
back-office. Speed of iteration and low operational burden matter more than
theoretical scale.

## Problem

Which client stack, which backend, and how much repository structure is
justified before any of it is proven useful?

## Options

**Client**
- **A. Expo (managed) + React Native + TypeScript.** One codebase, OTA updates,
  strong gesture/animation ecosystem, no native toolchain required day to day.
- **B. Bare React Native.** More native control, much more setup and
  maintenance for a solo build.
- **C. Native Swift + Kotlin.** Best possible feel; two codebases; not viable
  for one person testing a hypothesis.
- **D. Flutter.** Excellent motion, but a second language and a smaller
  overlap with the rest of the stack.

**Backend**
- **A. Supabase.** Postgres, Auth, Storage, RLS, edge functions, local dev via
  Docker.
- **B. Firebase.** Fast, but a document model fights a genuinely relational
  taxonomy, and security rules are less expressive than RLS.
- **C. Custom API (Node/Postgres).** Total control, plus a server to build,
  deploy, secure, and operate.

**Repository**
- **A. Full monorepo:** `apps/mobile`, `packages/design-system`,
  `packages/domain`, `packages/config`.
- **B. Single app, everything inside it.**
- **C. Minimal workspaces:** `apps/mobile`, `packages/domain`, `tools/seed`.

## Decision

**Expo + React Native + TypeScript**, **Supabase/Postgres**, and **option C**
for the repository:

```
apps/mobile/      Expo app; design system lives at src/design-system/
packages/domain/  Pure TS: taxonomy, types, Zod schemas, taste + matching
tools/seed/       Service-role content CLI
supabase/         Migrations, functions, reference seed
content/artists/  Curated content
```

npm workspaces. No Turbo, no Nx.

## Why

Expo's gesture and animation stack (Reanimated 3 + Gesture Handler) is exactly
what the discovery deck needs, and OTA updates matter disproportionately for a
product we expect to change weekly. The cost — less native control — does not
bite for an app whose hardest requirement is a smooth card gesture and fast
image loading.

Supabase gives us the one thing a custom API would have to be built to provide:
**row-level authorization inside the database**, so a client bug cannot become a
data breach. It also removes an entire operational surface. Firebase was
rejected because Category → Style → Professional → PortfolioItem → Interaction
is relational, and modelling it in documents would mean maintaining
denormalised copies of the taxonomy — the exact thing that silently rots.

On structure: `packages/domain` earns its place because the taste and matching
engines, the taxonomy, and the content schemas are genuinely consumed by three
things (app, seeder, tests). `packages/design-system` does not — it has one
consumer and is coupled to React Native; extracting it buys an import boundary
we can get from a lint rule instead. `packages/config` would be two files.
Structure that exists to look professional is a tax paid every day by the one
person maintaining it.

## Consequences

- Native modules outside Expo's config-plugin ecosystem would require a
  prebuild step. Acceptable; none are planned.
- Vendor concentration on Supabase. Mitigated by the fact that it is Postgres —
  the schema, the policies, and the data are portable; only Auth and Storage
  are provider-shaped.
- `packages/domain` must stay dependency-free of React and Supabase. Enforced
  by a lint rule so the boundary is real.
- If the design system is ever needed by a web app, extracting it is a folder
  move — the tokens are already isolated.
