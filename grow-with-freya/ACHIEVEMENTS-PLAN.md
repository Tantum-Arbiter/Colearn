---
title: "Achievements — badges that grow with a shelf we cannot see yet"
type: plan
status: partially-built
branch: mvp
updated: 2026-09-24
---

# Achievements plan

> A plan for badges and rewards across a catalogue of books that will keep growing after
> this is built. It has to do two things at once: bring families back and make a small child
> feel rewarded, *and* stay inside the house rules — co-engagement, calm UX, no addictive
> mechanics ([`CLAUDE.md`](../CLAUDE.md)), and the governing principle of the Progress page:
> **nothing may imply a child is behind, losing, or required to return.** Where a proven
> engagement mechanic conflicts with those rules, this plan says so and picks the calm
> version on purpose.

**Status: the recognition layer is built; the collection layer is not.**

Phase 1 landed in part. The app now remembers *when* a badge was earned, knows what is new
since the family last visited, and celebrates it — but on the **home screen**, not at the
end of the story as this plan specified, and stamped at **home-visit time** rather than at
the moment of earning. See *§5.1 As built* for the deviation and what it costs. The event
ledger (§6.1), rules-as-data (§6.2), story stickers (§4.1) and every family in §4.4–§4.8
are still plan only.

---

## 1. What exists today

Verified in the repo on 2026-09-07.

### 1.1 The badge model — unchanged since this plan was written

| Piece | Where | What it does |
|---|---|---|
| Sixteen badges, five categories | `components/progress/progress-model.ts:124` `BADGE_DEFINITIONS` | Each badge is a target count over an `ActivityCounters` field (stories read, bedtime reads, kind reads, categories explored, favourites, sessions by activity and time of day) |
| Weekly + monthly challenge | `buildChallenges` | One of each, picked deterministically by ISO week / month from small pools |
| Three milestones | `progress-model.ts:257` `MILESTONE_DEFINITIONS` | Booleans over the same counters |
| Counters | `components/progress/use-progress-data.ts` `deriveCounters` | Derived on every render from `readStoryIds`, `favoriteStoryIds`, the story list, and 30 days of `ScreenTimeService` sessions (`activity: 'story' \| 'emotions' \| 'music'`) |
| Reading state in the store | `store/app-store.ts` | `readStoryIds` (opened), `storyProgress[id]` with `pageIndex`, `totalPages`, `completedCount` (finished), `readingStreak`, `longestStreak`, `lastReadDate`, `totalStoriesRead` |
| Story metadata badges can key on | `types/story.ts` | `category`, `tags[]`, `ageRange`, `duration`, page `interactionType` (`music_challenge`, `jigsaw_puzzle`, `reading_challenge`) |

### 1.2 The recognition layer — built 2026-09-06/07

| Piece | Where | What it does |
|---|---|---|
| Earned-at ledger | `store/app-store.ts:107` `achievementUnlockedAt: Record<badgeId, ISO string>` | The §6.3 store. **Write-once** — `recordAchievementUnlocks` (`:378`) filters to ids with no stamp and returns state unchanged if there are none, so a date can never be rewritten. Persisted via `partialize` (`:455`) |
| Last completion | `store/app-store.ts:108` `lastStoryCompletedAt` | Written by `markStoryCompleted` (`:361`), persisted (`:456`). The only time-stamped *reading* fact in the store |
| Newest earned | `components/home/use-child-home-data.ts:165` `newestEarned` | Picks the most recently stamped earned badge for the home welcome |
| Next achievement | `pickNextAchievement` | The goal-gradient invitation: the closest unearned badge with its `current / required` and unit |
| New since last visit | `use-child-home-data.ts:195–205` | `hasNewAchievement` — an earned badge whose stamp is missing or newer than `previousVisitAt`. Drives `celebrateAchievement` and the welcome copy |
| Badge surfaces | `badge-card.tsx`, `badge-artwork.tsx`, `badge-progress.tsx`, `badge-category-bar.tsx`, `badge-detail-sheet.tsx`, `challenge-card.tsx`, `milestone-card.tsx` | One card renders every state (`undiscovered` → `started` → `in_progress` → `earned`); a browsable, category-filtered badge library; the detail sheet carries a single recommendation that deep-links into the catalogue |
| Tests | `__tests__/store/home-visits.test.ts`, `__tests__/components/home/use-child-home-data.test.tsx`, `__tests__/components/progress/*` (10 files) | Write-once semantics, new-since-last-visit, and every badge surface |

