# Early Roots app specification: learning games played through stories

**Status:** proposal for review · **Date:** 16 October 2026 · **Applies to:** `grow-with-freya/` (React Native 0.86.3, Expo SDK 57), `gateway-service/`, `scripts/`

Bare paths such as `types/story.ts` are relative to `grow-with-freya/`; other subprojects are named in full.

This is the single specification for the next stage of the app: a range of learning games that are played through our stories, make up the learning paths, run on iOS and Android phones and tablets, and keep the app small and fast. It consolidates the brief sent to ChatGPT, the review of its 56-game catalogue, and the design approach, and it adds the contracts, schemas, budgets and acceptance criteria needed to build.

Every statement about the app as it is today was checked against the code on 16 October 2026 and carries a file reference. Anything proposed is marked as such by its section. Numbers that are targets, not measurements, are in the budget tables.

---

## 1. Goals

| # | Goal | How we will know |
|---|---|---|
| G1 | A range of learning games, each reachable from a book page, from an island plan day, and from the Library | Three launch contexts work for every game, through one shell (section 6) |
| G2 | Games are made from our own books, characters and art, and feel part of the same world | Every first-wave game is a content pack over a book we own (section 13) |
| G3 | Adding a game costs art and data, not code | Four engines in the binary; a new game is a pack with no new JavaScript (section 5) |
| G4 | Small install on Android and iOS | Install under 160 MB on both platforms before any pack, under 150 MB if the Relax tracks move to downloads too; a pack under 3 MB (section 10) |
| G5 | Smooth on mid-range Android | First mount under 400 ms, no frame stall over 100 ms in play, scene memory under 80 MB, on a 2021 4 GB Android phone (section 11) |
| G6 | Works offline from first launch | The first week's games are bundled; later packs prefetch a day ahead (section 7) |
| G7 | Calm, co-engaged, privacy-first, as the product rules require | The acceptance list in section 15 |
| G8 | Fourteen languages, Reduce Motion, tablets in any orientation | Section 9 |
| G9 | Each family's learning path is built from what they said they want, without profiling the child | Onboarding asks; a deterministic builder composes the week; nothing is inferred (section 14) |

### Non-goals

- No game runtime or second renderer (Unity, Godot, Phaser in a WebView, Skia for games, Rive). Each adds 20 to 60 MB of native code and a second accessibility and animation world.
- No adaptive difficulty driven by a child's performance (Children's Code profiling; section 12).
- No questions about health, development concerns or diagnoses, and no free text about the child, anywhere in onboarding (section 14.3).
- No phonics, rhyme, blending or letter-formation games until a phonics scheme is chosen per language (section 17).
- No Year 2 content (place value, arrays, clocks, charts, maps). The product is 0 to 6.
- No separate "games home". Games open inside the island, a book, or the Library.

---

## 2. Product rules every game obeys

These are the firm rules from `CLAUDE.md` and the brief, restated as testable constraints:

1. **Co-engagement.** The first action of every game is modelled by the host character and then by the grown-up with the child. After that, 2 to 4 may play with the adult nearby, 4+ may play self-guided within the daily limit. The grown-up has a real role in every mission (a prompt, a question, a turn).
2. **Calm.** No flashing, no countdown pressure, no loss, no "again?" nag. A mission ends with a two-second celebration, the tick, and the real-world bridge card. Free play ends on a calm Finish that keeps the scene.
3. **No manipulative mechanics.** No loot, variable rewards, leaderboards, or streak penalties. The existing day streak stays as it is (it never costs anything) and games add nothing to it.
4. **Developmentally appropriate.** Age bands `'1-2' | '2-4' | '4+'` from the child's age in months (`components/learning/age-range-carousel.tsx:25-44`) choose gesture mode and mission size. The grown-up can change the band.
5. **Privacy-first.** A game reports only that it was finished, how long it took, and whether it was left early. No per-tap event stream, no scores, nothing leaves the device beyond what the plan already syncs. `sendDefaultPii: false` and no replay in production stay as they are (`services/sentry-service.ts:21-28`).
6. **Fun first.** A game that is a worksheet with animation is not shipped. The bar is the best paid apps for 2 to 6.
7. **Screen time.** Every game runs inside a Screensafe session and stops gently when the day's time is spent (section 6.4). Each mission is 3 to 8 minutes.
8. **Sound in every game.** A soft sound on every tap, a short phrase from our instruments on success. The silent words and feelings games are retrofitted (milestone M0).

---

## 3. The app today: the baseline we build on

