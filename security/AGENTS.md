# Agent Operating Rules — `security` (Penetration / Security Tests)

> Read this **after** the root `../CLAUDE.md`.
> Python / pytest security test suite — auth bypass, JWT signature attacks, rate-limit probes.
> **These tests target a running gateway. Treat every change with extreme care.**

---

## 1. Communication

- Be concise. No flattery. Match root CLAUDE.md.

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

- **Never run against production.** Default target is local gateway / emulator. Production runs require explicit approval and a maintenance window.
- **Never commit real credentials.** `resources/credentials_test_data.json` contains *test* credentials only — verify before any change.
- **Rate-limit tests are inherently disruptive** — running them against a shared environment will trip the rate limiter for other users. Use a dedicated env.
- These tests **prove vulnerabilities**. If a test starts passing that was expected to fail (i.e. the bypass now works), **stop and report immediately** — don't "fix" the test to make CI green.
- **No real PII** in test fixtures, ever. Synthetic data only (root CLAUDE.md: COPPA/UK-GDPR).

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
Expected: <test was expected to FAIL — bypass should be blocked>
Actual: <test PASSED — bypass succeeded>
Request: <method, path, redacted headers, redacted body>
Response: <status, redacted body>
Reproducibility: <every run | intermittent — N/M>
```
**Redact** all secret material when reporting — never include real tokens, keys, or credentials in transcripts.

---

## 7. Refactoring

- Security tests **fail loudly when the system is fixed** — this is by design. When a vulnerability is patched in `../gateway-service/`, the corresponding test should be **inverted** (now asserting the bypass fails), not deleted.
- **Always ask** before deleting a test — security tests are evidence of past coverage.

---

## 8. Commits

```
<message>

References: colearn#<issue-number>
```
Never push without explicit permission. **Never include attack payloads in commit messages** — refer to them via test name only.

---

## 9. Commands

```bash
# Activate venv (from security/)
source venv/bin/activate

# Run all security tests
pytest

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
- **Don't add CI integration that runs these against staging on every commit** — they belong in scheduled, isolated security runs only.
- **Don't share findings outside the repo** — security issues are filed through the agreed disclosure channel, not in public PRs.
