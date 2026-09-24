# Testing standard

> Applies to `gateway-service` (JUnit), `func-tests` (Cucumber) and `grow-with-freya` (Jest).
> Each project's `AGENTS.md` covers its tooling and commands; this file covers **what a change
> must prove**. Written 2026-09-23 from an audit of all three suites on `mvp` @ `8eba5055`.
> Where the suites fall short today, see §7 and Phase 0 of
> [`PHASE-8-BACKEND-ALIGNMENT.md`](PHASE-8-BACKEND-ALIGNMENT.md).

**Why this exists.** The written rules in each `AGENTS.md` were already sound. The code drifted
from them anyway, and the gaps they left are where the release blockers hid: no test sends the
app's real traffic through the security filters, the one func-test environment in CI has request
validation off, and the app's backend-facing services are only ever mocked, never tested. A rule
no one checks is a wish. This file is the checklist a change is reviewed against.

---

## 1. The loop

1. Write the failing test first. Run it and confirm it fails **for the reason you expect**.
2. Write the least code that passes it.
3. Cover the edge cases in §3 that apply, as a table where the inputs vary (§4).
4. Break the code on purpose (the mutation sweep): flip a condition, drop a guard, return early.
   A test must fail each time. A mutant that survives means a missing test; add it.
5. Run the whole suite, types and lint for the project.

---

## 2. Which layer proves what

| Layer | Proves | Rule |
|-|-|-|
| **Unit** (JUnit, Jest) | One class or function, every branch | Every service, filter, mapper and model with logic has its own test file. Being mocked inside another test does not count. |
| **Controller slice** (gateway) | The HTTP contract of one controller **through the real filter chain** | `@WebMvcTest(XController.class)` with the security config and filters loaded, collaborators `@MockBean`. Never `addFilters = false` in new tests. |
| **Serialisation** (gateway, app) | A model survives JSON and Firestore mapping with every field intact | One round-trip test per model or DTO that crosses a boundary, fed a **real** fixture (a CMS `story-data.json`, a captured request body). |
| **Functional** (Cucumber) | An endpoint end to end, against a gateway configured **like prod** | Every endpoint has a scenario for success **and** for each 4xx it can return. Request validation stays on. |
| **Journey** (Maestro) | A person gets from A to B on a device | See [`QA-AUTOMATION.md`](QA-AUTOMATION.md). Not a substitute for any layer above. |

A contract change (a field added, renamed or re-shaped between the app, the gateway and the CMS)
needs a test on **both** sides that uses the same fixture.

---

## 3. The edge-case checklist

Go through each group that touches the change. For each item, either write the test or be able
to say why it cannot happen.

**Input**
- `null`, missing, empty string, whitespace-only, empty list, **empty object `{}`**.
- An empty value must never overwrite a real one (the `{}` translations bug, `story-loader.ts:190`).
- Unknown fields are ignored, not rejected; wrong types are rejected with 400.
- Malformed JSON → 400, never 500.

**Boundaries**
- Exactly at each limit, and one past it: string length, list size, body size, page index,
  batch count. Test `max` and `max + 1`, not "something big".
- Unicode: Polish diacritics, Arabic, emoji (counts as more than one UTF-16 unit), combining marks.

**Legitimate data that looks dangerous**
- Real user and content text: `;`, `<3`, `&`, `#`, `|`, quotes, apostrophes, words containing
  `script` (`subscription`, `description`, `transcript`). These must be **accepted**. For every
  test that proves a filter blocks something, write one that proves it lets the real thing through.

**Auth**
- No token, malformed token, expired (one second either side of expiry), wrong signature, another
  user's resource. Use real signed tokens, not a mocked validator that throws on cue.
- Required headers missing, and the endpoints exempt from them still working without them.

**Downstream failure**
- Firestore, GCS or a provider: error, timeout, empty result. Map to the right status (404, 503),
  never a stack trace or a bare 500.
- The app: network down, timeout, 5xx, 401 → refresh → retry, and refresh itself failing.
  What happens to the data — kept, queued, retried, or dropped on purpose? Assert it.

**Concurrency and sync**
- Two writes at once, and a slow response arriving after a newer one.
- A stale version gets 409; the client pulls, merges and retries.
- Merge rules, one test per rule (union never shrinks, max never falls, last writer wins).
- Idempotency: the same request twice gives the same state.

**Device and offline** (app)
- Offline start, going offline mid-action, coming back online.
- Corrupt or missing local storage.
- Phone and tablet, both orientations, where layout is involved.

**Locale**
- The fallback chain (requested language → English), and a locale with a key missing.
- The age-group fallback, identical on the app and the gateway.
- Copy parity across all 14 locales for any new key.

**Privacy**
- Anything leaving the device: assert the exact set of fields sent, so a new one fails the test.
- No timestamps, identifiers or free text that the plan says must stay on the device.

---

## 4. How tests are written

- **One behaviour per test.** The name says the behaviour: `rejectsNicknameOverTwentyCharacters`,
  `it('keeps bundled text when the CMS page text is empty')`.
