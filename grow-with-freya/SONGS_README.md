# Song Library — Grow with Freya

## Overview

The song library is a core part of the **Music Challenge** feature. Every song is defined as a **note sequence** — an ordered array of note names (C, D, E, F, G, A) — rather than pre-recorded audio. This means the same melody can be played on any instrument that supports the required notes: a flute, recorder, ocarina, trumpet, clarinet, or saxophone. The instrument's own audio samples provide the sound.

Songs are registered in `services/music-asset-registry.ts` in the `PRACTICE_SONGS` array. Each entry specifies:

| Field           | Description |
|-----------------|-------------|
| `id`            | Unique stable identifier (snake_case) |
| `nameKey`       | i18n key under `music.songs.*` for the display name |
| `difficulty`    | `'easy'`, `'medium'`, or `'hard'` |
| `category`      | `'nursery'`, `'storybook'`, or `'forces'` |
| `sequence`      | Array of note names, e.g. `['C','D','E','D','C']` |
| `requiredNotes` | Unique notes used (for instrument-compatibility filtering) |
| `bpm`           | Tempo hint in beats per minute |

---

## Song Categories

### 1. Nursery Rhymes (`nursery`)

All nursery rhymes are **IP-free / public domain** melodies. Their copyrights have expired or they were never copyrighted. These are the traditional tunes children know worldwide.

**Easy:** Hot Cross Buns, Rain Rain Go Away, Au Clair de la Lune, Mary Had a Little Lamb, Itsy Bitsy Spider, Row Row Row Your Boat  
**Medium:** Twinkle Twinkle Little Star, Ode to Joy, London Bridge, Three Blind Mice, Humpty Dumpty, Jack and Jill, Old MacDonald  
**Hard:** Jingle Bells, Frère Jacques, Happy Birthday, Hickory Dickory Dock

### 2. Storybook Songs (`storybook`)

Original compositions designed for use within interactive storybooks. Each melody is crafted to evoke a mood or scene:

| Song | Mood | Difficulty |
|------|------|-----------|
| Raindrop Song | Pitter-patter, playful | Easy |
| Dreamtime Lullaby | Slow, soothing, bedtime | Easy |
| Ocean Waves | Flowing, wave-like | Easy |
| Forest Wander | Gentle walking, exploration | Medium |
| Starlight Dance | Twinkling, light | Medium |
| Mountain Echo | Ascending/descending, grand | Medium |
| Butterfly Flight | Fluttering, graceful | Medium |
| Moonbeam Waltz | Waltz-like, dreamy | Medium |
| Sunrise March | Bold, ascending, triumphant | Hard |
| River Journey | Flowing, continuous, adventurous | Hard |

### 3. Forces Songs (`forces`)

Six **slow and smooth** melodies (70 BPM) that represent physical forces. These are designed for science-themed storybooks teaching concepts like push, pull, lift, lower, break, and fix.

| Song | Musical Character |
|------|-------------------|
| Song of Push | Ascending pairs — building pressure, moving outward |
| Song of Pull | Descending pairs — drawing inward, gathering |
| Song of Lift | Rising thirds — upward motion, getting lighter |
| Song of Lower | Falling thirds — gentle descent, settling down |
| Song of Break | Wide intervals — sharp contrasts, disruption |
| Song of Fix | Stepwise resolution — rebuilding, coming together |

---

## Instrument Compatibility

Songs are automatically filtered by instrument. A song only appears if the instrument has all required notes:

| Instrument | Available Notes | Compatible Songs |
|-----------|----------------|-----------------|
| Flute | C, D, E, F, G, A | All songs |
| Recorder | C, D, E, F, G | All except those needing A |
| Ocarina | C, D, E, F, G | All except those needing A |
| Clarinet | C, D, E, F, G | All except those needing A |
| Saxophone | C, D, E, F, G | All except those needing A |
| Trumpet | C, D, E, F | Only songs using C–F |

---

## Importance for Future AI Models

This song library is critical infrastructure for AI-generated storybooks. When an AI model creates a new story, it needs to:

1. **Select appropriate songs** — The `category` field lets a model pick nursery rhymes for familiar comfort, storybook songs for mood-setting, or forces songs for science content.

2. **Match difficulty to the reader** — The `difficulty` field guides song selection based on the child's progress.

3. **Respect instrument constraints** — The `requiredNotes` field ensures the model only assigns songs playable on the story's chosen instrument.

4. **Create new songs** — By studying the patterns in existing sequences, a model can generate new original melodies that follow the same structure: short sequences of notes from the available set, with appropriate difficulty and BPM.

5. **Teach through music** — The forces songs demonstrate how music can represent abstract concepts. Future models can follow this pattern to create songs for other learning themes (colours, emotions, seasons, etc.).

### Guidelines for AI Song Creation

When generating new songs, models should:

- Use only notes from the `NoteName` type: `C`, `D`, `E`, `F`, `G`, `A`
- Keep easy songs to 10–14 notes with 3–4 unique notes
- Keep medium songs to 11–16 notes with 4–5 unique notes
- Keep hard songs to 15–32 notes with 5–6 unique notes
- Set BPM between 70 (slow/smooth) and 120 (upbeat)
- Always populate `requiredNotes` with the unique notes used
- Choose a `category` that matches the story context
- Add translations for the `nameKey` in all 14 supported locales

---

## Supported Locales

All song names are translated in: English (en), Arabic (ar), Danish (da), German (de), Spanish (es), French (fr), Italian (it), Japanese (ja), Latin (la), Dutch (nl), Polish (pl), Portuguese (pt), Turkish (tr), Chinese (zh).

Song name translations live in `locales/{lang}/index.ts` under `music.songs.*`.
