# Phase 8 — Backend alignment, device sync, achievements as data

> **Status:** built on branch `claude/backend-spec-phases-plan-d460bf` (2026-09-24), not yet on `mvp`
> or deployed. Written 2026-09-23 against `mvp` @ `ec5fd12d`; findings below cite `file:line` on
> that commit. See **Delivery status** at the end of this header for what is done, switched off, or
> waiting on the operator.
> Read [`TESTING-STANDARD.md`](TESTING-STANDARD.md), [`gateway-service/AGENTS.md`](gateway-service/AGENTS.md),
> [`grow-with-freya/AGENTS.md`](grow-with-freya/AGENTS.md) and
> [`grow-with-freya/ACHIEVEMENTS-PLAN.md`](grow-with-freya/ACHIEVEMENTS-PLAN.md) first.

**The shape of it.** The client and gateway agree on request and response shapes, and nothing the
client added since July reaches the wire. What is broken is on the server's edge: a request filter
that rejects legitimate traffic, and a story model that silently drops every translation. Those are
release blockers (§3). Behind them sits the real product gap: everything a family builds up —
progress, favourites, badges, recordings — lives on one device and is lost on reinstall (§5–§8).

**Decided by the operator, 2026-09-23:**

- Achievements record **that** something was done, never **when**. No timestamps leave the device.
- Store the minimum needed to restore a family's app on another device. Nothing behavioural.
- ~~Voice recordings may be synced, as a separate opt-in feature, after MVP (§8).~~ **Changed 2026-09-24: voice recordings are not synced at all.** Only F1 (recording behind the parents-only gate) is kept.

**Decided by the operator, later on 2026-09-23** (the answers to §10):

- No story content exists yet, so which stories are free stays as it is today. A5 is off the release path.
- `isShareToUnlock` is deferred. B2 is parked.
- No `springdoc-openapi`. B7 is a plain README rewrite.
- Model many children, ship with one (the recommended default; not yet confirmed).
- Phase E comes after Phase C, before any push on paid content.
- The app is on TestFlight only, with no store release, so no installed app depends on `/api/profile`.
  Phase C replaces it outright; there is no old-client window.

**Delivery status (2026-09-24).** Every task was written test-first and mutation-swept by hand.

| Phase | State | Commits |
|-|-|-|
| 0 — test gates | Done. JaCoCo floor, Jest thresholds, `backend-checks.yml` (⚠️ not yet run in CI) | `8f9d1cf5` `9ae00902` `da0a67ad` |
| A — blockers | A1–A4, A6 done; A5 deferred (no content) | `614d801b` `48395568` `2e711842` `51c9af13` |
| B — hygiene | B1, B3–B6, B8–B11 done; B2 parked; B7 README rewritten | `f81a043f` `2608be6f` `c34e15b8` `5b789708` `b80e3727` `b5821eb6` `2715eb6d` |
| C — child sync | Done: child document, consent, export, deletion, app merge and auto-sync, func tests. `/api/profile` stays until the Phase C build is on TestFlight (C2). | `4f7bd845` `0e0c0d9f` `1d93f8bc` |
| D — achievements | Done: definitions as data, facts, story awards, CMS authoring and upload (dry run by default), delta delivery, copy lint | `bf882114` `43025ed3` `791a983a` |
| E — entitlements | Built, **switched off**: revised 2026-09-25 to ask RevenueCat directly instead of a webhook (§7); `/download` only logs refusals until `ENTITLEMENTS_ENFORCE=true` | `9c581678` `d8d38aa8` and the E2 commits |
| F — voice sync | **Dropped by the operator 2026-09-24.** The sync was built (`9eee8484`, `e85bf7e2`) and reverted; only F1 remains: choosing Record asks the parents-only question. F7: Android Auto Backup is switched off (`android.allowBackup: false`; `expo config --type introspect` shows `android:allowBackup="false"` in the generated manifest), so recordings never leave an Android phone. | revert commit |
| Compliance | L1 DPIA drafted in [`compliance/`](compliance/); L2 privacy policy updated on the website and in the app (approved 2026-09-24); L3 Firestore is in the EU; L4 consent records kept 3 years after deletion in `consent_log` | `e4d7ebe4` and later |

Operator actions before any of it is live: set `REVENUECAT_SECRET_API_KEY`, then `ENTITLEMENTS_ENFORCE` once the logs look right; deploy `firestore.rules` and
indexes; enable the `consent_log.expiresAt` TTL by deploying the indexes; confirm RevenueCat's and Sentry's data processing terms.

