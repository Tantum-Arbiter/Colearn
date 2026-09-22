---
title: "Frontend Architecture — Grow with Freya"
type: architecture
status: living
owner: CoLearn
tags: [architecture, frontend, mobile, react-native, expo]
updated: 2026-07-28
---


# Frontend Architecture -Grow with Freya

> **For LLMs / AI agents**: This README is the authoritative reference for the frontend app architecture.
> Read this file before modifying services, data flow, or navigation. If you change architecture, **update this file**.

## Overview

**Grow with Freya** is a React Native app built with Expo (SDK 54) for iOS and Android.
It is an interactive children's storybook app with localized content, music challenges,
voice recording, and parental controls. The app is written in TypeScript using Expo Router
for navigation and Zustand for state management.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Expo (Managed Workflow) | SDK 54 |
| Language | TypeScript | 5.9 |
| Runtime | React Native | 0.81 |
| Navigation | Expo Router | 6.0 |
| State | Zustand + AsyncStorage | 5.0 |
| Animations | React Native Reanimated | 4.1 |
| Auth | Google Sign-In + Apple Auth | -|
| Analytics | Sentry | 7.8 |
| i18n | i18next + react-i18next | 24 / 15 |
| Audio | expo-audio | 1.1 |
| Images | expo-image | 3.0 |
| Build | EAS Build | -|

## App Architecture

```
app/
├── _layout.tsx              ← Root layout: providers, orientation, navigation state machine
├── index.tsx                ← Entry point (redirects to _layout)

components/
├── onboarding/             ← First-launch tutorial flow
├── auth/                   ← Login screens (Google, Apple, guest mode)
├── home/                   ← Returning-user home: welcome, continue, journey stats, achievements (see below)
├── main-menu/              ← Legacy 3D coverflow carousel (behind `useHomeScene`)
├── stories/                ← Story reader, page rendering, interactions
│   ├── story-book-reader.tsx    ← Core reader: page navigation, mode selection, overlays
│   ├── music-challenge-ui.tsx   ← Note buttons, sequence progress, blow detection
│   ├── instrument-picker-overlay.tsx  ← Instrument selection carousel
│   ├── story-garden/            ← Story Garden catalogue + book-opening ritual (flagged)
│   └── reader/                  ← Auto-hiding reader chrome, page-edge navigation
├── music/                  ← Music mode screens (practice, freeplay)
├── account/                ← Settings, language, screen time, profile
├── owl-guide/              ← The owl's guided tours (spotlight + speech bubbles)
└── ui/                     ← Shared UI components
    └── earth-horizon.tsx        ← One globe: rises from the home page's bottom edge, hangs from the top of every page below (`constants/earth.ts` owns the geometry)

services/
├── api-client.ts           ← HTTP client: auth headers, token refresh, timeouts
├── auth-service.ts         ← Google/Apple OAuth → gateway → JWT tokens
├── batch-sync-service.ts   ← Content sync orchestrator (the big one)
├── cache-manager.ts        ← Local file cache for stories + images
├── story-loader.ts         ← Merges bundled + CMS stories
├── story-sync-service.ts   ← Legacy sync (being replaced by batch-sync)
├── version-manager.ts      ← Local vs server version comparison
├── music-asset-registry.ts ← Local instrument/note/song asset registry
├── sequence-matcher.ts     ← Note sequence matching logic
├── i18n.ts                 ← 14-language internationalization
├── sentry-service.ts       ← Crash reporting (opt-in)
└── ...

store/
└── app-store.ts            ← Zustand store: onboarding, auth, UI, screen time

types/
└── story.ts                ← Story, StoryPage, MusicChallenge, LocalizedText types

hooks/
├── use-music-challenge.ts  ← State machine for music interactions
├── use-breath-detector.ts  ← Mic-based blow detection
├── use-mic-permission.ts   ← Shared singleton mic permission
├── use-voice-recording.ts  ← Story narration recording
├── use-accessibility.ts    ← Text scaling, tablet detection
└── ...
```

## Content Sync Architecture

This is the most critical system in the app. It ensures clients get new stories without
re-downloading unchanged content.

### Sync Flow (BatchSyncService.performBatchSync)

```
1. VERSION CHECK (1 API call)
   VersionManager.checkVersions()
   → GET /api/stories/version
   → Compare local integers vs server integers
   → If server unreachable → use cached content (offline mode)
   → If local == server → skip sync entirely

2. DELTA SYNC (1 API call)
   POST /api/stories/delta
   → Send: {clientVersion, storyChecksums: {storyId: "sha256", ...}}
   → Receive: only stories with different checksums + list of deleted IDs
   → Handle deletions: remove from local cache

3. ASSET DISCOVERY
   Extract all image paths from changed stories (coverImage, backgroundImage)
   → Filter out already-cached assets (CacheManager.hasAsset)
   → Result: list of uncached asset paths

4. BATCH URL GENERATION (N API calls, 100 paths per batch)
   POST /api/assets/batch-urls
   → Send: {paths: ["stories/xyz/cover/cover.webp", ...]}
   → Receive: {urls: [{path, signedUrl, expiresAt}], failed: [...]}

5. PARALLEL DOWNLOAD (5 concurrent)
   Download images via signed URLs → save to local filesystem
   → CacheManager.downloadAndCacheAsset(signedUrl, path)

6. SAVE TO CACHE
   CacheManager.updateStories(deltaResult.stories)
   → Stories saved to AsyncStorage
   → Version updated locally
```

## Authentication Flow

