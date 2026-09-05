---
title: "Achievements — badges that grow with a shelf we cannot see yet"
type: plan
status: proposed
branch: mvp
updated: 2026-09-05
reference: operator brief 2026-09-05; PROGRESS-UI.md; OVERHAUL-UI.md; CLAUDE.md core principles
---

# Achievements plan

> A plan for badges and rewards across a catalogue of books that will keep growing after
> this is built. It has to do two things at once: bring families back and make a small child
> feel rewarded, *and* stay inside the house rules — co-engagement, calm UX, no addictive
> mechanics ([`CLAUDE.md`](../CLAUDE.md)), and the Progress page's governing principle that
> nothing may imply a child is behind, losing, or required to return
> ([`PROGRESS-UI.md`](PROGRESS-UI.md)). Where a proven engagement mechanic conflicts with
> those rules, this plan says so and picks the calm version on purpose.

---

## 1. What exists today

Verified in the repo as of this plan:

| Piece | Where | What it does |
|---|---|---|
| Sixteen badges, five categories | `components/progress/progress-model.ts` `BADGE_DEFINITIONS` | Each badge is a target count over an `ActivityCounters` field (stories read, bedtime reads, kind reads, categories explored, favourites, sessions by activity and time of day) |
| Weekly + monthly challenge | `buildChallenges` | One of each, picked deterministically by ISO week / month from small pools |
| Three milestones | `MILESTONE_DEFINITIONS` | Booleans over the same counters |
| Counters | `components/progress/use-progress-data.ts` `deriveCounters` | Derived on every render from `readStoryIds`, `favoriteStoryIds`, the story list, and 30 days of `ScreenTimeService` sessions (`activity: 'story' \| 'emotions' \| 'music'`) |
| Reading state in the store | `store/app-store.ts` | `readStoryIds` (opened), `storyProgress[id]` with `pageIndex`, `totalPages`, `completedCount` (finished), `readingStreak`, `longestStreak`, `lastReadDate`, `totalStoriesRead` |
| Badge surfaces | `badge-card.tsx`, `badge-detail-sheet.tsx`, `challenge-card.tsx`, `milestone-card.tsx` | One card renders every state (`undiscovered` → `started` → `in_progress` → `earned`); the detail sheet carries a single recommendation that deep-links into the catalogue |
| Story metadata badges can key on | `types/story.ts` | `category`, `tags[]`, `ageRange`, `duration`, page `interactionType` (`music_challenge`, `jigsaw_puzzle`, `reading_challenge`) |

What is **missing**, and why it matters for this plan:

- **Nothing remembers *when* a badge was earned.** Status is recomputed from counters, so
  the app cannot celebrate the moment, cannot show "earned on a Tuesday in March", and
  cannot tell a returning family what is new. `PROGRESS-UI.md` already lists the one-time
  sparkle as unbuilt for exactly this reason.
- **Nothing is per book.** Every badge is a count over categories. A new book arriving
  in the catalogue adds nothing to collect; a well-loved book read twenty times is
  indistinguishable from one opened once.
- **"Read" means opened.** `markStoryAsRead` fires on open (`story-book-reader.tsx:720`);
  finishing is `markStoryCompleted` (`:944`) and is not used by any badge. A child who
  taps into five books and out again "reads" five stories.
- **Badges are code.** Adding one is a definition in `progress-model.ts` plus two i18n
  keys — fine for sixteen, wrong for a catalogue that the CMS grows without an app release.

---

## 2. Why people come back — and which of those levers we will pull

This is the review the brief asked for: the mechanisms that reliably bring people back and
make them feel rewarded, what the evidence says, and whether each one belongs in an app used
by a parent and a child under six. **Bold** = we use it. ~~Struck~~ = we decline it on
purpose, with the reason.

