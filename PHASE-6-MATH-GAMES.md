# Phase 6 — Math Games for Early Learners

> **For LLMs / AI agents**: This document defines the math games roadmap for the Learning section.
> Read this file before making changes to numbers activities, game engines, or math-related components.
> If you change the approach, **update this file**.

---

## 1. Overview

Phase 6 replaces the current spelling-based numbers activities with **purpose-built visual math games**
for children aged 0–6. The existing numbers activities use the `SpellingGameScreen` engine (spelling
number words like "twelve"), which is pedagogically inappropriate for early maths learning.

### What Changes

| Before (Phase 5) | After (Phase 6) |
|---|---|
| 15 numbers activities using `gameType: 'spelling'` | 15 numbers activities using new `gameType: 'math'` variants |
| Children spell words like "seven", "equals", "dozen" | Children count objects, add visually, recognise numerals |
| `SpellingWordBank` with number-themed words | `MathGameConfig` with age-appropriate numerical challenges |
| Single game engine for all number activities | 5 distinct math game engines, each with procedural generation |

### Design Principles

- **No fail state for ages 0–2** — every interaction produces a rewarding response
- **Concrete before abstract** — objects first, numerals second, equations last
- **Co-engagement** — parent narrates, child interacts, both celebrate
- **Procedural generation** — random numbers, objects, and arrangements each session for infinite replay
- **Adaptive difficulty** — success raises difficulty, mistakes lower it, always in the flow zone
- **Calm UX** — gentle animations, soft sounds, no timers (except optional stretch mode for 5–6)

---

## 2. Game Types by Age

### 2.1 Ages 0–2: Sensory Number Play

**Goal:** Exposure to counting rhythm, quantity awareness, cause & effect.
**Number range:** 1–3 (stretch to 5)
**Key principle:** No wrong answers. Every interaction is rewarding.

#### Game: Tap & Count

Objects (stars, fireflies, butterflies, bubbles) appear on screen. Each tap makes one glow,
plays a gentle sound, and a voice counts aloud: "one… two… three…"

| Aspect | Detail |
|---|---|
| **Mechanic** | Tap anywhere → object appears/glows + audio count |
| **Visuals** | Soft glowing objects on night sky / meadow / pond backgrounds |
| **Audio** | Gentle chime per tap + spoken number in selected language |
| **Replay value** | Random objects, sounds, colours each session. Toddlers love repetition |
| **Parent role** | "Look, one butterfly! Now two butterflies!" |
| **Success** | All objects tapped → gentle celebration (stars shimmer, soft melody) |
| **Difficulty** | Fixed: 1–3 objects for youngest, 1–5 as child shows mastery |

#### Game: More Appears

Tap the screen → one animal pops up with a bounce animation. Tap again → second appears.
Voice counts along. Up to 3–5 total. No target number — pure exploration.

| Aspect | Detail |
|---|---|
| **Mechanic** | Tap → new animal appears with bounce + sound |
| **Visuals** | Meadow/forest scene filling with friendly animals |
| **Replay value** | Random animal sets (woodland, ocean, farm, safari themes) |
| **Parent role** | Counting along, naming animals |
| **Difficulty** | None — exploratory play |

**Activities mapping (5 slots):**

| Activity ID | Game Variant | Theme |
|---|---|---|
| `counting-fun` | Tap & Count | Starry night sky |
| `number-friends` | More Appears | Woodland animals |
| `colour-counting` | Tap & Count | Rainbow bubbles |
| `shape-counting` | Tap & Count | Floating shapes |
| `one-two-three` | More Appears | Farm animals |

---

### 2.2 Ages 2–4: Counting & Number Sense

**Goal:** 1:1 correspondence, counting to 10, numeral recognition, "more vs less", subitizing.
**Number range:** 1–5 (age 2–3), 1–10 (age 3–4)
**Key principle:** One-to-one correspondence — every tap = one count.

#### Game: Feed the Animal

A friendly animal (bear, owl, bunny, hedgehog) says "I want 3 berries!" Child drags berries
one-by-one into the bowl. Voice counts each one. Correct count → animal does a happy animation.

| Aspect | Detail |
|---|---|
| **Mechanic** | Drag objects into container, voice counts each drop |
| **Visuals** | Cosy kitchen/picnic scene with animal character |
| **Audio** | Counting voice + satisfying "plop" per item + happy animal sound |
| **Replay value** | Different animals, foods, target numbers each round |
| **Difficulty** | Adaptive: 1–3 → 1–5 → 1–7 → 1–10 based on streak |
| **Maths skill** | 1:1 correspondence, cardinality (the last number = the total) |