```
App launch → check stored JWT in SecureStore
  ├─ Valid token → authenticated, proceed to main menu
  ├─ Expired token → POST /auth/refresh with refreshToken
  │   ├─ Success → new tokens, proceed
  │   └─ Failure → show login screen
  └─ No token → show onboarding → login screen (or guest mode)

Login options:
  ├─ Google Sign-In → Google SDK → idToken → POST /auth/google → JWT pair
  ├─ Apple Sign-In → Apple SDK → idToken → POST /auth/apple → JWT pair
  └─ Guest Mode → skip auth, limited features, no cloud sync
```

Tokens are stored in `expo-secure-store` (encrypted keychain on iOS, encrypted prefs on Android).
The `ApiClient` automatically attaches `Authorization: Bearer <token>` to all `/api/*` requests
and handles token refresh transparently.

### The login page's animals

The hero on the login card is a bear, a bunny and a fox reading under a dome of stars, and
they are alive (operator request 2026-09-22): each sways about its feet on its own beat and
breathes, and each has a beaming self to cross-fade into, the way the sun and moon on home
cross-fade between `home-sun.webp` and `home-sun-laughing.webp` (`components/auth/login-hero.tsx`).
The painting was one flat image, so `scripts/prepare-login-animals.py` cuts it into layers,
once, from `hero-animals.webp`: a random walk seeded by colour tells the six regions apart
(dome, each animal, book, mist; the bunny's ears are seeded on their lavender shell as well as
the pink inside, since with seeds only on the pink the walk gave the whole shell to the sky
and the ears peeled apart on every lean); each animal is cut two pixels outside its outline so
its layer carries its whole painted contour and nothing of the background, except that the
bunny also carries its glow (a ring fading out over 32 px, the stars in it left in the sky), since
its ears lean far over that glow and the glow's edge left behind read as a doubled ear (a ring of carried background
moved the dome's rim with the bear; a hole cut wider and filled from the glow drew a pale line
round every animal; a hole cut exactly to the outline left half the contour behind as a dark
hairline on every lean); the dome is filled where the animals were from the colours beyond
that contour, with a pyramid fill blurred well inside, so at rest the stack is the painting and
a lean shows only a soft shade of sky; and everything below the book's top edge, the glowing
spine included, belongs to the book, which is drawn in front of the animals. Sways are about a
degree (less for the bunny, whose ears are long levers). `hero-animals.json` records every
frame as fractions and `constants/login-hero-art.ts`, generated by the same script, is the
module the app requires the layers from.

The expressions are art, not drawing: the "after" state is a second painting of the same scene
with only the faces changed, `hero-animals-laughing.webp` (same 900x596 canvas, the animals
beaming with their eyes happily closed), which the script cuts with the very same masks and
frames into `hero-<animal>-laughing.webp`. In the app each animal's beaming self sits over its
resting self and its opacity follows `laughFace` (a smooth fade in, a hold, a smooth fade out,
`HERO_MOTION.laughMs` long) on that animal's own cues (`HERO_RHYTHM[animal].laughsAtMs`),
so nothing but the face changes and the change is a cross-fade, never a cut. Until the laughing
painting is supplied the script cuts the resting layers alone, the art module carries no
`laughing` entry and the animals only sway. Nothing is drawn over the painting any more: a
traced SVG mouth that widened, opening-mouth gestures, and blinking lids cut from the animal's
own fur were all built, verified and taken out on 2026-09-22 (operator's call after a
frame-by-frame review). All of it reads one clock (`HERO_LOOP_MS`, 120 s; every rhythm in
`HERO_RHYTHM` divides it, so the loop wraps without a jump), through pure worklets in
`constants/login-hero.ts` (`swayPose`, `laughFace`, `laughAmount`). The three never rock in
step and each starts laughing at a different moment. Under Reduce Motion the clock stays at
zero and the animals hold the painted pose.

## Orientation Strategy

- **Phones**: Locked to `PORTRAIT_UP` everywhere except the story reader
- **Tablets (≥768px short edge)**: All orientations allowed
- **Story reader**: Unlocks all orientations so stories can be read in landscape
- On exit from story reader, orientation re-locks to portrait (phones only)

`hooks/use-story-orientation.ts` owns this. `app/_layout.tsx` calls its
`applyDefaultOrientation()` helper for the app-launch and view-change defaults.

The hook's `lockLandscape()` / `lockPortrait()` resolve on the **emitted
`orientationChange` event** (with a 1500 ms fallback), not on a fixed `setTimeout`.
This matters: the Story Garden's book-opening bridge keeps one book rendered across
the rotation and counter-rotates it to stay upright, which is only believable if the
settle is frame-accurate rather than approximated.

### Journey page headers, and where the grown-ups door is

The grown-ups control lives only on the Profile page, as a gear with the word "Grown-ups" beside
it; the main menu has none (operator decision 2026-09-19). The journey pages' left control is a
house with the word "Home" (`common.home`, all fourteen locales). Both are `CircleActionButton`s
given a `label`, which makes them a pill the height of the round button.

Headers are laid out by `components/child-ui/balanced-header-row.tsx`: both side slots take the
width of the wider control, so the title stays in the middle of the screen whether the right
side holds a round speaker or a labelled pill. The title always keeps a third of the row -- the
sides are capped at what is left, a long label ("Dla dorosłych") shrinks to fit its side, and
`PageTitle` itself shrinks to 70% before it would clip.

The main menu's speaker is the same `CircleActionButton` (`home-sound-button`), hung from the
same line (`journeyHeaderTop` in `components/child-ui/tokens.ts`) at the same side margin
(`contentMargin`), so it does not jump when a journey page slides in. A long press still opens
the volume controls there.

### Full-screen overlays opened from a page cover the bar

