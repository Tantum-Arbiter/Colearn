---
title: "Story Garden — Catalogue, Book-Opening Ritual & Landscape Reader"
type: plan
status: proposed
owner: CoLearn
branch: landscape-ui-storybook-covers
tags: [frontend, ux, stories, catalogue, orientation, reader]
updated: 2026-07-28
---

# Story Garden

> North star: **"Choose a book, open a world."**
> Explore a shelf → choose a book → lift it from the shelf → open the cover → rotate together → enter the story.
> The orientation change happens *inside* that metaphor. The app never appears to vanish and reload in landscape.

This plan replaces the conventional catalogue (grid + filter chips + long-press preview + mode-selection overlay) with a spatial, ritualised flow. It is written to be executed in order; each phase is independently shippable behind a flag.

---

## 1. Current state — verified audit

All claims below are file + line verified on `landscape-ui-storybook-covers` at time of writing.

### 1.1 Catalogue — `components/stories/story-selection-screen.tsx` (1684 lines)

| Concern | Evidence |
|---|---|
| Small landscape tiles, not book covers | Lines 179–188: `CARD_WIDTH = 176`, `CARD_HEIGHT = 132`; `GRID_CARD_WIDTH = (screenWidth - 32 - 12) / 2`, `GRID_CARD_HEIGHT = GRID_CARD_WIDTH * 0.75` |
| Child-facing type filters | Lines 93–107: `StoryTypeFilter = 'musical' \| 'interactive' \| 'jigsaw'`, `STORY_TYPE_FILTERS` chip config |
| Child-facing tag filters (15) | Lines 524–528: `filterTags: StoryFilterTag[]` — `calming, bedtime, adventure, learning, music, family, creativity, animals, friendship, nature, fantasy, counting, emotions, silly, rhymes` |
| Interactive sub-filters | Lines 125–131, 481–489: `InteractiveSubFilter = 'touch' \| 'learning'` |
| Long-press as a primary interaction | Lines 579–585: `handleLongPress` → `setPreviewStory` + `setIsPreviewVisible` |
| Carousel ↔ grid toggle | Lines 558–571: `handleViewModeToggle`, backed by `storyViewMode` in the Zustand store |
| Continuous background animation | Lines 1144–1163: per-star `Animated.View` driven by a shared `starAnimatedStyle` |
| Nine genre rows, free inertial scroll | Lines 1284–1316 (carousel) / 1347–1408 (grid), each a `FlatList` inside an outer `ScrollView` |

### 1.2 Selection transition — `contexts/story-transition-context.tsx` (2400+ lines)

The good news: a book-lift-to-centre transition already exists and is close in spirit to the focused-book state this plan wants.

| Concern | Evidence |
|---|---|
| Cinematic lift already implemented | Line 44: `MOVE_TO_CENTER_DURATION = 1600`; line 45: `BUTTONS_DELAY = 400` |
| Mode selection is a separate overlay layer | Line 52 `showModeSelection`; render blocks at lines 1566, 1594, 1648, 1778, 1873 |
| Familiar-voice narration already wired here | Lines 143–147, 1305–1315: `availableVoiceOvers`, `voiceRecordingService.getVoiceOversForStory` |
| **Rotation is a technical event, not a story beat** | Lines 442–500 in `selectModeAndBegin`: `lockAsync(LANDSCAPE)` → `await sleep(300)` → re-read `Dimensions.get('window')` → recompute target → animate 200ms |
| Opening is fast and mechanical | Lines 429–433: `BUTTON_EXIT_DURATION = 300`, `ROTATION_DURATION = 300`, `COVER_FLIP_DURATION = 200`, `HOLD_AFTER_FLIP = 100`, `SCALE_DURATION = 200` |
| No fallback if the child never rotates | The `lockAsync` forces rotation; there is no "Read this way" path |

The rotation sequence is the single biggest offender against the north star: fixed `setTimeout` sleeps around a `lockAsync` mean the book is *repositioned after* the OS has already swung the whole UI. That is what makes it read as an interruption.

### 1.3 Reader — `components/stories/story-book-reader.tsx` (5039 lines)

| Concern | Evidence |
|---|---|
| Persistent chrome during reading | Bottom UI panel renders unconditionally for `currentPageIndex > 0` (~line 2513 onward): prev/next chevrons at `scaledButtonSize(50)`, centre text box, settings menu at lines 2440–2505 |
| Own orientation listener | Lines 735–775: `getOrientationAsync`, `addOrientationChangeListener`, `lockAsync(LANDSCAPE)`, `lockAsync(PORTRAIT_UP)` on exit |
| Page nav is chevron buttons only | `handleNextPage` (line 1899) / `handlePreviousPage` (line 1973) bound to the two nav `Pressable`s; no edge-tap or corner affordance |

### 1.4 Interactive elements — `components/stories/interactive-element.tsx`

