# Agent Operating Rules — `func-tests` (E2E / Cucumber)

> Read this **after** the root `../CLAUDE.md` and `../gateway-service/AGENTS.md`.
> This project tests `gateway-service` end-to-end against a real WireMock server.

---

## 1. Communication

- Be concise. No "Great question!", "You're absolutely right!", "Excellent point!".
- Brief acknowledgements only when they add clarity.

---

## 2. What Lives Here

| Layer | Location |
|---|---|
| Gherkin features | `src/test/resources/features/*.feature` |
| Step definitions | `src/test/java/com/app/functest/stepdefs/` |
| Base step class | `BaseStepDefs.java` — shared HTTP client, context, before/after |
| Test data (assets, stories) | `src/test/resources/test-data/` |
| WireMock stubs (in-project) | `src/test/resources/wiremock/` |
| WireMock stubs (standalone server) | **root** `../wiremock-server/mappings/` |
| Docker orchestration | `Dockerfile`, `entrypoint.sh`, `../docker-compose.functional-tests.yml` |

The gateway service runs under test; external providers (Firebase, Google OAuth, Apple OAuth) are mocked by WireMock with JSON-only configuration — no Java code in the WireMock server.

---

## 3. Writing Scenarios (Gherkin)

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
- Tag scenarios: `@auth`, `@cms`, `@batch`, `@smoke`, `@regression` — Cucumber filters use these.
- One scenario = one behaviour. If you need `And` 6+ times, you're testing too much.

### Step Def Rules
- Steps idempotent within a scenario; **never** rely on order from a previous scenario.
- HTTP calls via `RestAssured` — match the patterns in `GatewayStepDefs`.
- Assertions: REST-assured's `.then().statusCode(...).body(...)` is the convention. AssertJ is **available** here (via `spring-boot-starter-test`) — use it for non-HTTP assertions.
- Reset WireMock state between scenarios where stubs differ — see `BaseStepDefs` hooks.

---

## 4. WireMock Stub Rules

- **JSON-only.** No Java stubs. Keep parity with the existing files in `wiremock-server/mappings/`.
- One mapping per scenario *family* — don't create per-test stubs that drift.
- For dynamic responses (echoing request data), use WireMock response templating (`{{request.body}}` etc.) — match existing patterns.
- When stubbing OAuth providers, include realistic error variants (`firebase-auth-errors.json`, `google-oauth-errors.json` patterns).

---

## 5. Editing Rules

- **No comments in step defs or features.** Gherkin is the documentation.
- Match Java 21 conventions from `../gateway-service/AGENTS.md` for step-def Java code (records for DTOs, no field `@Autowired`, etc.).
- **Never modify gateway-service code from here** — if a test reveals a service bug, fix it in `gateway-service/` with its own unit test first.
- Don't share state across scenarios via static fields — use Cucumber `@ScenarioScope` / Spring scope.

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

```
<message>

References: colearn#<issue-number>
```
Never push without explicit permission (root CLAUDE.md).

---

## 9. Commands

```bash
# Run all scenarios (requires gateway-service + WireMock running)
./gradlew test

# Run a single feature
./gradlew test -Dcucumber.features=src/test/resources/features/authentication.feature

# Run by tag
./gradlew test -Dcucumber.filter.tags="@auth and not @slow"

# Reports (after run)
# HTML:  build/reports/cucumber/index.html
# JUnit: build/test-results/test/

# Full Docker stack (gateway + WireMock + tests)
docker compose -f ../docker-compose.functional-tests.yml up --abort-on-container-exit
```

---

## 10. Safety Rails

- **No real OAuth tokens** in features, step defs, or test-data — only WireMock-stubbed responses.
- **No production URLs.** Endpoints under test are localhost / Docker service names.
- **No real Firestore writes.** Firestore is emulated via `../firestore-emulator/`.
- If a scenario needs new test-data assets, place under `src/test/resources/test-data/` — never reference assets from outside this project.
