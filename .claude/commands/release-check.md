---
description: Full pre-release gate across product, correctness, security, performance, content, and analytics.
---

Run the release check for **$ARGUMENTS** (default: the current branch).

Follow `.claude/workflows/release-check.md` section by section, in order,
taking each agent's role. Do not skip a section because it "passed last time".

Report as a checklist with ✅ / ❌ / ⚠️, then:

- **Blockers** — must be fixed before release, with the fix named
- **Known issues** — shipping with these, and why that is acceptable
- **Watch list** — what to observe after launch, and what would make us roll
  back

Hard blockers, no exceptions:

- Any open high or critical security finding
- Any `public` table without RLS enabled, forced, and policies
- Any fixture row in the production database
- Any artist without a dated consent record
- Any fabricated content, or a match reason not derived from a contributing
  component
- Any UX dead end on the critical path
- Any dark pattern
- A failing matching fixture

Finish with a short release note: what changed, what was measured (numbers, and
the device they were measured on), what is known-broken, and what we are
watching. If something was not measured, write "not measured" rather than an
estimate.
