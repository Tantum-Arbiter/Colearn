# Phase 5 — Scaling, White-Labelling & Growth Optimisation

> **For LLMs / AI agents**: This document defines the scaling, white-labelling, and growth
> optimisation roadmap for the CoLearn platform and its client apps (e.g. Early Roots).
> Read this file before making changes to multi-tenancy, paywall optimisation, or platform architecture.
> If you change the approach, **update this file**.

---

## 1. Overview

Phase 5 transforms the CoLearn Web API from a single-app backend into a **multi-tenant
white-label platform** capable of serving multiple client apps concurrently. It also introduces
growth-stage tooling (Superwall, analytics, experimentation) and codifies security and
operational best practices for scaling to hundreds of thousands of users.

### Architecture Vision (Post Phase 5)

```
┌─────────────────────────────────────────────────────────────┐
│                    CoLearn Platform API                      │
│              (gateway-service on GCE / Cloud Run)           │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────┐  │
│  │ Auth     │  │ Content  │  │ Tenant Management        │  │
│  │ Service  │  │ Service  │  │ (app registry, config,   │  │
│  │          │  │          │  │  feature flags, branding) │  │
│  └──────────┘  └──────────┘  └──────────────────────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────┐  │
│  │ Asset    │  │ Analytics│  │ Rate Limiting / Quotas   │  │
│  │ Service  │  │ Service  │  │ (per-tenant)             │  │
│  └──────────┘  └──────────┘  └──────────────────────────┘  │
└─────────────────┬──────────────────┬────────────────────────┘
                  │                  │
    ┌─────────────┴──┐        ┌──────┴─────────┐
    │  Early Roots   │        │  Future App B  │
    │  (iOS/Android) │        │  (iOS/Android) │
    │                │        │                │
    │  RevenueCat    │        │  RevenueCat    │
    │  Superwall     │        │  Superwall     │
    │  Sentry        │        │  Sentry        │
    └────────────────┘        └────────────────┘
```

---

## 2. White-Labelling the CoLearn Web API

### 2.1 Tenant Model

Each client app is a **tenant**. The platform identifies tenants via a header or API key
sent with every request.

**New header:** `X-Tenant-ID` (e.g. `early-roots`, `app-b`)

| Concept | Current State | Target State |
|---|---|---|
| App identification | Hardcoded to "Grow with Freya" | Tenant ID in request header |
| Content isolation | Single GCS bucket, shared stories | Per-tenant GCS prefix or bucket |
| User isolation | Single Firestore collection | Tenant-scoped subcollections or prefixed document IDs |
| Auth config | Single set of OAuth client IDs | Per-tenant OAuth config (loaded from Firestore) |
| Branding | Hardcoded in `Server` header, root controller | Per-tenant branding config |
| Rate limits | Global | Per-tenant configurable limits |

### 2.2 Firestore Data Isolation

**Option A — Subcollection per tenant (recommended for <10 tenants):**
```
tenants/{tenantId}/users/{userId}
tenants/{tenantId}/user_profiles/{userId}
tenants/{tenantId}/sessions/{sessionId}
tenants/{tenantId}/stories/{storyId}
tenants/{tenantId}/content_versions/{versionId}
```

**Option B — Separate GCP projects (for strict data isolation):**
Each tenant gets its own Firestore database in a separate GCP project. More expensive,
but required if tenants demand contractual data isolation (e.g. enterprise / government).

**Recommendation:** Start with Option A. Migrate individual tenants to Option B only
when contractual or regulatory requirements demand it.

### 2.3 GCS Asset Isolation

```
gs://colearn-platform-assets/
  ├── early-roots/
  │   ├── stories/
  │   ├── music/
  │   └── images/
  ├── app-b/
  │   ├── stories/
  │   └── images/
  └── shared/              ← Cross-tenant shared assets (e.g. UI icons)
```

Signed URLs are scoped to the tenant's prefix — a tenant can never generate a URL
pointing to another tenant's assets.

### 2.4 Backend Changes Required

