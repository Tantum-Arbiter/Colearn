# Music Plan — September 2026

> Companion to [`MUSIC_FEATURE.md`](MUSIC_FEATURE.md), which documents what exists today. Read that
> first — this file is a feasibility assessment and phasing plan for four new ideas, not yet built.

## The ask

1. Listen through the mic to an instrument being played; if the note matches, the song succeeds.
2. Humming the song does the same thing.
3. Create-your-own-music mode.
4. A Beat Saber-style game format.

## Verdict at a glance

| # | Feature | Feasible in RN? | Effort | Risk | Notes |
|---|---|---|---|---|---|
| 1 | Mic → real instrument note detection | Yes, with caveats | High | High | Reverses a documented decision (see below) |
| 2 | Mic → humming detection | Yes, harder than #1 | High | High | Same pipeline as #1, less reliable input signal |
| 3 | Create-your-own-music | Yes, cleanly | Low–Medium | Low | Builds directly on code that already exists |
| 4 | Beat Saber-style format | Yes, as a 2D reinterpretation | Medium | Medium | Literal Beat Saber (3D motion slicing) does not apply to a flat phone screen |

Recommended build order: **3 → 4 → 1 → 2** (cheapest and lowest-risk first; the two mic-listening
features are the same technical bet and should be spiked, not committed to, before either is scheduled).

---

## Where the app actually is today

Everything below is cited from the current `mvp` branch, not assumed.