Lines 132–177: infinite `withRepeat` on both `glowOpacity` and `indicatorScale`, golden `GLOW_COLOR = '#FFD700'`. Every hotspot advertises itself permanently and simultaneously — precisely the "mobile-game button" feel to remove.

### 1.5 Orientation ownership — `app/_layout.tsx`

Lines 200–245: two effects lock `PORTRAIT_UP` on phones / `unlockAsync` on tablets, keyed off `currentView !== 'story-reader'` (`AppView` union at line 168). Orientation is therefore controlled from **three** places today — `_layout`, the transition context, and the reader. Consolidating this is a prerequisite for a believable rotation bridge.

### 1.6 Gaps with no existing implementation

| Gap | Evidence | Consequence for this plan |
|---|---|---|
| **No per-story reading progress** | `store/app-store.ts` persists `favoriteStoryIds` (70), `readStoryIds` (75), `lastReadDate` (82), `storyViewMode` (86). Grep for `lastPageIndex\|resumePage\|storyProgress\|continueReading` returns nothing. | "Continue Reading" and the ribbon bookmark need a new persisted slice. |
| **No reduced-motion support** | Grep for `isReduceMotionEnabled\|reduceMotion\|prefersReducedMotion` across the app returns nothing. | The accessibility path in §7 is net-new, not a variant. |
| **Covers are 4:3 landscape, not portrait** | `assets/stories/snuggle-little-wombat/cover/cover-large.webp` = 2732×2048. | Shapes the shelf design — see §2.2 and the open decision in §11. |
| **`thumbnail.webp` is not a thumbnail** | Same story: `thumbnail.webp` is also 2732×2048. | Shelf rendering will decode full-resolution art per visible cover. Needs a pipeline fix or `expo-image` sizing discipline. |

---

## 2. Design decisions taken

### 2.1 Rollout: feature-flagged parallel build

A new `components/stories/story-garden-screen.tsx` is built alongside the existing screen. A store flag switches between them. The 65 KB legacy screen and its tests stay untouched until the new path is validated with real children, then are deleted in one commit (§10).

Rationale: `story-selection-screen.tsx` also owns catalogue downloads, the bubble-swap animation, delete/implode, subscription gating and download-limit alerts (lines 442–456, 593–631, 633–680). Those are load-bearing and orthogonal to the UX change; rewriting them in the same pass is where this goes wrong.

### 2.2 Shelves: a curated mapping layer, not a schema change

Four story places map onto the nine existing `StoryCategory` values (`types/story.ts:229`) in one config file. No CMS, Firestore, gateway or story-JSON change.

| Story place | Categories | Tone |
|---|---|---|
| Sunny Meadow | `adventure`, `activities` | bright, active, daytime |
| Woodland Path | `nature`, `friendship` | curious, walking-pace |
| Cosy Corner | `learning`, `growing`, `music` | close, warm, shared |
| Moonlit Stories | `bedtime`, `fantasy` | slow, dark palette, wind-down |

Every category maps to exactly one place, so no story can appear twice. A story whose category is missing from the map falls back to Cosy Corner and logs a warning — new categories then surface loudly rather than vanishing.

### 2.3 Covers are centre-cropped from 4:3 landscape into portrait books

**Decided.** Covers ship as 4:3 landscape (§1.6). The shelf presents each one as a portrait **3:4** object and lets the image centre-crop to fill it — a classical bookshelf immediately, with no art pass and no CMS change. Mechanically this is `expo-image` with `contentFit="cover"` inside a portrait container, the same primitive the legacy card already uses (`story-selection-screen.tsx:347-353`).

This keeps the brief's original sizing, which assumed portrait covers:

| | Ratio of usable width | On a 390 pt phone |
|---|---|---|
| Shelf book | **0.52** (brief: 45–55%) | 203 × 270 pt |
| Focused book | **0.68** (brief: 65–75%) | 265 × 354 pt |

The cost: the crop discards roughly the outer 44% of each cover's width. Production guidance already calls for a strong central focal point, so the important content should survive — but the shelf is the first place a badly-composed cover will show. Worth eyeballing the catalogue once the flag is on. If specific covers crop badly the fallback is a per-story `coverPortrait` override, not a re-cut of every cover.

### 2.4 One place owns orientation

A new `hooks/use-story-orientation.ts` becomes the single owner. `app/_layout.tsx` keeps only the app-launch default; the transition context and reader consume the hook and never call `ScreenOrientation` directly.

---

## 3. Phase 0 — Foundations

No visible change. Everything later depends on this.

**New files**

- `constants/story-places.ts` — `StoryPlace` type, `STORY_PLACES` ordered definition (id, i18n key, category list, scenery asset, palette), `getPlaceForCategory(category)` with fallback + warn.
- `constants/story-garden-motion.ts` — single source of truth for every duration and easing in this plan. No magic numbers in components. Seeded from §12.
- `hooks/use-reduced-motion.ts` — `AccessibilityInfo.isReduceMotionEnabled()` + change subscription, returns `{ reduceMotion }`. Manual mock added to `__mocks__/` in the same PR (AGENTS.md §2).
- `hooks/use-story-orientation.ts` — `lockLandscape()`, `lockPortrait()`, `current`, `isSettling`; wraps `expo-screen-orientation` and resolves on the real `orientationChange` event rather than a fixed sleep.