| Component | Change | Effort |
|---|---|---|
| **TenantFilter** (new) | Extract `X-Tenant-ID` from request, validate against registry, set in `ThreadLocal` | Small |
| **TenantContext** (new) | `ThreadLocal<String>` holder; all repositories read from this | Small |
| **All Repositories** | Prefix Firestore paths with `tenants/{tenantId}/` | Medium |
| **AssetService** | Scope GCS paths to tenant prefix | Small |
| **SecurityConfig** | Load per-tenant OAuth client IDs from Firestore `tenants/{id}/config` | Medium |
| **RateLimitingFilter** | Per-tenant rate limit buckets | Small |
| **RootController** | Return tenant-specific branding in health/root responses | Trivial |
| **Tenant Admin API** (new) | CRUD for tenant registration, config, feature flags | Medium |

### 2.5 Client App Changes

Each client app sets `X-Tenant-ID` in its API client:

```typescript
// api-client.ts
const TENANT_ID = Constants.expoConfig?.extra?.tenantId || 'early-roots';

headers: {
  'X-Tenant-ID': TENANT_ID,
  'Authorization': `Bearer ${token}`,
  'User-Agent': `EarlyRoots/${version} (${platform})`,
}
```

Add to `app.config.js`:
```javascript
extra: {
  tenantId: 'early-roots',
  // ... existing config
}
```

### 2.6 Tenant Onboarding Checklist

When adding a new client app to the platform:

1. [ ] Register tenant in Firestore `tenants` collection with config (name, bundle IDs, OAuth client IDs)
2. [ ] Create GCS prefix `gs://colearn-platform-assets/{tenant-id}/`
3. [ ] Upload initial content (stories, assets) via CMS pipeline
4. [ ] Configure OAuth credentials (Google + Apple) for the new bundle ID
5. [ ] Create RevenueCat project for the new app
6. [ ] Set up Sentry project for the new app
7. [ ] Configure rate limits and feature flags
8. [ ] Build and deploy the client app with correct `tenantId` in config

---

## 3. Superwall Integration (Growth Stage)

### 3.1 When to Integrate

| Metric | Threshold | Action |
|---|---|---|
| Monthly Active Users | < 5,000 | **Don't integrate.** Focus on acquisition. |
| Monthly Active Users | 5,000 – 20,000 | **Consider integrating.** You have enough traffic to A/B test. |
| Monthly Active Users | > 20,000 | **Integrate.** Paywall conversion optimisation becomes high-ROI. |
| Paywall conversion rate | < 3% and stable | **Integrate.** You need to test different approaches. |
| Paywall conversion rate | > 5% | **Don't prioritise.** Your existing paywall is performing well. |

### 3.2 What Superwall Does (And Doesn't Do)

**Superwall is a remote paywall UI layer.** It does NOT replace RevenueCat.

```
User action triggers paywall
    │
    ▼
Superwall SDK decides:
  - Which paywall template to show (A/B variant)
  - When to show it (event-based triggers)
  - What copy / layout / imagery to use
    │
    ▼
User taps "Subscribe"
    │
    ▼
RevenueCat SDK processes the actual payment
    │
    ▼
Entitlement granted → content unlocked
```

**Value proposition:**
- Test 3–5 paywall designs without shipping app updates
- Trigger paywalls on specific events (e.g. "user_tapped_locked_story_3rd_time")
- Segment users (new vs returning, geography, device) and show different paywalls
- Real-time conversion analytics per variant
- Kill underperforming paywalls instantly

### 3.3 Integration Steps

#### Step 1: Install SDK

```bash
npx expo install @superwall/react-native-superwall
```

#### Step 2: Initialise in App Layout

```typescript
// app/_layout.tsx
import Superwall from '@superwall/react-native-superwall';

useEffect(() => {
  Superwall.configure({
    apiKey: process.env.EXPO_PUBLIC_SUPERWALL_API_KEY,
  });
  // Connect Superwall to RevenueCat
  Superwall.setPurchaseController({
    purchaseProduct: async (product) => {
      // Use RevenueCat to handle the actual purchase
      const result = await purchasePackage(product);
      return result;
    },
    restorePurchases: async () => {
      return await restorePurchases();
    },
  });
}, []);
```