- The mic is already used in the music feature, but only as a **volume/noise threshold gate** — "hold
  the on-screen note, blow to sound it" — never for pitch. This is a deliberate, documented decision:
  [`MUSIC_FEATURE.md:521-528`](MUSIC_FEATURE.md#L521), reasoned as "Pitch detection requires
  calibration and is fragile across devices" and "children's environments are noisy and
  unpredictable." [`hooks/use-breath-detector.ts`](hooks/use-breath-detector.ts) is explicit about
  this in its own header comment: *"Does NOT do pitch detection — only noise/breath level
  detection"* ([use-breath-detector.ts:13](hooks/use-breath-detector.ts#L13)), and reads only
  `recorderState.metering` (a dB level) from `expo-audio`, never raw PCM samples
  ([use-breath-detector.ts:114-135](hooks/use-breath-detector.ts#L114)).
- "Which note was played" is decided entirely by **which on-screen button the child is holding**, not
  by anything heard. [`services/sequence-matcher.ts`](services/sequence-matcher.ts) compares note
  *names* coming from button presses against the required sequence — it has no concept of audio at
  all.
- There is already a **free-play mode** with no required sequence —
  [`components/music/freeplay-screen.tsx`](components/music/freeplay-screen.tsx) (614 lines) lets a
  child press any note freely for as long as they like. It has no recording, saving, or playback of
  what was played; every session is thrown away when the screen closes.
- Every note already broadcasts a start/end event over
  [`services/note-event-bus.ts`](services/note-event-bus.ts), which the bell/body animation
  subscribes to. That event stream is the natural hook point for recording a performance.
- The completion melody is already built from a small declarative timeline —
  [`services/melody-scheduler.ts`](services/melody-scheduler.ts) turns a song's `rhythm` (beats) and
  `bpm` into a scheduled sequence of note-start times. That is most of the timing math a falling-notes
  rhythm game would also need.
- `package.json` has no audio-analysis dependency of any kind — only `expo-audio` (playback/recording
  container, no DSP) and `react-native-reanimated` (UI-thread animation, already used everywhere:
  `home-scene.tsx`, `screen-time-ring.tsx`, `owl-guide.tsx`, and inside the music feature itself for
  the bell swell and note glow).

---

## 1 & 2. Mic-detected notes and humming

**Feasible, but this is a bet, not a feature.** Two real technical facts make it harder than "just
turn on pitch detection":

- **`expo-audio` does not expose raw audio samples.** `useAudioRecorder`'s metering is a single dB
  number per poll ([use-breath-detector.ts:94](hooks/use-breath-detector.ts#L94)) — there is no buffer
  to run an FFT or autocorrelation over. Real-time pitch tracking needs either:
  - a native module that taps the audio session directly (`AVAudioEngine` install-tap on iOS,
    `AudioRecord`/`Oboe` on Android) and streams PCM to JS/a worklet, or
  - a third-party RN pitch-detection package built on top of one of those (several exist, e.g.
    wrappers around the YIN or CREPE algorithms; none are currently vetted for this codebase), or
  - a lower-fidelity fallback: record a short clip, decode it, and analyze it after the fact —
    workable for "hold a note for a second" but adds a record → stop → analyze → judge round-trip
    that a real-time "press and blow" interaction doesn't have today.
- **The team already tried the pitch-detection path in spirit and rejected it**, for the exact
  reasons that don't go away just because the request is scoped to September:
  [`MUSIC_FEATURE.md:521-528`](MUSIC_FEATURE.md#L521) — noisy home environments, wildly variable
  phone/tablet mic hardware, and the calibration a pitch detector needs to be reliable for a young
  child's uneven instrument tone (or voice — see below). None of those constraints are specific to
  2026; they're physics and hardware variance, not something a library update fixes.

Humming (#2) is the harder of the two once the pipeline above exists: a hummed pitch has weaker,
less stable harmonics than a sampled instrument note, a young child's hum drifts in pitch far more
than a held instrument tone, and octave-detection errors (the classic pitch-tracking failure mode)
are more common on voiced sound than on a clean instrument sample. The detection *pipeline* is the
same as #1; the *reliability bar* is higher, so it should not be scheduled ahead of a proven #1.

**Recommendation:** before committing engineering time, run a one-week timeboxed spike: pick one
candidate approach (native tap + a simple YIN implementation is the most controllable), test it on
2–3 real devices in a normal living room, and measure false-accept/false-reject rates against a
child's actual playing. Ship it only behind a flag, with the existing "press + blow" interaction kept
as the default — not replaced — since it is documented as the more reliable and more fun interaction
model for this age group.

## 3. Create-your-own-music

**The cleanest of the four, and it can reuse almost everything that already exists.** The
recommended design records *note events*, not audio — the same choice `melody-scheduler.ts` already
made for the completion song:

1. While a child plays in free-play mode, subscribe to `note-event-bus.ts` and timestamp every
   note-on/note-off pair relative to recording start.
2. "Stop" turns that event list into the same shape `melody-scheduler.ts` already consumes (entries +
   timing), so **existing playback code plays it back** — no new audio pipeline needed.
3. Persist the recording (AsyncStorage for a first cut; Firestore later if compositions should sync
   across a family's devices) under the child's profile, with a simple name/list/delete UI.
4. A "play my song" entry point reuses the instrument's existing note-sample players.

This sidesteps every mic/pitch problem above entirely — it's data (which note, when), not sound
analysis. Effort is mostly UI (record/stop/save/list screens) and a small new persistence layer; no
native module, no third-party audio library, no device-variance risk.

## 4. Beat Saber-style format

**Literal Beat Saber — two motion-tracked "sabers" swung in 3D space at approaching blocks — has no
real analogue on a flat phone screen** without VR/AR hardware this app doesn't target; recommend
treating the request as "a Beat-Saber-*inspired* rhythm game," which is a well-established mobile
genre (Piano Tiles, Guitar Hero mobile ports): notes scroll toward a hit line in 2D and the child
taps in time.

That version is **squarely feasible** with what's already in the dependency tree:

- `melody-scheduler.ts`'s beat-timeline math (`rhythm` × `bpm` → scheduled note times) is most of what
  a falling-note lane needs to know *when* each note should arrive.
- `react-native-reanimated` (already the animation engine for the rest of the app, including the
  music feature's own bell-swell and note-glow effects) is the right tool for the falling-note
  animation itself — UI-thread driven, so it won't stutter under JS-thread load the way a
  `setState`-per-frame approach would.
- The harder part is **audio-visual sync**: on-device audio output latency varies by device and has
  to be measured and compensated so a "perfectly timed" tap actually lines up with what the child
  hears, not just a wall-clock timestamp. This is a known, solvable problem in rhythm games, but it's
  real engineering, not a styling change.

**Recommendation:** scope the first version to reuse an existing song's `rhythm`/`bpm` data untouched
(no new content pipeline), a generous hit window (young children have less precise motor timing than
the genre's usual audience), and no fail state — mistimed taps should be forgiving, not end the song.

---

## A product tension worth flagging before any of this is scheduled

[`CLAUDE.md`](../CLAUDE.md) states this app's core UX principle as **"Calm UX — no overstimulation,
no aggressive gamification, no addictive mechanics"** for children aged 0–6. A rhythm-action genre
(#4) trades on fast reflexes, combo streaks, and score-chasing — the family of mechanics that
principle is written to rule out. This isn't a reason not to build it, but it is a reason to get
explicit design sign-off on the *tone* of it (no scoreboards, no "miss" penalty flash, no urgency
music) before implementation, rather than defaulting to the genre's usual conventions. The same
question applies more mildly to #1/#2: a "did you get the note right" pass/fail judgment on a young
child's live performance needs the same gentle, low-stakes framing the rest of the app already uses
for failure states (e.g. no red flash, no timer pressure).

---

## Suggested phasing

| Phase | Scope | Why this order |
|---|---|---|
| 1 | Create-your-own-music (#3) | Lowest risk, reuses existing note-event and playback infrastructure, no new dependencies |
| 2 | Beat-Saber-inspired rhythm mode (#4) | Reuses `melody-scheduler.ts` and Reanimated; main new risk is audio-visual latency sync, which is isolated and testable on its own |
| 3 | Mic-detected instrument notes (#1) | Spike first (timeboxed, flagged, non-default) before committing — this reopens a decision the team already made once for good reasons |
| 4 | Humming detection (#2) | Only after #1 is proven reliable in the field — same pipeline, harder input signal |
