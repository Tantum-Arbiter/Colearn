#!/usr/bin/env python3
"""Summarise a JUnit report, and optionally its retry report, on the run page.

Writes Markdown to $GITHUB_STEP_SUMMARY (and the same text to stdout), so a
green run carries a record of what it proved, not only a tick.
"""

import argparse
import os
import sys
import xml.etree.ElementTree as ET


def cases(path):
    root = ET.parse(path).getroot()
    found = []
    for case in root.iter("testcase"):
        if case.find("failure") is not None or case.find("error") is not None:
            status = "failed"
        elif case.find("skipped") is not None:
            status = "skipped"
        else:
            status = "passed"
        found.append((case.get("name", "?"), status, float(case.get("time") or 0)))
    return found


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--title", required=True)
    parser.add_argument("--report", required=True)
    parser.add_argument("--retry")
    parser.add_argument("--list-cases", action="store_true")
    args = parser.parse_args()

    lines = [f"### {args.title}", ""]
    if not os.path.exists(args.report) and args.retry and os.path.exists(args.retry):
        lines.append("The first attempt left no report; this is the rerun.")
        args.report, args.retry = args.retry, None
    if not os.path.exists(args.report):
        lines.append("No report was written: the run stopped before any result was recorded.")
    else:
        first = cases(args.report)
        retried = {}
        if args.retry and os.path.exists(args.retry):
            retried = {name: status for name, status, _ in cases(args.retry)}

        rows = []
        for name, status, seconds in first:
            if status == "failed" and name in retried:
                status = "passed on retry" if retried[name] == "passed" else "failed twice"
            rows.append((name, status, seconds))

        counts = {}
        for _, status, _ in rows:
            counts[status] = counts.get(status, 0) + 1
        order = ["passed", "passed on retry", "failed", "failed twice", "skipped"]
        summary = ", ".join(f"{counts[s]} {s}" for s in order if s in counts)
        total = sum(seconds for _, _, seconds in rows)
        lines.append(f"{len(rows)} cases: {summary} ({total:.0f} s).")

        if args.list_cases:
            lines += ["", "| Result | Case | Time |", "|---|---|---|"]
            for name, status, seconds in rows:
                lines.append(f"| {status} | {name} | {seconds:.0f} s |")
        else:
            problems = [(n, s) for n, s, _ in rows if s not in ("passed", "skipped")]
            if problems:
                lines += [""] + [f"- {status}: {name}" for name, status in problems]

    text = "\n".join(lines) + "\n"
    print(text)
    summary_file = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_file:
        with open(summary_file, "a", encoding="utf-8") as out:
            out.write(text + "\n")


if __name__ == "__main__":
    sys.exit(main())
