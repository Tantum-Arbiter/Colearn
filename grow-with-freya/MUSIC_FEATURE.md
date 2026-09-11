# Music Story Interactions

> **For LLMs / AI agents**: This README is the authoritative reference for the music challenge feature.
> Read this file before modifying any music-related code. If you change architecture, assets, types,
> or data flow, **update this file** to keep it accurate. This is not optional documentation -it is
> the living specification that governs how the feature works and why decisions were made.

## Overview

Story pages can optionally include a **music challenge** where the child plays a sequence of notes
on a themed instrument to progress the story. The feature is content-driven from the CMS (Firestore),
while all instrument images, note audio samples, and success songs remain **bundled locally on the device**.

### Interaction Model

1. When entering a story that has any music challenge pages, a **full-screen instrument picker overlay**
   appears with a blurred background. The child swipes through a 3D carousel of instruments
   (same coverflow style as the main menu), sees a pulsing ring around the centered instrument,
   then taps "Let's Play!" to confirm their choice.
2. The overlay fades out and the story begins. The child's chosen instrument applies to ALL
   music challenge pages in that story (overriding the CMS default `instrumentId`).
3. On a music challenge page, the child sees on-screen note buttons themed to their chosen
   instrument, with the song written above them on a music sheet -- one coloured note per note to
   play, on the staff line it belongs to (see "The Music Sheet Above the Instrument")
4. Notes only produce sound when breath/blow is detected (mic or fallback button held)
5. The app matches played notes against the required sequence
6. On success: page state transitions, success song plays, next-page navigation unlocks

### Page Types

| `interactionType` | Behavior |
|-|-|
| `none` (default) | Standard story page |
| `interactive_state_change` | Existing tap-to-reveal before/after pages |
| `music_challenge` | Music interaction with sequence matching |

---

## Architecture

```
story-book-reader.tsx (integration layer -detects music pages, gates navigation)
  ├── InstrumentPickerOverlay (full-screen carousel, shown on story entry)
  │     └── music-asset-registry (reads all available instruments for carousel)
  ├── useMusicChallenge hook (state machine + audio playback via expo-audio)
  │     ├── SequenceMatcher (pure logic -ordered note sequence validation)
  │     └── music-asset-registry (local asset lookup + validation)
  ├── useBreathDetector hook (mic metering for blow detection, with fallback)
  │     └── useMicPermission (shared singleton -no double mic prompt)
  ├── MusicChallengeUI component (instrument buttons, progress, feedback)
  │     └── MusicStaffStrip (the song written on the sheet banner)
  │           └── staff-notation (pure geometry: pitch → staff position, sheet placement)
  └── music-analytics (structured event logging)
```

### Key Files

| File | Purpose |
|-|-|
| `types/story.ts` | `MusicChallenge`, `PageInteractionType` types |
| `services/music-asset-registry.ts` | Local asset registry -maps instrument/song IDs to bundled files, body artwork and hole positions |
| `services/instrument-surface-layout.ts` | Pure layout -fits the body artwork into the measured area (leaving room for the bell to swell), pins one note button per hole, and turns the instrument end for end for blow mode |
| `services/staff-notation.ts` | Pure notation geometry -staff line fractions measured off the sheet artwork, where each note sits, ledger lines, stem direction, shadow length, slot offsets, how far the row travels and where it sits (`staffHoldTravel` / `staffRowShift`), and where the sheet goes in each pose |
| `services/sheet-transition.ts` | Pure -timings for the wrong-note and replay cues, shared by the sheet's animation and the hook's reset so the score only changes while the notes are hidden |
| `services/hold-plan.ts` | Pure -turns a song's `rhythm` and optional `hold` into a hold target and a slot length in ms per note, the hold clamped to what blow mode can sustain; `holdRun` says how the sheet moves for a hold starting or let go |
| `components/music/music-staff-strip.tsx` | The song written on a staff -one coloured note per entry, in its button's colour, scrolling under a playhead |
| `services/melody-scheduler.ts` | Pure timeline for the completion melody -one slot per entry from the song's `rhythm` and `bpm`, with an articulation gap |
| `services/note-event-bus.ts` | Start/end events for every note the instrument sounds; the bell animation subscribes to it |
| `components/music/instrument-bell.tsx` | Reusable bell swell -scales the instrument's bell cutout while notes sound, off under reduce-motion |
| `services/sequence-matcher.ts` | Pure note sequence matching logic |
| `services/music-analytics.ts` | Analytics event tracking |
| `hooks/use-mic-permission.ts` | Shared mic permission singleton -used by both recording and breath detection |
| `hooks/use-music-challenge.ts` | React hook -state machine, audio playback, completion |
| `hooks/use-breath-detector.ts` | Microphone breath detection with on-screen fallback (uses shared permission) |
| `components/stories/instrument-picker-overlay.tsx` | Full-screen instrument selection carousel (3D coverflow, pulsing ring, blur) |
| `components/stories/music-challenge-ui.tsx` | Instrument UI -note buttons, the music sheet above the instrument, progress, feedback |
| `components/stories/story-book-reader.tsx` | Integration -shows picker on story entry, renders challenge, blocks navigation |

### Backend/CMS Files

| File | Purpose |
|-|-|
| `gateway-service/.../model/MusicChallenge.java` | Java model for Firestore music challenge config |
| `gateway-service/.../model/StoryPage.java` | `interactionType` + `musicChallenge` fields |
| `story-engine/src/models/types.ts` | Shared TypeScript types for story engine |

---

## Managing Stories & Assets: Local vs CMS

Stories can come from two sources, and both fully support music challenges.

### Two Pipelines at a Glance

| | **Local Bundled** | **CMS (Firestore + GCS)** |
|-|-|-|
| **Where stories live** | `grow-with-freya/data/bundled-stories.ts` | `scripts/cms-stories/{story-id}/story-data.json` |
| **Where story images live** | `grow-with-freya/assets/stories/{story-id}/` | `scripts/cms-stories/{story-id}/page-*/` → GCS bucket |
| **Where music assets live** | `grow-with-freya/assets/music/` (always local) | Same -music assets are always local, never in CMS |
| **How they reach the app** | Bundled in the app binary via `require()` | Synced at runtime via delta-sync API |
| **Offline support** | Always available | Cached locally after first sync |
| **When to use** | Core stories that ship with the app | New stories added without app updates |
| **Music challenge config** | `interactionType` + `musicChallenge` in TS page definition | Same fields in `story-data.json` |

### Local Bundled Stories

Bundled stories are compiled into the app binary. They work offline from first launch.