#### Step 3: Replace Direct Paywall Calls

**Before (current):**
```typescript
// Direct paywall
setSubscriptionOverlayVisible(true);
```

**After (with Superwall):**
```typescript
// Event-based paywall — Superwall decides what to show
Superwall.register('locked_content_tapped');
```

#### Step 4: Configure Paywalls in Superwall Dashboard

Create paywall templates in the Superwall dashboard (no code required):
- **Variant A:** Full-screen with hero illustration + feature bullets
- **Variant B:** Bottom sheet with pricing comparison table
- **Variant C:** Story-completion celebration + soft upsell

Map events to paywalls:
- `locked_content_tapped` → Show paywall (any variant)
- `download_limit_reached` → Show upgrade-focused paywall
- `onboarding_complete` → Show introductory offer paywall (50% off first month)
- `3rd_free_story_complete` → Show congratulatory paywall

#### Step 5: Keep Fallback Paywall

**Critical:** Keep your existing `subscription-overlay.tsx` as a fallback. If Superwall
SDK fails to initialise (network error, SDK crash), fall back to the built-in paywall:

```typescript
const showPaywall = async (event: string) => {
  try {
    const result = await Superwall.register(event);
    if (result.status === 'noPaywallShown') {
      // Superwall decided not to show — respect the decision
    }
  } catch {
    // Fallback to built-in paywall
    setSubscriptionOverlayVisible(true);
  }
};
```

### 3.4 Superwall Costs

| Tier | Price | Includes |
|---|---|---|
| Free | $0 | 250 paywall views/month, 1 paywall |
| Startup | $99/mo | 10,000 views/month, unlimited paywalls |
| Growth | $499/mo | 100,000 views/month, advanced targeting |
| Enterprise | Custom | Unlimited |

**ROI calculation:** If Superwall improves conversion from 3% to 4.5% and you have 10,000
MAU with £7.99 avg subscription:
- Before: 300 subscribers × £7.99 = £2,397/mo
- After: 450 subscribers × £7.99 = £3,596/mo
- Net gain: £1,199/mo – $99 cost = **£1,100/mo net positive**

---

## 4. Security Principles for Customer Scaling

### 4.1 Authentication & Authorisation

| Principle | Implementation | Status |
|---|---|---|
| **JWT with short expiry** | Access tokens expire in 15 min; refresh tokens in 30 days | ✅ Exists |
| **Refresh token rotation** | Issue new refresh token on each refresh; revoke old one | ✅ Exists |
| **Refresh token hashing** | Store bcrypt hash, never plaintext | ✅ Exists (`RefreshTokenHashingService`) |
| **Session binding** | Tie tokens to device ID; reject tokens from different devices | ✅ Exists |
| **Concurrent session limits** | Max 5 active sessions per user; FIFO eviction | 🔲 Add at scale |
| **Anomaly detection** | Flag logins from new countries/devices; notify parent email | 🔲 Add at scale |

### 4.2 Data Protection (GDPR / UK-GDPR / COPPA)

| Principle | Implementation |
|---|---|
| **Data minimisation** | Collect only what's needed: provider ID, child age range (not DOB), nickname (not real name) |
| **Purpose limitation** | Each data field has a documented purpose; no repurposing without consent |
| **Storage limitation** | Auto-delete inactive accounts after 12 months of no login |
| **Right to erasure** | `DELETE /api/account` cascading deletion across all collections (Phase 3) |
| **Data portability** | `GET /api/account/export` — return all user data as JSON (add in Phase 5) |
| **Parental consent** | Age gate + parental PIN for account actions; documented in privacy policy |
| **No behavioural advertising** | Zero ad SDKs; analytics are first-party only |
| **No cross-app tracking** | Each tenant's data is isolated; no shared user identifiers across tenants |

### 4.3 API Security