| Fact | Where |
|---|---|
| A story page declares its interaction: `'none' \| 'interactive_state_change' \| 'music_challenge' \| 'jigsaw_puzzle' \| 'reading_challenge'`, with the data for it on the page | `types/story.ts:112-133` |
| Tap-to-reveal props on a page: `InteractiveElement` with normalised position, size and hit area | `types/story.ts:41-58` |
| The reader renders a challenge overlay over the page when the page's type and config say so | `components/stories/story-book-reader.tsx:1914-1953` |
| A music challenge reports completion through its hook's `onComplete` | `hooks/use-music-challenge.ts:134,604` |
| Stories carry `version` and `checksum` for delta sync; the gateway answers `POST /api/stories/delta` with changed stories, signed thumbnails and changed badge definitions | `types/story.ts:166-167`, `gateway-service/README.md:100-110` |
| Assets are fetched through signed URLs, 100 paths per call | `gateway-service/README.md:117` |
| Downloaded content lives under `documentDirectory/content_cache/` | `services/cache-manager.ts:15` |
| The learning plan is data: seven `LearningPlanStep`s with `kind`, place, aim, skills, minutes and either a `storyId` or activity ids by age | `types/learning-plan.ts`, `data/learning-plan.ts` |
| A step launches with `beginPlanStep(run)` and ticks off when the launched thing reports finishing: stories through the reader, activities through `recordActivityFinished(activityId)` | `store/app-store.ts:49-57,461-470` |
| `PlanLaunch` is a union of `story`, `spelling`, `feelings`, `music` | `types/learning-plan.ts` |
| The store has `currentChildId`, so per-child saves are possible | `store/app-store.ts:91` |
| Badges are definitions with rules (`counter`, `finishedCount`, `challenges`, `storyAward`, ...) evaluated over facts, and remote definitions merge with bundled ones | `components/progress/achievements.ts:19-60,128-175` |
| Challenge counts are kept by kind `'music' \| 'jigsaw' \| 'reading'` | `store/app-store.ts:27` |
| Screensafe sessions start per activity `'story' \| 'emotions' \| 'music'` | `services/screen-time-service.ts:98` |
| The real-world bridge overlay takes `activityId`, `gameSection` and `onDismiss` | `components/learning/real-world-bridge-overlay.tsx:60-65` |
| The island is one painting cut into layers, moved by shared clocks that run only once the page has settled and Reduce Motion is off | `components/island/island-scene.tsx:71-74` |
| Reduce Motion is read through one hook | `hooks/use-reduced-motion.ts` |
| Pages are registered in three places: the `PageKey` union, the island activity list, and the per-page animation map | `app/_layout.tsx:225`, `constants/page-slide.ts:3`, `components/ui/enhanced-page-transition.tsx:147` |
| EAS Update is on outside E2E builds, keyed by app version | `app.config.js:36-42` |
| Production Android builds are App Bundles; dev and preview builds are APKs | `eas.json:23,43,64,82` |
| Gesture Handler 2.32 is installed but used only for carousels and onboarding; there is no drag-and-drop anywhere | `package.json`; `components/music/instrument-carousel.tsx`, `components/learning/age-range-carousel.tsx`, `components/stories/instrument-picker-overlay.tsx`, `components/onboarding/onboarding-screen.tsx` |
| Audio: five audiobooks 55 MB, bundled because `data/music.ts` required them, yet listed by no screen; `relaxing.wav` 11 MB in the repo, referenced nowhere so never bundled; binaural beats 12 MB, played by the Relax screen inside Feelings; background music 6.6 MB. The audiobooks and the wav were removed in M0 | `assets/audio/` (measured 16 Oct 2026); `data/music.ts:30-37`; `components/music/sleep-selection-screen.tsx:52-57`; `components/emotions/emotions-screen.tsx:224` |
| Release app 227 MB, JavaScript bundle 14 MB (measured on the local Release E2E build earlier in this stage) | build output from a simulator build, so larger than a thinned store install; re-measure on a device build after the unreachable audio is removed |

What does **not** exist and must be built: a placement (drag or tap-place) primitive, a scene-state engine, a choice engine, a canvas, a narration path, per-child game saves, and a pack format.

---

## 4. Target architecture at a glance

```
                     ┌──────────────── content (CMS, signed URLs, cache) ────────────────┐
                     │  stories (as today)     game packs (new)     badge definitions     │
                     └───────────────┬──────────────────┬───────────────────────────────┘
                                     │                  │
   book page ──interactionType:'game'┤                  │
   island day ──PlanLaunch{kind:'game'}┼──► ExperienceShell ──► engine: Scene | Place | Choose | Make
   Library ───free play──────────────┘        │  intro · pause · finish · bridge · Screensafe · Reduce Motion
                                              ▼
                                    store: planRun → stepTickedOff · challengeCounts · gameSaves[childId]
```

- **Engines** (section 5) are the only game code in the binary.
- **Packs** (section 7) are data plus layered art plus short sounds, delivered like stories.
- **The shell** (section 6) owns everything a game needs once.
- **The store** (section 8) ticks the plan day off through the existing path.

---

## 5. Engines

Four engines cover the first three waves of the ChatGPT catalogue. Each is a React component tree plus a pure rules interpreter, with motion on the UI thread.

| Engine | Interaction | ChatGPT engines it replaces | Catalogue games it covers (first waves) |
|---|---|---|---|
| **Scene** | Layered painting; objects with named states; tap, hold, short drag; rules "when X then Y"; a host who reacts | E01, E13, parts of E09 | G56 cause-and-effect, G49 room, G54 rock pool, G50 vehicle, G55 kitchen, G53 nature, G01 clue search, G02 describing |
| **Place** | Pick up, move, drop into zones; tap-select then tap-place as the always-on alternative; counts per zone | E02, E03, E05 | G13 counting, G18 sharing, G15 patterns, G17 number bonds, G03 sequencing, G21 shapes |
| **Choose** | A short situation, two or three pictured choices, a reaction; several answers can be right | E08 | G45 emotions in context, G44 turn-taking, G46 routines |
| **Make** | A canvas or stage: stamp, draw, place, compose; save and replay per child | E10 | G40 art, G05 puppet theatre, G41 rhythm composer |

Deferred: E04 phonics (language decision), E06 construction and E07 routes (wave four), E11 measuring (Year 2), E12 offline companion (ships as better bridge cards, not an engine).

### 5.1 Shared engine contract

Every engine implements the same interface so the shell does not know which one it hosts:

```ts
interface EngineProps {
  pack: LoadedPack;
  mission: Mission | null;
  ageBand: PlanAgeRange;
  reduceMotion: boolean;
  paused: boolean;
  save: EngineSave | null;
  onEvent: (event: EngineEvent) => void;
}

type EngineEvent =
  | { type: 'ready' }
  | { type: 'first-action-shown' }
  | { type: 'progress'; done: number; of: number }
  | { type: 'complete' }
  | { type: 'save'; save: EngineSave };
```

Rules:

