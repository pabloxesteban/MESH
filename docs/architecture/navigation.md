# MESH — Navigation Architecture

**Status:** Proposed · **Owner:** ux-product-designer + mobile-engineer

---

## 1. Structure

Expo Router, file-based, typed routes.

```
app/
  _layout.tsx                    root: providers, fonts, session bootstrap
  intro.tsx                      one screen, one line, one action
  (tabs)/
    _layout.tsx                  4 tabs
    discover/
      index.tsx                  the deck
      [itemId].tsx               artwork detail (pushed)
    matches/
      index.tsx                  taste summary + ranked people
    projects/
      index.tsx                  list, or the create-project empty state
      [projectId].tsx            project + its matches
    you/
      index.tsx                  saved · taste · account · settings
  artist/
    [slug].tsx                   professional profile (pushed from anywhere)
  (modals)/
    project-new.tsx              stepped sheet
    contact.tsx                  editable pre-filled message
    filters.tsx                  search/browse filters
    auth.tsx                     account creation / sign-in, shown on demand
```

## 2. Tabs

**Discover · Matches · Projects · You**

Four rather than three, because §08 of the brief defines two *equal* entry
points — exploratory and directed — and burying project creation inside a
profile tab makes the directed user hunt for the thing they came to do. The
cost is one more tab; the benefit is that both intents are visible at first
launch.

This is [open question Q2](../product/product-spec.md#14-open-questions). If
`project_started` from the Projects tab is negligible after the first cohort,
collapse to three tabs and surface projects from Discover.

Tab notes:

- **Matches** carries the taste summary at the top, then the ranked people.
  Taste and matches are the same idea at two zoom levels; splitting them into
  separate tabs would make the user assemble the connection themselves.
- **Projects** with no projects *is* the create-project entry — the empty state
  is the feature, not a placeholder.
- **You** holds saved work, taste settings, account, and privacy. No badge, no
  dot, no notification affordance.

## 3. Route access

| Route | Anonymous session | Durable account |
|---|---|---|
| Intro, Discover, artwork detail, artist profile, search | ✅ | ✅ |
| Interactions, taste, matches | ✅ | ✅ |
| Contact handoff | ✅ | ✅ |
| Create/keep a project | prompted to create an account | ✅ |
| Settings, account, delete data | ✅ | ✅ |

Every user has a Supabase session from first launch (anonymous). There is no
"logged out" browsing state to design, no unauthenticated read path in RLS, and
therefore no route guard that can be forgotten. The prompt to create a real
account appears where it buys the user something — keeping a project, keeping
taste across devices — and is dismissible.

Rationale and trade-offs: [ADR-002](../decisions/ADR-002-authentication.md).

## 4. Transitions

| From → To | Transition |
|---|---|
| Tab → tab | Instant, no animation |
| Deck card → artwork detail | Shared-element on the image, 240ms |
| Anywhere → artist profile | Push, iOS-native slide; hero image shared where the source was an image |
| Any → modal | Sheet, with a grabber; dismissible by drag and by an explicit Close |
| Taste reveal | Editorial: styles resolve in sequence, ~500ms total, respects reduced-motion |

Durations, easings, and reduced-motion behaviour are tokens in the design
system — screens do not define them. Nothing exceeds 500ms. Transitions never
block input.

## 5. Deep links

Scheme `mesh://`, plus universal/app links on a future `mesh.app` domain.

| Link | Target |
|---|---|
| `mesh://artist/{slug}` | Professional profile |
| `mesh://work/{itemId}` | Artwork detail |
| `mesh://style/{categorySlug}/{styleSlug}` | Filtered browse |
| `mesh://project/{id}` | Project — **only if owned by the current session** |

Rules:

1. Every parameter is validated before use — slug pattern, UUID format. A
   malformed link lands on a not-found screen, never on a crash and never on a
   raw query.
2. Deep links may never carry tokens, credentials, or auth codes. Supabase
   auth callbacks use the dedicated `mesh://auth/callback` route and nothing
   else.
3. A deep link to a resource the session does not own resolves to not-found —
   the same response as a non-existent resource, so links cannot be used to
   probe for existence. RLS enforces this regardless of what the client does.
4. Deep links never perform a mutation. No `mesh://like/{id}`.

See [`threat-model.md`](../security/threat-model.md) §T7.

## 6. Back behaviour and dead ends

- Android hardware back is handled on every screen; from a tab root it
  backgrounds the app rather than dropping to a blank stack.
- Every error and empty state carries a forward action — retry, browse, or go
  back. A screen whose only exit is the OS back gesture is a defect.
- The contact modal returns to the profile, not to the deck: the user came from
  somewhere and should land back in context.
- After creating a project, the user lands on that project's matches — the
  payoff, not a confirmation screen.

## 7. Accessibility

- Tab bar labels are always visible — never icon-only.
- Every gesture has a labelled button equivalent; the deck's Like / Pass / Save
  / Undo controls are the primary accessible path and are ≥ 44×44pt.
- Screen readers get a linear reading order per card: work, artist, styles,
  then actions. The deck exposes `accessibilityActions` for like/pass/save so
  VoiceOver and TalkBack users act without swiping.
- Reduced-motion collapses shared-element and reveal transitions to a fade.
- Dynamic type is respected up to the largest accessibility size; layouts use
  flow, not fixed heights, and cards clamp their text rather than clipping it.
