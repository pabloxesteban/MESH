# MESH — Security Model

**Status:** Proposed · **Owner:** security-reviewer · **Reviewer:** backend-engineer

---

## 1. Trust boundaries

```
Untrusted ───────────────────────────────────────────────
  The mobile app, its bundle, its network traffic, and
  every value it sends. The anon key is public. The user
  can read the bundle, proxy the traffic, and call the
  API directly.
──────────────────────────────────────────────────────────
Trusted
  PostgreSQL + RLS. This is the only authorization
  boundary that matters. If a rule is not expressed in
  a policy or a constraint, it is not enforced.
──────────────────────────────────────────────────────────
Privileged
  Service-role key. Operator machine and CI only.
  Never in the app, never in an environment variable
  prefixed EXPO_PUBLIC_, never in a log.
```

**Core assumption: the client is hostile.** Client-side validation exists only
to make the UI pleasant. Every rule that matters is a policy, a constraint, or
a check inside a `SECURITY DEFINER` function.

## 2. Authentication

- Supabase Auth. MESH never stores, hashes, compares, or transports a password
  itself.
- **Anonymous sign-in on first launch** so a user can explore without a wall,
  and so there is no unauthenticated read path in the schema. Anonymous users
  have a real `auth.uid()` and are subject to the same policies.
- **Upgrade to a durable account** via email + password (or magic link) links
  the same `auth.users` row — taste, saves, and projects carry over with no
  data migration.
- Session tokens are stored in `expo-secure-store` (Keychain / Android
  Keystore), never in AsyncStorage or MMKV. Refresh is handled by supabase-js.
- Password reset uses Supabase's flow, returning to `mesh://auth/callback`.
- Sign-out clears the session, the query cache, and every MMKV namespace
  holding user data — taste cache, interaction queue, analytics buffer.

**Anonymous-auth trade-offs, accepted knowingly:** it makes account creation
cheap for an attacker, so anonymous sign-ins are rate-limited in the Supabase
dashboard, anonymous users get the same RLS treatment as everyone else, and
Postgres row limits per user are enforced (§6). The alternative — a signup wall
before any value — costs more in real users than it saves in abuse at this
scale.

## 3. Authorization: RLS on every table

**Rules that hold without exception:**

1. `alter table … enable row level security;` **and**
   `alter table … force row level security;` on every table in `public`.
   `FORCE` matters: without it, the table owner bypasses its own policies.
2. `revoke all on <table> from anon, authenticated;` then explicit grants of
   only the verbs that table needs.
3. Every policy names its command (`for select` / `for insert` / …). No
   `for all` policies — they hide which verb a `using` clause is protecting.
4. Every `for insert` policy has a `with check`. A policy without one is a hole.
5. No policy references a client-supplied user id. Ownership is always
   `auth.uid()`.

### Policy map

| Table | anon/auth SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | own row | via trigger only | own row | own row |
| `categories`, `styles`, `locations` | all active rows | ✗ | ✗ | ✗ |
| `professionals` | `is_published` | ✗ | owner only | ✗ |
| `professional_styles` | parent published | ✗ | owner only | owner only |
| `portfolio_items` | parent published | ✗ | owner only | owner only |
| `portfolio_item_styles` | parent visible | ✗ | owner only | owner only |
| `media_assets` | referenced by a published item **or** `owner_user_id = auth.uid()` | own uploads | ✗ | own uploads |
| `interactions` | own | own | own | own |
| `taste_profiles` | own | own | own | own |
| `projects` | own | own | own | own |
| `project_styles`, `project_references` | own parent project | own parent | own parent | own parent |
| `matches` | own | own | own | own |
| `analytics_events` | ✗ | own (`user_id = auth.uid()`) | ✗ | ✗ |
| `audit_events` | ✗ | ✗ | ✗ | ✗ (no policies — service role only) |

"owner only" means `professionals.owner_user_id = auth.uid()`. In V1 no
professional is claimed, so these paths are effectively unreachable from the
client — but they are written now so that claiming a profile later is not a
security project.

`media_assets` SELECT is the subtle one: a naive `using (true)` would leak the
storage paths of other users' private project reference images. The policy is
an `EXISTS` over published portfolio items, unioned with ownership.

### The guarantee, enforced by test

A test enumerates `pg_tables` in `public` and fails if any table has
`rowsecurity = false`, `forcerowsecurity = false`, or zero rows in
`pg_policies`. **A table cannot be added without policies.** This runs in CI on
every migration.

## 4. Storage

| Bucket | Visibility | Write | Path convention |
|---|---|---|---|
| `portfolio` | public read | service role only | `portfolio/{professional_slug}/{item_id}/{size}.webp` |
| `references` | private | owner only | `references/{user_id}/{uuid}.webp` |
| `avatars` | public read | owner only | `avatars/{user_id}/{uuid}.webp` |

