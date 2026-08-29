# Phase 7 — UI/UX Overhaul (Design Alignment)

> Aligning the app's five core surfaces with the 2026-08 design set (landing, onboarding,
> login, home, story selection). Principle: **functionality already exists — this phase is
> visual/UX alignment, test updates, and old-code cleanup.** Structural changes are called
> out explicitly and need sign-off before build.

## Audit: design vs current implementation

| # | Surface | Design | Current code | Classification |
|---|---------|--------|--------------|----------------|
| 1 | Landing / splash | Night sky, moon, serif "Early Roots" wordmark, bear-in-clouds, tagline "A gentle place to grow together.", spinner ring | `components/splash-screen.tsx` — already night sky + stars + moon + bear + logo + version | **Restyle** (add tagline + spinner, align native splash colour — done in this phase) |
| 2 | Onboarding (5 pages: Four worlds / Made for two / Calm by design / Ready anywhere / Who is exploring today?) | Full-screen paged flow ending in child profile (avatar, nickname, age range, language) | `components/onboarding/onboarding-flow.tsx` + `onboarding-screen.tsx` (flow exists); child age exists (`store/app-store.ts` `childAgeInMonths`); **no avatar/nickname profile** | **Restyle + partial build** — page content/copy rework is restyle; avatar+nickname profile is new data (store fields + persistence) |
| 3 | Login | "Grown-ups, let's get started", white pill Apple/Google buttons, outline Guest button, "Includes two free stories. Cloud sync is unavailable in guest mode.", shield footer "No adverts. No behavioural tracking." | `components/auth/login-screen.tsx` — same three actions, night-sky background, different copy/button styling | **Restyle** (done in this phase) |
| 4 | Home | "What shall we do together?", continue-together resume card, worlds carousel (Music & Rhymes / Storybooks / Puzzles), bottom tab bar Home / Library / Progress / Parent | `components/main-menu/` — moon + carousel of world cards exists (`menu-carousel.tsx`); **no bottom tab bar** (custom view switching in `app/_layout.tsx`, not expo-router tabs); **no per-story resume position** in store (only `lastReadDate` streak) | **Structural** — needs decisions below |
| 5 | Story selection | Distinct design landed 2026-08: cropped planet, floating circular controls, filter pills, full-width featured card, portrait covers with titles **on** the artwork, four-tab bottom nav | Genre carousels + detail/rotate-prompt flow (Phase 6c); landscape cards with titles **below** them, shared `PageHeader`, no featured card, no tokens | **Restyle + structural** — full build spec in [`grow-with-freya/OVERHAUL-UI.md`](grow-with-freya/OVERHAUL-UI.md) |

## Open decisions (blocking surface 4, parts of 2)

1. ~~**Bottom tab bar**~~ — **resolved 2026-08-29: journey-scoped, not global.** The bar
   appears on entering an activity journey (Stories first) and persists across that journey's
   sub-pages; it does not exist on home, splash, auth or onboarding. A journey shell owns it,
   so the `app/_layout.tsx` view-switching migration is **off the critical path**. Spec:
   [`grow-with-freya/OVERHAUL-UI.md`](grow-with-freya/OVERHAUL-UI.md) §6.11.
2. **Resume card** ("Continue together — Page 4 of 10"): requires persisting per-story
   last-page in `app-store` and wiring the reader to update it. Small data-model addition.
3. **Typography** (still open): designs use a serif display face for headings ("Early Roots", "Grown-ups,
   let's get started"); the website uses Fredoka/Nunito. Decide: ship a bundled font
   (brand-consistent with website) or keep `Fonts.primary` (SF Pro Rounded). Affects every
   surface — decide before surface 2/4 work.
4. **Child profile** (avatar, nickname): new persisted fields; nickname is PII-adjacent —
   keep on-device only (COPPA posture), never sync without explicit design.

## Phase plan

- **7a — DONE**: login restyle to design copy/layout; splash rocket removed, tagline +
  spinner added, night-sky gradient; native splash colour navy; locale keys ×14.
- **7b — DONE**: onboarding rebuilt as six steps on a shared night-sky shell —
  four design intro pages (worlds / together / safe / ready), the existing legal
  consent step (restyled dark, **never skippable**), and the "Who is exploring today?"
  profile page wired to the existing `setUserProfile` / `setChildAge` store actions.
- **7c**: home overhaul — decision 1 first, then resume card (decision 2), worlds carousel
  restyle, bottom tabs.
- **7e — DONE (A–F)**: story catalogue rebuilt as `StoryCatalogueScreen` on the
  [`grow-with-freya/OVERHAUL-UI.md`](grow-with-freya/OVERHAUL-UI.md) spec: child-ui environment
  components, portrait title-on-cover cards, featured card, pill filter bar, journey-scoped
  bottom navigation (decision 1 resolved journey-scoped, so no `app/_layout.tsx` migration).
  Only the OVERHAUL-UI phase G deletion pass (old `story-selection-screen.tsx` /
  `catalog-story-card.tsx`) remains, gated on file-deletion sign-off.
- **7d**: cleanup pass — delete dead styles/components orphaned by 7a–7c, consolidate the
  night-sky palette. **Still open**: the app carries several sky gradients. A royal-blue ramp
  now exists in `grow-with-freya/constants/night-palette.ts` but is deliberately scoped to the
  activity journeys (story catalogue + instrument screens); splash, auth, onboarding, home and
  account keep their own palettes by product decision on 2026-08-29.

## What 7b actually changed

| File | Change |
|---|---|
| `components/onboarding/onboarding-theme.ts` | **New** — single source for the night palette |
| `components/onboarding/onboarding-screen.tsx` | **Rewritten** (773 → ~300 lines): night-sky shell with stars, moon, progress dots, Skip, gold CTA. Per-step content no longer hardcoded here |
| `components/onboarding/onboarding-pages.tsx` | **New** — the four intro page bodies + profile setup |
| `components/onboarding/onboarding-flow.tsx` | Rewritten around a six-step `STEP_ORDER`; Skip jumps to consent; profile completes onboarding |
| `locales/*/index.ts` (×14) | New `onboardingV2` namespace |

**Deliberate deviations from the design, and why:**
- The design's five pages omit a legal consent step. Consent is a COPPA/UK-GDPR
  requirement, so it is kept as step 5 and is the one step Skip cannot bypass.
- The design shows animal avatars (bear/rabbit/fox/dino/elephant). Only
  `boy-avatar.webp` and `girl-avatar.webp` exist in the repo, so the profile page uses
  those two. **Add the animal avatar assets to close this gap.**
- The design's per-page illustrations (parent+child, cloud+lock, backpack) are not in
  the repo; icon-led cards in the night palette stand in for them.

## Palette (from designs, used by 7a and the Phase-6c story flow)

| Token | Value | Usage |
|---|---|---|
| night-base | `#0A0F2C` | backgrounds, masks |
| night-card | `rgba(255,255,255,0.06)` + border `rgba(255,255,255,0.12)` | cards, chips |
| gold | `#E8B84B` | accents, arrows, sparkles |
| purple | `#6D5DF5` | primary CTA |
| text-muted | `rgba(255,255,255,0.65–0.75)` | secondary copy |
