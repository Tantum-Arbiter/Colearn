# Phase 7 — Hold-the-note (self-paced)

> **Status:** phases 1-4 built, 5 outstanding. Written 2026-09-10 against `mvp`, revised the same
> day after the operator ruled out time pressure, again once the mechanic landed, and again after
> frame-by-frame measurement on device settled how the row is positioned.
> Read [`grow-with-freya/MUSIC_FEATURE.md`](grow-with-freya/MUSIC_FEATURE.md) first — this document
> only covers what changes to teach note *length*.

**The model, decided by the operator:** the sheet moves only when the right note is played. There is
no clock, no scrolling track, no hit window, nothing to miss. The sheet's job is to show **which**
note comes next and **how long to hold it**, and the child takes as long as they like to work it
out. This is a practice instrument, not a rhythm game.

That rules out most of what a falling-notes game needs, and what is left is small:

| Guitar-Hero-shaped thing | Here |
|-|-|
| A clock scrolling notes toward a strike line | **Cut.** The score advances on correct input, exactly as it does today |
| A hit window on the onset | **Cut.** There is no "too early" or "too late" |
| Missing a note, breaking a combo, failing a song | **Cut.** Nothing is ever missed |
| A sustain tail you must hold to the end | **Kept** — this is the whole feature |

---

## 1. What exists today

| Piece | What it does |
|-|-|
| `PracticeSong.rhythm: number[]` | Slot length in beats per entry, on ~30 registry songs |
| `PracticeSong.bpm?: number` | Tempo hint, default 120 |
| `services/melody-scheduler.ts` | Turns `rhythm` + `bpm` into a millisecond timeline — **used only to play the reward melody back** |
| `services/sequence-matcher.ts` | Ordered matching, tolerant of accidental repeats. Header: "No timing/rhythm requirement" |
| `hooks/use-music-challenge.ts` | `processNoteForSequence` is the **single** point where a note is credited, called on press (and again when breath activates while a note is already held) |
| Note audio | `player.loop = true`, so a note sustains for as long as it is held; `noteStartTimeRef` already records when each note started; `noteEvents` emits start/end |
| `components/music/music-staff-strip.tsx` | The sheet: notes evenly spaced by index, scrolls on `currentNoteIndex` |

So the sheet already behaves the way the operator wants — it advances only on correct input. What is
missing is **any notion of how long**: a 20 ms tap credits the note exactly as a held bar does, and
nothing on screen says a note should be held at all.

### Three real constraints

Two come from `use-breath-detector.ts`, one from `use-music-challenge.ts`:

```
METERING_POLL_INTERVAL_MS   = 100    // breath is sampled 10x/second
BREATH_DEACTIVATE_DELAY_MS  = 250    // breath-off is debounced
BLOW_MAX_SUSTAIN_MS         = 3000   // in blow mode a note auto-fades after 3s even while held,
                                     // because iOS can't record the mic at full speaker volume
```

With no clock these stop being fairness problems and become **design limits**:

- The 250 ms debounce now *helps* — a brief dip between breaths will not cut a hold short.
- Breath is only sampled 10×/second, so hold progress should tick no finer than ~100 ms in blow
  mode. Anything smoother is a lie in that mode.
- **`BLOW_MAX_SUSTAIN_MS` is the hard ceiling.** A required hold must stay comfortably under 3 s or
  it is unachievable in blow mode: at 120 BPM that is 6 beats, at 60 BPM only 3. Cap the required
  hold at **2 s** whatever the metadata says, and clamp it in the pure layer so the UI can never
  draw a shadow the child cannot fill.

---

## 2. Metadata: how to say "hold this one longer"

`rhythm` already gives each entry a **slot** in beats. What is needed is the **hold** — how long the
note actually sounds. They differ: a crotchet in a one-beat slot is held about 85 % of the beat and
then released so the next note can articulate.

```ts
export interface PracticeSong {
  // ...existing
  bpm?: number;
  /** Slot length of each entry in beats. Existing field. */
  rhythm?: number[];
  /**
   * How long each entry is held, in beats. Same length as `sequence`.
   * Omitted entries fall back to `rhythm[i] * DEFAULT_HOLD_RATIO` (0.85).
   */
  hold?: number[];
}
```

Why one array of beats and nothing cleverer:

- It is exactly the quantity the feature consumes — no interpretation at read time.
- Same shape and units as `rhythm`, so anyone who can author one can author the other, and the two
  can be diffed against each other.
