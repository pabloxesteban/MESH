# MESH — Design System

**Status:** Proposed · **Owner:** design-system-engineer
**Location:** `apps/mobile/src/design-system/`

---

## 1. Rules

1. **No raw values in screens or features.** No hex colours, no numeric
   spacing, no font sizes, no durations, no easing curves. Import a token.
   Enforced by an ESLint rule, not by review.
2. **Tokens are semantic, not literal.** Components consume `text-secondary`,
   never `ink-500`. The literal scale exists only inside the theme definition.
3. **Every interactive component ships with:** an accessibility label or
   `accessibilityLabel` prop, a ≥44×44pt hit target, a disabled state, a
   pressed state, and a loading state where it can trigger work.
4. **Every data component ships with:** loading (skeleton), empty, and error
   variants. A component that can only render success is not finished.
5. **A component earns its place by being used twice**, or by encoding a rule
   that must not be re-decided (contrast, target size, motion). Otherwise it
   stays local to its feature.

## 2. Token structure

```
design-system/
  tokens/
    palette.ts      literal scales — the only file with hex values
    theme.ts        semantic tokens, dark + light
    typography.ts   families, scale, roles
    spacing.ts      4 8 12 16 24 32 48 64
    radius.ts       4 12 20 999
    motion.ts       durations, springs, reduced-motion variants
    haptics.ts      named haptic intents
    elevation.ts    surface + hairline recipes
  primitives/       Text, Box, Pressable, Icon, Image
  components/       the catalogue below
  providers/        ThemeProvider, MotionProvider (reduced-motion aware)
```

`ThemeProvider` resolves dark/light from the system with a user override.
`MotionProvider` reads the OS reduced-motion setting once and exposes it; every
animated component asks it rather than checking independently.

## 3. Component catalogue (V1)

**Primitives** — `Text` (role prop, never a raw size), `Box`, `Pressable`
(handles target expansion + press state + haptic intent), `Icon`, `Image`
(wraps `expo-image` with blurhash, sizing, and recycling defaults).

**Controls** — `Button` (variants: primary, secondary, ghost, destructive;
sizes: sm, md, lg; states: default, pressed, disabled, loading) ·
`IconButton` · `FilterChip` · `Tag` · `Input` (label, hint, error, character
counter) · `Stepper`.

**Content** — `ArtworkCard` (the deck card) · `ProfessionalCard` ·
`MatchCard` (professional + band + up to 3 reasons) · `MatchBadge` (band, never
a bare number) · `Avatar` · `PortfolioGrid` · `StyleMeter` (the taste bar) ·
`PriceRange` · `AvailabilityPill` (renders nothing when stale — the staleness
rule lives in the component so it cannot be forgotten).

**Surfaces** — `BottomSheet` · `Modal` · `Scrim`.

**States** — `Skeleton` · `EmptyState` (illustration slot, message, action) ·
`ErrorState` (cause-mapped message + retry) · `Toast` · `ProgressIndicator`
(the honest onboarding progress: no counts, no "almost there!").

**Structure** — `ScreenHeader` · `TabBarIcon` · `SectionHeader` · `Divider`.

Deliberately absent: Card (too generic — three specific cards instead), Badge
(only match bands need one), Carousel, Accordion, Tooltip. None are needed and
each would attract misuse.

## 4. The deck (`ArtworkCard` + `Deck`)

The highest-risk component. Requirements:

- At most 3 cards mounted. The card behind is scaled `0.96` and offset 8pt —
  a hint of depth, not a 3D stack.
- Gesture runs entirely on the UI thread (Reanimated worklets +
  `react-native-gesture-handler`). No React state per frame, ever.
- Dismissal threshold is **velocity-aware**: a fast flick past 25% of the
  width dismisses; a slow drag needs 45%. A slow drag that stops springs back.
- Rotation is subtle — max 6° at full displacement, anchored below the card so
  it pivots naturally.
- Direction indicators are typographic and neutral, appearing at ~15%
  displacement — a word, not a green tick and a red cross.
- Haptic fires at the commit point, not on release.
- `recyclingKey={portfolioItemId}` so `expo-image` recycles rather than
  remounting.
- Prefetch the next 3 images at `md` when the deck advances.

**Accessible path (equal, not alternative):** Like / Pass / Save / Undo buttons
sit below the card at ≥44pt, always visible. `accessibilityActions` on the card
expose the same operations to screen readers. Every E2E flow is run once using
buttons only (see [test strategy](../testing/test-strategy.md) §6.4).

## 5. Accessibility baseline

- Contrast: 4.5:1 for body text, 3:1 for large text and meaningful icons.
  Verified per token pair in a test, not judged by eye.
- Targets: 44×44pt minimum, expanded via `hitSlop` where the visual is smaller.
- Dynamic type honoured to the largest accessibility size. Text may wrap; it
  may never clip. Card layouts use flow, not fixed heights.
- Reduced motion honoured globally through `MotionProvider`.
- Screen reader order per card: work → artist → styles → actions.
- Colour is never the only carrier of meaning. Match bands carry a word.
- Focus is managed on screen and modal entry.

## 6. Theming

Dark is the default. Both themes are complete, and a component may not assume a
theme — a design that only works dark is not done. Review happens in both.

## 7. Adding a component

1. Is it used twice, or does it encode a rule? If neither, keep it local.
2. Build it from tokens; add no new token without design-system-engineer
   approval.
3. Ship loading / empty / error variants if it renders remote data.
4. Ship accessibility label, target, disabled, and pressed states if
   interactive.
5. Add it to this catalogue in the same commit.
6. Add a component test for the states.

## 8. Anti-patterns

- Passing `style` overrides from a screen into a design-system component to
  "just tweak" it. Add a variant or don't.
- Hard-coding an animation duration because it "felt better" — put it in
  `motion.ts` with a name.
- Green/red for like/pass.
- Shadows to create hierarchy — use surface value and hairlines.
- Icon-only primary actions.
- Skeletons that do not match the shape of the content they replace.
- A component that renders `null` on error instead of an `ErrorState`.
