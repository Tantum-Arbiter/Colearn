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

## What still needs building

1. **A known starting state.** The flows currently work around whatever state the simulator happens
   to be in — the screen-time owl, the tutorial, the current language. A flow should start from a
   state it chose. The plan is a dev-only entry point (a deep link handled only when `__DEV__`, or a
   build-time flag) that seeds: onboarding done, tutorials seen, screen time reset, language English,
   and the gateway pointed at the WireMock stubs already in `wiremock-server/`. Until that exists,
   expect the odd retry and keep flows tolerant.
2. **The remaining journeys.** Covered so far: home opens, and the language flag switches languages.
   Still to write: the core child journey (home → library → read a story → back), the money paths
   (trial, paywall, restore, a locked story), the rest of the parent and safety paths (grown-ups
   gate, Screensafe limits, screen-time alert), and sign-in and sync against the stubs.
3. **App journeys in CI.** The website suite runs on every pull request (`website-e2e.yml`). The app
   suite does not run in CI yet, because it needs a build to drive and a runner to drive it on:
   Android emulators run on Linux cheaply; iOS needs macOS runners, which cost roughly ten times as
   much per minute. The sensible split is a smoke subset per pull request on Android, and the full
   suite nightly on both.
4. **Devices beyond the phone.** Tablet layouts and landscape are covered only by Jest today.

---

## Conventions

- A flow is named for what a person does, not for the screen it touches.
- Tag a flow `smoke` only if it must pass before anything ships.
- A flaky flow is fixed or deleted in the same week. A suite people ignore is worse than no suite.
- New UI gets a `testID` when a journey needs to reach it, named for the thing, not its position.
- Anything a flow needs to see must be its own accessibility element. A `Pressable` wrapping a whole
  card collapses its contents into one element on iOS, which hides them from both VoiceOver and the
  test.
