---
name: supabase-security
description: Writing RLS policies, storage rules, and auth handling for MESH. Use for any migration, policy, storage bucket, upload path, or auth change.
---

# Supabase security

## Purpose

Make the database the authorization boundary, so a client bug can never become
a data breach.

## When to use

Every migration. Every policy. Every storage bucket. Every upload path. Any
change touching auth, sessions, or secrets.

## The invariants

1. Every `public` table: `enable row level security` **and**
   `force row level security`.
2. `revoke all … from anon, authenticated`, then grant only the verbs needed.
3. Explicit **per-command** policies. **No `for all`.**
4. Every `for insert` policy has a `with check`.
5. Ownership is always `auth.uid()`. Never a client-supplied id.
6. UPDATE policies repeat the ownership predicate in `using` **and**
   `with check` — otherwise a row can be updated *into* your ownership.
7. `SECURITY DEFINER` only where required: `set search_path = ''`, fully
   qualified names, no interpolated identifiers.
8. The table and its policies land in the **same migration file**.

## Migration template

```sql
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  title text not null check (length(title) between 1 and 120),
  status project_status not null default 'draft',
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;
alter table public.projects force row level security;

revoke all on public.projects from anon, authenticated;
grant select, insert, update, delete on public.projects to authenticated;

create policy projects_select_own on public.projects
  for select to authenticated using (user_id = auth.uid());

create policy projects_insert_own on public.projects
  for insert to authenticated with check (user_id = auth.uid());

create policy projects_update_own on public.projects
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy projects_delete_own on public.projects
  for delete to authenticated using (user_id = auth.uid());

create index projects_user_status_idx on public.projects (user_id, status);
```

## Storage

| Bucket | Read | Write | Path |
|---|---|---|---|
| `portfolio` | public | service role | `{slug}/{item_id}/{size}.webp` |
| `references` | owner only | owner only | `{user_id}/{uuid}.webp` |
| `avatars` | public | owner only | `{user_id}/{uuid}.webp` |

Owner-writable buckets assert
`(storage.foldername(name))[1] = auth.uid()::text`. MIME allow-list without
SVG. 12 MB cap. **Server-generated UUID filenames — user input never reaches a
path.** Private objects are served by short-lived signed URLs that are never
logged, persisted, or put in a deep link.

## Auth

Anonymous sign-in on first launch; upgrade to email/password links the same
`auth.users` row. Tokens in `expo-secure-store` only. Sign-out clears the query
cache and every MMKV namespace holding user data. Never store, hash, or compare
a password yourself. Never copy email from `auth.users` into a client-readable
table.

## Secrets

`EXPO_PUBLIC_*` is public **by design** — the anon key is meant to be
published; RLS is what protects the data. The service-role key lives only in
`tools/seed` and CI. CI greps the built bundle for `service_role`.

## Anti-patterns

Authorization in client query filters · A table shipped without policies ·
`for all` policies · An insert policy with no `with check` · A `SECURITY
DEFINER` function without a pinned `search_path` · Business rules enforced only
in TypeScript · Trusting a client-side file-type check · A signed URL in a log ·
Treating the anon key as a secret while the real secret is exposed · An error
response that reveals whether a row exists.

## Quality checklist

- [ ] RLS enabled **and** forced
- [ ] `revoke all` then explicit grants
- [ ] Per-command policies; no `for all`
- [ ] Every insert policy has `with check`
- [ ] Update policies guard `using` and `with check`
- [ ] Policy predicates are indexed
- [ ] Cross-user test written for the new table
- [ ] Table added to the policy map in `docs/security/security-model.md`
- [ ] No new PII copied into a client-readable table
