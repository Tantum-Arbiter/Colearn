# Agent Operating Rules — `gateway-service` (Backend)

> Read this **after** the root `../CLAUDE.md` (project identity, principles, never-rules).
> This file covers **how to work**, not **what the product is**.

---

## 1. Communication

Communication & code-display rules: see root `../CLAUDE.md` → **Communication & Code Display**.

---

## 2. Test-Driven Development

What a change must prove — the layers, the edge-case checklist, the done list — is in
[`../TESTING-STANDARD.md`](../TESTING-STANDARD.md). This section covers how to do it in this project.

### Workflow (non-negotiable)
1. Find or create a **failing test first**.
2. Match the style of surrounding tests: same file → same package → same module.
3. Run the test, confirm it fails for the **right reason**.
4. Write the minimum code to make it pass.
5. Re-run, confirm green.
6. Refactor while tests stay green.
7. Run `./gradlew compileJava compileTestJava` before moving on.

### Test Quality
- One behaviour per test. Test names describe behaviour, not implementation.
- Deterministic — no `Thread.sleep`, no real wall-clock dependencies, no shared static state. Inject a `Clock` where time matters; clear `SecurityContextHolder` in `@AfterEach` if a test sets it.
- Prefer **`@ParameterizedTest`** over copy-pasting `@Test` methods with different inputs.
- Variable name for the unit under test: **`underTest`** (adopt going forward; don't retrofit existing tests).
- Use AAA structure (Arrange / Act / Assert) with blank lines between sections.

### Tooling
| Concern | Current | Notes |
|---|---|---|
| Runner | JUnit 5 (Jupiter) | `useJUnitPlatform()` in `build.gradle` |
| Assertions | `org.junit.jupiter.api.Assertions.*` | The house style. AssertJ arrives with `spring-boot-starter-test` and two health tests use it, but new tests use JUnit `Assertions`; never mix the two in one file |
| Mocks | Mockito + `@ExtendWith(MockitoExtension.class)` | Current convention is `@Mock` field injection — match it in new tests |
| Controller tests | `@WebMvcTest(XController.class)` with the security config and filters loaded, collaborators `@MockBean` | New controller tests keep the filters **on**, so requests pass the real chain. The existing `@SpringBootTest` + `addFilters = false` tests stay until touched; don't copy them |
| Coverage | Jacoco | `jacocoTestReport` runs after `test`. Report only: no floor, and CI does not run the tests yet (`Dockerfile` builds with `-x test`), so run them locally before every commit |
| HTTP mocks (unit) | `MockMvc` / `WebTestClient` | WireMock is **not** in `gateway-service` deps — don't introduce it for unit tests |
| HTTP mocks (functional) | **`func-tests/`** | Cucumber + WireMock + Testcontainers live there — write end-to-end HTTP scenarios in that project, not here |

### Spring Boot Specifics
- **Never use `@CrossOrigin`** on controllers — CORS is centralised in `SecurityConfig` (root CLAUDE.md).
- **Constructor injection only.** Fields are `private final`; wire via the constructor. `@Autowired` on the constructor is the current convention (technically optional for single-constructor classes since Spring 4.3 — match the surrounding file). **Never** `@Autowired` on fields or setters.
- `@Transactional` belongs on the service layer, not controllers or repositories.
- Firestore repository tests mock `Firestore` and `ApplicationMetricsService` — see `StoryRepositoryTest` for the mocking pattern. It covers only the happy path and not-found; add the failure and timeout cases it lacks.
- For security-context-dependent code, use `spring-security-test` (`@WithMockUser`, `SecurityMockMvcRequestPostProcessors`).

---

## 3. Editing Rules

- **No comments in code.** Use meaningful names and small methods. Existing Javadoc stays; don't add new explanatory comments unless asked.
- Use **Java 21 features**: records, sealed types, pattern matching for `switch`, text blocks, `var` for local inference where it improves readability.
- Don't static-import `List.of()`, `Map.of()`, `Set.of()` — keep the class prefix.
- Prefer **composition** over inheritance, **streams/iteration** over recursion. Ask before recursing.
- Prefer **immutable** types (records, `List.copyOf`, `Map.copyOf`).
- Use **Gradle wrapper** for everything (`./gradlew ...`) — never the system `gradle`.
- Manage deps via `build.gradle` edits **only** for explicit dependency additions; never hand-edit lockfiles.
- When making assumptions or deferring work, write them in a plan file — ask which file to use.

### Aspirational (apply incrementally, not retroactively)
- New tests can move toward `Mockito.mock()` + constructor wiring (over `@Mock` field injection) once a critical mass exists. **Don't mix styles within one test file.**

---

## 4. Evidence-Based Analysis

Every claim about the codebase includes:
```
File: gateway-service/<relative path>
Lines X-Y:
    <exact snippet>
```
If you can't verify: **"⚠️ UNVERIFIED — Unable to confirm this claim in codebase"**. No guessing — ask.

---

## 5. Bug Analysis (use this skeleton)

**Description** — expected vs actual; when it started; affected envs/users.
**Reproduction** — exact steps + request/response; reproducibility rate.
**Impact** — technical (controllers, services, repos, similar bugs) / business (users, regions, features) / downstream (mobile app contract, Firestore schema, GCS, Cloudflare).
**Root cause** — entry point (controller/filter) → data flow → failure point → wrong assumption.
**Fix approach** — describe (don't implement unless asked); cite existing patterns; list downstream changes (tests, OpenAPI / TS interface mirror, Firestore schema, migration scripts).

---

## 6. Refactoring

- Mobile TS interfaces **must** stay in sync with Java models (root CLAUDE.md). Any model change is a two-side change.
- Migrate **all scenarios** in a test file before asking to delete the old one.
- **Always ask** before deleting a file.
- When moving classes between packages, minimise file churn — refactor in place where possible.

---

## 7. Commits

Commit rules: see root `../CLAUDE.md` → **Commits**.

---

## 8. Build Failure Analysis

1. **3-line summary** of the most likely cause.
2. **Failed jobs** table: `| Job | Started | Completed | Duration |`.
3. **Per-failure**: suggested fix · relevant logs (collapse > 10 lines in `<details>`) · confidence (high/med/low). Low-confidence items skip detail.
4. For Gradle-specific failures: include the failed task name and `--info`/`--stacktrace` excerpt if helpful.

---

## 9. Commands

```bash
# Compile
./gradlew compileJava compileTestJava

# Test
./gradlew test                                          # all tests
./gradlew test --tests "com.app.repository.StoryRepositoryTest"   # single class
./gradlew test --tests "*StoryRepositoryTest.shouldFindById"      # single method
./gradlew test --tests "com.app.integration.*"          # integration package

# Coverage report (HTML at build/reports/jacoco/test/html/index.html)
./gradlew jacocoTestReport

# Run locally
./gradlew bootRun

# Full clean rebuild
./gradlew clean build

# Dependency tree (debug CVE / version forces)
./gradlew dependencies --configuration runtimeClasspath
```