- The engine mounts its layers from `pack.art` sized to the screen (phone crop on phones, tablet crop on tablets, never both), using `expo-image` with explicit sizes (the absolute-fill trap: an unsized Image inside a Reanimated view draws at intrinsic size).
- State changes run through one pure function `apply(rules, state, input) → { state, effects }` so rules are unit-tested as tables without rendering.
- Effects are `set-state`, `play-sound`, `react-host`, `move-to`, `complete`. Nothing else. A pack that needs a new effect is a backlog item for the engine, not a pack change.
- Motion is Reanimated worklets driven by shared clocks; JavaScript sets React state only when a rule fires.
- `reduceMotion` is a real mode: nothing ripples or sways, but every outcome still happens (a floated leaf still ends up across the pool).
- `paused` freezes clocks and ignores input; it never unmounts.

### 5.2 Scene

- Objects: `{ id, layerByState: Record<string, LayerId>, initial: string, hit?: Frame }`.
- Inputs: `tap(objectId)`, `hold(objectId, ms)`, `nudge(objectId, direction)`.
- Host: one object with `reactions: Record<string, Reaction>`, where a reaction is a short clock-driven move (bob, turn, hum) and a sound.
- Missions on a scene are "find", "make happen", or "collect N" and end on a `complete` effect.

### 5.3 Place

- Items `{ id, layer, start: Frame, zones: ZoneId[] }` and zones `{ id, frame, accepts: ItemId[] | 'any', capacity }`.
- Gesture modes by age band: `'1-2'` tap only (tap an item, it goes to the one open zone); `'2-4'` tap-place, plus a short drag with a 24 pt snap radius; `'4+'` drag, hold and two-step actions. Tap-place is always available in every band.
- Drag uses `Gesture.Pan` from Gesture Handler on the UI thread; the drop target is decided in a worklet, the rule fires through `runOnJS` once.
- Rules: `drop-into`, `count-equals`, `all-placed`, `pattern-matches`.

### 5.4 Choose

- A situation `{ layer, promptKey }`, choices `{ id, layer, reactionId, kind: 'kind' | 'fine' | 'try-again' }`.
- Several choices may be `'kind'`. A `'try-again'` choice plays a gentle reaction and keeps the situation open; nothing is ever marked wrong.
- The grown-up's role is written into the prompt (a question to ask before choosing).

### 5.5 Make

- A stage with stamps, a brush with three widths, and placement; for rhythm, a four-beat grid over our instruments' note samples.
- Saves are a list of placed things, never a bitmap, so a save is a few kilobytes and replays on any screen size.
- Replay animates the save back in order; that is the "show the grown-up" moment.

---

## 6. ExperienceShell

One component hosts every game. It is mounted by three callers and reports back through one contract.

### 6.1 Entry points

| Caller | How it opens | How it returns |
|---|---|---|
| **Island day** | The checkpoint's `start` resolves a `PlanLaunch { kind: 'game'; packId; missionId }`; `beginPlanStep` records the run; the page dives through the cloud the way the home dives to the island, mounting the shell under the cloud | Back to the same checkpoint, which now shows the tick |
| **Book page** | A page with `interactionType: 'game'` and `game: { packId, missionId }`; the reader opens the shell over the page as it opens the music challenge; the page turns when the mission completes | To the exact page, on completion or skip (`allowSkip`, as the jigsaw has) |
| **Library** | A game tile on the Learning shelf opens the shell in free play (`mission: null`) | Finish returns to the Library; the scene is saved per child |

Launching from the Library or a book never advances the island week. Only a run begun with `beginPlanStep` ticks a day off.

### 6.2 Lifecycle

```
loading → intro → playing ⇄ paused → celebrating → bridge → done
   │        │        │                                   
   └────────┴────────┴──── exit (Back, Screensafe stop) ──► done(left)
```

- **loading**: the pack is read from cache (or bundled), layers decoded, sounds preloaded. Under the cloud or behind the island, never on a moving frame.
- **intro**: the host does the first action once, slowly, then waits. On the island this is also the grown-up's cue; the one-line aim is on the checkpoint card already.
- **playing**: the engine runs. Progress shows as the host's quiet count (no progress bar for `'1-2'`).
- **celebrating**: two seconds, a short instrument phrase, the tick. No stars, no "again?".
- **bridge**: the existing real-world bridge overlay, with the pack's bridge keys.
- **done**: the shell reports and unmounts.

### 6.3 Completion contract

```ts
type ShellResult =
  | { outcome: 'completed'; packId: string; missionId: string; durationMs: number }
  | { outcome: 'left'; packId: string; missionId: string | null; durationMs: number };
```

The shell calls `recordMissionFinished(packId, missionId)` on `completed`, which ticks the plan day off through `stepTickedOff` (section 8). Nothing else is recorded.

### 6.4 Screensafe

The shell starts a `'game'` session when it enters `playing` and ends it on `done`. When the daily limit is reached mid-game, the shell pauses, the owl says the day's time is spent (as it does for stories), and the shell exits with `left`. A paused mission is saved so it resumes next time.

### 6.5 Owl guide

The shell does not show a tour. The first game on the island gets one owl step on the checkpoint ("Start activity"), and the shell's intro replaces any in-game tutorial.

---

## 7. Game packs

### 7.1 What a pack is

A folder with a manifest, the art cut into layers for phone and tablet, and a few short sounds:

```
packs/juni-rock-pool/
  pack.json
  art/phone/   layers *.webp
  art/tablet/  layers *.webp
  sounds/      *.m4a (mono, ≤ 3 s each)
```

Strings are **never** in the pack. The manifest carries keys into the 14 locale files, exactly as the plan does (`placeKey`, `aimKey`).

### 7.2 Manifest