```
grow-with-freya/
├── data/
│   ├── bundled-stories.ts      ← Story definitions (18 stories)
│   └── stories.ts              ← Exports ALL_STORIES array
├── assets/
│   ├── stories/                ← Story images (per story, per page)
│   │   ├── sleepy-forest/
│   │   │   ├── cover/cover.webp
│   │   │   ├── page-1/page-1.webp
│   │   │   └── ...
│   │   └── {story-id}/
│   └── music/                  ← Music assets (shared across all stories)
│       ├── instruments/
│       ├── notes/
│       └── songs/
```

**Adding a music challenge to a bundled story:**

In `data/bundled-stories.ts`, add the fields to the relevant page:

```typescript
{
  id: 'sleepy-forest-page-7',
  pageNumber: 7,
  text: 'Gary needs to move the rock...',
  interactionType: 'music_challenge',
  musicChallenge: {
    enabled: true,
    instrumentId: 'flute',         // References local asset registry
    promptText: 'Play the flute to help Gary!',
    mode: 'guided',
    requiredSequence: ['C', 'D', 'E', 'C'],
    successSongId: 'gary_rock_lift_theme_v1',
    successStateId: 'rock_moved',
    autoPlaySuccessSong: true,
    allowSkip: false,
    micRequired: true,
    fallbackAllowed: true,
    hintLevel: 'standard',
  },
}
```

### CMS Stories (Firestore + GCS)

CMS stories are authored as files in `scripts/cms-stories/`, uploaded to Firestore + GCS via
GitHub Actions, and delta-synced to the app at runtime.

```
scripts/
├── cms-stories/
│   ├── squirrels-snowman/
│   │   ├── story-data.json      ← Story metadata + page definitions
│   │   ├── cover/cover.webp     ← Story images (uploaded to GCS)
│   │   ├── page-1/page-1.webp
│   │   └── ...
│   └── upload-manifest.json     ← Generated by cms-manager
├── cms-manager/                 ← CLI tool for validation/formatting
├── upload-stories-to-firestore.js
├── upload-assets-to-firestore.js
└── story-schema.json            ← JSON schema for validation
```

**Adding a music challenge to a CMS story:**

In `scripts/cms-stories/{story-id}/story-data.json`, add to the relevant page:

```json
{
  "id": "my-story-page-7",
  "pageNumber": 7,
  "type": "story",
  "text": "The dragon is sleeping...",
  "interactionType": "music_challenge",
  "musicChallenge": {
    "enabled": true,
    "instrumentId": "trumpet",
    "promptText": "Play the trumpet to wake the dragon!",
    "mode": "guided",
    "requiredSequence": ["C", "D", "E", "F"],
    "successSongId": "dragon_wake_fanfare_v1",
    "autoPlaySuccessSong": true,
    "allowSkip": false,
    "micRequired": true,
    "fallbackAllowed": true,
    "hintLevel": "standard"
  }
}
```

### CMS Pipeline Flow

```
Author story-data.json + images
         ↓
scripts/cms-manager validate & format
         ↓
git push to main
         ↓
GitHub Actions (cms-stories-sync.yml)
  ├── Validate story JSON against schema
  ├── gsutil rsync images → GCS bucket (delta-sync, checksums)
  ├── upload-stories-to-firestore.js → Firestore (delta, checksums)
  └── upload-assets-to-firestore.js → asset version metadata
         ↓
App launch / background sync
  ├── VersionManager.checkVersions() -compares local vs server version
  ├── StorySyncService.syncStories() -POST /api/stories/delta
  │     (sends client checksums, receives only changed stories)
  ├── CacheManager caches story data + downloads images to local filesystem
  └── StoryLoader merges bundled + CMS stories
         ↓
StoryBookReader renders pages
  └── Music challenge page detected → useMusicChallenge hook
```

### Important: Music Assets Are Always Local

Music assets (instrument images, note samples, success songs) are **never** uploaded to GCS or
served via CMS. They are always bundled locally in the app via `require()` in
`services/music-asset-registry.ts`.

CMS `story-data.json` only contains **string IDs** that reference local assets:
- `instrumentId: "flute"` → looks up `music-asset-registry.ts` → `require('@/assets/music/instruments/flute.png')`
- `successSongId: "gary_rock_lift_theme_v1"` → same local registry lookup

This means:
- **Adding a new instrument** requires an **app update** (new audio files bundled in binary)
- **Adding a new story using existing instruments** does NOT require an app update (CMS only)
- **Changing which instrument a story uses** does NOT require an app update (CMS metadata change)

### Page Interaction Types for Each Pipeline

Every story page should declare its `interactionType`. This applies to both local and CMS stories.

| `interactionType` | Local (bundled-stories.ts) | CMS (story-data.json) | Behavior |
|-|-|-|-|
| `"none"` (or omitted) | Optional field | Optional field | Static page -just text + image |
| `"interactive_state_change"` | Set on pages with `interactiveElements` | Same | Tap-to-reveal before/after state |
| `"music_challenge"` | Set + `musicChallenge` object | Same | Music instrument + sequence challenge |

---

## Supported Instruments

6 instruments are registered and ready for use. Each has a unique child-friendly visual theme.

| ID | Display Name | Family | Notes | Artwork | Theme |
|-|-|-|-|-|-|
| `flute` | Magic Flute | flute | C D E F G A (6) | 6 holes | Stars, moons, nature |
| `recorder` | Woodland Recorder | recorder | C D E F G A (6) | 6 holes | Forest, woodland creatures |
| `ocarina` | Enchanted Ocarina | ocarina | C D E F G A (6) | 6 holes | Magic, mystery, night sky |
| `trumpet` | Golden Trumpet | trumpet | C D E (3) | 3 valves | Knights, castles, heroic |
| `clarinet` | Jazzy Clarinet | clarinet | C D E F G A (6) | 6 holes | Jazz, city nightlife |
| `saxophone` | Sunshine Saxophone | saxophone | C D E F G (5) | 5 holes | Funk, dance, rainbow |

The note count follows the artwork: one note per hole (or valve), ordered left to right from C.
Every instrument colours its buttons from the shared `NOTE_COLORS` (C red, D orange, E amber,
F green, G blue, A violet -Boomwhacker order), so a note keeps its colour when the child changes
instrument; the sequence dots, music sheet and song previews use the same map. The per-instrument
`label`/`icon` emoji remain a theme for future use -nothing renders them today.
`recorder/A.wav`, `ocarina/A.wav` and `clarinet/A.wav` were derived from each instrument's `G.wav`
by a two-semitone pitch shift (2026-09-08) so the sixth hole plays; replace them with real
recordings when available.

