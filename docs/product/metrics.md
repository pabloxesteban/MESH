# MESH — Metrics & Analytics

**Status:** Proposed · **Owner:** product-architect

---

## 1. What we measure and why

MESH measures whether people **find someone worth contacting**. It does not
measure, chart, or optimise attention.

Explicitly **not** tracked as success metrics: total swipes, session length,
time in app, cards per session, daily streaks, notification open rate. These
may exist as diagnostic counters (e.g. to size a page) but they never appear in
a goal, a dashboard headline, or a decision.

## 2. Funnel

| Stage | Definition | Target signal |
|---|---|---|
| **Launch** | `app_opened` on a fresh install | — |
| **Discovery entry** | First `artwork_viewed` | ≥ 90% of launches — anything lower means the intro screen is in the way |
| **Taste completion** | `taste_profile_generated` (readiness reached) | ≥ 40% of new users |
| **Activation** | User sees ≥ 1 match with reasons (`match_viewed`) | ≥ 35% of new users |
| **Profile engagement** | `professional_profile_viewed` | ≥ 60% of activated users |
| **Contact conversion** | `contact_clicked` | ≥ 15% of activated users — *the primary V1 metric* |
| **Project conversion** | `project_completed` → `contact_clicked` | measured, no target yet |
| **Retention** | D1 / D7 / D30 return with any decisive interaction | measured, no target yet |

Targets are hypotheses for a validation cohort of tens of users, not
benchmarks. They exist so that we notice when reality disagrees.

## 3. The metric that decides V1

**Contact conversion**, qualified by artist feedback.

A `contact_clicked` that produces a message an artist calls "a good lead" is
the entire product working. We will ask the 8–15 artists directly and record it
qualitatively — with fewer than ~50 contacts, a conversation with each artist
is better evidence than any dashboard.

Counter-metric: **contacts per artist per week.** If MESH funnels everyone to
two artists, the product is failing the supply side even while its funnel looks
good.

## 4. Event catalogue

All events carry: `event_name`, `occurred_at` (client, UTC), `session_id`
(random per app session), `app_version`, `platform`, and `user_id` (may be an
anonymous auth id). Nothing else is implicit.

| Event | Properties | Notes |
|---|---|---|
| `app_opened` | `is_first_open` | |
| `onboarding_started` | — | |
| `onboarding_completed` | `interaction_count` | Fired at readiness |
| `artwork_viewed` | `portfolio_item_id`, `position` | No dwell time |
| `artwork_liked` | `portfolio_item_id`, `via` (`gesture`\|`button`) | `via` tells us whether the accessible path is actually used |
| `artwork_passed` | `portfolio_item_id`, `via` | |
| `artwork_saved` | `portfolio_item_id`, `via` | |
| `artwork_undone` | `portfolio_item_id`, `previous_verdict` | High rate ⇒ gesture is too easy to misfire |
| `taste_profile_generated` | `style_count`, `interaction_count`, `taste_version` | No style names — see §5 |
| `taste_profile_viewed` | `source` | |
| `taste_profile_reset` | `interaction_count` | |
| `match_viewed` | `professional_id`, `band`, `rank`, `matching_version` | |
| `match_list_empty` | `reason` (`not_ready`\|`no_candidates`) | Tracks the honest-empty path |
| `professional_profile_viewed` | `professional_id`, `source` (`match`\|`discover`\|`search`\|`project`) | |
| `contact_clicked` | `professional_id`, `channel` (`whatsapp`\|`instagram`), `has_project` | **Primary metric** |
| `contact_message_edited` | `professional_id` | Signals the pre-fill is wrong |
| `project_started` | — | |
| `project_completed` | `has_budget`, `has_references`, `style_count` | Booleans and counts only |
| `project_abandoned` | `last_step` | |
| `search_performed` | `filter_count` | Never the query string |
| `error_shown` | `surface`, `error_code` | Never messages or payloads |

## 5. Privacy rules

1. **No third-party analytics SDK in V1.** Events are written to our own
   `analytics_events` table in Supabase. No ad IDs, no IDFA/AAID, no device
   fingerprinting, no session replay, no cross-app tracking.
2. **No free text in properties, ever.** Not project descriptions, not search
   queries, not messages, not error strings. Counts, enums, booleans, and IDs
   only.
3. **No style names on taste events.** A style vector is a reasonable proxy for
   personal aesthetic and, in some cases, identity. The vector lives in
   `taste_profiles` where the user owns it under RLS; it does not get copied
   into an analytics stream. Aggregate style popularity is queried from
   `interactions` when needed.
4. **No location beyond the city the user chose themselves.** No GPS in V1.
5. **Clients can insert their own events and read none.** RLS gives
   `authenticated` INSERT with `user_id = auth.uid()`, and no SELECT.
6. **Deleting an account deletes its events.** `user_id` is `ON DELETE CASCADE`.
7. **A visible toggle** in Settings disables analytics collection entirely,
   defaulting to on with a plain-language explanation. If it is off, nothing is
   queued and nothing is sent.

## 6. Implementation notes

- One `track()` function in `apps/mobile/src/analytics/`. Nothing else may
  write events. The event name union is a TypeScript type, so an unknown event
  will not compile.
- Events are buffered in MMKV and flushed in batches (≤ 20, or on background)
  so analytics never blocks a gesture or a screen transition.
- Failures are dropped silently after one retry. Analytics must never surface
  an error to the user or retry-loop on a bad network.
- A dev-only console sink prints events so we can verify the funnel by hand.
- Adding an event requires adding a row to the table in §4 in the same commit.
