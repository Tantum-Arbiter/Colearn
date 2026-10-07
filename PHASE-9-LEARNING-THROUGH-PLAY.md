---
title: "Phase 9 — Learning through play"
type: proposal
phase: 9
status: proposed
owner: CoLearn
tags: [phase-9, games, learning, literacy, maths, personalisation, subscription]
updated: 2026-09-30
---

# Phase 9 — Learning through play

> **For LLMs / AI agents**: this is a **proposal**, not an accepted plan. Nothing in it is
> built. Do not implement from it until the operator has answered §18. It extends and
> partly supersedes [`PHASE-6-MATH-GAMES.md`](PHASE-6-MATH-GAMES.md); §5.8 lists the
> differences. It depends on [`grow-with-freya/ACHIEVEMENTS-PLAN.md`](grow-with-freya/ACHIEVEMENTS-PLAN.md),
> [`grow-with-freya/NEXT-PHASE-3.md`](grow-with-freya/NEXT-PHASE-3.md) and
> [`PHASE-8-BACKEND-ALIGNMENT.md`](PHASE-8-BACKEND-ALIGNMENT.md).

How a storytelling app becomes a stories-and-play app for children of two to six and
beyond, without becoming a quiz app with cartoon graphics, and without any mechanic that
works by making a small child anxious to return.

---

## 0. Summary

**The proposal in one paragraph.** Build nine game *engines*, not dozens of games. Each
engine is one thing a child does with their hands: find, sort, gather, build, order, pair,
trace, make, choose. Twenty-two games are specified below; they are those nine engines
with different content. Content comes in *packs*, and every book in the catalogue brings a
pack of its own characters, objects and places, so the games are made of the stories. A
skill map on the device moves difficulty quietly. Parents see words, not numbers. Nothing
is timed, nothing is lost, nothing is sold to the child.

**What to build first.** Eight games on five engines (§13): Owl's Lantern, Word Builder,
Story Path, Picnic Helper, Seesaw Pond, Moonlight Pairs, Feelings Faces, and the jigsaw
that already exists inside stories.

**The five findings that most affect the decision.**

| # | Finding | Where |
|---|---|---|
| 1 | The app has no maths game. The fifteen "numbers" activities spell number words through the spelling engine | §1 |
| 2 | The standalone games that exist cannot be reached from the live home screen, make no sound, and record no progress | §1 |
| 3 | The largest cost is not code. It is audio in fourteen languages, and phonics does not translate at all | §16.2 |
| 4 | Adaptive difficulty is profiling of a child under the ICO Children's Code and needs a compliance view before it ships | §9.4 |
| 5 | Several of the most effective retention mechanics are ruled out by the house rules. The commercial case rests on parent trust instead, and that is a bet | §8.4, §11 |
| 6 | No competitor found makes its games out of its storybooks, and only one sells itself on calm. Four good competitors are free | §19 |
| 7 | Two working titles collide with existing education marks, and six more want care | §20.3 |

**Begun.** The first game, Moonlight Pairs, is built and fitted to four age bands (§21).

---

## 1. What exists today

Verified in the repository on 2026-09-28, at `origin/mvp` `5f27d5fb`. Paths are relative
to `grow-with-freya/`.

### 1.1 Games and activities

| Thing | What the child does | Where | State |
|---|---|---|---|
| **Spelling game** | Sees a picture, taps scrambled letter tiles to spell the word | `components/games/spelling-game-screen.tsx`, `hooks/use-spelling-game.ts` | Built. Three fixed tiers, chosen by activity id, not by the child (`types/spelling-game.ts:35–54`) |
| **"Numbers"** | The same spelling game, with number words | `data/learning-activities.ts` (every entry `gameType: 'spelling'`), `data/numbers-words.ts` | **Not a maths game.** No counting or arithmetic interaction exists in code |
| **Feelings game** | Is shown an emotion, picks the matching card from a set | `components/emotions/emotions-game-screen.tsx`; ten emotions in `data/emotions.ts`; three card styles in `data/emotion-themes.ts` | Built. **Runs a sixty-second countdown on screen**, in English only ("Time remaining: 45s", `emotions-game-screen.tsx:425–428`; `timePerEmotion: 60`, `data/emotions.ts:110`), and keeps a score and a level |
| **Jigsaw** | Drags tiles onto a 2×2 or 4×4 grid | `components/stories/jigsaw-puzzle-ui.tsx`; `types/story.ts:84–92` | Built, **only as a page inside a story** |
| **Reading challenge** | Fills in blanked words on a page, or spells one word | `types/story.ts:95–109` | Built, only inside a story |
| **Music** | Plays an instrument: guided practise, free play, challenges inside stories | `components/music/`; [`MUSIC_FEATURE.md`](grow-with-freya/MUSIC_FEATURE.md) | Built |

### 1.2 Four things to know before designing on top of this

| Finding | Evidence | Consequence |
|---|---|---|
| **The standalone games have no way in from the live home.** The pages are mounted, but the home scene offers only stories, progress, search and profile. The carousel that led to Learning and Instruments renders only when `useHomeScene` is false, and it defaults to true | Pages: `app/_layout.tsx:980–998`. Home destinations: `components/home/home-scene-container.tsx:17–22`. Switch: `components/main-menu.tsx:505`, `store/app-store.ts:252` | The product-structure decision (§12) is not optional. Today the catalogue lists only activities already saved as favourites (`components/stories/catalogue/story-catalogue-screen.tsx:387`, opened at `:791–815`); the screen that lists them all sits behind the carousel |
| **The games are silent.** Neither the spelling nor the feelings screen plays or speaks anything | No audio or speech call in `hooks/use-spelling-game.ts`, `components/games/spelling-game-screen.tsx` or `components/emotions/emotions-game-screen.tsx` | A pre-reader cannot play a literacy game that does not speak. Audio is the first dependency of every game below |
| **The games record nothing.** Story completion and in-story challenges feed achievements; the standalone spelling and feelings games do not | `useAchievementEvents` is wired only into `components/stories/story-book-reader.tsx`; `ChallengeKind` is `'music' \| 'jigsaw' \| 'reading'` (`store/app-store.ts:25`) | The skill map (§9) and the "doing" badges need new challenge kinds |
| **Difficulty ignores the child.** The tier comes from the activity's id. The child's age is stored (`childAgeInMonths`, `store/app-store.ts:74`) and used for screen-time limits and story text, not for games | `types/spelling-game.ts:57–94` | Personalisation starts from nothing |

An earlier plan for games exists in `PHASE-4-PROD-READINESS.md` §10: three screens (spell,
pick one, sort into bins), of which only the first was built. Its "pick one" screen is the
multiple-choice quiz this proposal argues against, and its reward is one to three stars
for accuracy, which scores the child. Its rule of tap-only play, with no dragging, is
sound and is kept (§3.1 rule 9).

Two smaller points. The spelling game's hardest tier declares a sixty-second limit
(`types/spelling-game.ts:51`); nothing in `hooks/` or `components/` reads it, so no timer
runs, but the field should go before someone wires it up. And the app holds one child at a
time (`currentChildId`, `store/app-store.ts:73`), although the server model is already one
document per child (`PHASE-8-BACKEND-ALIGNMENT.md` §5), so several children is an app
change, not a backend one.

### 1.3 What a story knows about itself

| The catalogue carries | The catalogue does not carry |
|---|---|
| `category`, `tags[]`, `ageRange`, `isPremium`, `awards`, per-page `interactionType` (`types/story.ts:112–168`) | Characters, objects, vocabulary, the key moments of the plot |

The right-hand column is what would let a game be made of a story. §16.1 proposes the
fields. `ACHIEVEMENTS-PLAN.md` §7 already asks for `characters` and `series` for a
different reason; this is the same request with a second use.

---

## 2. The stance: engines, not games

A preschool "game library" of forty titles is usually six mechanics and thirty-four
costumes. That is not a criticism; it is the correct way to build one. The mistake is
to pay for forty.

An **engine** is a single verb with a rule for what counts as done.

| Engine | The child… | Done when | Already in the app |
|---|---|---|---|
| **Find** | looks for something in a scene | the right thing is touched | — |
| **Sort** | carries each thing to where it belongs | every thing is home | — |
| **Gather** | puts out an amount, one at a time | the amount is right, or the balance is level | — |
| **Build** | fits parts into a whole | every place is filled | Spelling tiles, jigsaw |
| **Order** | lays things in a line | the line makes sense | — |
| **Pairs** | turns cards and remembers | every card has its partner | — |
| **Trace** | follows a path with a finger | the path is walked | — |
| **Make** | composes something of their own | the child says so | Music free play |
| **Choose** | picks what a character does next | the scene has played out | Partly: the feelings game picks a card |

Three tests were applied to every game in this proposal.

| Test | Question | Fails if |
|---|---|---|
| **The toy test** | With the goal removed, is it still pleasant to handle? | It is only a question with an answer |
| **The hands test** | Does the child *do* the idea, or watch it and then answer? | The learning happens in an animation and the child's part is choosing A, B or C |
| **The world test** | Does the world show whether it worked, or does a judge announce it? | Feedback is a tick, a cross, a buzzer |

A seesaw passes all three. "Which group has more? Tap one" fails all three.

---

## 3. Ages: one game, four rungs

Two to six is not one audience. A two-year-old is learning to drag; a six-year-old is
reading sentences. The same engine serves both by turning five dials.

| Dial | Easier | Harder |
|---|---|---|
| **How many** | 2 choices, amounts to 3 | 4 choices, amounts to 20 |
| **What form** | the real thing → a picture of it | → a symbol → a written word |
| **How much help** | shown how → prompted | → alone |
| **How many steps** | one | several, in order |
| **What rule** | one feature, given | two features → a rule to be worked out |

| Band | Hands | Mind | So the games… |
|---|---|---|---|
| **2–3** | Tap; short, forgiving drags | Names things; matches; cause and effect | Two choices. Things settle into place when near. No reading, no numerals needed. Every round can be done by matching |
| **3–4** | Reliable drag | Counts a few; sorts; hears rhyme; follows a short story | Three choices. Counting to 5. Patterns of two. First and last |
| **4–5** | Controlled tracing | Letter sounds; numerals; holds a rule in mind; plays alone | Symbols appear beside pictures. Sounds in words. Amounts to 10. Plans of a few steps |
| **5–6+** | Precise | Blends and reads words; adds and takes away; reasons; makes things | Written words without pictures. Missing numbers. Rules to be worked out. Making rounds for others |

The bands are a starting point from the age in the profile. After that the child's own
play decides (§9), and a four-year-old who reads is given reading.

### 3.1 House rules for feedback — shared by every game

Each game below has a line on calm design. These are the rules behind all of them, stated
once.

| # | Rule |
|---|---|
| 1 | **Voice first.** The spoken word is the main sound. One sound for one action. No music bed by default |
| 2 | **Success settles.** A lift, a settle, one soft chime, about half a second. No confetti, no flashing, no shaking |
| 3 | **A miss is not an event.** The thing drifts back, or stays where it was put. No red, no cross, no buzzer, no "wrong", no lives |
| 4 | **No clocks.** No timers, no countdowns, no bonus for speed. Time taken is never shown |
| 5 | **Every round ends in success.** After two misses the round narrows and the character shows the first step |
| 6 | **One thing moves at a time.** One highlight on screen, in the night palette already in use |
| 7 | **Quiet when idle.** If the child stops, nothing nags. After some seconds the target glints, once |
| 8 | **Never by colour alone,** and reduced motion is honoured, as the badge surfaces already require |
| 9 | **Tap works wherever drag does.** Tap a thing, then tap its place. A two-year-old, or a child with a motor difficulty, is not shut out by a gesture |
| 10 | **The session ends by itself** (§8.3) |

---

## 4. English and early literacy — seven games

> **A limit that applies to this whole section.** The app speaks fourteen languages.
> Vocabulary, listening and sequencing games translate. **Phonics does not**: letter–sound
> teaching is specific to a language and its spelling system, and English phonics in
> particular (the systematic synthetic approach used in English schools) has no direct
> equivalent in, say, Polish or Arabic. L2, L3 and L5 are specified for English. Other
> languages get L1, L4, L6 and L7 first. See §16.2.

### L1 · Owl's Lantern

*Engine: Find · Ages 2–6+ · Vocabulary, listening, then sounds in words, then first reading*

- **Objective.** To understand spoken words and descriptions, then to hear the sounds
  inside words, then to read a word and know what it means.
- **Loop.** A scene at dusk, dim. The child's finger is a lantern: where it goes, a pool
  of warm light shows what is there. Owl asks for something. The child moves the light
  until they find it, and taps.