**Every sample is tuned to equal temperament (A4 = 440 Hz)** and conditioned for the instrument UI
(2026-09-08). Each instrument sits in one register (trumpet C4–A4, clarinet/flute/ocarina/saxophone
C5–A5, recorder C6–A6). `scripts/prepare-note-samples.py` turns a raw recording into the bundled
sample: mono 44.1 kHz 16-bit, silence before the onset trimmed to ~6 ms so the note speaks on the
touch, the steady tone looped to 3.2 s (whole periods found by autocorrelation, phase-aligned linear
crossfades, the tone eased onto its exact named pitch before the loop starts), the recording's own
release kept at the end, then every sample matched to −17 dBFS RMS with a −1 dBFS peak ceiling.
Run it on a folder of new recordings, then check the result:

```bash
python3 scripts/prepare-note-samples.py --src /path/to/raw --out assets/music/notes   # needs numpy
python3 scripts/check-note-pitch.py --tolerance-cents 5   # measures the held tone; exits 1 on drift
```

The pitch check finds the note spectrally, then refines the held tone (0.5–1.5 s) by autocorrelation
around the named pitch, so it is not fooled by a breathy attack or by octave-ambiguous spectra.
The trumpet has three valves, so it plays three notes -songs that need F, G or A are filtered out of
its practise list and cannot be assigned to it in stories.

> **Backward compatibility**: Old IDs like `flute_basic`, `trumpet_basic` etc. are aliased to the
> new short IDs. CMS metadata using either form will work. New content should use the short form.

Stories configure which instrument via CMS metadata or local bundled story definitions:
- **CMS stories**: `page.musicChallenge.instrumentId = "trumpet"` in Firestore
- **Local bundled stories**: same field in `data/bundled-stories.ts` page definitions

---

## How to Add Audio Assets

### Directory Structure

Create these directories under `grow-with-freya/assets/music/`:

```
assets/music/
├── instruments/          # Instrument art (WebP with alpha)
│   ├── flute.webp             # square thumbnail for carousels / picker
│   ├── flute-body.webp        # landscape body art the note buttons sit on
│   ├── recorder.webp / recorder-body.webp
│   ├── ocarina.webp / ocarina-body.webp
│   ├── trumpet.webp / trumpet-body.webp
│   ├── saxophone.webp / saxophone-body.webp
│   └── clarinet.webp / clarinet-body.webp
├── notes/                # Note audio samples per instrument family
│   ├── flute/
│   │   ├── C.mp3
│   │   ├── D.mp3
│   │   ├── E.mp3
│   │   ├── F.mp3
│   │   ├── G.mp3
│   │   └── A.mp3
│   ├── recorder/
│   │   ├── C.mp3  ...  G.mp3
│   ├── ocarina/
│   │   ├── C.mp3  ...  G.mp3
│   ├── trumpet/
│   │   ├── C.mp3  ...  F.mp3
│   ├── clarinet/
│   │   ├── C.mp3  ...  A.mp3
│   └── saxophone/
│       ├── C.mp3  ...  G.mp3
└── songs/                # Success/celebration songs (shared across instruments)
    ├── gary_rock_lift_theme_v1.mp3
    └── dragon_wake_fanfare_v1.mp3
```

### Step-by-Step: Adding Audio Files for an Existing Instrument

The 6 instruments are already registered in `music-asset-registry.ts` with placeholder
`require()` calls. To activate one, you just need to:

**1. Create the audio files**

| Asset | Format | Spec |
|-|-|-|
| Note samples | MP3 or WAV | 44.1 kHz, 16-bit, < 100KB each, 0.5–2s duration, within ±5 cents of the named note (`scripts/check-note-pitch.py`) |
| Instrument thumbnail | WebP/PNG | Transparent background, square, 512×512px |
| Instrument body art | WebP/PNG | Transparent background, landscape, ≤1400px wide, holes left to right |
| Success song | MP3 | 44.1 kHz, 128–320 kbps, < 2MB, 5–30s duration |

**2. Place files in the correct directories**

```bash
# Example: adding files for the trumpet (already registered)
mkdir -p assets/music/instruments
mkdir -p assets/music/notes/trumpet
mkdir -p assets/music/songs

cp /path/to/trumpet.png   assets/music/instruments/trumpet.png
cp /path/to/C.mp3          assets/music/notes/trumpet/C.mp3
cp /path/to/D.mp3          assets/music/notes/trumpet/D.mp3
cp /path/to/E.mp3          assets/music/notes/trumpet/E.mp3
cp /path/to/F.mp3          assets/music/notes/trumpet/F.mp3
cp /path/to/victory.mp3    assets/music/songs/victory_fanfare_v1.mp3
```

**3. Uncomment the `require()` calls in `music-asset-registry.ts`**

Find the instrument in the `INSTRUMENTS` record and uncomment:

```typescript
trumpet: {
  id: 'trumpet',
  family: 'trumpet',
  displayName: 'Golden Trumpet',
  description: 'A bright trumpet with a bold, heroic sound',
  image: require('@/assets/music/instruments/trumpet.png'),
  notes: {
    C: require('@/assets/music/notes/trumpet/C.mp3'),
    D: require('@/assets/music/notes/trumpet/D.mp3'),
    E: require('@/assets/music/notes/trumpet/E.mp3'),
    F: require('@/assets/music/notes/trumpet/F.mp3'),
  },
  noteCount: 4,
  noteLayout: [
    { note: 'C', label: '🛡️', color: NOTE_COLORS.C, icon: 'shield' },
    { note: 'D', label: '⚔️', color: NOTE_COLORS.D, icon: 'sword' },
    { note: 'E', label: '👑', color: NOTE_COLORS.E, icon: 'crown' },
    { note: 'F', label: '🏰', color: NOTE_COLORS.F, icon: 'castle' },
  ],
},
```

**4. Register the success song in `music-asset-registry.ts`**

Add your song to the `SONGS` record:

```typescript
victory_fanfare_v1: {
  id: 'victory_fanfare_v1',
  displayName: 'Victory Fanfare',
  audio: require('@/assets/music/songs/victory_fanfare_v1.mp3'),
  duration: 10,
},
```

**5. Reference from CMS or local bundled story**

In Firestore (CMS) or `data/bundled-stories.ts` (local), set up the story page:

```json
{
  "interactionType": "music_challenge",
  "musicChallenge": {
    "enabled": true,
    "instrumentId": "trumpet",
    "promptText": "Play the trumpet to wake up the dragon!",
    "mode": "guided",
    "requiredSequence": ["C", "D", "E"],
    "successSongId": "victory_song_v1",
    "autoPlaySuccessSong": true,
    "allowSkip": false,
    "micRequired": true,
    "fallbackAllowed": true,
    "hintLevel": "standard"
  }
}
```

