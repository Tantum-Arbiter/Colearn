# Screen Time Alert — UI Overhaul Plan

Overhauling the screen-time glance (the window that opens out of the home
screen's ring) into the alert design, and adding a tips action that shows a
parent how to carry the story they just read into the real world.

Status: **plan only — nothing below is built yet.**

---

## Where we are now

The glance already does three of the things the new design needs, from
[`screen-time-glance.tsx`](components/home/screen-time-glance.tsx):

- opens as a circular reveal from the ring's own centre (`revealDiameter`,
  `ringCentre` in [`constants/screen-time-ring.ts`](constants/screen-time-ring.ts))
- takes its colour from the ring's state — red surface when over limit, night
  palette when calm
- carries usage only (`showSchedule={false}`, `showBackdrop={false}` on
  `ScreenTimeContent`)

So this is not a rebuild. It is a header block, a framed panel, two footer
actions, and one new content surface.

### What the design changes

| Now | Design |
|---|---|
| Full-bleed red surface, content starts at the greeting | Red **outlined panel** inset from the screen edges, contents inside it |
| Dashboard greeting ("Good afternoon…") leads | **Alert header** leads: glowing `!` badge, "Screen time alert!", usage line, "Let's take a mindful break." |
| No actions | Two stacked footer buttons: **Start Break Now**, **Show Tips** |
| Close button floats over the earth art | Close sits in the panel's own top-right corner |

---

## The honest problem: this is a second warning modal

[`screen-time-warning-modal.tsx`](components/screen-time/screen-time-warning-modal.tsx)
(455 lines) already exists and already does most of the new design's job: a
red-accented alert with an icon badge, a title that varies by warning type, a
usage message, real-world suggestions, and a dismiss button. It is what
produces the "Daily Limit Reached" sheet that interrupts play.

Building the alert header + tips into the glance without addressing that
leaves **two components telling a parent the same thing in two visual
languages**, and two places to change when the copy or the suggestion list
moves on.

Three options, in the order I'd argue for them:

1. **Extract the shared pieces, keep both entry points.** The interrupting
   modal and the parent-initiated glance genuinely have different jobs — one
   arrives uninvited mid-play, the other is opened deliberately from the ring.
   Pull the alert header and the tips list into shared components that both
   render. Most work, least duplication, and the design lands in both places.
2. **Restyle the warning modal to match, glance gets the header only.** Cheaper.
   Leaves the suggestion rendering duplicated.
3. **Build it only in the glance.** Cheapest now, guarantees drift.

**Recommendation: option 1.** The extraction is small — an `AlertHeader` and a
`RealWorldTips` — and it is the difference between this design landing
everywhere a parent meets a screen-time limit, versus landing in one of two
places and slowly diverging from the other.

This decision blocks nothing: phases 1–3 below are the same either way. It
only decides whether phase 4 exists.

---

## The tips content — the real gap

The ask is "examples of how to expand the story reading into the real world."
The app has a whole system for this already, and it does not cover stories.

**What exists.** `RealWorldBridgeData` in
[`types/real-world-bridge.ts`](types/real-world-bridge.ts) models exactly this:
a narration line, three `RealWorldAdventure` entries (one each `at-home`,
`outdoors`, `creative`), each tagged with `DevelopmentalSkill`s, plus a closing
line. There are **45 authored bridges** — 15 each for spelling, numbers and
feelings ([`data/bridge/`](data/bridge/)), looked up by `getBridgeData(activityId)`.

**What is missing, and it is three separate gaps:**

1. **No story bridges.** `GameSection` is typed `'spelling' | 'numbers' |
   'feelings'` — stories are not a section, and no story bridge data exists.
2. **Nothing records which story was read.** `setLastCompletedActivityId` is
   called in exactly one place,
   [`emotions-game-screen.tsx:284`](components/emotions/emotions-game-screen.tsx).
   The story reader never sets it, so even with story bridges authored there is
   no id to look one up by.
3. **Generic story tips do exist.** `screenTimeWarning.suggestions.stories.{1,2,3}`
   is present and translated in **all 14 locales** — "Retell the story you just
   read using toys or puppets", "Draw your favourite character or scene", "Act
   out the story together". `screenToActivityType` already maps any screen whose
   name contains `story` or `reader` to `'stories'`
   ([`screen-time-provider.tsx:22`](components/screen-time/screen-time-provider.tsx)).

So there is a shippable version today and a better version later:

- **Ship now:** Show Tips opens the three generic story tips. Fully translated,
  no new content, no new plumbing. Works for every child regardless of what
  they read.
- **Later:** author per-story bridges and set the activity id from the reader,
  so the tips name the actual book — "Retell *The Moon Who Lost Her Glow* with
  your toys". Richer, but it is a **content project** (a bridge per story ×
  14 locales), not a UI change.

