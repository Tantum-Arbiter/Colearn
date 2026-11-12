#!/usr/bin/env python3
"""Gate the Security Scan on `npm audit`, against the committed allowlist.

Two reports go in: the whole tree (`npm audit --json`) and the production tree
(`npm audit --omit=dev --json`). A critical advisory anywhere, or a high one in
the production tree, has to be accepted by the allowlist or the job fails.

Expo lists its build tooling as production dependencies, so `--omit=dev` cannot
say what reaches the app; the allowlist records what the release source maps
showed (PHASE-4-PROD-READINESS.md, section 12): tooling that is not bundled is
accepted by package, code that ships by advisory id. A package npm flags only
because of what it depends on is accepted once every cause above the gate is.

Exit 0: everything accepted. Exit 1: advisories nobody accepted. Exit 2: a
report or the allowlist could not be used, because a gate that cannot read its
input must not pass.
"""

import argparse
import json
import os
import re
import sys

GHSA = re.compile(r"^GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}$")
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
ORDER = ["critical", "high", "moderate", "low", "info"]


class Unusable(Exception):
    """The gate cannot be trusted with this input."""


def load_report(path, label):
    try:
        with open(path, encoding="utf-8") as src:
            report = json.load(src)
    except (OSError, ValueError) as error:
        raise Unusable(f"the {label} report could not be read ({error})")
    if not isinstance(report, dict) or not isinstance(report.get("vulnerabilities"), dict):
        error = report.get("error") if isinstance(report, dict) else None
        detail = error.get("summary", "") if isinstance(error, dict) else ""
        raise Unusable(f"the {label} report holds no dependency tree" + (f": {detail}" if detail else ""))
    return report


def load_allowlist(path):
    try:
        with open(path, encoding="utf-8") as src:
            entries = json.load(src)["entries"]
    except (OSError, ValueError, KeyError, TypeError) as error:
        raise Unusable(f"the allowlist could not be read ({error})")
    if not isinstance(entries, list):
        raise Unusable("the allowlist's entries are not a list")

    packages, advisories, reasons = set(), set(), {}
    for each in entries:
        name = each.get("package") if isinstance(each, dict) else None
        if not isinstance(name, str) or not name:
            raise Unusable("an allowlist entry names no package")
        if not isinstance(each.get("reason"), str) or not each["reason"].strip():
            raise Unusable(f"{name}: the allowlist entry gives no reason")
        if not isinstance(each.get("verified"), str) or not DATE.match(each["verified"]):
            raise Unusable(f"{name}: 'verified' must be a YYYY-MM-DD date")
        if not isinstance(each.get("shipped"), bool):
            raise Unusable(f"{name}: 'shipped' must be true or false")
        advisory = each.get("advisory")
        if advisory is None:
            if each["shipped"]:
                raise Unusable(f"{name} ships in the app, so accept it by advisory id, not by package name")
            packages.add(name)
            reasons[name] = each["reason"]
        else:
            if not isinstance(advisory, str) or not GHSA.match(advisory):
                raise Unusable(f"{name}: {advisory!r} is not a GHSA advisory id")
            advisories.add(advisory)
            reasons[advisory] = each["reason"]
    return packages, advisories, reasons


def advisory_id(via):
    return via.get("url", "").rsplit("/", 1)[-1]


def judge(report, severities, packages, advisories, reasons):
    """Which gated packages the allowlist accepts, with the reasons, and which entries it used."""
    vulns = report["vulnerabilities"]
    gated = {name for name, entry in vulns.items() if entry.get("severity") in severities}
    accepted, used = {}, set()
    progress = True
    while progress:
        progress = False
        for name in sorted(gated - set(accepted)):
            if name in packages:
                accepted[name] = reasons[name]
                used.add(name)
                progress = True
                continue
            causes, complete = [], True
            for via in vulns[name].get("via", []):
                if isinstance(via, dict):
                    if via.get("severity") not in severities:
                        continue
                    ident = advisory_id(via)
                    if ident in advisories:
                        causes.append(reasons[ident])
                        used.add(ident)
                    else:
                        complete = False
                elif via in gated:
                    if via in accepted:
                        causes.append(f"only through {via}")
                    else:
                        complete = False
            if complete and causes:
                accepted[name] = "; ".join(dict.fromkeys(causes))
                progress = True
    return gated, accepted, used