Storage policies for the owner-writable buckets assert
`(storage.foldername(name))[1] = auth.uid()::text` — the first path segment is
the caller's id, so a user cannot write into another user's folder even by
crafting the path.

Private objects are served via short-lived signed URLs (≤ 1 hour) generated on
demand. Signed URLs are never persisted, never logged, and never put in a deep
link.

## 5. Upload validation

Client-side checks are UX. Real enforcement is:

- Bucket-level MIME allow-list: `image/jpeg`, `image/png`, `image/webp`,
  `image/heic`. No SVG — SVG is a script container.
- Bucket-level size cap: 12 MB.
- Filenames are always server-generated UUIDs. User-supplied names are never
  used in a path — no traversal, no null bytes, no unicode homoglyph tricks.
- Content-type is set explicitly on upload, never inferred from the extension.
- Images are re-encoded during the seed pipeline, which strips EXIF (including
  GPS) as a side effect. User-uploaded project references are re-encoded and
  stripped client-side before upload, and this is asserted by a test — a
  reference photo taken at home should not carry the user's coordinates.
- Uploads count against a per-user quota (§6).

## 6. Abuse prevention

| Vector | Control |
|---|---|
| Mass anonymous account creation | Supabase rate limit on anonymous sign-in; per-IP limits at the gateway |
| Interaction flooding | UNIQUE `(user_id, portfolio_item_id)` caps interactions at the catalogue size; per-user request rate limits |
| Project spam | Max 20 active projects per user, enforced by a `BEFORE INSERT` trigger, not by the client |
| Reference-image storage abuse | Max 10 references per project, max 50 MB total per user, enforced server-side |
| Analytics flooding | Insert-only, no read; volume monitored; events are dropped, never retried aggressively |
| Contact-detail harvesting | `whatsapp_e164` and `instagram_handle` are readable for published professionals — that is the product. Mitigation is consent (artists know their details are shown) plus rate limiting the catalogue read, not obscurity. |
| Catalogue scraping | Accepted as low-harm in V1 with 12 consenting public profiles. Revisit before the catalogue is an asset. |

## 7. Secrets

| Secret | Where it lives | Where it must never be |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Client bundle (public by design) | — |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Client bundle (public by design) | — |
| `SUPABASE_SERVICE_ROLE_KEY` | `tools/seed/.env.local`, CI secret | Any file under `apps/`, any log, any commit |
| Database password | Operator password manager | Everywhere else |

Controls:
- `.env*` is gitignored except `.env.example`.
- A CI check greps the built bundle for `service_role` and for the service-key
  JWT prefix and fails the build on a hit.
- `tools/seed` refuses to run if it detects it is executing inside a Metro or
  Expo context.
- Secret scanning is enabled on the repository.

## 8. Logging and PII

- No production logging of tokens, emails, message bodies, project
  descriptions, search text, or storage signed URLs.
- Errors are mapped to codes before display; raw Postgres errors never reach a
  user or an analytics event — they leak column and table names.
- `audit_events` records who did what to which entity, with metadata limited to
  ids and enums.
- Crash reporting, if added, must scrub breadcrumbs; it is not in V1.

## 9. Data rights

- **Export:** a user can request their profile, interactions, taste, projects,
  and matches as JSON. V1 may service this manually; the queries exist as a
  script.
- **Deletion:** deleting the auth user cascades to every owned row; storage
  objects under `references/{user_id}/` and `avatars/{user_id}/` are removed by
  the same routine. Recorded in `audit_events`.
- **Analytics opt-out:** `profiles.analytics_opt_in`; when false the client
  queues nothing.
- **Artist withdrawal:** see
  [`content-policy.md`](../product/content-policy.md) §8.

## 10. Dependencies and supply chain

- `npm audit` in CI; high/critical blocks merge.
- Lockfiles committed. Dependencies added only with a stated reason.
- No dependency gets access to secrets — the seed tool's dependency set is kept
  minimal and separate from the app's.
- Expo SDK upgrades are deliberate, tested on device, and recorded.

## 11. Review checklist (run before each release)

- [ ] Every `public` table: RLS enabled **and** forced, ≥ 1 policy, correct verbs
- [ ] Every `for insert` policy has a `with check`
- [ ] No `for all` policies
- [ ] Cross-user access tests pass for every user-owned table
- [ ] No `service_role` string in the built bundle
- [ ] Storage policies restrict writes to the caller's own folder
- [ ] No new free-text analytics properties
- [ ] Deep-link parameters validated; no mutating links
- [ ] Session tokens only in `expo-secure-store`
- [ ] `npm audit` clean at high/critical
- [ ] New tables added to the policy map in §3