The plans (`SubscriptionOverlay`) and the trial's end (`TrialEndUpgradeOverlay`) are rendered
inside whichever page opens them, so their zIndex only counts within that page -- and the journey
bar is drawn above every page. They call `useCoversJourneyBar(visible)`
(`components/child-ui/journey-bar-cover.tsx`); while any overlay covers, `JourneyBarOutlet` draws
nothing, so the bar is hidden behind them and cannot be tapped. That module must import nothing
but React: when the hook lived in `journey-bar-slot.tsx` the overlays closed an import loop, the
hook arrived undefined on device and the whole screen stopped taking taps. A test guards it.

### The library on a tablet held sideways

The featured book and Today's pick sit side by side across the top (`catalogueLayout` in
`constants/catalogue-columns.ts`), and every shelf below runs the full width from the left margin,
as upright. Previously the shelves were squeezed into a column beside the featured book.

### Grown-ups lies below the Profile page

Where every page rests while another shows is one function, `pageOffset` in
`constants/page-slide.ts`, which `EnhancedPageTransition` applies to every page. Grown-ups
(`account`) rests below: it rises into view from beneath while the library (`stories`) lifts away
above, and its back arrow sinks it again, returning to whichever page opened it
(`accountReturnPage`, recorded in `app/_layout.tsx` on every route in). A page that has to move
from one side of the screen to the other -- the library, lifted above, when Grown-ups closes onto
home -- jumps straight across (`crossesView`) instead of sweeping through the view.

Its sky (`components/account/settings-sky-backdrop.tsx`, `SETTINGS_SKY`) begins in `NIGHT_DEEP`,
the colour at the foot of every journey page, and falls to `NIGHT_VOID`, with home's star field and
gold stars. It is the same night at any hour.

At the top, exactly where home hangs its sun (`heroSunFrame`, shared with home), sleeps whichever of
the sun and moon is off duty on home (`sleepingBody`): the moon by day, the sun by night
(`components/account/sleeping-sky-face.tsx`). It sleeps in earnest (operator request 2026-09-21):
it breathes with a swell that is taller than it is wide, a small lift and a halo that brightens
on the in-breath (`breathPose`), rocks a degree or two to each side (`swayDeg`), its lids
flutter for a moment every few seconds, the second eye a beat behind the first
(`flutterSqueeze`), the shut lids, shallow rounded arcs rather than the pointed Vs they began as, scrunch a little deeper and lift with the cheeks on each in-breath
(`lidBreath`), and it snores a rising, wobbling, tilting "zzZ" (`zzzAt`). A tap wakes one eye:
the right lid opens (`lidsOpenness`), the iris glances left, then right, then up at whoever
tapped, blinks once, settles and the lid closes again (`gazeAt`, keyed in `WAKE`); the left eye
sleeps on, and snoring pauses while it looks. The open eye is a round white with the iris
clipped inside it, and it closes as a real eye does: an upper lid comes down from the top
(a clipping window over the eyeball) and the shut line fades in only over the last third of
the way (`shutLineOpacity`); the first version squashed the whole eye to a line about its
centre with the line fading over the top of it, and let the iris slide out past the white. The art is `home-sun-sleeping-mouthless.webp` / `home-moon-sleeping-mouthless.webp`: the
home faces with their painted eyes filled in, and the painted smile painted out too by
`scripts/prepare-sleeping-faces.py`, which records where it was in `sleeping-faces.json`. The
eyes and the mouth are drawn over the art (`SLEEPING_EYES`, `SLEEPING_MOUTH`) so the eye can
open and the smile can go flat, hinged at its corners, while the face peeks (`mouthDepth`;
operator request 2026-09-21).
The page is titled Settings (operator request 2026-09-21; `account.title` now carries each
locale's word for settings) and has no Screen Time, Edit Profile, language or login buttons: the
Screensafe ring on home opens Screen Time (`screen-time-glance.tsx`), the Profile page's edit
sheet edits the profile (`profile-edit-sheet.tsx`), the flag on home picks the language, and
signing in and out lives on the Profile page under the name (`ProfileSessionCard`: for a guest, one wide gold Login button and nothing else, operator's choice for simplicity -- the shared `GoldButton` in `components/child-ui/gold-button.tsx`, a lemon-to-gold face with a white top sheen and a soft gold halo, which the home's Start my free trial pill wears too; once signed in, a quiet "Signed in · Logout" line), driven by
`useSessionActions`, which both pages could share and which the layout answers by switching to
the login view.
For whoever needs to sign in (`needsSignIn` in `store/session.ts`: a guest, or a family whose
session the app could not refresh, which the API client reports down `services/session-lapse.ts`
into `sessionLapsed`, cleared when a login completes and never persisted), the profile slot in
the journey bar says where that is: every eighteen seconds
the child's face warps into a gold login glyph on a gold-tinted ring, holds three seconds and
warps back (`ProfileNavAvatar`, `constants/login-cue.ts`; under Reduce Motion it cross-fades
without the turn). The glyph is never smaller than the bar's other glyphs.
The home tour's profile step carries a legend of both states (`ProfileSlotLegend`, the real
slot held still on each with `hold`), the way the ring step shows the ring with time left and
time up, and its copy explains what the gold symbol means (operator request 2026-09-21). Its screen time switches stay on the page, and its walkthrough has no
avatar step. The walkthrough (`settings_walkthrough`) lights what the page holds, top to bottom:
text size, the screen time switch, smart reminders and crash reports, each through a ref the
page hands it, with the page's `useGuideScroller` lifting a low row clear of the bubble. It
names no developer option and no sign-in, which is the Profile tour's (operator request
2026-09-22).

Languages are chosen in one place, `components/ui/language-picker.tsx`, opened from Grown-ups'
Language strip and from the flag in home's top-left corner (`home-language-button`, a
`CircleActionButton` given the flag of the language in use by `languageFlag` in `services/i18n.ts`).
It covers the journey bar while open (`useCoversJourneyBar`). The flag and the speaker share one row,
at the journey pages' header line.