- **Example round (≈60 s).** A kitchen at dusk. Owl: "Can you find the kettle?" The child
  sweeps the light over a chair, a cat asleep (it opens one eye), a loaf, and finds the
  kettle on the stove. They tap it. The kettle stays lit, and Owl says, "The kettle. It is
  nearly time for tea." The light moves on to the next thing.
- **Progression.**

  | Age | What Owl asks |
  |---|---|
  | 2–3 | A named thing: "the ball". Three things in the scene, which is mostly lit |
  | 3–4 | A description: "something you wear on your feet". Where: "what is *under* the table?" |
  | 4–5 | A sound: "something beginning with *sss*". A rhyme: "something that rhymes with *log*" |
  | 5–6+ | A written word, silent until tapped. A question from the book: "Find what Fox lost" |

- **Replay.** The lantern is the toy: lighting up a dark room is pleasant without any
  task. There is an explore mode with no questions, where every thing says its name when
  lit. Things are placed differently each time.
- **Calm.** One moving light on a dim screen is about as low in stimulation as a game can
  be. Owl speaks slowly and waits.
- **Story link.** The strongest in the proposal. Scenes are places from books; the things
  are things from the book just read; at the top rung the questions are about the story.
- **Parent value.** "New words this week: *kettle*, *lantern*, *burrow*." "Beginning to
  hear the first sound in a word."
- **Evidence.** Vocabulary before school is one of the better predictors of later reading
  comprehension, and talking about pictures with an adult builds it (the dialogic reading
  studies of Whitehurst and colleagues). The lantern as a means of engagement is a
  hypothesis.

### L2 · Sound Post

*Engine: Sort · Ages 3–6 · Hearing the sounds in words; then letters for sounds · English first*

- **Objective.** To hear that words begin, end and rhyme alike, and to connect a sound to
  its letter.
- **Loop.** The child is the postie. Parcels wait in a basket; touching one says what is
  inside. Two or three doors stand along the lane, each belonging to an animal. The child
  carries each parcel to the right door.
- **Example round (≈70 s).** Bear's door and Squirrel's door. "Bear wants things that
  start like *b-b-Bear*. Squirrel wants things that start like *sss-Squirrel*." The child
  touches a parcel: "sock". They carry it to Bear. Bear peers at it: "Sssock. That is not
  for me," and it floats back. They carry it to Squirrel, who takes it in. Then "ball",
  "sun", "boat".
- **Progression.**

  | Age | The rule on the doors |
  |---|---|
  | 3–4 | Kinds of thing (food, clothes). Then rhyme: "things that sound like *cat*" |
  | 4–5 | First sounds that are far apart (*s* and *m*). Doors show the letter as well as the animal |
  | 5–6 | First sounds that are close (*b* and *p*). Last sounds. The vowel in the middle |
  | 6+ | Two letters, one sound (*sh*, *ch*). Written words sorted by family (*-at*, *-og*) |

- **Replay.** Different streets, different residents. At the top rungs the child sets the
  rule and the parent does the post round.
- **Calm.** A parcel is heard only when touched. The animal's gentle refusal repeats the
  word, which is the teaching.
- **Story link.** The residents are characters from books, and the parcels hold things
  from their stories.
- **Parent value.** "Hears the first sound in words. Knows the sounds for *s, a, t, p, i, n*."
- **Evidence.** Awareness of sounds in words and knowledge of letters are the two
  best-established early predictors of learning to read (the US National Early Literacy
  Panel, 2008). This is the most strongly supported strand in the proposal.
- **Same mechanic as** Tidy-Up Time (M7).

### L3 · Word Builder

*Engine: Build · Ages 4–6+ · Blending sounds into words; building words and sentences · English first*

The spelling game that exists, with three changes: the tiles speak their sounds, the
finished word is blended aloud, and the rungs follow how reading is taught rather than how
long the word is.

- **Objective.** To push sounds together into a word, and to pull a word apart into sounds.
- **Loop.** A picture and a row of empty places. Letter tiles below. Touching a tile says
  its *sound*, not its name. The child carries tiles to places. When the row is full the
  sounds are said in turn, then run together, and the pictured thing stirs.
- **Example round (≈60 s).** A picture of a cat, three places. Tiles: *a, t, c, s*. The
  child touches *c* ("k"), and carries it to the first place. Then *a*, then *t*. The
  tiles light in turn: "k… a… t… cat." The cat stretches.
- **Progression.**

  | Age | What changes |
  |---|---|
  | 4–5 | The last two letters are in place: find the first. Then whole three-sound words, with only the tiles needed |
  | 5–6 | Spare tiles that do not belong. Four-sound words (*frog*, *nest*). A two-letter sound is one tile (*sh*) |
  | 6+ | Change one tile to make a new word: *cat → cot → dot → dog*. Then word tiles into a sentence |

- **Replay.** Word chains are puzzles. Words come from the book just read.
- **Calm.** Sounds are said only on touch. The blend is said once, slowly.
- **Story link.** Inside a story this already exists as the reading challenge. The words
  belong to the book.
