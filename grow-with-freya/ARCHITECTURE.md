---
title: "Frontend Architecture — Grow with Freya"
type: architecture
status: living
owner: CoLearn
tags: [architecture, frontend, mobile, react-native, expo]
updated: 2026-10-02
---


# Frontend Architecture -Grow with Freya

> **For LLMs / AI agents**: This README is the authoritative reference for the frontend app architecture.
> Read this file before modifying services, data flow, or navigation. If you change architecture, **update this file**.

## Overview

**Grow with Freya** is a React Native app built with Expo (SDK 57) for iOS and Android.
It is an interactive children's storybook app with localized content, music challenges,
voice recording, and parental controls. The app is written in TypeScript using Expo Router
for navigation and Zustand for state management.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Expo (Managed Workflow) | SDK 57 |
| Language | TypeScript | 6.0 |
| Runtime | React Native | 0.86 |
| Navigation | Expo Router | 57 |
| State | Zustand + AsyncStorage | 5.0 |
| Animations | React Native Reanimated | 4.5 |
| Auth | Google Sign-In + Apple Auth | -|
| Analytics | Sentry | 7.11 |
| i18n | i18next + react-i18next | 24 / 15 |
| Audio | expo-audio | 57 |
| Images | expo-image | 57 |
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
   VersionManager.checkVersions() → GET /api/stories/version
   → If server unreachable → use cached content (offline mode)

2. DELTA SYNC (1 API call, on every launch)
   POST /api/stories/delta
   → Send: {clientVersion, storyChecksums, achievementChecksums}
   → Receive: changed stories (only when behind), deleted ids, the catalogue with fresh
     signed thumbnails, and changed badge definitions + removed badge ids
   → Bundled stories that changed are saved to the cache; CMS-only stories stay in the
     catalogue (CatalogService) until the family downloads one
   → Badge definitions go to AchievementDefinitionsService (art fetched once)

3. ON-DEMAND DOWNLOAD (StoryDownloadService.downloadStory)
   GET /api/stories/{id}/download → the full story
   → POST /api/assets/batch-urls for uncached images → download 5 at a time
   → Deleting a story sends DELETE /api/stories/{id}/download so it no longer counts
     against the plan's limit