- It degrades: every existing song works untouched, because the default derives from `rhythm`.
- It says what `rhythm` cannot — a short note in a long slot (`rhythm: 2, hold: 0.4`), or a note
  held longer than its slot.

No `leadInBeats` — a count-in only exists to line a player up against a clock, and there is no
clock.

**Authoring convenience (last phase, optional):** a keyword layer compiled into `hold` by a script,
because "short / normal / long" reviews better than decimals — `staccato` 0.45, `normal` 0.85,
`legato` 0.98 of the slot. Keep it out of the runtime so there is one source of truth on device.

### CMS side

`types/story.ts` `MusicChallenge` has no `bpm` or `rhythm`, so a story page supplying
`requiredSequence` directly has no timing at all. Rather than duplicate timing into the CMS:

```ts
export interface MusicChallenge {
  // ...existing
  /** 'free' (default, today's behaviour) or 'hold' (must sustain each note). */
  noteLength?: 'free' | 'hold';
}
```

and **`hold` mode requires `songId`**, so hold data lives only in the local registry next to the
audio it describes. Needs the matching field on
`gateway-service/.../model/MusicChallenge.java` and a `story-engine` type update.

---

## 3. The pure layer

One new service, `services/hold-plan.ts`. No React, no clock, no timers:

```ts
export interface HoldTarget {
  index: number;
  notes: string[];       // parsed chord entry: every lane that must be held
  /** How long to hold, in ms, already clamped to what blow mode can sustain. */
  holdMs: number;
}

export interface HoldPlan {
  targets: HoldTarget[];
  /** True when every target is the default length, i.e. nothing to teach. */
  isUniform: boolean;
}

export function buildHoldPlan(sequence: string[], bpm: number, rhythm?: number[], hold?: number[]): HoldPlan;

/** Fraction of a target covered so far, 0–1. */
export function holdProgress(heldMs: number, target: HoldTarget): number;
```

`buildHoldPlan` is where `MAX_HOLD_MS` (2000) is enforced, so no other layer has to remember it.
`isUniform` lets the UI skip the shadow entirely for songs with nothing to say about length.

---

## 4. The shadow on the sheet

Behind each note head, a band in the note's colour running right from the head:

- length `holdMs / beatMs * pxPerBeat`, height ≈ one line gap, fully rounded ends
- **resting:** the note colour at 80 % opacity, with a taller line in the same colour standing at
  its far end — the point the hold has to reach. The band alone proved too weak to read a length
  off; the line makes the end unmistakable.
- **running:** rather than a bar filling in place, **the score creeps left** at the rate of the hold,
  so the shadow is eaten by the left edge of the window and what is still to the right is what is
  left to hold. The target line arriving at the edge *is* the note completing.
- **released early:** it snaps back to full in `RELEASE_SNAP_MS` (180 ms). The note has to be held
  all the way through in one go, so the sheet has to start again too.

Geometry lives in `staff-notation.ts` beside the existing note metrics. The note being played sits
one head-width in from the left (`playheadX`), everything already played having scrolled off.