---

## 1. What the audit found

### Release blockers

| # | Defect | Evidence |
|-|-|-|
| B1 | **Every analytics batch is rejected in prod.** The client omits device headers on purpose; the gateway requires them on any authenticated `/api/**` call → 400. The client never reads the response, and no func-test covers analytics. | `grow-with-freya/services/analytics-service.ts:233-238`, `gateway-service/.../security/RequestValidationFilter.java:175-187` |
| B2 | **The body pattern filter rejects real data.** Any JSON body under 100 KB matching `;`, `<`, `>`, `\|`, `&&`, `#`+SQL word, or the substring `script` → 400. Hits: event `subscription_overlay_shown` (sub**script**ion), free-text reminder titles/messages, any key like `description`. Firestore has no query language and nothing shells out, so the filter guards against nothing here. | `RequestValidationFilter.java:47-69,237-243`; reminders typed at `grow-with-freya/components/reminders/create-reminder-screen.tsx:401` and sent via `services/api-client.ts:279-306` |
| B3 | **Every CMS story arrives with no translations.** CMS page `localizedText` is age-group-keyed (`{"4-6": {en, pl, …}}`, all 140 stories); Java maps it as flat `LocalizedText`, Firestore drops the unknown key, the client receives `{}`, and `{}` then overwrites bundled translations in the merge. | `scripts/story-schema.json:137-173`, `gateway-service/.../model/StoryPage.java:31-37`, `grow-with-freya/services/story-loader.ts:190` |
| B4 | **Free-tier users can open no CMS story.** No CMS story sets `isFree: true`. *Deferred: there is no content yet (§10).* | grep over `scripts/cms-stories/*/story-data.json`; gate at `grow-with-freya/services/story-access-service.ts:50-89` |
| B5 | **The website privacy page is already inaccurate:** "No voice recordings (voice features are deferred)" — recording shipped. | `website/src/app/privacy/page.tsx:32` |

B1 and B2 do not reproduce on the dev deployment: `gcp-dev` turns request validation off
(`gateway-service/src/main/resources/application-gcp-dev.yml:38-39`), and the only func-tests CI runs
are the `@gcp-dev` ones against that deployment (`.github/workflows/gateway-build.yml:228`). The
local `test` profile leaves validation on, but no scenario sends analytics, and every gateway
controller test switches the filters off. That is why they were missed — see Phase 0.

### Contract drift (fix soon, not blocking)

| # | Defect | Evidence |
|-|-|-|
| D1 | Four story checksum algorithms; the one delta sync uses omits `jigsawPuzzle`, `readingChallenge`, `isFree`, `isPremium`, `tags`, `ageRange`, `duration`, `coverImage`, `characterImage`, `type`, `author`. Editing only those neither re-uploads nor re-syncs. | `scripts/upload-stories-to-firestore.js:96-124,205`, `scripts/cms-manager/src/commands/format.js:156-168`, `prepare.js:130-144`, `gateway-service/.../service/StoryService.java:168-203` |
| D2 | `isShareToUnlock` read by the client, sent by nobody. | `grow-with-freya/types/story.ts:180`; absent from `CatalogEntry.java`, `Story.java` |
| D3 | Tag vocabularies differ: CMS `imagination-games`, `family-exercises`; TS `family`, `creativity`. | `scripts/story-schema.json:107`, `grow-with-freya/types/story.ts:233-236` |
| D4 | CMS category `personalized` has no TS counterpart. `duration` means pages in the CMS, minutes in TS. | `story-schema.json:21,36-39`, `types/story.ts:143,229` |
| D5 | `isPremium` lacks `@PropertyName`; a Java write would store `premium`. | `gateway-service/.../model/Story.java:50-51,220-230` |
| D6 | Client and Java disagree on age-group fallback: Java 4-6 → 2-4 → 0-2, TS none. A 0–2 child on a 4-6-only story gets English. | `StoryPage.java:162-169`, `types/story.ts:205-218` |
| D7 | `firestore.rules` / `firestore.indexes.json` name `sessions`; code uses `user_sessions`, `user_profiles`, `content_versions`, `asset_versions`. The `isActive`+`expiresAt` range query likely lacks its index. A stale nested copy lives in `gateway-service/gateway-service/`. | `gateway-service/firestore.rules`, `firestore.indexes.json`, `FirebaseUserSessionRepository.java:434-437` |
| D8 | README documents `POST /api/stories/sync` (does not exist; real one is `/delta`), wrong auth response shape, and omits profile, account, analytics, assets, the three required client headers. | `gateway-service/README.md:94-307` |
| D9 | `cms-manager` cannot run from a fresh clone: its `lib/` is caught by root `.gitignore:65`. `format.js:104` turns `isAvailable: false` into `true`. | |
| D10 | Analytics bypasses `ApiClient`, so a stale token drops the batch with no refresh. | `analytics-service.ts:220-247` |
| D11 | The screen-time save sends `nickname: userNickname \|\| 'User'`; on a fresh device before the profile pull, that can overwrite the real name. | `components/screen-time/screen-time-screen.tsx:273-276` |
| D12 | Download caps and tiers are enforced only in the app; `/api/stories/{id}/download` checks `isAvailable` alone. | `StoryController.java:279-299`, `story-access-service.ts:15-18` |