```

Story checksums are one canonical-JSON SHA-256 shared by the upload script, `cms-manager` and
the gateway (`scripts/lib/story-checksum.js`, `StoryChecksums.java`), held to
`contract-fixtures/story-checksums.json`.

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
breathes (`components/auth/login-hero.tsx`). The painting was one flat image, so
`scripts/prepare-login-animals.py` cuts it into layers, once, from `hero-animals.webp`: a random
walk seeded by colour tells the six regions apart (dome, each animal, book, mist; the bunny's
ears are seeded on their lavender shell as well as the pink inside, since with seeds only on the
pink the walk gave the whole shell to the sky and the ears peeled apart on every lean); each
animal is cut two pixels outside its outline so its layer carries its whole painted contour and
nothing of the background, except that the bunny also carries its glow (a ring fading out over
32 px, the stars in it left in the sky), since its ears lean far over that glow and the glow's
edge left behind read as a doubled ear (a ring of carried background on every animal moved the
dome's rim with the bear; a hole cut wider and filled from the glow drew a pale line round
every animal; a hole cut exactly to the outline left half the contour behind as a dark hairline
on every lean); the dome is filled where the animals were from the colours beyond that contour,
with a pyramid fill blurred well inside, so at rest the stack is the painting and a lean shows
only a soft shade of sky; and everything below the book's top edge, the glowing spine included,
belongs to the book, which is drawn in front of the animals. Sways are about a degree (less for
the bunny, whose ears are long levers). `hero-animals.json` records every frame as fractions and
`constants/login-hero-art.ts`, generated by the same script, is the module the app requires the
layers from.

Nothing is drawn over the painting and the faces never change. A traced SVG mouth that widened,
opening-mouth gestures, blinking lids cut from the animal's own fur, and a slot for a second
"beaming" painting to cross-fade into were all built and taken out on 2026-09-22 (operator's
call). The sway reads one clock (`HERO_LOOP_MS`, 120 s; every rhythm in `HERO_RHYTHM` divides it,
so the loop wraps without a jump) through a pure worklet, `swayPose` in
`constants/login-hero.ts`. The three never rock in step. Under Reduce Motion the clock stays at
zero and the animals hold the painted pose.

## The family's data, synced (Phase 8 C)

`services/child-sync-service.ts` keeps one **child document** per child on the gateway
(`/api/children/{childId}`): alias, avatar, age bucket, language, text size, favourites, per-story
progress, finished books, challenge counts, earned badges, screen-time and reminder settings.

- **When.** On launch after sign-in, and 2 s after any synced field changes
  (`startAutoSync`, debounced). Guests never sync.
- **Merge** (`services/child-document.ts`), using the last document both sides agreed on (the
  *base*): lists that only grow (finished books, badges) are united; counts take the larger;
  everything else is last-writer-wins against the base. With no base (a new phone), the account
  wins and favourites are united. A value absent on the phone never erases the account's.
- **Conflicts.** The `PUT` carries the version last read; `409 GTW-414` returns the current
  document, which is merged and written again (up to 3 attempts).
- **No times leave the phone.** Progress is outcomes; `achievementUnlockedAt` and screen-time
  history stay local.
- **Consent.** The parent's consent is recorded once per policy version (`POST /api/consents`).

## Badges (Phase 8 D)

Badges are data (`components/progress/achievements.ts`). Sixteen definitions are bundled with
the app; CMS definitions arrive through delta sync and replace a bundled one of the same id when
their `version` is at least as high. `evaluateAchievements` judges them from **facts** in the
store — `finishedStoryIds` (finished, not merely opened), `challengeCounts` per kind, and
`earnedAchievementIds` — and never takes an earned badge away. The reader reports challenges and
finishes through `useAchievementEvents`, which also grants any `awards` the book names. The
authoring side is in `scripts/cms-achievements/` (see `ACHIEVEMENTS-PLAN.md` §6.2).

## Subscriptions and the gateway (Phase 8 E)

RevenueCat stays the source of the tier on the phone. After sign-in the app logs RevenueCat in
with the gateway account id (`subscription-service.ts` `identifyAccount`), so the gateway can look
the family up by that id. The gateway keeps its own snapshot of the subscription and checks paid
downloads against it, asking RevenueCat only at lifecycle boundaries (PHASE-8 §7).

The app keeps that snapshot current: after a purchase, restore or a tier change RevenueCat reports,
it calls `refreshServerEntitlement()` (`services/entitlement-refresh.ts`) without waiting for it.
When the gateway refuses a download (`GTW-416`, `GTW-417`) that the phone believes is paid for,
`StoryDownloadService` refreshes and retries once before reporting the refusal like the app's own
access check. The app never sends its tier as proof; the gateway asks RevenueCat.

## Voice recordings stay on the phone

Choosing **Record** asks the parents-only question first (`MODE_OPTIONS` `grownUpsOnly`), so
recordings are made by grown-ups. They live in the app's documents folder and are never sent to
the gateway. On Android, Auto Backup is switched off (`android.allowBackup: false` in
`app.config.js`, held by `__tests__/config/android-backup.test.ts`), so they never leave the
phone there either; on iOS the device's own iCloud backup still includes them. Syncing them was
built and then dropped by the operator on 2026-09-24 (PHASE-8 §8).

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

### The grown-ups gate draws its own keypad on a tablet

The maths challenge in `components/ui/parents-only-modal.tsx` asks iOS for a number pad. On a
phone that keyboard docks at the foot of the screen and the card rides up above it; on an iPad
it floats over the middle of the screen, on top of the card and the very board it is meant to
write on (operator, 2026-09-22). So on a tablet (`useAccessibility().isTablet`, not phone
landscape) the maths gate keeps the system keyboard away (`showSoftInputOnFocus` off, the
field not editable) and draws a three-by-four keypad of its own under the chalkboard
(`KEYPAD_ROWS`, digits in the chalk hand, a backspace key named `common.delete` for the
screen reader), capped at `ANSWER_MAX_DIGITS`. The animal challenge still needs letters and
keeps the real keyboard everywhere.

`GoldButton` keeps its word in the middle of the pill: the glyph hangs off the word's edge in
an absolute box, taking no room in the row, and the face pads both sides alike (operator,
2026-09-22: with the glyph in the row the word sat half a glyph off centre). The glyph is
dropped by `GOLD_BUTTON.iconDrop` (2 pt): an icon box is centred on its drawing while a text
box carries descender room below the baseline, so without the drop it rode above the word.

Grown-ups carries the journey bar like every other journey page (operator, 2026-09-22: it hid
there). Profile stays lit, since Grown-ups lies below the Profile page; the other items are
pages the main menu can send to (`destinationForSection`, the inverse of
`catalogueSectionFor`, through `AccountScreen`'s `onNavigate`); Screensafe scrolls to this
page's own screen-time card. The bar leaves with the terms and privacy sub-pages.

### Sliding into Grown-ups without a stutter

Three things made the slide from Profile into Grown-ups judder (operator, 2026-09-22), each
measured frame by frame on the iPad:

- **The gate's keyboard.** The animal challenge types into the system keyboard, and the page
  slide started while it was still sliding away, so the two shared every frame and the page
  moved on every second one. `afterKeyboardGone` in `hooks/use-parents-only-challenge.ts` closes
  the gate at once but opens the door only when the keyboard's announced hide animation ends
  (`keyboardWillHide` plus its duration; on the iPad `keyboardDidHide` never arrived, and waiting
  for it left the page standing still for a quarter of a second), with `KEYBOARD_GONE_WAIT_MS`
  as a backstop.
- **Grown-ups built from cold.** It is now kept mounted off screen with the library
  (`PREWARMED_PAGES` in `constants/page-transition.ts`).
- **Any page built in the same commit as its slide.** Its native views were created during the
  slide's first frames. `EnhancedPageTransition` now waits `COLD_PAGE_FRAMES` (2) before sliding
  onto a page that was not already mounted; a mounted page slides at once.

Every slide still shows at most one long frame in the slow tail of the ease-out on the
simulator, with the JS thread idle; it was not reproducible to a cause and is not visible as
a stutter.

### Versions: 1.<minor>.<patch>

`package.json` holds the one version. `app.config.js` reads it, so every EAS build and the
`appVersion` runtime policy for over-the-air updates follow it: an update only ever reaches
binaries of its own version. A release with new features runs `npm run version:minor`; a release
of fixes runs `npm run version:patch`; there is no script for the major, and
`__tests__/constants/app-version.test.ts` fails on anything that is not `1.<minor>.<patch>`, or on
a config that no longer takes its version from `package.json`. Store build numbers are EAS's
(`appVersionSource: remote`, `autoIncrement` on production), never edited by hand. Any change that
touches native code or native assets (the launch image, a new native module) needs at least a
patch bump, or an update would reach binaries built without it. Grown-ups shows the version with
the store build beside it, as the App Store lists it (`DeviceInfoService.getVersionLabel`, for
example "Version 1.2.0 (42)"). There is no `app.json`: it was never read while `app.config.js`
exported an object (the resolved config is identical without it), so it only carried a stale
version and build number, and was removed with the hook that copied the version into it.

### No line between two sliding pages

Two pages meeting mid-slide once showed a thin pale line where they met. It came from two causes,
found frame by frame on the iPad and the iPhone:

- **Fractional positions.** Each page sat wherever the ease-out put it, often part way into a
  device pixel, so the edge rows were only partly painted and whatever lay behind showed through.
  `EnhancedPageTransition` now rounds every page's `translateY` to the device pixel
  (`snapToPixel` in `constants/page-slide.ts`, at `PixelRatio.get()`).
- **What lay behind.** The slider stood on a teal gradient that no page uses. It now stands on
  `NIGHT_VOID` (`page-transition-backdrop`), the colour at the foot of every page.

Even rounded, two pages still landed a device pixel apart on a few frames of a slide. Each page
therefore reaches one device pixel below its own box (`bottom: -1 / PixelRatio.get()`), so the
page above always covers the pixel where the next one begins. After the fix, recordings of the
main menu to the library, Profile and Grown-ups had no line in any frame (iPad: 6 slides, 270
moving frames; iPhone: 5 slides, 347 frames).

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
signing in lives on the Profile page under the name (`ProfileSessionCard`: for a guest, one wide gold Login button and nothing else, operator's choice for simplicity -- the shared `GoldButton` in `components/child-ui/gold-button.tsx`, a lemon-to-gold face with a white top sheen and a soft gold halo, which the home's Start my free trial pill wears too; once signed in, a quiet "Signed in" line). Both are grown-up actions, so both sit behind the parents-only question (operator, 2026-09-22): the Login button asks it before the login page comes up, since signing in leaves the app for Google or Apple, and Log out lives on Grown-ups (`account-logout`, shown only when signed in), which asks it at the door. Sign-in reached during first-time setup is not gated; a parent is doing the setup. Both are driven by
`useSessionActions`, which the layout answers by switching to the login view.
For whoever needs to sign in (`needsSignIn` in `store/session.ts`: a guest, or a family whose
session the app could not refresh, which the API client reports down `services/session-lapse.ts`
into `sessionLapsed`, cleared by `markSignedIn` on every sign-in path and never persisted; only a
refresh the server refuses, or a missing refresh token, counts as a lapse, never being offline or
a refresh that timed out), the profile slot in
the journey bar says where that is: every eighteen seconds
the child's face eases into a gold login glyph on a gold-tinted ring over 1.2 s with a small
30° tip, holds three seconds and eases back (`ProfileNavAvatar`, `constants/login-cue.ts`; under
Reduce Motion it cross-fades without the tip). It was a 450 ms quarter-turn with a quarter
shrink until the operator found it too fast and over-stimulating (2026-09-22). The glyph is never smaller than the bar's other glyphs.
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

### The app shell: one main menu, with sign-in floated above it

`app/_layout.tsx` mounts the app tree (the journey bar, the page slider with the main menu and
every page, the story reader) as soon as the journey reaches login, and never mounts it again
(`appTreeMounted` in `constants/app-shell.ts`). The login screen and the startup loading
screen float above it in one overlay (`authOverlayUp`, `AUTH_OVERLAY_Z`), the way the splash
floats above everything, and leave when the view becomes `app`. So the main menu a child sees
revealed -- by the guest card sliding up, the login fading for a returning subscriber, or the
loading screen lifting after the first sync -- is the one they go on to use, already settled,
its data loaded and its images decoded. The menu's owl tour waits until nothing covers it
(`disableTutorial={!menuRevealed(view)}`).

Sign-in opened from a page (the Profile page's Login button, once the parents-only question is
answered, `useSessionActions().login`) slides
up over that page at the pace pages slide (`AuthOverlay`, `authEntrance`) and hands the child back
to it when they sign in or carry on as a guest (`pageAfterAuth`); reached at launch it fades in
and leads to the main menu. The Login button no longer switches guest mode off at the tap (it
swapped itself for the signed-in line before the login page had covered it); the login screen
marks the family signed in itself (`markSignedIn`, which also clears a lapsed session). The journey check in `_layout` re-runs whenever the sign-in flag
changes, and it only puts the child on the main menu when the app is opening
(`landsOnMainMenu`): once the app was up it carried a guest back from Profile to the main menu
(operator, 2026-09-22). On a tablet the Login button stops at `PROFILE_CTA_MAX_WIDTH` (300 pt)
rather than spanning the column.

Only one owl tour runs at a time, so a page's tours run only while that page is on show and
nothing covers it: the catalogue takes `isActive` (`currentPage === 'stories'` and
`menuRevealed`), and so does Grown-ups. The catalogue is warmed off screen and mounted under the
login page, and its shelf tour, started there, held the owl, so after a reset the main menu's
tour never came (operator report 2026-09-22).

The home greeting's arcs are keyed by their paths (`components/home/arched-greeting.tsx`):
react-native-svg keeps text on the arc it was first laid along, so when a two-line title gave
way to a one-line one the subtitle stayed an arc too low and all but the tops of its middle
letters fell below the greeting's box (operator report 2026-09-22, "something wrong with the
streak text"). Its width table is measured at Bold, not Medium: on iOS react-native-svg lays
weight 500 out as wide as Bold, and long subtitles judged to fit lost their first and last
letters off the arc. Three lines measured on the iPhone hold the table to the device.

Reset App on Grown-ups leaves the device as a fresh install leaves it (`resetApp` in
`services/app-reset.ts`, operator report 2026-09-22: it had kept the Grown-ups page and the
family's state on screen). It signs out, drops the downloaded stories, cancels every scheduled
reminder, clears all saved data, returns to the device's language and puts the store back to its
first-launch values (`resetToFreshInstall`), app not yet ready. The layout answers "not ready" by
going back to the splash with the page slider on the main menu and the splash mounted afresh
(it is one-shot on launch, so without that the screen stayed blank), and the splash then leads
into onboarding. Each step is tried on its own, so a failing one leaves the rest done. Signing
out clears the tokens on the device before it asks the server to revoke them, and does not wait
for the answer, so a slow revoke can never wipe a newer sign-in.

Before this (operator report 2026-09-22, "the screen appears then flickers before it seems to
load"), the login and app views were mutually exclusive branches of one render function, and
the login screen mounted a main menu of its own to reveal; the moment the view switched, that
menu was destroyed and a fresh one mounted in the same commit. On device that was one dark
frame 0.8 s after the reveal with the sun, both card thumbnails and the badge blank, then the
ambient motion, milestone stars and greeting settling all over again. The half-second timers
meant to overlap the two were reading flags inside the branch that had already gone. The root
view behind everything is now the night navy (`ROOT_BACKGROUND`) rather than white, so an
unpainted frame anywhere is dark, not a flash.

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
  nothing but the sky. The native launch screen (`expo-splash-screen` in `app.config.js`)
  sizes it at `NATIVE_SPLASH_IMAGE_WIDTH` on `NIGHT_DEEP`; on a
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

Since 2026-10-02 (operator requests): the achievement card is labelled **Your Learning Journey**
(`home.milestone.eyebrow`, and the tour names it the same), its link reads **Explore**, and
pressing it sets off for the island (next section) instead of opening the badges, which stay on
the Progress item in the bar. The row under the cards has a third part beside the streak and the
week's reading: `AchievementTallyChip`, "N unlocked, M to go", counted from the badges
(`achievementTally` in `use-child-home-data.ts`; no chip when there are no badges). On a tablet
the three sit on one line; on a phone three will not fit, so the tally takes a second line
tucked up under the first (`STATS_LINE_TUCK`).

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
The block is as tall as its words reach, not as its arcs: each line is told how wide its words
are, and the box ends where the lowest word ends on its arc (`archedGreetingLayout`'s `words`).
The arc spans the screen but the words sit in its middle; on a portrait iPad, with the full-width
arc and 1.3x type, the arc's ends droop about a hundred points below the apex, and a box sized to
them left that much empty sky between the subtitle and the first card, which read as the page
sitting off centre (operator, 2026-09-22). A phone's arc barely droops, so it moved a few points.
On a portrait tablet the whole block, greeting to trial button, then sits a twentieth of the
screen higher (`heroContentLift`, `PORTRAIT_TABLET_CONTENT_LIFT`; operator, 2026-09-22). The block
is centred between the sun and the bar, so the lift comes off the space above it and goes onto
the space below; taken off the top alone, centring would have moved it only half as far.
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
| Destinations | `stories` (catalogue) and `progress` (catalogue opened at Progress via `sectionRequest`), both from the bar; the island, from the Your Learning Journey card |

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

## The island (from the Your Learning Journey card)

Built 2026-10-02 at the operator's request. Pressing the card does not slide to a page: the
home's parts slide out of view, the sky dives at the earth, cloud closes over the screen, and
it opens on an island seen from the air, with the same sun or moon as the home screen a good
deal bigger on its horizon. The island's header is the one the other pages have (operator,
2026-10-02): the labelled Home pill on the left, which plays the trip back the other way, and
the speaker on the right, which turns the sound off and on. The island holds nothing else yet;
what goes on it is a later decision.

```
AchievementCard press → voyage.depart()
  home → leaving → crossing → arriving → island → returning → recrossing → landing → home
         (main page)   (island page, under cloud)          (island page)   (main page, under cloud)
