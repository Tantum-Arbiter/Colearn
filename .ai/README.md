# Local review orchestration + Pixel Agents office

`.ai` dispatches independent subscription-backed reviews. Pixel Agents is the
read-only presentation layer, not the orchestrator or an authentication service.

| Worker | Existing profile | Fresh-session sequence |
|---|---|---|
| Claude Pro | `~/.claude-pro` | QA / runtime-evidence review |
| Codex 1 | `~/.codex-1` | Test review, then security review |
| Codex 2 | `~/.codex-2` | Independent final review |

The desktop lead remains outside this dispatch loop. Its activity is **not** inferred
or animated. Workers receive only a captured committed diff, task, and optional
verification evidence. They do not run tests or browse themselves. A QA review
without runtime evidence must say so; it is not a completed browser test.

## Install and open

Requires Node >=22.18, npm, Git, existing reviewer subscription logins, Claude CLI
with `--safe-mode`, and the pinned Codex CLI in `config/reviewers.json`.

```bash
cd .ai
npm ci --ignore-scripts
npm run office:setup
node scripts/ai doctor
npm run office
```

Open <http://127.0.0.1:4317>. Use `node scripts/ai office --port 4318` for another
checkout. The process stays in the foreground; Ctrl-C stops it. It is not a service
or scheduled task. Existing logins and account settings are never rewritten.

For the normal background launcher, install the tracked wrapper once and then use it
from anywhere:

```bash
ln -sf /absolute/path/to/repository/.ai/scripts/office-launcher ~/.local/bin/ai-office
ai-office          # starts if needed and opens the browser
ai-office status
ai-office stop
```

The office combines three read-only sources: active/recent Codex task metadata from
the local Codex state store, running/recent Claude session metadata, and lifecycle
events from this review orchestrator. It displays short local task/session titles,
project names, status and tool names; it never sends them to a model or remote server.
Claude discovery uses process/session files. Codex discovery is best-effort because
the local task database schema is not a public compatibility API; a schema mismatch
silently disables that adapter rather than reading arbitrary data or stopping the UI.

Click **Expand office** for the office and manager dashboard side by side. The
dashboard groups observed tasks by project, counts working/waiting/finished tasks,
highlights failures and stale activity, and shows suggested follow-ups. Click a
project or count to filter the searchable task monitor; expand a task for its
reported activity, timestamp and next step. The latest-updates list uses source
timestamps and review events. Escape or **Exit expanded view** returns to the
standard view. On small screens the office stays above the scrolling dashboard.

Activity reported as running without an update for 30 minutes is shown as
**Status unconfirmed** and excluded from the dashboard's Working count. These
counts describe discovered sessions/reviews, not project delivery percentages;
project plans, deadlines and acceptance checks are not connected. A disconnected
feed is marked explicitly and keeps the last known view available.

Setup fetches Pixel Agents at commit
`3537e140c2094761beae748592aeb92ece8edfdd`, verifies a clean pinned checkout,
installs its lockfile with install scripts disabled, and builds its actual renderer.
Generated code/assets live in ignored `vendor/` and `office-dist/`; the upstream
MIT license is copied with them. An already-cloned clean, pinned source can be
supplied with `npm run office:setup -- /absolute/path/to/pixel-agents`.

The upstream server is not started: no transcript scanning, terminal control,
global session discovery, hook installation or `~/.pixel-agents` configuration.
Our adapter translates `.ai` lifecycle events into its WebSocket display protocol.

## Review workflow

From the repository root:

```bash
# Optional: execute a specific check you have chosen.
.ai/scripts/ai verify -- npm --prefix .ai test
# Or use your project's existing browser/test command after the -- separator.

# Review committed changes; --evidence is optional.
.ai/scripts/ai review --base origin/mvp --head HEAD --task /absolute/path/task.md
.ai/scripts/ai review --base origin/mvp --task /absolute/path/task.md --evidence .ai/reports/RUN_ID.evidence.json

.ai/scripts/ai report RUN_ID
.ai/scripts/ai resume RUN_ID
.ai/scripts/ai resume RUN_ID --retry-failed
.ai/scripts/ai resume --watch
.ai/scripts/ai status
```

`RUN_ID` is printed when a run is created. Commit your intended changes first:
working-tree and untracked changes are not included in review packets. Inspect
the selected range and evidence before sending it to the configured providers;
committed secrets are not automatically detected. Task limit: 32 KB. Diff limit:
512 KB. Evidence limit: 160 KB. Oversized inputs fail rather than silently truncate.

