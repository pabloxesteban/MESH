# MESH — Visual Language & Brand

**Status:** Proposed · **Owner:** brand-designer

---

## 1. The idea

MESH is about **connection and intersection** — people, taste, skills, ideas,
and work meshing together. Two things that were separate crossing and
continuing as one.

The brand must never lean on tattoo iconography. Needles, machines, roses, and
skulls would make MESH a tattoo app, and MESH is not a tattoo app — it is a
product that currently starts with tattoo.

## 2. Positioning of the visual identity

| We are | We are not |
|---|---|
| Editorial | Neon |
| Artistic | Gamified |
| Tactile | Generic SaaS |
| Premium | Crypto |
| Calm | AI startup |
| Confident | Dating app |

The reference points are a well-made art book, a gallery wall label, and a
printed magazine plate — not a dashboard, not a feed.

**The single strongest brand decision: the work is the design.** MESH's
interface is a frame. It provides silence, generous margin, and precise
typography, then gets out of the way of the images. Any UI element competing
with a piece of artwork for attention is wrong.

## 3. The mark

**Concept: two strokes that cross and continue.**

A monoline symbol in which two paths approach from different directions, cross,
and carry on — leaving a small aperture at the intersection. At a glance it
reads as an abstract **M**. Looked at properly it reads as two things meeting.
The aperture at the crossing is the brand's one distinctive detail: the point
where taste meets a person.

Requirements the mark must satisfy:

- Single stroke weight, no fills, no gradients — so it survives at 16px, in
  one colour, embroidered, stamped, or engraved.
- Legible as an app icon at 60×60pt with the strokes at optical weight (heavier
  than the mathematically scaled version — an icon at small size needs thicker
  strokes than a logo at large size; two optical sizes are produced).
- Works ink-on-paper (`#0C0C0E` on `#F4EFE6`) and paper-on-ink, identically.
- Works with the wordmark and entirely without it.
- Animates as a single continuous draw — used as the loading mark, once, ~600ms,
  never looping aggressively.

Explicitly rejected: node-and-edge network diagrams (every B2B SaaS company),
literal woven mesh or grids (reads as textile or as "loading"), an infinity
symbol, a knot, and any figurative M made of tattoo tools.

**Wordmark:** `MESH` set in the editorial serif, uppercase, tracked wide
(+0.12em). The letterforms carry the personality; the wordmark needs no
customisation beyond tracking and optical spacing of the `M`/`E` pair.

**Clear space:** the height of the `M` on all sides. Minimum sizes: symbol
16px; lockup 88px wide.

Deliverables in Phase 2: `brand/logo/mesh-symbol.svg`,
`mesh-symbol-icon.svg` (optical), `mesh-lockup.svg`, monochrome variants, app
icon set, adaptive Android icon, favicon, and a one-page usage sheet.

## 4. Colour

Anchored on the brief's palette, refined for contrast.

### Core

| Token | Hex | Role |
|---|---|---|
| `ink` | `#0C0C0E` | Near-black. Primary surface in dark, primary text on paper. |
| `paper` | `#F4EFE6` | Warm paper. Primary surface in light, primary text on ink. |
| `signal` | `#9C2D40` | Ink red. Accent, used sparingly. |

### Why the palette needs more than three values

`signal` on `ink` measures ≈ 3.0:1 — **it fails WCAG AA for text.** Using the
brief's red for anything textual on a dark surface would be an accessibility
defect. So the accent exists at two values:

| Token | Hex | Use |
|---|---|---|
| `signal` | `#9C2D40` | Fills and strokes on light surfaces; text on paper (≈6.4:1 ✅) |
| `signal-raised` | `#C4485C` | Text and icons on dark surfaces (≈5.1:1 ✅) |
| `on-signal` | `#F4EFE6` | Text on a `signal` fill (≈5.6:1 ✅) |

### Neutrals

Derived by mixing `ink` and `paper` — not grey, so the whole system stays warm.

`ink-900 #0C0C0E` · `ink-800 #1A1A1D` · `ink-700 #2C2B2E` ·
`ink-500 #56545A` · `ink-300 #8C8A90` ·
`paper-300 #C9C2B6` · `paper-200 #E2DCD1` · `paper-100 #F4EFE6` ·
`paper-050 #FAF7F1`

### Semantic tokens

Screens use only these. They resolve per theme.

```
surface            surface-raised     surface-sunken
text-primary       text-secondary     text-tertiary
border-subtle      border-strong
accent             accent-contrast
overlay-scrim
state-positive     state-negative     state-warning
```

`state-*` values are for system feedback (a failed upload) only. **Like and
pass are never coloured green and red.** Green/red is a judgement UI and belongs
to dating apps; MESH's like and pass are neutral, weighted by typography and
motion rather than by colour.

### Discipline

- `signal` appears **at most once per screen**. It marks the single most
  important action or the one thing that must be noticed. When everything is
  accented, nothing is.
- Artwork is never tinted, overlaid with a brand colour, or given a coloured
  border.
- Scrims over images are `ink` at measured opacity, never coloured.

