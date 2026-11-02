#!/usr/bin/env python3
"""Render the pipeline dashboard: green, amber, red or grey per workflow and branch.

Reads .github/ci-dashboard.json for which workflows to watch, in which groups and on
which branches; takes each workflow's latest run per branch from the Actions API
(--fetch, with GITHUB_TOKEN and GITHUB_REPOSITORY) or from a JSON file (--runs, a
map of workflow file to its runs, for tests and offline use); writes index.html and
status.json to --out. The page is what GitHub Pages serves; status.json holds the
same facts for anything else that wants them.

green: the latest run passed, and recently enough where staleAfterHours is set.
amber: running or queued, cancelled or skipped, or a pass older than its threshold.
red: failed, timed out, or could not start. grey: no run on that branch.
A group takes the worst state of its cells. Exit 2 when the config cannot be read.
"""

import argparse
import html
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

RANK = {"grey": 0, "green": 1, "amber": 2, "red": 3}
ICON = {"green": "●", "amber": "▲", "red": "■", "grey": "○"}
WORD = {"green": "passing", "amber": "attention", "red": "failing", "grey": "no runs"}
RUNNING = {"in_progress": "running", "queued": "queued", "waiting": "waiting", "pending": "queued", "requested": "queued"}
FAILED = {"failure": "failing", "timed_out": "timed out", "startup_failure": "could not start"}
PAUSED = {"cancelled": "cancelled", "skipped": "skipped", "action_required": "needs approval", "neutral": "neutral", "stale": "stale"}


class Unusable(Exception):
    """The dashboard cannot be built from this input."""


def load_json(path, label):
    try:
        with open(path, encoding="utf-8") as src:
            return json.load(src)
    except (OSError, ValueError) as error:
        raise Unusable(f"the {label} could not be read ({error})")


def parse_time(text):
    return datetime.strptime(text, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)


def format_time(moment):
    return moment.strftime("%Y-%m-%dT%H:%M:%SZ")


def ago(moment, now):
    seconds = max(0, int((now - moment).total_seconds()))
    if seconds < 60:
        return "<1 min ago"
    if seconds < 3600:
        return f"{seconds // 60} min ago"
    if seconds < 86400:
        return f"{seconds // 3600} h ago"
    return f"{seconds // 86400} d ago"


def duration(run):
    if run.get("status") != "completed":
        return ""
    seconds = int((parse_time(run["updated_at"]) - parse_time(run["run_started_at"])).total_seconds())
    return f"{seconds // 60} min" if seconds >= 60 else f"{seconds} s"


def fetch_runs(api, repository, token, workflow_file, branch):
    query = {"per_page": "5"}
    if branch != "any":
        query["branch"] = branch
    url = f"{api}/repos/{repository}/actions/workflows/{workflow_file}/runs?{urllib.parse.urlencode(query)}"
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "User-Agent": "colearn-ci-dashboard",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response).get("workflow_runs", []), None
    except urllib.error.HTTPError as error:
        return None, f"HTTP {error.code}"
    except (urllib.error.URLError, ValueError, TimeoutError) as error:
        return None, str(error)


def latest(runs, branch):
    candidates = [run for run in runs if branch == "any" or run.get("head_branch") == branch]
    candidates.sort(key=lambda run: run.get("run_started_at") or run.get("created_at") or "", reverse=True)
    return candidates[0] if candidates else None


def classify(run, now, stale_after_hours):
    if run is None:
        return "grey", "no runs"
    status = run.get("status")
    if status != "completed":
        return "amber", RUNNING.get(status, status or "running")
    conclusion = run.get("conclusion")
    if conclusion == "success":
        started = parse_time(run["run_started_at"])
        if stale_after_hours and (now - started).total_seconds() > stale_after_hours * 3600:
            return "amber", f"stale pass, older than {stale_after_hours} h"
        return "green", "passing"
    if conclusion in FAILED:
        return "red", FAILED[conclusion]
    return "amber", PAUSED.get(conclusion, conclusion or "unknown")