- **Parent value.** "Blends three sounds into a word. Reads *cat, sun, pin, dog*."
- **Evidence.** Systematic phonics has strong support for teaching reading in English
  (the Rose Review, 2006; the Education Endowment Foundation's summaries). An app is a
  supplement to that teaching, not a replacement, and should say so.
- **Same mechanic as** Shape Workshop (M6) and the jigsaw (W7): parts into places.

### L4 · Story Path

*Engine: Order · Ages 3–6+ · Sequencing, retelling, understanding a story*

- **Objective.** To hold a story in mind and know what happened first, next and last, and
  later, why.
- **Loop.** After a book, a few pictures from it lie scattered beside a winding path with
  empty places. The child lays the pictures along the path. When it is full, the story is
  read back in the order the child chose.
- **Example round (≈80 s).** Four pictures from *Snuggle Little Wombat*: Wombat yawning,
  Wombat walking under the stars, the burrow, Wombat asleep in the moonlight. The child
  lays them in that order. The path is read back in the book's own words: "Wombat yawned,
  the sky turned blue…" through to "…wombat sleeps without a sound." The path glows end to
  end. Had the child put *asleep* first, the read-back would begin with the ending, the
  child would hear that it sounds odd, and that one picture would stir a little.
- **Progression.**

  | Age | What changes |
  |---|---|
  | 3–4 | Two pictures, then three: first and last |
  | 4–5 | Four pictures. "What happened just before this?" |
  | 5–6 | Five or six. One picture that belongs to a different book |
  | 6+ | Why: lay the picture that *caused* this one. Written captions to match to pictures. Tell it yourself |

- **Replay.** Every book is a new round, and a book heard many times is a round the child
  is proud to be good at. Deliberately muddled stories are funny, and are allowed.
- **Calm.** The narration is the book's own. Nothing else sounds.
- **Story link.** Complete: it is made of the book.
- **Parent value.** "Retells a four-part story in order." A parent understands that
  sentence without explanation.
- **Evidence.** Retelling and sequencing a story are associated with understanding it
  (Morrow's retelling studies). Whether ordering pictures on a screen does what retelling
  aloud does is a hypothesis, which is why the top rung asks the child to tell it.
- **Cost.** The lowest content cost in the proposal. The pictures and narration exist;
  each book needs only a list of which pages are its key moments.

### L5 · Firefly Letters

*Engine: Trace · Ages 3–6 · Knowing and forming letters and numerals · letter sounds English first*

- **Objective.** To know a letter by its shape and its sound, and to form it with the
  strokes in the right order.
- **Loop.** A firefly rests at the start of a faint path. The child leads it along with a
  finger. The path stays lit behind. At the end the whole shape glows and says its sound.
- **Example round (≈50 s).** A large *s*. The firefly waits at the top. The child leads it
  round and back and round; the trail lights. "sss." A snake from a book curls into the
  same shape beside it.
- **Progression.**

  | Age | What changes |
  |---|---|
  | 2–3 | Not letters: straight lines, waves, loops, a path to a friend. Any route near the path will do |
  | 3–4 | Big letters: the first letter of the child's name, then others. Generous paths |
  | 4–5 | Lower case. A dot shows where to start; the firefly will not go the wrong way round |
  | 5–6 | The guide fades. Short words. Numerals |

- **Replay.** Trails are drawn in light on a night sky and can be kept. Mazes and
  dot-to-dot are the same engine with a different path.
- **Calm.** One moving point of light. No sound until the end.
- **Story link.** Each letter is met through a character whose name begins with it.
- **Parent value.** "Forms *s, a, t* with the right strokes." And the offline idea writes
  itself: draw it in flour, in sand, on a steamy window.
- **Evidence.** Forming letters by hand helps young children learn to recognise them
  (James and Engelhardt, 2012). That work used pens. How far a finger on glass transfers
  to a pencil on paper is uncertain, and the parent copy should recommend the pencil.

### L6 · Echo Pairs

*Engine: Pairs · Ages 3–6 · Rhyme, first sounds, letters, words — by memory*

- **Objective.** To match things that sound alike, and to remember where they were.
- **Loop.** Leaves lie in rows. Turning one over shows a picture and says its word. The
  child turns two. If they belong together, they stay. If not, they turn back.
- **Example round (≈70 s).** Six leaves. *Cat*. *Sun*. They turn back. *Hat*. The child
  remembers where *cat* was and turns it: "cat, hat". The two stay, side by side.
- **Progression.**

  | Age | What makes a pair |
  |---|---|
  | 3–4 | The same picture. Four leaves |
  | 4–5 | Rhymes. The same first sound. Six to eight leaves |
  | 5–6 | Capital and small letter. Picture and written word |
  | 6+ | Twelve leaves. Word and its opposite |

- **Replay.** The layout changes every time; the game is known in every culture and needs
  no teaching.
- **Calm.** A pair that does not match turns back without comment.
- **Story link.** The pictures come from the books the child has finished.
- **Parent value.** "Hears rhymes. Matches capital and small letters."
- **Same mechanic as** Moonlight Pairs (W3). This is a content pack for that game, not a
  second game, and should be built and counted as such.

### L7 · Read and Do

*Engine: Make, with a rule · Ages 5–6+ · Reading for meaning*

- **Objective.** To read a sentence and show that it has been understood, by doing what
  it says.
- **Loop.** A scene with things that can be moved. A short written sentence appears.
  Any word says itself if touched. The child does what the sentence says.
- **Example round (≈60 s).** A bear, a tree, three hats. *Put the red hat on the bear.*
  The child touches *red* to hear it, carries the red hat to the bear. The bear looks
  pleased with the hat. Next: *Put the fish in the tree.* The fish sits in the tree,
  looking surprised.
- **Progression.**

  | Age | What is read |
  |---|---|
  | 5 | Two words: *red hat*. Every word speaks on touch |
  | 5–6 | One sentence, with words the child can sound out |
  | 6+ | Two steps: *first… then…*. Words for where: *under, behind, between* |
  | 6–7 | Three sentences, then a question answered by doing |

- **Replay.** The sentences are generated, and the silly ones are the reason to read the
  next. The child can build a sentence from word tiles for a parent to act out.
- **Calm.** Silent unless a word is touched.
- **Story link.** Scenes and characters from books; at the top rung, sentences about
  what happened in the book.
- **Parent value.** "Reads and follows a one-sentence instruction."
- **Why not comprehension questions.** Multiple-choice questions after a passage are a
  test. Acting on a sentence checks the same understanding and is a game.

---

## 5. Maths and numeracy — seven games

`PHASE-6-MATH-GAMES.md` already plans eleven maths games. This section keeps its best
ideas, and changes three things about it. §5.8 says which and why.

### M1 · Picnic Helper

*Engine: Gather · Ages 2–5 · Counting, one-to-one correspondence, cardinality, then adding and sharing*

This is Phase 6's "Feed the Animal", with one change that matters: the child, not the app,
decides when the plate is full.

- **Objective.** To count out a requested number of things, and to know that the last
  number said is how many there are.
- **Loop.** A guest asks for some food. The child carries pieces to the plate one at a
  time; a voice counts each as it lands. When the child thinks it is right, they ring a
  small bell. The guest counts what is on the plate and eats.
- **Example round (≈50 s).** Bear: "Could I have four berries, please?" The child carries
  three and rings the bell. Bear touches each: "One, two, three. I would love one more."
  The child adds one. "One, two, three, four. Four berries. Thank you." Bear eats, slowly.
- **Progression.**

  | Age | What changes |
  |---|---|
  | 2–3 | The plate has outlined places, so it is matching, not counting. Up to 3. No bell: the plate is full when the places are |
  | 3–4 | No outlines. Up to 5, then 7. The bell arrives |
  | 4–5 | Up to 10. The request comes as a numeral on a card, or as a dot pattern. Two guests: "three for Bear, two for Rabbit — how many did you carry?" |
  | 5–6+ | Sharing: eight berries, two guests, make it fair. Taking away: Bear had six and ate two. Tokens worth 1, 2 and 5 to make an amount |

- **Replay.** Guests, foods and places change; favourite guests can be chosen. Guests have
  small preferences that a child learns (Otter likes fish), which gives a reason to come
  back that has nothing to do with reward.
- **Calm.** One sound per berry. Eating is the celebration, and it is slow. An
  over-filled plate is not an error: the guest counts, and hands one back.
- **Story link.** The guests are the characters of finished books, and the food comes from
  them: the picnic from a picnic story, the seeds from a seed story.
- **Parent value.** "Counts out up to five reliably. Beginning to count out six and seven."
  The bell is what makes that sentence honest: a child who stops at four by themselves
  understands four.

### M2 · Peek and Make

*Engine: Gather, with a reveal · Ages 3–6 · Subitising — seeing how many without counting*

Replaces Phase 6's "Quick Peek". That game flashes a pattern for a shrinking number of
seconds and asks for one of three answers, which is a timed quiz. This keeps the skill and
removes the clock.

- **Objective.** To recognise small quantities at a glance, then to see a larger quantity
  as two smaller ones.
- **Loop.** A cloud covers a patch of sky. The child holds a finger on the cloud to lift
  it and look at the stars behind, for as long as they like. When they let go the cloud
  returns, and they make the same on their own patch of sky by placing stars.
- **Example round (≈45 s).** The child lifts the cloud: four stars, arranged as on a die.
  They let go, place four stars, and tap the moon. The cloud drifts off and the two skies
  sit side by side, matching.
- **Progression.**

  | Age | What changes |
  |---|---|
  | 3–4 | 1 to 3, in familiar arrangements. The child may peek again at any time |
  | 4–5 | Up to 5; arrangements vary; one peek encouraged, more allowed |
  | 5–6 | Up to 10 on a ten-frame; seeing "six" as "five and one" |
  | 6+ | Two clouds: make the total of both |

- **Replay.** Arrangements are generated. The made skies can be kept as constellations the
  child names.
- **Calm.** The child controls the reveal, so there is no time pressure at all. Children
  tend to shorten their own peeks as they become fluent, and that is the fluency signal:
  observed, never imposed, never shown.
- **Story link.** Night-sky books supply the skies; any countable thing from a book can
  stand in for stars.
- **Parent value.** "Recognises up to four at a glance without counting."

### M3 · Seesaw Pond

*Engine: Gather, with a balance · Ages 3–6+ · Comparing, equality, number bonds, missing numbers*

- **Objective.** To compare two quantities, make them equal, and later to find what is
  missing to make them equal.
- **Loop.** A seesaw sits across a log in the pond. Frogs sit on one end, so it tips. The
  child adds or removes pebbles on the other end until the seesaw lies level.
- **Example round (≈60 s).** Five small frogs sit on the left; the left end is down. The
  child adds pebbles to the right: one, two, three — the seesaw stirs — four, five. It
  settles level. A voice: "Five and five. The same."
- **Progression.**

  | Age | What changes |
  |---|---|
  | 3–4 | Which end will go down? The child guesses by touching an end, then watches. More and fewer, with differences that are easy to see |
  | 4–5 | Make it level, up to 5 then 10. Differences of one |
  | 5–6 | Stones carry numerals: a "3" stone weighs three pebbles. Make 7 from a 4 and something |
  | 6+ | Both ends hold more than one stone: 3 and 4 on one side, 5 and what on the other? A big frog weighs two small ones |

- **Replay.** The seesaw is a toy before it is a task. Children will tip it to see it tip,
  and free play with no goal is a mode, not a failure.
- **Calm.** The tilt is the feedback. There is no right or wrong sound, because the world
  itself shows the answer; this is the clearest example in the proposal of feedback that
  does not need a verdict.
- **Story link.** Any pair of characters, any countable thing. Pond and river books supply
  the place.
- **Parent value.** "Can make two groups equal up to five. Beginning to find the missing
  part of seven." The second sentence is the start of addition and subtraction as one
  idea, which is where number bonds lead.

### M4 · Frog Hop

*Engine: Trace, along a number line · Ages 4–6+ · Number order, counting on and back, adding and taking away as movement*

Kept from Phase 6, which has it right.

- **Objective.** To know where numbers live in order, and to add and subtract by moving.
- **Loop.** Lily pads in a row, numbered. The frog sits on one. The child taps or drags to
  hop the frog, pad by pad, to where it needs to be.
- **Example round (≈50 s).** The frog is on 3. A dragonfly rests on 7. "How many hops to
  the dragonfly?" The child hops: four pads light in turn, counted aloud. "Three, and four
  hops, is seven."
- **Progression.**

  | Age | What changes |
  |---|---|
  | 4–5 | Hop to a number, 0 to 10. Then "two more", "one back" |
  | 5–6 | Start anywhere; hop on by a given amount; say where you will land before you hop |
  | 6+ | To 20. Hop cards (+2, +1, −1): choose cards to reach the dragonfly. Some pads unnumbered |

- **Replay.** Different creatures and places (stepping stones, stars, fence posts). Hop
  cards make each round a small puzzle with more than one answer.
- **Calm.** One hop, one soft sound, one count. The frog waits for as long as the child does.
- **Story link.** Journey books give the path: the frog books, the mountain climb, the
  lighthouse visit.
- **Parent value.** "Counts on from a number rather than starting again from one."
- **Evidence.** Playing linear number board games improved number knowledge in preschool
  children in controlled studies (Siegler and Ramani). This is among the better-supported
  mechanics in the proposal. Whether the effect carries to a touchscreen version is likely
  but not shown.

### M5 · Stepping Stones

*Engine: Order · Ages 3–6 · Patterns: copying, continuing, mending, making*

Phase 6's "Pattern Path", with the multiple-choice answer replaced by laying the stones,
and with one addition: the pattern can be heard.

- **Objective.** To notice what repeats and to continue it.
- **Loop.** A path of stones crosses a stream, with some missing. The child lays stones
  from a small pile to continue the pattern. When the path is whole, a character walks
  across and each stone sounds a note, so the pattern plays as a tune.
- **Example round (≈60 s).** Blue, gold, blue, gold, then a gap of two. The child lays
  blue, then gold. Hedgehog crosses: low, high, low, high, low, high.
- **Progression.**

  | Age | What changes |
  |---|---|
  | 3–4 | Copy a path laid alongside. Then continue AB patterns in colour |
  | 4–5 | ABB, AAB, ABC; mend a gap in the middle; patterns in shape or size |
  | 5–6 | Two things change at once. The same pattern in a different form: colours become sounds |
  | 6+ | Growing patterns (1, 2, 3 stones high) and number patterns (2, 4, 6) |

- **Replay.** "Make your own" is the heart of it: the child lays any path and hears it
  played. A saved path becomes a round for someone else in the family.
- **Calm.** Notes come from the instrument samples the app already carries, one at a time,
  at walking pace.
- **Story link.** Paths, rivers and journeys in the books; the walker is a character the
  child has met.
- **Parent value.** "Continues two-part patterns. Beginning three-part patterns."
- **Evidence.** Early patterning skill is associated with later mathematics attainment
  (Rittle-Johnson and colleagues). The link to sound is a design hypothesis.

### M6 · Shape Workshop

*Engine: Build · Ages 2–6+ · Shape, space, turning and fitting*

- **Objective.** To recognise shapes, and to see how shapes combine to make others.
- **Loop.** A silhouette waits on the bench: a boat, a house, a fox. The child carries
  shape pieces into it until it is full. The finished picture takes its colours and sits
  on the shelf.
- **Example round (≈70 s).** A boat outline, with the places for each piece faintly drawn.
  The child carries the long piece to the hull, a triangle to the sail, a small triangle
  to the flag. The boat colours in, and rocks once.
- **Progression.**

  | Age | What changes |
  |---|---|
  | 2–3 | One shape, one matching hole. Pieces settle into place when near |
  | 3–4 | Three or four pieces; inner outlines shown |
  | 4–5 | No inner outlines. Pieces must be turned, by tapping |
  | 5–6+ | Several right answers. Two triangles make the square that is missing. Finish the other half of a symmetrical picture |

- **Replay.** Free building: make your own picture from the pieces, keep it, and let
  someone else try to fill its outline.
- **Calm.** A piece near its place eases in. A piece in the wrong place simply rests
  where it was put.
- **Story link.** Silhouettes are the characters and objects of the books.
- **Parent value.** "Turns pieces to make them fit. Beginning to combine shapes."
- **Evidence.** Spatial skill can be trained and is associated with later mathematics
  (a meta-analysis by Uttal and colleagues; studies of block and puzzle play by Verdine
  and colleagues). Those studies mostly used physical materials.

### M7 · Tidy-Up Time

*Engine: Sort · Ages 2–5+ · Sorting, classifying, and working out a rule*

- **Objective.** To group things by what they share, and later to work out what the rule is.
- **Loop.** Things are scattered on the floor of a den. Two or three baskets wait. The
  child carries each thing to the basket where it belongs.
- **Example round (≈60 s).** Six things: three socks, three cups. Two baskets, each with
  one thing already in it. The child carries socks to the sock basket and cups to the
  other. A cup carried to the socks rolls gently back out.
- **Progression.**

  | Age | What changes |
  |---|---|
  | 2–3 | Two baskets, by kind or by colour, each basket showing an example |
  | 3–4 | Three baskets. By size; by shape |
  | 4–5 | Two things at once (big and red). A basket for "neither" |
  | 5–6+ | **What is my rule?** A character sorts three things without a word. The child works out the rule and carries on |

- **Replay.** The rule-guessing rounds are puzzles. A child can set a rule for a parent
  to guess.
- **Calm.** The room grows tidier as the round goes on, and ends still.
- **Story link.** The den and its things come from a book.
- **Parent value.** "Sorts by one feature. Beginning to sort by two."
- **Same mechanic as** Sound Post (L2). One engine, two kinds of content.

### 5.8 What this changes in Phase 6

| Phase 6 | Proposal | Reason |
|---|---|---|
| Feed the Animal, Frog Hop, Pattern Path | Kept, as M1, M4, M5 | Real manipulation: the child does the maths with their hands |
| Tap & Count, More Appears (ages 0–2) | Kept as they are | No-fail sensory play is right for under-twos, and is outside this proposal's 2–6+ range |
| Quick Peek — timed flash, three answers | Replaced by Peek and Make (M2) | A shrinking exposure time is a clock. The brief rules out countdowns |
| Moonlight Garden, Firefly Farewell — watch, then pick one of three | Folded into Picnic Helper and Seesaw Pond | Watching an animation and choosing an answer is a quiz with pictures. The child should do the combining and the taking away |
| Who Has More? — tap the larger group | Folded into Seesaw Pond (M3) | The seesaw shows *why* one is more, and leads on to equality |
| Star Equations — fill in the missing number | Becomes the top rungs of Seesaw Pond | The same idea, but the missing number is something the child can weigh |
| "Streak counter", "personal best tracker" | Dropped | Counters of consecutive success make a miss into a loss |
| Difficulty per activity: three right in a row steps up | Replaced by the skill map (§9) | Per-activity difficulty forgets what the child showed in another game |
| Three reward systems: constellation, garden, firefly jar | One: constellations that record firsts (§8.2) | Three collectables is a reward economy |
| Eight component files, one per game | Three engines: Gather, Order, Trace, plus Build and Sort shared with literacy | See §7 |

---

## 6. Wider development — eight games

### W1 · Feelings Faces

*Engine: Build, on a face · Ages 2–6 · Recognising and naming feelings; what helps*

The feelings game that exists asks the child to pick the matching card. This keeps its
ten emotions and its three card styles and changes the verb from *pick* to *make*.

- **Objective.** To read a feeling from a face and a situation, to name it, and later to
  think about what would help.
- **Loop.** A character, and something that has just happened to them. Their face is
  blank. The child chooses eyebrows, eyes and a mouth, and the face comes together. The
  character says how they feel.
- **Example round (≈60 s).** Fox's ice cream is on the ground. "How does Fox feel?" The
  child tries the smiling mouth; Fox looks at the ice cream and the face does not seem to
  fit. They choose the turned-down mouth and the low eyebrows. "Fox feels sad. His ice
  cream fell." A pause. "What might help Fox?"
- **Progression.**

  | Age | What changes |
  |---|---|
  | 2–3 | Happy and sad. Whole faces to choose from, not parts. Matching a face to a face |
  | 3–4 | Four feelings. A face to go with a picture of what happened |
  | 4–5 | Make the face from parts. More feelings: worried, proud, shy. The body shows it too |
  | 5–6+ | Two feelings at once. A feeling that changes through a story. What would help? |

- **Replay.** Making faces is play: children will make an angry face on a happy fox
  because it is funny, and that is a conversation, not an error.
- **Calm.** Faces change slowly. No feeling is marked as bad.
- **Story link.** Every book has a moment where a character feels something. The round is
  that moment.
- **Parent value.** "Names happy, sad, cross and scared. Beginning to talk about what
  helps." With a prompt for the parent: "Ask when she last felt like Fox."
- **Evidence.** Programmes that teach social and emotional skills show benefits in school
  settings (the meta-analysis by Durlak and colleagues, 2011). Those are taught by adults
  over months. Evidence that an app does the same for under-fives is thin. The likely
  active ingredient is the conversation with the parent, so the game is built to start one.
- **Not proposed.** A mirror mode using the camera. A child's face is the last thing this
  app should process.

### W2 · What Could Fox Do?

*Engine: Choose · Ages 3–6+ · Social situations, seeing another's point of view, solving a problem between people*

- **Objective.** To think about what someone else wants and feels, and to see that a
  choice has a consequence.
- **Loop.** Three pictures set a scene between two characters. Two or three pictures show
  what one of them might do next. The child picks one and watches what follows. Then they
  may go back and try another.
- **Example round (≈80 s).** Rabbit is building a tower. Fox wants the blocks. Fox could
  take them, could ask, or could build beside Rabbit. The child picks *take*. Rabbit's
  ears drop; the tower falls; both look at it. No voice says this was wrong. The child
  goes back and picks *ask*. Rabbit thinks, and hands over two blocks.
- **Progression.**

  | Age | What changes |
  |---|---|
  | 3–4 | Two choices. Sharing, waiting, taking turns |
  | 4–5 | Three choices. "How does Rabbit feel now?" |
  | 5–6 | What one character knows and the other does not |
  | 6+ | Two steps: something goes wrong, then putting it right. Finding a middle way |

- **Replay.** Children replay to see every ending, which is the point: the comparison
  between endings is the lesson.
- **Calm.** No choice is punished. Consequences are shown in faces, not in scores.
- **Story link.** The situations are taken from books, at the moment a character has a
  choice to make.
- **Parent value.** "Thinks about how a friend feels." With two questions to ask at tea.
- **Evidence.** A design hypothesis. It borrows from how early-years practitioners use
  stories and puppets to talk through conflicts.
- **Cost.** High for content: each situation needs drawn consequences. Not in the MVP.

### W3 · Moonlight Pairs

*Engine: Pairs · Ages 2–6 · Memory, attention*

- **Objective.** To remember where something was.
- **Loop.** Animals are asleep under leaves. The child lifts two leaves. If the animals
  belong together, they wake and stay. If not, the leaves settle back.
- **Example round (≈70 s).** Six leaves. A hedgehog. A frog. They settle back. A
  hedgehog: the child remembers, and lifts the first leaf again. The two hedgehogs wake.
- **Progression.**

  | Age | What changes |
  |---|---|
  | 2–3 | Four leaves, animals showing. Matching, with nothing to remember |
  | 3–4 | Four, then six, hidden |
  | 4–5 | Eight to twelve. Pairs that belong together without being the same: parent and young, a thing and its shadow |
  | 5–6+ | Sixteen. Pairs by sound alone: two leaves that play the same note. An amount and its numeral |

- **Replay.** Known to every family; a child can beat a parent at it fairly, which is
  rare and delightful at four. A two-player mode, turn and turn about, on one screen.
- **Calm.** Nothing counts the turns.
- **Story link.** The animals and things are from finished books.
- **Parent value.** "Remembers where three pairs are hidden."
- **Evidence.** That memory games exercise memory is plain. That the benefit carries to
  anything beyond memory games is not established, and the app should not claim it.
- **Carries** Echo Pairs (L6) and the numeral-and-amount pairs as content packs.

### W4 · Who Went to Bed?

*Engine: Find, with a change · Ages 3–6 · Noticing, visual memory*

- **Objective.** To take in a scene and notice what has changed.
- **Loop.** Some animals sit in a clearing. The child taps the moon, and night falls. The
  child taps the sun, and it is day: someone has gone. The child says who, by choosing
  from the faces below.
- **Example round (≈50 s).** Owl, Frog, Bear and Rabbit. The child looks, and taps the
  moon. Dark. They tap the sun. Owl, Bear and Rabbit. The child taps Frog's face below.
  Frog is shown, asleep on a lily pad.
- **Progression.**

  | Age | What changes |
  |---|---|
  | 3–4 | Three animals, one goes |
  | 4–5 | Five. Or one arrives. Or two swap places |
  | 5–6+ | Seven. Two go. Or nothing goes but something is different: Bear's scarf has changed |

- **Replay.** Short and quick to understand. The child can play the one who hides the
  animal, for a parent to guess.
- **Calm.** The child makes the night fall and lift. Nothing is on a timer.
- **Story link.** The cast of the book just read.
- **Parent value.** "Notices what is missing from a group of five."
- **Same mechanic as** Owl's Lantern (L1): a scene, things with places, one to find. It
  adds a before and an after.

### W5 · Hedgehog's Way Home

*Engine: Order, then watch it run · Ages 4–6+ · Planning, steps in order, words for direction*

- **Objective.** To think ahead: to plan steps, see what happens, and mend the plan.
- **Loop.** Hedgehog waits at one side of a small garden; home is at the other. The child
  lays step tiles in a row: forward, turn. Then they wake Hedgehog, who follows the tiles.
- **Example round (≈90 s).** Home is two squares ahead and one to the right. The child
  lays *forward, forward, forward*. Hedgehog walks three and meets a log, stops, and looks
  round. The child takes the last tile away, adds *turn, forward*. Hedgehog walks home.
- **Progression.**

  | Age | What changes |
  |---|---|
  | 3–4 | No tiles. The child leads Hedgehog along the path with a finger. This is the Trace engine, and is where the game begins |
  | 4–5 | Three or four tiles, one turn |
  | 5–6 | Things in the way. Something to collect first |
  | 6+ | A tile that means "do that twice". More than one way home |

- **Replay.** Gardens are generated. The child can lay out a garden for someone else.
- **Calm.** Hedgehog walks at hedgehog pace. A plan that does not work is not a failure:
  he stops and waits for a better one.
- **Story link.** Journey books.
- **Parent value.** "Plans three steps ahead and changes the plan when it does not work."
- **Evidence.** A design hypothesis. Claims that early coding games improve general
  thinking are common and not well supported. The modest claim is the honest one.

### W6 · Story Stage

*Engine: Make · Ages 2–6+ · Imagination, telling a story, language*

- **Objective.** None that can be scored, and that is deliberate. To make something and
  tell someone about it.
- **Loop.** A place from a book, empty. A drawer of characters and things from the books
  the child has finished. The child puts them where they like, as large or small as they
  like. Then they tell what is happening.
- **Example round (≈90 s).** The burrow from the wombat book. The child puts Wombat in
  bed, a frog on Wombat's head, and the moon in the corner. The parent asks what the frog
  is doing. The scene is saved to the shelf with the child's name on it.
- **Progression.** By what the child can do with it, not by levels.

  | Age | What is possible |
  |---|---|
  | 2–3 | Put things in a place |
  | 3–4 | Several scenes in a row: a beginning and an end |
  | 4–5 | Give a character a feeling (from Feelings Faces). Record the telling, on the device |
  | 5–6+ | Captions built from Word Builder tiles |

- **Replay.** Open-ended making is the most replayable thing in any child's toy box. The
  drawer grows with every book finished.
- **Calm.** The app says nothing unless asked.
- **Story link.** This is where the app becomes one world. The child's own stories sit on
  the shelf beside the books.
- **Parent value.** "Made four scenes this week." And the scenes themselves, which are
  what a parent will show to someone else.
- **Privacy.** Recordings stay on the device, behind the grown-ups' door, as the existing
  Record mode does. Voice is not synced (operator decision, 2026-09-24).

### W7 · Jigsaw

*Engine: Build · Ages 2–6+ · Fitting, turning, seeing the whole in the parts*

Exists inside stories. The proposal is to let it out.

- **Objective.** To see how parts make a picture.
- **Loop.** A picture from a finished book, in pieces. The child carries each to its place.
- **Example round (≈80 s).** The cover of the wombat book in four pieces. Then, because
  the child asks, in nine.
- **Progression.**

  | Age | What changes |
  |---|---|
  | 2–3 | Four pieces, the picture shown faintly beneath |
  | 3–4 | Six to nine |
  | 4–5 | Twelve to sixteen, no picture beneath |
  | 5–6+ | Twenty-four. Pieces that need turning |

- **Replay.** Every page of every finished book is a puzzle, at no content cost.
- **Calm.** A piece near its place eases in.
- **Story link.** Complete.
- **Parent value.** "Completes a nine-piece puzzle."
- **Today.** 2×2 and 4×4 only (`types/story.ts:84`). The grid sizes between are the work.

### W8 · Echo Song

*Engine: the instrument engine that exists · Ages 3–6+ · Listening, memory for sounds, rhythm*

- **Objective.** To listen to a short tune, hold it, and play it back.
- **Loop.** Owl plays a few notes on an instrument. The child plays them back.
- **Example round (≈50 s).** Three notes, low, high, low. The child plays low, high,
  high. Owl plays the three again, a little slower. The child plays them.
- **Progression.**

  | Age | What changes |
  |---|---|
  | 3–4 | Two notes, from two keys |
  | 4–5 | Three or four, from three keys |
  | 5–6+ | Five. Long and short notes (the hold-the-note work in Phase 7) |

- **Replay.** The child can play a tune for Owl, or a parent, to echo.
- **Calm.** One instrument, no backing.
- **Story link.** Tunes from the songs in the books.
- **Parent value.** "Remembers and plays back a three-note tune."
- **Cost.** Small. The challenge hook already accepts an explicit note sequence in place
  of a song (`hooks/use-music-challenge.ts:222–226`) and can play one back (`playMelody`,
  `:485`), so a round is a generated sequence handed to what exists.

---

## 7. The honest count

Twenty-two games are specified. Here is what they are.

| Engine | Games | Different because |
|---|---|---|
| **Find** | Owl's Lantern · Who Went to Bed? | The second adds a before and an after |
| **Sort** | Sound Post · Tidy-Up Time | Content only. **One game** |
| **Gather** | Picnic Helper · Peek and Make · Seesaw Pond | The rule for "done": a requested amount, a remembered amount, a level balance. Three games on shared parts |
| **Build** | Word Builder · Shape Workshop · Jigsaw · Feelings Faces | How a part fits: by order, by shape, by position, by meaning. The carrying is shared; the checking is not |
| **Order** | Story Path · Stepping Stones · Hedgehog's Way Home | The third runs the line as a plan, which is new work |
| **Pairs** | Moonlight Pairs · Echo Pairs | Content only. **One game** |
| **Trace** | Firefly Letters · Frog Hop · (mazes) | A free path against a row of stops |
| **Make** | Story Stage · Read and Do | The second adds a rule to check |
| **Choose** | What Could Fox Do? | — |
| *Instrument* | Echo Song | Uses what exists |

| Count | Number |
|---|---|
| Games as a child would name them | 22 |
| Games after removing pure re-skins | 20 |
| Engines | 9, plus the instrument engine already built |
| Engines needing the most new work | Find (scenes), Make (the stage), Choose (drawn consequences) |

Two pairs are one game each, and the proposal says so rather than counting them twice.
The others share an engine and differ in what counts as done, which is a real difference
to a child and a modest one to build.

---

## 8. Replayability system

The aim is that nine engines feel like a shelf of games that never runs out, without a
single mechanic that works by making a child anxious to come back.

### 8.1 The formula

```
an activity  =  engine  ×  skill rung  ×  pack  ×  cast
```

| Part | What it is | Who makes it | Cost of one more |
|---|---|---|---|
| **Engine** | The mechanic: Find, Sort, Gather, Build, Order, Pairs, Trace, Make, Choose | Engineering | High — weeks |
| **Skill rung** | A step on a ladder: "count out up to 5", "initial sound, contrasting pairs" | Learning design, as data | Low — a row in a table |
| **Pack** | The things in play: objects, words, scenes, their audio in each language | Content team, through the CMS | Medium — art and audio, no code |
| **Cast** | Who is asking: Bear at a picnic, Otter at the pond | Content team | Low once the character art exists |

A round is generated, not authored. The generator takes the rung, the pack and a seed, and
returns a round that satisfies the rung's constraints (range, number of choices, which
distractors are fair). The same seed always gives the same round, which makes rounds
testable and lets a parent replay "the one she liked".

### 8.2 Seven sources of variety

| Source | How it works | Guard |
|---|---|---|
| **Procedural rounds** | Quantities, positions, distractors and order are drawn fresh each time within the rung | No item repeats inside a session; a round the child just missed returns later in an easier form, not immediately |
| **Rotating cast and place** | The same counting round is Bear's picnic today and Otter's pond tomorrow | The child can always choose the cast themselves; rotation is only the default |
| **Story-seeded packs** | Finishing a book adds that book's characters, objects and places to the games. Wombat's blanket turns up in Owl's Lantern; Wombat comes to the picnic | Deterministic and shown in advance on the book's card ("brings: Wombat, the blanket, the burrow"). Never random, never a chest |
| **Ladders that grow** | Each engine has 8–14 rungs, so the game a two-year-old plays is still there, harder, at five | The child never sees a rung number |
| **Child-made content** | A pattern the child laid, a shape picture they built, a scene they made, can be saved and played as a round by a parent or sibling: "Make one for Daddy" | Stays on the device; nothing is shared outside the family |
| **Collections that record, not pay** | The existing badge system gains "doing" rules for the new challenge kinds (`ACHIEVEMENTS-PLAN.md` §4.5). A skill's constellation gains a star the *first* time a child manages a new rung | Stars are for firsts, never for repeats, so there is nothing to grind. Nothing is ever lost |
| **Seasons and months** | A new pack on the first of each month; seasonal packs that come round every year | Never expires, never "last chance" (`ACHIEVEMENTS-PLAN.md` §4.8) |

### 8.3 The shape of a session

| Moment | Design | Why |
|---|---|---|
| Start | The first round is one the child can certainly do | Competence first; also the endowed-progress effect |
| Middle | Three or four rounds at the working rung, one of them a stretch | The stretch is where learning is likeliest; one is enough |
| End | The last round is easy again, and the cast says goodbye | Peak–end: the session is remembered by its ending |
| After | "Again?" is offered once, as a choice between *again* and *all done*, equal in size | No autoplay, no default to continue |
| Third session in a row | The cast is tired: "Bear is going for a nap. Shall we read a story?" | A built-in stopping cue, in the world's own terms, working with the existing screen-time controls rather than against them |

A session is about three to four minutes. That is a design hypothesis about attention at
these ages, not a measured fact about this app; the round count is a setting so it can be
tuned.

### 8.4 Healthy replay and its imitation

| Healthy — we build this | Inappropriate — we decline this |
|---|---|
| The child returns because they can now do something they could not | The child returns because something will be lost if they do not (streak loss, a pet that gets sad, expiring rewards) |
| Variety comes from the world: new guests, new places, new things from a book just read | Variety comes from a random reward schedule: chests, spins, mystery prizes |
| Progress is a record of firsts, visible and permanent | Progress is a currency to earn and spend |
| The session ends by itself and says so | The session flows into the next by default |
| Rewards describe what happened: "You counted seven" | Rewards are louder than the activity that earned them |
| The harder rung is offered when the child is ready | The harder rung is sold, or withheld until tomorrow |
| Collections complete at the child's pace and stay open for ever | Limited-time sets, countdowns, "only today" |
| The parent is invited in | The child is told to ask the parent to buy |

The second column contains some of the most effective retention mechanics known. Declining
them costs return visits in the short term. The bet is that a parent who trusts the app
keeps the subscription longer than a child who is compelled by it, and that bet is
untested for this product.

---

## 9. Personalisation

### 9.1 What the app learns

The app keeps a **skill map** for each child: a list of small, concrete things, each with a
state. It is a record of what has been seen in play. It is not an assessment, and the app
must never present it as one.

| Kind | Examples | Granularity |
|---|---|---|
| **Items** | each letter sound, each numeral 0–20, each vocabulary word met | One entry per item |
| **Rungs** | "counts out up to 5", "orders four story events", "blends CVC words" | One entry per engine ladder |
| **Preferences** | engines chosen freely, casts chosen, rounds replayed by choice | Counts only |

Every item and rung is in one of four states:

| State | Meaning | Rule (starting values, to be tuned) |
|---|---|---|
| **Not met** | Never presented | — |
| **Meeting** | Presented, mostly with support | Fewer than 3 unsupported successes |
| **Growing** | Often managed without support | 3 or more unsupported successes, not yet spread over days |
| **Secure** | Managed without support on different days | Unsupported success on 3 separate days |

"On separate days" is evaluated on the device from local dates, and only the resulting
state leaves the phone (§9.4).

### 9.2 What counts as evidence

| Signal | Used | Note |
|---|---|---|
| Right first time, no hint | Yes — the strongest signal | |
| Self-corrected after one miss | Yes — counts as partial | Self-correction is a good sign, not a failure |
| Needed the scaffold | Yes — counts as "with support" | |
| Chose to replay | Yes — as preference only | Liking something is not the same as having learned it |
| Time taken | Weakly, and only to notice fluency (a child who peeks for less time in Peek & Make) | Never shown, never rewarded, never used to move a child down |
| Taps, minutes, sessions | No | They measure the app, not the child |

Known weaknesses, stated plainly: a parent may be doing the dragging; a two-year-old's
miss is often a motor slip, not a wrong idea; a child may be guessing between two choices.
For these reasons the map moves slowly, needs several observations to change state, and
weights rounds with more than two choices more heavily.

### 9.3 How difficulty moves without feeling like a test

1. **Where to start.** The age bucket in the child's profile gives a starting rung per
   engine. The first session in any engine quietly climbs or descends within ordinary
   rounds; there is no placement test and no "let's see what you know".
2. **The working mix.** Roughly six rounds in ten from *growing* items, three from *secure*
   (for fluency and the pleasure of being good at something), one from *meeting* or *not
   met*. The target is that about four rounds in five are managed first time. The exact
   figure is a hypothesis; the principle that small children should mostly succeed is
   conventional early-years practice.
3. **Stepping up.** When most of a rung's items are *growing* or better, the next rung
   enters the mix as the stretch round. The world explains the change: a second guest
   arrives at the picnic. Nothing says "Level 4".
4. **Stepping down.** Two misses inside a round bring the scaffold: fewer choices, the
   target glints, the cast models the first step. The round still ends in success. If
   scaffolds are frequent across a session, the mix shifts towards *secure* items. The
   child sees an easier round, never a message.
5. **Coming back round.** *Secure* items return occasionally at widening gaps. The spacing
   effect is one of the better-established findings in learning research generally; its
   size for under-fives inside an app is not established.
6. **The parent's hand.** In the grown-ups' area: a gentler / more stretch nudge per
   strand, a focus strand, and the ability to switch an engine off. A parent knows things
   the app cannot.
7. **Preference without capture.** Favourite engines appear first in "things to do".
   Preference is never used to extend a session, and the suggestion list is capped at
   three.

### 9.4 Privacy and compliance — flagged for review

| Point | Proposal |
|---|---|
| Where the map lives | On the device, in the child's store |
| What syncs | States only — per-rung state and the set of secure items — on the child document, merged the way Phase 8 already merges outcomes (set union, per-key max). No timestamps, no per-round history, no durations |
| What never leaves | Round-by-round history, dates, latencies, recordings |
| Analytics | Aggregate and consent-gated, by engine and rung, never by child and never by item |
| **Profiling** | ⚠️ Adaptive difficulty is a form of profiling of a child. The ICO Age Appropriate Design Code asks for profiling to be off by default unless there is a compelling reason and safeguards. On-device processing for the core purpose of the service is a strong position, but this needs a DPIA entry and a view from whoever advises on compliance before it ships. This is a flag, not legal advice |
| Claims | The app never says or implies a child is ahead, behind, typical or delayed, and never compares with other children or with age norms. It has no diagnostic or clinical ability and the copy must not suggest one. A forbidden-phrase list, as already enforced for badge copy, should cover dashboard copy too |

---

## 10. Parent experience

### 10.1 Where it lives

Behind the existing grown-ups' door, alongside Progress. One screen, readable in under a
minute, in the parent's language.

### 10.2 What is on it

| Section | Content | Example |
|---|---|---|
| **This week together** | Three plain sentences, generated from the skill map | "Mia is confident counting out up to five. She has started meeting six and seven. New words this week: *lantern*, *burrow*, *kettle*." |
| **Skills by area** | One row per strand, mapped to the seven EYFS areas of learning that UK parents meet at nursery. Each skill shows one of three words: *exploring*, *growing*, *confident* | Mathematics → Counting: confident · Comparing: growing · Patterns: exploring |
| **Letters and numbers** | Two grids — the letter sounds and the numerals 0–20 — each cell in one of three tones with a text label on tap | A parent sees at a glance that *s a t p i n* are confident and *m d* are growing |
| **Words met** | The vocabulary encountered in stories and games, with the book each came from | "burrow — from *Snuggle Little Wombat*" |
| **Lately** | The last five activities, each with one line on what it practises | "Seesaw Pond — making two sides equal" |
| **Away from the screen** | Two suggestions matched to what is *growing*, needing nothing but the house | "Count the stairs together on the way to bed." "Play I-spy with sounds: something beginning with *sss*." |
| **Read next** | Two books whose words or ideas match what is being practised | Links the games back to the shelf |
| **Made by Mia** | Scenes, patterns and pictures the child has saved | The part a parent shows a grandparent |
| **Settings** | Gentler / more stretch, focus area, engines on or off, rounds per session | |

### 10.3 What is deliberately not on it

| Left out | Why |
|---|---|
| Taps, rounds played, accuracy percentages | They look like information and mean nothing |
| Minutes played as an achievement | Time is a limit the parent sets in Screen Time, not a score |
| Streaks, days in a row | Pressure on the parent is still pressure |
| Comparison with other children or with age norms | The app cannot know, and the comparison does harm |
| Red, amber, green | Three tones and three words. Nothing on this screen is a warning |

Every screen carries one line of plain caveat: *"This is what we have seen in play. It is
not an assessment."*

---

## 11. Subscription strategy

### 11.1 Two different questions

| | Why the **child** comes back | Why the **parent** pays, and stays |
|---|---|---|
| Core | The games are fun and get better as they do | They can see what their child is gaining, in words they understand |
| Variety | The characters from their books are in the games | The library grows every month without a new purchase |
| Ownership | Things they made are kept | One subscription covers stories, games and music for every child in the house |
| Trust | Sessions end kindly | No adverts, no tricks, nothing sold to the child |
| Time | — | It grows with the child from two to six and beyond, so it is not outgrown in a term |

The child's column contains nothing that is for sale. The parent's column contains nothing
the child can see. Keeping those apart is the whole strategy.

### 11.2 What each tier holds

This keeps the three existing tiers and prices (`NEXT-PHASE-3.md` §1) and adds games to
them. Today the free tier opens the first three learning activities in each age group
(`services/story-access-service.ts:145`); the table below replaces that rule for games.

| | Free | Basic | Premium |
|---|---|---|---|
| Stories | The bundled books | Full catalogue | Full catalogue |
| Games | **Three, fixed, complete** — every rung of each | All engines | All engines |
| Packs | Base pack, plus the packs of the bundled books | Every book's pack, monthly and seasonal packs | The same |
| Parent view | "This week together" | The full skills view, one child | The full skills view, every child |
| Child profiles | One | One | Several |
| Away-from-screen ideas | Two a week | Matched to the child, refreshed as they progress | The same, per child |
| Focus and tuning | — | Yes | Yes |

### 11.3 Four rules

1. **Never paywall the ladder.** A free game is free all the way up. A child who has
   climbed to a rung must never meet a locked door on the next one; that is the
   "artificially frustrating the child" the brief rules out.
2. **Fixed free games, not rotating ones.** Rotation is a common pattern and the brief
   suggests it. The objection: rotation takes a small child's favourite game away on a
   schedule they cannot understand. It converts by causing a loss. A fixed set that is
   generous in depth and narrow in breadth converts by showing what more there is.
3. **The child never sees a lock.** Games and packs the family does not have are absent
   from the child's shelf and present, with a preview, behind the grown-ups' door. No
   padlocks on the shelf, no "ask a grown-up".
4. **Recognition is never sold.** Already a rule of the achievements plan; it extends to
   stars and constellations.

### 11.4 Staying subscribed

| Reason to stay | Mechanism |
|---|---|
| The library is visibly alive | One new pack on the first of each month, announced to the parent, not the child |
| The child is visibly growing | A termly "look how far" summary: what was *exploring* in September and is *confident* in December |
| The app grows up with the child | Ladders extend past six; the five-year-old's games are not the two-year-old's |
| A second child arrives | Profiles per child, each with its own map |
| It is one price for three things | Stories, games and music together |

The pricing itself, the split between Basic and Premium, and whether several child profiles
is a strong enough reason for the higher tier, are commercial decisions that want testing.
RevenueCat supports price experiments. Nothing here is evidence about what families will pay.

---

## 12. Product structure

### 12.1 Three shapes

| | A · Story → Game → Story | B · Two hubs | C · One connected world |
|---|---|---|---|
| What it is | Games live inside or straight after stories, in a fixed sequence | A Stories shelf and a Games shelf, separate | Games and stories share characters, objects and places, and each leads to the other, but neither requires the other |
| For | Strongest context: the game means something because of the story. Simple to explain | Easy to find a game. Easy to build. Parents understand it at once | The app feels like one place. Every new book enriches the games and the reverse |
| Against | Interrupts reading. Wrong at bedtime. A child who wants only the game must sit through the story; a child who wants only the story is slowed down. Replay is awkward | Two products in one icon. Games drift into generic quiz territory because nothing ties them to the books. Children camp in one hub | Hardest to design. Needs story metadata the catalogue does not yet carry. Risk of being vague: "connected" must mean specific links |
| Content cost | High — each game is authored per story | Low | Medium — packs per story, generated rounds |
| Fits what is built | Partly: story pages already host challenges | Partly: the catalogue already has a Learning tile | Yes, using both of the above |

### 12.2 Recommendation: C, reached through three doors

| Door | What happens | Rule |
|---|---|---|
| **In the book** | A page can hold a single, short round, as music, jigsaw and reading challenges do today | One round, skippable, never on a bedtime book's last pages |
| **After the book** | After the last page and the finishing moment, one quiet invitation: "Play with Wombat?" It opens one game with that book's pack | Never after a bedtime book, and never in the evening window: there the book ends and the app settles. An invitation, not a continuation |
| **On the shelf** | The Learning tile carries "things to do". This was agreed in the home redesign of 2026-09-05, built, and discarded uncommitted; it is not in the code | The way in for a child who simply wants to play |

And one door back: every game session ends with a book suggestion drawn from the same
pack. Games lead to stories as often as stories lead to games.

The bedtime rule matters more than it looks. The app's strongest habit anchor is the
bedtime story. A game offered at the end of it would trade the family's trust for a few
minutes of engagement.

---

## 13. The MVP — eight games on five engines

Chosen so that each new engine earns at least one game now and two later, every strand
is covered, every age has something, and three of the eight lean on what is already built.

| Game | Age | Skill | Core mechanic | Replayability | Development complexity |
|---|---|---|---|---|---|
| **Owl's Lantern** | 2–6+ | Vocabulary, listening; later sounds in words and first reading | **Find** — move a pool of light over a dim scene to find what Owl asks for | High: explore mode; new scenes and things with every book | **Large.** New engine, composed scenes, the most audio of any game |
| **Picnic Helper** | 2–5 | Counting out, one-to-one, how many | **Gather** — carry food to a guest's plate, ring the bell when it is right | High: guests, foods, amounts; rises to adding and sharing | **Medium.** New engine; counting voice in each language |
| **Seesaw Pond** | 3–6+ | More and fewer, equal, number bonds, missing numbers | **Gather, with a balance** — add pebbles until the seesaw lies level | High: a toy in its own right; ladder runs past six | **Medium.** Reuses Gather; the balance is the new part |
| **Story Path** | 3–6+ | Sequencing, retelling, understanding | **Order** — lay pictures from a book along a path, hear it read back | High: one round per book, for ever | **Small to medium.** New engine, almost no new content |
| **Word Builder** | 4–6+ | Blending, building words | **Build** — carry sound tiles into places; the word is blended aloud | Medium to high: word chains; words from each book | **Small to medium.** Engine exists; needs sound, new rungs. English first |
| **Moonlight Pairs** | 2–6 | Memory; carries rhyme, letters, numerals as packs | **Pairs** — lift two leaves, remember what was under them | High: two can play; packs change what a pair is | **Small.** New engine, simplest of all |
| **Feelings Faces** | 2–6 | Recognising and naming feelings | **Build, on a face** — choose the parts of a face to fit what happened | Medium: making faces is play; a moment from each book | **Medium.** Game exists; face parts are new art |
| **Jigsaw** | 2–6+ | Fitting, seeing the whole | **Build** — carry pieces to their places | High: every page of every finished book | **Small.** Exists in stories; needs more grid sizes and a way in |

### 13.1 What the eight cover

| | 2–3 | 3–4 | 4–5 | 5–6+ |
|---|---|---|---|---|
| **Literacy** | Owl's Lantern | Owl's Lantern · Story Path | + Word Builder | all three, at their top rungs |
| **Maths** | Picnic Helper | + Seesaw Pond | both | both, as adding and missing numbers |
| **Wider** | Pairs · Jigsaw · Feelings | the same | the same | the same |

**What the MVP leaves out, knowingly:** patterns and shape (Stepping Stones and Shape
Workshop come first in the next wave and reuse engines the MVP has built); tracing;
open-ended making; planning. A five-year-old who is already reading has less here than a
three-year-old. That is the MVP's weakest corner.

### 13.2 Order of building

Sizes are relative, for ordering the work. They are not estimates of time, and the first
engine will teach what the rest cost.

| Step | What | Size | Unblocks |
|---|---|---|---|
| 0 | **Decisions in §18.** A way in from the live home. A voice (§16.2) | — | Everything |
| 1 | **The shell**: session, round state machine, feedback layer, pack loader, skill map, new challenge kinds. Phase 6 §4.3's state machine is the starting point | Large | Every game |
| 2 | **Moonlight Pairs** | Small | Proves the shell on the simplest engine |
| 3 | **Jigsaw**, let out of the reader | Small | A second game for little new work |
| 4 | **Picnic Helper** | Medium | The first maths game the app has had |
| 5 | **Story Path** | Small–medium | The first game made of a book; needs key moments per book |
| 6 | **Word Builder** | Small–medium | Sound tiles; literacy for the oldest |
| 7 | **Seesaw Pond** | Medium | Maths to six and beyond |
| 8 | **Feelings Faces** | Medium | Face-part art |
| 9 | **Owl's Lantern** | Large | Scenes; the pack pipeline at full stretch |
| 10 | **Parent view**, first version: "This week together" | Medium | The reason to subscribe |

Owl's Lantern is the best game in the set and is built last, because it depends most on
the pack pipeline and the voice, and those should be proven on cheaper games first.

---

## 14. How eight games become a library

Nothing after the MVP needs to be built from nothing. There are four kinds of addition,
in rising order of cost.

| Kind | What is made | Code | Examples |
|---|---|---|---|
| **A pack** | Things, words, scenes, audio | None | Echo Pairs (rhymes, in Pairs). Numerals and amounts (in Pairs). A seaside pack. The pack of each new book |
| **A rung** | A new rule on an existing engine | A rule and its checker | "What is my rule?" in Sort. Word chains in Build. Sharing in Gather. Two-step sentences in Read and Do |
| **A game on a built engine** | A new "done" rule and a new setting | Small | Stepping Stones (on Order). Shape Workshop (on Build). Peek and Make (on Gather). Who Went to Bed? (on Find) |
| **A new engine** | A new verb | Large | Sort, Trace, Make, Choose |

### 14.1 The waves

| Wave | Adds | New engines | Games in total |
|---|---|---|---|
| **MVP** | The eight | Find, Gather, Order, Pairs; Build extended | 8 |
| **2** | Stepping Stones, Shape Workshop, Peek and Make, Who Went to Bed?, Echo Song; Echo Pairs as a pack | **None** | 13 |
| **3** | Sound Post and Tidy-Up Time; Firefly Letters and Frog Hop | Sort, Trace | 17 |
| **4** | Story Stage, Read and Do; Hedgehog's Way Home; What Could Fox Do? | Make, Choose; Order extended | 21 |

Wave 2 adds five games and no engine. That is the return on building engines. The total
is 21, not the 22 of §7, because Echo Pairs is counted as the pack it is.

### 14.2 What a new book brings

Once books carry the fields in §16.1, one book arriving in the catalogue adds, with no
release of the app:

| To | It adds |
|---|---|
| Owl's Lantern | A scene, and things to find in it |
| Story Path | A round |
| Jigsaw | A puzzle for every page |
| Picnic Helper, Seesaw Pond | A guest, and something to count |
| Moonlight Pairs | Faces for the cards |
| Word Builder | Its words |
| Feelings Faces | A moment |
| Story Stage | A place, and characters for the drawer |

---

## 15. What is known, and what is hoped

Where this proposal leans on research, this is how hard it can lean.

> Citations are given from memory to show where a claim comes from. **Check each against
> the source before it is quoted in marketing, on the website or to an investor.**

| Claim | Standing | Source | Caveat |
|---|---|---|---|
| Apps teach best when the child is active, engaged, doing something meaningful, with someone | Established as a framework | Hirsh-Pasek, Zosh, Golinkoff and colleagues, 2015 | A framework for judging apps, not proof about any one |
| Awareness of sounds and knowledge of letters predict learning to read | Well established | National Early Literacy Panel, 2008 | — |
| Systematic phonics helps children learn to read English | Well established | Rose Review, 2006; Education Endowment Foundation | For teaching by adults. An app supplements it |
| Early vocabulary predicts later comprehension; talk about pictures builds vocabulary | Well established | Whitehurst and colleagues, from 1988 | The adult's talk is the ingredient |
| Counting rests on one-to-one matching and on knowing the last number is the amount | Well established | Gelman and Gallistel, 1978 | — |
| Subitising is a foundation of number sense | Established | Clements, 1999 | — |
| Linear number board games improve number knowledge | Established in controlled studies | Siegler and Ramani, 2008–09 | Physical boards; low-income preschoolers |
| Patterning relates to later maths | Established association | Rittle-Johnson and colleagues | Association more than cause |
| Spatial skill can be trained and relates to maths | Established | Uttal and colleagues, 2013; Verdine and colleagues, 2014 | Mostly physical materials |
| Forming letters by hand helps recognition | Supported | James and Engelhardt, 2012 | Pens, not fingers on glass |
| Social and emotional programmes help | Established in schools | Durlak and colleagues, 2011 | Taught by adults over months, mostly older children |
| Expected rewards can reduce a child's own interest in an activity | Established | Lepper, Greene and Nisbett, 1973 | Already applied in `ACHIEVEMENTS-PLAN.md` §2 |
| Spacing practice helps memory | Well established in general | — | Size of effect in under-fives in an app: not established |
| Children should succeed about four times in five | **Hypothesis** | Conventional practice | The figure is a starting value |
| A session of three to four minutes suits these ages | **Hypothesis** | — | To be tuned |
| The lantern, the seesaw, the read-back path are more engaging than a quiz | **Hypothesis** | — | The reason for this proposal; test with children |
| Games made of a book deepen the book | **Hypothesis** | — | — |
| Memory, planning or "brain training" games improve general thinking | **Not supported** | — | The proposal does not claim it, and the app should not |
| Calm design keeps subscribers longer than compulsive design | **Hypothesis** | — | The commercial bet (§8.4) |

**The test that matters** is none of these. It is five families, a prototype of two
games, and watching whether the child asks for it again on the third day without being
offered it.

---

## 16. Fit, cost and risk

### 16.1 What the catalogue must carry

Java and TypeScript models change together, and the story schema with them
(`scripts/story-schema.json`, `Story.java`, `types/story.ts`), under the checksum that
already covers a story.

| Field | On | Shape | Used by | Also wanted by |
|---|---|---|---|---|
| `characters` | story | stable ids: `["wombat"]` | Guests, faces, the drawer | `ACHIEVEMENTS-PLAN.md` §7 |
| `things` | story | `[{ id, word, art }]`, the word localised | Lantern, Picnic, Pairs, Stage | — |
| `places` | story | `[{ id, art }]` | Lantern, Stage | — |
| `keyMoments` | story | page ids, in order | Story Path | — |
| `feelingMoment` | story | `{ pageId, feeling }` | Feelings Faces | — |
| `words` | story | words a child could build | Word Builder | — |
| New page interactions | page | `find`, `gather`, `order`, `pairs` alongside the three that exist | A single round inside a book | — |

Game definitions, rungs and packs travel as data through the CMS and delta sync, in the
way achievement definitions already do (`ACHIEVEMENTS-PLAN.md` §6.2), with a bundled set
so that the three free games work on first launch with no network.

### 16.2 Voice: the largest cost in the proposal

Every game speaks, and the app has fourteen languages.

| What | Rough size, per language |
|---|---|
| Counting and numerals | About 25 clips |
| Prompts, per game | 20–40 |
| Vocabulary, per pack | 10–20 words |
| Letter sounds (English) | About 44 |
| Feelings | 10–20 |

| Way of making it | For | Against |
|---|---|---|
| **Recorded by a person** | The warmest; right for a brand built on calm | Slowest and dearest; fourteen voices to find and keep |
| **Generated once, checked by a native speaker, shipped as files** | Scales to packs and languages; works offline; nothing about the child leaves the device | Quality varies by language; letter sounds in isolation are hard to generate well |
| **Spoken by the device at the moment of play** | Free | Uneven between devices and languages; poor at single sounds; Phase 6 §8 left this open |

**Recommended:** English recorded by a person, for the core set and the letter sounds;
other languages generated once and checked; never spoken live by the device. Launch the
games in English and the two or three languages with the most families, not in fourteen.

**Phonics is a separate matter.** L2, L3 and the sound parts of L5 are English games. A
Polish or Arabic equivalent is a piece of learning design by someone who teaches reading
in that language, not a translation.

### 16.3 Other costs and risks

| Risk | Detail | Response |
|---|---|---|
| **Most of the catalogue is stand-in text** | The 86 story folders `scripts/cms-stories/story-0*` share one template: page 5 of every one reads "*<Name>* meets a friend along the way. They decide to explore together." Story-made games need books with something in them | Packs for the real books first. The plan in §14.2 is worth what the books are worth |
| **Scenes are expensive** | Owl's Lantern needs to know where each thing is | Compose scenes from cut-out things on a background, placed by the generator, instead of marking up finished illustrations |
| **Profiling a child** | §9.4 | DPIA and a compliance view before the skill map ships |
| **Phone orientation** | Phones are locked upright except in the reader, which is on its side. A game inside a book is sideways; a game on the shelf is upright | Every engine lays out both ways, as every screen already must for tablets |
| **Right-to-left** | Arabic text is supported, layout is not. Number lines, patterns and story order have a direction | Decide per engine. Phase 6 §8 raised this for number lines and left it open |
| **One child per device** | §1.2 | Several children is app work, and is proposed as the reason for the top tier (§11.2). Until it is built, siblings share one skill map, which will be wrong for both |
| **The parent's hand on the screen** | The map cannot tell who dragged | §9.2: move slowly. A "playing together" switch for the parent is worth considering |
| **Size of the app** | Audio and art for games in the bundle | Three free games bundled; the rest as packs on demand, as stories are |
| **Two documents on maths** | This and Phase 6 | If this is accepted, mark Phase 6 superseded for ages 2 and over, keeping its §2.1 for under-twos |

---

## 17. Ideas considered and declined

| Idea | Why it is common | Why not here |
|---|---|---|
| Multiple-choice questions with pictures | Cheap; easy to measure | Fails all three tests in §2. This is the thing the brief asks not to build |
| Timed rounds, a shrinking flash | Feels like challenge; produces a number | A clock. Replaced by a reveal the child controls (M2) |
| Rotating the free games | Converts well | By taking a favourite away from a small child (§11.3) |
| A map of levels to travel along | Shows progress; pulls towards the next | A child can be "behind" on a map. It turns play into a journey to be finished |
| Stars to earn and spend | Gives every action a payoff | A currency. Rewards that are expected undermine interest in the thing itself |
| A pet that needs the child | Strong pull to return | It works through guilt |
| Days-in-a-row with loss | Very effective | Already declined in `ACHIEVEMENTS-PLAN.md` §2 |
| Reading aloud, judged by speech recognition | Would check real reading | A child's voice is sensitive data; recognition of young children's speech is unreliable; a wrong "try again" to a child who read correctly does harm |
| A camera mirror for feelings | Playful | A child's face |
| A character to talk to, generated live | Novel | Safety and privacy in an app for under-sixes |
| A different mini-game for every book | Feels rich | Forty games to build and keep. Packs give the same richness on nine engines |
| Accuracy percentages for parents | Looks rigorous | Says nothing a parent can use, and invites comparison |

---

## 18. Decisions for the operator

Nothing should be built until the first four are answered.

| # | Decision | Recommendation |
|---|---|---|
| 1 | **Is the direction right?** Nine engines and packs, not a catalogue of separate games | Yes |
| 2 | **The way in.** The standalone games have no route from the live home (§1.2). Bring back "things to do" on the Learning tile, as agreed in the earlier home design? | Yes. It is the third door in §12.2 and the MVP needs it |
| 3 | **The voice.** Recorded, generated and checked, or spoken by the device (§16.2)? And which languages at launch? | English recorded; two or three more generated and checked; the rest later |
| 4 | **The MVP.** The eight in §13, in that order? | Yes, with Owl's Lantern last |
| 5 | **Phase 6.** Superseded for ages 2 and over, kept for under-twos? | Yes |
| 6 | **Free games.** Three fixed and complete, not rotating. Which three? | Moonlight Pairs, Picnic Helper, Story Path: one for each strand, none needing phonics |
| 7 | **The top tier.** Is "every child in the house" the reason for Premium? It requires several child profiles in the app | Yes, and test the price |
| 8 | **Profiling.** Who gives the compliance view on the skill map (§9.4)? | Before step 1 of §13.2 is finished |
| 9 | **After a bedtime book.** No invitation to play, ever (§12.2)? | Yes |
| 10 | **Catalogue fields** in §16.1, and who fills them for the books that exist | Agree the fields now; fill for real books only |
| 11 | **Testing with families.** Five families and a two-game prototype before the rest is built (§15)? | Yes. It is the cheapest way to find out whether the central hypothesis holds |
| 12 | **The timer field** in the spelling config (§1.2). Remove? Deletions need approval | Remove |
| 13 | **The countdown in the feelings game** (§1.1). It is live, and against the house rules | Remove the clock, the score and the level when Feelings Faces is built, or sooner |
| 14 | **Names.** Choose replacements for the two high-risk titles and decide the six of medium risk (§20.3) | Before any name is shown outside the company |
| 15 | **Recording a finished game.** A new challenge kind reaches the server contract | Decide with the badges work; until then games are not recorded |

---

## 19. Competitors

Researched on the public web on 2026-09-28: UK App Store listings, the makers' own sites,
Common Sense Media reviews. Prices are as listed that day; many listings show several
tiers, and which one a new customer is offered is **⚠️ UNVERIFIED**. Links are in §19.5.

### 19.1 Who is there

| App | Ages | How it fits the child | What the child does | UK price seen | What parents say against it |
|---|---|---|---|---|---|
| Khan Academy Kids | 2–8 | Adapts to age and results | Taps answers, draws, reads | Free, no adverts | Waiting for the narrator; prizes after every activity |
| Lingokids | 2–8 | Levelled subjects | Traces, sings along, puzzles; licensed characters | 10 rotating games free; £12.99 a month, £77.99 a year | Overwhelming menu; charges after cancelled trials |
| ABCmouse | 2–8 | Ten levels on a path | Earns tickets, spends them on an avatar, a room, pets | US$14.99 a month (UK not found) | Busy; rewards distract. Settled with the US regulator in 2020 over cancellations |
| HOMER | 2–8 | Parent gives age, interests, level | — | £5.99–£9.99 a month, £59.99 a year | Repetitive; American accent |
| Duolingo ABC | 3–8 | A fixed sequence | Traces, drags, speaks to the microphone | Free | American pronunciation; letter names before sounds; feels like drill |
| Teach Your Monster to Read | 3–6 | Follows the phonics phases taught in English schools | Builds a monster, matches sounds | £8.99 once; free on the web | Fiddly mini-games; no places to pause |
| Pok Pok | 2–7 | No levels at all | Open-ended toys: a marble run, a busy board, drawing | £6.99–£12.99 a month listed | Needs precise fingers |
| Sago Mini | 2–6 | Themed menus | Pretend play, tracing | £6.99–£9.99 a month | Thin for the price; no stopping points |
| Toca Boca Jr | 2–8 | — | Pretend cooking, hair, role-play | One game free; £7.99 a month | Locked things shown greyed-out to the child |
| Endless Alphabet | 2–8 | No levels | Drags talking letters into their outlines | £8.99 once | Capitals only |
| Funexpected Math | 3–7 | Parent picks age, then it adapts | Pattern, spatial and logic puzzles | £9.99 a month, about £50 a year | Hints give the answer away |
| Todo Math | 3–8 | A placement test, then levels | Daily missions, collectables | About £50–£100 a year listed | Price |
| DragonBox Numbers | 4–8 | — | Stacks, slices and feeds number creatures | £5.99 a month, £34.99 a year | Coins unlock levels; music cannot be muted |
| Montessori Preschool | 3–7 | — | Tracing, practical-life tasks | Ten games free; £10.99 a month | Trial rolled into an annual charge with no reminder |
| Thinkrolls | 2–8 | Child picks one of three difficulties | Rolls characters through mazes | £9.99 a month | Locked things visible to the child |
| CBeebies | 2–4 | Follows the EYFS | Mini-games with television characters | Free | Slow narrator that cannot be skipped |
| Numberblocks World | 3+ | Five levels | Clips, quizzes, tracing | £3.99 a month, £14.99 a year | Little without paying |
| Bimi Boo | 2–6 | A story-like path, or free choice | — | £8.99 a month | American accent; right-hand bias |

### 19.2 What everyone has

Tracing letters and numbers. Drag to match and to sort. Tap to count. Jigsaws and shape
puzzles. A guided path beside a free-choice shelf. Collectable or avatar rewards. Several
child profiles. Play without a network. A seven-day trial.

None of these is anybody's property, and a parent will expect most of them. Several
profiles is the one the app lacks.

### 19.3 What nobody does well

| Gap | What was found | What it means here |
|---|---|---|
| **Calm** | Only Pok Pok sells itself on it. A 2022 study of apps used by three-to-five-year-olds found about one in five free of manipulative design | The house rules are the product's clearest difference. Say so |
| **Games made of a storybook** | None found. Stories sit in a separate library | The central idea of this proposal appears to be unoccupied. ⚠️ An absence is hard to prove |
| **Playing together** | No app is built round it | UK government advice of 27 March 2026 recommends shared use, slow-paced content and an hour a day for two-to-fives. Co-engagement is already a house principle; this is official backing for it |
| **Reports without scores** | Dashboards count activities, minutes or success rates. Pok Pok reports nothing | §10 as designed sits between the two |
| **Two-to-three-year-olds** | Most claim "2–8"; reviews report small children defeated by fiddly controls | Rule 9 of §3.1 (tap wherever drag) matters more than it looked |
| **British voices, UK phonics** | The commonest complaint about imported apps | Record English in a British voice, and follow the order phonics is taught in English schools (§16.2) |
| **Honest billing** | The most serious complaints in the category are about charges, not content | The trial screen already says what it will cost before it sells anything (`NEXT-PHASE-3.md`). Keep it so |
| **Places to stop** | A named complaint | §8.3's ending is a feature to mention, not only a constraint |
| **Locks shown to children** | A named complaint | §11.3 rule 3 |

### 19.4 Price

| | Seen in the UK |
|---|---|
| Monthly | Mostly £5.99–£12.99 |
| Annual | Mostly £35–£80 |
| Free, with nothing to buy | Khan Academy Kids, Duolingo ABC, CBeebies, Moose Math |
| Paid once | £8.99 |

Early Roots' £5.99 and £10 sit at the low end and the middle. Four well-made competitors
are free, all of them funded by something other than parents. The answer to "why pay" has
to be what they do not have: the books, the calm, and playing together.

### 19.5 Sources

[Khan Academy Kids](https://apps.apple.com/gb/app/khan-academy-kids/id1378467217) ·
[Lingokids](https://apps.apple.com/gb/app/lingokids-play-and-learn/id1002043426) ·
[ABCmouse pricing](https://www.abcmouse.com/learn/how-much-does-abcmouse-cost-subscription-plan-overview) ·
[HOMER](https://apps.apple.com/gb/app/homer-fun-learning-for-kids/id601437586) ·
[Duolingo ABC](https://apps.apple.com/gb/app/learn-to-read-duolingo-abc/id1440502568) ·
[Teach Your Monster to Read](https://apps.apple.com/gb/app/teach-your-monster-to-read/id828392046) ·
[Pok Pok](https://apps.apple.com/gb/app/pok-pok-montessori-preschool/id1550204730) ·
[Sago Mini World](https://apps.apple.com/gb/app/sago-mini-world-kids-games/id874425722) ·
[Toca Boca Jr](https://apps.apple.com/gb/app/toca-boca-jr-fun-kids-games/id943869618) ·
[Endless Alphabet](https://apps.apple.com/gb/app/endless-alphabet/id591626572) ·
[Funexpected Math](https://apps.apple.com/gb/app/funexpected-math-for-kids/id1473965253) ·
[Todo Maths](https://apps.apple.com/gb/app/todo-maths/id666465255) ·
[DragonBox Numbers](https://apps.apple.com/gb/app/kahoot-numbers-by-dragonbox/id1529174508) ·
[Montessori Preschool](https://apps.apple.com/gb/app/montessori-preschool-kids-3-7/id1138436619) ·
[Thinkrolls](https://apps.apple.com/gb/app/thinkrolls-games-for-kids-2-8/id1530907314) ·
[CBeebies Learn](https://apps.apple.com/gb/app/cbeebies-learn/id1444626898) ·
[Numberblocks World](https://apps.apple.com/gb/app/numberblocks-world/id1520827387) ·
[Bimi Boo](https://apps.apple.com/gb/app/kids-toddlers-learning-game/id1475467785) ·
[Common Sense Media](https://www.commonsensemedia.org/app-reviews/khan-academy-kids) ·
[study of manipulative design](https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2793493) ·
[UK screen-time advice, March 2026](https://educationhub.blog.gov.uk/2026/03/new-advice-for-parents-on-screen-time-for-young-children)

---

## 20. Intellectual property

> Research, not legal advice. Registers were not searched directly; a web search is not a
> clearance. Clearing names and keeping the asset register are boxes on the go-live gate
> ([`PHASE-4-PROD-READINESS.md`](PHASE-4-PROD-READINESS.md) §9.9 B).

### 20.1 What can and cannot be owned

| Thing | Position | So |
|---|---|---|
| A mechanic, a rule, an idea | Not protected by copyright in the UK or the US; only its expression is ([US Copyright Office](https://www.copyright.gov/register/tx-games.html); [Nova v Mazooma](https://www.scl.org/956-pool-cues-and-computer-games-the-look-and-feel-debate-played-out-in-the-court-of-appeal/)) | Pairs, sorting, counting, tracing and balancing are free to use |
| The look of a particular game | Copying the specific visual expression has been held to infringe ([Tetris v Xio](https://www.loeb.com/en/insights/publications/2012/06/tetris-holding-llc-v-xio-interactive-inc)). Both app stores forbid copycat names and screens | Take the idea. Design the screen, the art, the sound and the words from nothing, with the other game closed |
| A name | No copyright; protected as a trade mark, and in the UK by passing off even unregistered ([gov.uk](https://www.gov.uk/government/publications/ip-basics/ip-basics)) | §20.2 |
| A character | Can be protected in itself in both countries | No look-alikes. Check generated art against well-known characters |
| Art, music, text, recordings | Protected automatically, for the maker's life and 70 years in the UK ([gov.uk](https://www.gov.uk/copyright/how-long-copyright-lasts)) | Own it, commission it with a written assignment, or hold a licence |
| Traditional games and old rhymes | The pairs card game and the tangram are traditional. An old tune is free; somebody's arrangement or recording of it is not | Make our own recordings |
| Emoji | The pictures belong to their vendors. Apple forbids apps that include Apple's emoji as images ([guidelines](https://developer.apple.com/app-store/review/guidelines/)) | ⚠️ The spelling game and Phase 6 both use emoji as pictures. Drawn by the device's own font as text they are the device's; shipped as image files they are not. Check before go-live |
| Fonts | The licence of the font file governs. Apple's system fonts may not be bundled or used on other platforms ([Apple](https://developer.apple.com/fonts/)) | The app asks iOS for its rounded system font by name (`constants/theme.ts:37`) and bundles nothing, which is the permitted use. Android falls back to its own |
| Generated art and audio | In the US, material made purely by a model is not copyrightable. The UK gives authorship to whoever made the arrangements, and has floated repealing that | Weak ownership of raw output. Keep the tool, its licence, the prompt and the human edits in the register |

### 20.2 Words to keep out of titles, descriptions and keywords

| Word | Why |
|---|---|
| **Memory** | A Ravensburger mark for games in parts of Europe. The game here is "pairs" |
| Montessori | Generic in the US; contested in the UK, and claiming a method the app does not follow may mislead |
| Numicon, Cuisenaire, Jolly Phonics, Bee-Bot, LEGO, DUPLO, Simon | Other people's marks |
| Any competitor's name, character or feature | §19 |

### 20.3 The working titles

A web search only. "Low" means nothing surfaced, not that the name is free.

| Working title | Risk | What was found | Suggested instead |
|---|---|---|---|
| **Story Path** | **High** | A US filing for children's educational software, and an established curriculum called Storypath | *First, Next, Last* — a common teaching phrase, so safe to use and hard to own |
| **Stepping Stones** | **High** | ORIGO Stepping Stones, teaching software with a pre-school programme; also a common nursery name | *Pebble Patterns* — nothing identical surfaced |
| Seesaw Pond | Medium | Seesaw is the mark of a large primary-school learning platform | *The Tipping Log* — nothing surfaced |
| Frog Hop | Medium | A children's maths app of the same name | To be chosen. *Lily Hop* and *Lily Pad Hop* are both taken |
| Feelings Faces | Medium | Sesame Workshop's "Feeling Faces", for the same children | *A Face for a Feeling* |
| Word Builder | Medium | Descriptive and crowded | Keep as a plain description, not as a brand |
| Echo Pairs · Echo Song | Medium · Low | Amazon's Echo marks include children's products | *Sounds-alike pairs* (a pack) · *Play It Back* |
| Hedgehog's Way Home | Medium | A toddler app, "The Way Home"; a book and film, "Hedgehog's Home" | To be chosen |
| Owl's Lantern, Sound Post, Firefly Letters, Read and Do, Picnic Helper, Peek and Make, Shape Workshop, Tidy-Up Time, What Could Fox Do?, **Moonlight Pairs**, Who Went to Bed?, Story Stage | Low | Nothing in the children's category | — |

The headings in §4–§6 keep the working titles until the operator chooses.

### 20.4 Twelve rules for building

1. Search the UK and US registers in classes 9, 28 and 41, and both stores, before a name is shown in public.
2. Prefer invented names tied to the app's own characters.
3. Never use another's brand or method name, anywhere.
4. Take the idea, never the expression. Work with the reference closed.
5. Art is original or commissioned, with copyright assigned in writing.
6. No character resembles an existing one.
7. Music: our own recordings of tunes old enough to be free.
8. Voice: written consent from every performer. No cloned voices.
9. Fonts: a licence for each, covering both platforms.
10. Emoji and icons: none of a vendor's images.
11. Generated assets: tool, date, prompt, licence and human edits, recorded.
12. One register, one row per asset, read before each release.

---

## 21. What was built, and undone

Started on 2026-09-28, on the operator's instruction to begin, and **undone on 2026-09-30 at
the operator's request**, to investigate first how games are to be made. None of the code,
art or strings described here is in the repository any more; the paths in §21.4 no longer
exist. The section stands as a record of what was tried and what was learned.

Two games were on the shelf. The operator said of the first, Moonlight Pairs, that it was
"not what I was thinking", and asked for it to be reworked; the second, Otter Raft, is the
answer to that and is the one to judge. Moonlight Pairs is still on the shelf, second, until
the operator decides to keep, rework or remove it.

### 21.1 Otter Raft (ages 2 to 4)

Made from the book *Hold On, Juni*, with the book's own pictures. The otters have drifted
apart; the child brings them together, counts them, and gives each one something from the bay.

| | |
|---|---|
| **What the child does** | Touches or carries an otter to the raft. Each arrival is counted aloud in the caption ("One, two. Two otters holding on."). Then three things float in — a shell, a stone, a curl of kelp — and the child gives one to each otter. Two rounds make a sitting |
| **What it practises** | Counting to three with one touch for each otter; one thing for each (one-to-one matching); at three and over, matching a thing to the otter thinking of it. Hypothesis, not evidence: nothing here has been tried with children |
| **Fitted to age** | From the child's age in the profile. **Two to three:** Papa is waiting, the two small otters are near, and any thing suits any otter — a tap on a thing gives it to the next otter. **Three and over:** all three are adrift and further apart, each otter shows what it is thinking of, and the child picks up a thing and then touches the otter |
| **No profiling** | Nothing about the child's play is recorded. Difficulty comes from age alone (go-live gate, first option) |
| **Calm** | No timer, no score, no wrong-answer sound. A thing offered to the wrong otter goes back, and the caption says "Papa is thinking of something else." After three sittings in a row the otters are asleep and only "All done" is offered |
| **The ending** | The otters fall asleep where they are, holding their things, and rest just above a panel showing the last page of the book and its line: "Hold on," said Juni. "So we don't drift apart." |
| **Art** | Cut from the book's artwork by `scripts/prepare-otter-raft-art.py`; nothing new was generated. Registered in [`compliance/ASSET-REGISTER.md`](compliance/ASSET-REGISTER.md), where the licence of the source pictures is marked unverified |
| **Sound** | A soft ocarina note as each otter joins and each thing is given, at 35% volume, silent when the app is muted. **No voice**: the captions are for the grown-up to read aloud, until decision 3 of §18 is made |
| **Seen working** | On an iPhone 17e and an iPad Pro 11 in the simulator, both age bands, from the shelf to the ending and back, on 2026-09-28 and 29. Not yet seen on Android, on a small phone, on a tablet on its side, or in a right-to-left language |
| **Known weaknesses** | The bay is widened for tablets by its own mirror image, and the island in the middle looks symmetrical; a wider picture of the bay from the story factory would mend it. The name "Otter Raft" is not cleared (§20.3) |

### 21.2 Moonlight Pairs (W3)

| | |
|---|---|
| **Fitted to age** | Two pairs shown face up at two; three hidden at three; four at four; six at five and over |
| **Calm** | No timer, no score, no count of turns. A miss settles back. After three misses in a row one pair is quietly pointed at. After three sittings the animals go to sleep |
| **Art** | The app's own: the five night-sky animals and the ten feelings animals |
| **Sound** | None |

### 21.3 True of both

| | |
|---|---|
| **Way in** | A "Things to do" row on the catalogue's Learning tile, which answers decision 2 of §18 in the way recommended there |
| **Languages** | All fourteen. Thirteen are my translations and want a native speaker's check |
| **Not recorded** | Finishing a game earns no badge and is not synced. A new challenge kind changes the server contract (`ChallengeKind`, `challengeCounts`) and is left for a decision |

### 21.4 Where it is

All under `grow-with-freya/`.

| Where | What |
|---|---|
| `components/games/play/` | Shared: age bands; a seeded random source; the card a game shows on the shelf; the closing panel |
| `components/games/raft/` | Otter Raft: the round and its rules (`raft-round.ts`); where things sit on a screen (`raft-layout.ts`); the otter, the thing, the screen |
| `hooks/use-otter-raft.ts`, `hooks/use-raft-chime.ts` | Otter Raft: the game itself; its chime |
| `assets/games/otter-raft/`, `constants/otter-raft-art.ts`, `scripts/prepare-otter-raft-art.py` | Otter Raft: the pictures, the module that names them, and the script that cuts them |
| `components/games/pairs/`, `hooks/use-pairs-game.ts`, `data/pairs-packs.ts` | Moonlight Pairs |
| `data/play-games.ts` | The list of games on the shelf |
| `app/_layout.tsx`, `components/ui/enhanced-page-transition.tsx`, `constants/page-slide.ts` | The pages. **A new game page must be added to all three**, or it opens blank |
| `components/stories/catalogue/story-catalogue-screen.tsx`, `components/stories/simple-story-screen.tsx` | The way in |
| `locales/*/index.ts` | A `play` section in each |

The age bands, the random source, the shelf card, the closing panel and the way in are
shared. The next game needs none of them built again.