**Changed files**

- `store/app-store.ts` — add persisted `storyProgress: Record<string, { pageIndex: number; totalPages: number; updatedAt: string; completedCount: number }>` plus `setStoryProgress`, `clearStoryProgress`, and a derived `getContinueReadingStoryId()`. Add to the `partialize` list (line ~328). Add `useStoryGarden: boolean` flag (default `false`).
- `app/_layout.tsx` — orientation effects (lines 200–245) delegate to `use-story-orientation`; keep the launch default only.

**Tests (write first)**

- `__tests__/constants/story-places.test.ts` — `it.each` over all nine `StoryCategory` values asserting exactly one place; unknown category → Cosy Corner + warn.
- `__tests__/hooks/use-reduced-motion.test.ts` — initial value, subscription update, unsubscribe on unmount.
- `__tests__/hooks/use-story-orientation.test.ts` — resolves on the emitted change event, not a timer; rejects/settles on timeout; no-op when already in target orientation (tablet case).
- `__tests__/store/story-progress.test.ts` — set/clear, persistence shape, `getContinueReadingStoryId` picks most recent incomplete.

---

## 4. Phase 1 — The Story Garden (portrait catalogue)

**New files**

- `components/stories/story-garden/story-garden-screen.tsx` — the screen. Greeting, Continue Reading book, four shelves, Parent Corner entry.
- `components/stories/story-garden/story-shelf.tsx` — one horizontal snap shelf.
- `components/stories/story-garden/shelf-book.tsx` — one book on a shelf (cover + spine edge + shadow + bookmark ribbon).
- `components/stories/story-garden/continue-reading-book.tsx` — the large single book with a visible ribbon.
- `components/stories/story-garden/garden-greeting.tsx` — time-of-day greeting + "Which story shall we share?".
- `components/stories/story-garden/index.ts`.

**Layout (portrait)**

```
Good evening, Freya
Which story shall we share?

      [ Continue Reading book, ribbon visible ]

───── Sunny Meadow ─────
   ‹   [ PRIMARY BOOK ]   ›
        Title (centred book only)

───── Woodland Path ─────
   ‹   [ PRIMARY BOOK ]   ›

───── Cosy Corner ─────
───── Moonlit Stories ─────

              Parent corner
```

**Shelf behaviour**

- `Animated.FlatList` horizontal, `snapToInterval = itemWidth + gap`, `decelerationRate="fast"`, `disableIntervalMomentum` — one short drag moves exactly one book, never two.
- `contentContainerStyle` side padding = `(screenWidth - itemWidth) / 2` so the centred book is truly centred and neighbours peek.
- Scroll offset in a shared value → `useAnimatedStyle` per item: centred item `scale: 1.10` (within the 8–12% brief), neighbours `scale: 1.0` with `opacity: 0.82`.
- Title renders under the centred book only, `opacity` interpolated from the same offset.
- Three to five books per shelf. Finite and curated: no pagination, no infinite append, natural stop at the last book.
- On snap settle: a single light `Haptics.impactAsync(Light)`. Not per-frame.

**Explicitly removed from the child view**

No search bar, no tag chips, no type-filter chips, no interactive sub-filters, no grid/carousel toggle, no long-press. Those move to Parent Corner (§9).

**Background restraint**

Static illustrated shelf scenery per place. The per-star `withRepeat` loop (lines 1144–1163) does **not** carry over. At most one slow ambient element for the whole screen, paused when any transition is in flight and disabled entirely under reduced motion.

**Tests**

- `__tests__/components/stories/story-garden/story-shelf.test.tsx` — renders N books; `snapToInterval` equals item pitch; centred index updates on scroll event; title visible only for centred index; last-item stop.
- `story-garden-screen.test.tsx` — four shelves in `STORY_PLACES` order; empty place is omitted, not rendered blank; Continue Reading absent when no progress; greeting varies by hour (mocked clock).
- Assert on i18n **keys**, per AGENTS.md §2.

**i18n** — new `storyGarden` block in `locales/en/index.ts` (place names, greetings, "Which story shall we share?", "Continue reading", "Parent corner"). English first; the other 13 locales follow via `scripts/TRANSLATIONS.md` tooling.

---

## 5. Phase 2 — The focused-book state

Replaces the mode-selection overlay. Tapping a cover never opens a modal.

**Sequence** (constants live in `story-garden-motion.ts`)

| Window | Beat |
|---|---|
| 0–120 ms | Touch acknowledgement: book compresses 2%; soft paper/wood "tup"; **no** sparks, **no** reward animation |
| 120–450 ms | Lift: book rises off the shelf, shadow deepens, neighbours recede and soften, environment dims ~15% |
| 450–750 ms | Focus: cover moves to centre, grows to ~86% of width (§2.3), shelf scenery drifts down and defocuses, title + one-sentence premise appear |