```

| Concern | Location |
|---------|----------|
| Phases, which page each shows, timings (full and reduced), and every curve as a pure worklet | `constants/island-voyage.ts` |
| The state machine: three shared values (`travel`, `clouds`, `arrival`), timers, the page change | `contexts/island-voyage-context.tsx` (`useIslandVoyageController` in `app/_layout.tsx`, handed down by `IslandVoyageProvider`) |
| The cloud, and the touch guard while travelling (above the bar, zIndex 1600) | `components/island/voyage-layer.tsx` |
| The home's parts leaving, and the sky's dive | `components/home/voyage-row.tsx` (`VoyageRow`, `useVoyageZoom`), used by `home-scene.tsx` and `home-hero-sky.tsx` |
| The bar sinking | `JourneyBarOutlet` reads the voyage and translates the bar by `barSink` |
| The island screen | `components/island/island-scene.tsx` |
| Where the picture, the horizon band and the sun sit on any screen | `constants/island-scene.ts` (`islandLayout`) |
| The painting, the layers cut from it, and the numbers they are laid out from | `assets/images/island/`, `constants/island-art.ts` (generated), `scripts/prepare-island-art.py` |

How it holds together:

- **Three numbers drive everything.** `travel` (0 home at rest, 1 home gone) moves the rows, the
  bar and the zoom; `clouds` (0 clear, 1 covered, 2 clear again on the far side) drives the cover,
  so the cloud always travels towards the eye, in and out; `arrival` (0 to 1) settles the island
  and raises the sun. The controller runs them in time and changes phase on JS timers of the
  same length.
- **The page changes only under full cloud**, and at once: `island` is in `INSTANT_PAGES`, so
  `EnhancedPageTransition` places it without a slide. The island is mounted half a second into
  the leaving (`PREWARMED_FOR_THE_ISLAND`) and says when its picture has loaded; the cloud waits
  for that, for at most `crossingMaxMs`.
- **The zoom is about the foot of the screen**, which is where the earth's centre is
  (`constants/earth.ts`), far enough to bring the globe past the far corners (`voyageMaxZoom`).
  The sun is zoomed in a layer of its own so it stays above the scroll view and can still be
  touched.
- **The sun stands behind the horizon.** Three layers: the picture, the sun, then the band of the
  picture round the horizon with the sky cut out of it, so the foot of the disc is hidden by the
  mountains, the trees and the low cloud. `islandLayout` makes the sun as big as it can be with
  the whole face (the top 76% of the art) above the tallest thing in front of it and its top
  clear of the status bar. The sun is clipped at the foot of the band, and rises from below it.
  The cloud on the horizon is fuller in the band than in the picture: as painted it was two
  banks with sky between, and the foot of the moon showed through in patches (operator,
  2026-10-02), so `prepare-island-art.py` sets copies of the picture's own cloud behind the
  painted cloud (`CLOUD_FILLS`) until nothing of the disc shows below the cloud tops. To move
  or add a copy, change that list and run the script; the picture itself is never edited.
- **Night** is the same picture under a navy tint, with the band tinted by the same amount in
  its own shape (`tintColor`), so the moon between them is not dimmed.
- **Reduce Motion**: nothing slides or zooms; the screen fades through plain fog and back
  (`VOYAGE_TIMING.reduced`, no cloud shapes).
- **Leaving by another road** (a sign-out, a deep link) while on the island: `_layout` tells the
  voyage the island is no longer showing (`settleHome`) so the home is not left zoomed.
- A new page must be in `PageKey`, in `EnhancedPageTransition`'s map of shared values, and in the
  pages handed to it, or it never mounts.

### The island alive

Since 2026-10-02 (operator request) the island moves: the trees sway, the clouds drift, the
water ripples and gulls fly across. The painting is still one file the operator supplied and is
never edited; `scripts/prepare-island-art.py` takes it apart into layers, and the app draws the
layers and moves them.

```
back  island-base      the painting with everything that moves painted out
      island-water-1…3 wave marks, cross-faded in turn
      waterfalls       streaks running down each fall and ripples spreading in its
                       pool, behind covers cut to their shape; spray at the foot
      low trees        each on its own, leaning about its foot
      far clouds       high left and right, drifting; corner cloud, swelling
      (night tint)
      the sun or moon
      horizon cloud    drifting, in front of the sun
      island-land      the horizon band, sky and cloud and water cut out
      horizon trees