#### Game: Quick Peek (Subitizing)

A pattern of dots/stars flashes briefly (2 seconds for beginners, 1 second for advanced).
Child picks "how many?" from 3 number choices. Uses familiar dice/domino patterns.

| Aspect | Detail |
|---|---|
| **Mechanic** | Flash pattern → pick from 3 answer buttons |
| **Visuals** | Glowing dots on dark sky / coloured gems on velvet |
| **Audio** | Soft reveal sound + "That's right, four!" confirmation |
| **Replay value** | Infinite random patterns. Streak counter without punishing misses |
| **Difficulty** | Adaptive: 1–3 → 1–5 → 1–8 → 1–10. Flash duration decreases |
| **Maths skill** | Subitizing — recognising quantity without counting |

#### Game: Who Has More?

Two friendly characters each hold a group of objects. "Who has more apples?" Child taps the
character with more. Later levels: "How many more does Owl have?"

| Aspect | Detail |
|---|---|
| **Mechanic** | Compare two groups → tap the larger (or smaller) |
| **Visuals** | Split screen with two characters holding object groups |
| **Replay value** | Different characters, objects, quantities each round |
| **Difficulty** | Adaptive: obvious differences (1 vs 5) → subtle (4 vs 5) → numerals only |
| **Maths skill** | Comparison, more/less, early estimation |

#### Game: Starry Sky Counting

Night sky with scattered stars. "Can you count the stars?" Child taps each star — it lights up
and voice counts. Then child picks the matching numeral from 3 choices.

| Aspect | Detail |
|---|---|
| **Mechanic** | Tap each object to count → select matching numeral |
| **Visuals** | Night sky with constellations forming on completion |
| **Replay value** | Random star arrangements. Constellation reward changes each time |
| **Difficulty** | Adaptive: 1–3 → 1–5 → 1–10 objects |
| **Maths skill** | Counting + numeral recognition |

**Activities mapping (5 slots):**

| Activity ID | Game Variant | Theme |
|---|---|---|
| `wombat-word-placing` | Feed the Animal | Wombat's picnic |
| `animal-counting` | Starry Sky Counting | Forest creatures |
| `fruit-counting` | Feed the Animal | Fruit harvest |
| `toy-counting` | Quick Peek | Toy patterns |
| `garden-counting` | Who Has More? | Garden flowers |

---

### 2.3 Ages 4–6: Operations & Number Fluency

**Goal:** Addition/subtraction within 10, number line, patterns, missing numbers, early equations.
**Number range:** 1–10 (core), stretch to 20.
**Key principle:** Story-framed maths — addition as "putting together", subtraction as "going away".

#### Game: Moonlight Garden (Visual Addition)

"Plant 3 seeds + 2 more seeds. How many flowers grow?" Seeds go into soil → flowers bloom →
child counts total or picks from 3 answer choices.

| Aspect | Detail |
|---|---|
| **Mechanic** | Watch two groups combine → count or pick the total |
| **Visuals** | Garden scene with growing flowers / bakery with cupcakes |
| **Audio** | Growing sound effect + "3 plus 2 makes 5!" |
| **Replay value** | Random numbers, different objects/themes (flowers, cupcakes, stars) |
| **Difficulty** | Adaptive: within 5 → within 10 → within 15 → within 20 |
| **Maths skill** | Addition as combining, counting on |

#### Game: Firefly Farewell (Visual Subtraction)

8 fireflies glowing in the meadow. "3 fly home to sleep." They drift away with a gentle
animation. "How many are still here?" Child counts remaining or picks answer.

| Aspect | Detail |
|---|---|
| **Mechanic** | Watch objects leave → count or pick how many remain |
| **Visuals** | Night meadow with fireflies / pond with fish / sky with birds |
| **Audio** | Gentle departure sound + "8 take away 3 leaves 5!" |
| **Replay value** | Random numbers, themed objects, story wrapper varies |
| **Difficulty** | Adaptive: within 5 → within 10 → within 15 |
| **Maths skill** | Subtraction as "taking away", counting back |

#### Game: Frog Hop (Number Line)

A frog on lily pad 0. "Hop to 7!" Child taps to hop forward, each pad lights up and voice
counts. Later: "You're on 3, hop 4 more — where do you land?"