### Dead code (removal needs operator approval)

- Client: `ApiClient.getDeltaContent`, `getContentVersion`, `getBatchSignedUrls`; `AuthService.refreshToken`, `signOut`; `StorySyncService` network paths; `StorySyncRequest`/`StorySyncResponse` types.
- Server: `dto/StorySyncRequest`, `StorySyncResponse`, `dto/UserDTOs`; `ChildProfile`, `UserPreferences` and the `UserService` child methods no controller reaches — superseded by §5.

---

## 2. Phase 0 — test gates (first, alongside the start of A)

The audit behind [`TESTING-STANDARD.md`](TESTING-STANDARD.md) §7 found the safety net thinner than
it looks: the gateway's unit tests never run in CI, the func-tests CI runs skip request
validation, and the app's backend-facing services are only ever mocked. Phases A–F lean on
those tests, so they come first. Every task in this plan is done only when it meets the
standard's §6 done list.

| Task | Change | Done when |
|-|-|-|
| **0.1** Gateway tests in CI | A workflow job runs `./gradlew test` on every push and pull request touching `gateway-service/`; the image build waits for it. **CI change — ask first.** | A deliberately failing test fails the workflow. |
| **0.2** Func-tests in CI, validation on | Run the Docker stack (`docker-compose.functional-tests.yml`, profiles `test,emulator`) in CI with every scenario except `@ignore`, not only `@gcp-dev`. **CI change — ask first.** | The job runs A3's scenarios; they fail on today's code. |
| **0.3** Coverage floors that only rise | JaCoCo `jacocoTestCoverageVerification` and the Jest `coverageThreshold` set to today's measured numbers, not 10%. Raised at the end of each phase, never lowered. **Build change — ask first.** | Dropping a test below the floor fails the build. |
| **0.4** Controller slice pattern | The first `@WebMvcTest` slices, filters **on**: `AnalyticsController` (feeds A1) and `ProfileController` (feeds A2). They become the pattern for every new controller test. | A legitimate body with `subscription_overlay_shown` and `"Bath; then story"` reaches the controller; today it gets 400. |
| **0.5** Untested app services | Tests of today's behaviour for `story-loader` (feeds A4), `profile-sync-service`, `background-save-service`, `auth-service`, before Phase C changes them. | Each has its own test file; the mutation sweep finds no survivor. |
| **0.6** Tests that prove less than they claim | `TokenTamperingTest` with real signed tokens; account-deletion 404/409/500 scenarios driven through a real failure, not an unused stub; `RequestValidationFilterTest` stubs method and content type and becomes `@ParameterizedTest` tables, blocked **and** accepted. | Each test fails when its guard is removed. |
| **0.7** Shared contract fixtures | One fixtures directory read by the Java and Jest round-trip tests: a real CMS `story-data.json`, a profile body with reminders, an analytics batch. A4, B5 and Phase C use it. | Changing a fixture's shape fails both sides. |

The mutation sweep stays by hand for now; PIT (gateway) and Stryker (app) are a later decision.

---

## 3. Phase A — release blockers (before the client ships)