front gulls by day     drawn in code
      lights by night  lit windows, lamps by the houses and on the bridge, and the
                       lighthouse: glow, twin beams, a pulse of light
```

| Concern | Location |
|---------|----------|
| Every curve (sway, drift, swell, ripple, flight, wingbeat), as pure worklets, and the gulls' courses | `constants/island-life.ts` |
| Seven clocks, each turning 0→1 for ever; stopped and reset when the island is not showing | `hooks/use-island-clocks.ts` |
| The pieces | `components/island/island-clouds.tsx`, `island-trees.tsx`, `island-water.tsx`, `island-falls.tsx`, `island-gulls.tsx`, `island-lights.tsx`, `moonlit-image.tsx` |
| Which pieces exist and where each sits in the painting | `constants/island-art.ts` (generated: `farClouds`, `nearClouds`, `billows`, `lowTrees`, `horizonTrees`, `water`, `falls`, `litWindows`, `villageLamps`, `lighthouse`) |

- **Everything is a function of a clock**, so nothing accumulates: a tree's lean is
  `treeSway(wind, index, sway)`, a cloud's place `cloudDrift(tide, …)`. All of it runs on the UI
  thread; no state changes while the island is alive.
- **A cloud only drifts away from where it was painted and back**, and each is carried on a
  little way under the land in its own colour, so no hole opens where a tree stood in front of it.
- **A tree leaves a gap when it leans.** What was behind it is not in the painting, so the script
  fills the gap with a blur of what is round it; on the horizon, where the tree stood against
  cloud, the land is left open so the moving cloud shows through.
- **The water is three sheets of drawn wave marks**, each stroke a little further along on the
  next sheet; `waterGlow` cross-fades them so that the light on show is always the same.
- **A waterfall is a strip of streaks running down behind a cover** (operator, 2026-10-02: the
  first version, wave marks on the water sheets, could not be seen). The strip repeats every
  `tile` rows, so `fallShift` only ever moves it within one tile and the join is never seen. The
  cover is the painting round the fall with a hole the shape of the falling water, so the streaks
  show nowhere else. Two puffs of spray swell and fade at the foot.
- **The pool at the foot of each fall ripples** (operator, 2026-10-02): three rings spread one
  after another from where the water lands (`poolRing`), in a window behind a cover of the pool's
  own shape. Every cover, fall or pool, has a hole wherever *any* fall or pool lies, and all the
  windows are drawn before all the covers (`IslandWaterfalls`), so one cover never hides what
  moves under its neighbour. A ripple cannot be seen over painted foam; the lowest pool's rings
  start further out, in open water, for that reason.
- **The gulls are drawn**, not cut from the painting (the painted ones are painted out): two
  wings hinged at a body, flapping in bursts and gliding between. Their courses are numbers in
  `GULL_COURSES`. **They fly by day only** (operator, 2026-10-02).
- **Night**: pieces behind the moon take the night from the one tint over the painting; pieces in
  front of it (horizon cloud, land, horizon trees) are each dimmed in their own shape
  (`MoonlitImage`).
- **Night lights** (operator, 2026-10-02), drawn over everything in place of the gulls: the
  windows of the three cottages, the lighthouse and its keeper's house are lit (one steady
  sheet); eleven lamps stand by the houses and on the bridge posts, in two sheets that glimmer
  out of step (lamps scattered along the paths were tried and removed at the operator's request
  the same day); and the lighthouse behaves like a pulsar (operator's word): twin thin beams
  turn about the lamp (`beamReach` is the cosine of the turn, so they shorten to nothing as they
  swing through the eye), the lamp flashes at that moment, twice a turn (`lampFlare`), and a ring
  of light spreads from each flash and fades (`pulseRing`). Where
  the windows and lamps are is written in the script (`WINDOWS`, `VILLAGE_LAMPS`,
  `LIGHTHOUSE_LAMP`); the script stops if a lamp is on water or on a tree that sways. With the
  clocks stopped the lights are still lit, only steady.
- **Reduce Motion, or the island not showing**: the clocks stay at nought and the scene is the
  painting at rest.
- To add or move a tree, cloud or gull, change the lists at the top of the script (or
  `GULL_COURSES`) and run it; `--debug <dir>` writes the layers put back together at rest and
  with everything moved as far as it goes, and prints how far the first is from the painting.

Not yet seen on a device: Android, a small phone, a tablet on its side, Reduce Motion. Frame
rate with about fifty pieces moving has been watched in the simulator only, not measured on a phone.

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
notification preferences, crash reporting consent, story progress, finished books, challenge
counts, earned badges.

The store is persisted at `version: 1`. `migrateAppState` moves a version-0 store forward by
counting as finished every book with `completedCount > 0`.

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