### Currently Registered Assets

| ID | Type | Status |
|-|-|-|
| `flute` | Instrument | Active -thumbnail, body art, bell cutout, 6 note samples |
| `recorder` | Instrument | Active -thumbnail, body art, bell cutout, 6 note samples (A derived from G) |
| `ocarina` | Instrument | Active -thumbnail, body art, mouthpiece cutout, 6 note samples (A derived from G) |
| `trumpet` | Instrument | Active -thumbnail, body art, bell cutout, 3 valve notes (F, G, A samples unused) |
| `clarinet` | Instrument | Active -thumbnail, body art, bell cutout, 6 note samples (A derived from G, 2026-09-08) |
| `saxophone` | Instrument | Active -thumbnail, body art, bell cutout, 5 note samples |

> All six instruments are fully wired. To replace a sample, drop the recording in
> `assets/music/notes/{family}/` and run `scripts/prepare-note-samples.py` then
> `scripts/check-note-pitch.py`; to replace body art, update the hole fractions and rerun
> `scripts/make-instrument-bells.py`.

---

## Audio File Guidelines

### Note Samples

- **Short and clean**: 0.5–2 seconds per note, no silence padding
- **Consistent volume**: Normalize all samples to the same level
- **No reverb/effects**: Keep them dry -the app doesn't process audio
- **Child-safe volume**: No sudden loud peaks
- **Naming**: Use note names exactly as referenced in sequences (e.g., `C.mp3`, `D.mp3`)

### Success Songs

- **Duration**: 5–30 seconds (the app waits `duration` seconds before marking complete)
- **Celebratory tone**: Upbeat, child-appropriate
- **Clean ending**: No abrupt cutoff

### Instrument Images

- **Thumbnail** (`{id}.webp`): square, transparent background, 512×512px -shown in the carousel
  and the story instrument picker (no circular crop is applied, so the art can reach the corners)
- **Body art** (`{id}-body.webp`): landscape, transparent background, ≤1400px wide, holes running
  left to right. Registered as `artwork: { image, aspectRatio, holeDiameter }` where
  `aspectRatio` is width ÷ height and `holeDiameter` is the hole width as a fraction of image width
- **Hole positions**: each `noteLayout` entry carries `hole: { x, y }` -the hole centre as
  fractions of the body art width/height. `MusicChallengeUI` measures the space it has, fits the
  art with contain scaling (`services/instrument-surface-layout.ts`) and pins one `NoteButton`
  per hole, so every instrument shares the same press, glow, pulse and playback effects
- **Bell cutout** (`{id}-bell.webp`): the body art cropped to the bell / open end with its alpha
  feathered where it joins the tube, generated by `scripts/make-instrument-bells.py` (which owns
  the frame numbers). Registered as `artwork.bell: { image, frame, origin, scale }` -all fractions
  of the body art. `InstrumentBell` draws it exactly over the body and scales it about `origin`
  (the join) by `scale` while any note sounds, so only the bell moves and the rest of the art is
  untouched. Only mouth-blown instruments get a bell (flute, recorder, clarinet, trumpet, saxophone)
- **Body pulse** (`artwork.bodyPulse: { x, y }`): vessel instruments with no bell (the ocarina)
  breathe as a whole instead -`InstrumentBodyPulse` scales the art *and* its pinned buttons
  together by 2–3 % about the centre. Both effects share `useNoteSwell`, which follows
  `challenge.noteEvents`, so they are in step with the sound and switch off under reduce-motion
- **Placement** (`layoutInstrumentStage`): the body art is pinned to the left edge (tube art is drawn
  to bleed off that edge, so the left cut must never be visible) and stops before the right
  safe-area inset plus the bell's swell headroom, so nothing clips under the notch. Its note row is
  placed exactly on the screen's middle line; the art is only shrunk when that would push its top
  above `ARTWORK_TOP_MARGIN` or leave no room for the dots-and-controls block under the buttons.
  The prompt / celebration row floats over the top, and the dots and controls form one block
  centred between the buttons and the bottom edge (never closer than `LOWER_BLOCK_BUTTON_GAP` to a
  button, free to overlap the rest of the art). Size and position stay identical from the first
  note to "Amazing!"
- **Which end blows** (`flippedSurfaceShift`, `instrumentFlipTransform`): every body art is drawn
  with the mouthpiece on the left, cut flat to bleed off that edge, and the bell finished on the
  right. Blowing means holding the phone upright with the *bottom* of the phone -- where the
  microphone is -- at the child's mouth, and the landscape layout maps its own right-hand edge to
  that bottom. So in blow mode the instrument turns end for end: the body is mirrored about the
  middle of the surface, which swaps the ends over and keeps the bleed exactly as deep, so the flat
  cut is still never visible. The mirror animates from the same 0 -> -90 value as the note letters,
  passing edge-on halfway, which reads as the instrument being turned round. The letters carry the
  mirror again (`noteLabelTransform`) so they still read the right way up -- a rotation inside a
  mirror comes out reversed, so its sign goes with it. Both helpers are `'worklet'`s: they are
  called from inside `useAnimatedStyle`, and a plain imported function called on the UI runtime
  aborts the app.
- **Only where the layout turns** (`regionTurnsForBlow`): the turn, and the sheet's move to the
  bottom, apply only in a landscape region -- the way a phone draws this screen. A tablet held
  upright leaves the instrument lying across the screen, so nothing turns.
- **No artwork**: an instrument without `artwork` falls back to the generic tube with a row of
  note buttons (no bundled instrument uses this any more). Its mouthpiece is already drawn on the
  right, so it is never mirrored
- **Style**: Match the app's illustration style -colorful, friendly, child-appropriate

### The Music Sheet Above the Instrument

`assets/music/sheet/staff-banner.webp` (2000x667, transparent) is a storybook banner with a
treble clef and five printed staff lines. `MusicStaffStrip` draws the song on it: one note per
sequence entry, in the same colour as that note's button on the instrument, sitting on the line or
space the note belongs to. It replaces the row of coloured chips that used to list the sequence
under the instrument -- only the `n/m` progress line is left there.

Everything positional is measured off the artwork and lives in `services/staff-notation.ts`:

