# CI/CD Pipelines

> **For LLMs / AI agents**: This README is the authoritative reference for all CI/CD workflows.
> Read this file before modifying any workflow. If you change a pipeline, **update this file**.

## Overview

The project has **8 GitHub Actions workflows** across 3 domains: frontend app, backend gateway,
and CMS content. All workflows use **concurrency control** to prevent simultaneous runs on the
same branch — newer runs cancel in-progress ones.

## Workflow Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Expo/React Native)                 │
│                                                                     │
│  grow-with-freya-ci-cd.yml ──→ test-and-lint                       │
│    (push/PR to main/develop)    ├─→ type-check                     │
│                                 ├─→ security-audit                  │
│                                 └─→ build-web ──→ lighthouse ──→ summary │
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

### 1. grow-with-freya-ci-cd.yml — Frontend CI/CD

**Triggers:** Push to `main`/`develop` or PR targeting those branches, when `grow-with-freya/**` changes.

**Jobs (5, with dependencies):**

| Job | Depends On | Purpose |
|-----|-----------|---------|
| `test-and-lint` | — | `npm run lint` + `npm run test:ci` with coverage |
| `type-check` | — | `npx tsc --noEmit` (parallel with test) |
| `security-audit` | — | `npm audit --audit-level=high` (parallel) |
| `build-web` | all 3 above | `npx expo export --platform web` (push only) |
| `lighthouse` | build-web | Lighthouse CI performance audit |
| `pipeline-summary` | all above | GitHub Step Summary with results |

**Key decisions:**
- `--legacy-peer-deps` is required due to React Native dependency conflicts
- `NODE_OPTIONS=--max-old-space-size=4096` prevents OOM on test runs
- Web build artifacts retained 30 days
- Build only runs on push (not PRs) to save CI minutes
- No automatic native builds — those go through EAS (see below)

### 2. deploy-eas.yml — EAS Build (Manual)

**Triggers:** `workflow_dispatch` only (never automatic).

**Flow:** Checks that the latest CI pipeline passed → runs `eas build` for selected platform/profile.

**Inputs:**
- `environment`: development / preview / production
- `platform`: ios / android / all
- `wait_for_build`: whether to block until EAS completes

**Key decisions:**
- Deliberately manual — native builds cost money on EAS and take 15–30 min
- Validates CI status before building to prevent shipping broken code
- Uses `EXPO_TOKEN` and `SENTRY_AUTH_TOKEN` secrets

### 3. security-scan.yml — Security Audit

**Triggers:** Push to `set-up-pipeline-frontend` branch + manual.

**Jobs (3, parallel):**
- `dependency-scan`: `npm audit` — fails on critical vulns, warns on >5 high
- `license-scan`: `license-checker` — flags GPL/AGPL licenses
- `code-quality`: ESLint + TypeScript compiler + line count metrics

### 4. gateway-build.yml — Backend CI/CD

**Triggers:** Push when `gateway-service/**`, `infra/**`, or `func-tests/**` changes.

**Flow:** Build → Test → Docker build → Push to GCR → Deploy to Cloud Run → Run functional tests.

**Key decisions:**
- Docker image pushed to `europe-west1-docker.pkg.dev` (Artifact Registry)
- Cloud Run deployed in `europe-west1` region
- Functional test job is deployed as a **Cloud Run Job** (not a workflow step) for isolation
- Functional tests use a Firebase ID token for auth (`GCP_FIREBASE_ID_TOKEN`)
- Test reports uploaded to `colearnwithfreya-test-reports` GCS bucket

### 5. func-tests-build.yml — Functional Test Image

**Triggers:** Push when `func-tests/**` changes.

Builds and pushes the Cucumber functional test Docker image to GCR. This image is used by
the Cloud Run Job triggered from `gateway-build.yml`.

### 6. nft-tests-build.yml — Performance Test Image

**Triggers:** `workflow_dispatch` only (push trigger disabled).

Builds a Gatling (Scala) performance test image and pushes to GHCR. Uses `eclipse-temurin:17-jdk`
base image. Currently dormant — will be re-enabled after security scan workflow is verified.

### 7. cms-stories-sync.yml — CMS Content Deploy

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

### 8. cms-stories-delete.yml — Story Deletion

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
