# ADR-006 — Media storage and delivery

**Status:** Proposed · **Date:** 2026-08-17 · **Owner:** backend-engineer, performance-engineer

## Context

MESH is an image product. The discovery deck shows a full-screen photograph
every second or two, on mobile networks in Buenos Aires, and the perceived
quality of the whole app is the perceived quality of image loading. Media
includes curated artist portfolios (public) and user-uploaded project references
(private).

## Problem

Where do the bytes live, how many variants do we make, and how does the client
avoid downloading more than it needs?

## Options

**A. Bytes in Postgres (`bytea`).** Rejected outright: bloats the database,
destroys backup times, cannot be CDN-cached, and makes every row read expensive.

**B. Storage, single original per image.** Simplest pipeline; the deck then
downloads 2–4 MB per card. Unacceptable on mobile data.

**C. Storage with derived sizes generated at seed time.** More pipeline, far
less bytes on the wire.

**D. Storage with on-the-fly transforms** at request time (Supabase image
transformations or a CDN).

## Decision

**C**, with **D** as the upgrade path.

- Two buckets: `portfolio` (public read, service-role write) and `references`
  (private, owner-scoped paths). `avatars` added when users get avatars.
- The seeder re-encodes each source image into **WebP** at three longest-edge
  sizes: `sm` 400px, `md` 900px, `lg` 1600px.
- A **blurhash** is computed at seed time and stored in `media_assets`
  alongside dimensions, byte size, mime type, and checksum.
- The client picks by surface: grids `sm`, deck `md`, full view `lg`.
- `expo-image` with disk caching, blurhash placeholder, `recyclingKey`, and
  explicit `contentFit`.
- The deck prefetches the next **3** images at `md`.
- Private references are served through short-lived signed URLs, never
  persisted or logged.

## Why

The deck is the product's first impression and it is where bandwidth is spent.
Downloading a 1600px image to show it at 390pt wide wastes roughly 75% of the
bytes and the decode time; three derived sizes remove that in one step.

Blurhash rather than a spinner or a grey box: it gives the correct dominant
colours and composition immediately, so the card feels populated before the
image lands. On a slow connection that is the difference between "loading" and
"almost there".

WebP is universally supported on the platform versions we target and is
meaningfully smaller than JPEG at equivalent quality.

Storing dimensions in `media_assets` lets the client reserve exact space before
decode, which removes layout shift in the portfolio grid — a jump in a grid of
someone's artwork looks cheap.

Generating at seed time rather than on the fly (D) is right for V1 because the
catalogue is small, static, and seeded from a controlled pipeline: the work
happens once, offline, and there is no per-request cost or dependency. It stops
being right when artists upload their own work — at which point D moves the
resizing to the provider and the derived-size logic becomes a URL parameter.

## Consequences

- Storage holds ~3× the images. Trivial at this catalogue size.
- Changing the size ladder requires re-running the pipeline. Originals are kept
  outside the repository (artists' own storage) so re-derivation is possible.
- The seed tool needs an image processing dependency (`sharp` or equivalent) —
  in `tools/seed` only, never in the app's dependency tree.
- Re-encoding strips EXIF, including GPS, as a side effect. For user-uploaded
  references this must be done **client-side before upload**, and is asserted by
  a test — a reference photo taken at home must not carry coordinates.
- SVG is excluded from the allowed MIME types at the bucket level: it is a
  script container, not an image format.
