# MESH — Product Specification (V1)

**Status:** Draft for approval · **Owner:** product-architect · **Last updated:** 2026-08-17

---

## 1. Product statement

MESH helps people discover the right person to bring an idea to life.

The problem: *"I know what I want, or what I like, but I don't know who is the
right person to make it."*

The loop:

```
DISCOVER → TASTE → PEOPLE → MATCH → ACTION
```

The promise, in the user's words:

> "Show us what you like. We'll help you discover who can make it."

## 2. Scope of V1

| Dimension | V1 |
|---|---|
| Category | Tattoo only |
| Market | Buenos Aires / CABA, Argentina |
| Supply | 8–15 real artists, curated, consented |
| Demand | Anyone; no gating on who can browse |
| Contact | WhatsApp and Instagram, outside MESH |
| Booking / payments | Out of scope |
| In-app messaging | Out of scope (see §12) |
| Reviews | Out of scope (see §12) |
| Professional self-service | Out of scope; artists are onboarded manually |
| Locale | `es-AR` primary, `en` secondary |

V1 exists to test one hypothesis:

> People discover tattoo artists more effectively when MESH learns their visual
> taste and recommends professionals based on that taste.

Everything that does not help test that hypothesis is out of scope, however
reasonable it sounds.

## 3. Users

**The seeker** (primary). Wants a tattoo, or is tattoo-curious. Two mental
states:

- *Exploratory* — "I like this kind of thing but I don't know what I want yet,
  and I definitely don't know who." Enters through **Discover**.
- *Directed* — "I know what I want. Find me someone who does it." Enters
  through **Projects** or **Search**. Must never be forced through onboarding.

**The artist** (secondary in V1). Does not use the app in V1. Receives a
WhatsApp message from a stranger who already likes their work and can say why.
Their success metric is the quality of the inbound, not the volume.

## 4. Entry points

### A. Discover
Explore visual work. Like, pass, save, inspect, open a profile, see the artist
behind a piece. Taste accumulates silently.

### B. Create a project
Describe what you want. Category, description, styles, references, budget,
timing, size, location, notes — all optional beyond title and category. MESH
recommends professionals for it.

Both entry points converge on the same place: a ranked, explained list of
people, and a way to talk to them.

## 5. Onboarding

**Principle: the first question is visual, not a form.**

1. Cold open on the value proposition — one editorial screen, one line of copy,
   one action. No carousel, no permissions prompt, no signup wall.
2. Straight into a taste sequence: *"Empecemos por lo que te gusta."*
   ("Let's start with what you like.")
3. The user reacts to work. Like / Save / Pass, via gesture **or** buttons.
4. Progress is shown honestly and without pressure — a thin indicator, no
   counters, no "3 more to unlock!".
5. At sufficient signal (see `matching.md` §3.4), a taste reveal:

   > **Tu gusto**
   > Fine Line · 82%
   > Botanical · 74%
   > Minimal · 61%

   Framed as *what we've inferred*, never as a measurement of the person.
   Copy: "Esto es lo que estamos leyendo de tus elecciones." Every taste screen
   carries an affordance to keep exploring and change it.
6. Then, and only then, people.

**Account creation is deferred.** The user is signed in anonymously from first
launch (Supabase anonymous auth). They are asked to create a real account at
the first moment it buys them something — saving a project, or returning to
their taste on another device. Rationale and trade-offs in
[ADR-002](../decisions/ADR-002-authentication.md).

## 6. Discovery

Discovery is the emotional core. Visual hierarchy is absolute:

1. Artwork
2. Artist
3. Style
4. Context (location, starting price if the artist published one)
5. Controls

A discovery card carries: the work, the artist's name, up to three style tags,
location, an optional starting price, and controls for Like / Pass / Save /
View artist. It should read as a piece of editorial content — a plate in a
magazine — not a dating profile.

Interaction requirements:

- Native gesture with spring physics and velocity-aware dismissal.
- Haptic confirmation on decisive actions only (like, save) — not on every
  frame or every card.
- Next 3 images preloaded; blurhash placeholder before decode.
- Every gesture mirrored by a labelled button.
- Undo the last action (single step). People misfire; punishing them is a dark
  pattern.

Explicitly **not**: 3D card stacks, confetti, parallax tilt, particle effects,
"you're on fire" messaging, or a counter of how many cards you've seen.

## 7. Taste

Interactions move a per-style taste vector. Values, weights, normalization,
readiness thresholds, and decay are specified in
[`matching.md`](matching.md). Product requirements on top of the algorithm:

- Taste is **always visible and always editable.** The user can open their
  taste at any time and see which styles are reading strongest.
- Taste is **explained by evidence** — tapping a style shows the actual pieces
  that contributed to it.
- Negative signal (passes) is used in ranking but is **never displayed back**
  as "you dislike X". A pass is weak, ambiguous evidence and presenting it as a
  judgement about a person's taste is both wrong and unpleasant.
- A user can reset their taste. One button, one confirmation, no dark-pattern
  friction.

## 8. Matching

Ranked professionals with an explanation each. Algorithm in
[`matching.md`](matching.md).

Product-level rules:

- **No match is shown before there is real signal.** Below the readiness
  threshold, the Matches tab shows a genuine empty state that invites more
  exploring — not a filler list dressed up as recommendations.
