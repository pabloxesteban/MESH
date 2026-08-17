# ADR-004 — Postgres + RLS as the only authorization layer

**Status:** Proposed · **Date:** 2026-08-17 · **Owner:** backend-engineer, security-reviewer

## Context

The client talks directly to Supabase with a publishable anon key. There is no
application server between the app and the database. The app holds users'
taste, saved work, project briefs, reference images, and artists' contact
details.

## Problem

Where does authorization live, and how do we guarantee we never ship a table
that is accidentally readable by everyone?

## Options

**A. Authorization in client queries.** Every query filters by the current user.
Fast to write, and one forgotten `.eq()` is a breach.

**B. A server layer between app and database.** Familiar, and it re-introduces
the server we chose Supabase to avoid — plus its own auth, deploy, and scaling
concerns.

**C. RLS as the sole boundary.** Policies in Postgres decide what any request
can see, regardless of what the client asks for.

**D. RLS plus a server layer.** Both. Strongest, and roughly double the work.

## Decision

**Option C**, with these rules made mandatory and machine-checked:

1. Every `public` table has RLS **enabled and forced**.
2. `revoke all` from `anon` and `authenticated`, then explicit per-verb grants.
3. Policies are per-command; **no `for all` policies**.
4. Every `for insert` policy has a `with check`.
5. Ownership is always `auth.uid()` — never a client-supplied id.
6. `SECURITY DEFINER` only where required, with `set search_path = ''` and no
   interpolated identifiers.
7. **CI fails** if any `public` table has RLS off, force off, or zero policies.
8. Cross-user integration tests exist for every user-owned table.

## Why

The client is untrusted and unmodifiable-by-us: anyone can read the bundle,
take the anon key, and call PostgREST directly. Under option A the security of
every user's data depends on the correctness of every query ever written — a
guarantee that decays with every commit. Under option C, a forgotten client
filter is a *correctness* bug: the query returns the user's own rows instead of
the intended subset, and nothing leaks.

`FORCE ROW LEVEL SECURITY` is included deliberately: without it the table owner
bypasses its own policies, which makes some tests pass that should not.

Rule 7 is the load-bearing one. Enumerating policies by hand at review time
does not scale past a few tables and fails exactly when someone is in a hurry.
A test over `pg_tables` and `pg_policies` makes "a table without policies"
un-shippable.

Option D was rejected on cost, not on merit — for one developer, the second
layer would be shallower and less tested than the first, and a shallow second
layer creates false confidence.

## Consequences

- Some reads need `SECURITY INVOKER` RPCs (the discovery feed) to stay at one
  round trip. Those functions must be reviewed as carefully as policies.
- Policy predicates appear in query plans; `EXISTS` subqueries in
  `media_assets` and the portfolio policies must be indexed, or every image
  read pays for them.
- Migration files are longer, because each one carries its own policies. This
  is the point: schema and its authorization arrive together or not at all.
- Local development requires Docker for `supabase start`, since the RLS tests
  need a real database.
