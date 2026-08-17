# MESH — Build Plan

**Status:** Proposed · **Owner:** product-architect

Each phase follows: **PLAN → IMPLEMENT → TEST → REVIEW → FIX → DOCUMENT →
VERIFY**. A phase is not started until the previous one meets its exit
criteria. No phase accumulates untested code.

---

| Phase | Deliverable | Exit criteria |
|---|---|---|
| **0. Audit & plan** ✅ | Repository audit, docs, ADRs, agents, skills, workflows, commands | This document set exists and is approved |
| **1. Foundation** | Workspaces, tsconfig, eslint (incl. the enforcement rules), CI pipeline, `packages/domain` skeleton with taxonomy + types | `npm run check` green on an empty codebase; CI runs on push |
| **2. Brand** | Symbol SVG (two optical sizes), lockup, app icon set, adaptive icon, favicon, usage sheet | Mark legible at 16px, works ink-on-paper and inverted, app icon reviewed on a device home screen |
| **3. Design system** | Tokens, `ThemeProvider`, `MotionProvider`, primitives, Button/Tag/Chip/Input, state components (Skeleton/Empty/Error/Toast) | Contrast test passes for every token pair in both themes; lint rules block a raw hex; component tests cover states |
| **4. Database** | Migrations for every table, enums, constraints, indexes, RPCs; reference seed (categories, styles, locations) | `supabase db reset` clean; generated TS types match `packages/domain`; constraint tests pass |
| **5. Security** | RLS policies for every table, storage policies, quota triggers | Generic RLS guarantee test passes; cross-user tests pass for every user-owned table; storage cross-write blocked |
| **6. Authentication** | Anonymous session bootstrap, account upgrade, sign-in/out, reset, secure token storage, session-aware root layout | Flow 3 of the E2E suite passes; no token outside `expo-secure-store`; bundle secret scan clean |
| **7. Content** | Content schemas, seed CLI (validate → resize → blurhash → upload → upsert), 2–3 real artists end to end | Seeding is idempotent; malformed content aborts before any insert; missing consent record blocks the run; fixtures rejected in production mode |
| **8. Discovery** | Feed RPC, deck, `ArtworkCard`, gestures, buttons, undo, prefetch, artwork detail, all four states | 60fps sustained on a mid-range Android device; button-only path complete; offline queue survives airplane mode |
| **9. Taste engine** | Taste engine in `packages/domain`, persistence, taste screen, evidence view, reset | Every taste test in `matching.md` §8 passes; readiness boundary correct; reveal respects reduced motion |
| **10. Matching** | Match engine, bands, reason derivation, matches screen, honest empty states | Every matching test passes including omission renormalisation and ordering stability; no reason ever references an omitted component |
| **11. Profiles** | Professional profile, portfolio grid, hero, availability pill, price, styles, socials | Hero painted < 800ms warm; missing fields render nothing rather than a placeholder; grid has no layout shift |
| **12. Projects** | Project creation flow, references upload (EXIF-stripped), project matching, project detail | Project-based matching tests pass; quotas enforced server-side; abandoned drafts recoverable |
| **13. Contact** | Message composer, editable preview, WhatsApp/Instagram handoff | Golden test: composed message contains nothing the user did not supply; missing channel changes the CTA rather than faking one |
| **14. Analytics** | `track()`, typed event union, MMKV buffer, opt-out setting | Every event in the catalogue fires once in the E2E run; no free text in any property; opt-out queues nothing |
| **15. QA** | E2E suite, component state coverage, edge cases | All six E2E flows green, including the accessibility-only and offline flows |
| **16. Security audit** | Full review against the security-model checklist; threat model revisited | Every checklist item ticked; no high/critical `npm audit`; no open finding |
| **17. Performance** | Device measurement pass, image pipeline verification, query round-trip audit | All budgets in the test strategy §7 met and recorded with the device named |
| **18. UX polish** | Copy pass in `es-AR`, dead-end sweep, dynamic type, VoiceOver/TalkBack pass, both themes | No screen without a forward action; screen reader completes flow 1; largest accessibility type size does not clip |
| **19. Release readiness** | Store assets, privacy declarations, artist walkthrough, rollback plan | Artists have seen their own profiles and approved them; withdrawal procedure tested; release check complete |

---

## Sequencing notes

**Security (5) precedes authentication (6), which precedes content (7).**
Policies exist before there is data to protect, and content is seeded into a
schema that is already locked down. Retrofitting RLS onto a populated database
is how tables get left open.

**Brand (2) precedes the design system (3)**, which precedes every screen.
Tokens derived from a finished identity beat tokens invented per screen and
reconciled later.

**Taste (9) precedes matching (10)**, and both precede profiles (11) — a
profile screen without a reason to arrive at it cannot be evaluated.

**Content (7) precedes discovery (8).** Building the deck against fixtures
teaches you how fixtures behave, not how real tattoo photography behaves —
different aspect ratios, different tonal ranges, different file sizes.

## What could reorder this

- If artist consent and media collection is slow, Phase 7 lands 2–3 real
  artists and the rest arrive during Phase 11. Discovery must never be built
  entirely against fixtures.
- If the deck feel proves harder than expected in Phase 8, it gets its own
  timebox and a spike before the rest of the phase — it is the single highest
  product risk and the least amenable to being fixed later.

## First implementation tasks (Phase 1)

1. Initialise npm workspaces: `apps/mobile`, `packages/domain`, `tools/seed`.
2. Root `tsconfig.base.json`, `eslint.config.mjs` with the layering and
   design-value rules, Prettier, `.editorconfig`.
3. `npx create-expo-app` into `apps/mobile` with the current SDK and TypeScript;
   Expo Router; verify it boots on a device.
4. `packages/domain`: category/style taxonomy as data, core TypeScript types,
   Zod content schemas, `TASTE_VERSION`/`MATCHING_VERSION` constants, Vitest
   configured with one passing test.
5. `supabase init`; verify `supabase start` and `supabase db reset` locally.
6. CI workflow implementing the nine steps in
   [test strategy §8](../testing/test-strategy.md).
7. `.env.example` for both the app and the seed tool, with a comment explaining
   which keys are public by design and which must never leave the operator's
   machine.
