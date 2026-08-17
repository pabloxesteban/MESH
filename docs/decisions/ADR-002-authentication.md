# ADR-002 — Anonymous-first authentication

**Status:** Proposed · **Date:** 2026-08-17 · **Owner:** product-architect

## Context

MESH's value only becomes visible after a user reacts to a dozen pieces of
work. The brief requires signup, login, session persistence, and protected
screens. It also requires that a directed user is never forced through
onboarding, and that the first onboarding question is visual.

## Problem

Requiring an account before the deck puts a form between a first-time user and
the only thing that could convince them. Requiring no account makes taste
device-local and every table's ownership model ambiguous.

## Options

**A. Signup wall.** Account first, then the app. Simple, conventional, and it
loses a large share of first-time users before they see anything.

**B. Fully local until signup.** Taste kept in MMKV, uploaded on account
creation. No auth complexity up front — but it creates a second, unauthenticated
data path, a merge problem at signup, and a schema where `user_id` is sometimes
absent.

**C. Anonymous Supabase session on first launch, upgraded on demand.** Every
user has a real `auth.uid()` from launch. Creating a real account links the
same `auth.users` row; nothing migrates.

## Decision

**Option C.** Anonymous sign-in on first launch. Email + password (or magic
link) upgrade prompted at the first moment it buys the user something —
creating a project they want to keep, or wanting their taste on another device.
Dismissible, and never blocking discovery, taste, matching, or contact.

## Why

The decisive argument is not conversion, it is architecture: with C there is
**no unauthenticated read path in the schema at all**. Every policy is
`auth.uid()`-based, there is no "public" branch of RLS to get wrong, and there
is no merge-on-signup routine — the least testable code in option B and the
place a taste profile would be silently lost.

The product argument is the same one the brief makes in §10: the first question
should be visual. A signup form is not visual.

## Consequences

- Anonymous accounts are cheap to create. Mitigated by provider rate limits on
  anonymous sign-in, identical RLS treatment, and server-side per-user quotas
  on projects and uploads (see security model §6).
- Some anonymous rows will never be claimed. A scheduled cleanup deletes
  anonymous users with zero interactions after 30 days.
- App Store review occasionally questions anonymous auth; the app is fully
  functional without account creation, which is the outcome reviewers actually
  want.
- Apple requires Sign in with Apple **if** third-party social sign-in is
  offered. V1 offers only email/password, so this does not apply — but adding
  Google sign-in later triggers it, and that cost belongs to that decision.
- Session tokens must be in `expo-secure-store` from day one, since a session
  now exists before the user has consciously created anything.
