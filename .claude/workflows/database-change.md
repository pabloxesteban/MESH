# Workflow — Database change

Any migration. No exceptions, including "just adding a column".

## 1. Justify — `product-architect`

- What reads or writes this, on which screen?
- What breaks without it?
- Is it derivable from existing data? If yes, derive it.
- Does it leak category knowledge into the core? (`tattoo_*` → reject)
- Does it duplicate a fact represented elsewhere?

**Produces:** approval or a simpler alternative. Reviews *every* schema change —
this step is not optional.

## 2. Design the schema — `backend-engineer`

**Produces**, in one migration file:
- Table/columns with UUID PK and explicit deletion behaviour on every FK
- Constraints expressing the invariants (not TypeScript checks)
- Enums for closed sets, tables for open sets
- `enable row level security` **and** `force row level security`
- `revoke all` then explicit per-verb grants
- Explicit per-command policies; every insert policy has a `with check`;
  update policies guard `using` **and** `with check`
- Indexes, each with a named query behind it

## 3. Security review — `security-reviewer`

- Does the policy predicate use `auth.uid()` and nothing client-supplied?
- Can a row be updated *into* another user's ownership?
- Does any error response leak existence where silence was correct?
- Is the policy predicate indexed, or does every read pay for a sequential
  `EXISTS`?
- Is the table added to the policy map in `docs/security/security-model.md`?

## 4. Test — `qa-engineer`

- The generic RLS guarantee test still passes (RLS on + forced + ≥1 policy for
  every `public` table; no `for all`; every insert policy has `with check`).
- Cross-user tests for the new table: B selects A's rows → `[]`; B's update and
  delete → 0 rows; B inserting with `user_id = A` → rejected.
- One rejection test per new constraint.
- `supabase db reset` clean from scratch.

## 5. Types

Regenerate TypeScript types from the schema. Reconcile with
`packages/domain` types — a mismatch is a bug in one of them, resolved now, not
later.

## 6. Document

`docs/architecture/data-model.md` updated in the **same commit**. Policy map in
`docs/security/security-model.md` updated. ADR if the decision is
hard to reverse.

## Rules that do not bend

- The table and its policies land in the same migration file.
- Migrations are forward-only and never edited after being applied to staging.
- A migration creating a table without policies **fails CI**.
- No soft-delete columns.
- No index without a query.