| Mechanism | Evidence | Verdict for Early Roots |
|---|---|---|
| **Endowed progress** — a goal that already shows some progress is pursued harder than one at zero | Nunes & Drèze 2006: loyalty cards pre-stamped 2 of 10 were completed by 34% vs 19% for 0 of 8 | **Use.** The first story of any theme lights that theme's badge to `started`; a new book's own sticker shows the cover in outline the moment it is installed. |
| **Goal gradient** — effort rises as the goal nears | Kivetz, Urminsky & Zheng 2006: coffee-card purchases accelerated approaching the free cup | **Use, gently.** The detail sheet already shows `k / n`; we add "one more bedtime story and Moonlight Reader comes alive" as an *invitation*, never a countdown. |
| **Zeigarnik / set completion** — open loops and near-complete sets pull attention | Zeigarnik 1927; the whole sticker-album trade | **Use.** Per-book stickers in a scrapbook; series and character sets that fill in as books are read. This is the mechanism that scales to books we do not know yet. |
| **Peak–end rule** — an experience is judged by its peak and its end | Fredrickson & Kahneman 1993 | **Use.** The reward moment is at the *end of the story*, after the last page, never mid-read and never on the shelf. That is where a memory is made. |
| **Habit anchoring / implementation intentions** — a fixed cue ("after bath") beats willpower | Gollwitzer 1999 | **Use.** Bedtime is the anchor. "Tonight's story" is offered at the child's usual story time; the existing `SCHEDULE-WINDOW.md` reminders are the delivery channel, opt-in. |
| **Fresh-start effect** — people begin anew at temporal landmarks | Dai, Milkman & Riis 2014 | **Use.** Monthly and seasonal collections open on the first of the month and at each season, and never close (see FOMO below). |
| **Relatedness / autonomy / competence** (self-determination theory) | Ryan & Deci 2000 | **Use, as the frame for all copy.** Every badge names something the child *can do* or *did together*. Never "you must". |
| **IKEA effect** — we value what we helped make | Norton, Mochon & Ariely 2012 | **Use.** A recording made in Record mode becomes a keepsake on the book's sticker: "read by Mum, 12 March". The reward is the family's own voice. |
| Sticker charts for under-sixes | Standard early-years practice; effective for concrete, immediate, *specific* behaviours | **Use, with the caveat below.** Stickers for *finishing a story together*, not for opening the app. |
| ~~Contingent extrinsic rewards for an intrinsically enjoyable act~~ | Deci 1971; Lepper, Greene & Nisbett 1973 (overjustification): expected rewards for drawing reduced children's later drawing | **Decline the *contingent* form.** No "read to get a badge". Badges are *recognition after the fact*, framed as a memory, and unexpected on first encounter. Unexpected rewards did not show the overjustification drop. |
| ~~Variable-ratio reward (loot boxes, mystery chests)~~ | Skinner; the strongest known re-engagement schedule — and the one behind gambling | **Decline.** Prohibited by `CLAUDE.md` (no addictive mechanics). Every reward is deterministic and legible: the child can see exactly what will happen next. |
| ~~Streak with loss~~ (Duolingo-style) | Very effective; also the source of the most complained-about pressure in consumer apps | **Decline the loss.** We keep the *count* of "nights together" (already in the store as `readingStreak`) but it never resets in the child's view, never warns, never freezes. It only ever grows or rests. |
| ~~Countdowns, limited-time, FOMO~~ | Effective; explicitly prohibited by `PROGRESS-UI.md` | **Decline.** Seasonal sets recur every year and stay collectable. |
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
a local event ledger (§6). Families marked **auto** need no CMS entry at all — they
generate from the catalogue.

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

