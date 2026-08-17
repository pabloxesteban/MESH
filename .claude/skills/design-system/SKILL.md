---
name: design-system
description: Conventions for tokens, components, motion, and haptics in apps/mobile/src/design-system. Use when adding a component or token, or when a screen needs a design value.
---

# Design system

## Purpose

One place where visual decisions are made, so screens are composition and
nothing else.

## When to use

Adding or changing a component. Adding a token. Any time a screen wants a
colour, a spacing, a font size, or a duration.

## Rules

1. **`tokens/palette.ts` is the only file with a hex value.** Anywhere else is
   a lint error.
2. **Semantic, not literal.** Components consume `text-secondary`, never
   `ink-500`. Needing a literal means the semantic layer is missing a token.
3. **`Text` has no `fontSize` prop.** It takes `role` from a closed union.
   Spacing works the same way. Remove escape hatches rather than documenting
   that they shouldn't be used.
4. **A component earns its place** by being used twice, or by encoding a rule
   that must not be re-decided (contrast, target size, staleness, motion).
5. **Interactive components ship with:** accessibility label support, ≥44×44pt
   target, disabled, pressed, and loading (if they trigger work).
6. **Data components ship with:** skeleton, empty, error variants.
7. **Both themes.** Always.
8. **Contrast is asserted in a test**, never judged by eye.

## Motion

Named tokens only: `instant` 120ms · `quick` 200ms · `standard` 280ms spring ·
`deck` velocity-carrying spring · `reveal` 500ms staggered. Nothing exceeds
500ms. The drag itself has no easing — physics start when the finger leaves.
`MotionProvider` reads reduced-motion once; components ask it.

## Haptics

Confirmation of a decision only. Like → `impactLight`. Save → `impactMedium`.
Pass → **none**. Match list → `notificationSuccess`, once. Never on scroll,
never per frame, never on entry.

## Conventions

- Files: `components/<Name>/<Name>.tsx`, `<Name>.test.tsx`, `index.ts`.
- Variants are props from a closed union, never boolean soup
  (`variant="primary"`, not `isPrimary` + `isGhost`).
- Every component is added to the catalogue in
  `docs/design/design-system.md` in the **same commit**.
- Components never fetch. They receive data and a state.

## Example

```tsx
// ✅
<Text role="title">{professional.displayName}</Text>
<Box padding="lg" gap="sm">
<Button variant="primary" size="lg" loading={isSubmitting}
        accessibilityLabel={t('contact.cta', { name })} />

// ❌ every one of these is a lint error or a review rejection
<Text style={{ fontSize: 24, color: '#F4EFE6' }} />
<View style={{ padding: 24 }} />
<Button style={{ backgroundColor: '#9C2D40' }} />
<Animated.View style={{ transitionDuration: 340 }} />
```

## Anti-patterns

`style` overrides passed into a design-system component from a screen · A
duration inlined "because it felt better" · Drop shadows for hierarchy · Green/
red for like/pass · Skeletons that don't match the content shape · A component
that renders `null` on error · A new component missing from the catalogue · A
token added without a documented intent.

## Quality checklist

- [ ] Built entirely from tokens
- [ ] All states present (loading/empty/error if data; disabled/pressed if
      interactive)
- [ ] Accessibility label support and ≥44pt target
- [ ] Verified in both themes
- [ ] Reduced-motion path verified if animated
- [ ] Component test covers the states
- [ ] Added to the catalogue in the same commit