| Constant | Value | What it is |
|-|-|-|
| `STAFF_ASPECT_RATIO` | 2000/667 | Banner width ÷ height |
| `STAFF_TOP_LINE` / `STAFF_LINE_GAP` | 0.3651 / 0.0624 | Top printed line and line spacing, as fractions of banner height (sampled at y = 243.5, 285.5, 327.5, 369, 410) |
| `STAFF_PAPER_TOP` / `STAFF_PAPER_BOTTOM` | 0.2 / 0.78 | Where the opaque paper starts and ends. Below `PAPER_BOTTOM` the artwork is clear, so the sheet can hang over the instrument without hiding it |
| `STAFF_NOTE_LEFT` / `STAFF_NOTE_RIGHT` | 0.181 / 0.85 | Where the notes are cut off, right against the clef (whose ink was measured at columns 257-358 of 2000, ending at 0.179) and before the stars and leaves |
| `STAFF_LETTER_CENTRE` | 0.695 | The one baseline under the staff that every note's letter sits on |

- **Register**: the bundled samples measure 523 Hz (C5) through 880 Hz (A5), so the app's C is the
  C *above* middle C -- the middle space of the treble staff, five half-steps up from the bottom
  line (`APP_C_STEPS`). That is both the true pitch and the reading that keeps a whole nursery
  melody inside the printed staff; writing it in the middle-C octave would hang most notes under
  the staff on ledger lines. Only A reaches above the staff, and it gets one ledger line.
- **Engraving**: stems hang down from the middle line up (`staffStemsPointDown`), which is where
  the whole C-A scale sits. Every stem runs all the way to the bottom staff line
  (`staffStemHeight`), so a row of them ends on one line rather than at a dozen different heights.
  They cannot point up instead: the artwork leaves 0.165 of its height of paper above the top staff
  line and a stem is 0.19, so an upward stem would climb out of the paper and through the song
  title. `staffLedgerSteps` returns the short lines a note written off the staff needs.
- **Hold shadows and the target line**: given a `holdPlan` (from `services/hold-plan.ts`, built by `useMusicChallenge`
  off the song's `rhythm` and optional `hold`), each note carries a band behind it in its own colour
  at 80 % opacity, running right from the head for as long as the note is held, and a taller line
  in the same colour standing at its far end -- the point a hold has to reach. The band alone was
  not enough to read a length off; the line makes the end unmistakable. One beat covers
  exactly the ordinary note spacing, so a note held twice as long simply takes twice the room --
  `staffNoteSlots` gives each note `max(spacing, shadow + gap)`. The gap is 0.3 of a slot rather
  than the 0.15 a default hold leaves over: at that narrower figure consecutive shadows very nearly
  touch and a run of equal notes reads as one long band instead of several separate holds. The row's
  position works off those slot offsets rather than the note index. Holds are capped at `MAX_HOLD_MS` (2 s) because blow-mode notes
  auto-fade at `BLOW_MAX_SUSTAIN_MS` (3 s), so the sheet can never ask for a hold the child cannot
  achieve. - **Holding a note is how it counts.** The note being played is parked just under a head-width in
  from the left of the window (`playheadX`, `PLAYHEAD_HEAD_WIDTHS` -- only enough for its ring to
  clear the cut, so it sits flush against the point notes scroll out at), everything already played
  having scrolled off behind it, and its
  hold runs away to the right. While it sounds, the score creeps left at exactly the rate of the
  hold, so the shadow is eaten by the left edge and what is still to the right is what is left to
  hold; the target line reaching the edge *is* the note completing. Let go early and it rewinds at
  full in `RELEASE_SNAP_MS` (180 ms, `holdRun`): a note counts only if it is held all the way
  through in one go, so the sheet starts again too. **The release carries on from wherever the move
  actually reached, and `holdRun` deliberately will not say where that is.** The move runs on the UI
  thread, and reading an animating shared value back on the JS thread returns a stale copy; assigning
  it cancelled the move and snapped the score to a place it had been several frames earlier, which
  was a visible jolt -- worst on the long notes, where most progress had accumulated. `withTiming`
  starts from the live UI value on its own, so the fix is simply not to touch it.
- **Only a new note starts the move over.** Pressing again part-way through a snap-back carries on
  from wherever the score is, rather than rewinding to nothing first -- rewinding teleported it by
  whatever the snap had not yet undone, measured at 50px on device with the snap stretched to make
  the window reachable, and that is the stutter felt when tapping the same note repeatedly. A press
  still takes the whole hold, the same span the credit waits, so it arrives at the end of the note's
  travel exactly as the note counts; it only shows the score a little further through the note than
  the credit is, by however much of the snap was left, and that decays as the snap finishes. A note
  the score has just moved on to *must* start over, because its resting place has already shifted
  along by a whole travel. It used to rewind at half the speed it ran, which
  meant up to twice the hold spent sliding backwards with nothing held -- that read as the sheet
  undoing itself rather than as "hold it again". Freezing the shadow where it got to would be
  kinder but would lie, since the credit restarts from zero on the next press. There is no clock:
  nothing moves unless the child is holding, so there is no hurry.
  The credit waits with it: `creditAfterHold` in `use-music-challenge` defers
  `processNoteForSequence` by the note's `holdMs` and drops it if the key comes up first. A **wrong**
  note is still credited instantly, so the feedback never lags behind the mistake, and every reset
  (`start`, `skip`, `cleanup`, and the reset behind either sheet cue) clears the credits still
  waiting.
- **The sheet runs off the credit's clock, not the keys.** `useMusicChallenge` reports
  `holdingIndex` -- the entry whose credit is counting down -- and the sheet creeps only while that
  is the note in focus. Key state is not enough: a finger left down across a note boundary credits
  the note it was pressed for and nothing more, so driving the sheet off the keys ran it ahead of
  the score for the rest of the song.
- **The whole position lives on shared values, and that is the point.** Resting place and move used
  to be split -- the resting place a plain `left` from React, the move an animated transform -- and
  the two reach the UI thread by independent routes with no ordering between them. A frame could
  therefore be drawn pairing *this* note's resting place with the *last* note's finished move, which
  flashed the score a whole note's travel sideways and back on every completed note: measured at
  221 px on a two-beat note and 130 px on a one-beat, one frame, immediately undone. No amount of
  reordering the JS writes fixes that, because the race is between two transports. `rowRest`,
  `rowTravel` and `progress` are now written together in a single `runOnUI` tick, so there is no
  half-applied state to draw, and rewinding for a new note is a plain assignment rather than a
  one-millisecond animation -- as an animation it did not land until the next frame, which was the
  flash all over again.
  The cost is that a jest render cannot read where the row is parked (`useAnimatedStyle` returns
  `{}`), so that is asserted against the pure layer instead: `staffRowShift` and `staffFocusIndex`.
- **The row cannot drift.** Its position is computed, never accumulated: `staffRowShift(slots,
  focus, held, playheadX)` is `playheadX - slots[focus] - travel * held`, so a finished hold and the
  next note at rest give the same number -- the handover has no step in it (`staffNoteSlots` carries
  a trailing end marker so `slots[i + 1]` exists for the last note too). Both ends of the move are
  worked out in plain JS; the worklet only slides between them, which keeps the resting position
  readable in a test. Measured on device across an 11-note song (`au_clair_lune`, two 2-beat notes
  and a 4-beat close): the played note sat within 2 px of the playhead at every one of the eleven.
  An earlier accumulating version drifted a slot per long note.
- **Past the last note** there is nothing left to play, so the score stops on the closing note --
  dimmed, ring off -- rather than scrolling off and leaving a blank staff behind the celebration.
- **The light at the cut**: a glow standing where the note being held slides out of view, brightening
  with the hold so how far through a note the child is reads as something lighting up and not only as
  the score creeping. It sits **on that note's own row and in that note's colour** -- a pale
  full-height line across the staff was both invisible against cream paper and silent about which
  note it belonged to. The halo is anchored at the cut and spreads *right*, over the highlight being
  eaten; centred on the cut it spilled back over the treble clef and bare paper, which is not what is
  being consumed. Measured at the cut on the note's row: saturation 18 at rest against 120 mid-hold.
- **Landing bounce**: the note the child is on springs once whenever the sheet advances onto it, so
  a landing reads as one. The reward melody bounces harder and looser (1.5x against 1.22x, damping 6
  against 9) so it rings rather than lands -- nothing is being asked of the child there. Off under
  reduce-motion.
- **Letters**: each note's name is written under the staff in the note's own colour, every one on
  the `STAFF_LETTER_CENTRE` baseline rather than under its own head, so the row of letters reads
  straight however high the melody climbs. They sit between the bottom staff line and the paper's
  edge, in the band the stems now stop short of.
- **Scrolling**: songs run to 32 notes but only about a dozen fit, so the row is always positioned
  to put the note being played on the playhead -- everything before it has scrolled out through the
  cut just past the treble clef. Notes already played stay on the page at 40 % opacity; the one to
  play next carries a white ring, which follows the melody instead during the success song. The
  reward melody holds each note itself, so the sheet runs through the song with it and the shadows
  are eaten one by one exactly as they are under the child's own fingers. **Played back, the score
  moves at the rate of the melody, not the rate of the hold**: `melody-scheduler` starts each note
  one *slot* after the last, while a hold is only 0.85 of its slot (and capped at 2 s), so animating
  the travel over the hold finished every note early and left the score still until the next one
  sounded -- 100 ms on a one-beat note, 667 ms on the four-beat close, which read as the playback
  stopping and starting rather than flowing. `HoldTarget.slotMs` carries the slot for exactly this,
  rounded the way the scheduler rounds so the two stay locked; a test asserts they agree note for
  note against `buildMelodyTimeline`.
- **Placement** (`layoutStaffStrip`): the sheet fills the space the stage left above the instrument,
  its paper bottom resting `STAFF_SHEET_OVERLAP` px past the top of the artwork, centred, capped at
  55 % of the region height and never wider than the region. The prompt is written on the paper in
  ink instead of floating over it in a pill, so the whole band above the staff is used.
- **Blow pose**: in blow mode the instrument turns to point at the floor, so the sheet turns with
  it -- the same box rotated -90°, scaled to the region's height (the width of the phone as the
  child now holds it) and moved so its paper *top* lands across the top of the upright phone, clear
  of the hand and of the mouthpiece at the bottom. `edgeInset` keeps it below the notch on that
  edge. Turned, the sheet is also **drawn longer than the screen** (`rotatedZoom`, from
  `TURNED_MIN_LINE_GAP`): only as long as the phone is wide, the staff comes out around 8px between
  lines, which is too small to pick a note off. Zooming past the screen brings it to 14, and the
  sheet is **anchored by its left edge** rather than centred -- so the moon and the treble clef stay
  in view and the notes slide in from the right, off the end of the paper the child cannot see.
  `visibleFraction` (1/zoom) then narrows the note window to the part actually on screen, so the
  score is parked and scrolled where it can be seen rather than off the edge. A region already big enough (a tablet) is left at its natural size, ends and all,
  and the song title stays on the paper -- it comes off only when zoomed, where it would be clipped
  at both ends. It is a transform on one box, driven by the same `instrumentRotation` value as the note
  labels, so sheet and instrument move together. This only applies where the layout really is drawn
  the phone way (`turnsForBlow`, a landscape region); a tablet held upright leaves the instrument
  lying across the screen, so the sheet stays above it.