| Task | Change | Done when |
|-|-|-|
| **A1** Analytics headers | Exempt `POST /api/analytics/events` from the client-header rule (keeps the no-persistent-identifier intent). | Filter unit test: authed analytics POST with no device headers → passes; other `/api/**` without headers → still 400. |
| **A2** Body filter | Stop pattern-scanning JSON bodies. Keep size limits, content-type and header checks; keep URL/query-string scanning. | Tests: bodies containing `subscription_overlay_shown`, `"Bath; then story"`, `"<3"`, `description` → accepted. Traversal in a URL → still rejected. **Security-sensitive: flag in the PR.** |
| **A3** Prod-parity func-test | The local `test` profile already has request validation on. Add scenarios for analytics, profile-with-reminders (free text with `;`, `<3`, `&`), delta and download, each with its 4xx cases; they run in CI once 0.2 lands. | The suite fails on today's code and passes after A1–A2. |
| **A4** Page translations | Java `StoryPage.localizedText` becomes `Map<String, LocalizedText>` keyed by age group; delete the unused `ageGroupText`; update `TestAdminController` seeding. Client: treat an empty `localizedText` as absent in `story-loader.ts:190`. | Java test round-trips a real CMS `story-data.json` through Firestore mapping and JSON with every language intact. Jest: `{}` never overwrites bundled text. Func-test: delta returns Polish text for a CMS story. |
| **A5** Free stories — *deferred, no content yet (§10)* | When content exists, the operator picks which CMS stories are free; set `isFree` in `story-data.json`; upload with `FORCE_UPLOAD` (D1 hides the change otherwise). | A free-tier account can open those stories on the simulator. |
| **A6** Website privacy line | Replace with: recordings are made by grown-ups and stay on the device. | Page renders; Playwright test updated if it asserts the copy. |

Order: A2 → A1 → A3 (proves both) → A4 → A6. A5 waits for content. A1–A4 are server deploys and do not need the
app resubmitted, except the one-line `story-loader.ts` guard in A4.

---

## 4. Phase B — contract hygiene (the sprint after release)

| Task | Change |
|-|-|
| **B1** One checksum | A single function: SHA-256 of the story's canonical JSON, minus `checksum`, `createdAt`, `updatedAt`, `version`. Used by the upload script and `cms-manager`; Java stops computing its own. Covers D1. Test: changing any content field changes the checksum. |
| **B2** `isShareToUnlock` — *deferred (§10)* | Later: add to CMS schema, `Story.java`, `CatalogEntry.java`, the catalogue mapper. Not in this phase. |
| **B3** One tag and category vocabulary | The CMS schema enum is the source; the TS unions follow; migrate existing `story-data.json` tags. Rename `duration` to `pageCount` or document it as pages everywhere. |
| **B4** `isPremium` mapping | Add `@PropertyName("isPremium")`; test a Java write-then-read. |
| **B5** Age fallback parity | Port Java's 4-6 → 2-4 → 0-2 chain to `types/story.ts`; shared fixture tests on both sides. |
| **B6** Firestore rules and indexes | Rewrite for the collections the code uses; add the `user_sessions` composite indexes; delete the nested stale copy (approval). Deploy is an infrastructure change — **ask first**. |
| **B7** API reference | Rewrite the README endpoint section from the code. No generated spec (§10). |
| **B8** Tooling fixes | Un-ignore `scripts/cms-manager/lib/`; fix `format.js:104`. |
| **B9** Analytics via `ApiClient` | Route through `ApiClient` with an opt-out of device headers, gaining the 401 refresh. |
| **B10** No placeholder nickname | The screen-time save sends only `notifications`/`schedule`; the server accepts a partial update. |
| **B11** Dead code | Remove §1's dead list once approved. |

---

## 5. Phase C — the child's data, synced

### What is stored, and what is not

| Data | Server | Why |
|-|-|-|
| Consent record: policy version, scope, accepted-at, app version | **Yes**, append-only | Needed to demonstrate verifiable parental consent (COPPA); today it is device-only (`store/app-store.ts:76-77`) |
| Nickname, avatar, age bucket | Yes (already) | Core profile |
| Language, text size | Yes | Restores the app as the family left it |
| Favourite stories, activities, songs | Yes | Restore |
| Story position (`pageIndex`, `totalPages`), finished-count | Yes, **no timestamps** | Resume on another device |
| Finished story ids, challenge counts by kind, earned achievements | Yes, **no timestamps** | §6 |
| Screen-time **settings** (enabled, reminders on, custom reminders) | Yes (already) | |
| Screen-time **sessions and daily totals** | **No** | A timestamped usage record is behavioural profiling; the parent's heatmap stays on the device |
| Reading streak, last-read date, recent searches, `achievementUnlockedAt` | **No** | Time-based or incidental |
| Voice recordings | **Not in this phase** | §8 |
| Exact birth date | **Never** | Age bucket only |

### Model

