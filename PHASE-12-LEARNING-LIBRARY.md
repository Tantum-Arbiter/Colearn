---
title: "Phase 12 — The 75-book learning library"
type: delivery-plan
phase: 12
status: proposed
owner: CoLearn
tags: [phase-12, stories, learning-games, cms, engines, delivery, ai-tools]
updated: 2026-11-09
---

# Phase 12 — The 75-book learning library

> **For LLMs / AI agents**: this is a **delivery plan**, written against `origin/mvp` at `c3bf569f`
> on 2026-11-09. It takes the content already generated in the `ai-tools` repository
> (`gpt-image-generator-browser/`, 75 learning books written from the expert briefs) and stages it
> into this app, one book at a time, until the app is a comprehensive learning library. It builds
> on [`PHASE-10-LEARNING-GAMES.md`](PHASE-10-LEARNING-GAMES.md) (the shell, engines and pack
> format) and supersedes the unpushed PHASE-11 proposal's 18-mechanic catalogue (§13). Nothing in
> it is built until a stage says so. Bare paths are relative to `grow-with-freya/`; `ai-tools`
> paths are relative to `gpt-image-generator-browser/` in that repository.

**The ask (operator, 2026-11-09).** Take everything ai-tools has produced for the 75 books into
CoLearn and turn it into a delivery plan where every book is its own stage, reaching an MVP of a
comprehensive learning app. Be upfront about how the games work in the UI, so the story
experiences are built around them; keep the games reusable for future content through CMS
metadata, with the visuals adjusted per book; the engine stays in the app, metadata-driven. Age
bands: use the app's `1-2 | 2-4 | 4+` and shift the briefs' 6-8 books into `4+`.

**The answer in one paragraph.** The content exists: 75 fifteen-page manuscripts, 69 picture
plans, 300 challenge moments across 60 expert mechanics in 10 interaction **families**, with
every challenge carrying its setup, instruction, success and skip lines, hints and a grown-up's
question, translated (where done) into the app's 13 other languages. The app has the shell, one
engine (Place) and a reader that can already open a challenge over a page (the music challenge).
The plan adds one page type (`learning_challenge`), makes the engine chosen by **family** from
page metadata, builds four engines in the order that unlocks the most books, and ships the books
in ten waves of 3 to 11 books, each book a stage with the same eleven-step checklist. Seven
books need only the Choose engine, so the first wave proves the whole path end to end.

---

## 1. What exists today (verified)

### 1.1 In ai-tools (content)

| Fact | Where |
|---|---|
| 75 briefs, 25 per band (2-4, 4-6, 6-8), six domains (Science 17, Maths 16, Music 12, Language 12, Creative 11, Social 7), 300 interactions over 60 mechanics in 10 families | `story-briefs/gwf-75/books_75.json`; catalogue `image_gen_browser/learning/mechanics.json` (`families` :48, `mechanics` :366) |
| 75 manuscripts written (both providers), 69 picture plans (`book.json`), 69 `production.json`; six books have manuscripts but no plan: GWF-041, 046, 053, 065, 067, 071 | `stories/gwf-75/<band>/<slug>/`, `stories/gwf-75/index.json`, `batch-status.json` |
| Every planned book: 15 pages, 3/4/5 challenges by band on three-page windows, never page 1/15 or adjacent, each mechanic once, every challenge with `on_skip`; a nominated music page with a `song_id` | `LEARNING-GAMES.md` §The cadence; `BookSpec` validators `image_gen_browser/schemas/models.py:563-611` |
| A challenge is CMS data already: `mechanic_id`, `brief_id`, `title`, `setup_line`, `instruction`, `success_line`, `on_skip`, `parent_prompt`, `hint_1/2`, `items`, `target`, `difficulty`, `state_before/after`; domain, family, adapter, assessment mode and fallback derive from the catalogue | `LearningChallenge` `models.py:373-426` |
| The exporter writes `challenges.json` beside `story-data.json`: per challenge `pageNumber, challengeId, briefInteractionId, mechanicId, mechanicName, domain, family, adapter, assessmentMode, audioDependent, skillId, title, setupLine, instruction, successLine, onSkip, parentPrompt, hints, items, target, difficulty, stateBefore, stateAfter, availability, fallbackPattern, fallbackElementId, isMusicGate`, plus `localized` per language and the song | `image_gen_browser/export/cms_story.py:380-455` |
| Translations: 13 languages (pl, es, de, fr, it, pt, ar, tr, nl, da, la, ja, zh), rhyming transcreation, every reading level, challenge lines included, `review_status: machine_draft` until a fluent reviewer signs off. Done for 3 books (36 files) | `image_gen_browser/translation.py:31-45`; `models.py:457-481`; `stories/gwf-75/2-4/*/translations/` |
| Reading levels: 2-4 books carry 1-2 and 4-6 narration; 6-8 text is stored under the app's `4-6` key | `export/localization.py:14-36`; D72 |
| Each family carries a UI contract: `primary` input, `alternative` (accessible) input, `presentation`, `feedback`, `repair` | `mechanics.json` `families` :48-119 |
| No images rendered yet, no `review.json`, no production review, for any of the 75 | `stories/gwf-75/` (no `output/`) |

### 1.2 In this repo (runtime)