| Aspect | Detail |
|---|---|
| **Mechanic** | Tap to hop along number line → land on target |
| **Visuals** | Pond with lily pads numbered 0–10 (or 0–20) |
| **Replay value** | Different target numbers, themes (space, underwater, forest) |
| **Difficulty** | Counting → addition as hopping forward → subtraction as hopping back |
| **Maths skill** | Number line, addition/subtraction as movement |

#### Game: Pattern Path

A path of coloured stones or shapes: 🔵🔴🔵🔴🔵❓ — "What comes next?" Child picks from
options. Progresses from colour patterns → shape patterns → number patterns (2, 4, 6, ❓).

| Aspect | Detail |
|---|---|
| **Mechanic** | Identify the pattern → select what comes next |
| **Visuals** | Forest path with stepping stones / garden with flowers |
| **Replay value** | Infinite pattern combinations. Visual path grows with each correct answer |
| **Difficulty** | Colours → shapes → numbers → two-attribute patterns |
| **Maths skill** | Pattern recognition, skip counting, algebraic thinking |

#### Game: Star Equations (Stretch — ages 5–6 only)

___ + 3 = 7. Stars fill in as child works it out. Visual support available (tap to show objects)
but optional. Scaffolded: objects visible initially, fading to pure numerals over time.

| Aspect | Detail |
|---|---|
| **Mechanic** | Fill in the missing number in a simple equation |
| **Visuals** | Constellation forming as equations are solved |
| **Replay value** | Randomly generated equations. Personal best tracker |
| **Difficulty** | a + b = ? → ? + b = c → a + ? = c → subtraction variants |
| **Maths skill** | Number bonds, mental arithmetic, algebraic foundations |

**Activities mapping (5 slots):**

| Activity ID | Game Variant | Theme |
|---|---|---|
| `number-puzzles` | Frog Hop | Lily pad number line |
| `adding-fun` | Moonlight Garden | Flower addition |
| `number-stories` | Firefly Farewell | Night-time subtraction |
| `number-patterns` | Pattern Path | Forest stepping stones |
| `subtraction-fun` | Star Equations | Constellation equations |

---

## 3. Replayability Systems

### 3.1 Procedural Generation

Every session generates fresh content. No two games are identical:

| Element | How Generated |
|---|---|
| **Target numbers** | Random within difficulty-appropriate range |
| **Object types** | Random selection from themed pools (animals, fruits, shapes, etc.) |
| **Object arrangements** | Random positions (Tap & Count), random patterns (Quick Peek) |
| **Colour palettes** | Rotation through 6 seasonal palettes |
| **Character pairings** | Random from cast of 8 animal characters (Who Has More?) |
| **Pattern sequences** | Algorithmically generated with guaranteed solution |

### 3.2 Adaptive Difficulty

The difficulty engine tracks a rolling window of the last 10 attempts:

```
streak ≥ 3 correct → difficulty + 1 (harder)
≥ 2 wrong in last 5 → difficulty - 1 (easier)
otherwise → hold current level
```

Difficulty affects:
- **Number range**: 1–3 → 1–5 → 1–10 → 1–15 → 1–20
- **Answer choices**: 2 → 3 → 4 options
- **Flash duration** (subitizing): 3s → 2s → 1.5s → 1s
- **Visual support**: objects always shown → objects on request → numerals only

Difficulty is **per-activity, per-child**, persisted in AsyncStorage:

```typescript
interface MathProgress {
  activityId: string;
  difficulty: number;        // 0–4
  totalAttempts: number;
  correctAttempts: number;
  lastPlayed: string;        // ISO date
  streakHistory: boolean[];  // last 10 results
}
```

### 3.3 Collectible Rewards

Each completed game session earns a gentle, non-addictive reward:

| Reward Type | Mechanic | Theme |
|---|---|---|
| **Constellation Builder** | Each correct answer lights a star. 5 stars → constellation forms | Night sky / space |
| **Garden Growth** | Each session plants a flower. Garden fills over weeks | Nature / seasons |
| **Firefly Jar** | Fireflies collected in a jar. Jar glows brighter over time | Bedtime / calm |

Rewards are **cumulative, never lost**. No streaks that reset. No daily pressure.
Progress is visible in a "My Maths Garden" section (future Phase 7 feature).

---

## 4. Technical Architecture

### 4.1 New Game Types

Extend the existing `GameType` union in `learning-screen.tsx`:

```typescript
// Current
export type GameType = 'spelling' | 'choice' | 'sorting' | 'story';

// Phase 6
export type GameType = 'spelling' | 'choice' | 'sorting' | 'story'
  | 'math-counting'     // Tap & Count, More Appears, Feed the Animal, Starry Sky
  | 'math-subitizing'   // Quick Peek
  | 'math-comparison'   // Who Has More?
  | 'math-addition'     // Moonlight Garden, Frog Hop (forward)
  | 'math-subtraction'  // Firefly Farewell, Frog Hop (backward)
  | 'math-pattern'      // Pattern Path
  | 'math-equation';    // Star Equations
```

Each `math-*` game type routes to a dedicated game screen component.

### 4.2 Component Architecture

```
components/games/math/
├── math-game-screen.tsx          # Router — picks correct sub-game based on gameType
├── counting-game.tsx             # Tap & Count, More Appears, Feed the Animal
├── subitizing-game.tsx           # Quick Peek
├── comparison-game.tsx           # Who Has More?
├── addition-game.tsx             # Moonlight Garden (visual addition)
├── subtraction-game.tsx          # Firefly Farewell (visual subtraction)
├── number-line-game.tsx          # Frog Hop
├── pattern-game.tsx              # Pattern Path
├── equation-game.tsx             # Star Equations
├── shared/
│   ├── math-object-grid.tsx      # Renders countable objects in grid/scatter layout
│   ├── number-picker.tsx         # Row of number buttons (1–10 or 1–20)
│   ├── answer-choices.tsx        # 2–4 answer option buttons
│   ├── counting-voice.tsx        # Spoken number audio hook
│   ├── difficulty-engine.ts      # Adaptive difficulty state machine
│   ├── math-animations.ts        # Shared Reanimated animations (bounce, glow, drift)
│   └── object-pools.ts           # Themed object sets (animals, fruits, shapes, etc.)
├── rewards/
│   ├── constellation-reward.tsx  # Star constellation builder
│   ├── garden-reward.tsx         # Growing garden
│   └── firefly-jar-reward.tsx    # Glowing firefly collection
```

### 4.3 State Machine

Each math game follows a consistent state machine:

```
idle → intro → playing → answering → feedback → (next_round | complete)
                  ↑                      |
                  └──────────────────────┘
```

| State | Description |
|---|---|
| `idle` | Not started |
| `intro` | Story page or narration plays (reuses existing story system) |
| `playing` | Interactive phase — child manipulates objects |
| `answering` | Child selects/confirms their answer |
| `feedback` | Correct/incorrect animation + voice feedback (1.5s) |
| `next_round` | Generates next challenge at current difficulty |
| `complete` | Round finished → celebration → bridge overlay |

```typescript
interface MathGameState {
  phase: 'idle' | 'intro' | 'playing' | 'answering' | 'feedback' | 'complete';
  difficulty: number;
  round: number;
  roundsTotal: number;          // 5 per session (matches story pages)
  currentChallenge: MathChallenge;
  score: { correct: number; total: number };
  streakHistory: boolean[];
}

interface MathChallenge {
  type: 'count' | 'subitize' | 'compare' | 'add' | 'subtract' | 'pattern' | 'equation';
  objects: MathObject[];        // What to display
  targetNumber?: number;        // Expected answer
  choices?: number[];           // Multiple choice options
  equation?: { a: number; op: '+' | '-'; b: number; result: number; missing: 'a' | 'b' | 'result' };
  pattern?: (string | number)[];
}

interface MathObject {
  id: string;
  type: string;                 // 'star' | 'butterfly' | 'apple' | etc.
  emoji: string;
  position: { x: number; y: number };
  state: 'idle' | 'counted' | 'removed' | 'added';
}
```

### 4.4 Hook Architecture

Mirror the existing `useSpellingGame` pattern:

```typescript
// hooks/use-math-game.ts
export function useMathGame(
  activityId: string,
  gameType: GameType,
  onRoundComplete?: () => void
): MathGameHookResult {
  // Loads difficulty from AsyncStorage
  // Generates challenges procedurally
  // Manages state machine transitions
  // Persists progress on completion
}
```

### 4.5 Integration with Existing Systems

| System | Integration |
|---|---|
| **Story narratives** | Existing 75 translated stories become intro/outro pages between math rounds |
| **Bridge overlays** | Existing `RealWorldBridgeOverlay` shows after math round completion |
| **Celebration overlay** | Existing `CelebrationOverlay` reused with math-themed messages |
| **i18n** | New keys under `maths.*` namespace. Voice counting uses existing TTS or pre-recorded audio per locale |
| **Accessibility** | `useAccessibility()` hook for text sizing, reduced motion, screen reader labels |
| **Analytics** | Track: game type, difficulty, accuracy, time per challenge, age group |
| **Offline** | All math games work offline — no network dependency |
| **Subscription** | Same gating: 3 free per age group, rest require Basic+ |

