#!/usr/bin/env python3
"""Render the pipeline dashboard: green, amber, red or grey per workflow and branch.

Reads .github/ci-dashboard.json for which workflows to watch, in which groups and on
which branches; takes each workflow's recent runs per branch from the Actions API
(--fetch, with GITHUB_TOKEN and GITHUB_REPOSITORY) or from a JSON file (--runs, a
map of workflow file to its runs, or to {runs, jobs, annotations}, for tests and
offline use); writes index.html and status.json to --out. The page is what GitHub
Pages serves; status.json holds the same facts for anything else that wants them.

green: the latest run passed, and recently enough where staleAfterHours is set.
amber: running or queued, cancelled or skipped, a pass older than its threshold, or
a workflow that never ran where one was expected. red: failed, timed out, or could
not start. grey: no run on that branch. A group takes the worst state of its cells.

Behind a red cell the page names the failed jobs and steps, quotes the failure
annotations GitHub kept for them, counts the failures in a row, dates the last pass,
and says what the failure blocks (the config's "blocks"). A strip at the top sums
it up. Exit 2 when the config cannot be read; exit 1 when the API answered for
nothing, so the last published page stands.
"""

import argparse
import html
import json
import os
import re
import statistics
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
RECENT_RUNS = 30
MESSAGES_PER_JOB = 3
MESSAGE_LENGTH = 200
LOG_WINDOW = 60
STAMP = re.compile(r"^\S+Z ")
TELLING = re.compile(r"error|fail|✖|✕|✗|fatal|exception|denied|not found|cannot|unable|exit code|timed out", re.IGNORECASE)
GENERIC = re.compile(r"^(Process completed with exit code|The process '.+' failed with exit code)")


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


def format_duration(seconds):
    return f"{seconds // 60} min" if seconds >= 60 else f"{seconds} s"


def duration_seconds(run):
    if run.get("status") != "completed":
        return None
    return int((parse_time(run["updated_at"]) - parse_time(run["run_started_at"])).total_seconds())


