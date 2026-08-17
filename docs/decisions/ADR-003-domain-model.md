# ADR-003 — Domain model simplifications

**Status:** Proposed · **Date:** 2026-08-17 · **Owner:** product-architect

## Context

The brief enumerates entities including `Professional` **and**
`ProfessionalProfile`, `SavedItem`, `Conversation`, `Message`, `Review`, and
`Availability`. It also requires that the core stays category-agnostic and that
`User`, `Professional`, and profile are properly distinguished because roles are
not exclusive.

## Problem

Which of these entities exist in V1, and which are structure without a
behaviour to justify it?

## Decision

| Entity | V1 |
|---|---|
| `User` (as `profiles`) | ✅ |
| `Professional` | ✅ — single table, `owner_user_id` nullable |
| `ProfessionalProfile` | ❌ merged into `professionals` |
| `Category`, `Style`, `ProfessionalStyle` | ✅ |
| `PortfolioItem`, `PortfolioItemStyle` | ✅ |
| `Interaction` | ✅ — current-state row, not an event log |
| `SavedItem` | ❌ — `interactions.is_saved` |
| `TasteProfile` | ✅ |
| `Project`, `ProjectStyle` | ✅ (+ `project_references`) |
| `Match` | ✅ |
| `Location` | ✅ |
| `Availability` | ❌ — two columns on `professionals` |
| `Conversation`, `Message` | ❌ deferred |
| `Review` | ❌ deferred |
| `AuditEvent` | ✅ |

## Why

**Professional / ProfessionalProfile.** The separation the brief actually
argues for is *a user is not a professional, and neither role excludes the
other*. That is preserved: `professionals.owner_user_id` is nullable (curated
artists have no account), and being a professional is a row in another table,
never a flag on `profiles`. Splitting `professionals` into two 1:1 tables adds a
join to every catalogue query, a second RLS policy set, and a "profile row
missing" failure mode — for no behavioural difference. If a professional ever
needs many profiles (one per category), that is a real 1:N and we will add it
then, with a migration that is mechanical.

**SavedItem.** A save is a property of an interaction, not a separate event. Two
tables representing one fact will disagree, and the taste engine would have to
reconcile them. `interactions.is_saved`, with a check constraint forbidding
`saved + pass`, is one source of truth.

**Availability as a table.** A calendar implies artists maintain it. They will
not, in V1. A stale calendar is actively worse than no calendar — it makes MESH
lie. Two columns (`availability_status`, `availability_updated_at`) with a
45-day freshness rule enforced in both the matching engine and the
`AvailabilityPill` component let us say only what we can stand behind.

**Conversations and Messages.** §17 of the brief puts V1 contact on WhatsApp and
Instagram. Building a messaging subsystem alongside that means shipping an
unused surface plus its moderation, notification, blocking, and abuse burden. It
also splits the conversation record across two places. Defer until there is
evidence users want to leave WhatsApp.

**Reviews.** With ~12 artists and no transactions, a review surface renders
empty or fabricated. Both cost more trust than absence does. And a review system
without verified transactions is a system for reviewing strangers, which is a
moderation problem we have not earned yet.

## Consequences

- Adding messaging later means new tables and policies — but no change to
  existing ones. Contact events already record `channel`, so we will have data
  on whether people even want it.
- Adding reviews later requires a verified-interaction concept, which we would
  need regardless.
- The `professionals` table is wide. Acceptable; it is read as a unit on the
  profile screen.
- `interactions` as current-state means we lose the history of a changed mind.
  Accepted: taste is about current preference, and an append-only log would make
  taste depend on replay order.