def describe(entry):
    parts = []
    for via in entry.get("via", []):
        if isinstance(via, dict):
            parts.append(f"{via.get('title', '')} ({advisory_id(via)})")
        else:
            parts.append(f"through {via}")
    return "; ".join(parts)[:160]


def route(entry):
    return " / ".join(entry.get("nodes", [])[:2]).replace("node_modules/", "")


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--full", required=True, help="npm audit --json, the whole tree")
    parser.add_argument("--production", required=True, help="npm audit --omit=dev --json")
    parser.add_argument("--allowlist", required=True, help="the committed allowlist")
    args = parser.parse_args()

    lines = ["### npm audit gate", ""]
    try:
        full = load_report(args.full, "whole-tree")
        production = load_report(args.production, "production-tree")
        packages, advisories, reasons = load_allowlist(args.allowlist)
    except Unusable as error:
        lines.append(f"The gate could not run: {error}.")
        return finish(lines, 2)

    critical_gated, critical_accepted, critical_used = judge(full, {"critical"}, packages, advisories, reasons)
    serious_gated, serious_accepted, serious_used = judge(production, {"critical", "high"}, packages, advisories, reasons)

    rows, failures = [], []
    for name in sorted(critical_gated | serious_gated):
        entry = production["vulnerabilities"].get(name) or full["vulnerabilities"][name]
        where = "production tree" if name in production["vulnerabilities"] else "build and test tooling only"
        accepted = (name not in critical_gated or name in critical_accepted) and (
            name not in serious_gated or name in serious_accepted
        )
        reason = critical_accepted.get(name) or serious_accepted.get(name) or ""
        decision = f"accepted: {reason}" if accepted else "**not accepted**"
        if not accepted:
            failures.append(name)
        rows.append((entry["severity"], name, where, describe(entry), route(entry), decision))

    tooling_highs = sorted(
        name
        for name, entry in full["vulnerabilities"].items()
        if entry.get("severity") == "high" and name not in production["vulnerabilities"]
    )
    for name in tooling_highs:
        entry = full["vulnerabilities"][name]
        rows.append(("high", name, "build and test tooling only", describe(entry), route(entry), "not gated"))

    if rows:
        lines += ["| Severity | Package | Where | Advisory or cause | Installed at | Decision |", "|---|---|---|---|---|---|"]
        for row in sorted(rows, key=lambda r: (ORDER.index(r[0]), r[1])):
            lines.append("| " + " | ".join(row) + " |")
    else:
        lines.append("No critical or high advisories.")

    unused = sorted((packages | advisories) - critical_used - serious_used)
    if unused:
        lines += ["", "Allowlist entries unused this run, which may be stale: " + ", ".join(unused) + "."]

    lines.append("")
    if failures:
        lines.append(
            f"Failing on {len(failures)} not accepted: {', '.join(failures)}. Check the release source maps "
            "(PHASE-4-PROD-READINESS.md, section 12), then fix what ships or add the entry with its reason."
        )
        return finish(lines, 1)
    lines.append("Every critical advisory in the tree and every high one in the production tree is accepted.")
    return finish(lines, 0)


def finish(lines, status):
    text = "\n".join(lines) + "\n"
    print(text, file=sys.stderr if status == 2 else sys.stdout)
    summary_file = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_file:
        with open(summary_file, "a", encoding="utf-8") as out:
            out.write(text + "\n")
    return status


if __name__ == "__main__":
    sys.exit(main())
