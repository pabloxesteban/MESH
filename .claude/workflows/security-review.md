# Workflow — Security review

Run before every release, and on any change touching data, auth, uploads,
deep links, or secrets.

**Lead:** `security-reviewer`. **Supporting:** `backend-engineer`,
`mobile-engineer`.

## 1. Inspect

- `supabase/migrations/` — every table, policy, grant, function
- `apps/mobile/src/data/` — client, session handling, error mapping
- Any upload path
- Any deep-link handler
- `.env.example`, CI config, `tools/seed/`
- `docs/security/threat-model.md` for anything the change introduces

## 2. Database

- [ ] Every `public` table: RLS enabled **and** forced
- [ ] `revoke all` then explicit per-verb grants
- [ ] Per-command policies; **no `for all`**
- [ ] Every `for insert` policy has a `with check`
- [ ] Update policies guard `using` **and** `with check`
- [ ] Ownership always `auth.uid()`, never client-supplied
- [ ] `SECURITY DEFINER` functions pin `search_path = ''`, fully qualified, no
      interpolated identifiers
- [ ] Cross-user tests pass for every user-owned table
- [ ] `media_assets` does not expose another user's private reference paths
- [ ] `audit_events` unreachable by `anon` and `authenticated`

## 3. Storage

- [ ] Owner-writable buckets assert
      `(storage.foldername(name))[1] = auth.uid()::text`
- [ ] MIME allow-list excludes SVG; size cap enforced at the bucket
- [ ] Filenames are server-generated UUIDs; user input never reaches a path
- [ ] EXIF stripped before upload for user references (test asserts it)
- [ ] Signed URLs short-lived, never logged or persisted

## 4. Client

- [ ] Session tokens only in `expo-secure-store`
- [ ] Sign-out clears query cache and every MMKV namespace with user data
- [ ] No `service_role` string in the built bundle (CI check green)
- [ ] Only `EXPO_PUBLIC_*` read from app code
- [ ] Deep-link parameters validated; no mutating links; unauthorized and
      nonexistent both resolve to not-found
- [ ] Raw database errors never surfaced or logged
- [ ] No free text in any analytics property

## 5. Integrity (T9 — treated as a security concern)

- [ ] No fabricated review, price, availability, or statistic anywhere
- [ ] Every match reason maps to a component that actually contributed
- [ ] No reason references an omitted component
- [ ] Stale availability (>45 days) omitted from score and display
- [ ] Composed contact message contains nothing the user did not supply
      (golden test green)
- [ ] Fixtures flagged, badged, and blocked from production seeding

## 6. Supply chain

- [ ] `npm audit` clean at high/critical
- [ ] Lockfiles committed
- [ ] New dependencies justified; none added to `tools/seed` without review

## 7. Report

For each finding: what it is, the concrete exploitation path, the blast radius,
the fix. Ranked by what an attacker actually gains. **No padding with
theoretical issues** — a long list of low-severity noise buries the one finding
that matters.

Update `docs/security/threat-model.md` if the change introduces a new vector or
retires an old one.
