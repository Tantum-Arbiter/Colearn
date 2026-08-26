# Animation — Improvement Plan

How the app's motion is built, why the same handful of bugs keep recurring,
and what to change so they stop.

Status: **Phases 1–3 built and adopted in the screen-time glance. Phases 4–6
are still plan only.**

Written after taking the screen-time glance's open/close choreography
through roughly a dozen rounds of design feedback. Every defect found in
that work is listed here, because each one is a defect the same code shape
will produce again somewhere else.

---

## Where we are

Reanimated is used in **87 files**. The heaviest are:

| Shared values | File |
|---|---|
| 22 | [`components/home/screen-time-glance.tsx`](components/home/screen-time-glance.tsx) |
| 17 | [`components/stories/story-book-reader.tsx`](components/stories/story-book-reader.tsx) |
| 13 | [`components/navigation/page-navigator.tsx`](components/navigation/page-navigator.tsx) |
| 12 | [`components/ui/enhanced-page-transition.tsx`](components/ui/enhanced-page-transition.tsx) |
| 12 | [`components/main-menu.tsx`](components/main-menu.tsx) |

The glance is the worst case and the best proving ground: 22 shared values
and 28 `withDelay` call sites in one 895-line component, with the timeline
expressed as hand-added millisecond offsets.

Some of the right shape already exists. `constants/screen-time-ring.ts`
holds pure, unit-tested motion functions — `orbSquash`, `dropStretchAt`,
`splashPath`, `panelBorderPath`, `dropFlight`, `borderSweepOffset`, and the
dormant `spiralArmPath`. Those are the parts that stopped causing trouble.
The parts still causing trouble are the ones that live as imperative
sequences inside the component.

---

## The five defects, and why they recur

These are not hypotheticals. Each was found on device during the glance
work, most of them more than once.

### 1. Two animations, one shared value — the second cancels the first

Assigning to a shared value twice in the same handler silently discards the
first animation. Found **four separate times**:

- the orb spent its entire spin at opacity zero
- the spiral arm never appeared at all
- the closing teardrop never appeared — hidden because the gathered panel
  underneath looks enough like it to pass at speed
- the border's first segment showed before the orb had finished spinning

Every instance looked like a different bug and took a slow-motion recording
to diagnose. **This is the single highest-value thing to make impossible.**

### 1b. `undefined` passed where the key should be absent

Building a config object with every key always present, and letting the
unset ones be `undefined`, is not the same as omitting them.
`withTiming(to, { duration, easing: undefined })` crashed the app natively --
straight to the home screen, no red box, nothing in the device log -- the
moment the glance opened. The hand-written code it replaced had omitted the
key; only the rewrite started passing it explicitly.

Worth naming because it is invisible to every cheap check: it type-checks, it
passes a mocked test suite, and it reads correctly. It shows up only on a
device, as a crash with no diagnostics.

### 2. `withSequence` stops dead at every join

A sequence returns to zero velocity between beats. A three-beat squash
therefore pauses twice on its way from circle to line, which reads as
stepped rather than smooth. Fixed in the glance by deriving both axes from
one progress through `orbSquash`; the same fault is latent anywhere a
sequence is used for a single continuous gesture.

### 3. Elements that appear or vanish at full size

Three separate pops: the teardrop appeared over the gathered panel at full
size, vanished in mid-air 60ms before landing, and the splash's ring of
impact was born at `r=4` where a whole drop had just been. Fixed by tying
scale to opacity and matching hand-over sizes.

### 4. Elements visible at rest

The splash faded only on the way *out*, so at progress zero its droplets sat
stacked on the ring at full opacity — a blue dot parked on the home screen
whenever nothing was happening. **An animated element must be invisible at
both ends of its range, not just the end you were thinking about.**

### 5. Transforms that quietly destroy the thing being animated

