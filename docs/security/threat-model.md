# MESH — Threat Model

**Status:** Proposed · **Owner:** security-reviewer
**Method:** asset-driven, STRIDE-informed. Reviewed at each release check.

---

## Assets, ranked by what their loss actually costs

| # | Asset | Why it matters |
|---|---|---|
| A1 | Artist contact details and consent | A real person's phone number. Misuse ends relationships and the product. |
| A2 | User taste vectors and saved work | Aesthetic preference is personal; a tattoo idea can be intimate. |
| A3 | Project briefs and reference images | Free text and photos the user chose to share with *us*, not the world. |
| A4 | Account credentials / sessions | Gateway to A2 and A3. |
| A5 | Artist portfolio media | Third-party copyright we hold on trust. |
| A6 | Service-role key | Total compromise of everything above. |
| A7 | Product integrity (honest matches) | The one thing MESH sells. |

---

## T1 — Account takeover

**Vectors:** credential stuffing, phished reset link, stolen device with an
unlocked session, session token read from insecure storage.

**Mitigations:** Supabase Auth (no home-rolled password handling); tokens in
`expo-secure-store` only; reset links are single-use and short-lived and land
on a dedicated route; sign-out clears cache and all local user data; provider
rate limits on sign-in and reset.

**Residual:** a stolen unlocked device. Accepted for V1 — no app-level PIN,
which would be security theatre next to the OS lock. Revisit if in-app
messaging ships.

**Detects as:** repeated failed sign-ins, reset requests from unusual volume.

---

## T2 — Horizontal privilege escalation (reading another user's data)

**The primary risk in this architecture.** Every screen's data is fetched by a
client that can be modified to ask for anything.

**Vectors:** removing a client-side `.eq('user_id', …)` filter; guessing UUIDs;
calling PostgREST directly with the anon key; a `SECURITY DEFINER` function
that trusts a parameter.

**Mitigations:**
- Authorization lives entirely in RLS, never in client query filters. A missing
  client filter is a correctness bug, not a security bug.
- All ownership predicates use `auth.uid()`; no policy accepts a user id from
  the caller.
- `SECURITY DEFINER` is used only where genuinely required, with
  `set search_path = ''`, fully qualified names, and no user-controlled
  identifier interpolation.
- Cross-user integration tests: for every user-owned table, user B attempts
  SELECT / UPDATE / DELETE on user A's rows with a real JWT and must get zero
  rows or a policy error.
- CI fails if any `public` table lacks RLS-enabled, RLS-forced, and ≥1 policy.

**Residual:** a policy that is present but wrong. Addressed by the test suite
being written against the *intent* in the policy map, not by reading the SQL
back.

---

## T3 — Unauthorized profile modification

**Vector:** once artists can claim profiles, a user claims or edits a
professional they do not own; or a curated (`owner_user_id IS NULL`) profile is
hijacked by writing `owner_user_id = auth.uid()`.

**Mitigations:** UPDATE policy requires `owner_user_id = auth.uid()` in **both**
`using` and `with check`, so a row cannot be updated *into* your ownership.
`owner_user_id` is not client-writable at all; claiming will go through a
service-side flow with verification. INSERT on `professionals` is denied to
clients entirely.

**V1 status:** no claiming exists; the surface is closed. Written down now so it
does not get built insecurely later.

---

## T4 — Malicious file upload

**Vectors:** SVG or HTML with script content; polyglot files; decompression
bombs; path traversal via a crafted filename; storage exhaustion.

**Mitigations:** bucket MIME allow-list excluding SVG; 12 MB cap; UUID
server-generated filenames (user input never reaches a path); explicit
content-type on upload; re-encode on ingest, which neutralises polyglots and
strips EXIF/GPS; per-user and per-project quotas; private bucket with
owner-scoped path policy.

**Residual:** an image decoder vulnerability in the OS. Out of our control;
re-encoding server-side before display reduces exposure.

---

## T5 — Credential and secret leakage