```ts
interface GamePack {
  id: string;
  version: number;
  checksum: string;
  engine: 'scene' | 'place' | 'choose' | 'make';
  world: 'island' | string;
  storyId?: string;
  minAppVersion: string;
  art: { phone: PackArt; tablet: PackArt };
  host: { objectId: string; reactions: Record<string, Reaction> };
  objects: GameObject[];
  zones?: Zone[];
  rules: Rule[];
  missions: Mission[];
  sounds: Record<string, { file: string }>;
  keys: string[];
}

interface PackArt { width: number; height: number; sky: string; layers: Layer[] }
interface Layer { id: string; file: string; frame: Frame; z: number; clock?: 'sway' | 'bob' | 'drift' | 'twinkle' }
interface Frame { x: number; y: number; w: number; h: number }

interface GameObject {
  id: string;
  layerByState: Record<string, string>;
  initial: string;
  hit?: Frame;
  placeable?: { zones: string[]; start: Frame };
}
interface Zone { id: string; frame: Frame; accepts: string[] | 'any'; capacity: number }

type Trigger =
  | { tap: string }
  | { hold: string; ms: number }
  | { dropInto: { zone: string; item?: string } }
  | { countEquals: { zone: string; value: number } }
  | { allPlaced: true }
  | { chose: string };

type Effect =
  | { set: string; state: string }
  | { play: string }
  | { react: string }
  | { moveTo: { object: string; frame: Frame; ms: number } }
  | { complete: true };

interface Rule { when: Trigger; then: Effect[]; once?: boolean }

interface Mission {
  id: string;
  titleKey: string;
  aimKey: string;
  promptKey: string;
  grownUpKey: string;
  byAge: Record<PlanAgeRange, { gesture: 'tap' | 'tap-place' | 'drag'; goal: Record<string, number> }>;
  rules: Rule[];
  bridgeActivityId: string;
  minutes: [number, number];
}
```

A mission's `rules` are appended to the pack's rules while the mission runs; free play uses the pack's rules only.

### 7.3 Validation

`scripts/validate-packs.ts` runs in CI and fails the build when:

- a layer file, sound or object referenced by a rule does not exist;
- a key in `keys` is missing from any of the 14 locales;
- the pack exceeds its byte budget (section 10);
- a mission's `byAge` is missing a band;
- the manifest does not match the schema.

This is the ChatGPT spec's DATA-08, made real.

### 7.4 Delivery

- **Bundled**: the island week's three packs ship in the binary under `assets/packs/`, so a new family's first seven days work offline.
- **Downloaded**: every other pack comes from the CMS. The delta call gains `packChecksums` in its body and `packs` plus `deletedPackIds` in its answer, beside the story fields it already has. Pack files are fetched through the existing signed-URL batch call and saved under `documentDirectory/content_cache/packs/<packId>/<version>/`.
- **Prefetch**: when today's island day is done, the next day's pack (if any) is fetched under the cloud dive back to home, the way the library is prewarmed. On Wi-Fi only unless the pack is under 1 MB.
- **Eviction**: packs for weeks older than the current one are deleted when a newer pack needs the room, oldest first; never the bundled ones, never a pack with an unfinished saved mission for any child on the device.
- **Gateway**: new `GET /api/packs/version`, `GET /api/packs/{packId}`, and the delta extension. Entitlements follow stories: a pack tied to a paid story is paid.

Engine fixes ship through EAS Update within a runtime version; packs never depend on an update.

---

## 8. Store and type changes

| Change | File | Detail |
|---|---|---|
| `PlanStepKind` gains `'game'`; `LearningPlanStep` gains `packId?`, `missionId?` | `types/learning-plan.ts` | A step is either a story, an activity by age, or a pack mission |
| `PlanLaunch` gains `{ kind: 'game'; packId: string; missionId: string }` | `types/learning-plan.ts` | |
| `PageInteractionType` gains `'game'`; `StoryPage` gains `game?: { packId: string; missionId: string; allowSkip: boolean }` | `types/story.ts` | Java model updated in step (`gateway-service`), as the rules require |
| `recordMissionFinished(packId, missionId)` | `store/app-store.ts` | Uses `stepTickedOff` with `launch.kind === 'game' && packId && missionId` match; also increments `challengeCounts.mission` |
| `ChallengeKind` gains `'mission'` | `store/app-store.ts:27` | Badges for missions arrive as remote definitions with a `challenges` rule; no new rule kind |
| `gameSaves: Record<childId, Record<packId, EngineSave>>` | `store/app-store.ts` | Persisted; cleared with the child profile; included in the E2E `progress=clear` seed |
| `childGoals: PlanGoal[]` (at most three) | `store/app-store.ts` | Local, per child, persisted, cleared with the profile; not synced in the first release (section 14.3); E2E seed `goals=a,b` |
| `useLearningPlan` reads `buildWeek(...)` instead of `ISLAND_WEEK` | `hooks/use-learning-plan.ts:6,38,61-106` | `ISLAND_WEEK` becomes the builder's output for no goals; `planId` carries the week index and a goals hash |
| Screensafe activity gains `'game'` | `services/screen-time-service.ts:98` | Same limits as stories |
| `PageKey` gains `'game'`; island activity list and animation map updated | `app/_layout.tsx:225`, `constants/page-slide.ts:3`, `components/ui/enhanced-page-transition.tsx:147` | The three registration points that a new page needs |
| `RealWorldBridgeOverlay.gameSection` gains `'game'` | `components/learning/real-world-bridge-overlay.tsx:63` | Bridges keyed by `bridgeActivityId` |
| E2E seed gains `pack=<id>` | `services/e2e-state.ts` | Loads a local pack path for Maestro and previews |

Everything stays strongly typed; no `any`. Java models and TypeScript interfaces change together.

---

## 9. Age bands, sound, accessibility, languages

### 9.1 Age bands

| Band | Gesture | Mission size | Grown-up's role |
|---|---|---|---|
| `'1-2'` | tap only | one or two things | leads every action; mostly off-screen prompts |
| `'2-4'` | tap-place, short drag | three to five things | models the first action, then nearby |
| `'4+'` | drag, hold, two-step | five to eight things, two-part missions | asks the mission's question, takes turns |

