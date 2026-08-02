---
title: "Fitting existing functionality into the Story Garden"
type: design
status: proposed
branch: mvp
updated: 2026-07-29
---

# Fitting existing functionality into the Story Garden

The walkthrough covers the happy path: choose a book, open it, read, close it. The app does considerably more than that. This is an audit of everything the current build supports and a recommendation for where each piece lives in the new UI.

> Audited against `d787351`. Main has moved and its UI differs — treat the inventory as "what existed when the garden was designed", and re-check each row during the re-audit.

---

## Inventory

| Capability | Where it lives today | Covered by the garden? |
|---|---|---|
| **Read mode** — read together, text on screen | reading mode `read` | ✅ **Read Together** |
| **Narrate mode** — play a recorded family voice | reading mode `narrate` | ⚠️ Partly — only ever offers the *first* voice |
| **Record mode** — parent records their voice per page | reading mode `record` | ❌ Button exists but routes to settings, not the recorder |
| **Touch hotspots** | `interactive_state_change` pages | ✅ Rebuilt as the pause-and-notice rhythm |
| **Music challenges** — instrument, note sequence, blow detection | `music_challenge` pages | ❌ No discovery |
| **Jigsaw puzzles** — 2×2 / 4×4 | `jigsaw_puzzle` pages | ❌ No discovery |
| **Reading challenges** — fill-in-blank, spell-word | `reading_challenge` pages | ❌ No discovery |
| **Compare languages** — dual text boxes | reader settings menu | ✅ Behind revealed controls |
| **Font size** | reader settings menu | ✅ Behind revealed controls |
| **Favourites** | heart on catalogue cards | ❌ Dropped |
| **Catalogue / downloads** — stories not yet on device | `CatalogStoryCard`, download limits per tier | ❌ Invisible; garden filters to `isAvailable` |
| **Premium locks / subscription** | `SubscriptionOverlay`, `StoryAccessService` | ❌ No path |
| **Delete a downloaded story** | long-press → implode | ❌ Dropped (was parent-only anyway) |
| **Screen time** | `ScreenTimeProvider` | ✅ Unaffected, wraps everything |

Four of these are genuine holes. The rest are fine or deliberately parent-side.

---

## 1 · Record mode — fix the intent, not the design

**Problem.** `Record a Voice` on the focused book currently passes through the parents-only gate and then opens the *account screen*. But recording isn't a setting — it's a way of reading the book. The parent reads aloud, the app captures audio per page, with overwrite prompts and playback.

**Recommendation.** Keep the button exactly where it is and change where it goes: after the gate, enter the reader in `record` mode for that story. This is a one-line intent change — `requestGardenOpen(story, 'record', voiceOver)` instead of routing to account.

Voice-over *management* — naming, re-recording, deleting — stays in parent corner. Creating one is a reading mode; curating them is admin.

## 2 · Narrate with more than one voice

**Problem.** `FocusedBook` takes `voiceOvers[0]`. A family with Mum, Dad and Grandma recordings can only ever hear Mum.

**Recommendation.** Preserve "two large choices" — do not add a third button.

- The **Listen** button names the *most recently used* voice for that story (needs one new field: `lastVoiceOverId` per story, alongside `storyProgress`).
- When more than one exists, a subordinate line appears beneath it — same visual weight as `Record a Voice` — reading **"or Dad, Grandma"**. Tapping it swaps the voice and updates the main button.

The child still sees two big choices. The extra voices are discoverable but never compete.

## 3 · Music, jigsaw and reading challenges

**Problem.** These are the app's most distinctive features and the garden gives no way to find them. The old UI used filter chips — which the brief explicitly removes.

**The tension.** A fifth "Play Along" shelf would break the one-story-one-place rule and duplicate books across shelves. Chips are out. But burying them entirely in parent corner makes them undiscoverable to a child who loves the musical ones.

**Recommendation — a quiet capability mark, in one place only.** Detect capability with the existing helpers (`storyHasMusic`, `storyHasJigsaw`, `storyIsLearning`) and show a single small symbol on the **focused book**, not on the shelf:

- a note for music
- a puzzle piece for jigsaw
- a letter for reading challenges

Rationale: shelves stay calm and uniform; the mark appears at exactly the moment a choice is being made, when it is useful rather than decorative. One symbol maximum — a story with music *and* a puzzle shows the first only.

For the parent who wants to browse by capability, that belongs in parent corner as a proper list. **Open question for you: is finding "a musical story" a child need or a parent need?** My read is parent — the child picks by cover — but you know your users.

## 4 · New stories, downloads and premium

**Problem.** The garden shows only downloaded books. Undownloaded catalogue entries, premium locks and download quotas have no representation, so new content is invisible and there is no purchase path.

**Recommendation.** Downloads consume quota and may need money, so the *action* is parent-side — but *awareness* should not be. Add one tile at the end of each shelf:

- **"More stories"** — a book-shaped tile in outline rather than artwork, visually clearly not-a-book
- tapping it passes the parents-only gate into the parent corner catalogue, where the existing download / limit / subscription flows run unchanged

This keeps every existing service (`CatalogService`, `StoryAccessService`, `SubscriptionOverlay`) intact behind the gate, and costs the child nothing — an outline tile at the end of a finite shelf reads as "that's all for now", which is the honest message.

## 5 · Favourites

**Recommendation.** Reinstate as a pinned shelf above the four places, shown **only when non-empty**, styled like Continue Reading. Favouriting itself moves to the focused book as a third subordinate line (`Put Back` / `Record a Voice` / a heart).

Lower confidence on this one: with 3–5 books per shelf and four shelves, the whole library is ~20 books. Favourites may be solving a problem that curation already solved. **Worth deferring until the shelves are real.**

---

## What this adds up to

| Change | Size | Confidence |
|---|---|---|
| Record button enters record mode | ~5 lines | High — it's a bug, not a design question |
| Voice switcher line under Listen | ~40 lines + 1 store field | High |
| Capability mark on focused book | ~30 lines, reuses existing helpers | Medium — depends on child-vs-parent answer |
| "More stories" tile → parent catalogue | ~60 lines, reuses all existing services | High |
| Favourites shelf | ~50 lines | Low — recommend deferring |

Nothing here disturbs the opening ritual, the orientation bridge or the reader. All five are additions at the two ends of the journey: the focused book, and the shelf.

---

## Recommended order

1. **Record mode** — it's a defect and it's tiny.
2. **"More stories" tile** — without it there is no content-discovery path at all, which blocks any real trial.
3. **Voice switcher** — the familiar-voice feature is the emotional core; supporting one voice undersells it.
4. **Capability mark** — after you answer the child-vs-parent question.
5. **Favourites** — defer until the shelves exist and you can see whether it's needed.