### 1.3 What is still missing, and why it matters

- **Nothing is per book.** Every badge is a count over categories. A new book arriving in
  the catalogue adds nothing to collect; a well-loved book read twenty times is
  indistinguishable from one opened once. This is the gap that matters most for a growing
  shelf, and nothing built so far touches it.
- **"Read" still means opened.** `markStoryAsRead` fires on open
  (`story-book-reader.tsx:720`) and appends to `readStoryIds`; `deriveCounters` reads
  `storiesRead: readStoryIds.length`. Finishing is `markStoryCompleted` (`:944`) and now
  writes `lastStoryCompletedAt`, but **no badge consumes completion**. A child who taps
  into five books and out again still "reads" five stories.
- **Badges are code.** Adding one is a definition in `progress-model.ts` plus two i18n
  keys — fine for sixteen, wrong for a catalogue the CMS grows without an app release.
- **Earned-at is approximate.** See §5.1.

---

## 2. Why people come back — and which of those levers we pull

The mechanisms that reliably bring people back and make them feel rewarded, what the
evidence says, and whether each belongs in an app used by a parent and a child under six.
**Bold** = we use it. ~~Struck~~ = we decline it on purpose, with the reason.

| Mechanism | Evidence | Verdict for Early Roots |
|---|---|---|
| **Endowed progress** — a goal that already shows some progress is pursued harder than one at zero | Nunes & Drèze 2006: loyalty cards pre-stamped 2 of 10 were completed by 34% vs 19% for 0 of 8 | **Use.** The first story of any theme lights that theme's badge to `started`; a new book's own sticker shows the cover in outline the moment it is installed. |
| **Goal gradient** — effort rises as the goal nears | Kivetz, Urminsky & Zheng 2006: coffee-card purchases accelerated approaching the free cup | **Use, gently — built.** The detail sheet shows `k / n`, and `pickNextAchievement` now surfaces the closest badge on the home screen as an *invitation*, never a countdown. |
| **Zeigarnik / set completion** — open loops and near-complete sets pull attention | Zeigarnik 1927; the whole sticker-album trade | **Use.** Per-book stickers in a scrapbook; series and character sets that fill in as books are read. This is the mechanism that scales to books we do not know yet. |
| **Peak–end rule** — an experience is judged by its peak and its end | Fredrickson & Kahneman 1993 | **Use.** The reward moment belongs at the *end of the story*, after the last page, never mid-read and never on the shelf. That is where a memory is made. **Not yet honoured — see §5.1.** |
| **Habit anchoring / implementation intentions** — a fixed cue ("after bath") beats willpower | Gollwitzer 1999 | **Use.** Bedtime is the anchor. "Tonight's story" is offered at the child's usual story time; the Screen Time schedule reminders are the delivery channel, opt-in. |
| **Fresh-start effect** — people begin anew at temporal landmarks | Dai, Milkman & Riis 2014 | **Use.** Monthly and seasonal collections open on the first of the month and at each season, and never close (see FOMO below). |
| **Relatedness / autonomy / competence** (self-determination theory) | Ryan & Deci 2000 | **Use, as the frame for all copy.** Every badge names something the child *can do* or *did together*. Never "you must". |
| **IKEA effect** — we value what we helped make | Norton, Mochon & Ariely 2012 | **Use.** A recording made in Record mode becomes a keepsake on the book's sticker: "read by Mum, 12 March". The reward is the family's own voice. |
| Sticker charts for under-sixes | Standard early-years practice; effective for concrete, immediate, *specific* behaviours | **Use, with the caveat below.** Stickers for *finishing a story together*, not for opening the app. |
| ~~Contingent extrinsic rewards for an intrinsically enjoyable act~~ | Deci 1971; Lepper, Greene & Nisbett 1973 (overjustification): expected rewards for drawing reduced children's later drawing | **Decline the *contingent* form.** No "read to get a badge". Badges are *recognition after the fact*, framed as a memory, and unexpected on first encounter. Unexpected rewards did not show the overjustification drop. |
| ~~Variable-ratio reward (loot boxes, mystery chests)~~ | Skinner; the strongest known re-engagement schedule — and the one behind gambling | **Decline.** Prohibited by `CLAUDE.md` (no addictive mechanics). Every reward is deterministic and legible: the child can see exactly what will happen next. |
| ~~Streak with loss~~ (Duolingo-style) | Very effective; also the source of the most complained-about pressure in consumer apps | **Decline the loss.** We keep the *count* of "nights together" (already in the store as `readingStreak`) but it never resets in the child's view, never warns, never freezes. It only ever grows or rests. |
| ~~Countdowns, limited-time, FOMO~~ | Effective; prohibited by the Progress page's governing principle | **Decline.** Seasonal sets recur every year and stay collectable. |
| ~~Leaderboards, social comparison~~ | Effective for adults; harmful for small children and a privacy liability (COPPA / UK-GDPR) | **Decline.** All achievement data stays on the device. |
| ~~Pay to unlock badges~~ | — | **Decline.** Subscription gates *books*, never *recognition*. A free family can earn every badge available to the books they have. |

