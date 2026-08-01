---
title: "Porting the Story Garden onto a moved main"
type: plan
status: proposed
branch: mvp
updated: 2026-07-29
---

# Porting the Story Garden onto a moved main

## Situation

- This clone last fetched **21 July**. Local `main` and the remote-tracking `origin/main` both sit at `d787351`, so git here believes it is current — it is not. The real `origin/main` has moved and, per your note, carries a **different UI**.
- The Story Garden work was audited and built against `d787351`. Nothing was ever committed; it exists only as working-tree changes.
- Those changes now sit on the new **`mvp`** branch, intact: 26 modified files, 24 new paths.

**I could not verify any of this against the real main** — the device bridge has no network, so I cannot fetch. Everything below is derived from what I changed, not from what main now contains.

---

## The shape of the work — and why this is more tractable than it looks

| Tier | What | Size | Conflict risk on a changed main |
|---|---|---|---|
| **1 · Additive** | 20 new files: the whole Story Garden UI, the hooks, the reader chrome, all tests | ~2,400 lines | **None.** Nothing in the repo references them except the 5 files in Tier 3 |
| **2 · Mechanical** | 14 locales, `store/app-store.ts`, jest config/setup/mocks, `ARCHITECTURE.md` | ~600 lines, all insertions | **Very low.** Pure additions at stable anchors |
| **3 · Integration** | 5 existing files | **+192 / −25** | **This is the whole risk** |

The UI itself is Tier 1. **The catalogue, the opening ritual, the reader chrome and the closing ritual are all new files that cannot conflict with anything.** What has to be re-done is only the handful of small edits that wire them in.

---

## Tier 3 in full — the only files that need thought

Re-apply these **by intent, not by patch**. Each is small, and a 3-way merge against a restructured file will produce worse results than redoing the edit deliberately.

### 1. `components/stories/simple-story-screen.tsx` · +11 / −0
The feature-flag switch. Reads `useStoryGarden` from the store and returns `<StoryGardenScreen/>` instead of the legacy catalogue.

**Risk: highest of the five.** This file is a 26-line shim around `StorySelectionScreen`. If main's new UI replaced or removed it, the flag needs a new home — wherever the catalogue is now mounted. Find the single place the catalogue screen is rendered; that is the seam.

### 2. `contexts/story-transition-context.tsx` · +28 / −0
Purely additive: a `GardenOpenRequest` type, `gardenOpenRequest` state, and `requestGardenOpen` / `clearGardenOpen` on the context value. Touches no existing logic.

**Risk: low unless the context was rewritten.** If main replaced this transition system entirely, the seam changes shape: the garden needs *some* way to say "mount the reader with this story, mode and voice". That one sentence is the whole contract.

### 3. `app/_layout.tsx` · +19 / −21
Three edits:
- both orientation effects now call `applyDefaultOrientation()` from `hooks/use-story-orientation`
- one new effect observing `gardenOpenRequest` to mount the reader
- one prop on the stories screen routing Parent corner to `account`

**Risk: medium.** If main restructured the navigation state machine, redo each by intent. The orientation consolidation is worth keeping regardless of the garden — it is a fix in its own right.

### 4. `components/stories/story-book-reader.tsx` · +102 / −3
The largest integration, all flag-guarded:
- imports + `useStoryGarden`, `setStoryProgress`, `markStoryCompleted`, `useReducedMotion`, `useAutoHideControls`, `useInteractionRhythm`
- `PageEdgeNavigation` rendered before the controls layer, `edgesEnabled` off on pages with hotspots
- existing controls wrapped in `ReaderControlsLayer` (with `passthrough` when the flag is off, so the legacy tree is unchanged)
- page content wrapped in a tap-to-reveal `Pressable`
- two effects: persist reading progress, begin the hotspot observation
- closing ritual shown on completion instead of exiting

**Risk: medium-high, but contained.** Every hook must be declared *after* `const pages = story.pages || []` — that ordering caused a real `used before declaration` error first time round.

### 5. `components/stories/interactive-element.tsx` · +32 / −1
Adds `calmHighlight`, `isInvited`, `onActed` props and a branch that replaces the two infinite `withRepeat` loops with a single soft `withTiming` highlight. With `calmHighlight` false the original behaviour is untouched.

**Risk: low.** Self-contained within one `useEffect`.

---

## Recommended sequence

1. **You, on your Mac** (I cannot do these — no network, and the mount blocks writes inside `.git`):
   ```
   rm .git/index.lock                              # stale, zero-byte, from 28 Jul
   git branch -D landscape-ui-storybook-covers     # I could not remove the ref
   git fetch origin
   git log --oneline main..origin/main             # how far has it moved?
   ```

2. **Rebase `mvp` onto the real main.** The tree is dirty, so stash first, or let me hold the work as a patch and reapply.

3. **Re-audit before re-integrating.** The plan's §1 audit describes a catalogue and reader that may no longer exist. Point me at the new UI and I will redo that audit — it is the input to every Tier 3 decision, and porting on top of a stale audit is the one thing that would genuinely waste the work.

4. **Land Tier 1 + Tier 2 first.** They apply cleanly and are inert: no new file is reachable until the flag switch in Tier 3 exists. This can go in as one quiet commit.

5. **Then Tier 3, one file at a time**, each verified by its tests.

---

## What to reconsider while re-auditing

- **The cover crop — resolved in principle.** The live render showed cover artwork has the **title baked into the image** (verified against the raw 2732×2048 asset), so a 3:4 centre-crop keeps 56% of the width and slices it to "nuggle Littl / Wombat". Decision taken: **covers will be re-cut without embedded text.** That makes the crop safe and frees the shelf to use portrait books.

  Consequence: the UI becomes the *only* thing that names a story, so the metadata path is now load-bearing. It is verified — `__tests__/components/story-garden/story-title-localisation.test.tsx` (16 tests) asserts that `ShelfBook`, `ContinueReadingBook` and `FocusedBook` all render `localizedTitle` for en/pl/ja/ar, fall back to English for an untranslated language, fall back to `story.title` when there is no `localizedTitle` at all, and expose the localised title as the accessibility label. Story data already carries `localizedTitle` and `localizedDescription` for all 14 languages.

  Two knock-on notes for the re-audit: (a) baked-in titles were English-only, so removing them also fixes a real localisation defect that predates this work; (b) with art-only covers, only the *centred* shelf book is named — neighbours are deliberately untitled, which was fine when the image carried the title and should be sanity-checked on a device.
- **`jest.config.js` skip narrowing.** I un-skipped `__tests__/components/stories/` in CI. Whether that still holds depends on main's tests.
- **The selector-aware store mock.** `jest.setup.js` / `jest.setup-after-env.js` previously returned the whole state object regardless of selector. The fix is worth keeping on any main — it was masking real breakage.

---

## Backups

Three copies of everything, none dependent on this session:

| Location | Contents |
|---|---|
| `_xfer/story-garden-backup.tar.gz` | every changed and new file (738 KB) |
| `_xfer/story-garden-tracked.patch` | `git diff HEAD` of the 26 modified files (52 KB) |
| device `/tmp/` | same two files |

`_xfer/` and `grow-with-freya/_to_delete/` and `grow-with-freya/harness/` are all scratch — delete them once the port is done.
