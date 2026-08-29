---
title: "Progress UI — a scrapbook of shared experiences"
type: design
status: shipped
branch: mvp
updated: 2026-08-29
reference: design screenshot, Progress, 2026-08; operator requirements 2026-08-29
---

# Progress UI

> Source of truth for the child-facing Progress page. Built on the child-ui language from
> [`OVERHAUL-UI.md`](OVERHAUL-UI.md) and mounted as a sub-page of the Stories journey shell.

## Governing principle

The Progress page must never feel like a children's productivity dashboard. It is a
scrapbook of little experiences the child and parent have shared: completed milestones are
warm memories, badges in progress are things gradually coming to life, unstarted badges are
soft possibilities waiting to be discovered. Nothing implies the child is behind, failing,
losing progress, or required to return to the app.

**Prohibited:** XP, rankings, leaderboards, scores, streak pressure, countdowns,
competitive comparison, loss-aversion mechanics, red warning states, lock icons,
"ACHIEVEMENT UNLOCKED!"-style copy, engagement-driven recommendations ("come back
tomorrow", "keep your streak", "only 2 more!").

## Structure

Planet artwork → back / sound controls → `Progress` + "Little steps, big progress." →
Weekly Progress card (participation ring + time together + stories / music / calm metrics)
→ ⭐ Little Milestones (3 across) → 🏅 Badges to crack (horizontally scrollable, ~2.6
visible on phones) → journey navigation (Home / Library / Progress, Progress selected;
Parents removed by operator decision 2026-08-29).

## Badge state language (§15–§21 of the operator spec)

One `BadgeCard` component renders every state — never separate Locked/Earned components:

| Status | Treatment |
|---|---|
| `undiscovered` | dashed circular halo, muted artwork under a soft dark-blue overlay, no glow, `0 / n` |
| `started` | soft purple rim, slightly dimmed artwork, `1 / n` |
| `in_progress` | purple rim and glow, full-colour artwork, visible progress, `k / n` |
| `earned` | gold rim, soft gold glow, tiny sparkles, gold progress capsule |

State is never colour-only: rim treatment + progress count carry it too (§30). Status is
calculated from progress in `badgeStatus()` — `earned` at target, `undiscovered` at zero,
`in_progress` from 40% — never assigned by hand.

Tapping a badge opens a lightweight detail sheet (progress dots up to 6, capsule beyond)
whose single activity-driven recommendation deep-links into the catalogue — optionally with
a tag filter applied (e.g. Calm Champion → "Try a calming story" → catalogue filtered to
calming). Recommendations live only in the sheet, never on the page. The journey navigation
hides while the sheet is open.

## Implementation

| Piece | File |
|---|---|
| Screen | `components/progress/progress-screen.tsx` |
| Model + badge/milestone definitions | `components/progress/progress-model.ts` |
| Data derivation | `components/progress/use-progress-data.ts` |
| Weekly card / ring / metric | `progress-hero-card.tsx`, `progress-ring.tsx`, `activity-metric.tsx` |
| Milestones | `milestone-card.tsx` |
| Badges | `badge-card.tsx`, `badge-artwork.tsx`, `badge-progress.tsx`, `badge-detail-sheet.tsx` |

Mounted by `StoryCatalogueScreen` inside the `JourneyShell` when the Progress nav item is
selected; its back control returns to the catalogue home. Reuses `CelestialBackground`,
`PlanetHeaderArtwork`, `CircleActionButton`, `PageTitle`, `SectionHeading` and the journey
navigation unchanged.

**Data is derived, not tracked-for-its-own-sake (§26):** stories read from
`readStoryIds`, bedtime/kindness reads from the read stories' categories and tags, weekly
minutes and music/calm/morning session counts from `ScreenTimeService` weekly sessions
(`activity: 'story' | 'emotions' | 'music'`). The ring shows participation capped gently at
`RING_FULL_MINUTES` — it is not a target.

## Deviations and gaps

- **Navigation is three items** (operator decision, matching the catalogue) — the reference
  image's Parents item is not built.
- **Artwork is stood in** by existing emotion/home assets (bear, moon, cloud, loving
  animal, sun) — the reference's bespoke illustrations (bear reading, rabbit with heart,
  seedling) are not in the repo. Commission and swap in `progress-model.ts` definitions.
- **Initial badge library is the reference four** (Morning Explorer, Story Adventurer,
  Calm Champion, Kind Heart). The §24 groups extend by adding definitions — no UI changes.
- **Milestone thresholds** chosen at build time: 5 stories, 3 bedtime stories, 1
  kindness-themed story.
- **React Native `Modal` is broken under Jest** in this repo, so the detail sheet is an
  absolute-fill overlay (house pattern, same as `story-preview-modal`).
- **Earned-badge one-time sparkle animation (§31)** not yet built — requires persisting
  first-earned timestamps; progress-bar and tap motion are in.