The page title sits under it, as home's welcome sits under the sun; `PageHeader` keeps its title
for the pages inside Grown-ups and, with none, lays no title block over the page. Its button row
lets touches through between the buttons.

### Journey pages scroll away behind the planet

The library (Stories, Search, Profile) and Progress hang the planet from the top and let their
content scroll up *behind* it rather than being cut off at an invisible line. Both use
`components/child-ui/planet-cover.tsx`:

- `usePlanetCover()` gives `coverHeight`: the lower of the page's header (measured by
  `onHeaderLayout`, estimated from `PLANET_HEADER_ESTIMATE` until then) and the planet's lowest
  point (`earthLayout(..., 'top').cap`). Content is padded down by `coverHeight + SPACE_3`, so at
  rest nothing sits under the globe. On a tablet the planet hangs ~115 pt below the title block;
  starting content under the header alone hid the search bar and the profile avatar behind the
  rim (operator request 2026-09-18).
- Inside each section the order is the `ScrollView` (absolute, `top: 0`), then `PlanetCover`
  (a sky veil plus a second `PlanetHeaderArtwork`), then the header with
  `pointerEvents="box-none"`/`"none"` so a drag that starts on the globe still scrolls.
- The veil is the sky itself (`headerSkyVeil`, colours sampled from `SKY_GRADIENT_WORLD`): solid
  over the upper part of the cover and clear at its lower edge. The night clouds are translucent,
  so without it text stays readable right up under the back button.
- The planet is drawn twice on purpose. The copy behind `SectionCrossfade` keeps the globe solid
  while sections fade; the copy in `PlanetCover` covers the content. `PinnedInSection` cancels
  the section's lift so the two never part.

### Full-bleed backgrounds must not be sized in JS

A background image sized from `useWindowDimensions()` is a React render behind the view's
own bounds. The container resizes with the window immediately; the image inside it keeps
the size it was given for the *old* orientation, and whatever is behind it shows through.
Measured on an iPad Pro 11 off a 30 fps capture: **165-400 ms of every rotation** showed a
flat panel where the art should be. (Proved by temporarily colouring that fill magenta and
rotating again -- the band went magenta.)

So, for anything drawn full-bleed:

- **Let the platform fit it.** `contentFit` / `resizeMode` with no width or height of its
  own -- `expo-image`'s `contentPosition` carries any anchor the crop needs (`'bottom'`, or
  `{ top: '42%', left: '50%' }` for a focal bias). It is resolved natively against whatever
  bounds the view has, so there is nothing to be stale, and it also means such a component
  needs no `viewport` prop even inside a quarter-turned container.
- **Put the art's own colours behind it.** Even the platform takes a frame or two to
  re-sample a picture, but a gradient is redrawn with the layer it is on. `MEADOW_GRADIENT`
  and `SCENE_BACKGROUND_TONES` are four stops sampled straight down each piece of artwork;
  a flat colour -- especially a brighter, more saturated one than anything in the art --
  is what reads as a hole.

