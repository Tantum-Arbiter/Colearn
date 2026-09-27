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

`MAESTRO_FRESH=1 npm run e2e` boots the simulator again first, which is the cure when flows start
failing on elements that are plainly on screen.

Nine flows, on a phone and on a tablet (`MAESTRO_DEVICE=<ipad udid>`): home opens; a story opens
from the shelf and closes again; a story only the server has reaches the shelf; a signed-in parent
comes straight back in; a first run meets onboarding; the flag switches languages and it sticks; the
grown-ups door asks its question; the offer opens and closes; a story beyond the free plan wears a lock.

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
`childAgeMonths`, `nickname`, `progress=clear` (every book back to its first page). Anything the
link leaves out is left alone. `.maestro/helpers/start-seeded.yaml`
does this for every flow; seeding took the home flow from 63 seconds to 15.

The scheme differs by platform. The iOS development build answers only `com.growwithfreya.app://`;
the Android one answers `growwithfreya://` (the app's own scheme) and, for pointing the development
build at the bundler, `exp+grow-with-freya://expo-development-client/?url=…`. The helpers choose by
platform. On CI both development builds forget the bundler whenever they are stopped, so flows
launch through `.maestro/helpers/launch.yaml`, never a bare `launchApp`.

Every bundler link ends in `&disableOnboarding=1`. On a fresh simulator or emulator the development
build otherwise opens its "This is the developer menu" sheet over the app on first load, and the
sheet hides the page from the accessibility tree: home draws, but `home-language-button` is never
found. On Android the flag marks that introduction as seen for as long as the app stays installed.
The iOS launcher reads it only inside the `url` parameter, so there it does nothing, and
`launch.yaml` taps "Continue" whenever the sheet appears.

## The gateway, stubbed

Flows run against WireMock rather than a real gateway, so a run cannot depend on somebody's data
or a deployment being up.

```bash
cd grow-with-freya
npm run e2e:stubs   # WireMock on :8080, from wiremock-server/mappings
npm run e2e:metro   # Metro with EXPO_PUBLIC_E2E=1 and the gateway pointed at the stubs
npm run e2e         # in a third shell
```

`wiremock-server/run-local.sh` fetches the standalone jar once, so no Docker is needed; the
docker-compose file still works if you prefer it. The app's endpoints are stubbed in
`mappings/app-gateway-endpoints.json` (profile, stories version and delta, asset urls, account
deletion); `/auth/google`, `/auth/apple`, `/auth/refresh` and `/auth/revoke` were already stubbed
for the func-tests and are reused. WireMock 3 rejects a mapping whose `id` is not a UUID — give a
mapping a `name` instead.

**What no stub can reach.** Google and Apple sign-in are native SDKs, and purchases are RevenueCat
on the device, so neither goes anywhere near the gateway. A flow gets a signed-in parent from the
seeding link (`signedIn=1`), which writes a session the way a real sign-in would, and a plan from
`tier=`, which sets the same dev override the Grown-ups page uses. A real purchase still needs a
sandbox account and a human.

**The token has to be a real JWT.** The app reads `exp` off the access token before every request
and refreshes when it is close, so a seeded session carrying a plain string sends the app round the
refresh loop forever. The seed writes an unsigned JWT with a far-future expiry.

**Proven**: a seeded signed-in parent relaunches, the app calls `/api/profile`,
`/api/stories/version` and `/api/stories/delta` against the stubs, and the story that exists only in
the stub reaches the shelf and the search — a flow finds it by name. Its cover comes from
`wiremock-server/__files/e2e/cover.webp`.

## Traps on iOS

- **Text that wraps is one string with a newline in it.** `"Welcome back.*"` will not match it.
  Match an id, or a word that sits on one line.
- **An overlay hides the page beneath it from the accessibility tree** while it is up, which is
  correct — iOS leaves out what is covered. The page comes back when the overlay closes. If it does
  not, the overlay did not actually close: a tap in the top few percent of the screen lands in the
  status bar and never reaches the app, which is easy to misread as a broken tree.
- **A `Pressable` round a group collapses it into one element.** The language chooser read as a
  single blob of fourteen languages until its scrim and card were marked `accessible={false}`.
- **A phone reads sideways, and the tree stops keeping up there.** Turn the device with
  `- setOrientation: LANDSCAPE_LEFT` (which is what a family does, and what makes taps land), but
  do not expect to assert what a page says: the reader is plainly on screen while the tree still
  describes the shelf. The way in and the way out are reliable; the pages themselves are held by the
  reader's Jest tests.
- **When the tree goes partial, reboot the simulator.** After hours of driving, whole subtrees stop
  being reported — the bar vanished from the tree while plainly on screen and tappable by
  coordinate. It is the simulator's accessibility service, not the app: `xcrun simctl shutdown` and
  boot again, and it comes back.
- **A helper's own `env:` beats the `env:` it is called with.** A default seed in
  `start-seeded.yaml` silently won over the seed each flow passed, so flows ran against the wrong
  state and some passed for the wrong reason. The helper now has no default: the caller always says.
- **A flow that changes where the app opens has to start it again.** Onboarding, a login screen and
  the shelf are all decided as the app starts, so `start-seeded.yaml` seeds, waits for the write,
  stops the app and launches it again. Seeding alone leaves the app where it already was.
- **Signing out is not the same as carrying on without an account.** `signedIn=0` used to turn guest
  mode on, which walks straight past onboarding; guest mode is now only what `guest=` says.
- **iOS asks for an App Store review on its own**, and the dialog hides everything beneath it. The
  interruptions helper taps "Not Now".
- **Constant ambient animation slows the snapshot.** Turn Reduce Motion on for the simulator
  (`xcrun simctl spawn <udid> defaults write com.apple.Accessibility ReduceMotionEnabled -bool true`).

## What still needs building

1. **Opening the stubbed story**, so a flow covers the reader itself: the assets download on a tap,
   which the stub answers but no flow exercises yet.
2. **One journey written and parked**:
   - *The day's screen time running out.* The app only watches the clock while a child is inside a
     story, music or emotions screen (`startWarningMonitor` runs from `startSession`), so the owl
     cannot appear on the home page however spent the day is. A flow would have to sit inside the
     reader, which is landscape, where the tree is unreliable. The seeding link can spend a day
     (`screenTime=spent`) and that part is tested.
3. **The remaining journeys.** Covered so far: home opens, and the language flag switches languages.
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

The nightly tests **release builds**: the JavaScript is inside the app, so no Metro and no
development launcher run on CI. Every failure the nightly hit with development builds came from
that pairing on a slow runner (the developer-menu sheet, iOS's "Open in" prompt, a first bundle or
a manifest request outlasting the launcher's timeout). The flows are told with `-e APP_BUILD=release`,
and `launch.yaml` then starts the app with a plain `launchApp`; without it they keep using the
bundler link, as the per-push pipeline and local runs do. `EXPO_PUBLIC_E2E=1` switches over-the-air
updates off in `app.config.js`, so a release build never swaps in a published bundle, and keeps
the seeding link working (`isE2eAllowed` reads `extra.e2e` when `__DEV__` is false).

**An E2E build never talks to the live API.** A release build loads `.env.production`, whose
`EXPO_PUBLIC_GATEWAY_URL` is the production gateway, so the first release runs sent the seeded,
unsigned session there (rejected, and the flows fell back to the sign-in screen). The nightly now
sets `EXPO_PUBLIC_GATEWAY_URL=http://localhost:8080`, which a `.env` file cannot override, and
`app.config.js` refuses to build an E2E app whose gateway is not `localhost`, `127.0.0.1` or
`10.0.2.2`. Both jobs start WireMock (`wiremock-server/run-local.sh`) before the journeys; Android
reaches it through `adb reverse tcp:8080 tcp:8080`, and an E2E build is the only one that allows
plain HTTP on Android (`usesCleartextTraffic`). The iOS build is signed ad hoc
(`CODE_SIGN_IDENTITY=-`): unsigned, the app has no entitlements and SecureStore fails in the
simulator, so a seeded session is never stored.

Each job keeps its built app in the Actions cache, keyed on the app's source (not on `.maestro`,
tests or docs), and saves it as soon as it is built, so a rerun after a flow or workflow change
skips prebuild, pods and the native build. Change the `-v1` in the key when the build steps
themselves change. The Android release build skips release lint (an init script sets
`checkReleaseBuilds = false`) and runs Gradle with a 4 GB heap and 1 GB metaspace: with Expo's
defaults, `lintVitalAnalyzeRelease` ran out of metaspace and the build hung instead of failing. A failed Android run keeps the emulator's logcat, the runner's memory every ten
seconds, the kernel log and the emulator's crash store; a failed iOS run keeps the runner's memory
pressure and busiest processes every twenty seconds.

Where a development build is used, both platforms wait for Metro's first bundle before a flow
runs: iOS gives up on a first build that outlasts its request ("Failed to load app from
http://localhost:8081 with error: The request timed out").

A software-rendered emulator can be too busy to answer the system in time, and Android then puts
"Pixel Launcher isn't responding" over whatever is on screen. It stays until someone answers it, so
`launch.yaml` and `dismiss-interruptions.yaml` tap its "Wait" (`android:id/aerr_wait`).

A loaded runner can also leave the development build's first request to Metro unanswered past its
timeout (10 seconds on the CI iOS build). The build makes one attempt and stops: newer builds show
"There was a problem loading the project." with a Reload button, older ones drop back to their
launcher. `connect-dev-client.yaml` waits up to a minute at a time and retries up to four times,
tapping Reload or opening the bundler link again.

**Open (2026-09-27):** on CI the Android emulator froze as the grown-ups flow tapped into the
library, three runs out of three, and exited about fifty seconds later with no crash report and no
memory pressure on the host. Its logcat stops mid-tap, system services included, which points at
the emulator rather than the app.

---

## Conventions

- A flow is named for what a person does, not for the screen it touches.
- Tag a flow `smoke` only if it must pass before anything ships.
- A flaky flow is fixed or deleted in the same week. A suite people ignore is worse than no suite.
- New UI gets a `testID` when a journey needs to reach it, named for the thing, not its position.
- Anything a flow needs to see must be its own accessibility element. A `Pressable` wrapping a whole
  card collapses its contents into one element on iOS, which hides them from both VoiceOver and the
  test.