Then two large choices, and only two:

- **Read Together**
- **Listen** → becomes **Listen to Mum / Listen to Dad / Listen to Luke** when `voiceRecordingService.getVoiceOversForStory(storyId)` returns a recording. This promotes the strongest validated feature out of settings and into the ritual.

A small, visually subordinate **Record a Voice** control sits below, gated by the existing `use-parents-only-challenge` hook. Below that, **Put Back** to dismiss.

**Implementation**

Extend `contexts/story-transition-context.tsx` rather than rewrite it — the lift-to-centre machinery (lines 380–412), voice-over loading (1305–1315) and shared values already exist. Add a `focusedBook` phase that supersedes `showModeSelection` when `useStoryGarden` is on, and retire `MOVE_TO_CENTER_DURATION = 1600` in favour of the 750 ms staged sequence above.

New: `components/stories/story-garden/focused-book.tsx` for the presentation layer, so the context keeps state and the component keeps JSX.

**Tests** — `__tests__/components/stories/story-garden/focused-book.test.tsx`: two primary actions only; Listen label reflects the voice-over name; Record a Voice is behind the parents-only gate; Put Back restores the shelf; reduced motion skips lift and cross-fades instead.

---

## 6. Phase 3 — The orientation bridge

**Principle: do not rotate the catalogue UI. Rotate the world behind an already-open book.**

The book is one continuously-rendered object across the whole sequence. It is never unmounted, never re-mounted, never replaced by a loading state.

**Stage A — Cover expansion in portrait (~350 ms)**
Title and buttons fade out. Cover enlarges to near-fill portrait. Background becomes a soft defocused wash of the story's dominant colours. Cue appears: *"Turn the screen together"* with a simple device silhouette — an invitation to co-use, not a command.

**Stage B — Begin opening before rotation (~250 ms)**
Front cover swings 20–30° toward the right; a glimpse of endpaper shows; ambient story audio starts quietly; the book stays centred and recognisable. *Only now* does the app request landscape.

**Stage C — Rotation bridge (driven by the device, not a timer)**
The book stays the same rendered object, held visually upright relative to the viewer by counter-rotating it against the reported device orientation. The background gradient and scenery rotate and expand behind it. The opening angle interpolates toward fully-open as the device approaches landscape. No blank frame, no spinner, no newly mounted screen.

This is the part that replaces `await sleep(300)` (line 458). The counter-rotation is driven by a shared value fed from orientation/dimension change events via `use-story-orientation`, so the book's apparent stability is frame-accurate rather than approximated.

**Stage D — Settle into landscape (~400 ms)**
Open book expands laterally, page edges pass beyond the screen, the inner spread becomes the full-bleed first illustration, the spine softens away, narration begins after a short pause.

**Total perceived duration ≈ 900–1200 ms**, excluding however long the family takes to physically turn the device. Longer than the 300–400 ms house standard for ordinary transitions — deliberately, because this is a ritual, not navigation.

**Never trap the family (§ brief item 4)**
After ~2000 ms in Stage B with no rotation, reveal two choices:

- **Turn the screen**
- **Read this way** → opens a simplified portrait reader showing one cropped illustration panel at a time, using the 4:3 art's central story-safe area.

Landscape stays the better experience; the child never learns they did it wrong.

**Tablets** — already unlocked (`_layout.tsx` line 210). If the device is already landscape, Stages A–C collapse into a single 400 ms cover-opens-in-place beat. No cue, no rotation request.

**New files**

- `components/stories/story-garden/book-opening-bridge.tsx` — the persistent book object across A–D.
- `components/stories/story-garden/portrait-reader.tsx` — the "Read this way" fallback.

**Tests** — `__tests__/components/stories/story-garden/book-opening-bridge.test.tsx`: the book element keeps a stable identity across the orientation change (assert same `testID` node, no unmount); the escape choices appear after the timeout; "Read this way" mounts the portrait reader and never calls `lockAsync`; already-landscape devices skip the cue.

---

## 7. Accessibility & reduced motion

When `useReducedMotion()` is true, throughout every phase:

- Replace the dimensional book opening with a soft cover-to-page dissolve.
- Fade portrait → landscape over 250–350 ms.
- No rotation simulation, no parallax, no page curl.
- Shelf snap becomes an instant index change with a cross-fade; no scale interpolation.
- Ambient background motion off entirely.

This is a first-class branch in `story-garden-motion.ts`, not a set of scattered `if` statements.

---

## 8. Phase 4 — The landscape reader

### 8.1 Default reading state

Only four things on screen:

- Full-bleed illustration
- Floating narration card
- A subtle page-corner / page-edge affordance
- The optional interactive object for that page

