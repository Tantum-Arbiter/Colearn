# Phase 4 -Production Readiness, Monitoring & DNS Migration

> **For LLMs / AI agents**: This document defines the production infrastructure plan.
> Read this file before making changes to deployment, monitoring, DNS, or GCP configuration.
> If you change the infrastructure approach, **update this file**.

---

## 1. Overview

Phase 4 transitions Early Roots (formerly "Grow with Freya" / "CoLearn with Freya") from a
development-only Cloud Run setup to a production-ready architecture with proper monitoring,
alerting, and cost controls.

### Architecture After Phase 4

```
Mobile App (iOS/Android)
    │
    ▼
Cloudflare (DNS + CDN + WAF)  ──  earlyroots.co.uk
    │                                   │
    ├─► api.earlyroots.co.uk ──────►  GCE e2-small (prod gateway)
    │                                   ├── Spring Boot (port 8080)
    │                                   ├── Prometheus (port 9090)
    │                                   └── Grafana (port 3000, internal only)
    │                                        │
    │                                   Firestore (shared, project-level)
    │                                   GCS bucket (earlyroots-assets)
    │
    ├─► assets via signed URLs ────►  GCS direct download
    │
    └─► Cloud Run (dev/func-tests only, unchanged)
            └── gateway-service (gcp-dev profile)
            └── functional-test Cloud Run Job
```

### DNS Migration: colearnwithfreya → earlyroots

| Old domain | New domain | Purpose |
|---|---|---|
| `colearnwithfreya.co.uk` | `earlyroots.co.uk` | Main website |
| `app.colearnwithfreya.co.uk` | `api.earlyroots.co.uk` | Gateway API |
| `assets.colearnwithfreya.co.uk` | `assets.earlyroots.co.uk` | CDN (if used) |

---

## 2. Environment Separation

| Environment | Compute | Profile | Firestore | GCS Bucket | Purpose |
|---|---|---|---|---|---|
| **Local** | Docker Compose | `dev,test` | Emulator | fake-gcs | Development |
| **GCP Dev** | Cloud Run | `gcp-dev` | Shared Firestore | `colearnwithfreya-assets` | CI/CD + func tests |
| **Production** | GCE e2-small | `prod` | Shared Firestore | `earlyroots-assets` | Live users |

**Firestore note:** Firestore is a project-level resource -both Cloud Run and GCE use the
same Firestore instance in project `apt-icon-472307-b7`. No new Firestore database needed.
Collections are isolated by design (same schema, same data).

If full data isolation is desired later, create a separate GCP project for production.

---

## 3. GCE Production VM Setup

### 3.1 VM Specification

| Property | Value |
|---|---|
| Machine type | `e2-small` (0.5 vCPU, 2 GiB) |
| Region | `europe-west1-b` (same as Cloud Run) |
| OS | Container-Optimized OS (cos-stable) |
| Disk | 10 GB balanced persistent (default) |
| IP | Static external IP |
| Service account | `gateway-prod-sa@apt-icon-472307-b7.iam.gserviceaccount.com` |

### 3.2 Service Account Roles

```
roles/datastore.user              # Firestore read/write
roles/storage.objectViewer         # GCS signed URL generation
roles/iam.serviceAccountTokenCreator  # GCS V4 signing
roles/logging.logWriter            # Cloud Logging (optional)
roles/monitoring.metricWriter      # Cloud Monitoring (optional)
```

### 3.3 Container Setup

The VM runs the same Docker image from Artifact Registry:

```bash
# Pull and run (executed by deploy script or cloud-init)
docker pull europe-west1-docker.pkg.dev/apt-icon-472307-b7/artifact-repo/gateway-service:latest

docker run -d \
  --name gateway \
  --restart always \
  -p 8080:8080 \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e FIREBASE_PROJECT_ID=apt-icon-472307-b7 \
  -e GCS_PROJECT_ID=apt-icon-472307-b7 \
  -e GCS_BUCKET=earlyroots-assets \
  -e JWT_SECRET=${JWT_SECRET} \
  -e GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID} \
  -e GOOGLE_IOS_CLIENT_ID=${GOOGLE_IOS_CLIENT_ID} \
  -e GOOGLE_ANDROID_CLIENT_ID=${GOOGLE_ANDROID_CLIENT_ID} \
  -e APPLE_CLIENT_ID=${APPLE_CLIENT_ID} \
  europe-west1-docker.pkg.dev/apt-icon-472307-b7/artifact-repo/gateway-service:latest
```

### 3.4 Firewall Rules

```bash
# Allow Cloudflare IPs only on port 8080
gcloud compute firewall-rules create allow-cloudflare-to-gateway \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=tcp:8080 \
  --source-ranges="173.245.48.0/20,103.21.244.0/22,103.22.200.0/22,103.31.4.0/22,141.101.64.0/18,108.162.192.0/18,190.93.240.0/20,188.114.96.0/20,197.234.240.0/22,198.41.128.0/17,162.158.0.0/15,104.16.0.0/13,104.24.0.0/14,172.64.0.0/13,131.0.72.0/22" \
  --target-tags=gateway-prod

# Allow SSH (your IP only, or IAP)
gcloud compute firewall-rules create allow-ssh-iap \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=tcp:22 \
  --source-ranges="35.235.240.0/20" \
  --target-tags=gateway-prod

# Deny all other ingress (default, but explicit)
gcloud compute firewall-rules create deny-all-ingress \
  --direction=INGRESS \
  --action=DENY \
  --rules=all \
  --priority=65534 \
  --target-tags=gateway-prod
```

---

## 4. Cloudflare Configuration

### 4.1 DNS Records (earlyroots.co.uk)

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `@` | Website host IP | ☁️ Proxied |
| A | `api` | GCE VM static IP | ☁️ Proxied |
| A | `assets` | GCS / CDN IP (if used) | ☁️ Proxied |
| CNAME | `www` | `earlyroots.co.uk` | ☁️ Proxied |

### 4.2 Cloudflare Settings

- **SSL mode:** Full (strict) -Cloudflare ↔ origin encrypted
- **Always Use HTTPS:** On
- **Minimum TLS:** 1.2
- **Auto Minify:** Off (API only, no HTML)
- **Caching:** Bypass for `/api/*` (API responses must not be cached)
- **WAF:** Enable managed rules (OWASP Core Ruleset)
- **Rate Limiting:** 100 req/min per IP on `/api/auth/*`

---

## 5. Monitoring & Observability

### 5.1 Current State (Local Docker Compose Only)

You already have a solid monitoring stack -but it only runs locally:

| Component | Status | What it does |
|---|---|---|
| Prometheus | ✅ Local | Scrapes `/actuator/prometheus`, 10s interval |
| Grafana | ✅ Local | "Mission Control" dashboard: traffic, latency, errors, JVM, Firestore, sessions |
| Alertmanager | ✅ Local | Routes to `/dev-null` (no real receivers configured) |
| Alert rules | ✅ 15+ rules | Availability, error rate, latency, Firestore, JVM, sessions, SLOs |

### 5.2 Production Monitoring Stack