### Theme

Dark (`ink` surface) is the default: it is the right frame for photography and
it is what a gallery does. Light (`paper`) is fully supported and is not an
afterthought — every token has both values, and the design is reviewed in both.

## 5. Typography

Two families. Both are variable, open-licence, and bundleable with Expo.

**Editorial serif — Fraunces.** Brand moments, emotional statements, major
headings, the taste reveal, and profile names. Variable with optical-size and
`soft`/`wonk` axes; run at `wonk: 0`, `soft: 0` so it reads contemporary rather
than antique, with optical size tuned per step.

**Modern sans — Instrument Sans.** Navigation, buttons, metadata, tags,
filters, all functional UI. Neutral without being Helvetica-anonymous, and it
pairs with Fraunces by construction.

**Alternates if Fraunces reads too characterful in situ:** Instrument Serif
(display only, one weight) or Newsreader. Decided on-device in Phase 2, not
from a specimen.

### Scale

| Token | Family | Size / line | Use |
|---|---|---|---|
| `display` | Serif | 40 / 44 | Taste reveal, brand moments |
| `title-lg` | Serif | 30 / 36 | Screen titles, artist name on profile |
| `title` | Serif | 24 / 30 | Section heads |
| `body-lg` | Sans | 17 / 26 | Bios, project descriptions |
| `body` | Sans | 15 / 22 | Default |
| `label` | Sans | 13 / 18 | Metadata, captions |
| `micro` | Sans | 11 / 14, +0.08em | Tags, overlines — uppercase |

Rules: serif is never used below 24px, and sans is never used above 20px. That
one constraint keeps the two families in their roles without a style guide
argument every screen.

## 6. Layout

- 8pt spacing scale: 4, 8, 12, 16, 24, 32, 48, 64.
- Screen gutter 20pt. Content is generous rather than dense — this is a product
  about looking at one thing, not scanning many.
- Radii: 4 (chips), 12 (cards, sheets), 20 (deck cards), 999 (pills).
  Artwork corners are radius 12 — softened, not rounded.
- Elevation is expressed with surface value shifts and hairline borders, not
  with drop shadows. Shadows on a warm dark surface look like dirt.
- Discovery card: full-bleed artwork with metadata below, not on top of, the
  image. Text over artwork is a scrim, and a scrim is a compromise of the work.

## 7. Motion

Motion communicates direction, confirmation, connection, and hierarchy.
Anything that does not communicate one of those does not ship.

| Token | Spec | Use |
|---|---|---|
| `instant` | 120ms, ease-out | State toggles, presses |
| `quick` | 200ms, ease-out | Fades, chip changes |
| `standard` | 280ms, spring (damping 22, stiffness 220) | Screen transitions, sheets |
| `deck` | spring (damping 18, stiffness 180), velocity-carrying | Card dismissal |
| `reveal` | 500ms staggered 60ms | Taste reveal only |

Rules:

- Nothing exceeds 500ms.
- The deck follows the finger exactly — no lag, no easing on the drag itself.
  Physics start when the finger leaves.
- Dismissal direction follows the throw. A card leaves the way it was pushed.
- Reduced-motion replaces every transform-based transition with a 120ms
  cross-fade, and the taste reveal appears at once. Nothing becomes
  unreachable.
- No confetti, no particles, no looping idle animation, no bouncing UI.

## 8. Haptics

Sparingly, and only as confirmation of a decision the user made.

| Action | Haptic |
|---|---|
| Like | `impactLight` |
| Save | `impactMedium` |
| Pass | none — passing is not an achievement |
| Match list appears | `notificationSuccess`, once |
| Destructive confirm | `impactHeavy` |
| Error | `notificationError` |

Never on scroll, never per frame, never on card entry. Respect the system
haptics setting; provide an in-app toggle.

## 9. Iconography

Monoline, 1.5px at 24px, rounded caps, matching the mark's construction. Feather
or Lucide as a base, with any icon that does not fit redrawn rather than
imported. Icons are never the sole label on a primary action.

## 10. Voice

Spanish (rioplatense) first — *vos*, not *tú*. Direct, warm, unhurried, never
salesy.

**Good:**
"Empecemos por lo que te gusta." · "Encontrá a tu gente." ·
"Detrás de cada trabajo hay alguien." · "¿Quién hizo esto?" ·
"Hagámoslo realidad."

**Banned:** "Swipe right", "Like Tinder", "AI-powered", "revolutionary",
"seamless", "unlock", "level up", "don't miss out", any exclamation stacking,
any fake urgency.

**Empty states say what is true and what to do next**, and never apologise
theatrically: "Todavía no hay coincidencias. Seguí explorando y vamos a ir
entendiendo tu gusto."

## 11. Photography and content presentation

- Artwork is shown uncropped where the aspect ratio permits; when it must be
  cropped, the crop is centred and the full image is one tap away.
- No filters, no colour grading, no vignettes over artists' work.
- Attribution is always adjacent to the work — the artist's name is never more
  than a glance away from their piece. This is a brand position: MESH exists to
  put the person back next to the work.