Phase 3 ships the first. Phase 5 sketches the second.

---

## Phases

Each phase is independently shippable and independently testable.

### Phase 1 — The framed red window

The panel, not the content.

- Inset the surface from the screen edges and give it the design's rounded
  red border. New tokens in `SCREEN_TIME_GLANCE`: `panelInset`, `panelRadius`,
  `panelBorder`, and the border's glow.
- Keep the reveal circle behind it, unchanged — the circle still opens from the
  ring, the panel is what it settles into.
- Close button moves into the panel's top-right.
- Border colour follows the same exceeded/calm split the surface already uses.

**Tests:** panel is inset and outlined; border takes the red only when
exceeded; reveal geometry is untouched (the existing glance tests should keep
passing without edits — if they need editing, that is a signal the reveal
regressed).

### Phase 2 — The alert header

- New `ScreenTimeAlertHeader`: glowing `!` badge with its halo and radiating
  arcs, title, usage line with the figure emphasised in red, and the "mindful
  break" line.
- Replaces the dashboard greeting **inside the glance only** — the greeting
  stays on the settings dashboard, which is not an alert.
- Needs `ScreenTimeContent` to be able to omit its greeting: a `showGreeting`
  prop, same pattern as the `showSchedule` / `showBackdrop` props already
  there.
- Copy: new `screenTime.alert*` keys × 14 locales. The usage figure comes
  through interpolation, as `trendDayUsage` already does.

**Tests:** header renders above the child chip; usage figure matches the ring;
the dashboard greeting is gone from the glance but still present by default.

**Open question for you:** the mockup's header says "You've reached 14m of your
daily limit" while the banner below still reads "Great job! You're within
today's limit" — the screenshot is 14m of a 1h limit, so it is not actually an
alert state. Should the alert header show only when over limit (calm state
keeps the greeting), or always? I would show it only when over limit, and let
the calm state stay as it is — a full alert treatment on a child who has used
14 of 60 minutes contradicts the encouragement banner directly underneath it.

### Phase 3 — Footer actions and the tips sheet

- Two stacked buttons pinned to the panel's bottom: **Start Break Now** (solid
  coral) and **Show Tips** (outlined).
- Show Tips opens a tips surface listing the three generic story tips from
  `screenTimeWarning.suggestions.stories`, styled as cards rather than bullets.
- Start Break Now: closes the glance. **Open question:** should it do anything
  else — a timer, a lock, a "back in 10 minutes" state? Right now nothing in
  the codebase implements a break, so as specified this button closes the
  window with more ceremony than the X does. Worth deciding before it ships.

**Tests:** both buttons render; Show Tips reveals all three tips; tips come
from the translation keys rather than hardcoded strings; Start Break Now
closes.

### Phase 4 — Share with the warning modal *(depends on the decision above)*

- Extract `ScreenTimeAlertHeader` and the tips list into shared components.
- Re-point `screen-time-warning-modal.tsx` at both.
- Delete its now-duplicated header and suggestion rendering.

**Tests:** the warning modal renders the shared header and tips; its existing
suite still passes; bridge cards still win over generic tips where bridge data
exists.

### Phase 5 — Story bridges *(content project, separate track)*

Only worth starting once phases 1–3 are in and the shape is settled.

- Add `'stories'` to `GameSection`, create `data/bridge/story-bridges.ts`.
- Set `setLastCompletedActivityId(storyId)` when a story finishes, so
  `getBridgeData` can find it.
- Author a bridge per story, then translate × 14.
- Tips prefer the story's own bridge and fall back to the generic three — the
  same precedence the warning modal already uses.

---

## Risks

- **Two components, one message.** Covered above; phase 4 is the answer.
- **A full-bleed alert for a child who is fine.** The mockup's state is
  contradictory (see phase 2's open question). Getting this wrong makes the app
  feel like it is telling parents off, against the calm-UX principle in
  [`CLAUDE.md`](../CLAUDE.md).
- **Tips that do not know the story.** The generic three are good, honest
  advice and read fine — but "the story you just read" is doing work the app
  cannot currently back up. Acceptable as written; phase 5 is what makes it
  specific.
- **Translation load.** Phases 2–3 add roughly 8–10 keys × 14 locales. Phase 5
  is far larger and should be costed separately.
- **Start Break Now may be a no-op.** Flagged in phase 3.

---

## What I would not do

- **Not** move the trend chart or the ring cards. They are working and the
  design keeps them.
- **Not** restyle the encouragement banner to match the alert. It is the one
  element that stays positive, and it is the counterweight to the header.
- **Not** build a tips system from scratch. The bridge model already exists,
  is already translated, and already has a fallback path.