Persistent home, settings, music and grid buttons are hidden. The chevron nav buttons and settings gear currently rendered unconditionally (`story-book-reader.tsx` ~2513, 2440–2505) become part of the revealed control set.

### 8.2 Revealed controls

A single tap on a quiet area reveals: Close book · Audio/narration control · Page overview · Parent settings · Progress. They fade out again after 4–5 s of no input.

New: `components/stories/reader/reader-controls-layer.tsx` (auto-hide timer, fade in/out, tap-to-reveal) and `hooks/use-auto-hide-controls.ts`. This is a *wrapper* around existing controls — the underlying handlers in the 5039-line reader are not rewritten.

### 8.3 Page navigation — three ways, no precision required

- Tap the right or left page edge (full-height edge zones)
- Gentle swipe
- Tap a visible rounded page corner

Every affordance gets a **≥ 56–64 pt invisible touch area**, larger than its visible mark.

Page transition: slight translation + subtle paper shadow + small corner deformation, **400–550 ms**. Explicitly *not* a physics-heavy realistic curl — it makes interaction unpredictable and hides the artwork.

**Tests** — edge tap, swipe and corner tap all reach `handleNextPage`; touch target ≥ 56 pt; controls hide after the timeout and reveal on tap; controls do not reveal on a page-turn gesture.

---

## 9. Phase 5 — "Pause and notice" interactions

Replaces the always-on golden pulse (`interactive-element.tsx` lines 132–177).

**Rhythm**

1. Narration plays
2. Page stays still for a short observation period
3. Narration gently invites the interaction
4. The object receives **one** soft highlight
5. The child performs **one** meaningful action
6. The page settles again

**Rules**

- One active hotspot at a time — never simultaneous.
- No constant bouncing, no repeating pulses, no confetti after every interaction, no overlapping audio.
- The highlight is diegetic: a scarf gains a faint lifted edge; a gate dot develops a soft ring; a toy casts a slightly brighter shadow; a cart rocks once and stops.

**Changes** — `interactive-element.tsx`: remove both `withRepeat` loops; add a `hint` state machine (`dormant → invited → highlighted → acted → settled`) driven by narration progress. New `hooks/use-interaction-rhythm.ts` sequences hotspots on a page.

**Tests** — only one element in `invited` at a time; no `withRepeat` in the animation path (assert the reanimated mock never receives it); highlight fires once per page visit; hotspot still reachable if narration is muted.

---

## 10. Phase 6 — Closing the book, and cleanup

### 10.1 The closing ritual (reverses the same metaphor)

1. Narration finishes
2. Scene holds still for one comfortable breath (~800 ms)
3. Page edges become visible again
4. Book closes gently
5. Closed cover shrinks toward centre
6. App transitions back to portrait
7. Book returns to its **exact** position on its shelf, bookmark updated

Two immediate actions, no more:

- **Read Again**
- **Put It Back** — replaces "Exit" / "Return to Catalogue" everywhere in the child-facing copy.

After the book is back on the shelf, one restrained completion mark: a ribbon, a tiny leaf, or a small star stitched onto the bookmark. **No points, streaks, trophies or daily rewards.**

Returning to the exact shelf position requires the origin layout to survive the round trip. The transition context already stores `originalCardPosition` (line 118) — extend it with the shelf id and index so the shelf can be scrolled to the right offset *before* the book lands.

### 10.2 Cleanup (only after the flag flips on)

Delete `story-selection-screen.tsx`, `story-preview-modal.tsx` (long-press preview), `catalog-story-card.tsx` if unreferenced, the `storyViewMode` store slice and its toggle, and the `showModeSelection` branch of the transition context. Per AGENTS.md §6: migrate every scenario in the corresponding test files first, and **ask before deleting**.

Update `ARCHITECTURE.md` (component tree + a new "Story Garden & orientation bridge" section) and `CLAUDE.md` if the orientation convention line changes.

### 10.3 Parent Corner

Everything removed from the child path lands here, behind the existing `use-parents-only-challenge` gate: categories and search, downloads and download limits, language, narration configuration, purchases/subscription, and voice-recording management. Reuse the existing handlers from the legacy screen rather than reimplementing them.

---

## 11. Open decisions

1. ~~**Cover aspect ratio.**~~ **Decided — centre-crop 4:3 into portrait 3:4 (§2.3).** Revisit only if specific covers crop badly on the shelf.
2. **`thumbnail.webp` is full-resolution** (2732×2048, identical to `cover-large.webp`). A shelf shows 3–5 covers at once, so this is a real decode cost. Either fix the pipeline in `scripts/` to emit a true thumbnail, or constrain via `expo-image` `contentFit` + explicit `recyclingKey` and accept the memory. Recommend fixing the pipeline.
3. **Ambient audio in Stage B.** Starting story audio before landscape is reached is lovely but interacts with the existing background music fade (`_layout.tsx` lines 465–480) and the global sound context. Needs a short spike.
4. **Plan file location.** This document is at `grow-with-freya/STORY-GARDEN.md`, alongside `ARCHITECTURE.md` and `MUSIC_FEATURE.md`. Move to a root `PHASE-7-*.md` if you'd rather it sit with the roadmap docs.