- **Match strength is presented as a band** — *Fuerte / Bueno / Posible*
  (Strong / Good / Possible) — not a two-significant-figure percentage. With
  8–15 artists in one city, a "96%" is precision the data cannot support, and
  it will be the first thing a skeptical user disbelieves. The numeric score
  exists internally and is exposed in debug builds. See
  [ADR-005](../decisions/ADR-005-matching.md) for the argument and the
  conditions under which we would switch to percentages.
- **Reasons are generated from contributing terms only,** ranked by their
  actual contribution, capped at three. If there is no honest reason, there is
  no match.

Example:

> **¿Por qué esta persona?**
> ✓ Marcaste varios trabajos de Fine Line
> ✓ Guardaste diseños Botanical
> ✓ Trabaja los dos estilos
> ✓ En CABA *(shown only when location was actually a differentiator)*

Never: "Our AI thinks you'll love this."

## 9. Professional profile

The profile is a portfolio, not a résumé.

```
Hero work (full-bleed)
Identity — name, location, specialties, availability if fresh
Portfolio — large visual grid, featured work first
About — bio in the artist's own words
Styles — tags, tappable into discovery
Pricing — only if the artist published a range
Availability — only if updated within 45 days, otherwise hidden
Social — Instagram
Primary CTA — "Hablá con {nombre}"
```

Nothing on this screen may be inferred or generated. If the artist did not
provide it, the section does not render.

## 10. Contact handoff

Contact leaves MESH. Supported: WhatsApp (`https://wa.me/{e164}?text=...`) and
Instagram.

The pre-filled WhatsApp message is composed **only** from facts the user
actually produced:

> Hola {nombre}! Te encontré en MESH porque me gustaron tus trabajos de
> {estilos que el usuario efectivamente marcó}.
>
> {título del proyecto, si existe}
> {descripción del proyecto, si existe}

Rules:

- Styles named are the ones the user's own interactions support — nothing else.
- Project details are quoted, never paraphrased or embellished.
- Budget, timing, and personal details are included **only** if the user
  entered them and confirmed sharing them.
- The message is shown to the user and editable before it is sent. MESH never
  sends anything on the user's behalf.
- If the artist has no WhatsApp, the CTA is Instagram, and the copy changes —
  we do not fake a channel.

## 11. Projects

A project is a lightweight brief: title, category, description, styles,
location, optional budget band, optional timing, optional size note, optional
reference images.

Creating a project produces a ranked list of professionals scored against the
project (see `matching.md` §5) rather than against ambient taste.

Explicitly not in V1: bidding, auctions, proposals, quotes, escrow, deadlines,
project status workflows. A project in V1 is a better-shaped search, not a job
posting.

## 12. Deliberate omissions, and why

| Omitted | Reason |
|---|---|
| In-app conversations / messages | §10 puts contact on WhatsApp. Shipping both means building a messaging surface nobody has asked for, plus its moderation, notification, and abuse burden. Revisit when there is evidence people want to leave WhatsApp. |
| Reviews & ratings | With ~12 artists and no transactions, any review UI is either empty or fake. Both damage trust more than absent reviews do. |
| An `availability` calendar table | Artists in V1 will not maintain a calendar. A stale calendar is worse than none. V1 stores a self-declared status with a freshness timestamp and hides it when stale. |
| Separate `ProfessionalProfile` table | A 1:1 split of `professionals` adds a join and two policy sets for no behavioural difference. The important separation — *user* vs *professional* — is preserved. See [ADR-003](../decisions/ADR-003-domain-model.md). |
| A `saved_items` table | A save is an interaction. Modelling it twice invites the two representations to disagree. |
| Admin panel | 8–15 artists are seeded from version-controlled, schema-validated content files. |
| Push notifications | Nothing in V1 is worth interrupting someone for. |

## 13. Success criteria

V1 is done when all of the following are true.

1. A new user reaches artwork within seconds of first launch, without a signup wall.
2. They can react to work by gesture **and** by button, with undo.
3. Their reactions move a taste profile that they can inspect and edit.
4. They can see a taste summary with honest framing.
5. They see personalised professionals only once there is real signal.
6. Every match carries reasons derived from contributing score terms.
7. They can open a profile and browse the portfolio smoothly on a real device.
8. They can contact the artist on WhatsApp or Instagram with an editable,
   truthful pre-filled message.
9. They can create a project and get relevant, explained recommendations.
10. They can create a durable account and keep their taste.
11. Auth is secure; RLS blocks all cross-user access, proven by tests.
12. Every network-driven surface has loading, empty, error, and retry states.
13. 8–15 real artist profiles seed reliably and repeatably from content files.
14. Adding a second category requires no core schema change.
15. No critical security findings open.
16. No UX dead ends: every screen has a way forward and a way back.

## 14. Open questions

| # | Question | Owner | Needed by |
|---|---|---|---|
| Q1 | Do we show a numeric match score or a band? Recommendation: band. | product-critic | Phase 10 |
| Q2 | Four tabs (Discover / Matches / Projects / You) or three with Projects nested? Recommendation: four, then measure. | ux-product-designer | Phase 8 |
| Q3 | Anonymous-first auth vs. signup-first. Recommendation: anonymous-first. | product-architect | Phase 6 |
| Q4 | How many decisive interactions before taste is "ready"? Starting value 12. | matching-engineer | Phase 9 |
| Q5 | Is a starting price honest to display when Argentine pricing moves with inflation? Recommendation: show a band with a `priced_at` date, or omit. | product-architect | Phase 11 |
