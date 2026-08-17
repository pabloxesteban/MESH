---
name: content-seeding
description: Adding artists, validating content, and running the seed pipeline. Use when adding or updating artist content, changing the taxonomy, or working on tools/seed.
---

# Content seeding

## Purpose

Get real artists into MESH reliably, with consent, without fabrication, and
without ever partially applying a broken batch.

## When to use

Adding or updating an artist. Changing the taxonomy. Any change to
`tools/seed/` or `content/`.

## Absolute rules

1. **No consent record, no seed.** `content/artists/<slug>/consent.md` with
   date, medium, scope, and who obtained it. Missing consent is a hard failure.
2. **No scraping.** Every image comes from the artist or at their explicit
   direction.
3. **Never fabricate** a bio, price, availability, review, or credential. A
   missing field renders nothing.
4. **Fixtures are unmistakable:** `is_fixture = true`, `[Fixture] ` name
   prefix, visible badge in non-production builds. **Production seeding fails
   if any fixture is present.**
5. **Validate everything before writing anything.** Abort before the first
   insert. Never partially apply; never silently skip a bad record.

## Content layout

```
content/artists/<slug>/
  artist.yaml       identity, bio, location, styles, price, availability, socials
  portfolio.yaml    per piece: file, caption, year, styles + weights
  consent.md        required
  media/            source images (gitignored — originals stay with the artist)
```

## Example `artist.yaml`

```yaml
slug: luna-vera
display_name: Luna Vera
category: tattoo
location: caba
bio: |
  Trabajo fine line y botánico, en negro, con foco en composiciones chicas.
styles:
  - { slug: fine-line, proficiency: 1.0, primary: true }
  - { slug: botanical, proficiency: 1.0, primary: true }
  - { slug: minimalist, proficiency: 0.6, primary: false }
price:
  min_cents: 45000
  max_cents: 120000
  currency: ARS
  priced_at: 2026-08-10
availability:
  status: limited
  updated_at: 2026-08-10
contact:
  instagram: lunavera.tattoo
  whatsapp: "+5491155551234"
```

`botanical` must exist in the taxonomy for `tattoo`, or validation fails.

## Validation checklist (Zod, in `packages/domain/src/content/`)

- Required fields present and non-empty
- `whatsapp` valid E.164; `instagram` a bare handle, not a URL
- Every style slug exists for that category
- Portfolio item style weights sum to 1 ± 0.001
- `min ≤ max`; ISO-4217 currency; `priced_at` present if priced
- `availability.updated_at` present if a status is given
- Every media file exists, is JPEG/PNG/WebP/HEIC, ≤ 12 MB, dimensions readable
- Consent record exists and is dated

## Pipeline

```
validate all → resize (sm 400 / md 900 / lg 1600, WebP) → blurhash
→ upload to Storage → upsert rows → write audit_event
```

Idempotent — re-running produces the same result and does not duplicate media
(checksum on `media_assets`). Uses the service-role key, which exists only
here. The tool refuses to run inside a Metro/Expo context.

Always dry-run locally against `supabase start` before touching a hosted
project.

## Style tagging is a product-quality problem

Match quality is bounded by tagging quality. Tags come from the artist's own
description wherever possible, and artists get to correct them. Item weights
put the primary style highest so a five-tag piece cannot outvote a focused one.

## Withdrawal

Unpublish immediately, delete storage objects and rows, remove the content
directory — same working day. Keep only the consent/withdrawal record and an
audit entry.

## Anti-patterns

Placeholder bios that read as real · Stock tattoo photography · A fixture with
a plausible human name · Seeding to production without a local dry run · Style
tags invented by whoever added the artist · Committing source media · A
partially applied batch · A warning where a hard failure belongs.

## Quality checklist

- [ ] Consent record present and dated
- [ ] All validation passes locally
- [ ] Dry run against local Supabase clean
- [ ] Re-run is idempotent (no duplicate media, no duplicate rows)
- [ ] No fixture rows in a production run
- [ ] Style tags reviewed against the artist's own description
- [ ] Derived sizes and blurhash generated
- [ ] `audit_event` written
