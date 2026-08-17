# Architecture Decision Records

An ADR is written when a decision is **hard to reverse**, **contested**, or
**surprising to a newcomer**. Not for every choice.

Format: Context · Problem · Options · Decision · Why · Consequences.

Status is one of `Proposed`, `Accepted`, `Superseded by ADR-NNN`. ADRs are not
edited after acceptance except to change status — a superseded decision is
history worth keeping.

| # | Decision | Status |
|---|---|---|
| [001](ADR-001-stack-and-repo-structure.md) | Expo + Supabase; three workspaces, not five packages | Proposed |
| [002](ADR-002-authentication.md) | Anonymous-first auth, upgrade on value | Proposed |
| [003](ADR-003-domain-model.md) | Merge `ProfessionalProfile` into `professionals`; drop `SavedItem`, messaging, reviews | Proposed |
| [004](ADR-004-database-and-rls.md) | Postgres + RLS as the sole authorization layer | Proposed |
| [005](ADR-005-matching.md) | Deterministic scoring; bands instead of percentages | Proposed |
| [006](ADR-006-media.md) | Storage with derived sizes and blurhash; no binaries in Postgres | Proposed |
| [007](ADR-007-navigation.md) | Expo Router, four tabs | Proposed |
| [008](ADR-008-design-system.md) | Design system inside the app, enforced by lint | Proposed |