| Fact | Where |
|---|---|
| Story pages know `none`, `interactive_state_change`, `music_challenge`; the Java model mirrors it | `types/story.ts:92`; `gateway-service/src/main/java/com/app/model/StoryPage.java:47-49` |
| The reader opens the music challenge over the page and keeps the page art as the backdrop; `allowSkip` is honoured; neither completion nor skip turns the page | `components/stories/story-book-reader.tsx:1824-1859`, `:622-650`, `:1883-1893` |
| **A skipped music challenge is recorded as completed** (`skip()` sets `completed` and fires `onComplete`) | `hooks/use-music-challenge.ts:948-955`; `story-book-reader.tsx:311-324` |
| The experience shell: `loading → intro → playing ⇄ paused → celebrating → bridge → done`; completion records the mission; no skip path | `components/experience/shell-state.ts:1-51`; `experience-shell.tsx:109-128` |
| Only the Place engine exists; the shell always renders it; `manifest.engine` is validated but never used to choose | `experience-shell.tsx:151-165`; `types/game-pack.ts:3`; `services/pack-validation.ts:5,27` |
| Place: `tap` (1-2) → first zone, `tap-place` (2-4) → tap item then zone, `drag` (4+) with tap-place still available; 24 pt snap; zones with `accepts` and `capacity`; rules `tap, hold, dropInto, refused, countEquals, allPlaced, stageMet, missionMet, chose`; effects `set, play, react, moveTo (no-op on screen), complete` | `components/experience/engines/place/place-engine.tsx:56-66,392-421`; `place-geometry.ts:3`; `rules.ts`; `game-pack.ts:68-84` |
| Games launch only from the island plan; not from a book page or the Library | `app/_layout.tsx:791-802`; `ARCHITECTURE.md:1438-1439` |
| Age bands: `ageMonthsToRange` <24 → `1-2`, <48 → `2-4`, else `4+`; story text groups are `1-2 \| 2-4 \| 4-6` | `constants/age-range.ts:1-7`; `types/story.ts:23,40-44` |
| Story text travels in story data (`localizedTitle`, `localizedDescription`, per-page `localizedText`), not in locale files; pack text is locale keys | `ARCHITECTURE.md:1642-1650`, `:1395-1396` |
| CMS pipeline: `scripts/cms-stories/<id>/story-data.json` + `cover/` + `page-N/`; ajv validation and `gsutil rsync` happen in `.github/workflows/cms-stories-sync.yml`, **on `main` only**; `upload-stories-to-firestore.js` deletes stories absent from the source set (`:230-264`) and does no schema validation itself | `scripts/story-schema.json`; `scripts/upload-stories-to-firestore.js:15-23,109-124`; `.github/workflows/cms-stories-sync.yml:3-13,56-59,99-101` |
| `story-schema.json` has no `additionalProperties: false` at story or page level, so unknown page fields pass validation but are **dropped by the typed Java model** (inference from `document.toObject(Story.class)`, `FirebaseStoryRepository.java:105,135,168,201,236`; UNVERIFIED at runtime) | |
| Delta sync answers changed stories and the catalogue every launch; assets come through signed URLs, 100 paths per call | `gateway-service/README.md:93-117` |
| Plan builder `buildWeek(goals)` takes no band; units are a closed id union of 11 | `services/plan-builder.ts:76-83`; `types/learning-plan.ts:11-22` |
| Bundled generated books cost 16–17 MB each (`hold-on-juni`, `my-turn-to-ding`); one CMS page image is 70.9 MB | `assets/stories/`; `scripts/cms-stories/snuggle-little-wombat/page-2/background.webp` |

---

## 2. The MVP we are delivering

**A comprehensive learning library** means, concretely:

| # | Outcome | How we will know |
|---|---|---|
| L1 | All 75 books readable in the app, in all 14 languages, at the reading level of the child's band | Every book in `scripts/cms-stories/`, schema-valid, with `localizedText` for every page, level and language; Library shows 75 |
| L2 | Every challenge in every book plays inside the page, from its metadata, in the child's band | 300 challenges render through five engines keyed by `family`; no code per book |
| L3 | Skippable, un-scored, calm | Skip always offered; skip plays the story's own `on_skip` resolution and **never** records completion; no timer, no wrong-answer sound (`PHASE-10` §2) |
| L4 | Reusable | Adding book 76 is a `cms-stories/` folder and an upload; no app release |
| L5 | Visuals are the book's | Engines draw chrome (tray, slots, rings, outlines) in the app's theme only; every picture on a challenge comes from the book's own export |
| L6 | Learning paths draw on the library | The island week is built from all 75 books by domain and band; the Library filters by domain |
| L7 | Honest readiness | A book is `isAvailable` only after its production review passes (`ai-tools` `production --require-ready`) and its device check is recorded |

Three checkpoints on the way: **MVP-A** (wave 1: 7 books, one new engine, the whole path proven on
device), **MVP-B** (waves 1–4: 35 books, four engines, half the library, learning paths rebuilt),
**MVP-C** (all 75, five engines, L1–L7 met).

---

## 3. Age bands: the mapping

The briefs were written for `2-4`, `4-6` and `6-8`. The app has `1-2`, `2-4`, `4+` for play and
`1-2`, `2-4`, `4-6` for text. Operator decision (2026-11-09): shift, do not rebuild.

| Brief band | Shown to (Library `ageRange`) | Play band of the challenge as written | Story text key | Other rungs |
|---|---|---|---|---|
| 2-4 | `2-4` (and `1-2` with a grown-up) | `2-4` | `2-4`; the 1-2 and 4-6 variants already generated | `1-2`: fewest items (`items.min`), gesture `tap`, target shown; `4+`: as written |
| 4-6 | `4+` | `4+` | `4-6` | `2-4`: items reduced to the catalogue minimum, `tap-place`; `1-2`: one item, `tap` |
| 6-8 | `4+` (stretch) | `4+` | `4-6` (the exporter already stores 6-8 text there) | as for 4-6 |

Rules: a challenge always declares all three play bands so the mission contract holds
(`pack-validation.ts:176-191`) and the grown-up can change the band on the step card; the
derived rungs are **generated mechanically** from the catalogue's `items.min/max` and family
gesture table, never hand-written per book; the Library shows a book to its brief band only. No
6-8 book is marketed as such; the product is 0 to 6 (`PHASE-10` §1 non-goals).

---

## 4. How a challenge works in the UI (the experience contract)

This is the part everything else is built around. It is one experience for all 300 challenges;
only the family changes the shape of the play area.

### 4.1 The page

1. A challenge page is a normal story page: the 4:3 art fills the reader (full-screen `cover`
   fit, narration at the bottom), the narration reads as usual. Nothing about the page says
   "game".
2. The page's `interactive_object` (every challenge page has one, `models.py:563-611`) carries a
   gentle pulse, as reveal elements do today (`components/stories/interactive-element.tsx:1-8`).
   Tapping it, or the "Do" affordance where the music challenge's "Begin Playing" sits today
   (`story-book-reader.tsx:2379-2390`), opens the challenge. Narrate mode pauses auto-advance on
   challenge pages, as it does for music (`:1597-1610`).
3. The page art stays as the backdrop, dimmed only outside the challenge's region, exactly as the
   music backdrop does (`:1824-1833`). The challenge is **over** the page, never a new screen.

### 4.2 The play

The shell's own lifecycle (`shell-state.ts`) hosts it, with two additions: a `skip` event and a
page-turn on exit.

