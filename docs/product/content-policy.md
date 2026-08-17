# MESH — Content & Real-Data Policy

**Status:** Binding · **Owner:** content-engineer + product-architect

MESH's entire value rests on the user believing what it shows them. This policy
is not a guideline.

---

## 1. Never fabricate

MESH must never generate, invent, estimate, or infer:

- Reviews, ratings, testimonials
- Booking counts, client counts, "X people contacted this artist"
- Availability or wait times
- Prices the artist did not publish
- Credentials, awards, years of experience
- Social proof of any kind
- Match reasons not derived from contributing score terms
  (see [`matching.md`](matching.md) §4.5)
- Content in a pre-filled contact message that the user did not provide
  (see [`product-spec.md`](product-spec.md) §10)

If a field is missing, the section does not render. An absent section is
honest; a plausible guess is a lie with better typography.

## 2. Consent is a prerequisite for inclusion

An artist may only appear in MESH after giving explicit, recorded consent
covering:

- Display of their name, city, bio, and social handles
- Display of the specific portfolio images provided
- Being contacted by MESH users via the channel(s) they nominated
- The style tags applied to them and to their work (they get to correct these)
- Withdrawal on request, honoured within 48 hours

Consent is recorded in `content/artists/<slug>/consent.md` — date, medium,
scope, and who obtained it — and is **required by the seed validator**. An
artist file without a consent record does not seed. This is a hard failure, not
a warning.

**No scraping.** Not Instagram, not artist websites, not aggregators. Every
image is provided by the artist or fetched with their explicit direction.
Scraping is both a terms-of-service violation and a copyright problem, and it
would poison the trust the product depends on.

## 3. Attribution and rights

- Every `portfolio_item` traces to exactly one `professional` who is the person
  responsible for the work.
- Images remain the artist's. MESH stores and displays them; it claims nothing.
- Where a photograph of a tattoo was taken by a third party, the artist
  confirms they have the right to share it.
- Client-identifying imagery (faces, distinctive context) is avoided; if a
  piece is on an identifiable person, it is excluded unless the artist confirms
  that person consented.

## 4. Fixtures

Development fixtures may exist so the app can be built before real content
lands, but they must be unmistakable:

1. `is_fixture = true` on `professionals` and `portfolio_items`.
2. Names use an obvious reserved prefix — `[Fixture] …` — never a plausible
   human name.
3. Non-production builds render a visible fixture badge on any fixture record.
4. Production seeding **fails** if any row has `is_fixture = true`. Enforced in
   the seed CLI and asserted by a test.
5. Fixture images are abstract placeholders, not real tattoos taken from
   anywhere.

Replacing a fixture with real content must be a single file edit plus a re-run
of the seeder — nothing in the app may hardcode a fixture id.

## 5. Content structure

```
content/
  artists/
    <slug>/
      artist.yaml        identity, bio, location, styles, price, availability, socials
      portfolio.yaml     one entry per piece: file, caption, year, styles + weights
      consent.md         consent record — required
      media/             source images, gitignored, uploaded to Storage by the seeder
```

`artist.yaml` and `portfolio.yaml` are validated against Zod schemas in
`packages/domain/src/content/`. The validator checks:

- Required fields present and non-empty
- `whatsapp` is valid E.164; `instagram` is a bare handle, not a URL
- Every style slug exists in the taxonomy for the artist's category
- Portfolio item style weights sum to 1 ± 0.001
- Price min ≤ max; currency is ISO-4217; `priced_at` present if a price is given
- `availability_updated_at` present if availability is given
- Every referenced media file exists, is JPEG/PNG/WebP/HEIC, ≤ 12 MB, and has
  readable dimensions
- A consent record exists and is dated

Malformed content **aborts the run before any insert**. The seeder never
partially applies a batch and never silently skips a bad record.

## 6. Taxonomy

Styles are data, not strings in components. Initial tattoo vocabulary:

`fine-line`, `blackwork`, `dotwork`, `old-school`, `traditional`,
`neo-traditional`, `realism`, `black-and-grey`, `watercolor`, `ornamental`,
`japanese`, `lettering`, `minimalist`, `fileteado-porteno`, `handpoke`

Notes:

- *Fileteado porteño* is included deliberately — it is specific to Buenos Aires
  and signals to local users that MESH was built for their city, not translated
  into it.
- *Old School* and *Traditional* overlap heavily in practice. They are kept
  separate because artists use both terms, but the taxonomy supports an
  `aliases` field so they can be merged later without a migration.
- Style display names are localised; slugs are stable, lowercase, and never
  translated.

Adding a style requires a migration (styles are rows), a taxonomy entry, and
review by content-engineer — because every existing taste vector silently
changes meaning when the vocabulary changes.

## 7. Media handling

- Uploaded to Supabase Storage, never into Postgres.
- Bucket `portfolio` — public read, service-role write. Bucket `references` —
  private, per-user paths.
- Resized at seed time into `sm` (400px), `md` (900px), `lg` (1600px) longest
  edge, WebP, plus a blurhash stored in `media_assets`.
- The client requests the smallest size that fits the surface. Discovery uses
  `md`, grid thumbnails `sm`, full view `lg`.
- Originals are kept outside the repository, in the artist's own storage, so we
  can re-derive if the pipeline changes.

## 8. Withdrawal

If an artist asks to be removed: set `is_published = false` (immediate effect
via RLS), delete their storage objects, delete the rows, and remove the content
directory in the same working day. Retain only the consent/withdrawal record.
Document the removal in `content/artists/REMOVED.md` with the date — no
details, just an audit trail that it happened.