**Vectors:** service-role key committed, logged, or bundled; anon key confused
for a secret and "protected" instead of the real key being protected; a
screenshot of a terminal.

**Mitigations:** `.env*` gitignored; secret scanning on the repository; CI greps
the built bundle for `service_role`; seed tool refuses to run in a Metro
context; only `EXPO_PUBLIC_`-prefixed variables are readable from app code;
documented explicitly that the anon key is *meant* to be public and that RLS is
what protects the data.

**Blast radius if the service-role key leaks:** total — read and write of every
row, bypassing RLS. Response: rotate immediately in the Supabase dashboard,
rotate the database password, audit `audit_events` and Postgres logs, force
re-seed from content files, notify affected artists if contact data was
readable.

---

## T6 — API abuse and scraping

**Vectors:** enumerating the catalogue for artist phone numbers; mass anonymous
account creation; interaction or analytics flooding; egress cost attack via
repeated media fetches.

**Mitigations:** rate limits on anonymous sign-in and on the REST gateway;
UNIQUE constraints capping interaction volume; server-side project and upload
quotas; analytics insert-only; UUID PKs prevent sequential enumeration; media
sizes derived so the largest asset is not the default fetch.

**Accepted residual:** a determined scraper can collect 12 public artist
profiles. Those artists consented to being publicly listed and contactable;
obscurity is not the control, consent is. This is re-evaluated when the
catalogue becomes an asset worth stealing.

---

## T7 — Deep-link abuse

**Vectors:** `mesh://` links from a malicious page or message; a link carrying
an auth code intercepted by another app registering the same scheme; a link
that performs a mutation; a link used to probe whether a resource exists.

**Mitigations:** every parameter validated (UUID / slug pattern) before use;
links never mutate state; unauthorized or nonexistent targets both resolve to
the same not-found screen; auth callbacks confined to `mesh://auth/callback`
with PKCE; universal/app links configured on the real domain when one exists so
the OS binds the scheme to us.

---

## T8 — Injection

**Vectors:** SQL injection through a search term or a dynamic RPC; JSONB
injection into `props` or `components`; XSS-shaped payloads in artist bios or
project text.

**Mitigations:** PostgREST and supabase-js parameterise everything; no string
concatenation into SQL anywhere, including in RPCs; `SECURITY DEFINER`
functions use `set search_path = ''`; React Native renders text as text, so
markup in a bio is inert; no WebView renders user content in V1; length limits
on all free-text columns.

---

## T9 — Dishonest output (product integrity)

Ranked as a security concern because it is the failure that would actually kill
MESH.

**Vectors:** a match reason that does not correspond to a scoring term; a
fabricated review, availability, or price; a pre-filled WhatsApp message
containing details the user never provided; stale availability presented as
current.

**Mitigations:** reasons are derived only from components with a measured
contribution above threshold, from a closed template set; stale availability is
omitted from both score and display; the contact message is assembled from
user-owned state and shown for editing before sending; no table exists to hold
a fabricated review; fixtures are flagged in the database and blocked from
production seeding.

**Test:** the matching suite asserts that a reason can never reference an
omitted component, and the contact suite asserts the composed message contains
no field the user did not supply.

---

## T10 — Third-party rights and privacy of others

**Vectors:** publishing a portfolio image without the artist's consent;
publishing a photograph identifying a client; retaining an artist's data after
they withdraw.

**Mitigations:** consent record required by the seed validator — no consent, no
insert; client-identifying imagery excluded unless confirmed; withdrawal
honoured within one working day with rows and storage objects deleted;
scraping prohibited by policy and by the fact that all ingestion goes through
reviewed content files.

---

## Out of scope for V1

Payments fraud (no payments). In-app harassment and moderation (no in-app
messaging). Multi-tenant admin roles (no admin surface). DDoS (provider's
concern at this scale). Nation-state adversaries.

## Review cadence

This document is reviewed at every release check and whenever: a new table is
added, a new upload path is added, authentication changes, a deep link is
added, or an external integration is introduced.
