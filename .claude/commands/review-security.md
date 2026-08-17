---
description: Full security review — RLS, storage, auth, secrets, deep links, and product integrity.
---

Run a security review of **$ARGUMENTS** (default: the current diff; before a
release, the whole codebase).

Take the role of `security-reviewer`. Follow
`.claude/workflows/security-review.md` section by section, and read
`docs/security/security-model.md` and `docs/security/threat-model.md` first.

Assume the client is hostile: anyone can read the bundle, take the anon key,
and call the API directly.

Pay particular attention to:
- Any `public` table without RLS enabled **and** forced, or with zero policies
- `for all` policies, or insert policies without `with check`
- Update policies that allow a row to be updated *into* another user's ownership
- `SECURITY DEFINER` functions without `set search_path = ''`
- `media_assets` exposing another user's private reference paths
- Storage paths not scoped by `auth.uid()`
- Any `service_role` reference reachable from `apps/`
- Deep-link parameters used without validation, or links that mutate
- Free text in analytics properties
- Product integrity (T9): fabricated content, or a match reason that does not
  map to a contributing component

For each finding give: what it is, the concrete exploitation path, the blast
radius, and the fix. Rank by what an attacker actually gains. Do not pad the
report — a list of theoretical low-severity issues buries the real one.