### 4.6 Audio Strategy

| Audio Type | Source | Offline? |
|---|---|---|
| **Counting voice** (1–20 in each language) | Pre-recorded per locale, bundled as assets | ✅ |
| **Number names** ("one", "two", ...) | Same pre-recorded set | ✅ |
| **Feedback sounds** (correct, try again) | Bundled SFX — reuse existing spelling game sounds | ✅ |
| **Spoken prompts** ("How many stars?") | Pre-recorded per locale per game type | ✅ |

Audio files: `assets/audio/maths/{locale}/count-{1-20}.mp3` (~240 files, ~2MB total)

### 4.7 Visual Asset Requirements

| Asset | Format | Count | Notes |
|---|---|---|---|
| **Countable objects** | SVG or Lottie | 8 themed sets × 6 objects | Animals, fruits, shapes, nature, toys, food, space, ocean |
| **Background scenes** | WebP | 6 scenes | Night sky, meadow, pond, garden, kitchen, forest |
| **Character sprites** | WebP/Lottie | 8 animals | Wombat, owl, bear, bunny, hedgehog, fox, frog, bee |
| **Number cards** | SVG | 0–20 | Soft pastel style matching existing UI |
| **Dot patterns** | SVG | 10 patterns | Dice/domino layouts for subitizing |
| **Reward animations** | Lottie | 3 types | Constellation, garden flower, firefly |

---

## 5. Implementation Plan

### 5.1 Phase Breakdown

#### Phase 6a — Foundation (2 weeks)

| Task | Detail | Effort |
|---|---|---|
| Define `MathChallenge` types | TypeScript interfaces, challenge generator | 1 day |
| Build `useMathGame` hook | State machine, difficulty engine, progress persistence | 3 days |
| Build `MathGameScreen` router | Routes `math-*` game types to sub-components | 1 day |
| Build shared components | `NumberPicker`, `AnswerChoices`, `MathObjectGrid` | 2 days |
| Build `counting-game.tsx` | Tap & Count + More Appears variants | 2 days |
| Wire up first 5 activities | Change `gameType` from `'spelling'` to `'math-counting'` | 0.5 day |
| Tests | Unit tests for difficulty engine, challenge generator, hook | 1 day |

**Milestone:** Ages 0–2 math games fully playable.

#### Phase 6b — Core Games (2 weeks)

| Task | Detail | Effort |
|---|---|---|
| Build `subitizing-game.tsx` | Quick Peek with timed flash | 2 days |
| Build `comparison-game.tsx` | Who Has More? split-screen | 2 days |
| Build Feed the Animal variant | Drag-and-drop counting | 2 days |
| Build Starry Sky variant | Count + numeral matching | 1 day |
| Wire up ages 2–4 activities | 5 activities → new game types | 0.5 day |
| Record counting audio | 1–20 in 14 languages (EN + 13 locales) | 2 days |
| Tests | Integration tests for all age 2–4 games | 1 day |

**Milestone:** Ages 0–4 math games fully playable.

#### Phase 6c — Advanced Games (2 weeks)

| Task | Detail | Effort |
|---|---|---|
| Build `addition-game.tsx` | Moonlight Garden visual addition | 2 days |
| Build `subtraction-game.tsx` | Firefly Farewell visual subtraction | 2 days |
| Build `number-line-game.tsx` | Frog Hop forward/backward | 2 days |
| Build `pattern-game.tsx` | Pattern Path with procedural patterns | 2 days |
| Build `equation-game.tsx` | Star Equations for ages 5–6 | 1 day |
| Wire up ages 4+ activities | 5 activities → new game types | 0.5 day |
| Tests | Full test suite for all 15 activities | 1 day |

**Milestone:** All 15 math activities playable across all age groups.

#### Phase 6d — Polish & Assets (1 week)

| Task | Detail | Effort |
|---|---|---|
| Commission/create visual assets | Object sets, backgrounds, characters | 3 days |
| Implement reward system | Constellation/garden/firefly jar animations | 2 days |
| Accessibility pass | Screen reader, reduced motion, tablet layout | 1 day |
| Performance optimisation | Reanimated shared values, memo boundaries | 1 day |