| Phase | What the child sees | Text used (from `challenges.json`) |
|---|---|---|
| intro | The host character does the first action once, slowly (PHASE-10 §6.2); the grown-up's card shows the question | `setupLine`, `parentPrompt` |
| playing | The family's play area (§4.3); the instruction as a short line; after 8 s of no input a hint, then the second hint | `instruction`, `hints[0]`, `hints[1]` |
| celebrating | The story's own result: the `stateAfter` art, the host's reaction, a short instrument phrase, two seconds, no stars | `successLine` |
| skipped | A character completes the step; the narration says so **without crediting the child**; the `stateAfter` art is shown | `onSkip` |
| done | The page turns to N+1 | |

Rules, all testable:

- **Skip is always offered**, from intro and playing, as the music challenge offers it
  (`music-challenge-ui.tsx:271`). Skip must **not** fire the completion path; today's
  `skip()` does (`use-music-challenge.ts:948-955`), which stage 0 fixes for music too.
- **Guided mechanics** (`assessmentMode: guided_observable`, 42 of 60) have a `target`; a
  non-target choice gets the family's `repair` behaviour (explain the clue, keep the item,
  no error sound), never a "wrong". **Open mechanics** (`exploratory_multiple_valid`, 18)
  accept every reasonable answer; the consequence shown is the one authored for that option.
- **Completion** records a `learning` challenge kind (as `music` is counted today,
  `store/app-store.ts:27`), nothing more: no score, no accuracy, no time per item (PHASE-10 §12).
- **Audio-dependent** mechanics (`audioDependent: true`, 14 of 60) always offer the family's
  `alternative` input (visual beat, pitch, volume cues) and never claim to measure hearing.
- **Reduce Motion** keeps every outcome and removes every ripple (PHASE-10 §5.1).
- **Orientation**: the reader is landscape on phones and free on tablets (`story-book-reader.tsx:695-745`);
  every play area lays out both ways, inside the page's safe zone (§4.4).

### 4.3 Ten families, five engines

The catalogue's family defines the play area; the engine is chosen from `family` in the page
metadata; `mechanicId` and `adapter` only parameterise it. A pack or page never names an engine.

| Family | Challenges | What the child does (catalogue `primary`) | Engine | Status |
|---|---|---|---|---|
| `choose` | 115 | Taps one of two or three large illustrated choices in a tray anchored away from text and faces; the consequence shows in the scene | **Choose** | new (PHASE-10 M4) |
| `tap_scene` | 41 | Taps one highlighted in-scene object, or each item once when counting; valid hotspots get a gentle outline on request | **Scene** | new |
| `sequence` | 37 | Taps a card then a position (or move earlier/later); the ordered story, pattern or word is re-enacted | **Place** with ordered slots | extend |
| `music_audio` | 24 | Taps large pads, note choices, start/stop or sound layers; the world echoes without success sounds | **Instrument** (U02 today) + pads | extend |
| `quantities` | 20 | Plus/minus, tap-to-combine, unit tiles or stepwise pouring; objects and the number change together | **Place** with counters | extend |
| `assign_sort` | 17 | Taps an item then its recipient or category; drag optional, never required | **Place** | built |
| `authored_sim` | 16 | Chooses one test setting and plays the pre-authored result; prediction contrasted with observation | **Scene** with authored states | new |
| `snap_build` | 16 | Taps a piece then a broad snap zone; optional rotate for older children | **Place** with snap + rotate | extend |
| `navigate` | 11 | Taps connected map nodes or step arrows; one short route at a time | **Scene** with a node graph | new |
| `trace_draw` | 3 | Draws a short broad stroke on a layer above the protected art, or picks a ready-made mark | **Make** | new (PHASE-10 M5) |

The full `primary / alternative / presentation / feedback / repair` text for each family is in
`ai-tools` `mechanics.json:48-119` and is the UI specification for that engine; it is not
repeated here. Place keeps its gesture table by band (`place-engine.tsx:56-66`); Choose and Scene
are tap-only in every band.

### 4.4 The visual contract (so stories are drawn around the games)

- **The page is the backdrop.** The picture planner already keeps "learning clues, touch targets
  and the complete extent of both before and after interaction states" inside the full-screen
  safe zone, 28–72 % across and 23–60 % down (`ai-tools` `layout_contract.py:23-25`;
  `prompts/templates.py:775-789`). The play area for every family lives inside that zone;
  the narration band below it is untouched.
- **Items are the book's.** A challenge's `items` (3–10 countable objects, cards, pieces, choices)
  are rendered by ai-tools as cut-outs beside the page (`page-N/challenge/<item-id>.webp`,
  §6.1), in the book's style, from the same prompts as the page. Engines never ship item art.
- **Before and after are art states.** `stateBefore` is the page as drawn; `stateAfter` is a
  protected reveal patch, the same mechanism as `interactive_state_change` today
  (`ai-tools` `production.py:247-256`). The fallback element (`fallbackElementId`) is that patch.
