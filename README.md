# MESH

**Discover people. Make ideas happen.**

MESH helps you find the right person to bring an idea to life.

> "I know what I want, or I know what I like — but I don't know who is the right
> person to make it."

That gap is the product. Pinterest tells you what you like. Instagram tells you
who you follow. Airtasker tells you who can complete a task. None of them tell
you *who is the right person for the thing you like*.

MESH learns your visual taste from the work you react to, then recommends the
people behind that work — and explains why.

**Status:** V1 in planning. This repository currently contains the product,
architecture, security, and design specification. No application code has been
written yet. See [`docs/`](docs/) and
[`docs/decisions/`](docs/decisions/).

---

## The hypothesis being tested

> People discover tattoo artists more effectively when MESH learns their visual
> taste and recommends professionals based on that taste — rather than making
> them search a directory.

V1 is a validation instrument, not a platform. It is deliberately:

- **One category** — tattoo
- **One market** — Buenos Aires / CABA, Argentina
- **Curated** — 8–15 real artists from an existing network, with consent
- **Without booking or payments** — contact happens on WhatsApp/Instagram

If the hypothesis is wrong, we want to know that in weeks with a small app, not
in a year with a marketplace.

## The loop

```
DISCOVER → TASTE → PEOPLE → MATCH → ACTION
```

```
"I like this."
      ↓
"Who made this?"
      ↓
"I like their work."
      ↓
"They understand my taste."
      ↓
"This person might be right for me."
      ↓
"Let's make it happen."
```

## Why the matching is deterministic, not AI

Every recommendation MESH makes must be explainable to the person receiving it,
reproducible in a test, and defensible when it is wrong. A model that says
"we think you'll love this" is unfalsifiable and, at 12 artists, dishonest.

MESH V1 uses an explicit, versioned, unit-tested scoring function over a taste
vector built from the user's own like/save/pass decisions. Given the same
inputs it always produces the same output and the same reasons. The reasons
shown to the user are generated *from the terms that actually contributed to
the score* — never written to sound good.

Full algorithm: [`docs/product/matching.md`](docs/product/matching.md).

## What MESH is not

Not Tinder for freelancers. Not Pinterest for professionals. Not Airtasker with
nicer cards. The swipe is an input method, nothing more — and it is never the
only way to do anything (see [accessibility](docs/design/design-system.md)).

MESH ships no streaks, no points, no fake scarcity, no fake urgency, no fake
matches, no fake reviews, no manufactured notifications. Success is measured by
whether people find someone worth contacting — not by time in app.

## Repository layout

```
apps/mobile/        Expo + React Native + TypeScript client (design system lives here)
packages/domain/    Pure TypeScript: taxonomy, types, Zod schemas, taste + matching engines
tools/seed/         Service-role content seeding CLI (never bundled into the app)
supabase/           Migrations, RLS policies, seed SQL, edge functions
content/artists/    Curated artist content, one file per artist, schema-validated
docs/               Product, design, architecture, security, testing, decisions
.claude/            Agents, skills, commands, workflows for Claude Code
```

Why this and not more packages: see
[ADR-001](docs/decisions/ADR-001-stack-and-repo-structure.md).

## Documentation

| Area | Document |
|---|---|
| Product spec | [`docs/product/product-spec.md`](docs/product/product-spec.md) |
| Matching algorithm | [`docs/product/matching.md`](docs/product/matching.md) |
| Metrics & analytics | [`docs/product/metrics.md`](docs/product/metrics.md) |
| Visual language | [`docs/design/visual-language.md`](docs/design/visual-language.md) |
| Design system | [`docs/design/design-system.md`](docs/design/design-system.md) |
| System architecture | [`docs/architecture/system-architecture.md`](docs/architecture/system-architecture.md) |
| Data model & schema | [`docs/architecture/data-model.md`](docs/architecture/data-model.md) |
| Navigation | [`docs/architecture/navigation.md`](docs/architecture/navigation.md) |
| Security model | [`docs/security/security-model.md`](docs/security/security-model.md) |
| Threat model | [`docs/security/threat-model.md`](docs/security/threat-model.md) |
| Test strategy | [`docs/testing/test-strategy.md`](docs/testing/test-strategy.md) |
| Content policy | [`docs/product/content-policy.md`](docs/product/content-policy.md) |
| Decisions (ADRs) | [`docs/decisions/`](docs/decisions/) |
| Build plan | [`docs/product/roadmap.md`](docs/product/roadmap.md) |

## Tech stack, and why

| Layer | Choice | Why |
|---|---|---|
| Client | Expo (React Native) + TypeScript | One codebase, OTA updates for a validation product, mature gesture/animation stack (Reanimated + Gesture Handler) for the discovery deck |
| Routing | Expo Router | File-based, typed routes, deep links come free — needed for `mesh://artist/:slug` |
| Backend | Supabase | Postgres + Auth + Storage + RLS in one, no server to operate for a solo build |
| Database | PostgreSQL | Relational taxonomy (category → style → professional → work) is genuinely relational; RLS gives per-row authorization at the database, not in app code |
| Matching | Plain TypeScript in `packages/domain` | Deterministic, unit-testable, no inference cost, shared by app, seeder, and tests |
| Media | Supabase Storage + `expo-image` | Binaries never go in Postgres; blurhash placeholders and disk cache keep discovery fast |

Version pinning is deliberately deferred to implementation time so we install
what is current and compatible rather than what was current when this was
written.

## Security posture

Every table has Row Level Security enabled and forced, with explicit policies.
A test asserts that no table in `public` can exist without RLS and at least one
policy — a table cannot be accidentally shipped public. The service-role key
exists only in `tools/seed` and never in the Expo bundle. User-uploaded
reference images live in a private bucket under `{user_id}/` paths enforced by
storage policies.

Details: [`docs/security/security-model.md`](docs/security/security-model.md),
[`docs/security/threat-model.md`](docs/security/threat-model.md).

## Content ethics

Every artist in MESH is a real person who has given explicit, recorded consent
for their name, work, and contact details to appear. No scraping. No fabricated
reviews, testimonials, availability, prices, or booking statistics. Development
fixtures are flagged `is_fixture` in the database and visually marked in
non-production builds so they can never be mistaken for real people.

See [`docs/product/content-policy.md`](docs/product/content-policy.md).

## Roadmap after V1

1. Second market before second category — validate that the taste engine
   transfers to another city with the same vertical.
2. Professional self-service — claim your profile, manage portfolio.
3. In-app conversations, once there is evidence people want to leave WhatsApp.
4. Second category (photography is the closest analogue: strong visual
   portfolios, style-driven choice, project-shaped demand).
5. Reviews and trust signals — only when there is real volume to make them
   meaningful.

---

MESH is a personal product project. The name, product direction, and initial
artist network are the author's own.
