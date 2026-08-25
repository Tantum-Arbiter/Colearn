# Screen Time Alert — UI Overhaul Plan

Overhauling the screen-time glance (the window that opens out of the home
screen's ring) into the alert design, and adding a tips action that shows a
parent how to carry the story they just read into the real world.

Status: **phases 1–3 built.** Phase 4 (sharing with the warning modal) and
phase 5 (per-story bridges) are still plans. The two open questions the plan
parked have been answered — see *Decisions taken* below.

---

## Decisions taken

Both open questions below were put to the operator before any of this was
built. The answers are recorded here because they changed the shape of what
shipped, not just its styling.

**The alert header shows only when the limit is spent.** The calm state keeps
the dashboard greeting and gets no alert treatment at all. The mockup's own
screenshot is the argument: an alert header at 14m of a 1h limit sits directly
above a banner reading "Great job! You're within today's limit". One of those
two has to go, and it is not the encouragement.

**"Start Break Now" is gone; "Show Tips" is the single action.** The plan
flagged that nothing in the codebase implements a break, so the button as
specified would have closed the window with more ceremony than the X does.
Rather than ship a no-op, the footer carries one button, and it does the thing
that is actually worth doing at the end of a session: it opens ways to carry
the story off the screen.

Because the alert header and the footer belong to the same alert, the tips
action is only offered in the exceeded state. If tips turn out to be worth
reaching at any time, the calm state needs its own entry point — that is a
separate decision, not an oversight.

---

## What shipped

| Phase | Where |
|---|---|
| 1 — framed panel | `panelInset` / `panelRadius` / `panelBorderWidth` / `exceededBorder` / `calmBorder` / `exceededGlow` / `calmGlow` in [`constants/screen-time-ring.ts`](constants/screen-time-ring.ts); `screen-time-glance-panel` in [`screen-time-glance.tsx`](components/home/screen-time-glance.tsx) |
| 2 — alert header | [`components/screen-time/screen-time-alert-header.tsx`](components/screen-time/screen-time-alert-header.tsx); `showGreeting` prop threaded through `ScreenTimeContent` → `UsageOverview` |
| 3 — tips | [`components/screen-time/real-world-tips.tsx`](components/screen-time/real-world-tips.tsx); `screenTime.alert.*` and `screenTime.tips.*` across all 14 locales |

Two details worth knowing:

- **The usage figure is emphasised without fragmenting the sentence.** The red
  figure needs its own span, but `"You've reached "` + figure + `" of your
  daily limit."` bakes English word order into three keys. Instead the whole
  sentence stays one key, and the header splits the *finished* translation on
  the value it just interpolated — so a locale can put the figure wherever it
  belongs. A locale that loses the placeholder still renders the sentence,
  just without the emphasis.
- **The tips cards are shaped like `RealWorldAdventure`.** One card per
  category — at-home, outdoors, creative — reusing the `bridge.*` category
  labels the warning modal already uses. The copy is generic to stories, but
  the layout is the one phase 5 needs, so authored per-story bridges can
  replace the copy without touching the component.

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
| No actions | One footer button: **Show Tips** (the design's second button, *Start Break Now*, was dropped — see *Decisions taken*) |
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

### Phase 1 — The framed red window ✅ built, then reworked

The panel, not the content.

- Inset the surface from the screen edges and give it the design's rounded
  red border. New tokens in `SCREEN_TIME_GLANCE`: `panelInset`, `panelRadius`,
  `panelBorder`, and the border's glow.
- Close button moves into the panel's top-right.
- Border colour follows the same exceeded/calm split the surface already uses.

**Reworked at the operator's request (2026-08-24, twice):** the circular
reveal is gone. It painted the whole screen in the ring's colour before the
panel settled, and the ask was the opposite — the alarm red contained inside
the border it belongs to. The open is now choreography, and it plays out over
the **live home screen**: an echo of the ring spins up where it was pressed,
travels to the panel's nearest corner, **flattens into a line**, and that
line **draws the border** (a dash-offset sweep along `panelBorderPath`). The
orb is deliberately wider than the ring's solid dot -- at the same diameter
its red arc vanished against the red dot beneath it -- and it **turns from
the ring's colour to water blue as it spins**. The box is drawn in that blue
and *keeps* it: border, glow, panel surface and the closing drop are all
water. Red survives only where it means something — the ring the parent
pressed, the alert header's badge, and the usage figure it is warning
about — never as a surface or a frame. The orb carries a
solid core the size of the ring's own dot, and the ring hides while the
glance is open -- one control becomes the orb, rather than a second dot
appearing beside a ring that never moved. The core reduces away as the arc
flattens, so by the time the line exists only the line is left.

Alongside this rework, `ScreenTimeService` moved from UTC to **local** day
boundaries (`localDateKey`): keyed by `toISOString()`, a London child's day
rolled over at 1am in summer and a Californian child's limit would have
reset mid-afternoon.
Nothing dims while it draws. Only once the border closes does the settle
happen — the background blacks out and the fill arrives inside the frame at
the same time. Closing runs in reverse register: the content dims, the panel
gathers itself in, hands over to a **true teardrop** (`DROP_PATH`, pointed
top, round base, gloss crescent) in the ring's colour, and the drop falls off
the bottom of the screen. Reduced motion skips all of it, both ways.

**A spiral was tried here and reverted (2026-08-25).** Five iterations took
the orb through spinning-into-a-line, a coin-settle spiral, a galaxy sweep,
a real Archimedean curve unrolled by a travelling wave, and finally an arm
that landed on the border so the draw continued out of it. Each fixed the
last one's complaint and introduced its own, and the version above -- spin,
travel, flatten, draw -- was the one that read best in the hand. The work is
in the history from `fe06633` to `674800d` if any of it is wanted again;
`spiralArmPath` and its tests are the reusable part.

**Tests:** panel is inset and outlined; border takes the red only when
exceeded; the alarm fill exists exactly once and it is the panel; the border
path's dash pattern matches its own reported length; the spinner rises at the
ring's centre.

### Phase 2 — The alert header ✅ built

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

**Answered:** the header shows only when over limit; the calm state keeps the
greeting. See *Decisions taken*.

### Phase 3 — Footer action and the tips sheet ✅ built

- One solid coral button pinned to the panel's bottom: **Show Tips**. The
  design's *Start Break Now* was dropped rather than shipped as a no-op — see
  *Decisions taken*.
- Show Tips replaces the dashboard inside the panel with a tips surface: three
  cards, one per real-world category, each with a headline and a body that
  says how to actually do it. The copy is new (`screenTime.tips.*`) rather
  than the one-line `screenTimeWarning.suggestions.stories` entries, because
  the ask was for detail a parent can act on.
- Done returns to the dashboard; it does not close the window.

**Tests:** the button renders only in the alert state; Show Tips reveals all
three cards over the dashboard; every card has a body as well as a headline;
the categories reuse the `bridge.*` labels; Done comes back rather than
closing.

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
- **A full-bleed alert for a child who is fine.** Closed: the alert only ever
  renders in the exceeded state, so the calm glance is unchanged from what it
  was. This was the risk most likely to make the app feel like it is telling
  parents off, against the calm-UX principle in [`CLAUDE.md`](../CLAUDE.md).
- **Tips that do not know the story.** The generic three are good, honest
  advice and read fine — but "the story you just read" is doing work the app
  cannot currently back up. Acceptable as written; phase 5 is what makes it
  specific.
- **Translation load.** Phases 2–3 add roughly 8–10 keys × 14 locales. Phase 5
  is far larger and should be costed separately.
- **Start Break Now may be a no-op.** Closed by dropping the button.

---

## What I would not do

- **Not** move the trend chart or the ring cards. They are working and the
  design keeps them.
- **Not** keep the full-bleed reveal once the containment ask landed — a
  screen of alarm red and "red only inside the border" cannot both be true.
- **Not** restyle the encouragement banner to match the alert. It is the one
  element that stays positive, and it is the counterweight to the header.
- **Not** build a tips system from scratch. The bridge model already exists,
  is already translated, and already has a fallback path.