| Layer | Control | Config |
|---|---|---|
| **Edge** | Cloudflare WAF (OWASP Core Ruleset) | ✅ Phase 4 |
| **Edge** | Cloudflare rate limiting (100 req/min on `/api/auth/*`) | ✅ Phase 4 |
| **Gateway** | `CloudflareValidationFilter` — reject non-Cloudflare IPs | ✅ Exists |
| **Gateway** | `RateLimitingFilter` — per-IP and per-tenant limits | ✅ Exists (add per-tenant) |
| **Gateway** | `RequestValidationFilter` — input sanitisation, size limits | ✅ Exists |
| **Gateway** | `SecurityHeadersConfig` — HSTS, CSP, X-Frame-Options | ✅ Exists |
| **Gateway** | JWT validation on every authenticated endpoint | ✅ Exists |
| **Gateway** | CORS strict origin whitelist (per-tenant in Phase 5) | ✅ Exists |
| **Storage** | Firestore security rules — server-only access, no client SDK | ✅ Exists |
| **Storage** | GCS signed URLs with 15-min expiry | ✅ Exists |
| **Secrets** | GCP Secret Manager (or `.env` on VM) — never in code | ✅ Exists |

### 4.4 Rate Limiting Strategy (at Scale)

```
Cloudflare (edge)
  └── 100 req/min per IP on /api/auth/*
  └── 1000 req/min per IP globally

Gateway (application)
  └── Per-tenant limits:
      ├── Auth endpoints: 20 req/min per user
      ├── Content endpoints: 120 req/min per user
      ├── Asset endpoints: 300 req/min per user
      └── Admin endpoints: 30 req/min per admin

  └── Global circuit breaker:
      ├── If error rate > 50% over 30s → open circuit for 60s
      └── Already implemented via ResilienceConfig
```

### 4.5 Secrets Management

| Environment | Method | Notes |
|---|---|---|
| Local | `.env` file (git-ignored) | Developer convenience |
| CI/CD | GitHub Secrets → env vars | Injected at build time |
| GCE Prod | `/opt/gateway/.env` file (600 permissions, root-only) | Phase 4 |
| **Scaled Prod** | GCP Secret Manager → injected at container start | Phase 5 migration |

**Phase 5 migration to Secret Manager:**
```bash
# Store secrets
echo -n "${JWT_SECRET}" | gcloud secrets create jwt-secret --data-file=-
echo -n "${GOOGLE_CLIENT_ID}" | gcloud secrets create google-client-id --data-file=-

# Grant access to service account
gcloud secrets add-iam-policy-binding jwt-secret \
  --member="serviceAccount:gateway-prod-sa@apt-icon-472307-b7.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# In application-prod.yml, use Spring Cloud GCP Secret Manager:
# spring.cloud.gcp.secretmanager.enabled=true
# jwt.secret=${sm://jwt-secret}
```

### 4.6 Logging & Audit Trail

| Event | What to Log | Retention |
|---|---|---|
| **Login success** | userId, provider, IP (hashed), device fingerprint, timestamp | 90 days |
| **Login failure** | provider, IP (hashed), failure reason, timestamp | 90 days |
| **Account deletion** | userId (anonymised after 30 days), timestamp | 30 days |
| **Subscription change** | userId, old tier → new tier, timestamp | 1 year |
| **Content download** | userId, storyId, timestamp | 30 days |
| **Admin action** | adminId, action, targetResource, timestamp | 1 year |
| **Rate limit breach** | IP (hashed), endpoint, count, timestamp | 7 days |

**Rules:**
- Never log full JWTs, passwords, refresh tokens, or API keys
- Hash IP addresses in logs (SHA-256 with daily-rotating salt) — enough for abuse detection, not enough for tracking
- PII in logs must auto-expire via Cloud Logging retention policies
- Structured JSON logging (already implemented via Spring Boot logback)

---

## 5. Additional Scaling Tools & Recommendations

### 5.1 Analytics & Experimentation

