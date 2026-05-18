# Phase 4 — Production Readiness, Monitoring & DNS Migration

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

**Firestore note:** Firestore is a project-level resource — both Cloud Run and GCE use the
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

- **SSL mode:** Full (strict) — Cloudflare ↔ origin encrypted
- **Always Use HTTPS:** On
- **Minimum TLS:** 1.2
- **Auto Minify:** Off (API only, no HTML)
- **Caching:** Bypass for `/api/*` (API responses must not be cached)
- **WAF:** Enable managed rules (OWASP Core Ruleset)
- **Rate Limiting:** 100 req/min per IP on `/api/auth/*`

---

## 5. Monitoring & Observability

### 5.1 Current State (Local Docker Compose Only)

You already have a solid monitoring stack — but it only runs locally:

| Component | Status | What it does |
|---|---|---|
| Prometheus | ✅ Local | Scrapes `/actuator/prometheus`, 10s interval |
| Grafana | ✅ Local | "Mission Control" dashboard: traffic, latency, errors, JVM, Firestore, sessions |
| Alertmanager | ✅ Local | Routes to `/dev-null` (no real receivers configured) |
| Alert rules | ✅ 15+ rules | Availability, error rate, latency, Firestore, JVM, sessions, SLOs |

### 5.2 Production Monitoring Stack

Run Prometheus + Grafana on the same GCE VM alongside the gateway. At e2-small scale
this is fine — they add ~200MB RAM combined.

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
      - "127.0.0.1:3000:3000"  # Internal only — access via SSH tunnel
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

1. **Error rate > 5%** — Alerting policy on `run.googleapis.com/request_count` with `response_code_class=5xx`
2. **P99 latency > 2s** — Alerting policy on `run.googleapis.com/request_latencies`
3. **Instance count = 0 for > 10 min during work hours** — ensures the service hasn't crashed

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

### 6.1 Cloud Run (Dev) — No Changes

The existing `gateway-build.yml` workflow continues as-is:
- Build → push to Artifact Registry → deploy to Cloud Run → run func tests
- Profile: `gcp-dev`
- This remains the CI/CD and functional test environment

### 6.2 GCE (Prod) — New Deploy Step

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

### 7.1 CORS — Add earlyroots domains

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

### 7.2 Cloudflare Validation — Update Allowed User-Agents

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
- Cloudflare absorbs this — GCE egress to Cloudflare is minimal
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
