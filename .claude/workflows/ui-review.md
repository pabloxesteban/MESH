# Workflow — UI review

For any new or changed screen.

**Participants:** `ux-product-designer` (lead), `design-system-engineer`,
`brand-designer`, `product-critic`.

## 1. Purpose — `ux-product-designer`

- What is this screen for? Can you tell in two seconds?
- What can be removed without losing that?
- Where does the user go next, from **every** state including failure?

A screen whose only exit is the OS back gesture is a dead end and fails here.

## 2. States

- [ ] Loading — a skeleton shaped like the content, not a spinner
- [ ] Empty — says what is true and what to do next; does not only apologise;
      is not padded with filler to look populated
- [ ] Error — mapped cause plus a working retry
- [ ] Success
- [ ] Degraded, if this is a discovery surface

## 3. Interaction

- [ ] Every gesture has a labelled button at ≥44pt, always visible
- [ ] Undo exists for decisive actions
- [ ] `accessibilityActions` exposed where gestures are the fast path
- [ ] Nothing important is behind a long-press or a hidden gesture

## 4. Accessibility

- [ ] Screen reader order is sensible: work → artist → styles → actions
- [ ] Largest dynamic type size wraps rather than clips
- [ ] Contrast holds for every token pair used (asserted, not eyeballed)
- [ ] Reduced-motion path verified
- [ ] Colour is never the only carrier of meaning
- [ ] The whole flow completes with buttons only

## 5. Design system — `design-system-engineer`

- [ ] No raw hex, spacing number, font size, or duration in the screen
- [ ] No `style` overrides passed into design-system components
- [ ] New components justified (used twice, or encode a rule) and added to the
      catalogue in the same commit
- [ ] Works in **both** themes

## 6. Brand — `brand-designer`

- [ ] Artwork dominates; nothing competes with it
- [ ] `signal` red used at most once
- [ ] Artwork untinted, un-overlaid, un-bordered in brand colour
- [ ] Serif ≥24px, sans ≤20px
- [ ] No tattoo iconography
- [ ] Copy is `es-AR`, correct voice, no banned phrases

## 7. Critique — `product-critic`

- Does this screen end at a person, or at a dead end?
- Is this Pinterest / Instagram / Airtasker / Tinder?
- What friction did it add?
- Is anything on screen inferred, generated, or fabricated?

## 8. Device pass

Screenshot or record on a real device, both themes, default and largest type
size. Simulator screenshots do not close this step.
