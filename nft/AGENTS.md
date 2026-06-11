# Agent Operating Rules — `nft` (Non-Functional / Load Tests)

> Read this **after** the root `../CLAUDE.md`.
> This project is **Gatling 3 / Scala** load and performance simulations.
> Touch sparingly — changes have to be reviewed by a human before any run that hits a non-local target.

---

## 1. Communication

- Be concise. No flattery. Match the rules in root CLAUDE.md.

---

## 2. What Lives Here

| Layer | Location |
|---|---|
| Simulations | `src/gatling/scala/simulation/` (and `simulationDowntime/`) |
| Reusable scenarios | `src/gatling/scala/scenarios/` |
| Helper scripts | `src/gatling/scala/scripts/`, `wait-and-run.sh` |
| Gradle config | `build.gradle` (Gatling plugin), `settings.gradle` |
| Container | `Dockerfile`, `nginx/` (reverse proxy fixture) |

---

## 3. Safety Rails (read first)

- **Never run a simulation against production without explicit human approval.** Production targets are gated through DNS / Cloudflare and a runaway test can trigger WAF lockouts and rate-limit-induced outages.
- **Never increase target rates, user counts, or duration without approval** — even on staging. Tuning curves are intentional and tied to capacity planning in `../PHASE-4-PROD-READINESS.md` and `../PHASE-5-SCALING-AND-WHITELABEL.md`.
- **Default target is localhost / docker-compose.** Any non-local target must be passed via an explicit env var or JVM arg, never hardcoded into a simulation.
- Sensitive credentials (auth tokens, API keys) **never** committed — read from env at simulation start.

---

## 4. Editing Rules

- **No comments in Scala code** beyond what's already there; intent goes in commit messages.
- Match the style of existing simulations (`PeakLoad`, `RealisticUserTrafficSimulation`, `BatchApiPeakLoad`).
- Use **scenario composition** — extract repeated request chains into `scenarios/` rather than copy-pasting across simulations.
- Use **feeders** (`csv`, `jsonFile`) for per-virtual-user data; don't loop fixed data sets.
- Prefer `inject(...)` ramps (`atOnceUsers`, `rampUsersPerSec`, `constantUsersPerSec`) over `throttle` unless replicating an exact traffic shape.
- Keep simulation files single-purpose — one traffic pattern per file.

---

## 5. Test-Driven Workflow (adapted)

Load tests aren't TDD in the unit sense, but:

1. **State the SLO first.** "p95 < 400ms at 200 RPS for 10 min" — write it in the commit message and the simulation's header.
2. Run against localhost / docker-compose, confirm the simulation actually exercises the intended endpoints.
3. Inspect the Gatling HTML report — check error rates, percentiles, and that the load shape matches the inject curve.
4. Only after local validation, request approval for staging runs.

---

## 6. Evidence-Based Analysis

When reporting a regression:
```
Simulation: nft/src/gatling/scala/simulation/<Name>.scala
Run: <timestamp / build-id>
Target: <localhost | staging | …>
Metric: <p50 | p95 | p99 | error-rate>
Before: <value>   After: <value>
Report: <path or URL to Gatling HTML>
```

---

## 7. Refactoring

- **Always ask** before deleting a simulation file — they're tied to historical reports and trend tracking.
- Renaming a simulation breaks the report archive — avoid unless necessary.

---

## 8. Commits

```
<message>

References: colearn#<issue-number>
```
Never push without explicit permission. **Never trigger a staging/prod run from a commit hook.**

---

## 9. Commands

```bash
# Run all simulations (uses Gatling gradle plugin)
./gradlew gatlingRun

# Run a specific simulation
./gradlew gatlingRun-simulation.PeakLoad
./gradlew gatlingRun-simulation.RealisticUserTrafficSimulation

# Compile only (catches Scala errors without running)
./gradlew compileGatlingScala

# Reports are written to: build/reports/gatling/<simulation>-<timestamp>/index.html
```

---

## 10. Out of Scope

- Don't add new dependencies to `build.gradle` without approval — Gatling's classpath is fragile.
- Don't migrate to a different load tool (k6, JMeter) without an architecture decision.
- Don't run automated load tests in CI without isolation; CI runners can't generate meaningful load.