def describe_run(run, now):
    started = parse_time(run["run_started_at"])
    return {
        "url": run.get("html_url", ""),
        "number": run.get("run_number"),
        "title": run.get("display_title", ""),
        "event": run.get("event", ""),
        "headBranch": run.get("head_branch", ""),
        "startedAt": format_time(started),
        "ago": ago(started, now),
        "duration": duration(run),
        "status": run.get("status"),
        "conclusion": run.get("conclusion"),
    }


def build_cell(branch, runs, error, now, stale_after_hours):
    if error is not None:
        return {"branch": branch, "state": "grey", "summary": f"unavailable ({error})", "run": None}
    run = latest(runs, branch)
    state, word = classify(run, now, stale_after_hours)
    if run is None:
        return {"branch": branch, "state": state, "summary": word, "run": None}
    described = describe_run(run, now)
    where = f" on {described['headBranch']}" if branch == "any" else ""
    summary = f"{word}, {described['event']}{where}, {described['ago']}"
    return {"branch": branch, "state": state, "summary": summary, "run": described}


def worst(states):
    return max(states, key=lambda state: RANK[state]) if states else "grey"


def build_status(config, source, now):
    default_branches = config.get("branches")
    if not isinstance(default_branches, list) or not default_branches:
        raise Unusable("the config names no branches")
    groups = []
    for group in config.get("groups", []):
        workflows = []
        for workflow in group.get("workflows", []):
            if not isinstance(workflow.get("file"), str) or not isinstance(workflow.get("label"), str):
                raise Unusable(f"a workflow in {group.get('name')!r} lacks a file or a label")
            branches = workflow.get("branches", default_branches)
            branches = ["any"] if branches == "any" else branches
            cells = []
            for branch in branches:
                runs, error = source(workflow["file"], branch)
                cells.append(build_cell(branch, runs, error, now, workflow.get("staleAfterHours")))
            workflows.append(
                {
                    "file": workflow["file"],
                    "label": workflow["label"],
                    "state": worst([cell["state"] for cell in cells]),
                    "cells": cells,
                }
            )
        groups.append({"name": group.get("name", ""), "state": worst([w["state"] for w in workflows]), "workflows": workflows})
    counts = {state: 0 for state in RANK}
    for group in groups:
        for workflow in group["workflows"]:
            for cell in workflow["cells"]:
                counts[cell["state"]] += 1
    return {"title": config.get("title", "Pipelines"), "generatedAt": format_time(now), "counts": counts, "groups": groups}


def headline(counts):
    parts = []
    if counts["red"]:
        parts.append(f"{counts['red']} failing")
    if counts["amber"]:
        parts.append(f"{counts['amber']} need{'s' if counts['amber'] == 1 else ''} attention")
    if parts:
        return ", ".join(parts)
    return f"All {counts['green']} passing" if counts["green"] else "Nothing has run yet"


def render_cell(cell, repository):
    state = cell["state"]
    run = cell["run"]
    branch = html.escape(cell["branch"] if cell["branch"] != "any" else "latest")
    summary = html.escape(cell["summary"])
    if run is None:
        detail = ""
    else:
        title = html.escape(run["title"])
        meta = html.escape(" · ".join(part for part in (run["duration"], f"run #{run['number']}") if part))
        detail = f'<a class="run" href="{html.escape(run["url"])}" title="{title}">{title}</a><span class="meta">{meta}</span>'
    return (
        f'<div class="cell state-{state}">'
        f'<span class="dot" aria-hidden="true">{ICON[state]}</span>'
        f'<span class="branch">{branch}</span>'
        f'<span class="summary">{summary}</span>'
        f"{detail}</div>"
    )