Two of these. A rotation that did not land on a whole number of turns left
the finished line lying on its side. And squashing a stroked *outline*
rather than a filled shape collapses it into a pair of hairline caps — which
is why the travelling line was invisible for several rounds while looking
perfectly correct in code.

---

## Phases

Each is independently shippable and independently useful. Phase 1 is worth
doing even if nothing else here is.

### Phase 1 — Make one-assignment-per-value structural ✅ built

A small `choreograph()` helper that takes a declarative map of shared value
→ keyframes and applies exactly one animation to each:

```ts
choreograph({
  spinnerOpacity: [{ at: 0, to: 1, over: 140 }, { at: drawStartsAt, to: 0, over: 180 }],
  spinnerMorph:   [{ at: morphStartsAt, to: 1, over: morphDuration, easing: glide }],
})
```

It builds each value's whole timeline into a single `withSequence` internally,
so the cancellation bug becomes unrepresentable rather than a thing to
remember. Also gives one obvious place to attach the completion callback —
another thing currently done by hand and easy to attach to the wrong
animation (it was, once: the window closed while the orb was still half blue).

**Tests:** a value given two keyframes ends at the second one's target; a
value's animation is never replaced; callbacks fire after the last keyframe.

**Risk:** none to behaviour if adopted one component at a time.

**Built as** [`utils/choreograph.ts`](utils/choreograph.ts). A track owns one
shared value; a second track on the same value throws rather than cancelling
quietly, and overlapping beats on one track throw too. Beats are placed on the
choreography's own clock (`at: 1240`) rather than as offsets from each other,
and are sequenced into a single animation before assignment. `onFinished` is
attached to whichever track ends last, computed rather than named.

Covered by [`__tests__/utils/choreograph.test.ts`](__tests__/utils/choreograph.test.ts)
and, end to end on the real component, by
[`__tests__/components/home/screen-time-glance-choreography.test.tsx`](__tests__/components/home/screen-time-glance-choreography.test.tsx),
which renders the glance against a recording reanimated mock and asserts that
no shared value comes out of the open or the close carrying two animations.
That one catches a stray hand-written assignment sitting *next to* a
`choreograph` call, which the helper itself cannot see.

### Phase 2 — Make the timeline data, not arithmetic ✅ built

The glance computes `morphStartsAt`, `travelStartsAt`, `drawStartsAt`,
`settleStartsAt` by adding durations in the component. Reordering the
choreography — which happened three times during the design work — means
re-deriving all of them by hand, and a mistake shows only on device.

Extract to a pure function returning named phases with resolved start times,
and unit-test it: phases are contiguous, the draw begins only after the line
has landed, the rotation ends on a whole turn, the total is within budget.

**This is where the "reordered the beats and the border came out horizontal"
class of bug dies.**

**Built as** [`constants/screen-time-glance-timeline.ts`](constants/screen-time-glance-timeline.ts):
`glanceOpenTimeline()` and `glanceCloseTimeline()` return named phases that
each know when they start, how long they run, and when they end. The
millisecond literals that were scattered through the component (`- 60`,
`+ 40`, `+ 90`, `- 80`) are named constants next to the phases they belong to.
Totals are derived with `Math.max` rather than written out, so a reordered
beat cannot leave a stale total behind.

[`__tests__/constants/screen-time-glance-timeline.test.ts`](__tests__/constants/screen-time-glance-timeline.test.ts)
states the invariants that were each broken by hand at least once: the phases
are contiguous, the border picks up before the line lands, the rotation is a
whole number of turns and stops as the line settles, the drop is at full
opacity for the whole flight, and the close finishes on the colour turn so
the window cannot hand the corner back while the orb is still half blue.

### Phase 3 — Every derived quantity becomes a pure function ✅ built

Continue what `orbSquash` and `dropStretchAt` started: any value computed
from a progress moves out of the component into a tested pure function.

