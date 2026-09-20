# QA Automation

How CoLearn is tested, what each layer is for, and how to run it.

---

## The layers

| Layer | Tool | Lives in | Runs against | Speed |
|---|---|---|---|---|
| Unit + component | Jest + RN Testing Library | `grow-with-freya/__tests__/` | Rendered components, no device | ~2 min, every commit |
| Backend unit + integration | JUnit | `gateway-service/src/test/` | Spring context | Minutes |
| API end-to-end | Cucumber + WireMock | `func-tests/` | A running gateway | Minutes |
| App journeys | **Maestro** | `grow-with-freya/.maestro/` | The real app on a simulator or emulator | Minutes |
| Website | **Playwright** | `website/e2e/` | The built Next.js site | Seconds |
| Load | Gatling | `nft/` | A deployed gateway | Long, on demand |
| Security | pytest | `security/` | A deployed gateway | On demand |

The two new layers are Maestro and Playwright. Everything above them was already here.

---

## Why Maestro and not Playwright for the app

Playwright drives browsers. The mobile app is React Native running natively, so Playwright cannot
reach it. The web export exists (`npm run build:web`) but does not currently run: it stops at the
splash with `Cannot use 'import.meta' outside a module`. Even once that is fixed, the journeys that
matter most — Google and Apple sign-in, RevenueCat purchases, audio, notifications, orientation,
secure storage — are native, so a browser harness would be testing a different app from the one that
ships.

Maestro drives the actual build on a simulator or emulator, which is the thing parents install.

---

## Running the app journeys

Needs the Maestro CLI (`brew install mobile-dev-inc/tap/maestro`) and a booted simulator with the
app installed.

```bash
cd grow-with-freya
npm run e2e          # every flow
npm run e2e:smoke    # the smoke subset
MAESTRO_DEVICE=<udid> npm run e2e   # a particular simulator
```

Flows live in `.maestro/flows/<area>/*.yaml`, grouped as `core`, `parent`, `money` and `auth`.
`.maestro/helpers/` holds steps shared between flows. Failures write logs, screenshots and a
recording to `~/.maestro/tests/<timestamp>/`.

Selectors are the app's own `testID`s — there are over 900 of them already. Prefer an `id:` over
matching visible text: text moves with translation, ids do not.

## Running the website tests

```bash
cd website
npm run test:e2e       # headless, desktop and mobile viewports
npm run test:e2e:ui    # watch them run
```

Playwright starts the dev server itself. Point it at a deployed environment instead with
`PLAYWRIGHT_BASE_URL=https://earlyroots.co.uk npm run test:e2e`.

---

## Starting from a known state

A flow opens a seeding link before it does anything else, and the app applies it only in a
development build or one built with `EXPO_PUBLIC_E2E=1` (`isE2eAllowed`, `services/e2e-state.ts`).
In a shipped build the link is read and thrown away.

```
com.growwithfreya.app://?e2e=1&onboarded=1&guest=1&tutorials=done&screenTime=reset&language=en&tier=free
```

It is a link to the page the app already opens on, carrying an `e2e` flag, because expo-router owns
deep links and answers a path it does not know with its "Unmatched" screen. Parameters: `reset`
(wipe first), `onboarded`, `guest`, `tutorials=done|fresh`, `screenTime=reset`, `language`, `tier`,
`childAgeMonths`, `nickname`. Anything the link leaves out is left alone. `.maestro/helpers/start-seeded.yaml`
does this for every flow; seeding took the home flow from 63 seconds to 15.

## Traps on iOS

- **Text that wraps is one string with a newline in it.** `"Welcome back.*"` will not match it.
  Match an id, or a word that sits on one line.
- **An overlay hides the page beneath it from the accessibility tree, and closing it does not bring
  the page back** until the app relaunches. A flow that opens a full-screen overlay should assert
  what it needs before closing it, or relaunch afterwards — which is a better assertion anyway,
  since it proves the choice was saved. ⚠️ UNVERIFIED whether VoiceOver suffers the same; worth an
  hour with the screen reader on.
- **A `Pressable` round a group collapses it into one element.** The language chooser read as a
  single blob of fourteen languages until its scrim and card were marked `accessible={false}`.
- **Constant ambient animation slows the snapshot.** Turn Reduce Motion on for the simulator
  (`xcrun simctl spawn <udid> defaults write com.apple.Accessibility ReduceMotionEnabled -bool true`).

## What still needs building

1. **The gateway stubs.** Seeding covers the app's own state; the flows still talk to whatever
   gateway the build points at. Pointing a test build at the WireMock stubs in `wiremock-server/`
   is what makes sign-in and sync flows possible.
2. **The remaining journeys.** Covered so far: home opens, and the language flag switches languages.
   Still to write: the core child journey (home → library → read a story → back), the money paths
   (trial, paywall, restore, a locked story), the rest of the parent and safety paths (grown-ups
   gate, Screensafe limits, screen-time alert), and sign-in and sync against the stubs.
3. **Devices beyond the phone.** Tablet layouts and landscape are covered only by Jest today.

---

## Where each layer runs in CI

| When | What runs | Where | Roughly |
|---|---|---|---|
| Every push and pull request touching the app | Jest, types, lint, npm audit | ubuntu | 3-5 min |
| Every push and pull request touching the website | Playwright, both viewports | ubuntu | 2 min |
| Push to `main`, `mvp` or `develop` | **Smoke journeys on an Android emulator** | ubuntu | 20-30 min |
| Nightly, and on demand | **Every journey, Android and iOS** | ubuntu + macOS | 30-60 min |
| Push to `main`/`develop` | Web export, Lighthouse | ubuntu | 5 min |

The journey job (`app-journeys` in `grow-with-freya-ci-cd.yml`) waits for Jest and the type check:
there is no point booting an emulator for a branch that does not compile. It builds the app with
`EXPO_PUBLIC_E2E=1`, so the seeding link works, serves the bundle, installs onto the emulator and
runs the `smoke` tag. A failure keeps the recordings and Metro's log as artifacts.

iOS sits in `app-e2e-nightly.yml` rather than the per-push pipeline because macOS runners cost
roughly ten times as much per minute. Run it on demand from the Actions tab, choosing a platform
and optionally a tag.

⚠️ UNVERIFIED — both journey jobs are written but have not run in GitHub Actions yet; the first run
may need adjusting (build times, emulator image, the wait for the bundle).

---

## Conventions

- A flow is named for what a person does, not for the screen it touches.
- Tag a flow `smoke` only if it must pass before anything ships.
- A flaky flow is fixed or deleted in the same week. A suite people ignore is worse than no suite.
- New UI gets a `testID` when a journey needs to reach it, named for the thing, not its position.
- Anything a flow needs to see must be its own accessibility element. A `Pressable` wrapping a whole
  card collapses its contents into one element on iOS, which hides them from both VoiceOver and the
  test.
