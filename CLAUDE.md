# MESH — working agreement

Read this before changing anything. It is short on purpose.

## What MESH is

MESH helps people discover the right person to bring an idea to life. It learns
visual taste from like/save/pass decisions and recommends professionals, with
an explanation. V1: tattoo artists, Buenos Aires / CABA, 8–15 curated real
artists, no booking, no payments, contact via WhatsApp/Instagram.

## Non-negotiables

1. **Explainable over clever.** No ML or LLM in the recommendation path. The
   matching function is deterministic, versioned, and unit-tested.
2. **Never fabricate.** No invented reviews, testimonials, availability,
   prices, booking stats, or match reasons. A reason may only be shown if the
   term it describes actually contributed to the score.
3. **No dark patterns.** No streaks, points, levels, fake scarcity or urgency,
   artificial limits, or engagement-bait notifications. Ever.
4. **RLS on every table.** Enabled *and* forced, with explicit policies.
   Adding a table without policies fails CI.
5. **Service-role key never touches the client.** It exists only in
   `tools/seed` and server-side functions.
6. **Swipe is never the only way.** Every gesture has an equivalent button with
   an accessible label and a ≥44pt target.
7. **The core is category-agnostic.** No `tattoo_*` columns, types, or props in
   core entities. Use Category / Style / Professional / PortfolioItem /
   Project.
8. **Tokens, not hex.** No raw colors, spacings, radii, or durations inside
   screens. Import from the design system.
9. **Spanish first.** The market is CABA. Every user-facing string goes through
   i18n with `es-AR` as the source locale.

## Where things live

| What | Where |
|---|---|
| App screens, components, design system | `apps/mobile/src/` |
| Taste + matching engines, taxonomy, types, Zod schemas | `packages/domain/src/` |
| Content seeding CLI (service role) | `tools/seed/` |
| SQL migrations and RLS policies | `supabase/migrations/` |
| Artist content files | `content/artists/` |
| Decisions | `docs/decisions/` |

Pure logic goes in `packages/domain` so it can be tested without a simulator
and reused by the seeder. If it imports from `react-native`, it does not belong
there.

## Before you change something

- **Schema change** → follow `.claude/workflows/database-change.md`. A new
  table without RLS policies and a cross-user access test is not done.
- **New feature** → follow `.claude/workflows/new-feature.md`. Start by asking
  whether it serves DISCOVERY, TASTE, MATCHING, TRUST, or ACTION. If it serves
  none, do not build it.
- **Matching change** → bump `MATCHING_VERSION`, update
  `docs/product/matching.md`, update fixtures. Never change weights without
  updating the documented rationale.
- **Architectural decision** → write an ADR in `docs/decisions/`.

## Definition of done

Working code is not done. Done is: implementation works, types pass, lint
passes, tests pass, security reviewed, loading/empty/error states exist,
accessibility considered, docs updated, no regression.

## Push target

Development happens on `claude/mesh-v1-spec-7m86k7` unless told otherwise.
