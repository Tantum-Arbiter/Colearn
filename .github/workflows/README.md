# CI/CD Pipelines

> **For LLMs / AI agents**: This README is the authoritative reference for all CI/CD workflows.
> Read this file before modifying any workflow. If you change a pipeline, **update this file**.

## Overview

The project has **8 GitHub Actions workflows** across 3 domains: frontend app, backend gateway,
and CMS content. All workflows use **concurrency control** to prevent simultaneous runs on the
same branch -newer runs cancel in-progress ones.

## Workflow Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Expo/React Native)                 │
│                                                                     │
│  grow-with-freya-ci-cd.yml                                          │
│    (push/PR to main/develop)                                        │
│    1 checks:  security-audit + test-and-lint + type-check           │
│    2 build:   build-web · build-android (build or reuse)            │
│    3 test:    lighthouse (info) · app-journeys (smoke)              │
│    4 summary: deployment-summary ("EAS ready" only if all pass)     │
│                                                                     │
│  app-e2e-nightly.yml ──→ build-android ──→ journeys (every flow)    │
│    (02:00 UTC, manual)   build-ios     ──→ journeys (every flow)    │
│    (both pipelines share app-e2e-build-* / app-e2e-journeys-*)      │
│                                                                     │
│  deploy-eas.yml ──→ check-ci-status ──→ eas-build (iOS/Android)   │
│    (manual only)    (verifies CI green)                              │
│                                                                     │
│  security-scan.yml ──→ dependency-scan + license-scan + code-quality│
│    (weekly, lockfile changes on main/mvp, pull requests)            │
│                                                                     │
│  ci-dashboard.yml ──→ publish (GitHub Pages: red/amber/green)       │
│    (watched workflows start or finish, hourly, manual)              │
├─────────────────────────────────────────────────────────────────────┤
│                        BACKEND (Spring Boot / Cloud Run)            │
│                                                                     │
│  backend-checks.yml ──→ unit + contract tests ──→ func tests        │
│    (PRs, push to main/mvp)  ──→ security probes vs compose stack    │
│                                                                     │
│  gateway-build.yml ──→ test ──→ build image ──→ push to GCR       │
│    (push when gateway-service/** changes)  ──→ deploy Cloud Run    │
│                                            ──→ run functional tests │
│                                                                     │
│  func-tests-build.yml ──→ build test image ──→ push to GCR        │
│    (push when func-tests/** changes)                                │
│                                                                     │
│  nft-tests-build.yml ──→ build Gatling image ──→ push to GHCR     │
│    (manual only, push disabled)                                     │
├─────────────────────────────────────────────────────────────────────┤
│                        CMS (Content Pipeline)                       │
│                                                                     │
│  cms-stories-sync.yml ──→ validate JSON ──→ gsutil rsync to GCS   │
│    (push to main when cms-stories/** changes)  ──→ Firestore upload│
│                                                                     │
│  cms-stories-delete.yml ──→ validate ──→ delete from GCS + Firestore│
│    (manual only, double-confirmation, ids validated first)          │
└─────────────────────────────────────────────────────────────────────┘
```

## Workflow Details

### 1. grow-with-freya-ci-cd.yml -Frontend CI/CD

**Triggers:** Push to `main`/`mvp`/`develop` or a PR targeting those branches, when `grow-with-freya/**` or the workflow itself changes. `jest.config.js`'s `testMatch` picks up files named `*.test.*` or `*.spec.*`, so new suites run without touching the workflow.

**Jobs:**

| Job | Depends On | Runs on | Purpose |
|-----|-----------|---------|---------|
| `test-and-lint` | - | every push and PR | `npm run lint -- --max-warnings 501` (no errors, and the warning count may only fall) + `npm run test:ci` with coverage thresholds; a JUnit report and the coverage totals go on the run summary and are kept 30 days |
| `type-check` | - | every push and PR | `npm run type-check` |
| `security-audit` | - | every push and PR | `npm audit` and `npm outdated`; informational, never fails. The run summary lists the advisory counts by severity and every high or critical package (`.github/scripts/audit-summary.py`) |
| `build-android` | security-audit, test-and-lint, type-check | manual only (paused) | The shared E2E release build (`app-e2e-build-android.yml`, x86_64 only), reused from cache while the app's source and the build recipe are unchanged; the job says which on the run summary |
| `app-journeys` | build-android | manual only (paused) | Exactly that app on an emulator on a fresh runner (`app-e2e-journeys-android.yml`), Maestro `smoke` flows |
| `build-web` | security-audit, test-and-lint, type-check | every push and PR, manual | `npx expo export --platform web`, then fails if the bundle contains `import.meta` |
| `performance-test` (Lighthouse) | build-web | whenever the web build succeeds | Lighthouse CI, three runs. Accessibility below 0.9 fails the job; performance, best practices, SEO and PWA below their minimums only warn. Scores go on the run summary; the report is kept as an artifact (never uploaded to public storage) |
| `deployment-summary` | all above | always | A table of every job by stage, and release readiness: says plainly when the smoke journeys did not run, so the nightly must be checked before releasing (releases are made by hand, outside CI) |

**Key decisions:**
- `npm ci --legacy-peer-deps` everywhere, with no fallback to `npm install`: a lockfile that has drifted from `package.json` fails the install rather than being papered over. `--legacy-peer-deps` is required for React Native's peer conflicts.
- The Expo CLI is the project's own (`npx expo`), not a global `latest`.
- The Android journeys (`build-android` + `app-journeys`) are paused (operator, 2026-09-23) and run only when the workflow is started by hand. When re-enabled they are meant to gate pull requests into `main`, the release branch, not every push to `mvp`. Every journey also runs nightly on Android and iOS (`app-e2e-nightly.yml`).
- The journeys' app is built for x86_64 only (`-PreactNativeArchitectures=x86_64`), the emulator's CPU: all four ABIs ran the runner out of disk. Store builds come from EAS and carry every ABI.
- The pipeline runs in stages: the checks (security audit, tests and lint, type check) first and in parallel; then the builds (web, and the Android E2E app, which is usually reused from cache in seconds); then what tests them (Lighthouse, the smoke journeys, on a fresh runner that fetches the app by cache key); then the summary. A branch that fails a check never builds. The security audit is ordered first but is informational: it cannot fail the pipeline (operator decision, 2026-09-28: keep it informational rather than fail on high or critical advisories in shipped dependencies). Both Android jobs are the shared E2E workflows below, so the per-push smoke flows and the nightly test the same build of a given source and neither builds it twice. A cache saved in a pull request serves only that PR; one saved on `main` serves every PR.
- The web build and its `import.meta` check run on every push and PR, so a web bundle that would stop at the splash is caught before merging, and Lighthouse runs on every web build.
- `NODE_OPTIONS=--max-old-space-size=4096` prevents OOM on test runs.
- Actions are on their Node 24 majors (checkout v7, setup-node v7, setup-java v6, cache v6, upload-artifact v7, download-artifact v8). `gradle/actions/setup-gradle` stays on **v5**: v6 moved its caching into a proprietary component whose Terms of Use you accept by upgrading, which is the operator's decision to make.
- No step hides a failure behind `|| echo` any more, except the informational audit. Expo doctor is a gate in the web build: dependencies that drift from the installed Expo SDK fail the pipeline; fix them with `npx expo install --fix`, never `npm audit fix --force`.
- No automatic native builds; those go through EAS (see below). `deploy-eas.yml` needs a green run of this pipeline on the branch it builds from.

### 1b. App E2E -shared build and journeys

One build and one journeys workflow per platform, one principle: **the app under test is built once per source, and every test stage uses that build.** Store builds are separate and come from EAS (below), because the E2E app must never ship.

| Workflow | Triggered by | Does |
|----------|--------------|------|
| `app-e2e-build-android.yml`, `app-e2e-build-ios.yml` | `workflow_call` | Looks up the cache for an app built from this source (key: `e2e-android-release-v1-` / `e2e-ios-release-v1-`, then `<hash of app/, components/, …, package-lock.json, app.config.js>`; `.maestro`, tests and docs are not part of it). Only on a miss: `npm ci --legacy-peer-deps`, prebuild, then a release build with the JavaScript inside and `EXPO_PUBLIC_E2E=1` (Android `assembleRelease` x86_64, release lint off, 4 GB Gradle heap; iOS `xcodebuild -configuration Release` for the simulator, signed ad hoc so the keychain works). Saves it at once and returns the key as `app-key`. |
| `app-e2e-journeys-android.yml`, `app-e2e-journeys-ios.yml` | `workflow_call` (`app-key`, `tags`) | Restores exactly that app (`fail-on-cache-miss`: it never builds), starts WireMock on :8080, boots an API 31 emulator (Pixel Launcher off, 3 cores, 4 GB) or an iPhone 16 Pro simulator (Reduce Motion on), and runs Maestro through `.maestro/run-with-device-retry.sh` with `APP_BUILD=release`. A failure keeps screenshots, Maestro logs, logcat or host load, and WireMock's log. |
| `app-e2e-nightly.yml` | schedule 02:00 UTC, manual (`platform`, `tags`) | Build and journeys for Android and for iOS, each platform on its own so one failing build does not stop the other; every flow. |

- The build workflow file itself is part of its cache key, so changing how the app is built rebuilds it. The `-v1` is there to force a rebuild by hand, if ever needed.
- E2E builds only ever talk to the stub: the workflows set `EXPO_PUBLIC_GATEWAY_URL=http://localhost:8080` (a `.env` file never overrides a variable already set), and `app.config.js` refuses to build an E2E app with any other gateway, because a release build otherwise reads `.env.production`.
- Retries and the reasons for each emulator and simulator setting are in `QA-AUTOMATION.md`.

### 2. deploy-eas.yml -EAS Build (Manual)

**Triggers:** `workflow_dispatch` only (never automatic).

**Flow:** Checks that the latest CI pipeline passed → runs `eas build` for selected platform/profile.

**Inputs:**
- `environment`: development / preview / production
- `platform`: ios / android / all
- `wait_for_build`: whether to block until EAS completes

**Key decisions:**
- Deliberately manual -native builds cost money on EAS and take 15–30 min
- Validates CI status before building to prevent shipping broken code
- Uses `EXPO_TOKEN` and `SENTRY_AUTH_TOKEN` secrets

### 3. security-scan.yml -Security Audit

**Triggers:** Mondays 06:00 UTC; push to `main` or `mvp` and pull requests that change the app's `package.json`, `package-lock.json` or `audit-allowlist.json`, the gate script or the workflow; manual.

**Jobs (3, parallel):**
- `dependency-scan`: `npm audit` from the lockfile alone (nothing is installed), twice: the whole tree, summarised on the run page by `.github/scripts/audit-summary.py`, and the production tree (`--omit=dev`). Both reports are kept as artifacts. Then `.github/scripts/audit-gate.py` fails the job on a critical advisory anywhere, or a high one in the production tree, that `grow-with-freya/audit-allowlist.json` does not accept. Expo lists its build tooling as production dependencies, so `--omit=dev` cannot say what ships; the allowlist records what the release source maps showed (`PHASE-4-PROD-READINESS.md` §12): tooling that is not bundled is accepted by package, code that ships by advisory id, so a new advisory against shipped code fails the scan until someone has judged it. Entries that match nothing are named on the run page so the list can be pruned. `grow-with-freya/__tests__/config/audit-allowlist.test.ts` checks the gate's behaviour and that every entry has a reason, a date and a package still in the lockfile.
- `license-scan`: `license-checker` -flags GPL/AGPL licenses
- `code-quality`: ESLint + TypeScript compiler + line count metrics

### 3b. ci-dashboard.yml -Pipeline dashboard on GitHub Pages

**Page:** https://tantum-arbiter.github.io/Colearn/ -one tile per pipeline group, green, amber, red or grey for each watched workflow on `mvp` and `main`, with the latest run's title, age, duration and a link. `status.json` beside it holds the same facts for anything else (Grafana's JSON datasource, a Slack bot), and `history.json` beside that is the dashboard's memory: every run of the last 90 days.

**Wall monitor:** https://tantum-arbiter.github.io/Colearn/monitor.html -the same facts as a Jenkins-style build monitor for a screen on the wall: one solid green, amber, red or grey tile per workflow and branch, filling the screen in a square-ish grid (the column count follows the tile count), each with the workflow, the state in a shape and a word, the branch, the run number and age, the commit title, the failure streak, the first failed job and step linked to its log, and the 14-day strip. A tile for a run still going breathes gently (not under reduced motion). Dark background, reloads every minute, one column on a phone. The two pages link each other.

**Triggers:** whenever a watched workflow is requested or completes (`workflow_run`), hourly, by hand, and on a push of its own three files to `main` or `mvp`. `workflow_run` and `schedule` fire only from the default branch, so the dashboard stays live only while this workflow is on `main`.

**How it decides:** `.github/scripts/ci-dashboard.py` reads `.github/ci-dashboard.json` (groups, workflows, branches, `staleAfterHours`, and `blocks`/`blocking`: what a failure stops, in words, and whether anything downstream waits on it), fetches each workflow's last 30 runs per branch with the job's own `GITHUB_TOKEN` (`actions: read`), and writes the page. Green: the latest run passed, and recently enough where a threshold is set. Amber: running or queued, cancelled or skipped, a pass older than its threshold (the nightly at 36 h, the weekly scan at 8 days, an EAS build at 30 days), or a workflow with a threshold that never ran or is overdue. Red: failed, timed out, or could not start. Grey: never run on that branch. A group is the worst of its cells.

**What a red cell tells you:** the failed jobs and the step each failed on, linked to the job log; up to three lines of evidence, taken from the job's failure annotations and from the lines before the first `##[error]` in its log (lines mentioning an error, a failure, a denial, a missing thing or an exit code); how many runs in a row have failed (`30+` once the whole fetched window is red) and when it last passed, linked; how many of the recent runs passed and the median duration; and links to the run, the commit and the pull request. The strip at the top sums it up: cells green, failing now and how many of those block something, the success rate across the fetched runs, the longest failure streak, and what needs attention. The page itself never calls the API; it is static, rebuilt by this workflow, and the 5-minute reload only fetches the page again.

**What it remembers:** there is no database. Each build reads the `history.json` the last build published (from `pagesUrl` in the config, the page's own address; `--history <file>` reads it from disk instead, for tests and offline builds), merges in every run it fetched this time (one compact record per run id: workflow file, branch, event, conclusion, start time, duration, run number and URL; a run seen again replaces its old record, so a run that was in progress last time gets its conclusion), drops records older than 90 days, and publishes the merged file beside the page. When the previous file is missing or unreadable the build says so on stderr and starts from what it fetched; it never fails for it. From that history each cell gets a trend line and a strip of the last 14 days (one square per day, shaped and titled as well as coloured by the worst run that day): the success rate over 7, 30 and 90 days, each only once three completed runs fall in the window; the median and 95th-percentile duration over 30 days; and the longest failure streak in 90 days with its dates. `status.json` carries the same under each cell as `trends`. The history is bounded by those 90 days, not by a run count, so it grows past the 30 runs per branch the API call returns; it fills up over its first 90 days, since each build can only add the runs the API still lists, and a cell whose latest run is older than that shows its state with no trend.

If the API returns nothing for every workflow the script exits 1 and the last published page stands. `grow-with-freya/__tests__/config/ci-dashboard.test.ts` drives every rule with synthetic runs, jobs, annotations, logs and histories shaped like the API and the published file, and checks the config names real workflows, says what each one blocks, names the page, and that this file lists every watched workflow by name.

**To watch another pipeline:** add it to `.github/ci-dashboard.json` (with `blocks` and `blocking`) and to the `workflow_run.workflows` list here, by its `name:`.

**What it does not do, by design:** rerun jobs or explain failures with a model (a static page has no token; the run page has GitHub's own rerun button), track deployments (nothing creates GitHub Deployments; the production gateway is deployed by hand), keep more than 90 days, or ingest test counts, coverage and Actions minutes (the history has room for them; nothing writes them yet).

### 4. gateway-build.yml -Backend CI/CD

**Triggers:** Push when `gateway-service/**`, `infra/**`, or `func-tests/**` changes.

**Flow:** Build → Test → Docker build → Push to GCR → Deploy to Cloud Run → Run functional tests.

**Key decisions:**
- Docker image pushed to `europe-west1-docker.pkg.dev` (Artifact Registry)
- Cloud Run deployed in `europe-west1` region
- Functional test job is deployed as a **Cloud Run Job** (not a workflow step) for isolation
- Functional tests use a Firebase ID token for auth (`GCP_FIREBASE_ID_TOKEN`)
- Test reports uploaded to `colearnwithfreya-test-reports` GCS bucket

### 5. func-tests-build.yml -Functional Test Image

**Triggers:** Push when `func-tests/**` changes.

Builds and pushes the Cucumber functional test Docker image to GCR. This image is used by
the Cloud Run Job triggered from `gateway-build.yml`.

### 6. nft-tests-build.yml -Performance Test Image

**Triggers:** `workflow_dispatch` only (push trigger disabled).

Builds a Gatling (Scala) performance test image and pushes to GHCR. Uses `eclipse-temurin:17-jdk`
base image. Currently dormant -will be re-enabled after security scan workflow is verified.

### 7. cms-stories-sync.yml -CMS Content Deploy

**Triggers:** Push to `main` when `scripts/cms-stories/**` or `scripts/story-schema.json` changes.
Also supports `workflow_dispatch` with dry-run mode.

**Jobs (3, sequential):**

| Job | Condition | Purpose |
|-----|-----------|---------|
| `validate-stories` | Always | Validates all `story-data.json` against schema, checks for duplicate IDs |
| `sync-to-gcs` | Push or dry_run=false | `gsutil -m rsync -r -c` delta-syncs images to GCS |
| `sync-to-firestore` | After GCS sync | Validates GCS assets → uploads stories → uploads asset checksums |

**Key decisions:**
- Validation always runs (even on PRs) to catch errors before merge
- GCS sync uses checksum comparison (`-c`), not timestamps, for reliable deltas
- Firestore upload verifies GCS assets exist before writing metadata (prevents orphaned references)
- Stories are uploaded with **batch chunking (400 per batch)** to stay under Firestore's 500-op limit
- Asset checksums use **GCS MD5 metadata** (no file downloads in CI)
- `workflow_dispatch` defaults to `dry_run: true` as a safety measure
- `force_upload` option available to re-upload all stories ignoring checksums

### 8. cms-stories-delete.yml -Story Deletion

**Triggers:** `workflow_dispatch` only.

**Safety features:**
- Requires story IDs entered twice (confirmation must match)
- Default is `dry_run: true` (shows what would be deleted)
- Deletes from both GCS and Firestore

## Shared Patterns

### Concurrency Control
Every workflow uses `concurrency` with `cancel-in-progress: true`:
```yaml
concurrency:
  group: workflow-name-${{ github.ref }}
  cancel-in-progress: true
```
This prevents queue buildup when multiple commits are pushed quickly.

### Path-Based Triggers
Workflows only run when relevant files change. This saves CI minutes:
- Frontend workflows: `grow-with-freya/**`
- Backend workflows: `gateway-service/**`
- CMS workflows: `scripts/cms-stories/**`

### Secrets Used

| Secret | Used By | Purpose |
|--------|---------|---------|
| `GCP_SA_KEY` | gateway-build, cms-sync, cms-delete | GCP service account (base64 JSON) |
| `EXPO_TOKEN` | deploy-eas | Expo account access for EAS builds |
| `SENTRY_AUTH_TOKEN` | deploy-eas | Sentry source map upload |
| `GHCR_USERNAME` + `GHCR_TOKEN` | nft-tests-build | GitHub Container Registry auth |
| `BACKEND_URL_GATEWAY_SERVICE` | gateway-build | Gateway URL for functional tests |
| `LHCI_GITHUB_APP_TOKEN` | grow-with-freya-ci-cd | Lighthouse CI GitHub integration |