---

## 12. Motion constants (single source of truth)

To live in `constants/story-garden-motion.ts`. Reduced-motion values in the last column.

| Beat | Duration | Easing | Reduced motion |
|---|---|---|---|
| Shelf snap settle | 260 ms | `out(cubic)` | 0 ms, cross-fade 150 ms |
| Touch acknowledgement | 120 ms | `out(quad)` | 120 ms, no scale |
| Book lift | 330 ms | `out(cubic)` | skip |
| Focus settle | 300 ms | `inOut(cubic)` | fade 200 ms |
| Stage A cover expansion | 350 ms | `inOut(cubic)` | fade 250 ms |
| Stage B pre-open | 250 ms | `out(cubic)` | skip |
| Stage C rotation bridge | device-driven | — | fade 300 ms |
| Stage D landscape settle | 400 ms | `out(cubic)` | fade 300 ms |
| **Total open ritual** | **≈ 900–1200 ms** | | ≈ 300 ms |
| Page turn | 400–550 ms | `inOut(cubic)` | cross-fade 250 ms |
| Controls reveal / hide | 200 ms / 300 ms | `out(quad)` | unchanged |
| Auto-hide delay | 4500 ms | — | unchanged |
| Closing breath | 800 ms | — | 400 ms |
| Book close + return | 700 ms | `inOut(cubic)` | fade 300 ms |
| Ordinary navigation (house standard, unchanged) | 300–400 ms | | |

---

## 13. Preserve / change ledger

**Preserve** — portrait app shell with landscape story reader · soft illustrated environments · familiar-voice narration · large touch targets · floating narration panel · gentle audio and low-stimulation motion · parent–child co-engagement · 4:3 landscape artwork with central safe areas · predictable page interaction.

**Change** — generic story grid → spatial shelves · child-facing filter chips removed · long-press removed as a primary interaction · mode-selection modal → focused-book state · continuous background animation stopped · orientation change becomes part of opening the book · utility navigation hidden during reading · "Exit" → "Close Book" / "Put It Back" · finite curated shelves instead of endless scrolling.

---

## 14. Sequencing & validation

| Phase | Scope | Gate | Status |
|---|---|---|---|
| 0 | Foundations, flag off | `npm run validate` green; no UI change observable | **Built** — 73 tests |
| 1 | Story Garden behind flag | Flag on internally; 3–5 books per shelf render at 60 fps on the oldest supported device | **Built** — 56 tests |
| 2 | Focused-book state | Mode-selection overlay unreachable when flag is on | **Built** |
| 3 | Orientation bridge | Book element identity stable across rotation (test-asserted); escape hatch reachable | **Built** |
| 4 | Reader chrome | Default state shows four elements only; all three nav methods work | **Built** |
| 5 | Interaction rhythm | No `withRepeat` remains in the interactive-element path when the flag is on | **Built** |
| 6 | Closing ritual | Two choices, "Put It Back" copy, one restrained completion mark | **Built** |
| 6b | Legacy cleanup | Legacy screen deleted only after every test scenario is migrated | **Deliberately not done** — see below |

### What was built in phases 0–1

**Phase 0 — foundations** (`constants/story-places.ts`, `constants/story-garden-motion.ts`, `hooks/use-reduced-motion.ts`, `hooks/use-story-orientation.ts`, `store/app-store.ts`, `app/_layout.tsx`, `__mocks__/expo-screen-orientation.js`). The orientation hook resolves on the emitted `orientationChange` event with a 1500 ms fallback, replacing the fixed `setTimeout` pattern; `_layout` now delegates both orientation effects to `applyDefaultOrientation()`. The store gains a persisted `storyProgress` map plus the `useStoryGarden` flag, default `false`.

**Phase 1 — the garden** (`components/stories/story-garden/*`, `components/stories/simple-story-screen.tsx`, `locales/en/index.ts`). `SimpleStoryScreen` is the single mount point for the catalogue, so it is where the flag switches between the legacy grid and the garden — no `_layout` surgery. Shelves snap by exactly one book pitch (`snapToInterval` + `disableIntervalMomentum` + `decelerationRate="fast"`), the centred book grows 10% and is the only one titled, and the per-star `withRepeat` loop from the legacy screen is not carried over.

### What was built in phases 2–6

**The seam.** Rather than reworking the 2400-line transition context, it gained one small addition: `requestGardenOpen(story, mode, voiceOver)` and a `gardenOpenRequest` value that `app/_layout.tsx` reacts to in a single effect. The garden owns its entire opening ritual and only uses the context as plumbing to mount the reader. The legacy `startTransition` → `selectModeAndBegin` path is untouched.