- **Depth**: lying across the screen, the instrument paints *over* the sheet -- the overlap is only
  the sheet's empty bottom skirt, and the instrument should read as the thing in front. Stood
  upright for blow mode the sheet comes forward instead (`staffSheetLifted`), or the bell would sit
  over the middle of the staff and hide the notes.
- **Touches**: the strip is `pointerEvents="none"` throughout -- it overlaps the instrument, and
  every press has to reach the note buttons.

---

## Design Decisions (Why Things Were Done This Way)

> **For LLMs**: These are locked-in architectural decisions. Do not change them without explicit user approval.

### 1. Assets are local, not streamed

All instrument images, note samples, and success songs are bundled with the app via `require()`.
This ensures zero-latency playback (critical for a musical instrument feel), full offline support,
and no dependency on network for the core interaction. CMS only stores string IDs that reference
local assets.

### 2. Shared microphone permission (useMicPermission singleton)

Both `useVoiceRecording` (narration record mode) and `useBreathDetector` (music challenge mode)
need microphone access. A shared `useMicPermission` hook ensures:
- The OS permission dialog is shown **at most once** per app session
- Whichever feature requests permission first (recording or music), the result is cached
- The second feature that needs mic reads the cached state -no re-prompt
- Concurrent requests are deduplicated (even if both hooks call `requestPermission` simultaneously)
- Module-level singleton state (`cachedStatus`) survives across hook instances and re-renders

**File**: `hooks/use-mic-permission.ts`

### 3. Breath detection, not pitch recognition

The microphone is used ONLY as a noise/breath threshold detector, NOT for pitch detection or
music recognition. Reasons:
- Children's environments are noisy and unpredictable
- Pitch detection requires calibration and is fragile across devices
- "Press note + blow" is a much more reliable and fun interaction model
- Cross-device microphone quality varies wildly

### 4. Fallback blow button is required, not optional

