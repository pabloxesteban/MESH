---
name: mobile-ux
description: Interaction design, flows, states, copy, and accessibility conventions for MESH screens. Use when designing or reviewing any screen, empty state, error state, or user-facing string.
---

# Mobile UX

## Purpose

Make MESH feel like a native, calm, editorial product that never traps or
misleads anyone.

## When to use

Designing a screen. Reviewing a screen. Writing any user-facing string. Adding
a state. Anything involving gestures.

## Rules

1. **Four states or it is not designed:** loading (skeleton, shaped like the
   content), empty (what is true + what to do next), error (cause + retry),
   success. Discovery adds degraded.
2. **Every screen has a forward action from every state.** A screen whose only
   exit is the OS back gesture is a defect.
3. **Swipe is never the only path.** Labelled buttons at ≥44pt, always visible,
   plus `accessibilityActions`. The button path is tested end to end.
4. **Undo exists** for decisive actions. People misfire; punishing them is a
   dark pattern.
5. **Dynamic type to the largest accessibility size.** Text wraps; it never
   clips. Layouts flow; they do not use fixed heights.
6. **Both themes.** Dark is default; light is not an afterthought.
7. **Reduced motion** honoured globally, never checked ad hoc.
8. **Spanish (rioplatense) first**, *vos*. English is a translation.

## Copy conventions

- Say what is true and what to do next.
- Frame inference as inference: "Esto es lo que estamos leyendo de tus
  elecciones", never "Sos 82% Fine Line".
- Sentence case. One idea per line. No exclamation stacking.
- Banned: "swipe right", "AI-powered", "unlock", "level up", "seamless",
  "don't miss out", "Oops!", "revolutionary".
- Empty states never only apologise.

## Anti-patterns

Onboarding carousels · Signup walls before value · Permission prompts before
context · Modals that interrupt rather than respond · Icon-only primary
actions · Placeholder text as a label · Confirmation screens with no new
information · Spinners where skeletons belong · Toasts for errors that need a
decision · Badges and notification dots · Counters of user activity · Green/red
for like/pass · Progress bars toward a target the user never chose.

## Conventions

- Modals are for focused, dismissible tasks (project creation, contact,
  filters, auth). Everything else is a pushed screen.
- After a creating action, land on the result, not on a confirmation.
- Return the user to where they came from — the contact modal closes back to
  the profile, not to the deck.
- Errors are mapped to causes (offline / server / not-found / permission).
  Never show a raw error string.
- Destructive actions confirm once, plainly, with the consequence named.

## Example — an honest empty state

```
Todavía no encontramos a alguien que encaje.

Seguí explorando y vamos a ir entendiendo mejor tu gusto.

[ Seguir explorando ]     [ Ver todos los artistas ]
```

True, non-apologetic, two ways forward. What it must **not** do: show a padded
list of low-scoring artists so the screen looks populated.

## Quality checklist

- [ ] All four states implemented and tested
- [ ] Forward action from every state, including failure
- [ ] Every gesture has a labelled ≥44pt button equivalent
- [ ] Screen reader completes the flow in a sensible order
- [ ] Largest dynamic type size does not clip
- [ ] Reduced motion path verified
- [ ] Both themes verified
- [ ] Copy is `es-AR`, in the approved voice, with no banned phrases
- [ ] Nothing on screen is inferred, generated, or fabricated
