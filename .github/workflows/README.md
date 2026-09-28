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
│    1 checks:  test-and-lint + type-check   (security-audit: info)   │
│               build-android  (starts at once; usually a cache hit)  │
│    2 gated:   build-web ──→ lighthouse (info)                       │
│               app-journeys   (needs checks + build-android)         │
│    3 summary: deployment-summary ("EAS ready" only if all pass)     │
│                                                                     │
│  app-e2e-nightly.yml ──→ build-android ──→ journeys (every flow)    │
│    (02:00 UTC, manual)   build-ios     ──→ journeys (every flow)    │
│    (both pipelines share app-e2e-build-* / app-e2e-journeys-*)      │
│                                                                     │
│  deploy-eas.yml ──→ check-ci-status ──→ eas-build (iOS/Android)   │
│    (manual only)    (verifies CI green)                              │
│                                                                     │
│  security-scan.yml ──→ dependency-scan + license-scan + code-quality│
│    (push to specific branch)                                        │
├─────────────────────────────────────────────────────────────────────┤
│                        BACKEND (Spring Boot / Cloud Run)            │
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
│    (manual only, requires double-confirmation)                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Workflow Details

### 1. grow-with-freya-ci-cd.yml -Frontend CI/CD

**Triggers:** Push to `main`/`mvp`/`develop` or a PR targeting those branches, when `grow-with-freya/**` or the workflow itself changes. `jest.config.js`'s `testMatch` picks up files named `*.test.*` or `*.spec.*`, so new suites run without touching the workflow.

**Jobs:**

| Job | Depends On | Runs on | Purpose |
|-----|-----------|---------|---------|
| `test-and-lint` | - | every push and PR | `npm run lint` + `npm run test:ci` with coverage |
| `type-check` | - | every push and PR | `npm run type-check` |
| `security-audit` | - | every push and PR | `npm audit` and `npm outdated`; informational, never fails |
| `build-android` | - | manual only (paused) | The shared E2E release build (`app-e2e-build-android.yml`, x86_64 only), reused from cache while the app's source is unchanged; starts at once, alongside the checks |
| `app-journeys` | test-and-lint, type-check, build-android | manual only (paused) | Exactly that app on an emulator on a fresh runner (`app-e2e-journeys-android.yml`), Maestro `smoke` flows; no emulator boots for a branch that fails the checks |
| `build-web` | test-and-lint, type-check | every push and PR, manual | `npx expo export --platform web`, then fails if the bundle contains `import.meta` |
| `performance-test` | build-web | whenever the web build succeeds | Lighthouse CI; informational, never fails |
| `deployment-summary` | all above | always | GitHub Step Summary with results |

**Key decisions:**
- `npm ci --legacy-peer-deps` everywhere, with no fallback to `npm install`: a lockfile that has drifted from `package.json` fails the install rather than being papered over. `--legacy-peer-deps` is required for React Native's peer conflicts.
- The Expo CLI is the project's own (`npx expo`), not a global `latest`.
- The Android journeys (`build-android` + `app-journeys`) are paused (operator, 2026-09-23) and run only when the workflow is started by hand. When re-enabled they are meant to gate pull requests into `main`, the release branch, not every push to `mvp`. Every journey also runs nightly on Android and iOS (`app-e2e-nightly.yml`).
- The journeys' app is built for x86_64 only (`-PreactNativeArchitectures=x86_64`), the emulator's CPU: all four ABIs ran the runner out of disk. Store builds come from EAS and carry every ABI.
- The Android app is built in its own job (`build-android`), which starts at once alongside the checks, and `app-journeys` fetches it by cache key on a fresh runner, so the emulator has the disk to itself. Both jobs are the shared E2E workflows below, so the per-push smoke flows and the nightly test the same build of a given source and neither builds it twice. A cache saved in a pull request serves only that PR; one saved on `main` serves every PR.
- The web build and its `import.meta` check run on every push and PR, so a web bundle that would stop at the splash is caught before merging, and Lighthouse runs on every web build.
- `NODE_OPTIONS=--max-old-space-size=4096` prevents OOM on test runs.
- No automatic native builds; those go through EAS (see below). `deploy-eas.yml` needs a green run of this pipeline on the branch it builds from.

### 1b. App E2E -shared build and journeys

One build and one journeys workflow per platform, one principle: **the app under test is built once per source, and every test stage uses that build.** Store builds are separate and come from EAS (below), because the E2E app must never ship.

| Workflow | Triggered by | Does |
|----------|--------------|------|
| `app-e2e-build-android.yml`, `app-e2e-build-ios.yml` | `workflow_call` | Looks up the cache for an app built from this source (key: `e2e-android-release-v1-` / `e2e-ios-release-v1-`, then `<hash of app/, components/, …, package-lock.json, app.config.js>`; `.maestro`, tests and docs are not part of it). Only on a miss: `npm ci --legacy-peer-deps`, prebuild, then a release build with the JavaScript inside and `EXPO_PUBLIC_E2E=1` (Android `assembleRelease` x86_64, release lint off, 4 GB Gradle heap; iOS `xcodebuild -configuration Release` for the simulator, signed ad hoc so the keychain works). Saves it at once and returns the key as `app-key`. |
| `app-e2e-journeys-android.yml`, `app-e2e-journeys-ios.yml` | `workflow_call` (`app-key`, `tags`) | Restores exactly that app (`fail-on-cache-miss`: it never builds), starts WireMock on :8080, boots an API 31 emulator (Pixel Launcher off, 3 cores, 4 GB) or an iPhone 16 Pro simulator (Reduce Motion on), and runs Maestro through `.maestro/run-with-device-retry.sh` with `APP_BUILD=release`. A failure keeps screenshots, Maestro logs, logcat or host load, and WireMock's log. |
| `app-e2e-nightly.yml` | schedule 02:00 UTC, manual (`platform`, `tags`) | Build and journeys for Android and for iOS, each platform on its own so one failing build does not stop the other; every flow. |

- Bump the `-v1` in the cache key when the build steps change without the app's source changing, so no stale app is reused.
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

**Triggers:** Push to `set-up-pipeline-frontend` branch + manual.

**Jobs (3, parallel):**
- `dependency-scan`: `npm audit` -fails on critical vulns, warns on >5 high
- `license-scan`: `license-checker` -flags GPL/AGPL licenses
- `code-quality`: ESLint + TypeScript compiler + line count metrics

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