The evidence command runs in the current checkout and may have the normal effects
of that command. Its output is private, capped and redacted for common secret
shapes, not a guarantee of removing all sensitive data. Evidence records dirty-tree
status and the commit, and review refuses evidence for another head commit.
Untracked files/external services are not hermetically captured. Failed or truncated
checks remain visibly incomplete. No commands found in reports are executed.

Each run stores its hashed immutable packet, status manifest, validated JSON reports
and redacted failure diagnostics in `.ai/runs/RUN_ID/` (ignored, private files).
Retries use that packet even after checkout changes. Codex test and security reviews
are separate sessions; the final reviewer receives no previous reviewer reports.
Review findings are advisory; no automatic merges, edits, pushes or deployments occur.

Exit codes: `0` all requested jobs completed, `1` failed/interrupted, `2` unknown
command/option, `3` pending/deferred, `130` interrupted by Ctrl-C. Completed review
does not mean zero findings or release approval: read the reports and limitations.

## Quota, authentication and recovery

Usage limits defer jobs, record reset times, and let available reviewers continue.
Unknown reset times use a one-hour backoff. `resume --watch` checks every 30 seconds
and retries only when available; it must be running for automatic retries.
Non-quota failures require `resume RUN_ID --retry-failed`; they are not retried in a
tight loop. Completed jobs are not relaunched. No account switching or overage fallback.

`doctor` checks cached login state without spending model quota. `doctor --probe`
does a small live request. Cached authentication can look valid even if the provider
rejects an expired session; the live review then shows **Sign-in needs attention**.
OAuth providers may still require a manual reauthentication in that same isolated
profile. A missing reviewer login is job-local: that job fails explicitly while the
other signed-in reviewers continue. Wrong-plan, API-key, unsafe-profile, binary and
environment failures still block dispatch. This integration removes routine switching,
not provider login requirements.

A dispatcher lock prevents simultaneous dispatch in one checkout. Do not run review
dispatchers from multiple checkouts against the same profiles simultaneously:
queue/limit state and locks are checkout-local. Ctrl-C kills the worker process group
and preserves the run for resume. After a hard crash, resume recovers a stale lock;
an incomplete lock requires inspection. The office marks orphaned activity as
interrupted instead of leaving characters working forever.

## Privacy and observer boundary

- Workers use minimal allowlisted environments and isolated profiles. Paid-API
  credentials and cloud-provider switches fail preflight. Default/shared/symlink-
  aliased profiles are rejected. Profiles and credentials never enter the office.
- Claude uses safe mode, no tools, and no session persistence. Codex is ephemeral,
  ignores user config/project rules, forces ChatGPT/keyring auth, disables shell,
  hooks/apps/browser/computer/plugin features, and uses read-only sandboxing.
  This is local review containment, not a multi-user security boundary.
- The private JSONL feed contains only allowlisted identifiers, timestamps, phases,
  fixed activity enums, duration and reset time. No prompts, diffs, report text,
  tool arguments, emails, credential data or profile paths are accepted.
- The observer binds 127.0.0.1 only, checks Host and Origin, serves only its
  frontend assets and sanitized status, and rejects HTTP writes. WebSocket input
  accepts only the initial display handshake. UI mutation controls are suppressed;
  no account, process, filesystem-edit or hook-install handlers exist.
- Reconnects replay current state. The activity label means the review process is
  active, not that a particular tool is being executed. Three stable worker
  characters are used. Verification events also appear in the history.
- The bounded feed reader refuses logs above 32 MB. Stop dispatchers and archive
  `.ai/state/events.jsonl` when needed; restart the office after archiving. Do not
  delete run manifests/packets needed by pending retries.

## Development and checks

```bash
cd .ai
npm test
npm run typecheck
npm run test:office       # built office assets + installed Chrome required
npm run smoke:live       # tiny synthetic diff; consumes real subscription quota
```

Unit/integration tests use fake workers and temporary Git repositories, not accounts.
The explicit live smoke uses only a one-line synthetic addition fix. UI tests use
real Pixel Agents assets with clearly synthetic lifecycle fixtures in a temporary
state directory; they never write demonstration events into the real feed.

The `.ai` dependency audit is separate from the pinned upstream build-tool audit.
At implementation time `.ai` had no reported vulnerabilities; upstream's build
dependency tree reported 7 advisories. Its development server and standalone server
are not run. Upgrade the pin deliberately with protocol, asset and browser tests.
