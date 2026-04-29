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

## Storybook Tags & Labels

Every storybook has two classification systems: a **category** (primary genre) and **filter tags** (multiple descriptors).

### Categories (`StoryCategory`)

The primary genre of a story. Each story has exactly one category.

| Category | Emoji | Description |
|----------|-------|-------------|
| `personalized` | 🎭 | AI-generated stories tailored to the child |
| `bedtime` | 🌙 | Calming stories for winding down |
| `adventure` | 🗺️ | Exciting journeys and quests |
| `nature` | 🐢 | Animals, plants, and the natural world |
| `friendship` | 🤝 | Social skills and relationships |
| `learning` | 📚 | Counting, alphabet, colours, shapes |
| `fantasy` | ✨ | Magical worlds and mythical creatures |
| `music` | 🎵 | Music-themed stories with instrument challenges |
| `activities` | 🎲 | Spontaneous physical activities |
| `growing` | 🌱 | Emotional growth and family |

Defined in: `types/story.ts` → `StoryCategory`
CMS field: `category` (string enum)

### Filter Tags (`StoryFilterTag`)

Multiple tags can be applied to any story for cross-genre filtering.

| Tag | Emoji | Colour | Use For |
|-----|-------|--------|---------|
| `personalized` | 🎭 | #FF69B4 | AI-personalised content |
| `calming` | 🧘 | #4ECDC4 | Relaxation, mindfulness |
| `bedtime` | 🌙 | #96CEB4 | Sleep-time stories |
| `adventure` | 🗺️ | #FF6B6B | Action and exploration |
| `learning` | 📚 | #FFEAA7 | Educational content |
| `music` | 🎵 | #FF9F43 | Music interaction pages |
| `family-exercises` | 👨‍👩‍👧 | #45B7D1 | Activities for parent+child |
| `imagination-games` | 🎭 | #DDA0DD | Creative play and pretend |
| `animals` | 🐾 | #8B4513 | Animal characters/themes |
| `friendship` | 🤝 | #FFB6C1 | Making and keeping friends |
| `nature` | 🌳 | #228B22 | Outdoor, environment |
| `fantasy` | ✨ | #9370DB | Magic and mythical |
| `counting` | 🔢 | #20B2AA | Numbers and counting |
| `emotions` | 💖 | #FF69B4 | Feelings and emotional literacy |
| `silly` | 🤪 | #FFD700 | Humour and silliness |
| `rhymes` | 📝 | #87CEEB | Rhyming and wordplay |

Defined in: `types/story.ts` → `StoryFilterTag`, `STORY_FILTER_TAGS`
CMS field: `tags` (string array)

### Music Challenge Page Fields

When a storybook page includes a music interaction, add these fields to the page object:

| Field | Type | Description |
|-------|------|-------------|
| `interactionType` | `'music_challenge'` | Activates the music UI |
| `musicChallenge.enabled` | `boolean` | Toggle challenge on/off |
| `musicChallenge.instrumentId` | `string` | Instrument to use (e.g. `'flute'`) |
| `musicChallenge.promptText` | `string` | Narrative prompt shown to child |
| `musicChallenge.mode` | `'guided'` \| `'free_play_optional'` | Challenge mode |
| `musicChallenge.requiredSequence` | `string[]` | Notes to play (e.g. `['C','D','E']`) |
| `musicChallenge.successSongId` | `string` | Song asset to play on success |
| `musicChallenge.successStateId` | `string?` | Optional page state change |
| `musicChallenge.autoPlaySuccessSong` | `boolean` | Auto-play success melody |
| `musicChallenge.allowSkip` | `boolean` | Let child skip the challenge |
| `musicChallenge.micRequired` | `boolean` | Require microphone |
| `musicChallenge.fallbackAllowed` | `boolean` | Show on-screen blow button |
| `musicChallenge.hintLevel` | `'none'` \| `'minimal'` \| `'standard'` \| `'verbose'` | Hint verbosity |

---

## Supported Locales

All song names and story content are translated across **14 locales**:

| Code | Language | Script Direction |
|------|----------|-----------------|
| `en` | English | LTR (fallback) |
| `ar` | Arabic | RTL |
| `da` | Danish | LTR |
| `de` | German | LTR |
| `es` | Spanish | LTR |
| `fr` | French | LTR |
| `it` | Italian | LTR |
| `ja` | Japanese | LTR |
| `la` | Latin | LTR |
| `nl` | Dutch | LTR |
| `pl` | Polish | LTR |
| `pt` | Portuguese | LTR |
| `tr` | Turkish | LTR |
| `zh` | Chinese | LTR |

### Where to Update Language

| Content | File(s) | Key Path |
|---------|---------|----------|
| Song names | `locales/{lang}/index.ts` | `music.songs.*` |
| Music UI strings | `locales/{lang}/index.ts` | `music.*` (e.g. `music.goHarder`, `music.backToLibrary`) |
| Story titles | `data/stories.ts` or CMS | `localizedTitle.*` on the Story object |
| Story descriptions | `data/stories.ts` or CMS | `localizedDescription.*` on the Story object |
| Page text | `data/bundled-stories.ts` or CMS | `localizedText.*` on the StoryPage object |
| Genre labels | `locales/{lang}/index.ts` | `stories.genres.*` |
| Filter tag labels | `locales/{lang}/index.ts` | `stories.filterTags.*` |

### CMS Language Updates

For stories managed via CMS (Firestore), localized fields use the `LocalizedText` interface:

```typescript
interface LocalizedText {
  en: string;   // Required — always the fallback
  pl?: string;  es?: string;  de?: string;  fr?: string;
  it?: string;  pt?: string;  ja?: string;  ar?: string;
  tr?: string;  nl?: string;  da?: string;  la?: string;
  zh?: string;
}
```

Set `localizedTitle`, `localizedDescription`, and per-page `localizedText` in the CMS document. The app calls `getLocalizedText()` (from `types/story.ts`) to resolve the correct language with automatic English fallback.
