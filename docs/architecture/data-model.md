# MESH — Domain & Data Model

**Status:** Proposed · **Owner:** product-architect · **Reviewer:** backend-engineer, security-reviewer

---

## 1. Principles

1. **Category-agnostic core.** No `tattoo_*` column, enum value, or type exists
   anywhere in the core schema. Tattoo is a row in `categories`.
2. **User ≠ Professional.** A user may later become a professional; a
   professional is also a user of MESH as a customer. Roles are not exclusive
   and not a column on `profiles`.
3. **Media is never in Postgres.** `media_assets` holds references and
   metadata; bytes live in Storage.
4. **Every table has RLS enabled and forced,** with explicit policies. Default
   deny.
5. **Deletion behaviour is explicit on every foreign key.** No default `NO
   ACTION` left to chance.
6. **UUID v4 primary keys** everywhere, `gen_random_uuid()`. Predictable
   integer ids leak catalogue size and enable enumeration.

## 2. Entities

### Identity

**`profiles`** — one row per auth user, created by a trigger on
`auth.users`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | → `auth.users(id)` ON DELETE CASCADE |
| `display_name` | text NULL | |
| `avatar_media_id` | uuid NULL | → `media_assets` ON DELETE SET NULL |
| `locale` | text NOT NULL DEFAULT `'es-AR'` | |
| `city_location_id` | uuid NULL | → `locations` ON DELETE SET NULL |
| `analytics_opt_in` | boolean NOT NULL DEFAULT true | |
| `created_at`, `updated_at` | timestamptz | |

We do not store email — `auth.users` already has it, and copying PII into a
table the client can read is how leaks happen.

### Taxonomy (reference data, public read, no client writes)

**`categories`** — `id`, `slug` UNIQUE, `name_key`, `sort_order`, `is_active`.

**`styles`** — `id`, `category_id` → `categories` ON DELETE RESTRICT, `slug`,
`name_key`, `description_key`, `aliases text[]`, `sort_order`, `is_active`.
UNIQUE `(category_id, slug)`. `RESTRICT` because deleting a category out from
under live taste vectors must be impossible by accident.

**`locations`** — `id`, `country_code`, `admin_area`, `city`, `slug` UNIQUE,
`metro_key`, `lat`, `lng`. `metro_key` groups CABA with Gran Buenos Aires for
the location component of matching.

`name_key`/`description_key` are i18n keys, not display strings — so the
taxonomy is not English-shaped in the database.

### Supply

**`professionals`**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `owner_user_id` | uuid NULL | → `profiles` ON DELETE SET NULL. NULL = curated, unclaimed |
| `category_id` | uuid NOT NULL | → `categories` ON DELETE RESTRICT |
| `slug` | citext UNIQUE NOT NULL | deep links: `mesh://artist/{slug}` |
| `display_name` | text NOT NULL | |
| `bio` | text NULL | artist's own words |
| `location_id` | uuid NULL | → `locations` ON DELETE SET NULL |
| `travels` | boolean NOT NULL DEFAULT false | guest spots |
| `price_min_cents`, `price_max_cents` | integer NULL | CHECK min ≤ max |
| `price_currency` | char(3) NULL | ISO-4217 |
| `priced_at` | date NULL | required if a price exists |
| `availability_status` | `availability_status` NULL | `open`/`limited`/`waitlist`/`closed` |
| `availability_updated_at` | timestamptz NULL | required if status exists |
| `instagram_handle` | text NULL | bare handle, CHECK format |
| `whatsapp_e164` | text NULL | CHECK `^\+[1-9]\d{7,14}$` |
| `avatar_media_id`, `hero_media_id` | uuid NULL | → `media_assets` ON DELETE SET NULL |
| `is_published` | boolean NOT NULL DEFAULT false | |
| `is_fixture` | boolean NOT NULL DEFAULT false | |
| `claimed_at` | timestamptz NULL | |
| `created_at`, `updated_at` | timestamptz | |

CHECK: at least one contact channel when `is_published` — a published
professional you cannot contact is a dead end.

> **Deviation from the brief.** The brief lists `Professional` and
> `ProfessionalProfile` as separate entities. A 1:1 split adds a join, a second
> policy set, and a class of "profile row missing" bugs, and buys nothing in
> V1. The separation that actually matters — a *user* is not a *professional* —
> is preserved via nullable `owner_user_id`. See
> [ADR-003](../decisions/ADR-003-domain-model.md).

**`professional_styles`** — PK `(professional_id, style_id)`, `proficiency`
numeric CHECK `> 0 AND <= 1`, `is_primary` boolean. Both FKs CASCADE. Partial
unique index limits an artist to at most 3 primary styles.

**`media_assets`** — `id`, `bucket`, `path` (UNIQUE with bucket), `mime_type`,
`width`, `height`, `byte_size`, `blurhash`, `checksum`, `owner_user_id` NULL
(set for user uploads, NULL for curated content), `created_at`.

**`portfolio_items`** — `id`, `professional_id` → CASCADE, `media_id` →
RESTRICT (never orphan an image reference), `caption` NULL, `year` NULL,
`is_featured`, `sort_order`, `is_fixture`, `created_at`.

**`portfolio_item_styles`** — PK `(portfolio_item_id, style_id)`, `weight`
numeric CHECK `> 0 AND <= 1`. Weights sum to 1 per item; enforced by the seed
validator and asserted by a database test rather than a trigger (a trigger
would have to fire on the last insert of a set, which is fragile).

