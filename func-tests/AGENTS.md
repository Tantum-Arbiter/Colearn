# Agent Operating Rules — `func-tests` (E2E / Cucumber)

> Read this **after** the root `../CLAUDE.md` and `../gateway-service/AGENTS.md`.
> This project tests `gateway-service` end-to-end against a real WireMock server.

---

## 1. Communication

Communication & code-display rules: see root `../CLAUDE.md` → **Communication & Code Display**.

---

## 2. What Lives Here

| Layer | Location |
|---|---|
| Gherkin features | `src/test/resources/features/*.feature` |
| Step definitions | `src/test/java/com/app/functest/stepdefs/` |
| Base step class | `BaseStepDefs.java` — shared HTTP client, context, before/after |
| Test data (assets, stories) | `src/test/resources/test-data/` |
| WireMock stubs (in-project) | `src/test/resources/wiremock/` — **not loaded by anything**; the Docker stack mounts only the root mappings below. Don't add stubs here |
| WireMock stubs (standalone server) | **root** `../wiremock-server/mappings/` |
| Docker orchestration | `Dockerfile`, `entrypoint.sh`, `../docker-compose.functional-tests.yml` |

The gateway runs under the `test,emulator` profiles (`../docker-compose.functional-tests.yml:101`), with request validation **on** as in prod. Keep it on: never switch a filter off to make a scenario pass. External providers (Firebase, Google OAuth, Apple OAuth) are mocked by WireMock with JSON-only configuration — no Java code in the WireMock server.

---

## 3. Writing Scenarios (Gherkin)

What a change must prove — every endpoint's success **and** each 4xx it can return, the edge-case
checklist, the done list — is in [`../TESTING-STANDARD.md`](../TESTING-STANDARD.md).

### Workflow
1. **Write the `.feature` first** — describe the user-visible behaviour in business language.
2. Run it — Cucumber will report missing step definitions.
3. **Reuse existing step defs** before writing new ones. Search `stepdefs/` for matching `@Given`/`@When`/`@Then` patterns.
4. New step defs go in the most cohesive existing class, or a new `<Domain>StepDefs.java` if no fit.
5. Extend `BaseStepDefs` for shared state (HTTP client, current response, auth tokens).

### Style Rules
- **Business language, not implementation.** `Given the user is signed in with Google` — not `Given a POST to /auth/google with body {…}`.
- Reuse vocabulary across features — if one feature says "the user", every feature says "the user".
- Use `Scenario Outline` + `Examples` for parameterised flows; don't copy-paste scenarios.
- Tag every feature with its domain (`@authentication`, `@user-profile`, `@delta-sync`, `@story-pages`, …) and where it can run (`@local`, `@docker`, `@gcp-dev`, `@emulator-only`). Tag scenarios by kind: `@smoke`, `@error-handling`, `@validation`, `@security`. Reuse an existing tag before inventing one.
- **CI runs only `@gcp-dev` scenarios**, against the dev deployment (`../.github/workflows/gateway-build.yml:228`). A scenario missing that tag never runs in CI.
- One scenario = one behaviour. If you need `And` 6+ times, you're testing too much.

### Step Def Rules
- Steps idempotent within a scenario; **never** rely on order from a previous scenario.
- HTTP calls via `RestAssured` — match the patterns in `GatewayStepDefs`.
- Assertions: REST-assured's `.then().statusCode(...).body(...)` is the convention. Non-HTTP assertions use JUnit `Assertions`, as in `gateway-service`.
- Reset WireMock state between scenarios where stubs differ — see `BaseStepDefs` hooks.

---

## 4. WireMock Stub Rules

- **JSON-only.** No Java stubs. Keep parity with the existing files in `wiremock-server/mappings/`. Older step defs register stubs with `WireMock.stubFor` from Java; don't add more, and move one to JSON when you touch it.
- A stub must sit on a route the gateway actually calls. A stub for a path the controller handles itself proves nothing (see the account-deletion 404/409/500 scenarios).
- One mapping per scenario *family* — don't create per-test stubs that drift.
- For dynamic responses (echoing request data), use WireMock response templating (`{{request.body}}` etc.) — match existing patterns.
- When stubbing OAuth providers, include realistic error variants (`firebase-auth-errors.json`, `google-oauth-errors.json` patterns).

---

## 5. Editing Rules

- **No comments in step defs or features.** Gherkin is the documentation.
- Match Java 21 conventions from `../gateway-service/AGENTS.md` for step-def Java code (records for DTOs, no field `@Autowired`, etc.).
- **Never modify gateway-service code from here** — if a test reveals a service bug, fix it in `gateway-service/` with its own unit test first.
- Don't share state across scenarios via static fields — use Cucumber `@ScenarioScope` / Spring scope. `BaseStepDefs` still holds its response and token in static fields; don't add more.

---

## 6. Evidence-Based Analysis

When reporting a test failure, include:
```
Feature: func-tests/src/test/resources/features/<name>.feature
Scenario: <name>
Step: <text of failing step>
Step def: func-tests/src/test/java/com/app/functest/stepdefs/<Class>.java:<line>
Failure: <exact assertion message or HTTP status mismatch>
```

---

## 7. Refactoring

- When migrating a step def, **all scenarios using it must keep passing** — never delete a step def class without confirming usages with `grep -r "stepdef-pattern" src/test/resources/features/`.
- **Always ask** before deleting a feature file or WireMock mapping.

---

## 8. Commits

Commit rules: see root `../CLAUDE.md` → **Commits**.

---

## 9. Commands

```bash
# Run all scenarios (needs gateway-service + WireMock running).
# Skips @ignore, @gcs-required and @emulator-only unless CUCUMBER_TAGS is set.
./gradlew cucumberTest

# Run by tag (use tags to run one feature)
CUCUMBER_TAGS="@user-profile and not @ignore" ./gradlew cucumberTest

# What the Docker image runs (entrypoint.sh)
./gradlew functionalTest

# Reports (after run): build/cucumber-reports/cucumber.html, cucumber.json, cucumber-junit.xml

# Full Docker stack (gateway + WireMock + tests)
docker compose -f ../docker-compose.functional-tests.yml up --abort-on-container-exit
```

---

## 10. Safety Rails

- **No real OAuth tokens** in features, step defs, or test-data — only WireMock-stubbed responses.
- **No production URLs.** Endpoints under test are localhost / Docker service names.
- **No real Firestore writes.** Firestore is emulated via `../firestore-emulator/`.
- If a scenario needs new test-data assets, place under `src/test/resources/test-data/` — never reference assets from outside this project.
