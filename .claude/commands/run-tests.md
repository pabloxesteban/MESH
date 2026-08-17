---
description: Run MESH's test suite in the right order and report what actually failed.
---

Run the test suite for **$ARGUMENTS** (default: everything affected by the
current diff).

Order — stop and report at the first layer that fails, since later layers
depend on it:

1. `npm run typecheck` (all workspaces)
2. `npm run lint` — including the layering and no-raw-design-value rules
3. `npm test -w packages/domain` — taste, matching, content schemas
4. Content validation over `content/artists/**`
5. `supabase start` → apply migrations → RLS and constraint tests
6. Component tests (`jest-expo`)
7. E2E (Maestro) — only when the critical path changed or before a release

Reporting rules:

- Quote the actual failure output. Do not summarise a failure into a guess.
- For a failing **matching fixture**: investigate the algorithm. Never
  re-baseline the expected value — that test is the enforcement mechanism for
  the versioning rule in `docs/product/matching.md` §9.
- For a failing **RLS test**: treat it as a security finding, not a test bug.
- For a flaky test: fix it or delete it. Do not leave it and retry.
- If a layer was skipped (no Docker, no device), say so explicitly rather than
  reporting green.
