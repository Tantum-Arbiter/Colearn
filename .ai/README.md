# `ai` — local multi-model review orchestrator

Claude Max (this desktop app) is the lead engineer. Independent reviewers run as separate
subscription accounts, each in its own isolated profile:

| Reviewer | Profile | Role |
|---|---|---|
| Claude Pro | `~/.claude-pro` | Runtime / browser QA |
| Codex 1 | `~/.codex-1` | Test review, then a fresh security review |
| Codex 2 | `~/.codex-2` | Independent final review |

The profiles live in your home folder and are never committed. `config/reviewers.json`
names them with `~/` paths only.

## Commands

```bash
.ai/scripts/ai doctor          # tools, logins, isolation, usage limits
.ai/scripts/ai doctor --probe  # also send each reviewer a one-line prompt (uses a little quota)
.ai/scripts/ai status          # reviewer availability and reviews waiting for a reviewer
```

`doctor` exits non-zero when anything is `FAIL`. It never prints tokens, emails or
environment values.

Not built yet: `init`, `verify`, `review`, `triage`, `report`, `build`, `cleanup`. They
arrive in later phases of the blueprint.

## Subscription logins only

Workers never use paid API access. `ai` refuses to start any worker, and `doctor` fails,
while `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `CODEX_API_KEY`, `ANTHROPIC_AUTH_TOKEN` or
a Bedrock/Vertex/Foundry switch is set. Each Codex profile sets
`forced_login_method = "chatgpt"`, and `doctor` fails a profile signed in with an API key.

Never turn on usage credits or overage in any account to get past a limit.

Every worker gets a minimal environment: `HOME`, `USER`, `LOGNAME`, `PATH`, `SHELL`,
`TMPDIR`, locale, and its own `CLAUDE_CONFIG_DIR` or `CODEX_HOME`. Everything else,
including the desktop app's `ANTHROPIC_BASE_URL`, is dropped. Claude workers start with
`--safe-mode` (no project CLAUDE.md, hooks, skills or MCP) rather than `--bare`, because
`--bare` only authenticates with an API key.

## Usage limits

Subscription accounts run out. When a reviewer reports a usage limit:

1. `ai` reads the reset time from the message (Claude: `resets Sep 19 at 5pm
   (Europe/London)`; Codex: `try again at Sep 20, 2026 3:04 PM` or `try again in 2 days
   3 hours`). With no readable reset time it retries after an hour.
2. The reviewer is marked unavailable until then, and you are told which reviewer and when.
3. The review carries on with the reviewers that are available. A limited reviewer never
   blocks a review or a merge.
4. The skipped review is queued for that reviewer and runs once it is available again; its
   findings are added to the original report.

State lives in `.ai/state/` (gitignored): `availability.json` and `deferred-reviews.json`.
Both are validated on load; a damaged file is reported, never silently reset.

## Safety rules

- Processes are spawned with argument arrays, never a shell, with an explicit working
  directory, a timeout that kills the whole process group, and capped output.
- Reviewer output is untrusted data. It is shown only after ANSI/control/bidi characters
  are stripped and common secret shapes are redacted. Commands found in reports are never run.
- State writes are atomic (temp file, fsync, rename) with mode `600`, and state paths are
  checked against symlink escapes.
- Reviewer prompts in `prompts/` and the report schema in `schemas/` are fixed control files.

## Development

Plain TypeScript run directly by Node 22 type stripping (no build step, no dependencies yet).

```bash
cd .ai
npm test
```

Typecheck with any TypeScript 5.9 compiler plus `@types/node`:

```bash
tsc -p .ai/tsconfig.json
```
