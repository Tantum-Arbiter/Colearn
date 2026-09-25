---
title: "Data protection impact assessment — Early Roots app and gateway"
type: dpia
status: draft — for the operator and a qualified adviser to review; not legal advice
covers: PHASE-8-BACKEND-ALIGNMENT.md §5 (child document), §6 (achievements), §7 (entitlements); §8 voice sync was dropped
updated: 2026-09-24
---

# Data protection impact assessment (draft)

The UK Children's Code (the Age Appropriate Design Code) expects a DPIA for any online service
likely to be used by children. This draft records what the code in this repository does with
personal data after Phase 8, so that the operator can complete, correct and sign it. Every claim
about the system names the code that makes it true; anything that could not be checked from the
repository is marked **⚠️ UNVERIFIED**.

## 1. Nature, scope, context and purpose

| | |
|-|-|
| Controller | CoLearn (Early Roots) — ⚠️ UNVERIFIED legal entity details |
| Service | A subscription app used by a parent **with** a child aged 0–6: stories, music, calm activities |
| Who is signed in | The parent or guardian, through Apple or Google. Children have no accounts and never sign in. |
| Why the backend holds data | So a family's child profile, reading progress, favourites and settings follow them to a new phone (Phase C); so badges are the same on every phone (Phase D); and so paid content can be checked on the server (Phase E). Voice recordings are never sent to the backend (Phase F sync dropped 2026-09-24). |
| Not done | No advertising, no behavioural profiling, no third-party tracking, no sale of data, no recommendations built from synced data (PHASE-8 L5). |

## 2. The data

### 2.1 Held by the gateway (Firestore and Cloud Storage)

| Data | Where | About whom | Written by |
|-|-|-|-|
| Sign-in identity: provider, provider subject id, created and last-login times | `users/{uid}` | Parent | `UserService` |
| Subscription: tier, expiry, when it was last checked, sandbox or production — a copy of RevenueCat's answer | `users/{uid}.entitlement` | Parent | `EntitlementService` (asks RevenueCat) |
| Sessions: hashed refresh token, device id, device type, platform, app version, times | `user_sessions/{id}` | Parent's device | `SessionService` |
| Legacy profile: nickname, avatar | `user_profiles/{uid}` | Child | read only since Phase C; export includes it while it exists |
| **Child document**: nickname, avatar, age bucket (0–2, 2–4, 4–6; never a birth date), language, text size, favourite stories, activities and songs, per-story page and finish count, finished-story ids, challenge counts, earned badge ids, screen-time and reminder switches, **custom reminder title and message typed by the parent** | `users/{uid}/children/{childId}` | Child (and parent-typed text) | `ChildController` / `FirebaseChildRepository` |
| Consent records: policy version, scope (`core`), accepted and recorded times, app version | `users/{uid}/consents/{id}` | Parent | `ConsentController` |
| Stories held on the family's devices (ids only) | `users/{uid}/downloads/{storyId}` | Parent | `DownloadAccessService` |

No timestamps of reading activity leave the device: the child document carries outcomes (what
was finished, how many challenges) and no times (`services/child-document.ts`,
`child-sync.feature` "the response carries no server write time").

### 2.2 Processed but not stored by the gateway

| Data | Handling |
|-|-|
| Analytics events | Converted to anonymous Prometheus counters and discarded; no user id, device id or IP is stored (`AnalyticsController` class comment, `ContentAnalyticsService`). |
| Request logs | Route, status, duration, request id — ⚠️ UNVERIFIED whether any log line carries a user id or IP in production. |

### 2.3 Kept only on the device

Screen-time session history, "new since last visit" times (`achievementUnlockedAt`), which books
were opened but not finished (`readStoryIds`), and all voice recordings.

## 3. Processors and transfers