This applies to `components/music/music-backdrop.tsx`, `components/ui/scene-background.tsx`,
the subscription and trial-end overlays, and the jigsaw scramble transition. Decorative art
that sits on a gradient (the auth sky's clouds) does not leave a hole and is sized at module
scope; it is wrong after a rotation rather than missing. The splash is the exception: it
lays out from `useWindowDimensions`, so it is right whichever way a tablet is held.

## Splash (launch animation)

`components/splash-screen.tsx` takes over from the native launch image, grows the logo, then
calls `setAppReady(true)`. `app/_layout.tsx` keeps it as an overlay above whichever view the
journey resolves to (onboarding, login, loading or the main menu), mounted in one place so the
view switch does not restart it.

- **The logo is cut, not redrawn.** `scripts/prepare-splash-logo.py` splits the flat
  `ui-elements/earlyroots-logo.png` into `assets/images/splash-logo/` (the book's two halves,
  roots, stem, three leaves, wordmark) plus `layout.json`, each layer's frame and leaf pivot as fractions
  of the canvas. Every output pixel is a source pixel and the script fails if the layers do
  not recompose to the source exactly. Re-run it if the logo art changes.
- **The shut book is drawn by a pen before it is shown.** The script also traces the
  outline of the shut book: the right page with the left cover lying mirrored over it (the
  art's symmetry makes them the same shape) plus a spine stroke of the art's own line
  weight, recorded in `layout.json` as `spine` and drawn by the app only while the book is
  shut. The centreline of that shape is skeletonised and traced into two pen strokes,
  `layout.json` -> `outline`: `cover` starts at the left end of the top edge (the art leaves
  a gap there for the stem), runs along the top, down the far edge, under the pages and up
  the spine to just across that gap; `page`, the inner page line, forks off the cover
  stroke where the far edge turns under (`forkAt` along the cover) and runs back to the
  spine. Every point is on the art. `AnimatedLogo` draws them as two SVG paths in the
  art's line weight (`strokeDashoffset` driven from one shared `drawn` value, so the page
  line runs at the pen's own speed from the fork; the dash gap is two caps longer than the
  line and the undrawn line is hidden a cap beyond its start, or round caps leave a dot at
  the start and the tip before the pen moves), then inks the book art in over the line
  (`ink`) before the book opens. The line stays solid while the art fades in over it and is
  dropped only once the art covers it: cross-fading two coincident white layers dips to
  three-quarter brightness half way, which read as the book going translucent.
- **Native hand-off.** The script writes `assets/images/splash-icon.png` as a clear canvas:
  the animation opens on an empty sky and draws the book onto it, so the launch image shows
  nothing but the sky. The native launch screen (`expo-splash-screen` in `app.config.js`,
  mirrored in `app.json`) sizes it at `NATIVE_SPLASH_IMAGE_WIDTH` on `NIGHT_DEEP`; on a
  tablet the logo starts at that size and eases up to its own. A test holds the config and
  the constant together. Changing either needs a native rebuild to be seen.
- **Choreography lives in `constants/splash-logo.ts`**, as pure, tested functions: the pen
  draws the shut book, the art is inked in, then the book opens like a real one seen from
  above: the spine stays put at the logo's centre (the shut book lies to its right) and the
  cover turns on it, its free edge arching up over the spine and down onto the left, the
  book sweeping out to full width. That is one affine map on the cover, `scaleX` of
  cos(turn) after a `skewY` of atan(`COVER_ARCH` x sin(turn)): the hinge never moves and
  every point lifts in proportion to its distance from the spine, highest edge-on. It is
  written as those two primitives, not a `matrix`: Reanimated's animated styles drop a
  `matrix` transform silently (only its CSS path handles one), and the skew goes before the
  scale so the shear stays finite when the scale passes through zero. Two earlier
  tries read wrong (operator, 2026-09-21): a flat `scaleX` flip with the book sliding to
  stay centred looked like the cover sliding out, and a front-on `perspective` `rotateY` kept
  the free edge on a flat path. No 3D transform is used.
  The spine stroke stays solid until the cover is edge-on over it and fades
  just after; fading it earlier shows a grey bar beside the moving cover. The roots start
  spreading down into the book the moment the cover passes edge-on over the spine (operator
  request 2026-09-21; `ROOTS.delayMs` is derived from the book's timing and `growEaseInverse`,
  so retiming the fold moves them with it). **They grow strand by strand** (operator request,
  same day): the script skeletonises the roots art into a tree of strands rooted at the
  trunk (`layout.json` -> `roots`, each strand with its `parent`), and the app draws each as
  a pen stroke off one shared clock. A strand starts only when its parent has reached the
  fork, siblings leave the fork at different times (the longest first, then
  `ROOT_BRANCH_STAGGER_MS` apart), the pen moves at one speed (`ROOT_PEN_MS_PER_CANVAS`) with
  a little ease-off towards each tip, and once the last tip is reached the roots art is inked
  in over the strokes the same way as the book. The stem rises out of the open book (a clipped
  reveal), each leaf opens
  about its neck at the moment `leafUnfurlDelayMs` says the stem tip reaches it (the inverse
  of `growEase`), then the wordmark and tagline arrive. The leaves sway afterwards. Helpers
  called from `useAnimatedStyle` carry the `'worklet'` directive.
- **It fades off the page the app opens on** (operator decision 2026-09-18). `setAppReady`
  fires `mountAllowanceMs` *before* the hold ends, the layout mounts the destination *under*
  the splash while the logo is still holding, and only then (`leaving`) does the whole splash, sky included, fade out over `handoffMs + exitMs`
  and report `onGone`. The fade starts two frames after the destination mounts: mounting the
  main menu stalls the screen for a few hundred ms in a dev build, and a fade counted from the
  mount spent most of itself inside the stall. `SplashSky` is still the home sky -- the same
  `HOME_THEMES` gradient, `StarField` and `EarthHorizon` -- so the main menu cross-fades from
  a sky that matches it. Never fade the splash before the destination has mounted: behind it
  is `RootLayout`'s white backing.
- **Reduce motion**: the finished logo fades in; no growth, sway, drift, motes or shooting
  star.
- **The finished logo holds for two seconds** (operator decision 2026-09-18).
  `SPLASH_TIMELINE.exitAtMs` is derived, not typed in: `logoCompleteMs` (the latest entrance
  to finish) plus `holdMs`. Retiming any entrance moves the exit with it: the outline
  stage (operator request 2026-09-21) pushed every later entrance back by a second, and the
  exit with them. The hold is
  what is seen, not just what is timed: readying the app only when the hold ended left the
  logo up for the hold *plus* the destination's mount (auth check and main menu, ~0.6 s in a
  dev build, measured 0.76 s late on device). So the app is readied `mountAllowanceMs` early
  and the fade waits for whichever is later -- the end of the hold or the page being ready;
  a page that is ready early never cuts the hold short. The allowance stays inside the hold,
  so nothing mounts behind an unfinished logo. A test caps
  splash-gone at 5.9 s (outline, hold, hand-off beat and fade) so the hold is the only thing that
  made it longer.

## Home (returning-user dashboard)

`components/home/` is what a family sees first. It is a personal story world, not a
launcher: a welcome chosen for the visit, the story to carry on with, how far the
family has come, what they achieved and what comes next. Every value is read from a
data model, never hard-coded, so an API can supply it later.

```
useChildHomeData()  →  ChildHomeData + WelcomeCopy + celebrateAchievement
  →  HomeScene: HomeHeroSky (halo · star and sparkle art · clouds · one shooting star · the sun) over the welcome
     · ContinueCard in a HeroCardFrame · JourneyCard (4 stat tiles) · AchievementCard (next badge, View achievements beside the stars) · Find a new story pill
     Sized to fit an iPhone 16 Pro without scrolling; the ScrollView only kicks in on shorter phones.
```

On a tall phone (portrait, 840 pt or more) the sun grows by two fifths and the greeting and
cards sit 24 pt lower, then are raised a twentieth of the screen (operator, 2026-09-21), net about
20 pt higher than the plain layout (`heroSunScale`, `heroContentDrop`; operator request 2026-09-21): the plain
layout left about 140 pt of empty sky between the plan button and the bar on an iPhone 16
Pro, and a phone-sized sun read as small over that much canvas. The stars keep their
phone size (`starBasis`), and a short phone keeps the plain layout, which it needs to fit.