Add a shared `expectSmooth(fn)` test helper that samples finely and asserts
no single step exceeds a few times the average, **measured against distance
travelled rather than net range** — a shape that doubles back travels
further than its endpoints suggest, which is exactly what made a correct
curve look like a failing one the first time this was written.

**Built.** `splashOpacity`, `splashRing` and `dropHandoverScale` moved out of
the component into [`constants/screen-time-ring.ts`](constants/screen-time-ring.ts),
alongside the splash's geometry constants. Each is tested for the defect it
encodes: invisible at *both* ends of its range, born at the drop's own width
rather than at a point, and tied to opacity so neither end of the flight can
pop.

`expectSmooth` lives in [`__tests__/utils/motion-smoothness.ts`](__tests__/utils/motion-smoothness.ts)
and the two hand-rolled smoothness loops in the ring's suite now call it.
One thing it surfaced: the splash's rise is deliberately near-instant, so it
is excluded from the smoothness range and asserted separately rather than
hidden behind a loosened tolerance.

### Phase 4 — A way to see what changed

The most expensive part of this work was not making changes, it was seeing
them. Recording the simulator and hunting for the right 300ms window cost
more time than every code change combined, and slow-motion is actively
misleading: named durations scale, hardcoded millisecond literals do not, so
a slowed pass shows a crossfade running several times too fast relative to
everything around it.

Two things worth building, in order of value:

1. **A dev-only choreography scrubber.** A slider bound to the timeline's
   progress, so any frame can be inspected directly. This would have turned
   most of the diagnoses in this document from twenty minutes into ten
   seconds.
2. **A capture script** that slows one *named phase*, launches, taps,
   screenshots, and restores — the technique that finally worked, made
   repeatable.

### Phase 5 — Reduced motion, properly

`useReducedMotion` currently takes a single early return that skips the
entire choreography and snaps to the end state. It is untested, and it is a
separate code path that will drift from the real one.

It should still communicate the transition — a short cross-fade rather than
nothing — and it should be tested in both directions. Worth checking against
the calm-UX principle in [`CLAUDE.md`](../CLAUDE.md): a child sensitive
enough to need reduced motion is exactly the child a hard cut is worst for.

### Phase 6 — Measure before optimising

Everything runs on the UI thread through worklets, which is right. But
`splashPath` builds a path string of seven circles per frame, and the glance
animates opacity across a subtree containing the whole dashboard. Neither
has been profiled. **Measure on the oldest supported device before changing
either** — this phase is listed last because there is currently no evidence
it is needed.

---

## What I would not do

- **Not** adopt an animation library to solve this. The problems are
  timeline structure and verification, and a library changes neither.
- **Not** rewrite the 87 files. Phase 1 and 2 pay for themselves on the
  glance alone; the rest adopt them when they next need changing.
- **Not** delete [`__tests__/utils/animation-test-utils.ts`](__tests__/utils/animation-test-utils.ts)
  without checking. It is 281 lines used by two test files, and it mocks
  shared values in a way that overlaps Phase 1 — but it may be load-bearing
  for the story reader's suite. Read it before assuming.
- **Not** treat the choreography as finished. It has been through a dozen
  rounds of design feedback and will go through more; the point of this plan
  is to make the next round cheap, not to freeze the current one.

---

## Risks

- **Churn without visibility.** The single biggest risk, and the reason
  Phase 4 is ranked above the polish phases despite building no user-facing
  motion. Every defect in this document was invisible in code review and
  obvious in a frame strip.
- **Phase 1 changing behaviour silently.** Sequencing keyframes into one
  animation is not always identical to what the hand-written version did,
  particularly where a later assignment was *intended* to interrupt an
  earlier one. Adopt per component, and diff frame strips before and after.
- **Over-abstracting.** A declarative timeline that cannot express a
  particular gesture is worse than the arithmetic it replaced. Keep the
  escape hatch: `choreograph()` should compose with hand-written animations
  rather than forbid them.
