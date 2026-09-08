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
3. On a music challenge page, the child sees on-screen note buttons themed to their chosen instrument
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
  └── music-analytics (structured event logging)
```

### Key Files

| File | Purpose |
|-|-|
| `types/story.ts` | `MusicChallenge`, `PageInteractionType` types |
| `services/music-asset-registry.ts` | Local asset registry -maps instrument/song IDs to bundled files, body artwork and hole positions |
| `services/instrument-surface-layout.ts` | Pure layout -fits the body artwork into the measured area (leaving room for the bell to swell) and pins one note button per hole |
| `services/melody-scheduler.ts` | Pure timeline for the completion melody -one slot per entry from the song's `rhythm` and `bpm`, with an articulation gap |
| `services/note-event-bus.ts` | Start/end events for every note the instrument sounds; the bell animation subscribes to it |
| `components/music/instrument-bell.tsx` | Reusable bell swell -scales the instrument's bell cutout while notes sound, off under reduce-motion |
| `services/sequence-matcher.ts` | Pure note sequence matching logic |
| `services/music-analytics.ts` | Analytics event tracking |
| `hooks/use-mic-permission.ts` | Shared mic permission singleton -used by both recording and breath detection |
| `hooks/use-music-challenge.ts` | React hook -state machine, audio playback, completion |
| `hooks/use-breath-detector.ts` | Microphone breath detection with on-screen fallback (uses shared permission) |
| `components/stories/instrument-picker-overlay.tsx` | Full-screen instrument selection carousel (3D coverflow, pulsing ring, blur) |
| `components/stories/music-challenge-ui.tsx` | Instrument UI -note buttons, sequence progress, feedback |
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
- **No artwork**: an instrument without `artwork` falls back to the generic tube with a row of
  note buttons (no bundled instrument uses this any more)
- **Style**: Match the app's illustration style -colorful, friendly, child-appropriate

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
pile up. While the melody plays, presses, previews, retry and go-harder are ignored; cleanup,
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
are held simultaneously. Chord entries are used by the "Go Harder" difficulty feature (see below).

### 7. One instrument at a time per page

Each music challenge page uses exactly one instrument. This simplifies the UI, the state machine,
and the CMS config. Multiple instruments per page is a "Later" feature.

---

## State Machine

The music challenge follows this state flow:

```
idle → awaiting_input → playing_note → (awaiting_input | sequence_complete)
                                        sequence_complete → playing_success_song → completed
                                        completed → [Go Harder!] → awaiting_input (higher difficulty)
```

| State | Description |
|-|-|
| `idle` | Challenge not yet started |
| `awaiting_input` | Waiting for child to press a note (with breath active) |
| `playing_note` | A note is being played (audio) |
| `sequence_complete` | All notes played correctly |
| `playing_success_song` | Success song is playing |
| `completed` | Challenge done -page unlocked for progression. "Go Harder!" available. |
| `error` | Asset validation failed -challenge disabled |

## "Go Harder" Difficulty Progression

After completing a music challenge, the child sees three options: **↻ Retry**, **🔥 Go Harder**, and
**Continue Story →**.

Pressing "Go Harder" generates a new, harder chord-based sequence from the instrument's available
notes and restarts the challenge. This is session-only -no persistence.

### Difficulty Levels

| Level | Chord Size | Sequence Length | Example |
|-|-|-|-|
| 1 (original) | Single notes | From CMS config | `C → D → E → C` |
| 2 | 2-note chords | 3 chords | `C·D → E·F → C·E` |
| 3 | 3-note chords | 3 chords | `C·D·E → D·E·F → C·E·F` |
| 4+ | 3-note chords | 4–5 chords | Longer sequences |

### Chord Notation

- Single note: `"C"` -press one button
- 2-note chord: `"C+E"` -hold C and E simultaneously
- 3-note chord: `"C+E+G"` -hold all three simultaneously
- The `+` separator is used internally; the UI displays chords as `C·E` in sequence dots

### Implementation

- `SequenceMatcher.processChord(activeNotes: Set<string>)` -validates held notes against expected chord
- `generateHarderSequence(availableNotes, level)` -procedural generator in `use-music-challenge.ts`
- `useMusicChallenge.goHarder()` -increments difficulty, generates new sequence, resets state
- `MusicChallengeUI` -highlights all notes in a chord entry, shows wider dots for chords

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
| `use-music-challenge.test.ts` | 14 | State transitions, note progress, mic gating, skip, cleanup, error state |
| `use-mic-permission.test.ts` | 12 | Singleton caching, no double prompt, concurrent dedup, cross-hook sharing, denial propagation |
| `instrument-picker-overlay.test.tsx` | 12 | Visibility, instrument display, title/subtitle, confirm button, placeholders, defaults |
| `melody-scheduler.test.ts` | 11 | Rhythm slots, fallback to one beat, articulation gap, chords, tempo clamping |
| `note-event-bus.test.ts` | 4 | Delivery, unsubscribe, listener isolation, ordering |
| `music/instrument-bell.test.tsx` | 7 | Frame placement, touch pass-through, swell/relax on note events, reduce-motion, unmount |

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

## Future Enhancements (Not in MVP)

- Multiple instruments in one story
- Difficulty levels by age
- Timing/rhythm scoring
- ~~Harmony/chords~~ ✅ Implemented via "Go Harder" difficulty progression
- Adaptive hints after repeated failures
- Recording / playback of child's performance
- Teacher or parent mode
- Unlockable songs / practice mode
- Music Mode free play with instrument selection (currently shows placeholder text for non-music pages)
- Persistent difficulty level (currently session-only)