The sub-pages' labelled Home and Grown-ups pills keep the same see-through `SURFACE_PRIMARY`
as the round speaker on home (a solid fill was tried and rejected, 2026-09-21). The language
picker (`components/ui/language-picker.tsx`, `LANGUAGE_PICKER`) is a deep-blue gradient panel
with a lit rim, a title and subtitle, a round close button, and glass rows with a chevron; the
language in use is a bright blue row with a glowing rim and a white check badge.

The greeting is set on an arc (`ArchedGreeting`, `constants/arched-greeting.ts`; operator
request 2026-09-21): SVG text on a path bowing up over the cards, the subtitle on a smaller
arc about the same centre, a blurred copy behind the title for its glow, the block read out
as one heading. The type went up to 34/18 and the block stands 24 pt clear of the first card.
SVG text goes through the same `RCTFont` as ordinary text, so it keeps the rounded face.
Text on a path is dropped past the path's ends, with no ellipsis, so the fit is measured, not
guessed: `textAdvance` sums per-letter advances taken from SF Pro Rounded at the two weights
(accents measured as their base letter, CJK at an em). A title that would shrink below
`wrapBelow` breaks onto a second arc a line lower about the same centre, preferring the break
after a comma, so the name gets a line of its own (`planGreetingTitle`); nothing is ever set
larger than its arc holds. The flat half-em it replaced cut the W off "Welcome back, wdwdsd!"
(2026-09-22). A test holds every locale's greeting, with a name at `MAX_NICKNAME_LENGTH` of the
widest letter, to two lines at no less than `minScale` on a 375 pt phone.
The language button's flag fills the whole button: `FlagArt` shows the real flag from
`country-flag-icons` (MIT; its square `1x1` SVGs, imported as components through the SVG
transformer) inside a circular clip just inside the rim. An emoji cannot do it: the glyph is
a bitmap that sits in the middle of its box and blurs when scaled. Latin, with no country,
keeps its emoji; the operator asked for real flags, not ones drawn here (2026-09-21).

The hero sky is layers, never one flattened picture. `buildHeroSky(width, sunFrame)` places
everything from the sun's own frame (offsets in sun-sizes for the near stars, fractions of the
width for the corners and clouds) so the same scene holds on a phone and a tablet. Layer order:
gradient sky and distant specks (`NightSky`) → warm halo (`HeroSkyBackground`) → hero star and
sparkle art (`HeroStarsLayer`) → clouds framing both edges and bridging into the card
(`HeroCloudLayer`) → shooting star (`HeroShootingStar`) → the sun (`HeroSunContainer`, the one
touchable thing, above the ScrollView). The art lives in `assets/images/home-sky/` as cut-outs
with real alpha; placement is data in `constants/home-sky.ts`, so re-arranging the sky is a
constants change.

The continue card is a `HeroCardFrame`: a blurred bloom outside the shape (SVG Gaussian blur),
a gradient stroke brightest at the top, a gradient fill darker toward the bottom, a top sheen,
four corner blooms, an inset highlight rim and a depth shadow. It measures its own height for
the bloom, reports press state so the `CardArrowButton` can dip and glow, and holds the
`CardProgressBar` (capsule track, mint-to-aqua fill with a sheen).

| Concern | Location |
|---------|----------|
| Data model (`ChildHomeData`, return-visit states) | `types/child-home.ts` |
| Welcome choice, streak liveness, star lighting, safety score, card layout, tints, motion | `constants/home-journey.ts` |
| Hero sky placement, motion budget, halo and card-frame tints | `constants/home-sky.ts` |
| Sky layers | `components/home/home-hero-sky.tsx` and the `hero-*.tsx` files beside it |
| Storybook-glass frame, progress bar, arrow button | `components/home/hero-card-frame.tsx`, `card-progress-bar.tsx`, `card-arrow-button.tsx` |
| Assembling the model from the store, badges and screen-time history | `components/home/use-child-home-data.ts` |
| Visit memory (`lastHomeVisitAt`, `achievementUnlockedAt`, `lastStoryCompletedAt`) | `store/app-store.ts` (persisted) |
| Glowing book / clock / shield / flame icons | `components/home/stat-icons.tsx` |
| Badge medallions; the newest one shines once when new | `components/home/achievement-card.tsx` |
| Destinations | `stories` (catalogue) and `progress` (catalogue opened at Progress via `sectionRequest`) |

Return-visit states, in priority order: new achievement → story completed → long absence
(7+ days) → active streak (2+ days) → first visit today → normal. Messages are always
encouraging; a lapsed streak is shown as an invitation to start one, never as a loss.

The Screensafe mark inside the ring (`ScreenTimeGuard`) is the shield-and-clock artwork
`screensafe-shield.png`, cut white-on-alpha from the operator's icon (2026-09-21) and tinted by the
ring to its state; it replaced a hand-drawn SVG of the same idea.

Motion budget: background stars twinkle, the hero stars and sparkles breathe (opacity 0.75–1,
scale to 1.04, 2.5–6 s each, never in step), clouds drift 2–6 px over 9–15 s, the shooting star
crosses once every 16 s, the sun floats 2 px over 4.5 s, the four stat icons each move in their
own way (a page flicks, the clock keeps time, the leaf sways, the flame flickers),
the cover gives an occasional sparkle, milestone stars light
in sequence on arrival, the newest medallion shines once when a badge is new. Cards compress
about 2.5% on touch, the continue arrow dips to 90% and brightens, and arrows nudge on tap.
Under Reduce Motion the sky keeps only faint opacity changes (`heroMotionMode` → `gentle`);
everything stops while the page is not the one showing.

## Story Garden (feature-flagged)