| Processor | What it receives | Location |
|-|-|-|
| Google Cloud (Firestore, Cloud Storage, Cloud Run / Compute Engine) | Everything in §2.1 | Compute in `europe-west1` (Belgium), `PHASE-4-PROD-READINESS.md`, `.github/workflows/gateway-build.yml`. Firestore in the EU (confirmed by the operator 2026-09-24, L3). |
| Apple, Google | Sign-in | Their own terms |
| RevenueCat | The app user id, which is the gateway account id since Phase E (`subscription-service.ts` `identifyAccount`), and store receipts | ⚠️ UNVERIFIED region; a US company — a transfer needs a UK IDTA or addendum |
| Sentry | Crash reports, only with the parent's opt-in; `sendDefaultPii: false`; replay off in production (CLAUDE.md) | ⚠️ UNVERIFIED region |
| Cloudflare | All API traffic (CDN and WAF) | Global edge |

`gateway-service/src/main/resources/application-prod.yml` sets `gcp.region` with a default of
`us-central1`; nothing in the gateway reads that setting today, but it should be corrected or
removed so it cannot mislead.

## 4. Necessity and proportionality

- **Minimisation.** Age is held as a bucket, not a birth date. The child's nickname is an alias.
  Progress is outcomes, not a log of sessions. Analytics are counters.
- **The most sensitive data stays on the phone.** Voice recordings are never sent to the backend,
  and Android Auto Backup is off (`android.allowBackup: false`), so they are not copied to Google
  Drive either. On iOS the family's own iCloud backup includes the app's documents.
- **Adult data, not child data.** Recording is behind the parents-only gate
  (`MODE_OPTIONS` `grownUpsOnly`); the recordings are of grown-ups reading.
- **Security.** Firestore rules deny every client (`firestore.rules`, `FirestoreConfigTest`); all
  access is through the gateway with short-lived JWTs. Refresh tokens are stored
  hashed. The gateway authenticates to RevenueCat with a secret key held only on the server; nothing the app sends can change a family's plan (`EntitlementSpoofingSliceTest`).
- **Rights.** Export: `GET /api/account/export` returns the account, profile, children,
  consents, subscription and stories held. Erasure: account deletion removes profile, children, consents, downloads,
  sessions and the user record, and stops before removing the account if
  any step fails (`AccountDeletionService`).

## 5. Retention (L4)

| Data | Kept |
|-|-|
| Account, child document, downloads, subscription | Until the account is deleted |
| Consent records | While the account exists, then **3 years after deletion** in `consent_log` (policy version, scope, times, and a SHA-256 of the sign-in provider and subject — no name, no child data), removed by a Firestore TTL policy on `expiresAt` (`ConsentLog`, `firestore.indexes.json`). Decided by the operator 2026-09-24. |
| Sessions | Until expiry or revocation; all revoked and deleted with the account |
| Analytics | Not stored per user; aggregate counters only |

## 6. Risks and mitigations

| Risk | Likelihood / severity | Mitigation | Residual |
|-|-|-|-|
| A child's profile or progress exposed through a gateway flaw | Low / medium | Rules deny clients; JWT on every call; slice tests with the real filter chain; security suite | Low |
| Parent-typed reminder text contains personal information | Medium / low | Stored only in the family's child document; exported and deleted with it | Low |
| Subscription data mis-attributed on a shared phone | Low / low | RevenueCat logged out on sign-out and account deletion | Low |
| Cross-account merge of local progress on a shared device | Medium / low | ⚠️ Known gap: signing in to a second account on the same phone merges that phone's local progress into it (PHASE-8 flags) | Medium — operator decision |
| Transfer to the US without safeguards (RevenueCat, Sentry) | ⚠️ / medium | EU SCCs with the UK Addendum in their data processing terms (as the privacy policy now states) — ⚠️ confirm both DPAs are accepted | Low once confirmed |

## 7. Children's Code standards touched

Best interests, data minimisation, default settings (crash reports off),
parental controls (parents-only gate), profiling (none), nudge techniques (badge copy lint forbids
pressure to return — `contract-fixtures/badge-copy-forbidden.json`), transparency (see
`PRIVACY-POLICY-CHANGES.md`).

## 8. Before sign-off

1. ~~Confirm the Firestore location (L3)~~ — EU.
2. ~~Decide consent-record retention (§5)~~ — 3 years after deletion.
3. Confirm RevenueCat's and Sentry's data processing terms (SCCs + UK Addendum) are accepted (§3).
4. Approve the privacy policy changes in `PRIVACY-POLICY-CHANGES.md` — they must ship **with** the
   phases they describe.
5. Sign-off: name, role, date — ______________________