**Milestone:** Production-ready math games with final art and rewards.

### 5.2 Migration Strategy

The transition from spelling-based numbers to math games is **non-breaking**:

1. **Keep existing story translations** — they become narrative wrappers around math challenges
2. **Keep existing word banks temporarily** — remove `numbers-words.ts` only after all math games ship
3. **Feature flag** — `MATH_GAMES_ENABLED` in app config, defaulting to `false` during development
4. **Gradual rollout** — ship one age group at a time behind the flag
5. **Analytics comparison** — measure engagement (session length, replay rate) vs old spelling approach

```typescript
// app.config.js
extra: {
  mathGamesEnabled: process.env.MATH_GAMES_ENABLED === 'true',
}

// learning-screen.tsx
const gameType = config.mathGamesEnabled
  ? activity.mathGameType   // new field
  : activity.gameType;      // falls back to 'spelling'
```

### 5.3 Files to Modify

| File | Change |
|---|---|
| `components/learning/learning-screen.tsx` | Add `math-*` game types, update `NUMBERS_ACTIVITIES` |
| `types/spelling-game.ts` | Add `MathChallenge`, `MathGameState`, `MathProgress` interfaces |
| `data/numbers-words.ts` | Deprecate, then remove after full migration |
| `hooks/use-spelling-game.ts` | No change — spelling stays for spelling activities |
| `app/(tabs)/learning/[activityId].tsx` | Route `math-*` game types to `MathGameScreen` |
| `locales/*/index.ts` | Add `maths.*` namespace keys for game UI |
| `stores/progress-store.ts` | Add `MathProgress` persistence |

### 5.4 Testing Strategy

| Test Type | Coverage |
|---|---|
| **Unit** | Difficulty engine, challenge generators, number range calculations |
| **Hook** | `useMathGame` state transitions, edge cases (streak boundaries, difficulty caps) |
| **Component** | Each game screen renders correctly at each difficulty level |
| **Snapshot** | Visual regression for each game type at each age group |
| **Integration** | Full flow: activity card → game screen → complete → bridge → back |
| **Accessibility** | VoiceOver/TalkBack announces objects, counts, answers correctly |
| **i18n** | Counting audio plays in all 14 languages. UI strings display correctly |

---

## 6. Success Metrics

| Metric | Target | How Measured |
|---|---|---|
| **Session replay rate** | > 2.5 sessions/activity/week | Analytics: unique sessions per activity |
| **Completion rate** | > 80% of started sessions complete all 5 rounds | Analytics: round completion events |
| **Difficulty progression** | Average child reaches difficulty 2+ within 3 sessions | AsyncStorage progress data |
| **Age-appropriate accuracy** | 70–85% correct at steady-state difficulty | Analytics: correct/total per difficulty |
| **Parent satisfaction** | > 4.5 stars in app store reviews mentioning "math"/"numbers" | App store review sentiment |
| **No frustration signals** | < 5% of sessions abandoned mid-round | Analytics: abandon events |

---

## 7. Research References

| App | Key Mechanic Borrowed | Age Range |
|---|---|---|
| **Khan Academy Kids** | 1:1 correspondence (tap to count), comparison (which jar has more) | 2–8 |
| **Funexpected Math** | Subitizing, adaptive difficulty, pattern recognition, skip counting | 3–7 |
| **Moose Math** | Smoothie-making addition, pet bingo counting, dot-to-dot number lines | 3–7 |
| **Todo Math** | Number tracing, daily adaptive practice, visual word problems | 3–8 |
| **NumBee** | Honeycomb counting, frog hopping, subitizing quick-peek, balance scales | 3–5 |
| **MathPlay** | Animated addition (rockets), subtraction (pigs), fruits within 5/10 | 4+ |
| **SplashLearn** | Dot-pattern subitizing, object counting with 1:1 correspondence | 3–6 |

---

## 8. Open Questions

- [ ] Should we pre-record counting audio per locale, or use platform TTS (`expo-speech`)?
  - TTS is cheaper but quality varies by device/language. Pre-recorded is premium but ~2MB.
- [ ] Do we need number tracing (drawing numerals)? It's popular but requires gesture recognition.
- [ ] Should "Balance Scale" (equality concept) be a 6th game type or a variant of comparison?
- [ ] How do we handle RTL layout for Arabic counting games? (objects should still flow LTR for maths)
- [ ] Should difficulty reset per session or persist across sessions? (Current plan: persist)

