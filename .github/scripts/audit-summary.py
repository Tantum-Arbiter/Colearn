#!/usr/bin/env python3
"""Summarise `npm audit --json` on the run page. Informational: always exits 0.

It reports what npm found, by severity, and names the high and critical
packages with the route by which they arrive, so the log says what is there
rather than a fixed message. Whether a package reaches the shipped app is not
decided here: expo pulls its build tooling in as production dependencies, so
`--omit=dev` cannot answer it (see QA-AUTOMATION.md).
"""

import json
import os
import sys

SEVERITIES = ["critical", "high", "moderate", "low", "info"]


def main():
    path = sys.argv[1]
    lines = ["### npm audit (informational)", ""]
    try:
        with open(path, encoding="utf-8") as src:
            report = json.load(src)
    except (OSError, ValueError) as error:
        lines.append(f"The audit produced no readable report ({error}).")
        report = None

    if report is not None:
        counts = report.get("metadata", {}).get("vulnerabilities", {})
        total = counts.get("total", sum(counts.get(s, 0) for s in SEVERITIES))
        found = ", ".join(f"{counts[s]} {s}" for s in SEVERITIES if counts.get(s))
        lines.append(f"{total} advisories" + (f": {found}." if found else "."))

        serious = []
        for name, entry in sorted(report.get("vulnerabilities", {}).items()):
            if entry.get("severity") in ("critical", "high"):
                via = [v if isinstance(v, str) else v.get("title", "") for v in entry.get("via", [])]
                route = " / ".join(entry.get("nodes", [])[:2]).replace("node_modules/", "")
                serious.append((entry["severity"], name, "; ".join(v for v in via if v)[:110], route))
        if serious:
            lines += ["", "| Severity | Package | Advisory or cause | Installed at |", "|---|---|---|---|"]
            for severity, name, via, route in sorted(serious, key=lambda r: SEVERITIES.index(r[0])):
                lines.append(f"| {severity} | {name} | {via} | {route} |")

    text = "\n".join(lines) + "\n"
    print(text)
    summary_file = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_file:
        with open(summary_file, "a", encoding="utf-8") as out:
            out.write(text + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
