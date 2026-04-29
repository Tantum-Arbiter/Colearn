# Frontend Architecture — Grow with Freya

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
| Auth | Google Sign-In + Apple Auth | — |
| Analytics | Sentry | 7.8 |
| i18n | i18next + react-i18next | 24 / 15 |
| Audio | expo-audio | 1.1 |
| Images | expo-image | 3.0 |
| Build | EAS Build | — |

## App Architecture

```
app/
├── _layout.tsx              ← Root layout: providers, orientation, navigation state machine
├── index.tsx                ← Entry point (redirects to _layout)

components/
├── onboarding/             ← First-launch tutorial flow
├── auth/                   ← Login screens (Google, Apple, guest mode)
├── main-menu/              ← Main menu with 3D coverflow carousel
├── stories/                ← Story reader, page rendering, interactions
│   ├── story-book-reader.tsx    ← Core reader: page navigation, mode selection, overlays
│   ├── music-challenge-ui.tsx   ← Note buttons, sequence progress, blow detection
│   └── instrument-picker-overlay.tsx  ← Instrument selection carousel
├── music/                  ← Music mode screens (practice, freeplay)
├── account/                ← Settings, language, screen time, profile
├── tutorial/               ← Contextual tip overlays
└── ui/                     ← Shared UI components

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

## Orientation Strategy

- **Phones**: Locked to `PORTRAIT_UP` everywhere except the story reader
- **Tablets (≥768px short edge)**: All orientations allowed
- **Story reader**: Unlocks all orientations so stories can be read in landscape
- On exit from story reader, orientation re-locks to portrait (phones only)

This is handled in `app/_layout.tsx` via `expo-screen-orientation`.

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

Arabic (`ar`) is RTL but the app does not yet have full RTL layout support — text renders correctly
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
checksums. This minimizes data transfer — a typical sync with no changes is 2 API calls and
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
and triggers a gentle lockout overlay when the limit is reached. Time tracking pauses when the
app is backgrounded.

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