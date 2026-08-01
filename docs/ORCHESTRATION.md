# Multi-Agent Orchestration Playbook

> How to run a feature end-to-end with the agent team in `.claude/agents/`,
> from directive to QA-approved branch, with minimal operator involvement.
> The session that reads this file is the **orchestrator**.

## The team

| Agent | Model | Writes to | Never touches |
|---|---|---|---|
| `architect` | Opus | `docs/contracts/` | application code |
| `backend-engineer` | Sonnet | `gateway-service/` | frontend, TS interfaces |
| `ux-designer` | Sonnet | `docs/ux/` | application code |
| `ui-engineer` | Sonnet | `grow-with-freya/` (or `website/`) | backend |
| `qa-engineer` | Sonnet | `docs/qa/`, test code only (`func-tests/`, `wiremock-server/mappings/`, `gateway-service/src/test/`, `grow-with-freya/__tests__/integration/`) | all application code |

All coordination flows through the orchestrator and through files. Agents never
talk to each other and share no context.

## The loop

```
directive
   │
   ▼
1. architect ──────────────► docs/contracts/<slug>.md   (synchronous — wait for it)
   │
   ├── open questions that block? ──► escalate to operator, stop
   ▼
2. backend-engineer  ┐
   ux-designer       ┘ in parallel (worktree isolation for backend)
   │
   ▼
3. ui-engineer          (needs contract + UX spec; worktree isolation)
   │
   ▼
4. qa-engineer ────────────► authors functional (func-tests) + integration tests
   │                         from the contract's scenario list (round 1), runs all
   │                         gates ──► docs/qa/<slug>-round-<n>.md
   │
   ├── SHIP ──► merge worktrees (incl. QA's test commits), final full-suite run,
   │            report to operator
   ├── DEFECTS FOUND ──► SendMessage findings to the ORIGINAL implementer
   │                     (context is warm — cheaper than a fresh spawn), then
   │                     re-run QA. Max 3 rounds; still red ⇒ escalate.
   └── BLOCKED ──► fix the environment yourself or escalate; never skip QA.
```

## Orchestrator rules

1. **Architect runs synchronously** (`run_in_background: false`). Everything
   downstream depends on the contract; there is nothing useful to do in parallel.
2. **Pass explicit paths.** Every spawn prompt names the contract file (and UX spec
   for `ui-engineer`). Agents are instructed to stop if not told which contract.
3. **Worktree isolation for code writers.** Spawn `backend-engineer` and
   `ui-engineer` with `isolation: "worktree"`. The orchestrator merges; implementers
   never merge. `ux-designer`, `architect`, and `qa-engineer` run in the main tree
   (docs only / read only). QA runs after merging implementer worktrees so it tests
   the integrated result.
4. **Relay, don't trust summaries.** After each agent reports, read its actual
   output files (contract updates, QA report) before deciding the next step.
   Check the contract's **Open questions** after every agent finishes.
5. **Fix rounds go to the same agent instance** via `SendMessage`, quoting the QA
   defect list verbatim. A fresh spawn re-learns the codebase at full token cost.
6. **Cap the QA loop at 3 rounds.** A feature that can't go green in 3 rounds has a
   contract-level problem — send it back to the architect or the operator, don't
   grind.
7. **Never push, open PRs, or deploy** — root `CLAUDE.md` rule. The loop ends with:
   a local branch, green suites, a SHIP verdict, and a summary for the operator.
   The operator merges.
8. **Honest reporting is load-bearing.** If QA is red, the run failed — report it
   red. The operator not needing to touch the build depends on being able to trust
   a green report.

## Budget notes (Max plans)

Subagent tokens share the session window. Architect earns Opus; implementers and QA
run Sonnet (set in their frontmatter — don't override upward casually). Parallelise
only step 2; everything else is sequential by dependency, not by accident.

## Token efficiency

The expensive failure modes are re-derivation (an agent re-learning what another
agent or an earlier round already established) and transcript bloat (raw file dumps
and full suite output sitting in context forever). Rules:

1. **State lives in files, not in the session.** The contract's Status table, the UX
   spec, and the QA reports are the system of record. That makes sessions
   disposable: start a fresh orchestrator per feature, and if a session compacts or
   dies mid-loop, a new one resumes from the Status table instead of replaying
   history.
2. **Spawn prompts carry paths, not content.** Name the contract file, the UX spec,
   and the specific task. Never paste file contents into a spawn prompt — the agent
   reads the file once, at its own context's expense, not twice at both.
3. **Consume reports, not transcripts.** Agents finish by writing details to their
   output files and returning a one-paragraph summary. The orchestrator reads the
   files it needs and never asks an agent to "paste everything you did".
4. **Fix rounds are scoped.** On round > 1, QA re-verifies the previous round's
   defect list and the affected suites only. The full gates run on any round that
   would issue SHIP. Full-suite-every-round is the single biggest avoidable burn.
5. **SendMessage beats respawn** (rule 5 above) — a warm agent already paid its
   reading cost; a fresh spawn pays it again.
6. **Long output goes through files.** Suites are run redirected to a scratch file
   and the tail is read back; only failing excerpts are ever quoted. This is in each
   agent's definition — don't undo it by requesting verbose output.
7. **Parallelism saves time, not tokens.** Never parallelise to "use the window
   better"; only parallelise where the dependency graph already allows it (step 2).
8. **Cheap models for mechanical rounds.** If a QA round is purely re-running gates
   on a previously reviewed defect list, you may spawn it with `model: haiku`
   override; keep Sonnet for first-round conformance review.

## Directive quality

The loop self-terminates only if the directive is checkable. A good directive names:
the user-visible behaviour, which surfaces it touches (backend / mobile / website),
and any hard constraints (pricing tier, offline expectations, age band). The
architect turns that into acceptance criteria; if the architect can't, it files an
open question and the operator refines the directive — that's the system working.