**The row's position is computed, never accumulated** — `staffRowShift(slots, focus, held,
playheadX)` is `playheadX - slots[focus] - travel * held`, where `travel` is the gap to the next
note's slot. A finished hold and the next note at rest therefore give the same number, so the
handover has no step in it and the score cannot drift however long the song runs. Both ends of the
move are worked out in plain JS and the shared value only slides between them, which keeps the
resting position readable in a test and puts one number per frame on the UI thread. An earlier
version that accumulated the consumed distance drifted about a slot per long note — measured at
+347 px eight notes into `au_clair_lune`, against ±2 px for the computed version.

**Spacing has to change.** Notes are evenly spaced by index today, which leaves no room for a long
shadow. The rule becomes:

```
slot(i) = max(NOTE_SPACING, shadowLength(i) + SHADOW_GAP)
```

so a long note simply takes more room and a song of ordinary notes looks exactly as it does now.
The row then works off cumulative slots rather than `index * spacing`. `staffNoteSlots` carries a
trailing end marker so `slots[i + 1]` exists for the last note too, and there is no end-stop clamp:
clamping the scroll near the end of a song was what stopped the sheet tracking the closing notes.

---

## 5. Behaviour: when does the sheet move on?

The one behavioural change, at the one credit point (`processNoteForSequence`):

`creditAfterHold` in `use-music-challenge` defers `processNoteForSequence` by the note's `holdMs`
and drops it if the key comes up first, so holding is how a note counts. It applies to every song --
there is no `free`/`hold` switch on device, and the CMS `noteLength` field in § 2 is not built.

A **wrong** note is still credited on the press, so `lastInputCorrect` and `failedAttempts` never lag
behind the mistake. Every reset (`start`, `retry`, `skip`, `goHarder`, `cleanup`) clears the credits
still waiting.

**Forgiveness. SETTLED: reset, snapped back quickly.** The three options were to drain at half fill
speed, freeze where it got to, or reset. Half-speed drain shipped first and the operator reported it
as a bug -- "the area comes back into view, instead of carries on". It was: a 1.4 s hold of a 2 s
note spent **3.06 s** sliding backwards with nothing held, which reads as the sheet undoing itself
rather than as "hold it again".

Freezing is the tempting answer but it would **lie**: the credit restarts from zero on the next
press, so a frozen shadow claims progress the score does not have. The sheet has to show what the
credit is actually doing. So the rule is reset -- returned in 180 ms (`holdRun` in `hold-plan.ts`),
fast enough to read as a reset rather than a rewind. Measured on device: crept out over three
frames, back at rest in one.

If the youngest children turn out to need forgiveness here, it has to be the **credit** that
forgives -- accumulating held time across presses -- and then the shadow can freeze honestly. That
is a game-rule change, not a UI one.

**Not built:** scaling the required hold by age. The existing `childAgeInMonths` in the app store
already gates other content, and the youngest would be better off with the hold off entirely.

Everything else stays: no fail state, the song never stops, feedback is the note blooming and the
shadow filling and the bell swelling (`use-note-swell`). A part-filled shadow is information, not a
judgement — no red, no buzzer.

---

## 6. Phases

Each is shippable alone and leaves the app working.

**Phase 1 — data and pure layer.** `hold` on `PracticeSong`; `buildHoldPlan` / `holdProgress` with
`MAX_HOLD_MS` clamping. No UI change, no behaviour change.

**Phase 2 — the shadow, drawn.** Shadow geometry in `staff-notation.ts`, slot-based spacing, the
resting shadow rendered behind each note. Still `free` mode: the sheet now *says* how long to hold
each note without requiring it. **This is the deliverable that answers "know what to play / how long
for"**, and it carries no behavioural risk.

**Phase 3 — the hold, running. BUILT.** The score creeps left at the rate of the hold rather than a
bar filling in place, so the shadow is eaten by the left edge of the window and the target line
reaching that edge is the note completing. Half-speed rewind on an early release. Measured on
device: a 1.4 s hold of a 2 s note moved the score 258 px left (predicted 260) and rewound over
3.06 s (predicted 2.8).

**Phase 4 — the credit waits. BUILT.** `creditAfterHold` defers `processNoteForSequence` by the
note's `holdMs`, drops it if the key comes up first, and credits a wrong note immediately so
feedback never lags. Every reset clears the credits still waiting. Age scaling is **not** done --
the hold is the same for every child.

**The sheet is driven by that credit, not by the keys.** `useMusicChallenge` reports `holdingIndex`
— the entry whose credit is counting down — and the sheet creeps only while that is the note in
focus. Key state alone is not enough: a finger left down across a note boundary credits the note it
was pressed for and nothing more, so a key-driven sheet ran ahead of the score for the rest of the
song. The reward melody holds each note itself, so during playback the sheet runs the holds too.

**Phase 5 — content and CMS.** `hold` for the ~30 registry songs (plus the `articulation`
expansion script); `noteLength` on the CMS `MusicChallenge`, the Java model and story-engine types.

---

## 7. Risks

- **`BLOW_MAX_SUSTAIN_MS` caps the feature.** A 3 s auto-fade means holds must stay under ~2 s, so
  slow songs cannot teach long notes in blow mode. Press mode has no such limit — the same song
  would be harder to complete in blow mode unless the clamp applies to both. Recommend clamping
  both, so switching mode never changes what the sheet asks for.
- **`rhythm` was authored for playback, not for holding.** It has never been reviewed as something a
  child must reproduce. Phase 5 is a content pass, not a data migration.
- **The two 32-entry songs** get much wider with slot-based spacing and will need a look.
- **Chord entries** (`"C+E"`) need every lane held for the full length; progress should be the
  *minimum* across lanes, or a child could hold one note and drift off the other.
- **Blow mode ticks at 100 ms.** Do not animate the fill smoother than the input; a bar that glides
  while the breath is actually stuttering teaches the wrong thing.
