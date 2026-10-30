# Agent Operating Rules — `security` (Penetration / Security Tests)

> Read this **after** the root `../AGENTS.md`.
> Python / pytest security test suite — auth bypass, JWT signature attacks, rate-limit probes.
> **These tests target a running gateway. Treat every change with extreme care.**

---

## 1. Communication

Communication & code-display rules: see root `../AGENTS.md` → **Communication & Code Display**.

---

## 2. What Lives Here

| Layer | Location |
|---|---|
| Auth bypass tests | `auth-tests/test_auth_bypass.py` |
| JWT signature tests | `auth-tests/test_jwt_signature_bypass.py` |
| Rate-limit probes | `auth-tests/test_rate_limiting.py` |
| Shared helpers | `auth-tests/shared_utils.py` |
| Test data | `resources/credentials_test_data.json` |
| pytest config | `pytest.ini` (markers: `slow`, `security`, `auth`, `rate_limit`) |
| Venv | `venv/` (do not commit) |

---

## 3. Safety Rails (read first)

- **Use only a local gateway / emulator for this agent workflow.** Shared-environment security testing needs a separately authorized scope; this document grants no production access.
- **Never commit real credentials.** `resources/credentials_test_data.json` contains *test* credentials only — verify before any change.
- **Rate-limit tests are inherently disruptive** — running them against a shared environment will trip the rate limiter for other users. Use a dedicated env.
- Every test here asserts that the attack is **denied** (a 400/401/403, or `pytest.fail` on a 200), so green means protected and red means a bypass worked. Read the assertion before interpreting a result all the same, and report the observed attack outcome separately from the pytest status. A successful bypass is a finding; never weaken an assertion to hide it.
- **No real PII** in test fixtures, ever. Synthetic data only (root AGENTS.md: COPPA/UK-GDPR).
- **The local stack signs in stub tokens.** With the `test` profile active the gateway accepts only `valid-google-*`, `mock-id-token-<digits>`, `valid-apple-*` and `firebase-id-token` / `test-firebase-id-token` as provider tokens (`JwtConfig`), refuses every other string, and refuses to start beside `prod` or `gcp-dev`. Its rate limits are 6000/min, so the rate-limit probes can only warn there; the hard assertions are the injection, forged-token, spoofed-IP and refresh ones.

---

## 4. Test-Driven Development

### Workflow
1. **Write the failing security probe first.** Confirm it correctly demonstrates the attack vector against an intentionally vulnerable local target before pointing at the real gateway.
2. Use `pytest` markers (`@pytest.mark.security`, `@pytest.mark.auth`, `@pytest.mark.rate_limit`, `@pytest.mark.slow`) to allow targeted runs.
3. Match the style of surrounding tests in the same file.
4. Use **`pytest` fixtures** for setup/teardown — never `setUp` / `tearDown` methods.

### Quality
- **Deterministic.** No reliance on wall-clock timing beyond what the test explicitly asserts (e.g. rate-limit window).
- **One vulnerability per test.** Don't bundle "auth bypass" and "JWT manipulation" into one test.
- Variable name for the unit under test: **`underTest`** when meaningful (often the HTTP client / wrapper) — for behavioural probes, this may not apply.
- Use `assertpy` or `pytest`-native assertions; don't introduce new assertion libraries without approval.
- A `requests.Response` is falsy for every 4xx and 5xx. Test `response is not None`, never `if response:`, or denied answers vanish from the count and a protected gateway reads as unreachable.

---

## 5. Editing Rules

- **Type hints everywhere** — `def attempt_google_auth(token: str) -> Response:`.
- **`dataclasses` / `pydantic`** over raw dicts for fixture payloads.
- **`with` blocks** for sessions, files, subprocesses.
- **No comments** beyond the file-level docstring and pytest markers. Function/test names carry intent.
- Reuse `shared_utils.py` helpers (`attempt_google_auth`, `attempt_apple_auth`, `attempt_protected_endpoint`, `attempt_auth_status`) — don't fork local copies.
- Read all credentials and target URLs from env vars or the `resources/` JSON — **never** hardcode tokens, URLs, or user IDs.

---

## 6. Evidence-Based Analysis

For a security finding, capture:
```
Test: security/auth-tests/test_<name>.py::test_<case>
Marker: <auth | rate_limit | security>
Target: <local | dev | staging>
Expected protection: <attack denied and protected state unchanged>
Observed outcome: <attack denied | bypass succeeded | inconclusive>
Assertion type and pytest result: <protection regression | exploit reproduction; PASS | FAIL | NOT RUN>
Request: <method, path, redacted headers, redacted body>
Response: <status, redacted body>
Reproducibility: <every run | intermittent — N/M>
```
**Redact** all secret material when reporting — never include real tokens, keys, or credentials in transcripts.

---

## 7. Refactoring

- When a vulnerability is fixed in `../gateway-service/`, the test that caught it keeps asserting denial and should now pass; keep the reproducer intact. Never invert or loosen a test because it started failing.
- **Always ask** before deleting a test — security tests are evidence of past coverage.

---

## 8. Commits

Commit rules: see root `../AGENTS.md` → **Commits**. **Never include attack payloads in commit messages** — refer to them via test name only.

---

## 9. Commands

```bash
# Activate venv (from security/)
source venv/bin/activate

# Point the probes at a gateway (this is the default)
export GATEWAY_BASE_URL=http://localhost:8080

# Run all security tests
pytest

# What CI runs against the compose stack (backend-checks.yml, job security-probes):
# everything but the 65-second rate-limit reset wait
pytest --deselect auth-tests/test_rate_limiting.py::TestRateLimiting::test_rate_limit_recovery

# Run by marker
pytest -m security
pytest -m auth
pytest -m "rate_limit and not slow"

# Run a single file or test
pytest auth-tests/test_auth_bypass.py
pytest auth-tests/test_jwt_signature_bypass.py::test_<name>

# Verbose with short tracebacks (default in pytest.ini)
pytest -v --tb=short
```

---

## 10. Out of Scope

- **Don't add penetration-testing tools (Burp, sqlmap, etc.)** to this project's venv. Use them externally if needed.
- **Don't add CI integration that runs these against a deployed environment on every commit** — those belong in scheduled, isolated security runs only. The throwaway compose stack is different: `backend-checks.yml` runs the probes against it on every backend change.
- **Don't share findings outside the repo** — security issues are filed through the agreed disclosure channel, not in public PRs.