**Phase 2 — focused book.** `hooks/use-book-opening.ts` is the state machine (`idle → lifting → focused → expanding → preOpen → bridging → settling → open`), with `openPortrait` as the escape terminal. `focused-book.tsx` presents exactly two primary choices; when `voiceRecordingService.getVoiceOversForStory` returns a recording the second becomes "Listen to Mum" and selects `narrate` with that voice. Record a Voice is present but visually subordinate.

**Phase 3 — orientation bridge.** Landscape is requested only *after* the book has begun opening — asserted directly: at the end of `coverExpansion` the machine is in `preOpen` and `lockLandscape` has not yet been called. The escape appears after 2 s and "Read this way" locks portrait rather than leaving a half-applied landscape lock. A device already in landscape never sees the cue.

**Phase 4 — reader chrome.** `use-auto-hide-controls.ts` plus `reader-controls-layer.tsx` (which drops `pointerEvents` and hides itself from assistive technology when away) and `page-edge-navigation.tsx` (edge zones and a page corner, both ≥ 56 pt). Wired into `story-book-reader.tsx` behind the flag: the existing controls are wrapped rather than rewritten, and the page area becomes a tap-to-reveal quiet area.

**Phase 5 — interaction rhythm.** `use-interaction-rhythm.ts` sequences one hotspot at a time through `dormant → invited → highlighted → acted → settled`. `interactive-element.tsx` gains a `calmHighlight` mode that replaces both infinite `withRepeat` loops with a single soft `withTiming` highlight. With the flag off the original pulsing is byte-identical.

**Phase 6 — closing ritual.** `book-closing.tsx`: a held breath, the book closes, then exactly two choices — Read Again and Put It Back. One ribbon as the completion mark; tests assert the copy never mentions points, streaks, trophies or "Exit". Reading progress is now persisted from the reader, so the ribbon bookmark and Continue Reading reflect reality.

**Wiring.** The closing ritual is mounted by the reader: on the final page, `handleStoryCompletion` shows `BookClosing` instead of exiting immediately — Read Again resets to page 1, Put It Back exits to the garden. Parent corner and Record a Voice route through `SimpleStoryScreen` → `_layout` to the account screen, both gated by `useParentsOnlyChallenge` first, so a child cannot tap from a storybook straight into settings.

**No backend or API change.** Verified against the diff, not assumed: no file under `services/`, `types/story.ts`, `gateway-service/`, `scripts/` or `func-tests/` is touched, and the diff introduces no `fetch`/`ApiClient` call, endpoint path, URL or sync field. The two new store keys (`storyProgress`, `useStoryGarden`) are AsyncStorage-only — `profile-sync-service` writes backend→local and never reads them, so they cannot reach a request payload. The Java↔TypeScript model sync required by CLAUDE.md is therefore unaffected.

**Not done: deleting the legacy screen.** `story-selection-screen.tsx`, `story-preview-modal.tsx` and the `storyViewMode` slice are all still in place. AGENTS.md §6 requires asking before deleting a file, and the flag is still off — nothing has been validated with real children yet. This is the one piece of §10.2 left, and it should stay left until the garden has been used.

### Defects found in self-review (and fixed)

A review pass over the finished diff found three problems the phase tests had not caught:

1. **Timer stacking in the interaction rhythm.** `useInteractionRhythm` returned a fresh object literal every render, and the reader's effect listed that object as a dependency — so `beginObservation()` fired on *every* render, scheduling two nested timers each time. A test confirmed four pending timers where there should be one. Fixed three ways: the returned controller is now `useMemo`-stable, `beginObservation` is idempotent per hotspot via a ref guard, and the guard resets on page change. This mattered: piled-up timers make the "one soft highlight" arrive at a non-deterministic moment, which is the exact opposite of the calm rhythm the brief asks for.
2. **Impure state updaters.** `useAutoHideControls.keepAlive` called `startTimer()` inside a `setVisible` updater, and `StoryShelf` called `onCentredIndexChange` inside a `setCentredIndex` updater. Neither is an observable bug today, but React 19 double-invokes updaters in StrictMode, so both would fire twice. Both now read state and act outside the updater.
3. **The lift was not a lift.** The overlay covered the shelf with a fully opaque gradient from the moment a book was tapped, so "the book rises from the shelf, neighbouring books move back and soften, the environment dims by approximately 15%" was invisible — it cross-faded to a book already centred, which is close to the modal this was meant to replace. The scrim is now separated from the content and animates to `environmentDim` (0.15) during the lift, reaching full only once the book starts opening. The book's shelf rectangle is measured on tap and threaded through as `origin`, so the focused book interpolates position and scale from where it actually sat.

A second pass over the reader integration (edits made into a 5039-line file) found one more:

4. **Edge zones could swallow an interactive object.** `PageEdgeNavigation` renders after `pageContent`, so its full-height 64 pt left/right Pressables paint *above* the illustration — any hotspot within 64 pt of an edge became untappable. The edges are now dropped on pages that carry interactive elements (`edgesEnabled={currentHotspotIds.length === 0}`); the page corner stays, so there is always a way forward.