| Tool | Purpose | When to Add |
|---|---|---|
| **Mixpanel / Amplitude** | Product analytics (funnels, retention, feature usage) | At 1,000 MAU |
| **PostHog** (self-hosted option) | Product analytics + session replay + feature flags | At 1,000 MAU (free self-hosted) |
| **Firebase Analytics** | Basic event tracking, crash-free rates | At launch (free) |
| **RevenueCat Charts** | Subscription analytics (MRR, churn, LTV) | Already available (free with RC) |

**Recommendation:** Start with **RevenueCat Charts** (free, already integrated) and
**Firebase Analytics** (free, lightweight). Add Mixpanel/PostHog only when you need
funnel analysis or retention cohorts.

### 5.2 Feature Flags (Remote Configuration)

Use feature flags to control rollouts without app updates:

| Tool | Cost | Best For |
|---|---|---|
| **Firebase Remote Config** | Free | Simple key-value flags, A/B tests |
| **LaunchDarkly** | $10/mo+ | Complex targeting, percentage rollouts |
| **PostHog Feature Flags** | Free (self-hosted) | Integrated with analytics |
| **Superwall** (built-in) | Part of Superwall plan | Paywall-specific flags |

**Recommended flags for launch:**

```json
{
  "enable_music_challenges": true,
  "enable_jigsaw_mode": true,
  "enable_voice_recording": true,
  "max_free_stories": 2,
  "enable_referral_system": false,
  "enable_smart_prefetch": false,
  "maintenance_mode": false,
  "force_update_minimum_version": "1.0.0"
}
```

Use **Firebase Remote Config** (free) for these. It's already in the Firebase ecosystem
you're using for Firestore.

### 5.3 Push Notifications (Re-engagement)

| Tool | Cost | Best For |
|---|---|---|
| **Expo Notifications** | Free (via Expo push service) | Simple push, already partially integrated |
| **OneSignal** | Free up to 10K subscribers | Segmentation, automation, A/B testing |
| **Firebase Cloud Messaging** | Free | Direct integration with Firebase |

**Current state:** You already have `notification-service.ts` with local notifications
(reminders, screen time alerts). For re-engagement at scale, add **server-sent push**:

- "New story available!" when content is published
- "Your child hasn't read in 3 days" (gentle, opt-in)
- "New instrument unlocked!" (premium engagement)

**Important for children's apps:**
- Notifications must target the **parent**, not the child
- Must respect notification preferences (already have opt-in settings)
- Must comply with COPPA — no behavioural targeting in notification timing

### 5.4 CDN & Performance

| Current | Scaled |
|---|---|
| GCS signed URLs (direct download) | Cloudflare CDN caching GCS assets |
| No image optimisation | Cloudflare Polish / Image Resizing |
| Full-size assets served | Responsive image sizes per device |

**Phase 5 CDN setup:**
```
Client requests story assets
    → Cloudflare edge (cached)
        → Cache HIT: serve from edge (< 50ms)
        → Cache MISS: fetch from GCS, cache for 24h, serve
```

Configure in Cloudflare:
- Cache rule: `assets.earlyroots.co.uk/*` → cache 24 hours
- Browser cache TTL: 7 days (assets are immutable, versioned by content hash)
- Enable Cloudflare Polish for automatic image optimisation

### 5.5 Database Scaling Path

| MAU | Firestore Strategy | Notes |
|---|---|---|
| 0 – 50K | Single project, shared collections | Current setup, free tier covers most of it |
| 50K – 500K | Single project, composite indexes, query optimisation | Add indexes for common queries |
| 500K – 2M | Read replicas + caching layer (Redis/Memorystore) | Cache user profiles, story catalog |
| 2M+ | Multi-region Firestore + dedicated GCP project per tenant | Full isolation, regional compliance |

---

## 6. Implementation Priority & Roadmap

### Phase 5a — Foundation (Months 1–2)