The band comes from age in months as today; the grown-up can change it on the step card. Missions declare all three bands.

### 9.2 Sound and narration

- **Decision proposed: no spoken words in the first wave.** The host's gestures carry the instruction, the grown-up reads the one line on the card, every tap has a sound, success has a phrase from our note samples. This keeps the first three games shippable in 14 languages without recording.
- The island's few spoken lines (the owl's) stay text.
- When voice is wanted later: recorded narration per language delivered as pack sounds, with the existing parent-recording mode as the override. No text-to-speech, because quality and voice consistency across 14 languages are not controllable.
- All game audio goes through `expo-audio` players created with the scene and released with it, the same path as the note samples.

### 9.3 Accessibility

- Tap-place is always available, so no game needs a drag.
- Every object has an accessibility label from its key; the shell announces the mission aim once.
- Hit areas are at least 44 pt on phones, 56 pt on tablets.
- Reduce Motion stops clocks and ripples but never removes an outcome (section 5.1).
- Tablets run in any orientation; a pack's tablet art is a 4:3 painting that `roadmapLayout`-style fitting keeps whole in both orientations (reuse the fit-to-safe-area rule from `constants/roadmap.ts`). Phones stay portrait, as every page does outside the reader.

### 9.4 Languages

- Strings for every pack live in `locales/<lang>/index.ts` under `packs.<packId>.*`, with English fallback as now.
- Validation fails the build on a missing key in any locale (section 7.3).
- Arabic text is right-to-left inside left-to-right layout, as today.

---

## 10. Size budget

| Item | Today | Target | How |
|---|---|---|---|
| Release install (iOS, measured locally) | 227 MB; 172 MB after the M0 removal (simulator build, 16 Oct 2026) | under 160 MB; under 150 MB with the Relax tracks moved too | Remove the audio no screen can reach (55 MB from the binary, 66 MB from the repo), then re-measure on a device build |
| Audiobooks | 55 MB in binary | 0 | Listed by no screen today, so removed from the binary. If they are wanted as content later they come back through the CMS and the signed-URL download, cached on first play |
| `relaxing.wav` | 11 MB in the repo, never bundled | 0 | Referenced nowhere, so Metro never bundled it; removed from the repo |
| Binaural beats (Relax screen) | 12 MB in binary | 12 MB, or 0 | Stay while the Relax screen is kept as it is; move to downloads if the extra 10 MB matters |
| Background music | 6.6 MB | 6.6 MB | Stays; it plays on first launch |
| Note samples | about 9 MB | about 9 MB | Stays; music must be local for zero latency |
| Bundled packs (three) | 0 | under 9 MB | 3 MB each |
| Downloaded pack | n/a | under 3 MB | One painting per crop as WebP at 1448 × 1086 (about 300 KB), layers one to two times that, mono sounds |
| JavaScript bundle | 14 MB | under 16 MB after four engines | Engines are small; the rules interpreter is pure TypeScript |
| Android | App Bundle in production | unchanged | One ABI per device, Hermes on |

Rules:

- A pack over budget fails validation; the artist gets the number, not an engineer.
- Images are WebP only. No PNG layers, no Lottie in games.
- Fonts: no new fonts.

---

## 11. Performance budget and rules

Targets, measured on an iPhone 17e and a 2021 4 GB Android phone (to be bought before milestone M2):

