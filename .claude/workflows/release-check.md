# Workflow — Release check

Run before any build that a real user or a real artist will see.

## 1. Product — `product-critic`, `ux-product-designer`

- [ ] Every acceptance criterion in `docs/product/product-spec.md` §13 verified
      by hand, not assumed
- [ ] No UX dead end: every screen has a forward action from every state
- [ ] No dark pattern anywhere — no streak, point, badge, fake scarcity, fake
      urgency, artificial limit, or engagement notification
- [ ] Nothing on any screen is fabricated or inferred beyond what the data
      supports
- [ ] "Would a real person use this? Why would they come back?" answered
      honestly, in writing

## 2. Correctness — `qa-engineer`

- [ ] Typecheck, lint, all unit tests green
- [ ] Every matching fixture passes with no re-baselining
- [ ] RLS guarantee test and all cross-user tests green
- [ ] All six E2E flows green — including flow 4 (buttons only) and flow 5
      (offline)
- [ ] Component state coverage complete for changed surfaces

## 3. Security — `security-reviewer`

Run `security-review.md` in full. Every item, every time.
- [ ] No open high or critical finding
- [ ] `npm audit` clean at high/critical
- [ ] Bundle secret scan green
- [ ] Threat model re-read against anything new since last release

## 4. Performance — `performance-engineer`

On a real mid-range Android device, release build. Record the device name.
- [ ] Cold start → first artwork < 2.5s on 4G
- [ ] Deck 60fps sustained over 20 swipes
- [ ] Profile hero < 800ms warm
- [ ] One round trip per screen, verified in the network log
- [ ] Correct derived image size on every surface
- [ ] Memory flat over 100 deck cards

## 5. Content — `content-engineer`

- [ ] Every artist has a dated consent record
- [ ] **Zero fixture rows** in the production database
- [ ] Every published professional has at least one working contact channel
- [ ] Availability data either fresh (<45 days) or absent
- [ ] Prices carry a `priced_at` date, or are absent
- [ ] Each artist has seen their own profile and approved it
- [ ] Withdrawal procedure tested end to end at least once

## 6. Analytics — `product-architect`

- [ ] Every event in the catalogue fires exactly once in the E2E run
- [ ] No free text in any property
- [ ] Opt-out genuinely queues and sends nothing

## 7. Release mechanics

- [ ] Store metadata and privacy declarations match what the app actually
      collects
- [ ] Migrations applied to production in order and verified
- [ ] Rollback plan written: previous build, and how to revert a migration
- [ ] Version bumped; ADRs and docs current

## 8. Sign-off

Write a short release note: what changed, what was measured (with numbers and
the device), what is known-broken, and what we are watching after launch. An
unrecorded measurement does not count as a measurement.
