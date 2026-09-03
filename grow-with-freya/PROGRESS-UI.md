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
→ ⭐ Little adventures (one weekly + one monthly challenge card) → ⭐ Little Milestones
(3 across) → 🏅 Badges to crack ("n of m discovered" summary, category pill bar, full badge
grid — 2 columns on phones, 4 on tablets) → journey navigation (Home / Library / Progress,
Progress selected; Parents removed by operator decision 2026-08-29).

The content column is capped at 720 dp and centred so tablets get margin, not stretch.

## Finding badges and what is left (operator revision 2026-08-29)

The badge library is browsed, not glimpsed: every badge sits in a vertical grid under a
category bar (All · Stories · Music · Calm · Kindness · Exploring) and a descriptive summary
("3 of 16 discovered"). The grid is sorted for discovery — badges coming alive
(`in_progress`, then `started`) first, then the undiscovered possibilities, with earned
badges settling at the end as warm memories. `sortBadgesForDiscovery`, `filterBadges` and
`summariseBadges` in `progress-model.ts` own those rules.

## Little adventures — weekly and monthly challenges

Two challenge cards, one per period, chosen deterministically from small pools by ISO week
and by calendar month (`buildChallenges` in `progress-model.ts`): the pick is stable for
every day of its period and rotates between periods. Challenges are `Badge`-shaped
(`Challenge extends Badge { period }`), so they render through the same state language and
open the same detail sheet with an activity-driven recommendation. Copy is an invitation,
never a countdown: "Share three story times together this week". Progress derives from the
7-day (weekly) and 30-day (monthly) session windows — `ScreenTimeService.getRecentUsage(days)`.

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
| Adventures | `challenge-card.tsx` |
| Badges | `badge-card.tsx`, `badge-artwork.tsx`, `badge-progress.tsx`, `badge-category-bar.tsx`, `badge-detail-sheet.tsx` |
| Filter pill (shared with the catalogue) | `components/child-ui/filter-pill.tsx` |

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
- **Badge library is sixteen badges across the five §24 groups** (Stories, Music, Calm,
  Kindness, Exploration), every one with progress derivable from the counters. Adding more
  is a definition in `progress-model.ts` plus its two i18n keys — no UI changes.
- **Milestone thresholds** chosen at build time: 5 stories, 3 bedtime stories, 1
  kindness-themed story.
- **React Native `Modal` is broken under Jest** in this repo, so the detail sheet is an
  absolute-fill overlay (house pattern, same as `story-preview-modal`).
- **Earned-badge one-time sparkle animation (§31)** not yet built — requires persisting
  first-earned timestamps; progress-bar and tap motion are in.
