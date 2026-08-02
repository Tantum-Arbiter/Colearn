---
title: Inbox & Weekly Review
type: workflow
status: living
owner: CoLearn
tags: [inbox, capture, weekly-review, pkm, obsidian]
updated: 2026-07-02
---

# 📥 Inbox & Weekly Review

Quick-capture layer for the CoLearn Obsidian vault. Dump ideas, decisions, links, and
follow-ups here fast — **don't organise in the moment**. Process on a weekly cadence and
promote anything durable into the proper doc (see [`CLAUDE.md`](CLAUDE.md) → Documentation Map).

> This file is git-tracked so the whole team (and AI agents) share one capture point.
> The Obsidian app config in `.obsidian/` stays git-ignored — only content is versioned.

---

## 🗒️ Capture

_Add newest at the top. One line per item. Prefix with a tag so review is faster._

- `#idea` …
- `#decision` …
- `#bug` …
- `#follow-up` …

---

## 🔁 Weekly Review (15–30 min)

Run once a week. The review is the habit that makes the vault valuable — don't skip it.

- [ ] **Process inbox** — for each item above: delete, do (<2 min), or promote to a real doc.
- [ ] **Promote decisions** — architectural/product decisions → the relevant `PHASE-*.md`,
      `ARCHITECTURE.md`, or `AGENTS.md`, then delete the inbox line.
- [ ] **Link deliberately** — add relative Markdown links between related notes/docs.
- [ ] **Update `updated:` frontmatter** on any doc you changed materially.
- [ ] **Bump `status:`** on phase docs that moved (planned → in-progress → done).
- [ ] **Empty the Capture section** — a clean inbox is the goal.

---

## Conventions

- **Capture is temporary; docs are permanent.** Nothing important lives only in the inbox.
- **Atomic docs.** One concept/service/endpoint per file; split when a doc gets large.
- **Links over folders.** Prefer relative Markdown links (Obsidian + GitHub compatible).