- **Chrome is the app's.** Trays, slots, rings, outlines, counters, pads, the hint bubble and the
  grown-up card are drawn by the engine in the Early Roots theme (soft, night-sky, rounded) and
  look the same in every book. That is what makes the mechanic reusable; the art is what makes
  it feel new (PHASE-11 §4.1's dials, kept).
- **Sound.** Every tap a soft sound; success a phrase from the app's instruments; no spoken words
  in the first wave (PHASE-10 §9.2). ElevenLabs narration (ai-tools D75) is opt-in later.

---

## 5. CMS metadata: what a challenge is as data

### 5.1 One page field, inline

A challenge ships **inside the story**, on its page, not as a separate pack:

```ts
// types/story.ts (proposed)
export type PageInteractionType = 'none' | 'interactive_state_change' | 'music_challenge' | 'learning_challenge';

export interface LearningChallenge {
  challengeId: string;            // "<slug>-<page>-challenge"
  briefInteractionId: string;     // "GWF-017-I01"
  mechanicId: string;             // "M02"  (parameter, never a code switch)
  family: ChallengeFamily;        // the engine selector (§4.3)
  adapter: string;                // "assign"
  assessmentMode: 'guided_observable' | 'exploratory_multiple_valid';
  audioDependent: boolean;
  domain: LearningDomain;         // maths | language | music | science | social | creative
  skillId: string;
  copy: AgeGroupText & { /* per level, per language */ };   // title, setupLine, instruction, successLine, onSkip, parentPrompt, hints
  items: ChallengeItem[];         // { id, labelKey?, image: 'assets/stories/<slug>/page-N/challenge/<id>.webp', attributes? }
  target: string;                 // guided mechanics only
  byAge: Record<PlanAgeRange, { gesture: MissionGesture; items: string[]; goal?: Record<string, number> }>;
  stateAfter: { image: string; position; size; hitArea? };   // the protected reveal patch
  fallbackElementId: string | null;
  allowSkip: true;
  isMusicGate: boolean;
}
```

Why inline, and why this is a deliberate change from PHASE-10 §7.1 ("strings are never in a
pack"): challenge copy is **story content**, written and translated with the book in ai-tools and
reviewed with it; it belongs with the page's `localizedText`, travels through the existing delta
sync and signed-URL path with no new endpoints, and a new book is one upload. Packs (`GamePack`)
remain the format for free-standing island games (free play, no page under them). Locale files
keep only app chrome (`experience.*`, `bridges.*`).

Three models change together, as the rules require (`AGENTS.md` Always): `types/story.ts`,
`gateway-service/.../model/StoryPage.java` (plus a `LearningChallenge.java`), and
`scripts/story-schema.json` (`interactionType` enum and a `learningChallenge` object). Until the
Java model has the field, Firestore drops it (§1.2).

### 5.2 From `challenges.json` to the page

`ai-tools export-for-cms` already writes `challenges.json` with every field above except
`byAge`, `items[].image` and `stateAfter` (`cms_story.py:380-441`). Stage 0 teaches it to write
the `learningChallenge` block onto the page in `story-data.json` directly and to derive `byAge`
from the catalogue (§3). `challenges.json` stays as the review sidecar.

### 5.3 Validation in this repo

`scripts/lib/challenge-plans.js` on the PHASE-11 branch is the seed. On mvp it becomes
`scripts/lib/learning-challenges.js` (CommonJS, fixture-first, `node --test`), checking for every
`cms-stories/*/story-data.json`:

- cadence by band (3/4/5, one per three-page window, never page 1 or the last, never adjacent),
  each mechanic once per book, every mechanic in the catalogue copy vendored at
  `scripts/learning/mechanics.json` (a copy of ai-tools' file, with its version);
- every challenge page has a `learningChallenge` and its `copy` in all 14 languages at the book's
  levels; every `items[].image` and `stateAfter.image` exists in the folder;
- `byAge` has all three bands; guided mechanics have a `target`; `allowSkip` is true;
- the music gate page is `music_challenge` with `isMusicGate` on its U02 challenge, or a page
  clear of challenges;
- checksum parity (`node --test lib/*.test.js`, `scripts/AGENTS.md:73-78`) still passes.

---

## 6. The per-book pipeline (the checklist every stage runs)

Each book is one stage with the same eleven steps. A stage is done when all eleven are ticked in
the book's row (§8) with evidence (file, test run or device recording), not when the folder exists.

| # | Step | Where | Evidence |
|---|---|---|---|
| 1 | Plan exists: `book.json` with 15 pages and the right challenge count; `production.json` | ai-tools `stories/gwf-75/<band>/<slug>/` | file present, `BookSpec` validates |
| 2 | Text reviewed in the source text studio (D79): narration, refrain, no brief-beat leakage; challenge copy read against the page | ai-tools `python -m image_gen_browser.text_review` | snapshot in `text-history/` |
| 3 | Render: 15 page masters (4:3, ≥1200×900), cover, and the challenge item cut-outs and `stateAfter` patches | ai-tools `render-book --spec …/book.json`, `generate-interactive-object` | `output/<slug>/` complete; ≤2 seeds per image |
| 4 | Translate the 13 languages; music books' songs singable to the tune | ai-tools `learning-batch` (translate jobs) | `translations/*.json` ×13, applied to `book.json` |
| 5 | Picture review and edit regions: `review.json`, protected reveal polygons for every challenge page | ai-tools `python -m image_gen_browser.review` | review passes; no `composition_page_N` blocker |
| 6 | Export the package: `story-data.json` with `learningChallenge` pages, `challenges.json`, `cover/`, `page-N/`, report | ai-tools `production` (after stage 0's fixes), `--require-ready` | `reports/review-report.json` status `ready_for_upload` |
| 7 | Copy into `scripts/cms-stories/<slug>/`; run `npm run prepare-upload` | this repo | folder present, no other folder touched |
| 8 | Validate: ajv against `story-schema.json`, `learning-challenges` checks, checksum parity | `node --test lib/*.test.js`, `cd cms-manager && npm test` | green |
| 9 | Device check: the book read end to end with every challenge played **and** skipped, in its band, on iPhone landscape and iPad both ways; Reduce Motion on and off | Maestro `story-page-challenge.yaml` with `E2E` seed `story=<slug>`; manual for the first book of each new family | recording linked in the row |
| 10 | Upload: `DRY_RUN=1` first, then the real run against the dev project; translations marked `machine_draft` stay so until a fluent reviewer signs the language off | `scripts/upload-stories-to-firestore.js` (`scripts/AGENTS.md:33-38`) | dry-run diff approved by a human |
| 11 | Switch on: `isAvailable: true`; add the book to the plan-unit catalogue (§7); asset register entry | `scripts/cms-stories/<slug>/story-data.json`, `data/plan-units.ts`, `compliance/ASSET-REGISTER.md` | book appears in the Library and in built weeks |

Steps 1–6 are ai-tools' definition of done (`production-books.md` §Preparing a book); 7–11 are
this repo's. Nothing is uploaded, pushed or published without the operator's explicit go, per
stage.

---

## 7. Learning paths over 75 books

- `data/plan-units.ts` stops being a hand-written list of 11 ids. A unit per book (`read`,
  `listen`, `record` as today) plus a unit per challenge page (`kind: 'challenge'`, `storyId`,
  `pageNumber`) is **generated** from `cms-stories/*/story-data.json` by a script
  (`scripts/generate-plan-units.js`), with `domain` from the book's `learningDomain` and
  `bands` from §3. `PlanUnitId` becomes a template literal type, not a closed union.
- `buildWeek` gains the band (`buildWeek(goals, band, weekIndex)`, as PHASE-10 §14.2 specified)
  and the rule "a challenge day follows its book in the same week" (the existing `after`).
- Goals map to domains: `countAndSort → maths`, `cosyStories / firstWords → language`,
  `bigFeelings / calmBedtimes / waitingAndTurns → social`, `makeMusic → music`; `science` and
  `creative` fill the "at least four domains" rule. The onboarding chips grow from three to the
  seven PHASE-10 lists once every domain has content (after wave 4).
- The Library gains a domain filter from the same metadata. Nothing about the child's results is
  read (PHASE-10 §12 stands).

---

## 8. The stages

### Stage 0 — Foundations (before any book)

Both repos. Exit: GWF-006 *Little Fox Meets a Friend* plays end to end on device from a CMS folder.

**ai-tools**

- `export-for-cms` refuses `display_fit: cover` books (`cms_story.py:535-536`) and `production`
  forbids the learning fields in `production.json` (`production.py:64`; written by
  `story_factory.py:1325-1331`), writes no `challenges.json` (`production.py:244-246`), and
  always blocks cover-fit books with `fullscreen_reader_integration_required` (`:181-182`).
  Fix: `production` accepts the learning fields, writes the `learningChallenge` page block and
  the sidecar, and the cover-fit blocker is lifted once the reader supports cover fit (below).
- Render item cut-outs and `stateAfter` patches for a challenge page as part of `render-book`
  (today only `interactive_object` reveals are rendered). 236 of 267 objects lack an
  `edit_region` (`interaction_geometry.py:35-57`); the planner must emit one for every challenge
  page before rendering.
- Re-run the three failed plans (GWF-041, 046, 053) and the three never-attempted ones
  (GWF-065, 067, 071); `learning-batch --retry-failed`.
- Derive `byAge` rungs from the catalogue (§3) in the exporter.

**this repo**

- Reader: **cover fit** for 4:3 full-screen pages with bottom narration (the new books' layout;
  ai-tools `README.md:67-86`). Today's reader scales the background 1.35/1.8 from the centre
  (`story-book-reader.tsx:1658`).
- Page type `learning_challenge` across `types/story.ts`, `StoryPage.java`, `story-schema.json`
  (§5.1); contract fixtures updated.
- The reader opens the **experience shell over the page** for a `learning_challenge` page, as it
  opens `MusicChallengeUI` today; `skip` event added to `shell-state.ts`; **skip never records
  completion** (fix `use-music-challenge.ts:948-955` in the same change); the page turns on
  `done`.
- Engine selection by `family` in `experience-shell.tsx:151-165` (today it always renders Place).
- **Choose engine**: tray of 2–3 illustrated items (4+ may see a fourth), guided vs open modes,
  consequence shown via the `stateAfter` patch, the `repair` path; tap only.
- `scripts/lib/learning-challenges.js` validator and `scripts/learning/mechanics.json` (§5.3);
  `scripts/generate-plan-units.js` (§7).
- Maestro `story-page-challenge.yaml` (`.maestro/flows/core/`), seeded with a stub story that
  has one `choose` challenge, run on iPhone and iPad.
- `cms-stories-sync.yml` runs on `main` only; decide whether mvp gets a dev-target run
  (`workflow_dispatch` exists) — a decision for the operator, §12.

### Waves 1–10: the 75 books, one stage each

The order is the one that unlocks the most books per engine built: each wave adds **one family**
and ships every book whose families are all now supported. Within a wave, 2-4 books first (three
challenges, biggest audience), then 4-6, then 6-8. The row is the stage; its eleven steps are §6.
"New" names the family added by that wave; a book's "Needs" lists all its families.

**Wave 1 — Choose (7 books). MVP-A.** Engine: Choose (new). 7 books use only `choose`.

| Stage | Book | Brief band → app | Domain | Mechanics | Needs |
|---|---|---|---|---|---|
| 1.1 | GWF-006 Little Fox Meets a Friend | 2-4 → 2-4 | Social | E01, E02, L11 | choose |
| 1.2 | GWF-010 A Coat for Little Cloud | 2-4 → 2-4 | Science | S05, S01, L08 | choose |
| 1.3 | GWF-011 The Kind Garden Gate | 2-4 → 2-4 | Social | E03, E02, C08 | choose |
| 1.4 | GWF-016 The Whispering House | 2-4 → 2-4 | Language | L01, L06, U06 | choose |
| 1.5 | GWF-044 The Friend Who Felt Left Out | 4-6 → 4+ | Social | E01, E02, E03, L11 | choose |
| 1.6 | GWF-047 The Weather Window | 4-6 → 4+ | Science | S05, S01, S04, L08 | choose |
| 1.7 | GWF-062 The Robot Who Couldn't Read Feelings | 6-8 → 4+ | Social | E01, E04, E02, E03, L11 | choose |

**Wave 2 — Scene (9 books).** Engine: Scene (new): hotspots on the page art, count-and-tap, find,
difference, cause-and-effect, turn-taking.

| Stage | Book | Band | Domain | Mechanics | Needs |
|---|---|---|---|---|---|
| 2.1 | GWF-001 Moss and the Moon Puddle | 2-4 → 2-4 | Science | S01, S10, C04 | choose, tap_scene |
| 2.2 | GWF-002 The Lantern Bridge | 2-4 → 2-4 | Maths | M08, M01, E02 | choose, tap_scene |
| 2.3 | GWF-007 The Blue Boot Hunt | 2-4 → 2-4 | Language | L06, L07, C04 | choose, tap_scene |
| 2.4 | GWF-014 A Soft Blanket for Two | 2-4 → 2-4 | Social | E06, E05, L01 | choose, tap_scene |
| 2.5 | GWF-019 The Gentle Windmill | 2-4 → 2-4 | Science | S10, S01, C04 | choose, tap_scene |
| 2.6 | GWF-033 The Moonlight Shadow Show | 4-6 → 4+ | Science | S04, S01, S10, C04 | choose, tap_scene |
| 2.7 | GWF-034 A Different Kind of Help | 4-6 → 4+ | Social | E02, E04, E05, L11 | choose, tap_scene |
| 2.8 | GWF-054 The Mystery of the Missing Moon | 6-8 → 4+ | Science | S01, S04, S10, S07, L08 | choose, tap_scene |
| 2.9 | GWF-069 The Friends' Different Plans | 6-8 → 4+ | Social | E04, E02, E05, E06, L11 | choose, tap_scene |

**Wave 3 — Sequence (8 books).** Place gains ordered slots (`order_slots`, `grapheme_tiles`,
`pattern_create`, `beat_composer`).

| Stage | Book | Band | Domain | Mechanics | Needs |
|---|---|---|---|---|---|
| 3.1 | GWF-031 The Pattern Parade | 4-6 → 4+ | Maths | M04, M03, M06, C05 | choose, sequence |
| 3.2 | GWF-032 The Letter in the Hollow Tree | 4-6 → 4+ | Language | L03, L05, L06, E03 | choose, sequence |
| 3.3 | GWF-041 The Starlight Library ¹ | 4-6 → 4+ | Language | L06, L07, L04, E02 | choose, sequence |
| 3.4 | GWF-042 The Dancing Lanterns | 4-6 → 4+ | Music | U03, U04, U10, C05 | choose, sequence |
| 3.5 | GWF-045 The Little Robot's Message | 4-6 → 4+ | Language | L10, L05, L11, C08 | choose, sequence |
| 3.6 | GWF-059 The Case of the Mixed-Up Poems | 6-8 → 4+ | Language | L02, L03, L05, L10, C04 | choose, tap_scene, sequence |
| 3.7 | GWF-066 The Library's Secret Door | 6-8 → 4+ | Language | L05, L10, L07, L04, C06 | choose, sequence |
| 3.8 | GWF-070 The History of a Lost Sandwich | 6-8 → 4+ | Language | L04, L08, L12, L11, S07 | choose, tap_scene, sequence |

**Wave 4 — Music (11 books). MVP-B at the end of this wave (35 books).** The instrument screen
(U02, live) gains pads: `beat_tap`, `tempo_choice`, `toggle_music`, `sound_layers`.

| Stage | Book | Band | Domain | Mechanics | Needs |
|---|---|---|---|---|---|
| 4.1 | GWF-005 The Quietest Goodnight | 2-4 → 2-4 | Music | U03, U05, E06 | choose, music_audio |
| 4.2 | GWF-008 The Rainy-Day Orchestra | 2-4 → 2-4 | Music | U06, U01, U02 | choose, music_audio |
| 4.3 | GWF-013 The Dancing Leaves | 2-4 → 2-4 | Music | U05, U07, C05 | sequence, music_audio |
| 4.4 | GWF-018 The Train That Said Hello | 2-4 → 2-4 | Language | L11, L07, U01 | choose, music_audio |
| 4.5 | GWF-020 The Firefly Parade | 2-4 → 2-4 | Music | U01, U03, U09 | choose, sequence, music_audio |
| 4.6 | GWF-025 The Welcome Song | 2-4 → 2-4 | Music | U02, U06, E01 | choose, music_audio |
| 4.7 | GWF-027 The Forest Orchestra | 4-6 → 4+ | Music | U06, U01, U09, U02 | choose, sequence, music_audio |
| 4.8 | GWF-037 The River Drum | 4-6 → 4+ | Music | U01, U05, U07, U02 | music_audio |
| 4.9 | GWF-048 The Village Sound Detective | 4-6 → 4+ | Music | U06, U08, U11, L07 | choose, music_audio |
| 4.10 | GWF-057 The Festival's Missing Song | 6-8 → 4+ | Music | U01, U09, U11, U02, L04 | sequence, music_audio |
| 4.11 | GWF-064 The Lighthouse Sound Lab | 6-8 → 4+ | Music | U04, U05, U08, U10, S01 | choose, music_audio |

**Wave 5 — Assign and sort (6 books).** Place as built (`assign`, `distribute`, `sort_groups`,
`habitat_match`).

| Stage | Book | Band | Domain | Mechanics | Needs |
|---|---|---|---|---|---|
| 5.1 | GWF-003 A Cup for Every Guest | 2-4 → 2-4 | Maths | M02, M03, E05 | choose, tap_scene, assign_sort |
| 5.2 | GWF-015 The Seashell Surprise | 2-4 → 2-4 | Science | S02, S04, L07 | choose, assign_sort |
| 5.3 | GWF-017 The Apple Tree Picnic | 2-4 → 2-4 | Maths | M02, M08, E05 | tap_scene, assign_sort |
| 5.4 | GWF-039 The Hedgehog's Sharing Day | 4-6 → 4+ | Maths | M11, M03, M02, E04 | choose, assign_sort |
| 5.5 | GWF-040 Who Visited the Pond? | 4-6 → 4+ | Science | S07, S09, S02, L08 | choose, tap_scene, assign_sort |
| 5.6 | GWF-071 The Orchestra of the Tides ¹ | 6-8 → 4+ | Music | U11, U09, U07, U03, S09 | choose, sequence, music_audio, assign_sort |

**Wave 6 — Authored simulations (6 books).** Scene plays pre-authored state sequences
(`physics_authored`, `growth_sim`, `experiment_authored`); content-reviewed science only.

| Stage | Book | Band | Domain | Mechanics | Needs |
|---|---|---|---|---|---|
| 6.1 | GWF-004 The Tiny Seed's Morning | 2-4 → 2-4 | Science | S02, S06, L06 | choose, assign_sort, authored_sim |
| 6.2 | GWF-023 The Floating Feather | 2-4 → 2-4 | Science | S01, S03, M03 | choose, authored_sim |
| 6.3 | GWF-028 The Garden That Waited | 4-6 → 4+ | Science | S02, S06, S07, L04 | tap_scene, sequence, assign_sort, authored_sim |
| 6.4 | GWF-053 The Great Coral Rescue ¹ | 6-8 → 4+ | Science | S09, S07, S08, S03, E05 | tap_scene, assign_sort, authored_sim |
| 6.5 | GWF-060 The Village That Moved Its Water | 6-8 → 4+ | Science | S10, S08, S01, S07, C06 | choose, tap_scene, sequence, authored_sim |
| 6.6 | GWF-075 The Moon Garden Exhibition | 6-8 → 4+ | Science | S06, S07, S09, S02, L12 | choose, tap_scene, assign_sort, authored_sim |

**Wave 7 — Quantities (7 books).** Place gains counters and containers (`manipulate_one`,
`combine_quantities`, `measure`, `pour_sim`).

| Stage | Book | Band | Domain | Mechanics | Needs |
|---|---|---|---|---|---|
| 7.1 | GWF-026 The Birthday Berry Pie | 4-6 → 4+ | Maths | M01, M09, M10, E05 | tap_scene, quantities |
| 7.2 | GWF-043 The Great Market Measuring | 4-6 → 4+ | Maths | M12, M06, M13, L12 | choose, sequence, quantities |
| 7.3 | GWF-050 The Curious Recipe | 4-6 → 4+ | Maths | M10, M13, M01, S08 | tap_scene, authored_sim, quantities |
| 7.4 | GWF-058 The Sea Captain's Fair Share | 6-8 → 4+ | Maths | M11, M10, M03, M13, E04 | choose, assign_sort, quantities |
| 7.5 | GWF-063 Three Kingdoms of Patterns | 6-8 → 4+ | Maths | M04, M10, M09, M08, C05 | tap_scene, sequence, quantities |
| 7.6 | GWF-065 The Greenhouse Dilemma ¹ | 6-8 → 4+ | Science | S06, S08, S02, S01, M13 | choose, assign_sort, authored_sim, quantities |
| 7.7 | GWF-072 The Great River Survey | 6-8 → 4+ | Science | S03, S08, S10, S02, M12 | tap_scene, assign_sort, authored_sim, quantities |

**Wave 8 — Snap and build (8 books).** Place gains snap zones and rotate (`shape_snap`,
`construct`, `rotate_snap`).

| Stage | Book | Band | Domain | Mechanics | Needs |
|---|---|---|---|---|---|
| 8.1 | GWF-012 The Market of Shapes | 2-4 → 2-4 | Maths | M05, M06, L06 | choose, sequence, snap_build |
| 8.2 | GWF-024 The Little Nest Builder | 2-4 → 2-4 | Creative | C01, C03, E02 | choose, snap_build |
| 8.3 | GWF-030 The Shoreline Raft | 4-6 → 4+ | Science | S03, S08, S01, C01 | choose, authored_sim, snap_build |
| 8.4 | GWF-038 The Windy Kite | 4-6 → 4+ | Creative | C01, C03, C08, S10 | choose, tap_scene, snap_build |
| 8.5 | GWF-046 The Build-It Bridge ¹ | 4-6 → 4+ | Creative | C01, C06, C03, M12 | sequence, quantities, snap_build |
| 8.6 | GWF-056 The Museum of Impossible Shapes | 6-8 → 4+ | Maths | M05, M06, M12, M04, C03 | sequence, quantities, snap_build |
| 8.7 | GWF-067 The Longest Bridge ¹ | 6-8 → 4+ | Maths | M12, M06, M10, M07, C01 | tap_scene, sequence, quantities, snap_build |
| 8.8 | GWF-068 The Cloudship Engineers | 6-8 → 4+ | Creative | C01, C03, C06, C08, S03 | choose, sequence, authored_sim, snap_build |

**Wave 9 — Navigate (10 books).** Scene gains a node graph (`route_map`).

| Stage | Book | Band | Domain | Mechanics | Needs |
|---|---|---|---|---|---|
| 9.1 | GWF-009 Three Pebbles for the Path | 2-4 → 2-4 | Maths | M01, M05, C02 | tap_scene, snap_build, navigate |
| 9.2 | GWF-021 Little Mouse Finds the Way | 2-4 → 2-4 | Creative | C02, C08, L07 | choose, navigate |
| 9.3 | GWF-029 The Lost Bakery Basket | 4-6 → 4+ | Language | L07, L04, L11, C02 | choose, sequence, navigate |
| 9.4 | GWF-035 Little Bus Number Seven | 4-6 → 4+ | Maths | M07, M02, M09, C02 | tap_scene, assign_sort, quantities, navigate |
| 9.5 | GWF-049 The Folded Star Map | 4-6 → 4+ | Creative | C02, C04, C06, M07 | tap_scene, sequence, navigate |
| 9.6 | GWF-051 The Bridge for the Little Dragon | 6-8 → 4+ | Creative | C02, C06, C01, M12, S08 | sequence, authored_sim, quantities, snap_build, navigate |
| 9.7 | GWF-052 The Star Collector's Map | 6-8 → 4+ | Creative | C02, C06, C08, M07, L07 | choose, tap_scene, sequence, navigate |
| 9.8 | GWF-055 The Island Post Office | 6-8 → 4+ | Language | L07, L11, L12, L04, C02 | choose, sequence, navigate |
| 9.9 | GWF-061 The Mountain Rescue Plan | 6-8 → 4+ | Creative | C02, C06, C08, C01, E03 | choose, sequence, snap_build, navigate |
| 9.10 | GWF-073 The Observatory's Number Trail | 6-8 → 4+ | Maths | M07, M08, M09, M10, C02 | tap_scene, quantities, navigate |

**Wave 10 — Trace and draw (3 books). MVP-C.** Make engine (canvas with a broad brush and
ready-made marks; saves as placed things, never bitmaps).

| Stage | Book | Band | Domain | Mechanics | Needs |
|---|---|---|---|---|---|
| 10.1 | GWF-022 Snowflakes on the Window | 2-4 → 2-4 | Creative | C04, C07, M04 | tap_scene, sequence, trace_draw |
| 10.2 | GWF-036 The Rhyme Garden | 4-6 → 4+ | Language | L02, L01, L09, C07 | choose, music_audio, trace_draw |
| 10.3 | GWF-074 The Midnight Mapmakers | 6-8 → 4+ | Creative | C07, C02, C06, C08, S04 | choose, sequence, navigate, trace_draw |

¹ No picture plan yet in ai-tools (plan job failed or never ran); step 1 of its stage re-runs
`learning-batch`.

Totals by wave: 7 · 9 · 8 · 11 · 6 · 6 · 7 · 8 · 10 · 3 = 75. Challenges by family across all
75: choose 115, tap_scene 41, sequence 37, music_audio 24, quantities 20, assign_sort 17,
authored_sim 16, snap_build 16, navigate 11, trace_draw 3 (computed from `books_75.json` and
`mechanics.json` on 2026-11-09).

The wave order is a recommendation, not a constraint: a book moves earlier the moment every
family it needs is built. Stage 0 and the engine of each wave are the only code work; every
book stage is content, validation and device evidence.

---

## 9. What the first wave proves

Wave 1 is the MVP-A gate. Before wave 2 starts:

- GWF-006 plays on iPhone (landscape) and iPad (both ways) from a `cms-stories/` folder: read,
  three challenges each played and each skipped, Reduce Motion on and off; the skip path shows
  the character's resolution and records nothing.
- The same `story-data.json` round-trips through the gateway (Java model keeps the field;
  `contract-fixtures` checksum parity holds).
- All 14 languages render the challenge copy at the book's two reading levels.
- Budgets: a 15-page book under 25 MB delivered (15 masters ≤ 1.2 MB each as lossless WebP is
  the ai-tools default; measure, and switch to lossy WebP for backgrounds if the install or
  download numbers need it); first challenge mount under 400 ms (PHASE-10 §11).
- Watched with at least three families, one per band, before wave 2 (PHASE-10 §13.4).

---

## 10. Reusability: adding book 76

A new book is a folder: `story-data.json` with its `learningChallenge` pages, art, and the
validator passing. No engine change unless it uses a family that does not exist, which the
validator refuses. A new **mechanic** within an existing family is a catalogue entry (both repos'
`mechanics.json`) and its `adapter` parameters; a new **family** is an engine, planned like a
wave. A different brand or world is the same contract with its own art (PHASE-5 white-label).

---

## 11. Risks

| Risk | Detail | Response |
|---|---|---|
| **Export path is broken for these books today** | §8 stage 0, ai-tools items | Fix before wave 1; nothing else can start |
| **Reader cover fit** | The new books are full-screen 4:3 with bottom narration; the reader scales from the centre and the ai-tools blocker stays until it is built | Stage 0, this repo; one reader change, every book benefits |
| **Skip counts as completion** | `use-music-challenge.ts:948-955` | Fix in stage 0 for music too; L3 depends on it |
| **Firestore drops the new field** | Typed Java model | Change the three models together; contract-fixture test |
| **Size** | 75 books × 15 pages; bundled books today cost 16–17 MB; one CMS image is 70.9 MB (a bug, not a budget) | CMS-only delivery, no new bundled books; per-book budget in §9; fix the 70 MB page |
| **Translation quality** | All 13 languages are `machine_draft`; Latin, Arabic and Japanese rhyming verse for toddlers is the weakest fit | Offer a language only after a fluent reviewer signs off (ai-tools D77); ship English first with the others hidden by `review_status` |
| **Science and phonics content review** | The package requires expert review of `authored_sim` states and `L03/L05/L09/L10` phonics before release | Waves 3 and 6 carry that review in step 2; phonics stays English-first (PHASE-10 §17) |
| **`cms-stories-sync.yml` runs on `main` only** | mvp uploads need `workflow_dispatch` or a dev-target run | Decision §12 |
| **Two catalogues drift** | ai-tools and this repo each hold `mechanics.json` | The vendored copy carries ai-tools' `version`; the validator fails when a book's mechanic is missing or its family differs |
| **Band shift** | A 6-8 book in `4+` reads above some four-year-olds | The book is shown as `4+`; the grown-up reads with the child (co-engagement); the `2-4` rung exists if the band is lowered |
| **Legacy books** | *Snuggle Little Wombat*, *Hold On, Juni*, *My Turn to Ding* have no challenge plans in this format | Not in the 75; retrofit after MVP-C using PHASE-11's ten plans as the brief |

---

## 12. Decisions for the operator

| # | Decision | Recommendation |
|---|---|---|
| 1 | Challenge metadata inline on the page (§5.1) rather than as a `GamePack` per challenge | Inline: content travels with the book; packs stay for island free play |
| 2 | Engine chosen by `family`, with `mechanicId`/`adapter` as parameters | Yes; the validator refuses unknown families |
| 3 | Wave order (§8): Choose → Scene → Sequence → Music → Sort → Sim → Quantities → Build → Navigate → Draw | Yes; it is the order that ships the most books soonest |
| 4 | Uploads from mvp: a dev-target `workflow_dispatch` run of `cms-stories-sync.yml`, or wait for merges to `main` | Dev-target dispatch, dry-run first, per stage |
| 5 | Languages: ship English and hide `machine_draft` languages until reviewed, or ship all 14 as drafts | English first; a language goes live per book on sign-off |
| 6 | Bundle none of the 75 (CMS-only) | Yes; the install stays under PHASE-10's 160 MB |
| 7 | PHASE-11 branch (`claude/learning-games-mvp-stories-c5f953`): fold its validator into §5.3 and drop its 18-mechanic catalogue and ten legacy plans | Fold the validator; keep the plans as the brief for the legacy retrofit (§11) |
| 8 | The handoff branch `claude/games-integration-handoff-01643b` (scene runtime, `make-pack.py`): review and land before wave 2, or rebuild Scene on mvp | Review it in stage 0; land what the Scene engine needs |

---

## 13. Relationship to earlier phases

- **PHASE-10** stands: the shell, the engine contract, packs for island games, budgets, privacy,
  personalised weeks. This plan adds the page launch it left for M3, chooses engines by family
  and puts challenge copy in story data (§5.1 explains the one deviation).
- **PHASE-11** (unpushed) proposed 18 mechanics for 10 legacy stories. Its cadence (every third
  page, never the last), skip rule and "page is the backdrop" principle are kept; its catalogue is
  replaced by the 60-mechanic expert catalogue the content was written against.
- **PHASE-9** supplies the syllabus language parents see; the catalogue's 27 skills map onto it.
- **ai-tools** `LEARNING-GAMES.md` is the content contract; `delivery-plan.md` D73–D79 record how
  the 75 books were made. This document is the app-side half.

## Appendix A. Files this plan touches

New: `types/learning-challenge.ts` (or in `types/story.ts`), `components/experience/engines/{choose,scene,make}/`,
`components/experience/engines/place/{ordered-slots,counters,snap}.ts`, `components/stories/learning-challenge-host.tsx`,
`gateway-service/.../model/LearningChallenge.java`, `scripts/lib/learning-challenges.js` (+ test),
`scripts/learning/mechanics.json`, `scripts/generate-plan-units.js`, `.maestro/flows/core/story-page-challenge.yaml`,
`scripts/cms-stories/<75 slugs>/`.

Changed: `types/story.ts`, `gateway-service/.../model/StoryPage.java`, `scripts/story-schema.json`,
`components/stories/story-book-reader.tsx`, `components/experience/{shell-state,experience-shell}.tsx`,
`hooks/use-music-challenge.ts`, `store/app-store.ts` (`ChallengeKind`), `services/pack-validation.ts`,
`data/plan-units.ts`, `services/plan-builder.ts`, `types/learning-plan.ts`, `contract-fixtures/`,
`compliance/ASSET-REGISTER.md`, `ARCHITECTURE.md`, `QA-AUTOMATION.md`, root `AGENTS.md`.

In ai-tools: `image_gen_browser/production.py`, `export/cms_story.py`, `story_factory.py` (edit regions for
challenge pages), `render` of item cut-outs, `LEARNING-GAMES.md` (pointer to this plan).