**The scrapbook.** Earned things settle into the Progress page as memories with dates
(`PROGRESS-UI.md`'s governing principle, now with the data to honour it). Stickers get a
page of their own — the album — sorted with the newest at the top, well-loved books
marked, recordings playable.

---

## 6. Architecture

### 6.1 An event ledger, on the device

The counters today are recomputed from state that has no time in it. Everything in §4–§5
needs *when*. The plan adds one persisted, append-only list to the Zustand store:

```ts
interface ReadingEvent {
  at: string;               // ISO date-time, device local
  kind: 'finished' | 'begun' | 'challenge' | 'recorded' | 'playedAlong' | 'favourited';
  storyId: string;
  meta?: { challenge?: PageInteractionType; recordedBy?: string; pageIndex?: number };
}
```

Written by the reader at the points that already exist (`markStoryAsRead`,
`markStoryCompleted`, the record and narrate flows, `setStoryProgress`), capped at a
rolling 2,000 events (a family reading twice a day for three years). Persisted through the
store's existing `partialize`, so it survives restarts and never leaves the device.

Counters become a *projection* of the ledger plus the catalogue: `deriveCounters` grows to
take events, and the badge status functions stay pure. Existing tests keep passing because
the sixteen current badges are re-expressed as rules with the same thresholds.

### 6.2 Badge definitions as data

`BadgeDefinition.progressOf` is a function today. It becomes a serialisable rule:

```ts
type BadgeRule =
  | { kind: 'finishedWithTag'; tag: StoryFilterTag; target: number }
  | { kind: 'finishedDistinct'; by: 'tag' | 'category'; target: number }
  | { kind: 'finishedSet'; setId: string }                       // series / character
  | { kind: 'challenges'; interaction: PageInteractionType; target: number }
  | { kind: 'recorded'; target: number; distinctVoices?: number }
  | { kind: 'sessionsInWindow'; window: 'morning' | 'evening'; target: number }
  | { kind: 'daysTogether'; target: number };

interface BadgeSpec {
  id: string;
  family: 'theme' | 'variety' | 'set' | 'doing' | 'together' | 'rhythm' | 'seasonal';
  rule: BadgeRule;
  tiers?: number[];        // targets for bronze/silver/gold; single-tier if absent
  art: string;             // asset key or CMS URL
  copy: { title: LocalizedText; earned: LocalizedText; next: LocalizedText };
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
}
```

A small evaluator turns `(BadgeSpec, ReadingEvent[], Story[])` into today's `Badge` shape,
so every existing surface renders unchanged. Story stickers and sets are **generated**
from the catalogue, not listed.

Specs ship in two layers: a bundled set in the app (so offline and first-run work), and a
CMS-delivered set fetched with the catalogue (`CatalogService`), versioned so an older app
ignores rule kinds it does not know. Copy comes as `LocalizedText`, as story titles already
do, so the 14-language parity test extends to badge copy.

### 6.3 Earned-at, and what is new

`earnedAt: Record<badgeId, string>` in the store, written the first time a badge's status
becomes `earned`. It drives the one-time reward moment, the dates in the scrapbook, and a
"new since you were last here" mark on the Progress nav item — a small dot, never a number.

### 6.4 Surfaces

| Surface | Change |
|---|---|
| Reader, last page | the reward moment (§5), a new `StoryFinishedMoment` component |
| Progress page | album section for stickers and sets; earned dates; tiers on theme badges; "new" mark |
| Story card sheet | a sticker glimpse: finished / well-loved / in your voice, beside the meta pills |
| Catalogue | none. The shelf stays a shelf. |
| Parent corner | opt-in weekly note: "This week you read four stories together and finished Wombat's Year." Delivered through the existing schedule reminder channel, consent-gated |

---

## 7. What the CMS must carry

Two fields the catalogue does not have yet (they touch the backend schema; see the
existing note in `OVERHAUL-UI.md` §"backend catalogue schema"):

| Field | Type | Used by |
|---|---|---|
| `series` | `{ id: string; title: LocalizedText; order: number }` | Series sets (§4.4) |
| `characters` | `string[]` (stable ids, e.g. `wombat`) | Character sets (§4.4) |
| `season` (tag) | existing `tags[]` | Seasonal sets (§4.8) |

Everything else is already there: `category`, `tags`, page `interactionType`, `ageRange`,
`duration`. Authoring guidance for the content team: tag generously and consistently, since
theme badges are only as good as the tags.

---

## 8. Guardrails — checked against the house rules

| Rule | How this plan keeps it |
|---|---|
| Co-engagement | Together badges only count acts a parent takes part in; copy is always "you … together" |
| Calm UX, no overstimulation | One reward moment per finish, house motion, no stacking, no sound beyond a chime |
| No addictive mechanics | No variable rewards, no timers, no loss, no leaderboards, no pay-gated badges |
| No "come back" copy | The "next" line names a possibility, never a deadline; verified by a copy lint test over the badge specs (forbidden phrases list) |
| Privacy-first | Ledger and earned-at stay on the device; analytics receives only `badge_earned{family}` counts with parental consent, no story ids |
| Offline | Bundled specs, generated stickers, local ledger — everything works without network |
| Accessibility | Status carried by rim + count + text, never colour alone (`PROGRESS-UI.md` §30); reduced-motion respected by the reward moment |
| Nothing goes backwards | Enforced in the store: earned-at is write-once; deleting a book keeps its sticker |

---

## 9. Delivery

### Phase 1 — the ledger and the moment (2 weeks)

- `ReadingEvent` ledger in the store; the reader writes it. Counters projected from it.
- `earnedAt`; the one-time reward moment after the last page for the existing badges.
- Story stickers, auto-generated, with an album section on the Progress page.
- "Read" now means finished for every badge that says read. Opened-only stays a count for
  the parent corner.
- **Done when:** finishing a book plays its sticker moment once and never again; the
  Progress page shows the sticker with a date; deleting the book keeps the sticker; all of
  it works in airplane mode.

### Phase 2 — rules as data (2 weeks)

- `BadgeSpec` + evaluator; the sixteen current badges re-expressed as specs with identical
  thresholds (tests prove parity).
- Theme badges for every filter tag, tiered. Doing badges from page interactions. Together
  badges from the record and narrate flows.
- Bundled spec set; CMS fetch with version gating.
- **Done when:** a new tag in the CMS produces a working badge in the app without a
  release; an unknown rule kind is ignored without error.

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

1. **Tiers or separate badges** for theme families — this plan says one badge that deepens.
2. **Artwork** — stickers use covers; theme, doing and together badges need bespoke art
   (`PROGRESS-UI.md` already flags the stand-in emotion assets). Commission list attached
   to Phase 2.
3. **"Read" meaning finished** — changes today's numbers down for families who open more
   than they finish. Recommend a one-time migration that grants finished-status to books
   with `completedCount > 0` and leaves the rest as begun.
4. **Weekly parent note channel** — reminder notification (exists) vs email (does not).
5. **Whether the streak count is shown to the child at all.** This plan shows it only in
   the parent corner, and only as "nights together: 14".