The honest summary: the mechanics that bring adults back hardest are the ones we will not
ship. What remains — collection, progress that already exists, a ritual anchor, and a warm
ending — is the set that works for a family at bedtime, and the evidence for each is old
and solid.

---

## 3. Design principles for this plan

1. **The book is the badge.** The unit of collection is the story itself. A catalogue of
   unknown future books needs no new badge code: each book arrives with its own sticker.
2. **Rules, not titles.** Every family of badge is a rule over metadata the CMS already
   carries (`category`, `tags`, page `interactionType`, `ageRange`, `duration`) plus two
   fields it will need (`series`, `characters`). A book qualifies for a badge by what it
   is, never by what it is called.
3. **Recognition, not payment.** Copy describes what happened ("You finished three bedtime
   stories together") and what is possible ("Ready whenever you are"). Never what is owed.
4. **The end of the story is the stage.** Rewards appear after the last page, with the
   book still open, at reading pace. The shelf and the Progress page only ever *remember*.
5. **Nothing is ever lost.** No badge, sticker, streak or set can go backwards. Deleting a
   book from the device keeps its sticker.
6. **Everything is on the device.** No achievement leaves the phone. Analytics, if the
   parent has consented, sees only aggregate counts with no story titles.

---

## 4. The badge families

Each family is a rule template. The CMS supplies the values; the app evaluates them against
a local event ledger (§6.1). Families marked **auto** need no CMS entry at all — they
generate from the catalogue. **None of §4.1 and §4.4–§4.8 is built.**

### 4.1 Story stickers — auto, one per book

Every installed book has a sticker: its cover, greyed to an outline until the book is
finished together, then in full colour with the date. This is the collectible that scales
to any shelf. States:

| State | Trigger | Treatment |
|---|---|---|
| Waiting | book installed | cover outline, dashed halo (reuses `undiscovered`) |
| Begun | past the cover (`storyProgress.pageIndex > 0`) | soft rim (`started`) |
| Finished | `markStoryCompleted` | full colour, gold rim, date of the first finish |
| Well-loved | finished 5 times | a small heart on the sticker; copy "a favourite in this house" |
| In your voice | a Record-mode recording exists for it | the family's own recording, playable from the sticker |

### 4.2 Theme badges — rule: finish *n* books carrying tag *t*

Generalises today's Bedtime Listener / Adventure Explorer / Kind Moments. One definition
per **theme tag** (`STORY_FILTER_TAGS`), three tiers each (1, 3, 7), named from the tag's
own copy so a new tag brings its own badge: "Moonlight Reader" (bedtime), "Brave Heart"
(adventure), "Gentle Heart" (calming), "Big Feelings" (emotions), and so on. Tiers show as
one badge that deepens (bronze → silver → gold rim), not three badges — fifteen theme tags
times three would bury the grid.

### 4.3 Variety badges — rule: finish books across *n* distinct tags / categories

Today's New Worlds and Curious Mind, kept, but counting *finished* books. Tiers 3, 5, 8.

### 4.4 Series and character sets — rule: finish every book in set *s*

Needs two CMS fields (§7). A series ("Wombat's Year", four books) is a sticker page with
four slots; each finished book fills one. A character set ("Every story with Wombat")
collects across series. Set completion is the strongest Zeigarnik pull we have and it only
gets stronger as the catalogue grows.

### 4.5 Doing badges — rule: complete *n* page challenges of kind *k*

Keyed on page `interactionType`, so any future book with a jigsaw, a spelling challenge or
a music challenge feeds them: "Puzzle Piece" (jigsaw), "Word Builder" (reading challenge),
"Little Musician" (music challenge). Tiers 1, 5, 15. Today's music badges count sessions,
not challenges; these are about *doing something in a book*.

### 4.6 Together badges — rule: the family did something only a family can

- **Storyteller** — first recording made in Record mode; then 3, then 10 books recorded.
- **Two voices** — the same book recorded by two different names (Record mode already
  asks for a name).
- **Read to me** — a Play Along session using a family recording rather than the app's.
- **Our story time** — story time on 3, 10, 30 different days (the `readingStreak` family,
  restated as a count of days that never falls).

### 4.7 Rhythm badges — rule: sessions in a time window

Today's Morning Explorer / Gentle Evening, kept as they are. They are the habit-anchor
badges: "Bedtime, seven nights" is a count of *distinct evenings*, over any span.

### 4.8 Seasonal sets — rule: finish *n* books tagged *season* while that season is on

The one place a date appears. Sets recur every year and remain collectable out of season
at the same rule — the season only decides *which set is offered first*. No expiry, no
"last chance".

---

## 5. The reward moment

This is what "feel rewarded" means for a three-year-old on a lap at 7pm.

**Where.** After the last page, with the book still open. Never on the shelf, never as a
popup over the catalogue, never mid-story (a badge interrupting a page is a broken spell).

**What.** At most one moment per story finish, in this order of precedence:
1. The book's own sticker coming to life — the cover fills with colour, a soft chime, the
   date writes itself in. Every finish of a new book gets this; it is the peak.
2. A set slot filling (series / character).
3. A theme or doing badge deepening a tier.
4. Nothing further — extra badges earned in the same finish are shown as "new" on the
   Progress page, not stacked into a fanfare.

**How it feels.** The house motion language: a lift and settle, one gentle sparkle, no
confetti cannon, no "ACHIEVEMENT UNLOCKED". Copy in the second person plural: "You finished
Snuggle Little Wombat together." The parent is in the sentence.

**Then.** A single quiet line beneath: what is *possible* next, drawn from the goal-gradient
rule — "One more bedtime story and Moonlight Reader comes alive." Or, if nothing is close,
"Ready whenever you are." Never "come back tomorrow".

**The scrapbook.** Earned things settle into the Progress page as memories with dates.
Stickers get a page of their own — the album — sorted with the newest at the top,
well-loved books marked, recordings playable.

### 5.1 As built — the moment landed on the home screen

What shipped is a **returning-user celebration**, not an end-of-story one. On mounting the
home dashboard, `use-child-home-data.ts` stamps every currently-earned badge, compares the
stamps against `previousVisitAt`, and sets `celebrateAchievement` with the newest badge and
the closest next one.

Two consequences, both real:

- **The peak is in the wrong place.** The peak–end rule puts the memory at the end of the
  story. A celebration on next launch is a *reminder* of a reward, not the reward. The
  `StoryFinishedMoment` component in §6.4 is still unbuilt, and until it exists the
  strongest mechanic in §2 is only half-collected. The home celebration is worth keeping
  regardless — it is the "what is new since you were here" surface — but it is not a
  substitute.
- **The dates are approximate.** `recordAchievementUnlocks` is called on home mount, so a
  badge earned during Tuesday's bedtime story is stamped whenever the family next opens
  the home screen — possibly Thursday. Write-once means the wrong date is then permanent.
  For the "earned on a Tuesday in March" copy in the scrapbook this is a defect, and it
  gets worse the longer the ledger runs. **Fix before the album ships:** stamp at the point
  of earning inside the reader, and treat home-mount stamping as a backstop for badges
  earned outside a story.

---

## 6. Architecture

### 6.1 Facts, not a ledger — *built (Phase 8 D5, D6)*

The dated event ledger this section used to propose was **dropped** (PHASE-8-BACKEND-ALIGNMENT.md
§5, D5–D6). Badges are judged from outcomes, which are small, merge cleanly across devices
and carry no timestamps off the phone:

| Fact | Store field | Written by |
|---|---|---|
| Books finished (not merely opened) | `finishedStoryIds` | `markStoryCompleted`, via `useAchievementEvents().storyFinished` in the reader |
| Page challenges done, per kind | `challengeCounts` (`music`, `jigsaw`, `reading`) | `recordChallengeCompleted`, from the reader's music, jigsaw and reading completions |
| Badges earned | `earnedAchievementIds` | `grantAchievements` (story awards) and `recordAchievementUnlocks` (evaluated badges) |

All three ride on the child document (`/api/children/{id}`): union for the id lists, max
for the counts, so a badge earned on one phone is earned on every phone and never taken
away. `achievementUnlockedAt` stays device-only for the "new since you were last here"
moment. The store is persisted at `version: 1`; the migration from version 0 counts as
finished every book with `completedCount > 0` (decision 5, below).

Session-based badges (rhythm, weekly/monthly) still read the device's screen-time history
through `deriveCounters`.

### 6.2 Badge definitions as data — *built (Phase 8 D1–D4)*

`components/progress/achievements.ts`:

```ts
type AchievementRule =
  | { kind: 'counter'; counter: keyof ActivityCounters; target: number }   // the bundled sixteen
  | { kind: 'finishedCount'; target: number }
  | { kind: 'finishedInCategory'; category: string; target: number }
  | { kind: 'finishedWithTag'; tags: string[]; target: number }
  | { kind: 'finishedDistinct'; by: 'tag' | 'category'; target: number }
  | { kind: 'challenges'; interaction: 'music' | 'jigsaw' | 'reading'; target: number }
  | { kind: 'storyAward' };                                                // granted by a book
```

`evaluateAchievements(definitions, facts, catalogue, { appVersion, language })` returns the
`Badge` shape every surface already renders. It keeps earned badges earned, hides retired
badges nobody earned, skips rule kinds and `minAppVersion` gates this build does not
understand, and localises CMS copy with English fallback.

Two layers:
- **Bundled** — `BUNDLED_ACHIEVEMENTS`, the sixteen original badges with identical thresholds
  and their i18n keys. The offline and first-run fallback.
- **CMS** — JSON files in `scripts/cms-achievements/`, validated by `cms achievements`
  (schema `scripts/achievement-schema.json`), uploaded by
  `scripts/upload-achievements-to-firestore.js` to `achievement_definitions/{id}` with a
  checksum index in `content_versions/current.achievementChecksums`. Delta sync sends the
  device's checksums and receives only changed definitions and removed ids
  (`AchievementDefinitionsService`). A CMS definition replaces the bundled one of the same
  id when its `version` is at least the bundled version.

CMS art is either an asset path, fetched once through `/api/assets/batch-urls` and shown
from disk, or one of the art keys the app carries (`contract-fixtures/badge-bundled-art.json`).

Not built from the old list: `recorded`, `sessionsInWindow`, `daysTogether`, `finishedSet`,
tiers and `season`. They wait for §4.4, §4.6 and §4.8.

### 6.3 Earned-at, and what is new — *built*

`achievementUnlockedAt: Record<badgeId, string>` in the store, written the first time a
badge's status becomes `earned` and never rewritten. It drives the newest-badge card, the
"new since you were last here" celebration, and — once §5.1 is fixed — the dates in the
scrapbook.

What is built and what is not:

| Piece | State |
|---|---|
| Write-once store field, persisted | built, `store/app-store.ts:378` |
| "New since last visit" detection | built, `use-child-home-data.ts:195–205` |
| Stamped at the moment of earning | **not built** — stamped on home mount (§5.1) |
| Dates surfaced in a scrapbook | **not built** — no album exists |
| A "new" dot on the Progress nav item | **not built** — the signal drives the home welcome instead |

### 6.4 Surfaces

| Surface | Change | State |
|---|---|---|
| Reader, last page | the reward moment (§5), a new `StoryFinishedMoment` component | **not built** |
| Home dashboard | newest badge, next badge, celebration on return | **built** |
| Progress page | browsable badge library, category filter, weekly/monthly challenges | **built** |
| Progress page | album section for stickers and sets; earned dates; tiers on theme badges | **not built** |
| Story card sheet | a sticker glimpse: finished / well-loved / in your voice, beside the meta pills | **not built** |
| Catalogue | none. The shelf stays a shelf. | — |
| Parent corner | opt-in weekly note: "This week you read four stories together and finished Wombat's Year." Delivered through the existing schedule reminder channel, consent-gated | **not built** |

---

## 7. What the CMS must carry

| Field | Where | State |
|---|---|---|
| Badge definitions | `scripts/cms-achievements/*.json` | **built** (§6.2) |
| `awards` | story: `[{ achievementId, trigger: 'finish' \| { challengePageId } }]` | **built** — schema, `Story.java`, `types/story.ts`; covered by the story checksum |
| `series` | `{ id: string; title: LocalizedText; order: number }` | not built — series sets (§4.4) |
| `characters` | `string[]` (stable ids, e.g. `wombat`) | not built — character sets (§4.4) |
| `season` (tag) | existing `tags[]` | seasonal sets (§4.8) |

`cms achievements` fails when a story awards a badge no definition names, or names a page
with no challenge. Everything else is already there: `category`, `tags`, page
`interactionType`, `ageRange`, `pageCount`. Authoring guidance for the content team: tag
generously and consistently, since theme badges are only as good as the tags.

---

## 8. Guardrails — checked against the house rules

| Rule | How this plan keeps it |
|---|---|
| Co-engagement | Together badges only count acts a parent takes part in; copy is always "you … together" |
| Calm UX, no overstimulation | One reward moment per finish, house motion, no stacking, no sound beyond a chime |
| No addictive mechanics | No variable rewards, no timers, no loss, no leaderboards, no pay-gated badges |
| No "come back" copy | The "next" line names a possibility, never a deadline. One forbidden-phrase list (`contract-fixtures/badge-copy-forbidden.json`) is enforced on bundled copy (`badge-copy.test.ts`) and on CMS copy (`cms achievements`) |
| Privacy-first | Earned-at stays on the device; the child document carries only outcomes (finished ids, challenge counts, earned ids), no times; analytics receives only `badge_earned{family}` counts with parental consent, no story ids |
| Offline | Bundled specs, generated stickers, local ledger — everything works without network |
| Accessibility | Badge status is carried by **rim, count and text together, never by colour alone** — the four states must stay distinguishable in greyscale; reduced-motion respected by the reward moment |
| Nothing goes backwards | Enforced in the store: earned-at is write-once (`app-store.ts:378`, covered by `__tests__/store/home-visits.test.ts`); deleting a book keeps its sticker |

---

## 9. Delivery

### Phase 1 — the ledger and the moment — *part done*

Built:
- `achievementUnlockedAt`, write-once and persisted, with tests.
- `lastStoryCompletedAt`, written on completion.
- The celebration and the goal-gradient "next badge" line — on the home screen (§5.1).
- A browsable, category-filtered badge library on the Progress page.

Remaining:
- ~~`ReadingEvent` ledger~~ — replaced by outcome facts (§6.1).
- Move stamping to the moment of earning, inside the reader; keep home-mount as a backstop.
- `StoryFinishedMoment` after the last page.
- Story stickers, auto-generated, with an album section on the Progress page.
- ~~"Read" means finished for every badge that says read~~ — **built**: counters use
  `finishedStoryIds`; `readStoryIds` (opened) stays for the parent corner.
- **Done when:** finishing a book plays its sticker moment once and never again; the
  Progress page shows the sticker with the date it was actually earned; deleting the book
  keeps the sticker; all of it works in airplane mode.

### Phase 2 — rules as data — *built (Phase 8 D)*

- Definitions + evaluator; the sixteen current badges re-expressed with identical thresholds
  (`achievements.test.ts` proves parity).
- Doing badges from page challenges; story awards; theme, category and variety rules.
- Bundled set; CMS delivery through delta sync with version and `minAppVersion` gating.
- Still to do: theme badges authored for each filter tag, tiers, together badges from the
  record and narrate flows, bespoke art (decision 4).

### Phase 3 — sets and the ritual (2 weeks)

- `series` / `characters` in the catalogue schema and CMS; set pages in the album.
- Seasonal sets, recurring.
- "Tonight's story" at the family's usual time through the schedule reminder, opt-in.
- Parent weekly note, opt-in.
- **Done when:** a four-book series shows four slots that fill; a set finished in October
  still counts in June.

### Tests, per house rules

Every rule kind gets a pure unit test; every surface a behaviour test; every badge spec a
copy-lint test for forbidden phrases. Written first, red then green, and the mutation sweep
this repo already uses is run over the evaluator.

### Measuring whether it worked — without watching children

Aggregate, consent-gated, no story titles: share of story sessions that reach the last page
(finish rate), story sessions per family per week, share of sessions in the evening window,
and 30-day return. Success is finish rate and evening share rising with sessions per week
flat or gently up — families finishing more books, not opening the app more.

---

## 10. Decisions for the operator

1. **Where the reward moment lives.** It shipped on the home screen; this plan says the end
   of the story. Recommend building `StoryFinishedMoment` and keeping the home celebration
   as the "what is new" surface — they answer different questions.
2. **When to fix stamping.** Moving the stamp into the reader is cheap now and expensive
   later: write-once means every approximate date already recorded stays wrong. Recommend
   doing it before the album ships, and accepting that dates stamped so far are estimates.
3. **Tiers or separate badges** for theme families — this plan says one badge that deepens.
4. **Artwork.** Badges currently reuse the character and sky art (`ART.bearHappy`,
   `ART.moon`, and so on) as stand-ins. Stickers use covers; theme, doing and together
   badges need bespoke art. Commission list attached to Phase 2.
5. **"Read" meaning finished** — *decided and built*: the one-time migration grants
   finished-status to books with `completedCount > 0`. Open copy point: the First Story
   badge still reads "Open your very first story" in all 14 locales; it now needs a
   finished book. The wording change needs translating, so it is left for the operator.
6. **Weekly parent note channel** — reminder notification (exists) vs email (does not).
7. **Whether the streak count is shown to the child at all.** This plan shows it only in
   the parent corner, and only as "nights together: 14".