The child-facing catalogue and the book-opening ritual, gated by `useStoryGarden`
in the Zustand store (default `false`). `components/stories/simple-story-screen.tsx`
is the single mount point that switches between the legacy catalogue and the garden.

```
Portrait Story Garden  →  tap a book  →  focused book (Read Together / Listen to <name>)
  →  cover expands  →  book begins opening  →  landscape requested  →  book settles open
  →  landscape reader  →  final page  →  book closes  →  Read Again / Put It Back
```

| Concern | Location |
|---------|----------|
| Shelf definitions (4 places ← 9 categories) | `constants/story-places.ts` |
| Every duration, easing and ratio | `constants/story-garden-motion.ts` |
| Opening state machine | `hooks/use-book-opening.ts` |
| Reduced motion | `hooks/use-reduced-motion.ts` |
| Auto-hiding reader controls | `hooks/use-auto-hide-controls.ts` |
| One-hotspot-at-a-time rhythm | `hooks/use-interaction-rhythm.ts` |
| Reader mount seam | `requestGardenOpen` in `contexts/story-transition-context.tsx` |
| Book-opening choreography | `contexts/story-transition-context.tsx`; timings in `constants/story-opening.ts`, tested in `__tests__/constants/story-opening.test.ts` |
| Orientation policy | Phones portrait-locked and turned for a story; tablets never locked. `needsGuidedTurn`, `applyDefaultOrientation` |
| Reading progress (Continue Reading, bookmark) | `storyProgress` in `store/app-store.ts` |

The garden never calls `startTransition` / `selectModeAndBegin`. It runs its own
ritual and then calls `requestGardenOpen(story, mode, voiceOver)`, which `_layout`
observes to mount the reader. The legacy transition path is untouched.

Parent-facing exits (Parent corner, Record a Voice) go through
`useParentsOnlyChallenge` before leaving the child experience.


## State Management

**Zustand** (`store/app-store.ts`) with `persist` middleware backed by AsyncStorage.

Persisted state: onboarding status, auth state, user profile, screen time settings, text size,
notification preferences, crash reporting consent.

**Not persisted**: `isAppReady`, `hasHydrated`, loading states, navigation state.

The store hydrates on app launch. `hasHydrated` gates the UI to prevent rendering before
persisted state is loaded.

## Internationalization

14 languages supported: `en, pl, es, de, fr, it, pt, ja, ar, tr, nl, da, la, zh`.

- **App UI strings**: `locales/{lang}/index.ts` → loaded by i18next at startup
- **Story content**: `localizedTitle`, `localizedDescription`, per-page `localizedText` in story data
- **Fallback**: Always English (`en`) when a translation is missing
- **Language selection**: User picks in Settings → stored in AsyncStorage → `i18n.changeLanguage()`

Arabic (`ar`) is RTL but the app does not yet have full RTL layout support -text renders correctly
but layout remains LTR.

## Key Design Decisions

### 1. Bundled + CMS hybrid model
Core stories ship with the app binary for instant offline access. New stories are added via CMS
without requiring an app update. This gives the best of both worlds: guaranteed content on first
launch + live content updates.

### 2. Signed URLs instead of direct GCS access
Clients never access GCS directly. The gateway generates 1-hour signed URLs. This allows:
- Fine-grained access control (authenticated users only)
- Path validation (prevent directory traversal)
- Usage tracking and rate limiting
- No GCS credentials on the client

### 3. Delta-sync with checksums
The app sends its story checksums to the server. The server returns only stories with different
checksums. This minimizes data transfer -a typical sync with no changes is 2 API calls and
zero downloads.

### 4. Music assets are always local
Instrument images, note audio samples, and success songs are bundled with the app via `require()`.
This ensures zero-latency playback (critical for a musical instrument feel) and full offline support.
CMS only stores string IDs that reference local assets. See `MUSIC_FEATURE.md` for details.

### 5. Expo Managed Workflow
The app uses Expo's managed workflow (no bare native code modifications). Native builds are done
via EAS Build. This simplifies CI/CD and allows OTA updates via `expo-updates`.

### 6. Screen time enforcement
Parents can set daily screen time limits. The `ScreenTimeProvider` context tracks active usage
and, when a limit is near or reached, mounts `ScreenTimeOwlAlert` over the app: an owl perches
bottom-left and delivers the message in a run of four small speech bubbles (the warning, then one
real-world tip each) rather than a full-screen panel. Time tracking pauses when the app is
backgrounded.

In the parents' dashboard, the trend chart colours each day against that limit
(`constants/usage-trend-bars.ts`): a day that went past it is amber -- the same `#F59E0B` the rest
of the parents' area warns in -- and a day inside it stays teal. Bar heights alone only say how the
days compare with each other, so a fortnight of long days read exactly like a fortnight of short
ones. Amber rather than red on purpose: red belongs to the limit being spent now, which is the
home ring's job.

The owl (`components/screen-time/owl-sprite.tsx`) is a layered puppet, not a frame sequence. Five
cut-outs in `assets/images/screen-time/owl/` (body, head, closed eyes, open beak, raised wing) are
stacked on one canvas and driven by Reanimated shared values: the body breathes from the feet, the
head tilts and peeks about the neck, an eyelid window slides down over the closed-eye art, the beak
opens in syllables while a bubble is new, and the wing rises from behind the body for the greeting.
Geometry, timings and the pure motion curves live in `constants/owl-companion.ts`; the idle habits
(blink, glance, ruffle) are scheduled by `hooks/use-owl-rhythm.ts` and fall silent under reduced
motion. The alert waits for the owl's `arrive` phase to end before it shows the first bubble, and
on dismissal plays `delight` or `leave` before calling back to the provider.