If mic permission is denied or the mic is unavailable, the app shows an on-screen "Hold to blow"
button. This is a hard requirement because:
- Parents may deny mic permission
- Some devices have poor mic hardware
- The feature must never be broken by permission state

### 5. Music challenge = another completion gate

The music challenge reuses the same page completion model as existing interactive pages (before/after
state). This keeps the story progression system simple and consistent. A music page is just another
kind of stateful interaction that resolves from "before" to "after" when the challenge is completed.

### 5b. Notes sound from prepared players; the melody is scheduled, not replayed

`useMusicChallenge` creates one warm `AudioPlayer` per note when a challenge starts and swaps a
fresh one in after each press, so the first `play()` of a player never lands on the touch. A held
note loops its 3.2 s sample and fades over ~150 ms on release. On completion the hook builds a
timeline with `buildMelodyTimeline` (song `rhythm` in beats × `bpm`, default one beat per entry,
a 40–140 ms articulation gap) and fades each entry's players at the end of its slot, so notes never
pile up. While the melody plays, presses and previews are ignored; cleanup,
skip, config change and unmount cancel it. Every sounded note is published on
`challenge.noteEvents` (`press` / `preview` / `melody`, `start` / `end`), which is what the bell
swell and the playback highlight (`challenge.playbackPosition`) follow -so the animation tracks
the audio, not the button.

### 6. Sequence matching is simple and forgiving

MVP uses exact ordered sequence matching with tolerance for accidentally repeating the previous
correct note. No timing, rhythm, or scoring. Wrong notes reset the sequence. This is intentionally
simple -children should succeed with patience, not precision.

**Chord support**: Sequence entries can be single notes (`"C"`) or chords using `+` notation (`"C+E"`,
`"C+E+G"`). The `SequenceMatcher.processChord(activeNotes)` method validates that all required notes
are held simultaneously. Chord entries come from a story that asks for them in `requiredSequence`.

### 7. One instrument at a time per page

Each music challenge page uses exactly one instrument. This simplifies the UI, the state machine,
and the CMS config. Multiple instruments per page is a "Later" feature.

---

## State Machine

The music challenge follows this state flow:

```
idle → awaiting_input → playing_note → (awaiting_input | sequence_complete)
                                        sequence_complete → playing_success_song
                                        playing_success_song → (replay cue) → awaiting_input
```

**There is no resting finished state.** Once the reward melody has played, the hook tells the story
it is done (`onComplete`, and `hasCompleted` stays true so "Continue Story" appears) and then clears
the song back to its first note so it can simply be played again. `completed` is now only reached by
`skip`.

| State | Description |
|-|-|
| `idle` | Challenge not yet started |
| `awaiting_input` | Waiting for child to press a note (with breath active) |
| `playing_note` | A note is being played (audio) |
| `sequence_complete` | All notes played correctly |
| `playing_success_song` | Success song is playing |
| `completed` | Only reached by `skip`; the normal finish returns to `awaiting_input` |
| `error` | Asset validation failed -challenge disabled |

## What the sheet says without words

Two things are told with the sheet rather than with buttons or text. Both timings live in
`services/sheet-transition.ts`, and both the animation and the hook's reset work from the same
figures -- the score is only ever reset while the notes are hidden, because the whole point of each
cue is to cover that change.

| Cue | What the child sees | Timing |
|-|-|-|
| **Wrong note** | The paper washes red and clears again, then the notes fade out and come back at the first note | red in 180 ms, red out 220 ms, notes out 260 ms, notes in 520 ms |
| | *The wash is a second copy of the banner with a `tintColor`, not a coloured rectangle. The artwork is paper with 3 % transparent margins and a transparent skirt below it, so a rectangle over the strip's box washed 125 px of the story art above the sheet red as well -- measured. Tinting the image keeps the red inside the paper's own shape, gold border and wavy edges and all: the reddened area now matches the artwork's opaque region to within a pixel.* | |
| **Replay** | The notes simply fade out and come back at the first note | notes out 260 ms, notes in 520 ms |
| | *Both note fades run at an even rate and the way back in is twice the way out. Eased -- quickest at the start -- coloured notes on cream paper crossed into visibility in the first fifth of the fade and read as the song appearing rather than fading in: measured at four frames, against twenty-seven now.* | |

The matcher already sends the score back to the first note the instant a wrong note is pressed, but
the hook deliberately does **not** publish that result: the sheet keeps showing where the child got
to while the red is on, and `resetBehindCue` publishes the reset once the notes are hidden. Pushing
it through on the press snapped the score to the start before the child had seen anything go red.

**Also removed:** the manual rotate button and the `manualRotated` state behind it -- turning the
instrument is what blow mode does, and it does it on its own, so `isRotated` is simply
`playMode === 'blow'`. And the "Playing your song…" caption during the reward melody: the sheet
running through the song says it.

**Removed:** ↻ Retry and 🔥 Go Harder, and the difficulty progression behind them
(`generateHarderSequence`, `difficultyLevel`, `goHarder`, `retry`). Playing the song again needs no
button -- the sheet clears itself -- and a wrong note resets it the same way. The `music.retry`,
`music.goHarder`, `music.goHarderLevel`, `music.levelComplete` and `music.listeningToMelody`
strings are left in the 14 locale files rather than risk a bulk edit across them; they are unused.

### Chord Notation

- Single note: `"C"` -press one button
- 2-note chord: `"C+E"` -hold C and E simultaneously
- 3-note chord: `"C+E+G"` -hold all three simultaneously
- The `+` separator is used internally; the UI displays chords as `C·E` in sequence dots

### Implementation

- `SequenceMatcher.processChord(activeNotes: Set<string>)` -validates held notes against expected chord
- `MusicChallengeUI` -highlights all notes in a chord entry

---

## CMS Configuration Reference

### `StoryPage` Fields

| Field | Type | Description |
|-|-|-|
| `interactionType` | `"none" \| "interactive_state_change" \| "music_challenge"` | Page interaction mode |
| `musicChallenge` | `MusicChallenge` object | Present when `interactionType === "music_challenge"` |

### `MusicChallenge` Fields