```
users/{uid}                              existing
users/{uid}/consents/{autoId}            { policyVersion, scope: 'core', acceptedAt, appVersion }
users/{uid}/children/{childId}           {
  nickname, avatarType, avatarId, ageBucket,
  language, textSizeScale,
  favorites: { stories: [], activities: [], songs: [] },
  storyProgress: { [storyId]: { pageIndex, totalPages, finishedCount } },
  finishedStoryIds: [],
  challengeCounts: { music: 0, jigsaw: 0, reading: 0 },
  achievements: [],
  version, updatedAt                     // updatedAt is a server write time, never shown or synced back
}
```

One child document per child, a subcollection rather than embedded in the user (the dead
`ChildProfile` embeds a growing session list in the user document). With ~140 stories the
document stays far under Firestore's 1 MB limit.

### Merge rules — written down, because two devices will disagree

| Field | Rule |
|-|-|
| `achievements`, `finishedStoryIds` | Set union. Never shrinks. |
| `challengeCounts`, `finishedCount` | Per-key max |
| `storyProgress.pageIndex` | Last writer wins |
| Favourites, settings, profile fields | Last writer wins on the whole field |

Writes carry `version`; a stale write gets 409, the client pulls, merges by the table, and retries.

### Tasks

| Task | Change |
|-|-|
| **C1** Models and DTOs | Typed request DTOs with `@Valid` and size caps (no raw `Map` like today's `POST /api/profile`). `@JsonIgnoreProperties(ignoreUnknown = true)` so an older TestFlight build does not fail on a new field. |
| **C2** Endpoints | `GET/PUT /api/children/{childId}`; `POST /api/consents`; `GET /api/account/export` (UK-GDPR right of access). `/api/profile` (`GET`, `POST`, `DELETE`, `ProfileController.java:38,72,103`) is replaced, not kept alongside: the app is on TestFlight only, so no installed build needs it. The app's calls (`services/api-client.ts:251,273`) move to the child document in the same change, and the endpoint is removed once that build is on TestFlight. |
| **C3** Deletion | `AccountDeletionService` deletes the `children` and `consents` subcollections. Test fails first. |
| **C4** Client sync | Extend `background-save-service` (offline queue, retry) and `profile-sync-service` (pull on start and token refresh) to the child document; merge by the table above. |
| **C5** Consent | Write the consent record at the existing consent step; backfill on first sync for existing installs. |
| **C6** Tests | Java unit and integration; func-test features for child state, 409 merge, deletion, export; Jest for merge rules with a mutation sweep; a Maestro journey: sign in, finish a story, reinstall, sign in, the story is still finished. |
| **C7** Docs | `gateway-service/README.md`, `grow-with-freya/ARCHITECTURE.md`, the privacy policy's data list. |

---

## 6. Phase D — achievements as data

Builds on [`ACHIEVEMENTS-PLAN.md`](grow-with-freya/ACHIEVEMENTS-PLAN.md) §6.2 (`BadgeSpec` /
`BadgeRule`), with three changes from this session: definitions live in the CMS, stories point at
awards, and outcomes sync without dates.

### Principles

1. **Definitions change freely; outcomes do not.** A definition is CMS content with a `version`.
   An earned achievement is an id in `achievements[]`. Editing, re-scoring or retiring a
   definition never removes an earned one.
2. **Store facts, derive badges.** The device keeps `finishedStoryIds` and `challengeCounts` (§5).
   When a definition is added or loosened, re-evaluating those facts grants it to children who
   already qualify — no migration.
3. **Time-shaped badges are judged on the device, in the moment.** Rhythm (morning/evening) and
   seasonal badges are evaluated when the event happens; only the outcome is stored.
4. **Score is a property of the definition.** `points` lives on the definition; any total is
   computed. No leaderboards, no loss, per the house rules.
5. **Old apps skip what they do not understand.** Unknown rule kinds, or `minAppVersion` above the
   app's, are ignored, never crash.

### Definition

```ts
interface AchievementDefinition {
  id: string;                      // stable forever, e.g. 'theme-bedtime'
  version: number;
  status: 'active' | 'retired';    // retired: still shown if earned, never newly granted
  family: 'sticker' | 'theme' | 'variety' | 'set' | 'doing' | 'together' | 'rhythm' | 'seasonal';
  rule: BadgeRule;                 // ACHIEVEMENTS-PLAN.md §6.2, plus { kind: 'storyAward' }
  points?: number;
  art: string;                     // asset path, signed like story art
  copy: { title: LocalizedText; earned: LocalizedText; next: LocalizedText };
  minAppVersion?: string;
}
```

Stories gain `awards?: { achievementId: string; trigger: 'finish' | { challengePageId: string } }[]`
in the CMS schema, `Story.java` and `types/story.ts`, so a book can gain or change its awards
without an app release.

### Tasks

| Task | Change |
|-|-|
| **D1** CMS | `achievement_definitions/{id}` collection; JSON files in `scripts/cms-achievements/`; schema validation in `cms-manager`; upload script with a checksum in `content_versions/current`. |
| **D2** Delivery | Delta sync gains `achievementDefinitions` and `achievementChecksums`, reusing the existing version/checksum flow (no new endpoint). Art through `/api/assets/batch-urls`. |
| **D3** Story awards | `awards` on CMS schema, `Story.java`, `CatalogEntry` if the catalogue needs it, `types/story.ts`; covered by the B1 checksum. |
| **D4** Evaluator | Pure `(definitions, facts, catalogue) → earned ids`; the 16 current badges re-expressed as bundled definitions with identical thresholds, so today's tests still pass. Bundled definitions are the offline fallback; CMS versions win by id+version. |
| **D5** Facts | `markStoryCompleted` feeds `finishedStoryIds` (finished, not opened — ACHIEVEMENTS-PLAN decision 5, with its one-time migration from `completedCount > 0`). Challenge completions increment `challengeCounts`. |
| **D6** Sync | `achievements`, `finishedStoryIds`, `challengeCounts` ride on the child document (§5); union / max merge. `achievementUnlockedAt` stays device-only for the "new since last visit" moment. |
| **D7** Copy parity | The 14-locale parity test and the forbidden-phrases lint extend to definition copy. |
| **D8** Docs | Revise ACHIEVEMENTS-PLAN.md §6.1, §7 and §8: no dated ledger; outcomes and facts sync. |

---

## 7. Phase E — server-side entitlements

D12: tiers and download caps existed only in the app, so anyone calling `/api/stories/{id}/download`
directly got paid stories without subscribing. The first cut (2026-09-24) learned tiers from a
RevenueCat webhook. **Revised 2026-09-25 (operator): the gateway keeps a small snapshot of each
family's subscription and asks RevenueCat only at lifecycle boundaries; the webhook is removed.**

Two promises the design is built around, each with its own test class:

1. **A family whose subscription was verified never loses paid-period access because checking
   failed** — RevenueCat, the snapshot, the download counts or the network (`EntitlementInvariantsTest`).
2. **Nothing the app sends can grant Premium on the server** — headers, parameters, cookies, a
   refresh body or a self-signed token (`EntitlementSpoofingSliceTest`).

An inability to verify is not a verified lack of subscription.

### E2 — the snapshot and when RevenueCat is asked

`users/{uid}.entitlement` = `{ tier, expiresAtMs, checkedAtMs, environment }`, a copy of
RevenueCat's answer. RevenueCat stays the truth; the copy can always be thrown away.

| State of the snapshot | On a paid download | RevenueCat called? |
|-|-|-|
| none | verify, save, decide | once |
| paid, before `expiresAt`, checked < 7 days ago | allow | **no** — the hot path |
| paid, checked ≥ 7 days ago | verify (catches refunds and revocations) | weekly |
| paid, past `expiresAt` | verify: a renewal moves the date on, none means free | at each period end |
| free, checked < 30 s ago | refuse | no |
| free, older | verify (someone who just subscribed gets in) | yes |
| basic, at the 50-story limit, checked ≥ 30 s ago | verify (picks up an upgrade) | yes |
| checked before `ENTITLEMENTS_CACHE_EPOCH` | treated as none | yes |

**Refresh.** After a purchase, restore or a tier change RevenueCat reports, the app calls
`POST /api/entitlements/refresh`; the gateway verifies (at most once per 10 s per family) and
saves. When the gateway refuses a download that the phone believes is paid for, the app refreshes
and retries once before it shows the paywall. The app sends nothing but its token; the gateway
asks RevenueCat itself.

**When verification fails** (timeout, 5xx, 429, malformed, key rejected, key missing, breaker
open): a saved paid tier still inside its paid period is used however old; with no such tier the
family is let in and counted `unverified`. It is never turned free. If the download counts cannot
be read, the download is allowed as `unverified` too (a family RevenueCat says is free is still
refused a paid story).

**Free and referral stories** need no RevenueCat call while the family holds fewer than two
stories (the free limit); past that the tier decides the limit.

Cancellation needs nothing: RevenueCat keeps `expires_date` at the end of the paid period.
`premium_access` beats `basic_access`; unknown entitlement ids are ignored; a sandbox purchase
counts only while `REVENUECAT_ACCEPT_SANDBOX=true`.

### Resilience

Its own `RestTemplate` (connect 1 s, read 2 s) and the Resilience4j breaker `revenuecat`
(`application.properties`, every profile), whose state feeds `app.circuitbreaker.*` and the
existing `CircuitBreakerOpen` alert. No retries on the request path. Deliberately nothing more:
RevenueCat is off the hot path, so its outages matter little.

### Recovery levers (environment, no code change)

`ENTITLEMENTS_ENFORCE=false` (stop all refusals), `ENTITLEMENTS_CACHE_EPOCH=<ISO instant>` (throw
the copies away), `REVENUECAT_ACCEPT_SANDBOX`. What to do for each alert, and the support script
for "I paid but it's locked": [`gateway-service/RUNBOOK-ENTITLEMENTS.md`](gateway-service/RUNBOOK-ENTITLEMENTS.md).

### Metrics and alerts

| Metric | Tags |
|-|-|
| `app.revenuecat.requests` + `app.revenuecat.request.duration` | `outcome`: `active`, `inactive`, `unauthorized`, `rate_limited`, `server_error`, `timeout`, `bad_response`, `circuit_open`, `not_configured` |
| `app.entitlements.decisions` | `decision`, `source` (`free_story`, `referral`, `cache`, `revenuecat`, `stale_cache`, `unverified`), `enforced` |
| `app.entitlements.refresh` | `source` |

Alerts (`gateway-entitlements`): `RevenueCatUnauthorized` (critical), `RevenueCatErrorRate`,
`EntitlementsUnverifiedSpike`, `EntitlementsRefusalSpike`. Each links to a runbook section.

### Testing (TESTING-STANDARD, test-first, mutation-swept)

| Layer | What it proves | Where |
|-|-|-|
| Unit — RevenueCat boundary | Every answer and failure of the real API shape: active/expired/lifetime/sandbox/unknown entitlement/both tiers, 401/403/404/429/5xx, timeout, malformed body, unreadable expiry, missing key, id escaping, breaker opening, metrics per outcome | `RevenueCatClientTest` (`MockRestServiceServer`) |
| Unit — state machine | Every row of the table above, refresh, cache epoch, snapshot unreadable/unwritable | `EntitlementServiceTest` |
| Unit — decisions | Free/referral/paid, limits per tier, held stories, lapsed re-download, upgrade re-check, counts unreadable | `DownloadAccessServiceTest` |
| Invariants | Promise 1 across every failure × three kinds of verified payer; not-verifiable ≠ free; verified free is refused | `EntitlementInvariantsTest` |
| Slice (real security filters) | Refresh endpoint; enforced vs log-only; decision metric recorded; promise 2 with the real services | `EntitlementControllerSliceTest`, `StoryDownload*SliceTest`, `EntitlementSpoofingSliceTest` |
| Contract | Every alert reads a metric the gateway emits, links a runbook section that exists; `promtool check rules` in CI | `AlertRulesTest`, `backend-checks.yml` `alert-rules` |
| Functional (Docker, WireMock for RevenueCat) | Refresh verifies and saves; a second refresh uses the copy; a refresh body cannot set the plan; unauthenticated refused | `entitlements.feature`, `wiremock-server/mappings/revenuecat.json` |
| App | Refresh after purchase/restore/tier change, never blocking; refresh-and-retry once on a refusal the phone disagrees with; no loop; nothing sent as proof | `entitlement-refresh.test.ts`, `subscription-service.test.ts`, `story-download-services.test.ts` |

**CI:** every PR runs all of the above except the Docker functional tests' GCP variant
(`backend-checks.yml`: gateway tests with the coverage floor, alert rules, Docker functional tests;
the app pipeline runs Jest). No test calls the real RevenueCat.

**Not yet built — sandbox contract test.** The table encodes assumptions about RevenueCat and the
stores (cancellation keeps `expires_date`, refunds end it early, renewal moves it, grace periods
keep it active) that should be proven against RevenueCat, not inferred. Proposed:
a `workflow_dispatch` job with a sandbox project key that grants and revokes a promotional
entitlement through RevenueCat's REST API and checks the gateway's reading of each answer; store
behaviour (renewal, refund) checked by hand with a sandbox tester before launch and recorded here.

### Removed

The webhook (`POST /webhooks/revenuecat`, its DTO, security exemptions, `REVENUECAT_WEBHOOK_SECRET`).
Delete that GitHub secret and any webhook saved in RevenueCat.

### Operator steps

1. RevenueCat → Project settings → API keys → create a **secret** key (`sk_…`, v1).
2. `gh secret set REVENUECAT_SECRET_API_KEY --repo Tantum-Arbiter/Colearn` (never in the app).
3. Deploy; ship a TestFlight build with the refresh calls; watch
   `app_entitlements_decisions_total{enforced="false"}` for wrongful `subscription_required`.
4. Set `ENTITLEMENTS_ENFORCE=true` in `gateway-build.yml`.

---

## 8. Phase F — voice recording sync — *dropped 2026-09-24, F1 kept*

> The operator decided recordings are not synced at all. Only F1 below stands; F2–F6 are
> withdrawn and the consent scope is `core` only. The table is kept as the record of what was planned.

Recordings are grown-ups reading aloud ("so your child hears you — even apart",
`grow-with-freya/locales/en/index.ts:702,990`). Until this phase, the phone's own backup already
carries them to a new iPhone (Documents directory, `services/voice-recording-service.ts:38`).

| Task | Change |
|-|-|
| **F1** Grown-ups only | Recording behind the existing parental gate; copy addressed to adults. Keeps this adult data and out of COPPA's child-voice rule. |
| **F2** Opt-in | "Keep my recordings on all my devices", off by default, with its own consent record (`scope: 'voiceSync'`). |
| **F3** Storage | Private GCS bucket in europe-west2, `voice/{uid}/{voiceOverId}/{pageId}.m4a`; signed PUT/GET, short-lived; metadata at `users/{uid}/voiceOvers/{id}` `{ storyId, label, pageIds }`; 200 MB per account cap. |
| **F4** Use limits | Playback only. No transcription, no ML, no analytics, no third parties. Never processed to identify a speaker (keeps it out of UK-GDPR special category). |
| **F5** Deletion | Delete in app → delete on server. Sync off → offer to remove server copies. Account deletion removes the prefix. |
| **F6** Legal | Privacy policy and website updated **in the same release**; DPIA section. |
| **F7** Android backup | Check whether the Android build allows Auto Backup today (⚠️ unverified). |

---

## 9. Compliance workstream (runs alongside)

| Task | When |
|-|-|
| **L1** DPIA covering §5, §6, §8 (required by the UK Children's Code) | Before Phase C ships |
| **L2** Privacy policy data list updated per phase | With each phase |
| **L3** Confirm the Firestore region (⚠️ unverified); document any transfer | Before Phase C |
| **L4** Retention statement: child data lives until account deletion; nothing else kept | With Phase C |
| **L5** No reuse of synced data for analytics or recommendations without separate opt-in | Standing rule |

---

## 10. Decisions for the operator — answered 2026-09-23

| # | Question | Decision |
|-|-|-|
| 1 | A5 — which CMS stories are free | Keep things as they are; there is no content yet. A5 is deferred and does not block release. |
| 2 | B2 — `isShareToUnlock` | Later. Not in this phase. |
| 3 | B7 — `springdoc-openapi` | No. The README rewrite is enough. |
| 4 | Phase C — one child or many | Recommended default, not yet confirmed: model many (`children/{childId}`), ship with one. |
| 5 | Phase E timing | After Phase C, before any push on paid content. |
| 6 | Old-client window for `/api/profile` | None needed: TestFlight only, no store release. Phase C replaces it outright (C2). |

## 11. Order and rough size

| Phase | Size | Gate |
|-|-|-|
| 0 — test gates | ~3–4 days | First; 0.4, 0.5 (`story-loader`) and 0.7 before the A tasks that use them |
| A — blockers | ~2–3 days | Before the client ships |
| B — hygiene | ~1 week | The sprint after |
| C — child sync | ~2 weeks | L1, L3 done |
| D — achievements | ~2 weeks | Needs C's child document |
| E — entitlements | ~1 week | After C, before paid content |
| F — voice sync | — | Dropped; F1 only |

Every task follows the house loop: failing test first, implement, mutation sweep, simulator check
on phone and tablet for app work, and a commit only on the operator's word. A task is done when it
meets [`TESTING-STANDARD.md`](TESTING-STANDARD.md) §6.
