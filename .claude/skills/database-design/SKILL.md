---
name: database-design
description: Schema conventions for MESH — naming, keys, constraints, enums, indexes, deletion behaviour, and migrations. Use when adding or changing any table, column, or index.
---

# Database design

## Purpose

A schema that stays category-agnostic, enforces its own rules, and never leaves
authorization to the client.

## When to use

Any migration. Any new entity, column, index, or constraint.

## Rules

1. **No category-specific columns.** No `tattoo_*` anything. The acceptance
   test: adding *photography* needs rows in `categories`/`styles` and content
   files — no migration.
2. **UUID v4 primary keys** (`gen_random_uuid()`). Sequential integers leak
   catalogue size and enable enumeration.
3. **Every foreign key declares deletion behaviour explicitly.** `cascade` for
   owned children, `restrict` for reference data that must not vanish under
   live rows, `set null` for optional links.
4. **Constraints in the database, not in TypeScript.** If the client is the
   only thing preventing an invalid state, that state is reachable.
5. **Enums for closed sets** (`availability_status`, `interaction_verdict`,
   `project_status`). **Tables for open sets** (styles, categories, locations).
6. **Every index has a named query behind it.** No speculative indexes.
7. **`created_at` on everything**, `updated_at` on anything mutable via a
   shared trigger.
8. **No soft deletion.** `is_published` covers the real case; a `deleted_at` on
   every table doubles the ways every policy and query can be wrong.
9. **RLS policies in the same migration as the table.**

## Naming

`snake_case`, plural tables, singular columns. Join tables are
`<a>_<b>` with a composite PK (`professional_styles`, `portfolio_item_styles`).
Booleans read as assertions (`is_published`, `is_saved`). Money is
`*_cents integer` plus a `*_currency char(3)` — never `float`.

## Constraint examples

```sql
-- a save cannot coexist with a pass
check (not (is_saved and verdict = 'pass'))

-- a published professional must be contactable
check (not is_published or whatsapp_e164 is not null or instagram_handle is not null)

-- price sanity, and a date so we know how stale it is
check (price_min_cents is null or price_max_cents is null
       or price_min_cents <= price_max_cents)
check (price_min_cents is null or priced_at is not null)

-- availability must carry its own freshness
check (availability_status is null or availability_updated_at is not null)

-- E.164
check (whatsapp_e164 is null or whatsapp_e164 ~ '^\+[1-9]\d{7,14}$')
```

## Migrations

Numbered, forward-only, one concern per file. Never edited after being applied
to staging. Reference data seeds idempotently (`on conflict do update`). Every
migration is verified with `supabase db reset` locally before it leaves the
machine.

## Anti-patterns

A table added "for later" · A 1:1 split with no behavioural difference · Two
representations of the same fact · Denormalised counters with no reconciliation
plan · `float` for money · `text` where an enum belongs · A nullable foreign key
that is actually required · An index with no query · Editing an applied
migration · Business logic in a trigger where a constraint would do.

## Quality checklist

- [ ] Category-agnostic
- [ ] Deletion behaviour explicit on every FK
- [ ] Invariants expressed as constraints
- [ ] Indexes justified by a named query
- [ ] RLS enabled, forced, policies in the same file
- [ ] `supabase db reset` clean
- [ ] Generated TS types regenerated and matching `packages/domain`
- [ ] `docs/architecture/data-model.md` updated in the same commit