### Demand

**`interactions`** — the whole behavioural record.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid NOT NULL | → `profiles` ON DELETE CASCADE |
| `portfolio_item_id` | uuid NOT NULL | → `portfolio_items` ON DELETE CASCADE |
| `verdict` | `interaction_verdict` NOT NULL | `like` \| `pass` |
| `is_saved` | boolean NOT NULL DEFAULT false | |
| `source` | `interaction_source` NOT NULL | `discover` \| `search` \| `profile` |
| `created_at`, `updated_at` | timestamptz | |

UNIQUE `(user_id, portfolio_item_id)` — current state, not a log. Undo is an
update or delete; taste is a pure function of these rows.
CHECK `NOT (is_saved AND verdict = 'pass')`.

> **Deviation from the brief.** No `saved_items` table — a save is
> `is_saved = true`. Two representations of the same fact will disagree.

**`taste_profiles`** — PK `(user_id, category_id)`. `vector jsonb`
(`{style_slug: score}`), `aversion jsonb`, `decisive_count int`, `is_ready
boolean`, `algo_version text`, `computed_at timestamptz`. A cache of a
derivable value, kept for cross-device continuity and for analysis.

**`projects`** — `id`, `user_id` → CASCADE, `category_id` → RESTRICT, `title`,
`description` NULL, `location_id` NULL, `budget_min_cents`/`budget_max_cents`
NULL, `budget_currency` NULL, `timing` enum NULL
(`asap`/`weeks`/`months`/`flexible`), `size_note` NULL, `status` enum
(`draft`/`active`/`archived`), timestamps.

**`project_styles`** — PK `(project_id, style_id)`, `weight` numeric.

**`project_references`** — PK `(project_id, media_id)`, `sort_order`. Media in
the private `references` bucket, owned by the user.

**`matches`** — `id`, `user_id` → CASCADE, `professional_id` → CASCADE,
`project_id` NULL → CASCADE, `score` numeric, `band` enum, `components jsonb`,
`reasons jsonb`, `matching_version`, `taste_version`, `computed_at`. UNIQUE
`(user_id, professional_id, coalesce(project_id, '00000000-…'::uuid))`.
`components` and `reasons` are stored so a match can be audited months later —
"why did we say that?" must be answerable.

### Operational

**`analytics_events`** — `id`, `user_id` NULL → SET NULL, `session_id uuid`,
`name text`, `props jsonb`, `occurred_at`, `app_version`, `platform`. Client
INSERT only, no client SELECT. Property rules in
[`metrics.md`](../product/metrics.md) §5.

**`audit_events`** — `id`, `actor_user_id` NULL, `action`, `entity_type`,
`entity_id`, `metadata jsonb`, `occurred_at`. RLS enabled with **no policies at
all** — service role only. Written for: content seeding runs, publish/unpublish,
artist withdrawal, account deletion.

## 3. Entities in the brief that V1 does not create

| Entity | Decision |
|---|---|
| `ProfessionalProfile` | Merged into `professionals` (ADR-003) |
| `SavedItem` | Represented as `interactions.is_saved` |
| `Conversation`, `Message` | Not built — V1 contact is WhatsApp/Instagram. Building an unused messaging subsystem adds moderation, notification, and abuse surface for zero validated demand. |
| `Review` | Not built — no transactions and ~12 artists means any review UI is empty or fabricated |
| `Availability` (table) | Collapsed into two columns on `professionals`, with staleness handling |

Each is recorded with its reasoning in
[`product-spec.md`](../product/product-spec.md) §12. None of them require a
schema rewrite to add later.

## 4. Indexes

```sql
-- feed & exclusion
create index on interactions (user_id, portfolio_item_id);
create index on interactions (user_id, updated_at desc);
create index on portfolio_items (professional_id, sort_order);
create index on portfolio_items (is_featured) where is_featured;
-- taxonomy joins
create index on portfolio_item_styles (style_id);
create index on professional_styles (style_id);
-- catalogue
create index on professionals (category_id, is_published) where is_published;
create unique index on professionals (slug);
-- matching & user data
create index on matches (user_id, score desc);
create index on projects (user_id, status);
create index on analytics_events (occurred_at);
```

Every index here exists because a specific query in
[`system-architecture.md`](system-architecture.md) §4 needs it. Indexes without
a named query do not get added.

## 5. Enums

`availability_status`, `interaction_verdict`, `interaction_source`,
`project_timing`, `project_status`, `match_band`. Postgres enums, because these
values are closed, small, and shared with TypeScript types generated from the
schema. Anything plausibly open-ended (styles, categories) is a table, not an
enum.

## 6. Timestamps and soft deletion

Every table has `created_at timestamptz NOT NULL DEFAULT now()`. Mutable tables
also have `updated_at`, maintained by a shared trigger.

**No soft deletion in V1.** `is_published = false` covers the only real case
(hiding an artist). A `deleted_at` column on every table doubles the number of
ways every RLS policy and every query can be wrong. Actual deletion cascades
and is audited.

## 7. Migration conventions

- Numbered, forward-only SQL in `supabase/migrations/`, one concern per file.
- Every migration that creates a table must, in the same file: enable RLS,
  force RLS, revoke default grants, and add explicit policies. A migration that
  creates a table without policies fails CI.
- Reference data (categories, styles, locations) is seeded from
  `supabase/seed.sql` and is idempotent (`on conflict do update`).
- No migration is ever edited after being applied to the staging project.