def render_html(status, repository, api_url):
    counts = status["counts"]
    overall = worst([state for state in RANK if counts[state]] or ["grey"])
    actions_url = f"https://github.com/{repository}/actions" if repository else "#"
    generated = parse_time(status["generatedAt"]).strftime("%H:%M UTC, %-d %b %Y")
    cards = []
    for group in status["groups"]:
        rows = []
        for workflow in group["workflows"]:
            cells = "".join(render_cell(cell, repository) for cell in workflow["cells"])
            file_url = f"https://github.com/{repository}/actions/workflows/{workflow['file']}" if repository else "#"
            rows.append(
                f'<section class="workflow"><h3><a href="{html.escape(file_url)}">{html.escape(workflow["label"])}</a>'
                f'<code>{html.escape(workflow["file"])}</code></h3><div class="cells">{cells}</div></section>'
            )
        cards.append(
            f'<article class="group state-{group["state"]}"><header><h2>{html.escape(group["name"])}</h2>'
            f'<span class="pill"><span class="dot" aria-hidden="true">{ICON[group["state"]]}</span>{WORD[group["state"]]}</span></header>'
            f'{"".join(rows)}</article>'
        )
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="300">
<title>{html.escape(status["title"])}</title>
<style>
:root {{ color-scheme: light; --surface: #fcfcfb; --card: #ffffff; --line: #e4e3df; --text: #0b0b0b; --muted: #52514e;
  --green: #0ca30c; --amber: #c98500; --red: #d03b3b; --grey: #8a897f; --tint-green: #e9f6e9; --tint-amber: #fff3d6; --tint-red: #fbe6e6; --tint-grey: #efeeea; }}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ color-scheme: dark; --surface: #1a1a19; --card: #232322; --line: #3a3936; --text: #f0efec; --muted: #c3c2b7;
  --green: #0ca30c; --amber: #fab219; --red: #d03b3b; --grey: #8a897f; --tint-green: #1d2d1d; --tint-amber: #332a16; --tint-red: #35201f; --tint-grey: #2a2a28; }} }}
:root[data-theme="dark"] {{ color-scheme: dark; --surface: #1a1a19; --card: #232322; --line: #3a3936; --text: #f0efec; --muted: #c3c2b7;
  --green: #0ca30c; --amber: #fab219; --red: #d03b3b; --grey: #8a897f; --tint-green: #1d2d1d; --tint-amber: #332a16; --tint-red: #35201f; --tint-grey: #2a2a28; }}
* {{ box-sizing: border-box; }}
body {{ margin: 0; background: var(--surface); color: var(--text); font: 15px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }}
main {{ max-width: 1100px; margin: 0 auto; padding: 24px 16px 48px; }}
h1 {{ font-size: 24px; margin: 0; }}
.top {{ display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px 16px; margin-bottom: 20px; }}
.top .headline {{ font-size: 18px; font-weight: 600; }}
.top .when {{ color: var(--muted); }}
.state-green {{ --state: var(--green); --tint: var(--tint-green); }}
.state-amber {{ --state: var(--amber); --tint: var(--tint-amber); }}
.state-red {{ --state: var(--red); --tint: var(--tint-red); }}
.state-grey {{ --state: var(--grey); --tint: var(--tint-grey); }}
.grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }}
.group {{ background: var(--card); border: 1px solid var(--line); border-top: 4px solid var(--state); border-radius: 12px; padding: 16px; }}
.group header {{ display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 8px; }}
.group h2 {{ font-size: 17px; margin: 0; }}
.pill {{ display: inline-flex; align-items: center; gap: 6px; padding: 2px 10px; border-radius: 999px; background: var(--tint); font-size: 13px; font-weight: 600; white-space: nowrap; }}
.dot {{ color: var(--state); }}
.workflow {{ border-top: 1px solid var(--line); padding: 10px 0 4px; }}
.workflow h3 {{ font-size: 14px; font-weight: 600; margin: 0 0 6px; display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: baseline; }}
.workflow h3 a {{ color: inherit; text-decoration: none; }}
.workflow h3 a:hover {{ text-decoration: underline; }}
.workflow code {{ font-size: 12px; color: var(--muted); font-weight: 400; }}
.cells {{ display: flex; flex-direction: column; gap: 6px; }}
.cell {{ display: grid; grid-template-columns: auto auto 1fr; gap: 2px 8px; align-items: baseline; padding: 6px 10px; border-radius: 8px; background: var(--tint); }}
.cell .branch {{ font-weight: 600; font-size: 13px; }}
.cell .summary {{ font-size: 13px; }}
.cell .run {{ grid-column: 2 / span 2; font-size: 13px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }}
.cell .meta {{ grid-column: 2 / span 2; font-size: 12px; color: var(--muted); }}
footer {{ margin-top: 24px; color: var(--muted); font-size: 13px; }}
footer a {{ color: inherit; }}
</style>
</head>
<body>
<main>
<div class="top state-{overall}">
<h1>{html.escape(status["title"])}</h1>
<span class="headline"><span class="dot" aria-hidden="true">{ICON[overall]}</span> {html.escape(headline(counts))}</span>
<span class="when">updated {generated} · refreshes every 5 min</span>
</div>
<div class="grid">
{"".join(cards)}
</div>
<footer>Green: latest run passed. Amber: running, cancelled, or a pass older than its threshold. Red: failed or could not start. Grey: no run on that branch.
<a href="{html.escape(actions_url)}">All workflow runs</a> · built by <code>ci-dashboard.yml</code> from <code>.github/ci-dashboard.json</code>.</footer>
</main>
</body>
</html>
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--config", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--runs", help="JSON map of workflow file to its runs, instead of the API")
    parser.add_argument("--fetch", action="store_true", help="read runs from the Actions API")
    parser.add_argument("--now", help="the current time, YYYY-MM-DDTHH:MM:SSZ")
    args = parser.parse_args()

    try:
        config = load_json(args.config, "config")
        now = parse_time(args.now) if args.now else datetime.now(timezone.utc).replace(microsecond=0)
        repository = os.environ.get("GITHUB_REPOSITORY", "")
        api_url = os.environ.get("GITHUB_API_URL", "https://api.github.com")
        if args.fetch:
            token = os.environ.get("GITHUB_TOKEN", "")
            if not repository or not token:
                raise Unusable("--fetch needs GITHUB_REPOSITORY and GITHUB_TOKEN")

            def source(workflow_file, branch):
                return fetch_runs(api_url, repository, token, workflow_file, branch)

        elif args.runs:
            recorded = load_json(args.runs, "runs file")

            def source(workflow_file, branch):
                entry = recorded.get(workflow_file, [])
                if isinstance(entry, dict):
                    return None, entry.get("error", "unavailable")
                return entry, None

        else:
            raise Unusable("give --fetch or --runs")
        status = build_status(config, source, now)
    except Unusable as error:
        print(f"The dashboard could not be built: {error}.", file=sys.stderr)
        return 2

    cells = [cell for group in status["groups"] for workflow in group["workflows"] for cell in workflow["cells"]]
    unavailable = [cell for cell in cells if cell["summary"].startswith("unavailable")]
    for cell in unavailable:
        print(f"{cell['branch']}: {cell['summary']}", file=sys.stderr)
    if cells and len(unavailable) == len(cells):
        print("Every workflow was unavailable, so the page was not written; the last published one stands.", file=sys.stderr)
        return 1

    os.makedirs(args.out, exist_ok=True)
    with open(os.path.join(args.out, "status.json"), "w", encoding="utf-8") as out:
        json.dump(status, out, indent=2)
        out.write("\n")
    with open(os.path.join(args.out, "index.html"), "w", encoding="utf-8") as out:
        out.write(render_html(status, repository, api_url))
    print(f"{headline(status['counts'])}; wrote {args.out}/index.html and status.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