- **Tables, not copies.** Inputs that vary are one table: `@ParameterizedTest` (gateway),
  `Scenario Outline` + `Examples` (func-tests), `it.each` / `describe.each` (Jest). Eight
  near-identical tests is a table waiting to happen.
- **Assert the outcome, not the call.** Check the response, the stored state or the returned
  value. `verify(...)` only when the call *is* the behaviour (a message sent, a record deleted).
- **Arrange / Act / Assert**, separated by blank lines. The unit under test is `underTest` in new
  tests.
- **Deterministic.** No `Thread.sleep`, no real timers, no real network. Inject a `Clock` in Java
  and use fake timers in Jest. Anything static you set (`SecurityContextHolder`, a rate limiter,
  a singleton) is reset in teardown.
- **Real fixtures over hand-built ones** at a boundary. A hand-built object proves what you think
  the data looks like; a real `story-data.json` proves what it does look like.
- **Gateway assertions:** JUnit `Assertions`. AssertJ is on the classpath but is not the house
  style; don't mix the two in one file.

---

## 5. Tests worth copying

| Suite | File | Why |
|-|-|-|
| Gateway | `integration/AuthenticationFlowIntegrationTest` | Real signed tokens, ±1 s expiry boundaries, malformed tokens |
| Gateway | `service/RefreshTokenHashingServiceTest` | Null, empty, whitespace, unicode, very long input — one behaviour each |
| Gateway | `controller/StoryControllerTest` | Found / not found / failed for every endpoint, with body assertions |
| Gateway | `service/ContentAnalyticsServiceTest` | Unknown values, stripping, truncation, nulls inside a batch |
| Func | `authentication-unhappy-cases.feature` | Malformed JSON, missing fields, downstream 5xx, 429, 413, missing headers |
| Func | `token-refresh.feature` | Missing, empty, expired, revoked, concurrent refresh |
| Jest | `__tests__/services/api-client-lapse.test.ts` | `it.each` over failure kinds; a real race (a stale response after a newer sign-in) |
| Jest | `services/__tests__/api-client.test.ts` | 401 → refresh → retry, with call counts |
| Jest | `services/__tests__/analytics-service.test.ts` | Asserts the exact field set sent — the privacy allow-list pattern |

---

## 6. Before calling a change done

- [ ] The test failed first, for the expected reason.
- [ ] Every §3 group that applies has its tests, or a stated reason it cannot happen.
- [ ] Varying inputs are a table.
- [ ] A new or changed endpoint has a controller slice test **and** a func-test scenario, success
      and failure.
- [ ] A new or changed boundary model has a round-trip test with a real fixture, on both sides.
- [ ] The mutation sweep found no surviving mutant.
- [ ] The whole suite, types and lint pass.

---

## 7. Where the suites stand

What the audit of 2026-09-23 found, and what Phase 0 of
[`PHASE-8-BACKEND-ALIGNMENT.md`](PHASE-8-BACKEND-ALIGNMENT.md) did about it on 2026-09-24, so no
one assumes a safety net that is not there.

| Found | Now |
|-|-|
| The gateway's unit tests never ran in CI (`Dockerfile` builds with `-x test`) | `gateway-build.yml` runs them before the image is built; `backend-checks.yml` runs them on every pull request |
| JaCoCo reported but set no floor; the Jest floor was 10% | Floors at the measured numbers: gateway 58% lines, 44% branches; app 59/55/55/60. Raise at the end of each phase, never lower |
| CI's only func-tests were `@gcp-dev`, against `gcp-dev`, with request validation off | `backend-checks.yml` runs the local stack (`test,emulator`, validation on) with every scenario but `@ignore` and `@gcp-func-only` |
| Every controller test switched the filters off | New controller tests are `@WebMvcTest` slices through the real chain (`SecuredWebMvcTest`, `TestTokens`): analytics, profile, account |
| Nothing proved a legitimate body got through the filter | `RequestValidationFilterTest` tables: blocked **and** accepted, at each limit and one past it |
| `TokenTamperingTest` stubbed the validator to throw | Real signed tokens: changed signature, swapped payload, `alg: none`, another secret, ±1 s expiry, wrong issuer, refresh-as-access |
| Account-deletion 404/409/500 scenarios stubbed a route the controller never calls | 404 is driven for real; 409 and 500 are proven by `AccountControllerSliceTest` |
| No func-test for analytics or download; reminders happy-path only | `analytics.feature`, `story-download.feature`, a reminder Scenario Outline |
| App `story-loader`, `profile-sync-service`, `background-save-service`, `auth-service` only ever mocked | Each has its own test file |
| No test crossed the app/gateway/CMS boundary with a real payload | `contract-fixtures/` read by both sides |

**Still open:**
- No test at all: gateway `SecurityConfig`, `CloudflareValidationFilter`,
  `InboundRequestTimeoutFilter`, `AssetController`, `FirebaseAuthController`, the content- and
  asset-version repositories.
- `user-management-unhappy-cases.feature` exercises WireMock through the test proxy, not gateway logic.
- The mutation sweep is by hand.
- ⚠️ UNVERIFIED: the two CI workflows have not yet run in GitHub Actions, and the local func-test
  stack has not run since these changes.