| Priority | Task | Effort | Depends On |
|---|---|---|---|
| P0 | Add `X-Tenant-ID` header support + TenantContext | Small | Nothing |
| P0 | Scope all repositories to tenant prefix | Medium | TenantContext |
| P0 | Scope GCS asset paths to tenant prefix | Small | TenantContext |
| P0 | Tenant config collection in Firestore | Small | Nothing |
| P1 | Per-tenant rate limiting | Small | TenantContext |
| P1 | Per-tenant CORS origins | Small | TenantContext |
| P1 | Data export endpoint (`GET /api/account/export`) | Medium | Nothing |

### Phase 5b — Growth Tooling (Months 3–4, after reaching 5K MAU)

| Priority | Task | Effort | Depends On |
|---|---|---|---|
| P1 | Firebase Remote Config integration (feature flags) | Small | Nothing |
| P1 | Firebase Analytics integration (basic events) | Small | Nothing |
| P2 | Superwall SDK integration | Medium | 5K MAU threshold |
| P2 | Server-sent push notifications (OneSignal or Expo) | Medium | Nothing |
| P2 | Cloudflare CDN caching for assets | Small | Phase 4 DNS |

### Phase 5c — Scale (Months 5+, after reaching 50K MAU)

| Priority | Task | Effort | Depends On |
|---|---|---|---|
| P2 | Migrate secrets to GCP Secret Manager | Small | Nothing |
| P2 | Add caching layer (Redis / Memorystore) | Medium | Performance data |
| P3 | Tenant admin dashboard (web UI) | Large | Tenant API |
| P3 | Auto-scaling migration (GCE → Cloud Run with min-instances) | Medium | 300K+ MAU |
| P3 | Multi-region Firestore | Large | Regulatory / user distribution |

---

## 7. Operational Best Practices

### 7.1 Deployment

- **Zero-downtime deploys:** Rolling restart with health check validation before traffic shift
- **Canary deployments:** Route 5% of traffic to new version, monitor error rate for 15 min
- **Rollback plan:** Keep previous Docker image tagged; one-command rollback
- **Deploy windows:** Avoid deploying during peak usage (typically 6–8pm local time for children's apps)

### 7.2 Incident Response

| Severity | Example | Response Time | Escalation |
|---|---|---|---|
| **P0 (Critical)** | Service down, data breach, payment failure | 15 min | Immediate alert → fix or rollback |
| **P1 (High)** | Error rate > 5%, slow responses > 2s | 1 hour | Alert → investigate → fix in next deploy |
| **P2 (Medium)** | Feature degradation, non-critical bug | 24 hours | Track in issue, fix in sprint |
| **P3 (Low)** | UI glitch, minor copy error | 1 week | Backlog |

### 7.3 Backup & Recovery

| Data | Backup Method | Frequency | Retention |
|---|---|---|---|
| Firestore | GCP automated exports to GCS | Daily | 30 days |
| GCS assets | Cross-region replication | Continuous | Indefinite |
| Secrets | Manual export to encrypted offline store | On change | Indefinite |
| Grafana dashboards | JSON export in git | On change | Git history |

### 7.4 Compliance Checklist (Per Tenant)

- [ ] Privacy policy published and linked in app
- [ ] Terms of service published and linked in app
- [ ] GDPR Article 30 record of processing activities documented
- [ ] Data Processing Agreement (DPA) in place if tenant provides user data
- [ ] Parental consent mechanism tested and documented
- [ ] Account deletion flow tested end-to-end
- [ ] Data export tested end-to-end
- [ ] No PII in application logs (verified via log audit)
- [ ] Sentry configured with `sendDefaultPii: false`
- [ ] Cookie/tracking consent (if web component exists)

---

## Related Documentation

| Document | Scope |
|---|---|
| `PHASE-4-PROD-READINESS.md` | Production infrastructure, monitoring, DNS migration |
| `grow-with-freya/NEXT-PHASE-3.md` | Monetisation, download management, RevenueCat setup |
| `grow-with-freya/ARCHITECTURE.md` | Frontend tech stack, design decisions |
| `gateway-service/README.md` | Backend API reference |
| `grow-with-freya/services/subscription-service.ts` | RevenueCat integration code |