Run Prometheus + Grafana on the same GCE VM alongside the gateway. At e2-small scale
this is fine -they add ~200MB RAM combined.

```yaml
# docker-compose.prod.yml (on GCE VM)
services:
  gateway:
    image: europe-west1-docker.pkg.dev/apt-icon-472307-b7/artifact-repo/gateway-service:latest
    ports:
      - "8080:8080"
    restart: always
    environment:
      SPRING_PROFILES_ACTIVE: prod
      FIREBASE_PROJECT_ID: apt-icon-472307-b7
      GCS_PROJECT_ID: apt-icon-472307-b7
      GCS_BUCKET: earlyroots-assets
      JWT_SECRET: ${JWT_SECRET}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_IOS_CLIENT_ID: ${GOOGLE_IOS_CLIENT_ID}
      GOOGLE_ANDROID_CLIENT_ID: ${GOOGLE_ANDROID_CLIENT_ID}
      APPLE_CLIENT_ID: ${APPLE_CLIENT_ID}
    labels:
      prometheus-scrape: "true"

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "127.0.0.1:9090:9090"  # Internal only
    volumes:
      - ./prometheus/prometheus-prod.yml:/etc/prometheus/prometheus.yml
      - ./prometheus/alerts:/etc/prometheus/alerts
    restart: always

  grafana:
    image: grafana/grafana-enterprise
    ports:
      - "127.0.0.1:3000:3000"  # Internal only -access via SSH tunnel
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
      GF_USERS_ALLOW_SIGN_UP: "false"
      GF_SERVER_ROOT_URL: "http://localhost:3000"
    volumes:
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
      - ./grafana/dashboards/dashboards.yml:/etc/grafana/provisioning/dashboards/main.yml
      - ./grafana/dashboard-definitions:/var/lib/grafana/dashboards
      - grafana-data:/var/lib/grafana
    restart: always

  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "127.0.0.1:9093:9093"  # Internal only
    volumes:
      - ./alertmanager/alertmanager-prod.yml:/etc/alertmanager/alertmanager.yml
    restart: always

volumes:
  grafana-data:
```

**Access Grafana in production:**
```bash
# SSH tunnel from your laptop
gcloud compute ssh gateway-prod --zone=europe-west1-b -- -L 3000:localhost:3000
# Then open http://localhost:3000
```

### 5.3 Alert Receivers (Production)

Update `alertmanager-prod.yml` with real notification channels:

```yaml
receivers:
  - name: 'critical-receiver'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#earlyroots-alerts'
        title: '🚨 {{ .GroupLabels.alertname }}'
        text: '{{ .CommonAnnotations.description }}'
        send_resolved: true

  - name: 'warning-receiver'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#earlyroots-warnings'
        send_resolved: true
```

