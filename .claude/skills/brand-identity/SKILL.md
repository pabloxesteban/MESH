---
name: brand-identity
description: MESH's visual identity — the mark, colour, typography, voice, and what must never appear. Use when creating brand assets, evaluating a visual decision, or writing brand-level copy.
---

# Brand identity

## Purpose

Keep MESH recognisable, independent, and honest — a frame around other people's
work rather than a competitor to it.

## When to use

Creating or evaluating the logo, app icon, or any brand asset. Deciding whether
a visual choice looks like MESH. Writing brand-level copy.

## The idea

Connection and intersection. Two things that were separate crossing and
continuing as one. People + taste + skills + ideas + work, meshing.

**The work is the design.** MESH supplies silence, margin, and precise
typography. Anything competing with a piece of artwork is wrong.

## Rules

1. **No tattoo iconography, ever.** Tattoo is the first vertical, not the
   brand.
2. **No node-and-edge network diagrams.** That is every B2B SaaS logo.
3. The mark reads at **16px**, in **one colour**, with **no wordmark**. If it
   needs size or colour, it failed.
4. It works ink-on-paper (`#0C0C0E` on `#F4EFE6`) and inverted, identically.
5. Icon-size art is **optically corrected**, not mathematically scaled — small
   sizes need heavier strokes.
6. `signal` red appears **at most once per screen**.
7. Artwork is never tinted, overlaid with brand colour, or given a coloured
   border.
8. Serif never below 24px. Sans never above 20px.

## Colour, with the accessibility correction

| Token | Hex | Use |
|---|---|---|
| `ink` | `#0C0C0E` | Dark surface, text on paper |
| `paper` | `#F4EFE6` | Light surface, text on ink |
| `signal` | `#9C2D40` | Fills; text **on light only** (≈6.4:1) |
| `signal-raised` | `#C4485C` | Text and icons **on dark** (≈5.1:1) |
| `on-signal` | `#F4EFE6` | Text on a signal fill (≈5.6:1) |

`signal` on `ink` is ≈3.0:1 and **fails AA for text**. That is why
`signal-raised` exists. Do not "fix" this by using `signal` anyway.

Neutrals are mixes of `ink` and `paper`, never pure grey — the system stays
warm.

## Typography

**Fraunces** (variable, `wonk: 0`, `soft: 0`) for editorial moments, headings,
the taste reveal, artist names. **Instrument Sans** for all functional UI. Both
open-licence, variable, bundleable with Expo.

## Voice

Rioplatense Spanish, *vos*. Direct, warm, unhurried, never salesy.

Good: "Empecemos por lo que te gusta." · "Encontrá a tu gente." · "Detrás de
cada trabajo hay alguien." · "¿Quién hizo esto?" · "Hagámoslo realidad."

Banned: "swipe right", "like Tinder", "AI-powered", "revolutionary",
"seamless", "unlock", "level up", fake urgency of any kind.

## Anti-patterns

Gradients in the mark · A mark needing a specific background · Two accent
colours · Neon · Startup purple · Drop shadows for depth · Brand elements over
photography · Filters or grading on artists' work · A wordmark that needs
custom letterforms to be interesting · Stock imagery of any kind.

## Quality checklist

- [ ] Legible at 16px and as a 60pt app icon
- [ ] Works without the wordmark
- [ ] Works in one colour, both polarities
- [ ] Not confusable with Wi-Fi, infinity, a knot, a chain, or a node graph
- [ ] Optical correction applied at icon size
- [ ] Contrast verified for every token pair used
- [ ] `signal` used at most once on the screen
- [ ] No tattoo-specific imagery anywhere
