---
description: Review a schema change against MESH's data-model rules and RLS requirements.
---

Review the schema change: **$ARGUMENTS** (default: migrations in the current
diff).

Follow `.claude/workflows/database-change.md`, taking the roles of
`product-architect`, `backend-engineer`, and `security-reviewer`. Read
`docs/architecture/data-model.md` first.

Answer, explicitly:

1. **Does it earn its existence?** What reads or writes it, on which screen?
   What breaks without it? Is it derivable from data we already have?
2. **Is it category-agnostic?** Would adding *photography* still require only
   rows in `categories`/`styles` plus content files?
3. **Does it duplicate a fact** represented elsewhere?
4. **Deletion behaviour** explicit on every foreign key?
5. **Invariants as constraints**, not TypeScript checks?
6. **RLS in the same migration** — enabled, forced, `revoke all` + grants,
   per-command policies, `with check` on inserts, ownership via `auth.uid()`?
7. **Indexes** — does each have a named query? Are the policy predicates
   indexed?
8. **Tests** — cross-user tests for the new table, rejection tests for new
   constraints?
9. **Docs** — `data-model.md` and the policy map updated in the same commit?

Give a verdict: approve, approve-with-changes (list them), or reject with a
simpler alternative.