**Alternative (free):** Use [Grafana OnCall](https://grafana.com/oss/oncall/) or
[UptimeRobot](https://uptimerobot.com/) (free tier: 50 monitors, 5-min checks).

### 5.4 GCP Cloud Run Monitoring (Dev/CI)

Cloud Run already exposes metrics to **GCP Cloud Monitoring** natively. No extra setup needed:

| Metric | Where | Free? |
|---|---|---|
| Request count, latency, errors | Cloud Run → Monitoring → Metrics Explorer | ✅ Yes |
| Container CPU/memory | Cloud Run → Monitoring → Metrics Explorer | ✅ Yes |
| Revision health | Cloud Run console | ✅ Yes |
| Log-based alerts | Cloud Logging → Log Router → Alerting | ✅ Yes (first 50 GiB/mo) |

**Recommended Cloud Run alerts (free, via GCP Console):**

1. **Error rate > 5%** -Alerting policy on `run.googleapis.com/request_count` with `response_code_class=5xx`
2. **P99 latency > 2s** -Alerting policy on `run.googleapis.com/request_latencies`
3. **Instance count = 0 for > 10 min during work hours** -ensures the service hasn't crashed

These complement your Docker-based Prometheus alerts for the GCE prod environment.

### 5.5 Existing Alert Rules (Carried Over)

Your `prometheus/alerts/gateway-alerts.yml` already defines 15+ rules across 7 groups.
These apply to both Cloud Run (dev) and GCE (prod) since both expose `/actuator/prometheus`:

| Group | Alert | Severity | Threshold |
|---|---|---|---|
| **Availability** | GatewayServiceDown | critical | `up == 0` for 1 min |
| **Availability** | HighErrorRate | critical | 5xx rate > 5% for 5 min |
| **Availability** | HighLatency | warning | P95 > 500ms for 5 min |
| **Firestore** | FirestoreHighErrorRate | critical | Error rate > 5% |
| **Firestore** | FirestoreSlowQueries | warning | P95 > 1s |
| **Resources** | HighHeapUsage | warning | Heap > 85% |
| **Resources** | SlowStartup | warning | Startup > 60s |
| **Sessions** | SessionSpike | warning | +50% in 5 min |
| **Sessions** | SessionDrop | warning | -50% in 5 min |
| **Users** | HighUserDeletionRate | warning | > 1/s for 5 min |
| **Users** | LoginFailureSpike | warning | 3x hourly average |
| **SLO** | AvailabilityBreach | critical | < 99.9% over 1h |
| **SLO** | LatencyBreach | warning | P99 > 1s over 1h |
| **Traffic** | TrafficDrop | critical | 90% below hourly avg |
| **Traffic** | NoTraffic | critical | 0 requests for 5 min |

---

## 6. CI/CD Changes

### 6.1 Cloud Run (Dev) -No Changes

The existing `gateway-build.yml` workflow continues as-is:
- Build → push to Artifact Registry → deploy to Cloud Run → run func tests
- Profile: `gcp-dev`
- This remains the CI/CD and functional test environment

### 6.2 GCE (Prod) -New Deploy Step

Add a new job to `gateway-build.yml` (or a separate workflow) that deploys to GCE
after Cloud Run tests pass:

```yaml
deploy-production:
  needs: run-functional-tests
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main'  # Only deploy main branch
  environment: production              # Requires manual approval
  steps:
    - name: Authenticate with GCP
      uses: google-github-actions/auth@v2
      with:
        credentials_json: ${{ secrets.GCP_SA_KEY }}

    - name: Deploy to GCE
      run: |
        gcloud compute ssh gateway-prod \
          --zone=europe-west1-b \
          --command="
            docker pull europe-west1-docker.pkg.dev/apt-icon-472307-b7/artifact-repo/gateway-service:${{ needs.build-and-push.outputs.image_tag }}
            docker stop gateway || true
            docker rm gateway || true
            docker run -d --name gateway --restart always \
              -p 8080:8080 \
              --env-file /opt/gateway/.env \
              europe-west1-docker.pkg.dev/apt-icon-472307-b7/artifact-repo/gateway-service:${{ needs.build-and-push.outputs.image_tag }}
          "

    - name: Health check
      run: |
        sleep 15
        curl -f https://api.earlyroots.co.uk/actuator/health || exit 1
```

---

## 7. Config Changes Required

### 7.1 CORS -Add earlyroots domains

Files to update:
- `gateway-service/src/main/resources/application-prod.yml`
- `gateway-service/src/main/resources/application-gcp-dev.yml`

```yaml
cors:
  allowed-origins:
    # New domains
    - https://earlyroots.co.uk
    - https://www.earlyroots.co.uk
    - https://api.earlyroots.co.uk
    - https://assets.earlyroots.co.uk
    # Legacy domains (keep during transition)
    - https://colearnwithfreya.co.uk
    - https://www.colearnwithfreya.co.uk
    - https://app.colearnwithfreya.co.uk
    - https://assets.colearnwithfreya.co.uk
```

### 7.2 Cloudflare Validation -Update Allowed User-Agents

```yaml
app:
  security:
    cloudflare:
      allowed-user-agents: EarlyRoots,GrowWithFreya,EarlyRoots-FuncTest
```

### 7.3 GCS Bucket

Create a new production bucket or rename:
```bash
gsutil mb -l europe-west1 gs://earlyroots-assets
gsutil -m rsync -r gs://colearnwithfreya-assets gs://earlyroots-assets
```

### 7.4 App Bundle ID

If changing from `com.growwithfreya.app` to an earlyroots bundle ID, this affects:
- Apple App Store Connect
- Google Play Console
- Google OAuth client IDs (new client needed)
- Apple Sign-In service ID
- RevenueCat project configuration

**Recommendation:** Keep the existing bundle ID to avoid re-submitting to stores.
Only change the user-facing brand name, not the technical identifiers.

---

## 8. Cost Breakdown

### 8.1 Fixed Monthly Costs (Launch)

| Component | Service | Cost/mo | Notes |
|---|---|---|---|
| **Gateway VM** | GCE e2-small | **$15.33** | 0.5 vCPU, 2 GiB, europe-west1, always-on |
| **Static IP** | GCE | **$2.88** | Attached to VM (free while attached, $2.88 if not) |
| **Persistent disk** | GCE 10GB balanced | **$1.00** | Boot disk |
| **Cloudflare** | Free plan | **$0** | DNS, CDN, WAF, SSL |
| **Firestore** | Free tier | **$0** | First 1 GiB storage, 50K reads/day, 20K writes/day free |
| **GCS storage** | Standard | **~$0.50** | ~20 GB story assets at $0.026/GB |
| **Artifact Registry** | Storage | **~$0.50** | Docker images, ~5 GB |
| **Cloud Run (dev)** | Pay-per-use | **~$0-2** | Func tests only, min-instances=0 |
| **Secret Manager** | 6 secrets | **$0** | First 6 active versions free |
| | | | |
| **Total (launch)** | | **~$20-22/mo** | |

### 8.2 Scaling Costs by User Base

| MAU | Firestore | GCS Egress | GCE | Total/mo |
|---|---|---|---|---|
| **1K** (soft launch) | $0 (free tier) | ~$0.50 | $15 (e2-small) | **~$20** |
| **10K** | ~$1 | ~$2 | $15 (e2-small) | **~$22** |
| **50K** | ~$4 | ~$7 | $15 (e2-small) | **~$30** |
| **100K** | ~$8 | ~$15 | $15 (e2-small) | **~$42** |
| **100K** (upgrade) | ~$8 | ~$15 | $27 (e2-medium) | **~$54** |
| **300K** | ~$25 | ~$40 | $27 (e2-medium) | **~$96** |
| **500K+** | ~$45 | ~$70 | Cloud Run (autoscale) | **~$150+** |

### 8.3 Cost Assumptions

**Firestore (per 100K MAU):**
- ~30K DAU × 20 reads/session = 600K reads/day = 18M reads/mo
- Free tier covers 1.5M reads/mo (50K/day)
- Overage: 16.5M reads × $0.036/100K = ~$6
- Writes: ~100K writes/day (profiles, sessions) = ~$2

**GCS Egress (per 100K MAU):**
- Story assets: ~15 images/story × 200KB avg = 3MB per story download
- 30K DAU × 1 story/day × 3MB = 90 GB/mo (but caching reduces this ~50%)
- Effective egress: ~50 GB × $0.12/GB = ~$6
- Signed URL responses: negligible

**GCE Network Egress (API traffic):**
- 100K MAU × 30 API calls/day × 2KB avg = 6 GB/mo
- Cloudflare absorbs this -GCE egress to Cloudflare is minimal
- ~$1/mo

### 8.4 Comparison: GCE vs Cloud Run (at 100K MAU)

| | GCE e2-small | Cloud Run (min=0) | Cloud Run (min=1) |
|---|---|---|---|
| Compute | $15/mo | ~$5-10/mo | ~$45/mo |
| Cold starts | None | 5-10s (Java) | None |
| Monitoring | Self-managed | Built-in | Built-in |
| Auto-scaling | Manual upgrade | Automatic | Automatic |
| **Total** | **~$42/mo** | **~$35/mo + bad UX** | **~$72/mo** |

**Verdict:** GCE e2-small wins until ~300K MAU where autoscaling starts to matter.

---

## 9. Task Checklist

### 9.1 Infrastructure

- [ ] Create `gateway-prod-sa` service account with required roles
- [ ] Provision GCE e2-small VM with Container-Optimized OS
- [ ] Reserve static external IP
- [ ] Configure firewall rules (Cloudflare IPs only)
- [ ] Create `earlyroots-assets` GCS bucket, sync from existing
- [ ] Store secrets in `/opt/gateway/.env` on VM (or use Secret Manager)
- [ ] Set up `docker-compose.prod.yml` on VM
- [ ] Test gateway starts and health check passes

### 9.2 DNS & Cloudflare

- [ ] Register/configure `earlyroots.co.uk` in Cloudflare
- [ ] Add A record: `api.earlyroots.co.uk` → GCE static IP
- [ ] Configure SSL Full (Strict)
- [ ] Set up WAF rules
- [ ] Add cache bypass rule for `/api/*`
- [ ] Add Cloudflare rate limiting on `/api/auth/*`
- [ ] Verify Cloudflare → GCE connectivity

### 9.3 Monitoring

- [ ] Deploy Prometheus + Grafana + Alertmanager on GCE VM
- [ ] Configure Slack/email alert receivers in alertmanager-prod.yml
- [ ] Set up UptimeRobot for external health check pings
- [ ] Create GCP Cloud Monitoring alerts for Cloud Run (dev)
- [ ] Verify Grafana dashboard loads with real prod metrics
- [ ] Set up log rotation for gateway container logs

### 9.4 Config & Code

- [ ] Update CORS origins in `application-prod.yml` (add earlyroots domains)
- [ ] Update CORS origins in `application-gcp-dev.yml` (add earlyroots domains)
- [ ] Update Cloudflare allowed user-agents
- [ ] Update `GCS_BUCKET` env var for prod to `earlyroots-assets`
- [ ] Keep legacy `colearnwithfreya` domains in CORS during transition
- [ ] **Update `eas.json` production `GATEWAY_URL`** — all three build profiles (`development`, `staging`, `production`) currently point `EXPO_PUBLIC_GATEWAY_URL` to `https://api.colearnwithfreya.co.uk`. The production profile must point to `https://api.earlyroots.co.uk` before the first store build. Dev/staging can keep the old URL during transition.
- [ ] **Add `allowed-user-agents` to `application-prod.yml` Cloudflare config** — the prod Cloudflare section has `require-validation: true` but no `allowed-user-agents` list. Without this, the Cloudflare validation filter will reject every request. Add: `allowed-user-agents: EarlyRoots,GrowWithFreya,EarlyRoots-FuncTest` (matching Section 7.2).
- [ ] **Verify `application-prod.yml` JWT property paths** — prod uses `jwt.secret` (line 86) while gcp-dev uses `app.jwt.secret` (line 34). Confirm the `JwtConfig` class resolves both paths correctly, otherwise auth will fail silently on the production VM. Run a local test with `SPRING_PROFILES_ACTIVE=prod` to validate.
- [ ] **Rebrand `app.config.js` display name** — change production app name from `'Grow with Freya'` to `'Early Roots'` (line 7). Update `associatedDomains` from `applinks:colearnwithfreya.co.uk` to `applinks:earlyroots.co.uk` (line 37). Keep `bundleIdentifier` and `package` as `com.growwithfreya.app` to avoid store re-submission.
- [ ] **Rebrand share text** — `story-selection-screen.tsx` line 767 says "Check out X on Grow with Freya!". Update to "Early Roots".
- [ ] **Rebrand notification text** — `notification-service.ts` lines 106 and 223 say "Time for Grow with Freya! 🌟". Update to "Early Roots".
- [ ] **Rename Sentry project references** — `app.json` lines 69–70 reference `project: "grow-with-freya"` and `organization: "grow-with-freya"`. Update to match the new Sentry project/org name (or rename in Sentry dashboard). Not user-facing but avoids dashboard confusion.

### 9.5 CI/CD

- [ ] Add `deploy-production` job to `gateway-build.yml`
- [ ] Configure GitHub Environment `production` with manual approval
- [ ] Test full pipeline: push → build → Cloud Run deploy → func tests → GCE deploy
- [ ] Verify health check passes after automated GCE deploy

### 9.6 App Stores (Pre-Launch)

- [ ] Configure RevenueCat production API keys in EAS Production profile
- [ ] Submit to Apple App Store review
- [ ] Submit to Google Play review
- [ ] Verify deep links / universal links use new domain
- [ ] Update app privacy policy URLs to earlyroots.co.uk

### 9.7 Security & Legal (Launch Blockers)

- [x] **Privacy policy rewrite** — updated to disclose voice recordings (on-device), Sentry (crash reports), RevenueCat (subscriptions), new brand name (Early Roots), and correct contact email (privacy@earlyroots.co.uk). Effective date set to May 23, 2026, version 2.0.
- [x] **Sentry mobile replay disabled in production** — `mobileReplayIntegration()` only loads when `__DEV__` is true. `replaysSessionSampleRate` and `replaysOnErrorSampleRate` are both `0` in production. This prevents children's screens (names, avatars) from being captured and sent to Sentry.
- [x] **CORS wildcard annotations removed** — `@CrossOrigin(origins = "*")` removed from `AuthController`, `AccountController`, `ProfileController`, and `FirebaseAuthController`. All CORS is now handled centrally via `SecurityConfig.corsConfigurationSource()`.
- [ ] **Web-based account deletion page** — Google Play requires a web URL (not just in-app) for account deletion requests. Host a simple form or info page at `https://earlyroots.co.uk/delete-account` that links to the support email or submits a deletion request to the API.
- [ ] **Sentry DSN via environment config** — move the hardcoded DSN in `sentry-service.ts` into `app.config.js` (via `extra` or env vars) so dev and prod can use different Sentry projects. Not a security issue (DSNs are client-side), but best practice for environment separation.
- [ ] **Privacy policy processor list audit** — before each submission, verify that the processor list in the privacy policy matches the actual SDKs in the app. Any new SDK (analytics, A/B testing, push notifications) must be disclosed under Section 6.
- [ ] **Rebrand Terms & Conditions screen** — `terms-conditions-screen.tsx` has 9 references to "Grow with Freya" and `support@growwithfreya.com` across both the full and embedded versions. Must match the privacy policy branding ("Early Roots", `support@earlyroots.co.uk`). Apple/Google reviewers will flag inconsistent branding between privacy policy and T&Cs.

### 9.8 Data Protection & Backup

- [ ] **Firestore scheduled exports** — set up automated Firestore exports to a GCS bucket (e.g. `gs://earlyroots-firestore-backups`) using `gcloud firestore export` on a daily cron. This provides point-in-time recovery if a bad deploy corrupts data or an accidental deletion occurs. GCS lifecycle policy can auto-delete exports older than 30 days to control costs.
- [ ] **GCS asset bucket versioning** — enable object versioning on `earlyroots-assets` so story asset overwrites can be rolled back: `gsutil versioning set on gs://earlyroots-assets`.

---

## 10. Learning Games — Interactive Education System

> Standalone game engine replacing the current story-reader-based reading challenges.
> All games run fully offline, require no backend, and target iOS + Android.
> Every game type follows the **co-engagement** principle — parent and child play together.

### 10.1 Architecture Overview

```
LearningScreen (activity list)
    │
    ├─► SpellingGameScreen  ── image-spell, word-scramble, missing-letter
    ├─► ChoiceGameScreen    ── pick-one answers (counting, matching, rhymes)
    ├─► SortingGameScreen   ── bucket-sort (recycling, emotion sorting)
    │
    └─► Shared infrastructure:
        ├── GameProgressProvider  (stars, completion tracking)
        ├── CelebrationOverlay   (star burst, wombat clap)
        ├── ProgressBar          (dots / filled stars)
        └── Word/Question packs  (data-driven, per activity ID)
```

**Key design decisions:**
- Games are **standalone screens**, not overlays on the story reader
- All content is **data-driven** — word packs, question sets, and sort items are JSON config
- Images use **existing story assets** where possible, plus bundled category illustrations
- No timers, streaks, or leaderboards — calm, warm encouragement only
- Wrong answers get a gentle shake, not a full reset (age-appropriate for 0–6)

### 10.2 Core Game Mechanics

Three reusable game screen components power all 18 activities:

#### Mechanic A: Image Spell (`SpellingGameScreen`)

Show an illustration → child taps pastel letter cards to spell the word.

```
┌──────────────────────────────┐
│  ✨  "What is this?"         │
│                              │
│    ┌──────────────────┐      │
│    │  [illustration   │      │
│    │   of a CAT]      │      │
│    └──────────────────┘      │
│                              │
│    ┌───┐  ┌───┐  ┌───┐      │  ← empty card slots (dashed border)
│    │ · │  │ · │  │ · │      │
│    └───┘  └───┘  └───┘      │
│                              │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐   │  ← shuffled pastel letter cards
│  │ A │ │ T │ │ X │ │ C │   │
│  └───┘ └───┘ └───┘ └───┘   │
│                              │
│     ⭐ ⭐ ⭐ ○ ○              │  ← progress (3/5 words done)
└──────────────────────────────┘
```

**Variants using this mechanic:**

| Activity | Age | Description | Image source |
|---|---|---|---|
| ABC Animals | 1-2 | Spell animal names: CAT, DOG, FOX, HEN, OWL | Bundled animal illustrations |
| First Words | 1-2 | Spell everyday words: CUP, BED, HAT, SUN, BUS | Bundled object illustrations |
| Colour Spelling | 1-2 | Spell colour names: RED, BLUE, PINK, GREEN | Colour swatch + object |
| Shape Names | 1-2 | Spell shapes: STAR, MOON, HEART | Shape illustrations |
| Animal Spelling | 2-4 | Longer animal names: BEAR, FROG, DUCK, FISH, BIRD | Bundled illustrations |
| Food Spelling | 2-4 | Food words: CAKE, MILK, RICE, PEAR, SOUP | Bundled illustrations |
| Nature Words | 2-4 | Nature: TREE, LEAF, RAIN, POND, SEED | Reuse story page assets |
| Garden Words | 2-4 | Garden: ROSE, SOIL, WORM, SNAIL, BEE | Bundled illustrations |
| Word Builder | 4+ | Longer words: FOREST, RABBIT, GARDEN, FLOWER | Bundled illustrations |
| Tricky Words | 4+ | Irregular spelling: NIGHT, LIGHT, KNIGHT, COULD | Bundled illustrations |

**Wrong answer behaviour:** Incorrect letter card shakes for 300ms, stays in the pool. Slot pulses gold to draw attention. No reset, no penalty — try again.

#### Mechanic B: Pick One (`ChoiceGameScreen`)

Show a prompt (image, text, number group) → child taps one answer card from 2–4 choices.

```
┌──────────────────────────────┐
│  "How many butterflies?"     │
│                              │
│      🦋  🦋  🦋              │  ← visual prompt
│                              │
│  ┌────┐   ┌────┐   ┌────┐   │
│  │  1 │   │  3 │   │  5 │   │  ← choice cards (tap one)
│  └────┘   └────┘   └────┘   │
│                              │
│     ⭐ ⭐ ○ ○ ○ ○             │  ← progress
└──────────────────────────────┘
```

**Activities using this mechanic:**

| Activity | Age | Prompt | Choices | Section |
|---|---|---|---|---|
| Letter Match | 1-2 | Uppercase letter "B" | 3 images (ball, cat, tree) — tap what starts with B | Spelling |
| First Sound | 1-2 | Image of object | 3 letter cards — tap the first letter | Spelling |
| Rhyme Match | 4+ | Word "CAT" | 3 images (hat, dog, sun) — tap the rhyme | Spelling |
| Missing Letter | 2-4 | Word with gap "C_T" | 3 letter cards (A, O, E) — tap the right one | Spelling |
| Count & Tap | 1-2 | N objects shown | 3 number cards — tap the count | Numbers |
| More or Less | 1-2 | Two groups of objects | "Which has more?" — tap left or right | Numbers |
| Number Sequence | 2-4 | "1, 2, _, 4" | 3 number cards — fill the gap | Numbers |
| Shape Counter | 2-4 | Mixed shapes, "How many circles?" | 3 number cards | Numbers |
| Simple Addition | 4+ | "2 🍎 + 3 🍎 = ?" | 3 number cards | Numbers |
| Number Patterns | 4+ | "2, 4, 6, ?" | 3 number cards | Numbers |
| Emotion Match | 2-4 | Face/expression image | 3 word cards (happy, sad, angry) | Feelings |
| Scenario Pick | 4+ | Text: "Your friend shares a toy" | 3 emotion face cards | Feelings |

**Wrong answer behaviour:** Card briefly turns red/shakes, then returns to normal. Correct answer bounces and glows. No penalty counter.

#### Mechanic C: Bucket Sort (`SortingGameScreen`)

Items appear one at a time. Child taps an item, then taps the correct bin/bucket.

```
┌──────────────────────────────┐
│  "Where does this go?"       │
│                              │
│       ┌────────────┐         │
│       │  [banana   │         │  ← current item (image + label)
│       │   peel]    │         │
│       └────────────┘         │
│                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐
│  │  🟢     │ │  🔵     │ │  ⚫     │
│  │ Recycle │ │  Food   │ │  Bin    │  ← 3 bins (tap to place)
│  │   2/4   │ │  1/3    │ │  0/2   │
│  └─────────┘ └─────────┘ └─────────┘
│                              │
│     ⭐ ⭐ ⭐ ○ ○ ○ ○ ○ ○     │
└──────────────────────────────┘
```

**Activities using this mechanic:**

| Activity | Age | Items | Buckets | Section |
|---|---|---|---|---|
| Colour Counting | 1-2 | Coloured objects | 3 colour bins (red, blue, yellow) | Numbers |
| Recycling Sort | 2-4 | Waste items (can, peel, wrapper, paper, bottle) | 3 bins (recycle ♻️, food waste 🥬, general ⬛) | Numbers |
| Toy Counting | 2-4 | Toy items | Numbered bins (1, 2, 3) — "How many of this toy?" | Numbers |
| Fruit Counting | 2-4 | Fruit items | Numbered bins | Numbers |
| Garden Counting | 2-4 | Garden items (bugs, flowers, leaves) | Numbered bins | Numbers |
| Feeling Sort | 2-4 | Emotion face cards | 2 bins ("Feels good 😊" / "Feels tricky 😟") | Feelings |
| Kindness Quest | 2-4 | Action cards ("sharing", "pushing") | 2 bins ("Kind ❤️" / "Not kind") | Feelings |
| Friendship Stories | 2-4 | Scenario cards | 2 bins ("Good friend" / "Not yet") | Feelings |

**Correct placement:** Item floats into bin with a satisfying pop + counter increments. **Wrong:** Bin shakes, item bounces back.

### 10.3 Data Model

```typescript
// ── Spelling packs ──────────────────────────────────────────
interface SpellingWord {
  word: string;                   // Target word: "CAT"
  imageKey: string;               // Asset key for illustration
  distractors: string[];          // Extra letters to shuffle in: ["X", "Z"]
  hint?: string;                  // Optional hint text
}

interface SpellingPack {
  id: string;                     // Matches activity ID: "abc-animals"
  words: SpellingWord[];          // 5-8 words per pack
  ageRange: AgeRange;
}

// ── Choice questions ────────────────────────────────────────
interface ChoiceQuestion {
  promptType: 'image' | 'text' | 'count' | 'sequence';
  promptImageKey?: string;        // Image to show
  promptText?: string;            // Text/number to show
  promptItems?: number;           // Count of objects to display
  choices: ChoiceOption[];        // 2-4 answer options
  correctIndex: number;           // Index of correct answer
}

interface ChoiceOption {
  type: 'text' | 'image' | 'number';
  value: string;                  // Display text, number, or image key
}

interface ChoicePack {
  id: string;                     // Matches activity ID
  questions: ChoiceQuestion[];    // 5-10 questions per pack
  ageRange: AgeRange;
}

// ── Sorting items ───────────────────────────────────────────
interface SortItem {
  imageKey: string;               // Item illustration
  label: string;                  // Item name
  correctBucket: number;          // Index of correct bucket (0-based)
}

interface SortBucket {
  label: string;                  // Bucket name: "Recycle"
  color: string;                  // Bucket colour: "#22C55E"
  icon: string;                   // Ionicons name
  capacity: number;               // How many items go here
}

interface SortPack {
  id: string;                     // Matches activity ID
  items: SortItem[];              // 6-12 items to sort
  buckets: SortBucket[];          // 2-3 buckets
  ageRange: AgeRange;
}

// ── Progress tracking ───────────────────────────────────────
interface GameProgress {
  activityId: string;
  completedAt?: number;           // Timestamp of last completion
  starsEarned: number;            // 0-3 stars (0 = not attempted)
  attempts: number;               // Total play count
}
```

### 10.4 Image Assets Required

| Category | Count | Format | Size target | Source |
|---|---|---|---|---|
| Animals | 15 | WebP | 200×200 | New bundled illustrations |
| Food | 10 | WebP | 200×200 | New bundled illustrations |
| Nature | 10 | WebP | 200×200 | Reuse story page crops + new |
| Colours/shapes | 8 | WebP | 200×200 | Simple generated assets |
| Recycling items | 12 | WebP | 200×200 | New bundled illustrations |
| Emotion faces | 8 | WebP | 200×200 | Reuse emotion card assets |
| Number objects | 10 | WebP | 200×200 | Simple generated assets |
| **Total** | **~73** | | **~1.5 MB** | |

All images bundled in-app for offline play. No network dependency.

### 10.5 Reward System

**Per-round feedback (calm, not addictive):**
- Correct answer → card glows, gentle chime sound
- Complete a word/question → progress dot fills with star
- All wrong attempts → encouraging text ("Try again!"), no penalty

**Per-pack completion:**
- Stars earned based on accuracy: 3⭐ (no mistakes), 2⭐ (1-2 mistakes), 1⭐ (completed)
- Wombat character celebration animation
- "Well done!" screen with collected stars
- Return to activity list with star badge on completed card

**Persistent tracking (stored in AsyncStorage):**
- Stars per activity (visible on activity cards in LearningScreen)
- Total stars across all activities
- No timers, streaks, or leaderboards

### 10.6 Test Plan

#### Unit Tests

| Test file | Covers | Cases |
|---|---|---|
| `__tests__/games/spelling-game.test.tsx` | SpellingGameScreen | Renders word image, letter cards appear shuffled, correct tap places letter, wrong tap shakes card, all letters placed → completion, progress bar updates, back button works |
| `__tests__/games/choice-game.test.tsx` | ChoiceGameScreen | Renders prompt (image/text/count), choice cards appear, correct tap advances, wrong tap shakes, all questions → completion, different prompt types render correctly |
| `__tests__/games/sorting-game.test.tsx` | SortingGameScreen | Renders current item, buckets display with labels, correct sort → item enters bin, wrong sort → item bounces, all items sorted → completion, bucket counts update |
| `__tests__/games/game-progress.test.tsx` | GameProgressProvider | Stars calculated correctly (3/2/1), progress persists to AsyncStorage, progress loads on mount, reset clears progress |
| `__tests__/games/celebration-overlay.test.tsx` | CelebrationOverlay | Shows stars earned, shows wombat animation, continue button returns to list |
| `__tests__/games/word-packs.test.ts` | Word/question data | All packs have required fields, all image keys map to real assets, no duplicate IDs, distractor letters don't duplicate target letters, correct indices are in bounds |

#### Integration Tests

| Test | What it validates |
|---|---|
| Activity card → game screen | Tapping an activity opens the correct game type with correct pack data |
| Game completion → progress | Finishing a game updates the activity card with star badge |
| Back button mid-game | Navigating back doesn't crash, no progress saved for incomplete games |
| Orientation | Games render correctly in portrait (phone) and landscape (tablet) |
| Accessibility | All interactive elements have accessibility labels, scaled font sizes work |
| Offline | All games work with airplane mode (no network calls) |

#### Type Safety

```bash
# All game data packs validated at compile time
npx tsc --noEmit
```

### 10.7 Implementation Phases

#### Phase A: Foundation (Week 1)

- [ ] Define TypeScript types for `SpellingPack`, `ChoicePack`, `SortPack`, `GameProgress`
- [ ] Create `GameProgressProvider` (AsyncStorage-backed star tracking)
- [ ] Create `CelebrationOverlay` component (star burst + continue button)
- [ ] Create `ProgressBar` component (filled dots/stars)
- [ ] Write unit tests for progress provider and celebration overlay
- [ ] Update `LearningActivity` interface: replace `storyId` with `gameType` + `packId`
- [ ] Update `_layout.tsx` navigation: route to game screens instead of `StoryBookReader`

#### Phase B: SpellingGameScreen (Week 2)

- [ ] Build `SpellingGameScreen` component (image + letter card slots + pool)
- [ ] Reuse pastel letter card styles from `ReadingChallengeUI`
- [ ] Create word packs for all 10 spelling activities (50-80 words total)
- [ ] Source/create ~35 bundled illustrations (animals, food, nature, objects)
- [ ] Add wrong-answer shake animation (Reanimated)
- [ ] Add correct-answer glow animation
- [ ] Wire up progress tracking + celebration on pack completion
- [ ] Write unit tests for SpellingGameScreen
- [ ] Test on iOS and Android devices

#### Phase C: ChoiceGameScreen (Week 3)

- [ ] Build `ChoiceGameScreen` component (prompt area + choice cards)
- [ ] Support all 4 prompt types: image, text, count, sequence
- [ ] Create question packs for all 12 choice activities (60-120 questions total)
- [ ] Source/create ~20 illustrations for counting and matching prompts
- [ ] Add answer feedback animations (correct bounce, wrong shake)
- [ ] Wire up progress tracking + celebration
- [ ] Write unit tests for ChoiceGameScreen
- [ ] Test on iOS and Android devices

#### Phase D: SortingGameScreen (Week 4)

- [ ] Build `SortingGameScreen` component (item display + bucket bins)
- [ ] Add item-to-bucket placement animation (float into bin)
- [ ] Create sort packs: recycling (12 items), emotions (8 items), colours (8 items)
- [ ] Source/create ~12 recycling item illustrations
- [ ] Reuse emotion card assets for feeling sort
- [ ] Add bucket counter + capacity visuals
- [ ] Wire up progress tracking + celebration
- [ ] Write unit tests for SortingGameScreen
- [ ] Test on iOS and Android devices

#### Phase E: Polish & QA (Week 5)

- [ ] Integration test: full flow from activity list → game → completion → stars on card
- [ ] Accessibility audit: all elements labelled, font scaling works, high contrast
- [ ] Tablet layout testing (iPad landscape)
- [ ] RTL language testing (Arabic)
- [ ] Add haptic feedback on taps (already using expo-haptics)
- [ ] Performance profiling: ensure 60fps during animations
- [ ] Sound effects: gentle chime on correct, soft thud on wrong (optional)
- [ ] Update LearningTipsOverlay to explain new game mechanics
- [ ] Update all 14 locale files with any new translation keys
- [ ] Final pass: remove old `wombat-spelling` / `wombat-word-placing` story routing

### 10.8 Platform Compatibility

| Feature | iOS | Android | Web | Notes |
|---|---|---|---|---|
| SpellingGameScreen | ✅ | ✅ | ✅ | Pressable + Reanimated |
| ChoiceGameScreen | ✅ | ✅ | ✅ | Pressable + Reanimated |
| SortingGameScreen | ✅ | ✅ | ✅ | Pressable + Reanimated (no drag-and-drop) |
| Haptic feedback | ✅ | ✅ | ❌ | expo-haptics (graceful no-op on web) |
| AsyncStorage progress | ✅ | ✅ | ✅ | Already SSR-guarded |
| Bundled images | ✅ | ✅ | ✅ | require() / asset modules |
| Offline play | ✅ | ✅ | ✅ | No network calls |
| Portrait + landscape | ✅ | ✅ | ✅ | useWindowDimensions responsive |
| Accessibility scaling | ✅ | ✅ | ✅ | useAccessibility hook |

### 10.9 Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| Image asset creation bottleneck | High — blocks Phases B-D | Start with emoji/Ionicons fallbacks, swap real illustrations later |
| Word pack localisation | Medium — 14 languages × 80+ words | Phase 1: English only. Add translations in subsequent release |
| Reanimated perf on low-end Android | Low — animations are simple | Test on budget Android devices early. Use `withTiming` not spring physics |
| Scope creep into drag-and-drop | Medium — complex gesture handling | Strict tap-only mechanics. No `PanGestureHandler` in v1 |
| Breaking existing reading challenges | Low — ReadingChallengeUI stays | Keep story-reader reading challenges intact. New games are additive |

---

## 11. Parent Scaffolding Guides — Long-Press Experience Tips

> **Core idea:** Long-press (hold) any activity card, story card, or content tile across every
> sub-menu to reveal a parent-facing guide explaining what the content is, how to engage with
> it together, and top tips for maximising developmental value.
>
> This directly supports the **co-engagement** principle — the app is used by parent and child
> together. Parents often don't know *how* to scaffold a learning moment. We tell them.

### 11.1 Interaction Pattern

```
  ┌─────────────────────────────────┐
  │  Long-press any card (500ms)    │
  │                                 │
  │  ┌───────────────────────────┐  │
  │  │  ✨ ABC Animals            │  │
  │  │                           │  │
  │  │  WHAT IT IS               │  │
  │  │  Your child sees pictures │  │
  │  │  of animals and spells    │  │
  │  │  their names by tapping   │  │
  │  │  letter cards.            │  │
  │  │                           │  │
  │  │  HOW TO PLAY TOGETHER     │  │
  │  │  • Say the animal name    │  │
  │  │    out loud together      │  │
  │  │  • Sound out each letter  │  │
  │  │  • Celebrate every try    │  │
  │  │                           │  │
  │  │  💡 TOP TIPS               │  │
  │  │  • Ask "What sound does   │  │
  │  │    a cat make?" after     │  │
  │  │  • Connect to real life:  │  │
  │  │    "We saw a dog today!"  │  │
  │  │  • No rush — let them     │  │
  │  │    explore at their pace  │  │
  │  │                           │  │
  │  │  🌱 WHAT THEY'RE LEARNING  │  │
  │  │  Letter recognition,      │  │
  │  │  phonics awareness,       │  │
  │  │  fine motor skills        │  │
  │  │                           │  │
  │  │  Ages 1-2  ·  5 words     │  │
  │  │                           │  │
  │  │  ┌────────┐  ┌─────────┐  │  │
  │  │  │  Play  │  │  Close  │  │  │
  │  │  └────────┘  └─────────┘  │  │
  │  └───────────────────────────┘  │
  └─────────────────────────────────┘
```

**Trigger:** `onLongPress` (500ms hold) on any content card. Haptic feedback on trigger.
**Dismiss:** Tap "Close", tap outside, or swipe down.
**Play:** Opens the activity/story directly from the guide.

### 11.2 Guide Sections

Every guide has 4 consistent sections, regardless of content type:

| Section | Purpose | Tone |
|---|---|---|
| **What It Is** | Plain-English description of what the child will see and do | Informative, simple |
| **How to Play Together** | 3-4 bullet points on how the parent can actively participate | Encouraging, actionable |
| **Top Tips** | 2-3 scaffolding tips connecting the activity to real-world learning | Warm, practical |
| **What They're Learning** | Developmental skills being exercised (tagged from a fixed taxonomy) | Educational, concise |

Plus metadata: age range, duration/word count, and a "Play" button.

### 11.3 Where It Appears

Guides apply to **every sub-menu** in the app, not just learning:

| Section | Card type | Example guide content |
|---|---|---|
| **Stories** | Story cards | What the story is about, themes to discuss, questions to ask after reading, literacy skills |
| **Stories — Musical** | Musical story cards | How the music challenge works, how to clap along, rhythm & timing skills |
| **Stories — Interactive** | Interactive story cards | What touch elements to look for, how to let the child discover, cause-and-effect learning |
| **Stories — Jigsaw** | Jigsaw story cards | How to help without doing it for them, spatial awareness skills, patience building |
| **Spelling** | Activity cards | What words they'll spell, how to sound out letters together, phonics skills |
| **Numbers** | Activity cards | What maths concepts are covered, how to count objects in real life, number sense |
| **Feelings** | Activity cards | What emotions are explored, how to ask "when do you feel this?", emotional literacy |
| **Instruments** | Instrument cards | How the instrument sounds, how to move/dance together, musical awareness |
| **Practise** | Song cards | What the song teaches, how to sing along, rhythm & memory skills |
| **Free Play** | Instrument selection | How free play works, how to encourage experimentation, creative expression |

### 11.4 Data Model

```typescript
interface ScaffoldingGuide {
  /** Unique key matching the content ID (activity ID, story ID, song ID, etc.) */
  contentId: string;

  /** What this content is — shown as the first section */
  whatItIs: string;

  /** How parent and child can engage together — 3-4 bullet points */
  howToPlay: string[];

  /** Top tips for maximising developmental value — 2-3 bullets */
  topTips: string[];

  /** Developmental skills being exercised */
  learningOutcomes: DevelopmentalSkill[];

  /** Optional age suitability note beyond the age badge */
  ageNote?: string;
}

/** Fixed taxonomy of developmental skills — consistent across all guides */
type DevelopmentalSkill =
  // Literacy & language
  | 'letter-recognition'
  | 'phonics-awareness'
  | 'vocabulary'
  | 'reading-comprehension'
  | 'spelling'
  | 'storytelling'
  // Numeracy
  | 'counting'
  | 'number-recognition'
  | 'addition-subtraction'
  | 'patterns'
  | 'sorting-categorisation'
  | 'spatial-awareness'
  // Social & emotional
  | 'emotional-literacy'
  | 'empathy'
  | 'self-regulation'
  | 'turn-taking'
  | 'patience'
  // Motor & sensory
  | 'fine-motor'
  | 'rhythm-timing'
  | 'listening'
  | 'hand-eye-coordination'
  // Creative
  | 'creative-expression'
  | 'imagination'
  | 'problem-solving'
  // Values
  | 'environmental-awareness'
  | 'kindness';

/** Human-readable labels for each skill (translatable) */
const SKILL_LABELS: Record<DevelopmentalSkill, string> = {
  'letter-recognition': 'Letter Recognition',
  'phonics-awareness': 'Phonics Awareness',
  'vocabulary': 'Vocabulary',
  'reading-comprehension': 'Reading Comprehension',
  'spelling': 'Spelling',
  'storytelling': 'Storytelling',
  'counting': 'Counting',
  'number-recognition': 'Number Recognition',
  'addition-subtraction': 'Addition & Subtraction',
  'patterns': 'Patterns',
  'sorting-categorisation': 'Sorting & Categorisation',
  'spatial-awareness': 'Spatial Awareness',
  'emotional-literacy': 'Emotional Literacy',
  'empathy': 'Empathy',
  'self-regulation': 'Self-Regulation',
  'turn-taking': 'Turn-Taking',
  'patience': 'Patience',
  'fine-motor': 'Fine Motor Skills',
  'rhythm-timing': 'Rhythm & Timing',
  'listening': 'Listening',
  'hand-eye-coordination': 'Hand-Eye Coordination',
  'creative-expression': 'Creative Expression',
  'imagination': 'Imagination',
  'problem-solving': 'Problem Solving',
  'environmental-awareness': 'Environmental Awareness',
  'kindness': 'Kindness',
};
```

### 11.5 Example Guides

#### Spelling — "ABC Animals" (ages 1-2)

| Section | Content |
|---|---|
| **What It Is** | Your child sees a picture of an animal and spells its name by tapping colourful letter cards into the right order. |
| **How to Play Together** | • Say the animal name out loud before they start spelling · • Point to each letter and say its sound: "C says 'kuh'" · • If they're stuck, say the next letter sound as a hint · • Clap and cheer when they complete a word |
| **Top Tips** | • Ask "What sound does a cat make?" to extend the moment · • Connect to real life: "We saw a dog in the park!" · • Let them try wrong letters — it's part of learning |
| **What They're Learning** | Letter Recognition, Phonics Awareness, Fine Motor Skills, Vocabulary |

#### Numbers — "Recycling Sort" (ages 2-4)

| Section | Content |
|---|---|
| **What It Is** | Items appear one at a time — your child taps the right bin to sort recycling, food waste, and general rubbish. |
| **How to Play Together** | • Talk about each item: "A banana peel — where does that go?" · • Let them guess before tapping · • If wrong, explain why: "Plastic bottles can be recycled!" · • Count the items in each bin together |
| **Top Tips** | • After playing, do a real sorting activity with household items · • Talk about why recycling matters — keep it simple and positive · • Praise the effort, not just the right answers |
| **What They're Learning** | Sorting & Categorisation, Environmental Awareness, Problem Solving, Counting |

#### Stories — "Snuggle Little Wombat" (musical mode)

| Section | Content |
|---|---|
| **What It Is** | A gentle bedtime story about a wombat finding a cosy place to sleep, with musical challenges where your child plays along with instruments. |
| **How to Play Together** | • Read the words out loud together in a calm, sleepy voice · • When the music challenge appears, help them tap along · • Ask "Where do you think Wombat will sleep?" · • Use it as part of your bedtime routine |
| **Top Tips** | • Tap the rhythm together — clap or pat your knees · • After the story, ask "What was your favourite part?" · • Re-read it — repetition builds comprehension and comfort |
| **What They're Learning** | Listening, Rhythm & Timing, Reading Comprehension, Imagination, Vocabulary |

### 11.6 UI Component — `ScaffoldingGuideModal`

```
Component: ScaffoldingGuideModal
Props:
  visible: boolean
  guide: ScaffoldingGuide | null
  contentTitle: string
  contentImage?: ImageSource
  ageRange?: string
  onPlay: () => void
  onClose: () => void

Visual style:
  - Bottom sheet modal (slides up from bottom, 80% screen height)
  - Semi-transparent dark backdrop
  - Rounded top corners (24px radius)
  - Soft gradient background matching app theme (deep navy → midnight)
  - Each section has a small icon (Ionicons) + heading + body text
  - Developmental skills shown as small pastel pill badges
  - "Play" button uses the activity's accent colour
  - "Close" is a grey text button or X icon
```

### 11.7 Implementation Checklist

#### Data & Types

- [ ] Define `ScaffoldingGuide` interface and `DevelopmentalSkill` type in `types/`
- [ ] Define `SKILL_LABELS` lookup (translatable via i18n keys)
- [ ] Create guide data files per section: `data/guides/spelling-guides.ts`, `data/guides/story-guides.ts`, etc.
- [ ] Write guides for all existing content (~45 guides across all sections)

#### Component

- [ ] Build `ScaffoldingGuideModal` bottom sheet component
- [ ] Add developmental skill pill badges (pastel rounded chips)
- [ ] Add "Play" and "Close" action buttons
- [ ] Support content image/icon in the header
- [ ] Haptic feedback on long-press trigger
- [ ] Smooth slide-up animation (Reanimated `withTiming`)

#### Integration Points

- [ ] **LearningScreen** — add `onLongPress` to activity cards → show guide
- [ ] **StorySelectionScreen** — add `onLongPress` to story cards → show guide
- [ ] **PractiseScreen** — add `onLongPress` to song cards → show guide
- [ ] **FreeplayScreen** — add `onLongPress` to instrument selection → show guide
- [ ] **InstrumentCarousel** — add `onLongPress` to instrument cards → show guide
- [ ] **CatalogStoryCard** — add `onLongPress` to catalog entries → show guide

#### Localisation

- [ ] Add all guide text to `locales/en/index.ts` under `scaffolding.*` namespace
- [ ] Add `DevelopmentalSkill` labels to all 14 locale files
- [ ] Section headings: `scaffolding.whatItIs`, `scaffolding.howToPlay`, `scaffolding.topTips`, `scaffolding.whatTheyLearn`

#### Tests

- [ ] Unit test: `ScaffoldingGuideModal` renders all 4 sections
- [ ] Unit test: "Play" button calls `onPlay`, "Close" calls `onClose`
- [ ] Unit test: developmental skill pills render from guide data
- [ ] Unit test: modal doesn't render when `visible=false`
- [ ] Integration test: long-press on activity card opens correct guide
- [ ] Integration test: long-press on story card opens correct guide
- [ ] Data test: every content ID in the app has a matching guide entry (no gaps)
- [ ] Accessibility test: all guide text is readable by screen readers, fonts scale