**Known deviation from the brief: there is no swipe.** §8.3 asks for three page-turn methods; the reader has never had swipe navigation and this work did not add it. The garden path therefore offers edge tap (non-interactive pages), the page corner (always), and the revealed chevrons. Adding swipe is not free: `InteractiveElementType` includes `'drag'`, so a page-turn pan would fight drag hotspots. That needs a design call rather than a quiet implementation.

### The legacy path is structurally untouched

Every Story Garden change in the reader is behind `useStoryGarden` — except, originally, the `ReaderControlsLayer` wrapper, which was added to the tree unconditionally and merely rendered permanently visible when the flag was off. That was the one structural change reaching existing users. It now takes a `passthrough` prop and renders `<>{children}</>` when the flag is off, so with the flag down the reader's tree is exactly what it was. A test asserts the wrapper is absent in that mode.

### End-to-end coverage of the journey

Every phase had unit tests, but nothing covered the wiring *between* them — the handoff spans four files and is the highest-risk path in this work. `__tests__/components/story-garden/story-garden-journey.test.tsx` now drives the whole thing: shelf tap → lift → focused book → chosen mode → landscape requested → `requestGardenOpen` called with the right story, mode and voice. It also pins the two rules that matter most:

- orientation is untouched while the child is still choosing;
- landscape is requested only *after* the book has begun opening (asserted on both sides of the `preOpen` boundary).

The `bookRef.current.measure(...)` call is guarded with a `typeof … === 'function'` check — a throw there would break every book tap, and the fallback (lift without an origin) is harmless.

**The motion still needs eyes on a device.** Tests can assert that the origin is threaded and the scrim value is 0.15; they cannot tell you whether the lift *feels* like picking up a book. That judgement needs a build.

### Incidental test-infrastructure fixes

Four pre-existing problems surfaced while integrating and were fixed, because the new code hit the same gaps:

- **The global `useAppStore` mock ignored its selector**, so `useAppStore(s => s.markStoryAsRead)` returned the whole state object. Both `jest.setup.js` and `jest.setup-after-env.js` are now selector-aware, and carry the store keys the reader actually reads.
- **`__DEV__` was never defined** in the Jest environment.
- **The `expo-image` mock lacked `prefetch`**, which the reader calls on mount.
- With those fixed, `story-book-reader.test.tsx` passes, so `jest.config.js` no longer skips the whole `__tests__/components/stories/` directory in CI — only `book-card.test.tsx`, which fails to parse for unrelated reasons. **This widens what CI runs; revert that one line if the reader test proves flaky.**

### Testing notes for anyone extending this

Two environment quirks cost time and are worth knowing before writing the next suite:

- **`getByTestId` and `getByText` do not resolve.** `jest.config.js` maps `react-native` → `react-native-web`, so host nodes are DOM elements carrying `data-testid`, not RN components carrying `testID`. Use `UNSAFE_queryAllByProps({ testID })` and a `textContents(view)` helper built on `UNSAFE_queryAllByType(Text)`. The existing suite's use of `getByLabelText` and `toJSON` is the same workaround.
- **`__tests__/components/stories/` is skipped entirely in CI** (`jest.config.js` `testPathIgnorePatterns`). Story Garden tests therefore live in `__tests__/components/story-garden/` so they actually run. Worth deciding separately whether the `stories/` skip should be lifted.
- **The app store is globally mocked** in `jest.setup.js` with a selector-ignoring `jest.fn()`. Suites that exercise real store behaviour need `jest.requireActual`; suites rendering components that call `useAppStore(selector)` need a local selector-aware mock.
- **`__tests__/services/i18n.test.ts` enforces deep key parity across all 14 locales.** An English-only string block fails 14 tests immediately. Every new key must land in `en` plus the other 13 at the same time. Key *order* doesn't matter, only presence, so appending a block before the closing brace of each locale file is safe.
- **ESLint cannot run inside a mounted-folder session** — `unrs-resolver` needs a linux-arm64 native binding that isn't in a macOS-installed `node_modules`, and there's no network to fetch it. Run `npm run lint` on the host.
- **A full `tsc --noEmit` is impractical over the mounted filesystem** (>20 min, no output). A scoped `tsconfig` listing just the changed files plus `types/svg.d.ts` type-checks the same graph in ~30 s. One was used here and then moved to `grow-with-freya/_to_delete/` — delete that folder.

Every phase follows the AGENTS.md workflow: failing test first → minimum code → green → refactor → `npm run type-check`. `npm run validate` before any push. No new code comments. TypeScript strict, no `any`. Tablet and phone branches covered via the `useAccessibility()` mock. Offline behaviour unchanged — the garden reads from the same `StoryLoader` cache the current screen uses.

**Not covered by this plan** — backend, CMS, Firestore or gateway changes; new story artwork; subscription/paywall logic; the music, jigsaw and reading-challenge UIs beyond the hotspot rhythm in §9.