class ApiSource:
    """Runs, jobs and annotations from the Actions API, with the job's own token."""

    def __init__(self, api, repository, token):
        self.api, self.repository, self.token = api, repository, token

    def get(self, path, query):
        url = f"{self.api}/repos/{self.repository}/{path}?{urllib.parse.urlencode(query)}"
        request = urllib.request.Request(
            url,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {self.token}",
                "User-Agent": "colearn-ci-dashboard",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.load(response), None
        except urllib.error.HTTPError as error:
            return None, f"HTTP {error.code}"
        except (urllib.error.URLError, ValueError, TimeoutError) as error:
            return None, str(error)

    def runs(self, workflow_file, branch):
        query = {"per_page": str(RECENT_RUNS)}
        if branch != "any":
            query["branch"] = branch
        body, error = self.get(f"actions/workflows/{workflow_file}/runs", query)
        return (body.get("workflow_runs", []) if body else None), error

    def jobs(self, run_id):
        body, _ = self.get(f"actions/runs/{run_id}/jobs", {"per_page": "50", "filter": "latest"})
        return body.get("jobs", []) if body else []

    def annotations(self, job_id):
        body, _ = self.get(f"check-runs/{job_id}/annotations", {"per_page": "50"})
        return body if isinstance(body, list) else []

    def log(self, job_id):
        """The job log lives behind a redirect to blob storage, which must not see the token."""
        request = urllib.request.Request(
            f"{self.api}/repos/{self.repository}/actions/jobs/{job_id}/logs",
            headers={"Accept": "application/vnd.github+json", "Authorization": f"Bearer {self.token}", "User-Agent": "colearn-ci-dashboard"},
        )
        try:
            with NO_REDIRECT.open(request, timeout=30) as response:
                return response.read(LOG_BYTES).decode("utf-8", "replace")
        except urllib.error.HTTPError as error:
            location = error.headers.get("Location") if error.code in (301, 302, 303, 307, 308) else None
        except (urllib.error.URLError, ValueError, TimeoutError, OSError):
            return ""
        if not location:
            return ""
        try:
            with urllib.request.urlopen(urllib.request.Request(location, headers={"User-Agent": "colearn-ci-dashboard"}), timeout=60) as blob:
                return blob.read(LOG_BYTES).decode("utf-8", "replace")
        except (urllib.error.URLError, ValueError, TimeoutError, OSError):
            return ""


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


NO_REDIRECT = urllib.request.build_opener(NoRedirect)
LOG_BYTES = 8 * 1024 * 1024


class RecordedSource:
    """The same lookups from a JSON file: tests, and building the page offline."""

    def __init__(self, recorded):
        self.recorded = recorded
        self.jobs_by_run, self.annotations_by_job, self.logs_by_job = {}, {}, {}
        for entry in recorded.values():
            if isinstance(entry, dict):
                self.jobs_by_run.update(entry.get("jobs", {}))
                self.annotations_by_job.update(entry.get("annotations", {}))
                self.logs_by_job.update(entry.get("logs", {}))

    def log(self, job_id):
        return self.logs_by_job.get(str(job_id), "")

    def runs(self, workflow_file, branch):
        entry = self.recorded.get(workflow_file, [])
        if isinstance(entry, dict):
            if "runs" in entry:
                return entry["runs"], None
            return None, entry.get("error", "unavailable")
        return entry, None

    def jobs(self, run_id):
        return self.jobs_by_run.get(str(run_id), [])

    def annotations(self, job_id):
        return self.annotations_by_job.get(str(job_id), [])


def classify(run, now, stale_after_hours):
    if run is None:
        return ("amber", "never run, overdue") if stale_after_hours else ("grey", "never run")
    status = run.get("status")
    if status != "completed":
        return "amber", RUNNING.get(status, status or "running")
    conclusion = run.get("conclusion")
    started = parse_time(run["run_started_at"])
    overdue = bool(stale_after_hours) and (now - started).total_seconds() > stale_after_hours * 3600
    if conclusion == "success":
        if overdue:
            return "amber", f"stale pass, older than {stale_after_hours} h, overdue"
        return "green", "passing"
    word = FAILED.get(conclusion) or PAUSED.get(conclusion, conclusion or "unknown")
    state = "red" if conclusion in FAILED else "amber"
    return state, f"{word}, overdue" if overdue else word


def describe_run(run, now):
    started = parse_time(run["run_started_at"])
    base = run.get("html_url", "").split("/actions/")[0]
    seconds = duration_seconds(run)
    pulls = run.get("pull_requests") or []
    return {
        "url": run.get("html_url", ""),
        "number": run.get("run_number"),
        "title": run.get("display_title", ""),
        "event": run.get("event", ""),
        "headBranch": run.get("head_branch", ""),
        "startedAt": format_time(started),
        "ago": ago(started, now),
        "duration": format_duration(seconds) if seconds is not None else "",
        "status": run.get("status"),
        "conclusion": run.get("conclusion"),
        "commitUrl": f"{base}/commit/{run.get('head_sha', '')}" if base and run.get("head_sha") else None,
        "prUrl": f"{base}/pull/{pulls[0]['number']}" if base and pulls and pulls[0].get("number") else None,
    }


def telling_lines(text):
    """The lines worth reading before the first error marker in a job log, timestamps dropped."""
    lines = [STAMP.sub("", line.rstrip()) for line in text.splitlines()]
    marker = next((i for i, line in enumerate(lines) if line.startswith("##[error]")), len(lines))
    window = [line for line in lines[max(0, marker - LOG_WINDOW):marker] if line and not line.startswith("##[")]
    return [line[:MESSAGE_LENGTH] for line in window if TELLING.search(line)][-MESSAGES_PER_JOB:]


def job_messages(source, job):
    noted = []
    for note in source.annotations(job["id"]):
        if note.get("annotation_level") != "failure":
            continue
        first = (note.get("message") or "").strip().splitlines()
        if first:
            noted.append(first[0][:MESSAGE_LENGTH])
    specific = [line for line in noted if not GENERIC.match(line)]
    generic = [line for line in noted if GENERIC.match(line)]
    from_log = [line for line in telling_lines(source.log(job["id"])) if line not in noted]
    return list(dict.fromkeys(specific + from_log + generic))[:MESSAGES_PER_JOB]


def failed_jobs(source, run):
    if run is None or run.get("status") != "completed" or run.get("conclusion") not in FAILED:
        return []
    found = []
    for job in source.jobs(run["id"]):
        if job.get("conclusion") not in FAILED:
            continue
        messages = job_messages(source, job)
        found.append(
            {
                "name": job.get("name", ""),
                "url": job.get("html_url", ""),
                "steps": [step.get("name", "") for step in job.get("steps", []) if step.get("conclusion") in FAILED],
                "messages": messages,
            }
        )
    return found


def build_cell(branch, runs, error, now, workflow, source):
    if error is not None:
        return {"branch": branch, "state": "grey", "summary": f"unavailable ({error})", "run": None, "streak": 0, "streakAtLeast": False,
                "lastSuccess": None, "history": {"total": 0, "passed": 0}, "medianDuration": "", "overdue": False, "failedJobs": []}
    candidates = [run for run in runs if branch == "any" or run.get("head_branch") == branch]
    candidates.sort(key=lambda run: run.get("run_started_at") or run.get("created_at") or "", reverse=True)
    latest = candidates[0] if candidates else None
    completed = [run for run in candidates if run.get("status") == "completed"]
    state, word = classify(latest, now, workflow.get("staleAfterHours"))

    streak, last_success = 0, None
    for run in completed:
        if run.get("conclusion") == "success":
            if run is not latest:
                last_success = {"url": run.get("html_url", ""), "ago": ago(parse_time(run["run_started_at"]), now)}
            break
        if run.get("conclusion") in FAILED:
            streak += 1
    durations = [seconds for seconds in (duration_seconds(run) for run in completed) if seconds is not None]

    cell = {
        "branch": branch,
        "state": state,
        "summary": word,
        "run": None,
        "streak": streak,
        "streakAtLeast": streak > 0 and streak == len(completed) and len(candidates) >= RECENT_RUNS,
        "lastSuccess": last_success,
        "history": {"total": len(completed), "passed": sum(1 for run in completed if run.get("conclusion") == "success")},
        "medianDuration": format_duration(int(statistics.median(durations))) if durations else "",
        "overdue": word.endswith("overdue"),
        "failedJobs": failed_jobs(source, latest),
    }
    if latest is not None:
        described = describe_run(latest, now)
        where = f" on {described['headBranch']}" if branch == "any" else ""
        cell["run"] = described
        cell["summary"] = f"{word}, {described['event']}{where}, {described['ago']}"
    return cell


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
            if not isinstance(workflow.get("blocks", ""), str) or not isinstance(workflow.get("blocking", False), bool):
                raise Unusable(f"{workflow['file']}: 'blocks' must be text and 'blocking' true or false")
            branches = workflow.get("branches", default_branches)
            branches = ["any"] if branches == "any" else branches
            cells = []
            for branch in branches:
                runs, error = source.runs(workflow["file"], branch)
                cells.append(build_cell(branch, runs, error, now, workflow, source))
            workflows.append(
                {
                    "file": workflow["file"],
                    "label": workflow["label"],
                    "state": worst([cell["state"] for cell in cells]),
                    "blocks": workflow.get("blocks", ""),
                    "blocking": workflow.get("blocking", False),
                    "cells": cells,
                }
            )
        groups.append({"name": group.get("name", ""), "state": worst([w["state"] for w in workflows]), "workflows": workflows})
    return {"title": config.get("title", "Pipelines"), "generatedAt": format_time(now), "counts": count_states(groups), "kpis": kpis(groups), "groups": groups}


def every_cell(groups):
    for group in groups:
        for workflow in group["workflows"]:
            for cell in workflow["cells"]:
                yield workflow, cell


def count_states(groups):
    counts = {state: 0 for state in RANK}
    for _, cell in every_cell(groups):
        counts[cell["state"]] += 1
    return counts


def kpis(groups):
    cells = list(every_cell(groups))
    longest = max(cells, key=lambda pair: pair[1]["streak"], default=None)
    return {
        "greenCells": sum(1 for _, cell in cells if cell["state"] == "green"),
        "totalCells": len(cells),
        "failing": sum(1 for _, cell in cells if cell["state"] == "red"),
        "failingBlocking": sum(1 for workflow, cell in cells if cell["state"] == "red" and workflow["blocking"]),
        "successRate": {
            "passed": sum(cell["history"]["passed"] for _, cell in cells),
            "total": sum(cell["history"]["total"] for _, cell in cells),
        },
        "longestStreak": (
            {
                "file": longest[0]["file"],
                "branch": longest[1]["branch"],
                "runs": longest[1]["streak"],
                "atLeast": longest[1]["streakAtLeast"],
                "lastSuccessAgo": longest[1]["lastSuccess"]["ago"] if longest[1]["lastSuccess"] else None,
            }
            if longest and longest[1]["streak"]
            else None
        ),
        "attention": sum(1 for _, cell in cells if cell["state"] == "amber"),
    }


def headline(counts):
    parts = []
    if counts["red"]:
        parts.append(f"{counts['red']} failing")
    if counts["amber"]:
        parts.append(f"{counts['amber']} need{'s' if counts['amber'] == 1 else ''} attention")
    if parts:
        return ", ".join(parts)
    return f"All {counts['green']} passing" if counts["green"] else "Nothing has run yet"


def render_kpis(status):
    k = status["kpis"]
    rate = k["successRate"]
    percent = f"{round(100 * rate['passed'] / rate['total'])}%" if rate["total"] else "n/a"
    streak = k["longestStreak"]
    if streak:
        streak_value = f"{streak['runs']}{'+' if streak['atLeast'] else ''} in a row"
        streak_note = f"{streak['file']} on {streak['branch']}" + (f", last passed {streak['lastSuccessAgo']}" if streak["lastSuccessAgo"] else ", never passed in the last runs")
    else:
        streak_value, streak_note = "none", "no workflow is failing twice running"
    tiles = [
        ("Pipeline health", f"{k['greenCells']} of {k['totalCells']}", "cells green right now", "green" if k["greenCells"] == k["totalCells"] else "amber"),
        ("Failing now", str(k["failing"]), f"{k['failingBlocking']} blocking something downstream", "red" if k["failing"] else "green"),
        ("Success rate", percent, f"of the last {rate['total']} completed runs, all branches shown", "green" if rate["total"] and rate["passed"] / rate["total"] >= 0.9 else "amber"),
        ("Longest failure streak", streak_value, streak_note, "red" if streak else "green"),
        ("Needs attention", str(k["attention"]), "running, cancelled, stale or overdue", "amber" if k["attention"] else "green"),
    ]
    return "".join(
        f'<div class="kpi state-{state}"><span class="kpi-label">{html.escape(label)}</span>'
        f'<span class="kpi-value"><span class="dot" aria-hidden="true">{ICON[state]}</span> {html.escape(value)}</span>'
        f'<span class="kpi-note">{html.escape(note)}</span></div>'
        for label, value, note, state in tiles
    )


def render_cell(cell):
    state = cell["state"]
    run = cell["run"]
    branch = html.escape(cell["branch"] if cell["branch"] != "any" else "latest")
    parts = [
        f'<div class="cell state-{state}">',
        f'<span class="dot" aria-hidden="true">{ICON[state]}</span>',
        f'<span class="branch">{branch}</span>',
        f'<span class="summary">{html.escape(cell["summary"])}</span>',
    ]
    if run is not None:
        links = [f'<a href="{html.escape(run["url"])}">run #{run["number"]}</a>']
        if run["commitUrl"]:
            links.append(f'<a href="{html.escape(run["commitUrl"])}">commit</a>')
        if run["prUrl"]:
            links.append(f'<a href="{html.escape(run["prUrl"])}">pull request</a>')
        history = cell["history"]
        facts = [f"{history['passed']} of {history['total']} recent runs passed"] if history["total"] else []
        if cell["medianDuration"]:
            facts.append(f"median {cell['medianDuration']}")
        if run["duration"]:
            facts.append(f"this one {run['duration']}")
        parts.append(f'<span class="run" title="{html.escape(run["title"])}">{html.escape(run["title"])}</span>')
        parts.append(f'<span class="meta">{" · ".join(links)} · {html.escape(" · ".join(facts))}</span>')
        if cell["streak"]:
            last = cell["lastSuccess"]
            since = f', last passed <a href="{html.escape(last["url"])}">{html.escape(last["ago"])}</a>' if last else ", no pass in the recent runs"
            parts.append(f'<span class="streak">{cell["streak"]}{"+" if cell["streakAtLeast"] else ""} in a row{since}</span>')
        for job in cell["failedJobs"]:
            steps = html.escape(" › ".join(job["steps"])) if job["steps"] else "no step named"
            parts.append(f'<span class="failed">Failed: <a href="{html.escape(job["url"])}">{html.escape(job["name"])}</a> › {steps}</span>')
            if job["messages"]:
                parts.append("<pre>" + "\n".join(html.escape(message) for message in job["messages"]) + "</pre>")
    parts.append("</div>")
    return "".join(parts)


def render_html(status, repository):
    counts = status["counts"]
    overall = worst([state for state in RANK if counts[state]] or ["grey"])
    actions_url = f"https://github.com/{repository}/actions" if repository else "#"
    generated = parse_time(status["generatedAt"]).strftime("%H:%M UTC, %-d %b %Y")
    cards = []
    for group in status["groups"]:
        rows = []
        for workflow in group["workflows"]:
            cells = "".join(render_cell(cell) for cell in workflow["cells"])
            file_url = f"https://github.com/{repository}/actions/workflows/{workflow['file']}" if repository else "#"
            lead = "A failure blocks " if workflow["blocking"] else "Blocks "
            blocks = f'<p class="blocks">{lead}{html.escape(workflow["blocks"])}</p>' if workflow["blocks"] else ""
            rows.append(
                f'<section class="workflow"><h3><a href="{html.escape(file_url)}">{html.escape(workflow["label"])}</a>'
                f'<code>{html.escape(workflow["file"])}</code></h3>{blocks}<div class="cells">{cells}</div></section>'
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
a {{ color: inherit; }}
.top {{ display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px 16px; margin-bottom: 16px; }}
.top .headline {{ font-size: 18px; font-weight: 600; }}
.top .when {{ color: var(--muted); }}
.state-green {{ --state: var(--green); --tint: var(--tint-green); }}
.state-amber {{ --state: var(--amber); --tint: var(--tint-amber); }}
.state-red {{ --state: var(--red); --tint: var(--tint-red); }}
.state-grey {{ --state: var(--grey); --tint: var(--tint-grey); }}
.kpis {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; margin-bottom: 20px; }}
.kpi {{ background: var(--card); border: 1px solid var(--line); border-left: 4px solid var(--state); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; }}
.kpi-label {{ font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }}
.kpi-value {{ font-size: 22px; font-weight: 700; }}
.kpi-note {{ font-size: 12px; color: var(--muted); }}
.grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }}
.group {{ background: var(--card); border: 1px solid var(--line); border-top: 4px solid var(--state); border-radius: 12px; padding: 16px; }}
.group header {{ display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 8px; }}
.group h2 {{ font-size: 17px; margin: 0; }}
.pill {{ display: inline-flex; align-items: center; gap: 6px; padding: 2px 10px; border-radius: 999px; background: var(--tint); font-size: 13px; font-weight: 600; white-space: nowrap; }}
.dot {{ color: var(--state); }}
.workflow {{ border-top: 1px solid var(--line); padding: 10px 0 4px; }}
.workflow h3 {{ font-size: 14px; font-weight: 600; margin: 0 0 4px; display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: baseline; }}
.workflow h3 a {{ text-decoration: none; }}
.workflow h3 a:hover {{ text-decoration: underline; }}
.workflow code {{ font-size: 12px; color: var(--muted); font-weight: 400; }}
.blocks {{ margin: 0 0 6px; font-size: 12px; color: var(--muted); }}
.cells {{ display: flex; flex-direction: column; gap: 6px; }}
.cell {{ display: grid; grid-template-columns: auto auto 1fr; gap: 2px 8px; align-items: baseline; padding: 6px 10px; border-radius: 8px; background: var(--tint); }}
.cell .branch {{ font-weight: 600; font-size: 13px; }}
.cell .summary {{ font-size: 13px; }}
.cell .run, .cell .meta, .cell .streak, .cell .failed, .cell pre {{ grid-column: 2 / span 2; font-size: 12px; }}
.cell .run {{ color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }}
.cell .meta {{ color: var(--muted); }}
.cell .streak {{ font-weight: 600; }}
.cell .failed {{ font-weight: 600; }}
.cell pre {{ margin: 2px 0 4px; padding: 6px 8px; border-radius: 6px; background: var(--card); white-space: pre-wrap; word-break: break-word; font-size: 11px; color: var(--muted); }}
footer {{ margin-top: 24px; color: var(--muted); font-size: 13px; }}
</style>
</head>
<body>
<main>
<div class="top state-{overall}">
<h1>{html.escape(status["title"])}</h1>
<span class="headline"><span class="dot" aria-hidden="true">{ICON[overall]}</span> {html.escape(headline(counts))}</span>
<span class="when">updated {generated} · this page reloads every 5 min; it is rebuilt when a pipeline runs, and hourly</span>
</div>
<div class="kpis">
{render_kpis(status)}
</div>
<div class="grid">
{"".join(cards)}
</div>
<footer>Green: latest run passed. Amber: running, cancelled, a pass older than its threshold, or a scheduled job that is overdue. Red: failed or could not start. Grey: never run on that branch.
Failed jobs quote the failure annotations GitHub kept; open the job for the full log, and the run page to rerun it.
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
        if args.fetch:
            token = os.environ.get("GITHUB_TOKEN", "")
            if not repository or not token:
                raise Unusable("--fetch needs GITHUB_REPOSITORY and GITHUB_TOKEN")
            source = ApiSource(os.environ.get("GITHUB_API_URL", "https://api.github.com"), repository, token)
        elif args.runs:
            source = RecordedSource(load_json(args.runs, "runs file"))
        else:
            raise Unusable("give --fetch or --runs")
        status = build_status(config, source, now)
    except Unusable as error:
        print(f"The dashboard could not be built: {error}.", file=sys.stderr)
        return 2

    cells = [cell for _, cell in every_cell(status["groups"])]
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
        out.write(render_html(status, repository))
    print(f"{headline(status['counts'])}; wrote {args.out}/index.html and status.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