| Field | Type | Default | Description |
|-|-|-|-|
| `enabled` | boolean | `true` | Whether the challenge is active |
| `instrumentId` | string | -| Local instrument asset ID (e.g., `"flute_basic"`) |
| `promptText` | string | -| Narrative prompt shown to the child |
| `mode` | `"guided" \| "free_play_optional"` | `"guided"` | Challenge mode |
| `requiredSequence` | string[] | -| Notes to play in order (e.g., `["C", "D", "E", "C"]`) |
| `successSongId` | string | -| Local song asset ID |
| `successStateId` | string? | -| Optional page state ID on success |
| `autoPlaySuccessSong` | boolean | `true` | Auto-play success song on completion |
| `allowSkip` | boolean | `false` | Allow skipping the challenge |
| `micRequired` | boolean | `true` | Require mic for breath detection |
| `fallbackAllowed` | boolean | `true` | Show fallback blow button if mic unavailable |
| `hintLevel` | `"none" \| "minimal" \| "standard" \| "verbose"` | `"standard"` | Hint verbosity |

---

## Testing

```bash
# Run all music feature tests (109 frontend + 87 backend tests)
cd grow-with-freya
npx jest __tests__/services/sequence-matcher.test.ts \
        __tests__/services/music-asset-registry.test.ts \
        __tests__/services/music-analytics.test.ts \
        __tests__/hooks/use-music-challenge.test.ts \
        __tests__/hooks/use-mic-permission.test.ts \
        __tests__/components/instrument-picker-overlay.test.tsx \
        --forceExit

# Run individual test suites
npx jest __tests__/services/sequence-matcher.test.ts --forceExit
npx jest __tests__/hooks/use-music-challenge.test.ts --forceExit
```

### Frontend Test Coverage (grow-with-freya)

| Suite | Tests | What's Tested |
|-|-|-|
| `sequence-matcher.test.ts` | 15 | Correct/wrong sequences, repeat tolerance, reset, edge cases |
| `music-asset-registry.test.ts` | 45 | All 6 instruments, aliases, families, note layouts, validation |
| `music-analytics.test.ts` | 11 | All tracking functions export and execute without error |
| `use-music-challenge.test.ts` | 38 | State transitions, note progress, mic gating, skip, cleanup, error state, the hold gate, and the two sheet cues resetting the song behind them |
| `sheet-transition.test.ts` | 6 | Cue order and timings -- the red wash before the notes clear, the notes hidden before the score is reset |
| `use-mic-permission.test.ts` | 12 | Singleton caching, no double prompt, concurrent dedup, cross-hook sharing, denial propagation |
| `instrument-picker-overlay.test.tsx` | 12 | Visibility, instrument display, title/subtitle, confirm button, placeholders, defaults |
| `melody-scheduler.test.ts` | 11 | Rhythm slots, fallback to one beat, articulation gap, chords, tempo clamping |
| `note-event-bus.test.ts` | 4 | Delivery, unsubscribe, listener isolation, ordering |
| `music/instrument-bell.test.tsx` | 7 | Frame placement, touch pass-through, swell/relax on note events, reduce-motion, unmount |
| `instrument-surface-layout.test.ts` | 33 | Artwork fit, hole pinning, bell placement, stage placement, and the blow-mode mirror (shift, pose, letter pose, landscape gate) |
| `hold-plan.test.ts` | 31 | Hold derived from the slot, explicit holds, the blow-mode clamp, chords, mismatched rhythm, progress, the move the sheet makes for a hold starting or let go, which clock it moves on, and the slot length agreeing with the reward melody's own timeline |
| `staff-notation.test.ts` | 71 | Pitch to staff position against the measured line pixels, ledger lines, stem direction, note metrics, shadow length, slot offsets, the row's resting position and drift-free handover, and the sheet's placement in both poses |
| `music-staff-strip.test.tsx` | 41 | One coloured note per entry on its own line, ledger line, stems ending on the bottom line, aligned letters, hold shadows and the room they take, the row parked on the playhead (long notes and the end of the song included), played/next/melody states, chord entries, unplaceable names, touch pass-through |

### Backend Test Coverage (gateway-service)

```bash
cd gateway-service
./gradlew test --tests "com.app.model.MusicChallengeTest" \
               --tests "com.app.model.StoryPageTest" \
               --tests "com.app.controller.StoryControllerTest" \
               --tests "com.app.service.StoryServiceTest"
```

| Suite | Tests | What's Tested |
|-|-|-|
| `MusicChallengeTest` | 18 | Model defaults, getters/setters, equals/hashCode, toString |
| `StoryPageTest` | 29 | interactionType for all page types, musicChallenge field, all 6 instrument IDs |
| `StoryControllerTest` | 20 | API serialization of interactionType + full musicChallenge metadata |
| `StoryServiceTest` | 20 | Firestore roundtrip preserving music challenge config |

---

## Analytics Events

| Event | When |
|-|-|
| `music_page_viewed` | Child lands on a music challenge page |
| `music_mode_opened` | Music Mode opened from burger menu |
| `mic_permission_result` | Mic permission granted or denied |
| `challenge_started` | Challenge begins |
| `challenge_completed` | Sequence completed successfully |
| `challenge_failed_attempt` | Wrong note played |
| `fallback_mode_used` | On-screen blow button used instead of mic |
| `asset_error` | Referenced instrument/song/note not found locally |
| `config_validation_error` | CMS config references invalid assets |

---

## Edge Cases Handled

- **Mic permission denied** → Falls back to on-screen blow button
- **Missing local assets** → Challenge enters `error` state, page renders without music UI, error logged
- **Child exits mid-sequence** → State cleaned up on page leave, can restart on return
- **Notes pressed without blowing** → No sound, hint text shown
- **Empty sequence** → Immediately completes (edge case in SequenceMatcher)
- **Child leaves and returns to page** → Challenge can be restarted
- **Offline** → Fully functional -all assets are local

---

## Hold-the-note (Phase 7)

The sheet moves only when the right note is played -- there is no clock and nothing to miss. Its job
is to show which note comes next and **how long to hold it**.
[`../PHASE-7-MUSIC-GAME.md`](../PHASE-7-MUSIC-GAME.md) has the whole design: the `hold` metadata,
the three latency limits from `use-breath-detector` and `use-music-challenge`, the forgiveness rules
and five phases. **Phases 1-4 are built** (the `hold` field, `hold-plan.ts`, the shadow drawn on the
sheet, the score creeping left as the hold runs, and the credit waiting it out). Phase 5 -- `hold`
data for the registry songs and the CMS `noteLength` field -- is not.

---

## Future Enhancements (Not in MVP)

- Multiple instruments in one story
- Difficulty levels by age
- Timing/rhythm scoring
- ~~Harmony/chords~~ ✅ Implemented -a story may ask for them in `requiredSequence`
- Adaptive hints after repeated failures
- Recording / playback of child's performance
- Teacher or parent mode
- Unlockable songs / practice mode
- Music Mode free play with instrument selection (currently shows placeholder text for non-music pages)