| Measure | Target | Method |
|---|---|---|
| Shell first mount (pack in cache) | under 400 ms | `recordVideo`, frame-gap analysis (the island's method) |
| Longest frame stall during play | under 100 ms | same |
| Scene memory | under 80 MB above baseline | Xcode Instruments, Android Studio profiler |
| Pack load from cache | under 250 ms | timestamp in `loading` → `ready` |
| Pack download (3 MB, Wi-Fi) | under 10 s | log |

Rules, all learned on the island:

1. Motion lives on the UI thread. Nothing animates in React state.
2. No work on moving frames: mount and lay out under the cloud or at rest; use the settled-after-transition hook (`components/island/island-scene.tsx:72`).
3. No SVG filters, no blur in play. Fake glows with stacked faint layers.
4. One scene mounted at a time. The island unmounts when the shell opens and remounts under the fade back.
5. Images sized explicitly; phone crop or tablet crop, never both.
6. Sounds preloaded with the scene, released with it.
7. Transform origins are whole percentages; no plain function calls inside worklets (both crash on device, not in the simulator).
8. A long JavaScript block within two seconds of an animation settling snaps the next commit; keep post-settle work under 16 ms or defer it.

---

## 12. Privacy and the Children's Code

- A game records: finished or left, duration, which mission. That is what the plan already stores for a day.
- No per-action events, no accuracy, no time-per-item, no "struggled with". Difficulty comes from the age band and the content, chosen by the grown-up, never from tracking. This keeps us outside profiling under the Children's Code without a new DPIA section; the DPIA gets one paragraph stating this.
- Saves (`gameSaves`) stay on the device and are not synced. If child sync ever includes them, that is a DPIA change first.
- The family's chosen goals (section 14) are the grown-up's stated preferences, held as at most three keys from a fixed list, local in the first release. They are never combined with usage or results. DPIA §7 keeps "profiling (none)" with one sentence saying so.
- Pack downloads use the same signed-URL path and the same entitlement check as stories; no new hosts, no new SDKs.
- `compliance/ASSET-REGISTER.md` gets a section per pack (sources, what ships, licence) as the island and road map have (`§5`, `§5e`). A pack without a register entry does not ship.

---

## 13. The first three games

All three are on the island, bundled, and made from books we own. They prove the three engines that the first wave needs (Place, Scene, Choose) and the shell.

### 13.1 Wombat's Picnic Count (Place; catalogue G13)

- **Book:** *Snuggle Little Wombat*. **Place on the island:** Wombat's Burrow (replaces Maths Meadow on day 3).
- **Scene:** the burrow at dusk; a leaf plate; berries, nuts and a few petals around it; the wombat as host.
- **Mission (2–4):** the wombat wants "three berries for my friends". The child tap-places or drags berries onto the leaf. The wombat counts each one with a bob and a note; at three, he shows three fingers and the leaf glows. **1–2:** one berry, then two. **4+:** "three berries and two nuts", then "one more than yesterday".
- **Grown-up's role:** count aloud together; the card asks "Can you find three things on our table?".
- **Rules:** `dropInto leaf` → `react wombat 'count'`, `play 'pop'`; `countEquals leaf 3` → `react wombat 'show-three'`, `complete`.
- **Bridge:** the existing numbers bridge for counting (home: lay the table; outdoors: three stones; creative: a berry picture).
- **Assets:** one painting per crop, about 14 layers, 6 sounds. Budget 2.5 MB.

### 13.2 Juni's Rock Pool (Scene; catalogue G56 + G54)

- **Book:** *Hold On, Juni*. **Place:** Rock Pool (new day 2 or 3 in the revised week, section 14).
- **Scene:** the pool from the book, cut from the book's own art; shells, a crab, a floating leaf, seaweed, Papa.
- **Free play:** tap a shell and it rolls; nudge the water and the leaf drifts across; tap Papa and he hums; hold the crab and it waves. Clocks: water `drift`, seaweed `sway`.
- **Mission (2–4):** "find Juni three floating things": tapping each floating thing lifts it to Juni; three completes. **1–2:** one thing. **4+:** sort floating from sinking into two zones (this reuses Place inside a Scene pack).
- **Grown-up's role:** "What do you think floats?" before each tap.
- **Bridge:** a new one, keyed `rock-pool`: bath-time floating test at home, a puddle outdoors, a boat from a leaf.
- **Assets:** reuse Juni's layers from the book art; about 18 layers; 8 sounds. Budget 3 MB.

### 13.3 Ding's Bus Stop (Choose + Place; catalogue G50 + G18 + G44)

- **Book:** *My Turn to Ding*. **Place:** Bus Stop (day 7).
- **Scene:** the bus at the stop, passengers waiting, the door; the bus is the host and dings.
- **Mission (2–4):** passengers wait in a line; the child opens the door and seats them one at a time, in order; when everyone has a seat the bus dings and goes. Jumping the line is a `try-again` choice: the bus waits and the passenger steps back, kindly. **1–2:** open the door, one passenger. **4+:** share four seats fairly between two families, then whose turn to ding.
- **Grown-up's role:** take turns pressing the bell; the card asks "Whose turn is it?".
- **Bridge:** the existing patience bridge from the book's plan day.
- **Assets:** about 16 layers, 7 sounds. Budget 3 MB.

### 13.4 Acceptance for each first game

- Plays end to end in all three bands with tap-place only.
- Completes the island day and shows the tick; never advances the week from the Library.
- Passes the performance budget on both reference devices.
- Pack validates; all 14 locales have its keys; asset register entry written.
- Watched with at least three families (one per band) before the next game starts (the ChatGPT spec's M1.05).

---

## 14. Personalised learning paths

Games are applied through the learning path. A family tells us what they want at onboarding; a deterministic builder composes each week from a catalogue of units (stories, activities, pack missions); the island shows that week; and every game is also reachable from its book and from the Library (section 6.1). Nothing about the child's behaviour or results is used to choose content.

### 14.1 What the family tells us

- One more onboarding step after `profile` (the order is `together → safe → ready → consent → profile` today, `components/onboarding/onboarding-flow.tsx:21-23`): **"What would you like to do together?"** The grown-up picks up to three goals from a fixed set of pictured chips, in the style of the four world chips that already exist (`components/onboarding/onboarding-pages.tsx:79-82`). Skippable; with no goals the week is the broad default.
- No free text. No questions about development concerns. Nothing is collected before consent, as now.

| Goal key | Shown as | Domain | Skills (`PlanSkill`) |
|---|---|---|---|
| `cosyStories` | Enjoy stories together | language | listening, vocabulary |
| `firstWords` | Letters and first words | language | letters, vocabulary |
| `countAndSort` | Counting and sorting | maths | counting, numbers |
| `bigFeelings` | Talking about feelings | feelings | feelings, confidence |
| `makeMusic` | Making music | music | rhythm, listening |
| `calmBedtimes` | Calm bedtimes | feelings | listening, patience |
| `waitingAndTurns` | Waiting and taking turns | feelings | patience, confidence |

- Stored as `childGoals` per child (section 8). Editable any time from a "Change our goals" row on the island's plan panel and from the profile, so the grown-up stays in charge and nothing is locked in.

### 14.2 The plan builder

`buildWeek(input): LearningPlan` in `services/plan-builder.ts` is a pure function of:

- the goals, the age band, the week index;
- the unit catalogue (`data/plan-units.ts`): every thing a day can be, with `domain`, `skills`, `bands`, `kind` (`story` or `game` or an activity as today), `storyId`, and for games the host's `storyId`. Packs register their missions as units when loaded;
- which units this device holds (bundled or cached) and which were finished, from local state only.

Rules, each a unit-tested table:

1. Each chosen goal gets two days; the rest come from other domains, so a week still touches at least four domains (the catalogue's PATH-05).
2. Character before game: a game hosted by a book's character is scheduled after that book in the same week, pulling the book in the day before if needed.
3. Day 1 is always a story. Day 7 is the strongest game of the first goal, so the road map moment lands on something the family asked for.
4. Nothing repeats within a week. Across weeks, the least recently finished unit for a skill wins.
5. Days 1 and 2 use only units the device already holds; later days may be packs, which prefetch (section 7.4).
6. A unit without the child's band is not eligible.
7. Same inputs give the same week on any device (ordered catalogue, seeded by the week index), so the plan itself never needs to sync. `planId` is `week-<index>-<goals hash>`; `learningPlanProgress` is already keyed by `planId`.

When goals change mid-week, finished days stay and the undone days are rebuilt from tomorrow. Week two is built when day 7 is done, after the road map closes, and its packs prefetch.

The island keeps its seven checkpoint positions; each checkpoint's place, kind, title and aim come from the unit. Today's `ISLAND_WEEK` becomes the builder's output for no goals at `'2-4'`, so nothing visible changes for a family that skips the step.

### 14.3 The legal and store boundary

- **What this is:** content chosen from the grown-up's stated preferences and the age band, both entered by the grown-up. **What it is not:** profiling. No usage, performance or behavioural data is read, inferred or stored to choose content. DPIA §7 keeps "profiling (none)" (`compliance/DPIA.md:109-112`) with one added sentence; PHASE-8 rule L5 ("no reuse of synced data for analytics or recommendations", `PHASE-8-BACKEND-ALIGNMENT.md:412`) is untouched because nothing synced is reused.
- **Local first.** Goals stay on the device in the first release: no gateway change, no privacy-policy change, no new App Store or Play data-safety declaration. When goals should follow a family to a new phone, add `goals` (at most three keys matching a fixed pattern) to `ChildDocument` in both models (`services/child-document.ts:25-40`, `gateway-service/src/main/java/com/app/dto/ChildDocument.java:23-40`) and one phrase to the privacy policy's child-profile row (`compliance/PRIVACY-POLICY-CHANGES.md:19`). That is the same class of field as favourites, not a new purpose. Confirm the App Store Connect privacy declaration covers it before the sync ships.
- **Never ask** about health, development concerns, diagnoses or special needs, and never take free text about the child here. Those are special-category data: separate consent, a DPIA change, and a harder store review. If ever wanted, it is a separate project.
- **Wording.** "What would you like to do together?" in the app and in the store listing. Never "assess", "test", "track your child's development" or "adapts to your child's ability". Apple's Kids Category rules and Google's Families policy allow parent-chosen preferences and forbid behavioural targeting; this design uses only the former.
- **Parental gate.** Changing goals later sits behind the existing parents-only gate, like the rest of the grown-ups area.

### 14.4 Example weeks

Weeks are data (`LearningPlan`). The default 2–4 week with no goals chosen, once the Choose and Make engines exist, with games between the books that introduce their characters:

| Day | Place | Kind | Opens | Why here |
|---|---|---|---|---|
| 1 | Story Time | story | *Snuggle Little Wombat* | Meet the wombat |
| 2 | Wombat's Burrow | game | Wombat's Picnic Count | Count with yesterday's character |
| 3 | Rock Pool | game | Juni's Rock Pool, "three floating things" | Discovery day |
| 4 | Feelings Cove | game | Emotions in Context (Choose; upgrades today's cards) | Social day |
| 5 | Music Grove | game | Rhythm composer in tap mode (Make) | Make something, no microphone |
| 6 | Story Corner | story | *My Turn to Ding* | Meet the bus |
| 7 | Bus Stop | game | Ding's Bus Stop | Play with the bus you just read |

For goals `countAndSort` and `waitingAndTurns` at `'2-4'`, the builder gives: 1 *Snuggle Little Wombat* · 2 Wombat's Picnic Count · 3 Juni's Rock Pool (sorting mission) · 4 Emotions in Context · 5 Rhythm composer · 6 *My Turn to Ding* · 7 Ding's Bus Stop. Four domains, both goals twice, every host after its book.

- Days 4 and 5 arrive with the Choose and Make engines (milestones M4, M5). Until then they stay as today.
- The 1–2 week is mostly off-screen prompts with very short adult-led screen moments; the 4+ week replaces phonics with a words-only day until the phonics decision.
- Future worlds (the road map's Japan and New Zealand, France and Italy, Lapland) are a `LearningPlan` plus packs. No code per world.
- Every finished day stays replayable; the road map still opens only from the done day 7.

---

## 15. Acceptance and testing

Every change follows `TESTING-STANDARD.md`: failing test first, the edge-case checklist, tables for varying inputs, a mutation sweep on a scratchpad copy, and report of what the sweep caught and missed.

### 15.1 Unit (Jest)

- Rules interpreter: tables of `(rules, state, input) → (state, effects)` for every trigger and effect, including `once`, a rule that never fires, two rules on one trigger, and a mission rule overriding a pack rule.
- Place: snap radius boundaries (23, 24, 25 pt), capacity full, tap-place in every band, drag disabled in `'1-2'`.
- Choose: a `try-again` choice keeps the situation open; two `kind` choices both complete.
- Shell: lifecycle table (every state × every event), Screensafe stop mid-play saves and exits with `left`, `completed` from the island ticks the day, `completed` from the Library does not, Back during `celebrating` still ticks.
- Store: `recordMissionFinished` with a matching, a mismatched and a null `planRun`; `gameSaves` per child and cleared with the profile.
- Packs: `validate-packs` fails on each error class in 7.3; bundled packs pass.
- Plan builder: tables of (goals × band × week index) → week; no goals reproduces today's island week; two goals give each two days and four domains; a host game never precedes its book; no repeats; a unit missing the band is skipped; the same inputs give the same week twice; changing goals keeps finished days and rebuilds the rest.
- Layout: tablet art stays whole in both orientations at iPad 11 and iPad 13 sizes; phone art at iPhone SE and 16 Pro.

### 15.2 Journeys (Maestro, `.maestro/flows/core/`)

- `island-game-day.yaml`: seed day 3 open → Start activity → dive → intro → tap-place three berries → celebration → bridge → back on checkpoint with the tick.
- `story-page-game.yaml`: open *Hold On, Juni* from a page with `interactionType: 'game'` → shell over the page → complete → next page.
- `library-free-play.yaml`: Learning shelf → Rock Pool → tap a shell → Finish → reopen → the shell is still rolled.
- `game-screensafe-stop.yaml`: seed `screenTime=spent` → the shell pauses and the owl speaks.
- `onboarding-goals.yaml`: fresh onboarding → pick two goals → the island's seven checkpoints show the matching places; skip the step → today's week.
- Each runs on iPhone and iPad in both orientations through the existing `run.sh` (Reduce Motion is on only while the suite runs).

### 15.3 Device measurement (manual, before each milestone exit)

- Mount, stall and memory numbers on both reference devices, recorded in the milestone's PR.
- Reduce Motion on and off.
- Offline: airplane mode from first launch through day 1 and day 2.

### 15.4 Definition of done for a pack

Validates; all keys in 14 locales; asset register entry; plays in three bands with tap-place; budget numbers recorded; watched with families.

---

## 16. Milestones

| Milestone | Delivers | Exit criteria |
|---|---|---|
| **M0 Foundations** | The unreachable audio (audiobooks, `relaxing.wav`) removed, with a test that fails on bundled audio no list shows or on a file nothing plays; sound on tap and success in the words and feelings games; the two reference devices on the desk; `validate-packs` with an empty pack set | Install under 160 MB measured on both platforms from device builds; words and feelings games play sound; CI runs the validator |
| **M1 Personalised week** | The goals step, `childGoals`, `data/plan-units.ts` over today's units (three stories, the spelling, numbers, feelings and music activities), `buildWeek`, the plan panel's change-goals row, E2E seed | Different goals give a different week; the same goals give the same week on two simulators; no goals leaves today's island week unchanged; DPIA §7 sentence added; `onboarding-goals` green |
| **M2 Shell + Place** | ExperienceShell, Place engine, store and type changes, `'game'` page registration, bundled pack loading, Wombat's Picnic Count on day 3 | 13.4 for the wombat game; journeys `island-game-day` and `game-screensafe-stop` green; budgets met; the wombat game appears in built weeks as a unit |
| **M3 Scene + delivery** | Scene engine, pack download, prefetch, eviction, gateway endpoints, Juni's Rock Pool as the first downloaded pack; book-page launch | 13.4 for Juni; `story-page-game` and `library-free-play` green; a pack arrives, prefetches a day ahead, and evicts |
| **M4 Choose** | Choose engine, Emotions in Context on day 4, Ding's Bus Stop on day 7, the revised 2–4 week as data | 13.4 for Ding; day 4 no longer falls back to a book |
| **M5 Make** | Make engine, rhythm composer in tap mode on day 5, saves and replay | A composition saves per child and replays; music day works without a microphone |
| **M6 Packs only** | 1–2 and 4+ weeks, the first world pack, more bridges | No engine change needed for any of them (the DEDUPE-10 test) |

Each milestone ships behind the plan data: a day is switched to a game by changing `data/learning-plan.ts`, so a milestone can land on mvp before its day is switched on.

---

## 17. Open decisions

| Decision | Recommendation | Needed before |
|---|---|---|
| Goals sync | Local only in the first release; sync later as a child-document field with one privacy-policy phrase | M1 |
| Changing goals mid-week | Finished days stay; undone days are rebuilt from tomorrow | M1 |
| Narration | No spoken words in the first wave; recorded voice later as pack sounds; never text-to-speech | M2 |
| Independent play for 2–4 | Allowed after the modelled first action, adult nearby | M2 |
| Which game first | Wombat's Picnic Count (smallest, fixes the worst gap, proves Place) | M2 |
| Phonics scheme per language | Defer all `LANG` games until chosen; keep the current spelling tiles as they are | M6 |
| Paid packs | Follow the story they belong to; no separate pack entitlement | M3 |
| Pack format freeze | After two packs are built by hand, not before | end of M3 |
| Android reference device | A 2021 4 GB phone, bought before M2 | M0 |
| Audiobooks | Out of the binary now; decide later whether they return as CMS content or are dropped | M0 |
| Relax screen tracks | Keep the 12 MB bundled unless the device-build measurement needs them gone | M0 |

---

## Appendix A. Files this specification touches

New: `components/onboarding/goals-page.tsx`, `services/plan-builder.ts`, `data/plan-units.ts`, `components/experience/experience-shell.tsx`, `components/experience/engines/{scene,place,choose,make}/`, `components/experience/rules.ts`, `types/game-pack.ts`, `services/pack-service.ts`, `assets/packs/`, `scripts/validate-packs.ts`, `scripts/prepare-pack-art.py` (generalised from `scripts/prepare-island-art.py`), `.maestro/flows/core/{island-game-day,story-page-game,library-free-play,game-screensafe-stop}.yaml`, `gateway-service` pack endpoints and delta extension.

Changed: `components/onboarding/onboarding-flow.tsx`, `components/island/plan-panel.tsx`, `hooks/use-learning-plan.ts`, `types/learning-plan.ts`, `types/story.ts`, `store/app-store.ts`, `services/screen-time-service.ts`, `services/e2e-state.ts`, `app/_layout.tsx`, `constants/page-slide.ts`, `components/ui/enhanced-page-transition.tsx`, `components/stories/story-book-reader.tsx`, `components/island/island-scene.tsx`, `components/learning/real-world-bridge-overlay.tsx`, `data/learning-plan.ts`, `locales/*/index.ts`, `compliance/ASSET-REGISTER.md`, `compliance/DPIA.md`, `grow-with-freya/ARCHITECTURE.md`, `QA-AUTOMATION.md`, `gateway-service/README.md`.

## Appendix B. Catalogue ids referenced

From the ChatGPT specification: engines E01 to E13; games G01, G02, G03, G05, G13, G15, G17, G18, G21, G40, G41, G44, G45, G46, G49, G50, G53, G54, G55, G56. Its acceptance list QA-01 to QA-18 is adopted whole and folded into section 15.