The same owl is the app's tutorial. `components/owl-guide/owl-guide.tsx` mounts on each screen
that has something to explain (`<OwlGuide id="…" targets={refs} />`): it dims the screen, cuts a
spotlight around the step's target (measured from the refs the screen hands it), and puts the
step's copy in the speech bubble with a pointer aimed at the highlight. The owl always stands
on its rock in the bottom-left corner (`components/screen-time/owl-perch.tsx`: a painted ledge,
the night clouds, and the owl, sliding in from the left edge and out again), raising its wing
toward the highlight. The bubble rests above the owl, or beside it in landscape; when a
highlight sits where the bubble or the perch would cover it, `placeGuideBubble` in
`constants/owl-guide.ts` lifts the bubble into a callout above or below the highlight instead. The step tables, placement planner and spotlight geometry live in
`constants/owl-guide.ts` (reusing the existing `tutorial.*` strings in all fourteen locales);
which guides have been seen is persisted by `contexts/owl-guide-context.tsx` under the old
`@tutorial_state` key, migrating the previous shape on load. A guide that has been seen can be
replayed from a screen's own menu with `replay`, which does not mark it again.

The bar is glass, like the round header buttons (proof of concept, operator request
2026-09-22): a `BlurView` and a top-lit sheen over a light blue tint in place of the solid
`SURFACE_NAV`. The Screensafe ring in it draws at full strength (`arcOpacity`) in the same
colour as the glyphs beside it, white when it is the place chosen; at the home scene's own
0.55 on top of the glyphs' dimmer white it read as switched off.

The bottom bar is explained once, on the home page, where it is first seen: `main_menu_tour`
walks the two cards, then the bar left to right (Learn, Progress, Screensafe, Search, Profile), and
only then the sound button (operator decision 2026-09-18). The library's
`catalogue_tour` stays on the shelf. Bar steps carry `revealsBar`, which makes the owl step back
to `PERCH_STEP_BACK` for the whole step -- it stands on the bar's left end, and without the flag
it only stepped back when the lit button happened to be under it. A step whose target key is
handed to a tour is kept even if nothing on screen carries that ref: the home page used to list
a `learning_button` it never rendered, and the tour showed a Learning bubble pointing at nothing.
Every owl bubble -- the tours and the screen-time owl alike -- offers the word Skip
(`tutorial.buttons.skip`, in every language) where it used to have a cross: `OwlSpeechBubble`'s
`closeAsWord` (operator decision 2026-09-19). The title is padded by the
word's measured width, so a long translation ("Überspringen", "Praeterire") never runs under it.

A guide on an app page does not draw inside its page: pages sit under the shared journey bar
(`JourneyBarOutlet`, zIndex 1500), which would cover the owl and the spotlight on its own
buttons. `useGuideOnTop` (`components/owl-guide/owl-guide-layer.tsx`) hands the guide to
`OwlGuideLayer`, mounted just above the bar in `app/_layout.tsx`; without a layer (screen
tests, the story reader) it draws in place. Pages are mounted before they are shown, so each
is wrapped by `guidePages` and a guide on a page that is not on screen draws nothing -- in the
layer it would otherwise cover whatever page is showing. The screen-time owl alert sits at
zIndex 3000 for the same reason: Fabric flattens the wrappers between, so it competes with the
bar and the story reader directly. So does the story overlay in
`contexts/story-transition-context.tsx` (the book lifting off the shelf and the story sheet):
it is drawn at `STORY_OVERLAY_LAYER_Z` (`constants/story-overlay-layer.ts`), above the bar and
the guide layer and below the paywall (2500) and the grown-ups check (3000). At its old 1000
the bar painted over the sheet and hid its Record button. The bar stays mounted beneath the
sheet, as it always has; it is covered, not removed. Anything new drawn from a root provider
competes in this same stack -- give it a named layer and a test against
`JOURNEY_BAR_LAYER_Z`.

The bar lights the section it is on and nothing elsewhere: the main menu passes
`selected={null}`, the highlight fades out, and it comes back up on the section chosen rather
than sliding in from the last one. "Learn" on the main menu opens the library's home section.

## Testing

```bash
cd grow-with-freya

npm run test          # Run all tests
npm run test:ci       # Run with coverage + CI reporters
npm run lint          # ESLint
npx tsc --noEmit      # Type checking
```

Test files live in `__tests__/` mirroring the source structure. Jest is configured with
extensive mocks for React Native modules (`__mocks__/`).

## Related Documentation

| Document | Scope |
|----------|-------|
| `MUSIC_FEATURE.md` | Music challenge architecture, instruments, state machine, CMS config |
| `SONGS_README.md` | Song library, categories, instrument compatibility, AI guidelines |
| `scripts/README.md` | CMS pipeline, upload scripts, Firestore schema |
| `.github/workflows/README.md` | All CI/CD pipelines |
| `gateway-service/README.md` | Backend API reference |
| `func-tests/README.md` | Functional test suite |
## Production storybook presentation

Landscape stories place narration in a bounded panel on the right, over the quiet
scenery reserved by the authoring specification. `components/stories/narration-layout.ts`
keeps this panel clear of the left action area and bottom navigation. Portrait tablets
retain the existing bottom narration layout. Narration and language comparison remain
scrollable, including at larger accessibility text sizes.

Reveal elements (`type: reveal`), including cropped patches and legacy full-canvas
overlays, use fixed scene geometry. Their opacity animates, but their geometry does not scale;
this keeps delivered before/after patches aligned to the background throughout the
transition. Other interaction types retain their existing animation. Reader prop
keys include story and page identity so identical prop IDs on successive pages reset.

This change needs the generator's protected, lossless WebP overlays. It does not make
unprotected generated after-scenes safe or certify artwork quality. No API or CMS
metadata contract changes are needed.
