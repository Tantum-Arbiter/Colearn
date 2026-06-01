/**
 * Numbers Stories — Narrative-driven spelling challenges for Numbers activities
 *
 * 75 stories total (5 per activity × 15 activities).
 *
 * Difficulty groups:
 *   - Easy  (ages 1–2): 5 activities × 5 stories = 25 stories
 *   - Medium (ages 2–4): 5 activities × 5 stories = 25 stories
 *   - Hard  (ages 4+):   5 activities × 5 stories = 25 stories
 */

import type { SpellingStory, StoryPageMode } from '@/types/spelling-game';

function page(storyId: string, pageNum: number, word: string, emoji: string) {
  return { narrativeKey: `numbers.stories.${storyId}.page${pageNum}`, word, emoji };
}

function blank(storyId: string, pageNum: number, blankWords: string[], distractorWords?: string[]) {
  return {
    narrativeKey: `numbers.stories.${storyId}.page${pageNum}`,
    word: blankWords[0], emoji: '', mode: 'fill-blank' as StoryPageMode,
    blankWords, ...(distractorWords ? { distractorWords } : {}),
  };
}

// ── EASY: counting-fun (5 stories) ─────────────────────────────────

const cf1: SpellingStory = { id: 'cf-starry-count', activityId: 'counting-fun', titleKey: 'numbers.stories.cf1.title', pages: [
  page('cf1', 1, 'one', '1️⃣'), blank('cf1', 2, ['two', 'ten']),
  page('cf1', 3, 'five', '5️⃣'), blank('cf1', 4, ['six', 'add']),
  page('cf1', 5, 'four', '4️⃣'),
] };
const cf2: SpellingStory = { id: 'cf-sunny-count', activityId: 'counting-fun', titleKey: 'numbers.stories.cf2.title', pages: [
  page('cf2', 1, 'two', '2️⃣'), blank('cf2', 2, ['one', 'sum']),
  page('cf2', 3, 'ten', '🔟'), blank('cf2', 4, ['five', 'four']),
  page('cf2', 5, 'six', '6️⃣'),
] };
const cf3: SpellingStory = { id: 'cf-rainbow-count', activityId: 'counting-fun', titleKey: 'numbers.stories.cf3.title', pages: [
  page('cf3', 1, 'add', '➕'), blank('cf3', 2, ['six', 'one']),
  page('cf3', 3, 'sum', '🧮'), blank('cf3', 4, ['ten', 'two']),
  page('cf3', 5, 'five', '5️⃣'),
] };
const cf4: SpellingStory = { id: 'cf-garden-count', activityId: 'counting-fun', titleKey: 'numbers.stories.cf4.title', pages: [
  page('cf4', 1, 'six', '6️⃣'), blank('cf4', 2, ['four', 'add']),
  page('cf4', 3, 'one', '1️⃣'), blank('cf4', 4, ['two', 'sum']),
  page('cf4', 5, 'ten', '🔟'),
] };
const cf5: SpellingStory = { id: 'cf-ocean-count', activityId: 'counting-fun', titleKey: 'numbers.stories.cf5.title', pages: [
  page('cf5', 1, 'four', '4️⃣'), blank('cf5', 2, ['five', 'six']),
  page('cf5', 3, 'two', '2️⃣'), blank('cf5', 4, ['one', 'add']),
  page('cf5', 5, 'sum', '🧮'),
] };

// ── EASY: number-friends (5 stories) ───────────────────────────────

const nf1: SpellingStory = { id: 'nf-bear-friends', activityId: 'number-friends', titleKey: 'numbers.stories.nf1.title', pages: [
  page('nf1', 1, 'one', '1️⃣'), blank('nf1', 2, ['two', 'hug']),
  page('nf1', 3, 'big', '🐘'), blank('nf1', 4, ['fun', 'five']),
  page('nf1', 5, 'six', '6️⃣'),
] };
const nf2: SpellingStory = { id: 'nf-puppy-pals', activityId: 'number-friends', titleKey: 'numbers.stories.nf2.title', pages: [
  page('nf2', 1, 'hug', '🤗'), blank('nf2', 2, ['one', 'big']),
  page('nf2', 3, 'fun', '🎉'), blank('nf2', 4, ['ten', 'two']),
  page('nf2', 5, 'five', '5️⃣'),
] };
const nf3: SpellingStory = { id: 'nf-kitten-club', activityId: 'number-friends', titleKey: 'numbers.stories.nf3.title', pages: [
  page('nf3', 1, 'two', '2️⃣'), blank('nf3', 2, ['fun', 'six']),
  page('nf3', 3, 'ten', '🔟'), blank('nf3', 4, ['hug', 'big']),
  page('nf3', 5, 'one', '1️⃣'),
] };
const nf4: SpellingStory = { id: 'nf-bunny-band', activityId: 'number-friends', titleKey: 'numbers.stories.nf4.title', pages: [
  page('nf4', 1, 'five', '5️⃣'), blank('nf4', 2, ['six', 'one']),
  page('nf4', 3, 'hug', '🤗'), blank('nf4', 4, ['big', 'fun']),
  page('nf4', 5, 'ten', '🔟'),
] };
const nf5: SpellingStory = { id: 'nf-duck-pals', activityId: 'number-friends', titleKey: 'numbers.stories.nf5.title', pages: [
  page('nf5', 1, 'six', '6️⃣'), blank('nf5', 2, ['two', 'fun']),
  page('nf5', 3, 'big', '🐘'), blank('nf5', 4, ['one', 'hug']),
  page('nf5', 5, 'five', '5️⃣'),
] };

// ── EASY: colour-counting (5 stories) ──────────────────────────────

const cc1: SpellingStory = { id: 'cc-paint-pots', activityId: 'colour-counting', titleKey: 'numbers.stories.cc1.title', pages: [
  page('cc1', 1, 'red', '🔴'), blank('cc1', 2, ['two', 'blue']),
  page('cc1', 3, 'five', '5️⃣'), blank('cc1', 4, ['pink', 'one']),
  page('cc1', 5, 'ten', '🔟'),
] };
const cc2: SpellingStory = { id: 'cc-crayon-box', activityId: 'colour-counting', titleKey: 'numbers.stories.cc2.title', pages: [
  page('cc2', 1, 'blue', '🔵'), blank('cc2', 2, ['red', 'four']),
  page('cc2', 3, 'one', '1️⃣'), blank('cc2', 4, ['ten', 'pink']),
  page('cc2', 5, 'five', '5️⃣'),
] };
const cc3: SpellingStory = { id: 'cc-rainbow-train', activityId: 'colour-counting', titleKey: 'numbers.stories.cc3.title', pages: [
  page('cc3', 1, 'pink', '🩷'), blank('cc3', 2, ['five', 'red']),
  page('cc3', 3, 'four', '4️⃣'), blank('cc3', 4, ['blue', 'two']),
  page('cc3', 5, 'one', '1️⃣'),
] };
const cc4: SpellingStory = { id: 'cc-colour-kites', activityId: 'colour-counting', titleKey: 'numbers.stories.cc4.title', pages: [
  page('cc4', 1, 'four', '4️⃣'), blank('cc4', 2, ['one', 'pink']),
  page('cc4', 3, 'red', '🔴'), blank('cc4', 4, ['five', 'blue']),
  page('cc4', 5, 'two', '2️⃣'),
] };
const cc5: SpellingStory = { id: 'cc-chalk-garden', activityId: 'colour-counting', titleKey: 'numbers.stories.cc5.title', pages: [
  page('cc5', 1, 'ten', '🔟'), blank('cc5', 2, ['four', 'red']),
  page('cc5', 3, 'blue', '🔵'), blank('cc5', 4, ['two', 'pink']),
  page('cc5', 5, 'five', '5️⃣'),
] };

// ── EASY: shape-counting (5 stories) ───────────────────────────────

const sc1: SpellingStory = { id: 'sc-shape-train', activityId: 'shape-counting', titleKey: 'numbers.stories.sc1.title', pages: [
  page('sc1', 1, 'box', '📦'), blank('sc1', 2, ['star', 'two']),
  page('sc1', 3, 'ring', '💍'), blank('sc1', 4, ['cone', 'five']),
  page('sc1', 5, 'one', '1️⃣'),
] };
const sc2: SpellingStory = { id: 'sc-shape-boat', activityId: 'shape-counting', titleKey: 'numbers.stories.sc2.title', pages: [
  page('sc2', 1, 'star', '⭐'), blank('sc2', 2, ['box', 'one']),
  page('sc2', 3, 'cone', '🔺'), blank('sc2', 4, ['ring', 'ten']),
  page('sc2', 5, 'two', '2️⃣'),
] };
const sc3: SpellingStory = { id: 'sc-shape-kite', activityId: 'shape-counting', titleKey: 'numbers.stories.sc3.title', pages: [
  page('sc3', 1, 'five', '5️⃣'), blank('sc3', 2, ['cone', 'star']),
  page('sc3', 3, 'box', '📦'), blank('sc3', 4, ['two', 'ring']),
  page('sc3', 5, 'ten', '🔟'),
] };
const sc4: SpellingStory = { id: 'sc-shape-castle', activityId: 'shape-counting', titleKey: 'numbers.stories.sc4.title', pages: [
  page('sc4', 1, 'cone', '🔺'), blank('sc4', 2, ['five', 'box']),
  page('sc4', 3, 'ten', '🔟'), blank('sc4', 4, ['star', 'one']),
  page('sc4', 5, 'ring', '💍'),
] };
const sc5: SpellingStory = { id: 'sc-shape-rocket', activityId: 'shape-counting', titleKey: 'numbers.stories.sc5.title', pages: [
  page('sc5', 1, 'ring', '💍'), blank('sc5', 2, ['ten', 'cone']),
  page('sc5', 3, 'two', '2️⃣'), blank('sc5', 4, ['box', 'five']),
  page('sc5', 5, 'star', '⭐'),
] };

// ── EASY: one-two-three (5 stories) ─────────────────────────────────

const ot1: SpellingStory = { id: 'ot-step-count', activityId: 'one-two-three', titleKey: 'numbers.stories.ot1.title', pages: [
  page('ot1', 1, 'one', '1️⃣'), blank('ot1', 2, ['two', 'big']),
  page('ot1', 3, 'six', '6️⃣'), blank('ot1', 4, ['ten', 'add']),
  page('ot1', 5, 'five', '5️⃣'),
] };
const ot2: SpellingStory = { id: 'ot-cloud-hop', activityId: 'one-two-three', titleKey: 'numbers.stories.ot2.title', pages: [
  page('ot2', 1, 'two', '2️⃣'), blank('ot2', 2, ['one', 'six']),
  page('ot2', 3, 'add', '➕'), blank('ot2', 4, ['four', 'big']),
  page('ot2', 5, 'ten', '🔟'),
] };
const ot3: SpellingStory = { id: 'ot-bee-trail', activityId: 'one-two-three', titleKey: 'numbers.stories.ot3.title', pages: [
  page('ot3', 1, 'ten', '🔟'), blank('ot3', 2, ['five', 'two']),
  page('ot3', 3, 'big', '🐘'), blank('ot3', 4, ['six', 'one']),
  page('ot3', 5, 'four', '4️⃣'),
] };
const ot4: SpellingStory = { id: 'ot-leaf-jump', activityId: 'one-two-three', titleKey: 'numbers.stories.ot4.title', pages: [
  page('ot4', 1, 'five', '5️⃣'), blank('ot4', 2, ['add', 'ten']),
  page('ot4', 3, 'four', '4️⃣'), blank('ot4', 4, ['two', 'big']),
  page('ot4', 5, 'one', '1️⃣'),
] };
const ot5: SpellingStory = { id: 'ot-puddle-splash', activityId: 'one-two-three', titleKey: 'numbers.stories.ot5.title', pages: [
  page('ot5', 1, 'add', '➕'), blank('ot5', 2, ['four', 'one']),
  page('ot5', 3, 'six', '6️⃣'), blank('ot5', 4, ['five', 'two']),
  page('ot5', 5, 'big', '🐘'),
] };

// ── MEDIUM: wombat-word-placing (5 stories) ────────────────────────

const wp1: SpellingStory = { id: 'wp-forest-count', activityId: 'wombat-word-placing', titleKey: 'numbers.stories.wp1.title', pages: [
  page('wp1', 1, 'count', '🔢'), blank('wp1', 2, ['seven', 'total', 'equal'], ['minus']),
  page('wp1', 3, 'eight', '8️⃣'), blank('wp1', 4, ['dozen', 'twice', 'count'], ['seven']),
  page('wp1', 5, 'total', '🧮'),
] };
const wp2: SpellingStory = { id: 'wp-star-math', activityId: 'wombat-word-placing', titleKey: 'numbers.stories.wp2.title', pages: [
  page('wp2', 1, 'seven', '7️⃣'), blank('wp2', 2, ['eight', 'minus', 'total'], ['dozen']),
  page('wp2', 3, 'twice', '✌️'), blank('wp2', 4, ['equal', 'count', 'seven'], ['eight']),
  page('wp2', 5, 'dozen', '📦'),
] };
const wp3: SpellingStory = { id: 'wp-river-sum', activityId: 'wombat-word-placing', titleKey: 'numbers.stories.wp3.title', pages: [
  page('wp3', 1, 'equal', '⚖️'), blank('wp3', 2, ['count', 'dozen', 'twice'], ['total']),
  page('wp3', 3, 'minus', '➖'), blank('wp3', 4, ['seven', 'eight', 'total'], ['equal']),
  page('wp3', 5, 'count', '🔢'),
] };
const wp4: SpellingStory = { id: 'wp-cloud-tally', activityId: 'wombat-word-placing', titleKey: 'numbers.stories.wp4.title', pages: [
  page('wp4', 1, 'dozen', '📦'), blank('wp4', 2, ['twice', 'equal', 'minus'], ['count']),
  page('wp4', 3, 'total', '🧮'), blank('wp4', 4, ['count', 'eight', 'seven'], ['twice']),
  page('wp4', 5, 'equal', '⚖️'),
] };
const wp5: SpellingStory = { id: 'wp-moon-math', activityId: 'wombat-word-placing', titleKey: 'numbers.stories.wp5.title', pages: [
  page('wp5', 1, 'twice', '✌️'), blank('wp5', 2, ['minus', 'seven', 'dozen'], ['eight']),
  page('wp5', 3, 'count', '🔢'), blank('wp5', 4, ['total', 'equal', 'eight'], ['minus']),
  page('wp5', 5, 'seven', '7️⃣'),
] };

// ── MEDIUM: animal-counting (5 stories) ────────────────────────────

const ac1: SpellingStory = { id: 'ac-safari-sum', activityId: 'animal-counting', titleKey: 'numbers.stories.ac1.title', pages: [
  page('ac1', 1, 'panda', '🐼'), blank('ac1', 2, ['count', 'seven', 'tiger'], ['total']),
  page('ac1', 3, 'three', '3️⃣'), blank('ac1', 4, ['eight', 'equal', 'panda'], ['count']),
  page('ac1', 5, 'total', '🧮'),
] };
const ac2: SpellingStory = { id: 'ac-jungle-tally', activityId: 'animal-counting', titleKey: 'numbers.stories.ac2.title', pages: [
  page('ac2', 1, 'tiger', '🐯'), blank('ac2', 2, ['panda', 'eight', 'count'], ['seven']),
  page('ac2', 3, 'equal', '⚖️'), blank('ac2', 4, ['three', 'total', 'tiger'], ['eight']),
  page('ac2', 5, 'seven', '7️⃣'),
] };
const ac3: SpellingStory = { id: 'ac-pond-count', activityId: 'animal-counting', titleKey: 'numbers.stories.ac3.title', pages: [
  page('ac3', 1, 'count', '🔢'), blank('ac3', 2, ['tiger', 'three', 'equal'], ['panda']),
  page('ac3', 3, 'seven', '7️⃣'), blank('ac3', 4, ['panda', 'total', 'count'], ['three']),
  page('ac3', 5, 'eight', '8️⃣'),
] };
const ac4: SpellingStory = { id: 'ac-farm-math', activityId: 'animal-counting', titleKey: 'numbers.stories.ac4.title', pages: [
  page('ac4', 1, 'eight', '8️⃣'), blank('ac4', 2, ['seven', 'panda', 'total'], ['tiger']),
  page('ac4', 3, 'tiger', '🐯'), blank('ac4', 4, ['count', 'three', 'equal'], ['seven']),
  page('ac4', 5, 'panda', '🐼'),
] };
const ac5: SpellingStory = { id: 'ac-zoo-count', activityId: 'animal-counting', titleKey: 'numbers.stories.ac5.title', pages: [
  page('ac5', 1, 'three', '3️⃣'), blank('ac5', 2, ['equal', 'count', 'seven'], ['eight']),
  page('ac5', 3, 'total', '🧮'), blank('ac5', 4, ['tiger', 'panda', 'eight'], ['total']),
  page('ac5', 5, 'count', '🔢'),
] };

// ── MEDIUM: fruit-counting (5 stories) ──────────────────────────────

const fc1: SpellingStory = { id: 'fc-orchard-sum', activityId: 'fruit-counting', titleKey: 'numbers.stories.fc1.title', pages: [
  page('fc1', 1, 'apple', '🍎'), blank('fc1', 2, ['grape', 'seven', 'count'], ['melon']),
  page('fc1', 3, 'three', '3️⃣'), blank('fc1', 4, ['melon', 'total', 'eight'], ['grape']),
  page('fc1', 5, 'total', '🧮'),
] };
const fc2: SpellingStory = { id: 'fc-market-math', activityId: 'fruit-counting', titleKey: 'numbers.stories.fc2.title', pages: [
  page('fc2', 1, 'grape', '🍇'), blank('fc2', 2, ['apple', 'eight', 'total'], ['count']),
  page('fc2', 3, 'seven', '7️⃣'), blank('fc2', 4, ['count', 'melon', 'three'], ['apple']),
  page('fc2', 5, 'melon', '🍈'),
] };
const fc3: SpellingStory = { id: 'fc-picnic-count', activityId: 'fruit-counting', titleKey: 'numbers.stories.fc3.title', pages: [
  page('fc3', 1, 'melon', '🍈'), blank('fc3', 2, ['three', 'apple', 'seven'], ['total']),
  page('fc3', 3, 'count', '🔢'), blank('fc3', 4, ['grape', 'total', 'eight'], ['seven']),
  page('fc3', 5, 'apple', '🍎'),
] };
const fc4: SpellingStory = { id: 'fc-garden-fruit', activityId: 'fruit-counting', titleKey: 'numbers.stories.fc4.title', pages: [
  page('fc4', 1, 'count', '🔢'), blank('fc4', 2, ['melon', 'grape', 'total'], ['three']),
  page('fc4', 3, 'eight', '8️⃣'), blank('fc4', 4, ['apple', 'seven', 'count'], ['eight']),
  page('fc4', 5, 'three', '3️⃣'),
] };
const fc5: SpellingStory = { id: 'fc-smoothie-sum', activityId: 'fruit-counting', titleKey: 'numbers.stories.fc5.title', pages: [
  page('fc5', 1, 'seven', '7️⃣'), blank('fc5', 2, ['total', 'count', 'apple'], ['melon']),
  page('fc5', 3, 'grape', '🍇'), blank('fc5', 4, ['eight', 'melon', 'three'], ['count']),
  page('fc5', 5, 'total', '🧮'),
] };

// ── MEDIUM: toy-counting (5 stories) ───────────────────────────────

const tc1: SpellingStory = { id: 'tc-toy-shelf', activityId: 'toy-counting', titleKey: 'numbers.stories.tc1.title', pages: [
  page('tc1', 1, 'block', '🧱'), blank('tc1', 2, ['train', 'seven', 'count'], ['dolly']),
  page('tc1', 3, 'truck', '🚚'), blank('tc1', 4, ['dolly', 'total', 'eight'], ['block']),
  page('tc1', 5, 'total', '🧮'),
] };
const tc2: SpellingStory = { id: 'tc-playroom-sum', activityId: 'toy-counting', titleKey: 'numbers.stories.tc2.title', pages: [
  page('tc2', 1, 'train', '🚂'), blank('tc2', 2, ['block', 'eight', 'dolly'], ['truck']),
  page('tc2', 3, 'seven', '7️⃣'), blank('tc2', 4, ['truck', 'count', 'total'], ['train']),
  page('tc2', 5, 'dolly', '🪆'),
] };
const tc3: SpellingStory = { id: 'tc-toy-parade', activityId: 'toy-counting', titleKey: 'numbers.stories.tc3.title', pages: [
  page('tc3', 1, 'dolly', '🪆'), blank('tc3', 2, ['truck', 'total', 'train'], ['seven']),
  page('tc3', 3, 'count', '🔢'), blank('tc3', 4, ['block', 'seven', 'eight'], ['dolly']),
  page('tc3', 5, 'train', '🚂'),
] };
const tc4: SpellingStory = { id: 'tc-box-tidy', activityId: 'toy-counting', titleKey: 'numbers.stories.tc4.title', pages: [
  page('tc4', 1, 'eight', '8️⃣'), blank('tc4', 2, ['dolly', 'count', 'block'], ['total']),
  page('tc4', 3, 'truck', '🚚'), blank('tc4', 4, ['train', 'total', 'seven'], ['count']),
  page('tc4', 5, 'block', '🧱'),
] };
const tc5: SpellingStory = { id: 'tc-toy-race', activityId: 'toy-counting', titleKey: 'numbers.stories.tc5.title', pages: [
  page('tc5', 1, 'count', '🔢'), blank('tc5', 2, ['seven', 'truck', 'dolly'], ['eight']),
  page('tc5', 3, 'total', '🧮'), blank('tc5', 4, ['train', 'block', 'eight'], ['truck']),
  page('tc5', 5, 'seven', '7️⃣'),
] };

// ── MEDIUM: garden-counting (5 stories) ────────────────────────────

const gc1: SpellingStory = { id: 'gc-flower-sum', activityId: 'garden-counting', titleKey: 'numbers.stories.gc1.title', pages: [
  page('gc1', 1, 'bloom', '🌸'), blank('gc1', 2, ['petal', 'seven', 'count'], ['three']),
  page('gc1', 3, 'bunch', '💐'), blank('gc1', 4, ['total', 'eight', 'bloom'], ['petal']),
  page('gc1', 5, 'three', '3️⃣'),
] };
const gc2: SpellingStory = { id: 'gc-seed-tally', activityId: 'garden-counting', titleKey: 'numbers.stories.gc2.title', pages: [
  page('gc2', 1, 'petal', '🌺'), blank('gc2', 2, ['bloom', 'eight', 'bunch'], ['total']),
  page('gc2', 3, 'count', '🔢'), blank('gc2', 4, ['three', 'seven', 'petal'], ['bunch']),
  page('gc2', 5, 'total', '🧮'),
] };
const gc3: SpellingStory = { id: 'gc-pot-count', activityId: 'garden-counting', titleKey: 'numbers.stories.gc3.title', pages: [
  page('gc3', 1, 'seven', '7️⃣'), blank('gc3', 2, ['count', 'bunch', 'total'], ['bloom']),
  page('gc3', 3, 'petal', '🌺'), blank('gc3', 4, ['bloom', 'three', 'eight'], ['seven']),
  page('gc3', 5, 'count', '🔢'),
] };
const gc4: SpellingStory = { id: 'gc-rain-bloom', activityId: 'garden-counting', titleKey: 'numbers.stories.gc4.title', pages: [
  page('gc4', 1, 'three', '3️⃣'), blank('gc4', 2, ['total', 'petal', 'seven'], ['count']),
  page('gc4', 3, 'eight', '8️⃣'), blank('gc4', 4, ['bunch', 'bloom', 'count'], ['total']),
  page('gc4', 5, 'seven', '7️⃣'),
] };
const gc5: SpellingStory = { id: 'gc-garden-math', activityId: 'garden-counting', titleKey: 'numbers.stories.gc5.title', pages: [
  page('gc5', 1, 'eight', '8️⃣'), blank('gc5', 2, ['three', 'bloom', 'count'], ['petal']),
  page('gc5', 3, 'total', '🧮'), blank('gc5', 4, ['petal', 'seven', 'bunch'], ['eight']),
  page('gc5', 5, 'bunch', '💐'),
] };

// ── HARD: number-puzzles (5 stories) ────────────────────────────────

const np1: SpellingStory = { id: 'np-riddle-room', activityId: 'number-puzzles', titleKey: 'numbers.stories.np1.title', pages: [
  page('np1', 1, 'puzzle', '🧩'), blank('np1', 2, ['twelve', 'double', 'equals'], ['divide', 'triple']),
  page('np1', 3, 'twenty', '🔢'), blank('np1', 4, ['eleven', 'triple', 'divide'], ['puzzle', 'twelve']),
  page('np1', 5, 'equals', '⚖️'),
] };
const np2: SpellingStory = { id: 'np-maze-math', activityId: 'number-puzzles', titleKey: 'numbers.stories.np2.title', pages: [
  page('np2', 1, 'twelve', '🔢'), blank('np2', 2, ['twenty', 'puzzle', 'triple'], ['equals', 'double']),
  page('np2', 3, 'divide', '➗'), blank('np2', 4, ['double', 'eleven', 'equals'], ['twelve', 'triple']),
  page('np2', 5, 'puzzle', '🧩'),
] };
const np3: SpellingStory = { id: 'np-key-quest', activityId: 'number-puzzles', titleKey: 'numbers.stories.np3.title', pages: [
  page('np3', 1, 'double', '✖️'), blank('np3', 2, ['divide', 'twelve', 'twenty'], ['eleven', 'equals']),
  page('np3', 3, 'eleven', '🔢'), blank('np3', 4, ['puzzle', 'triple', 'equals'], ['twenty', 'divide']),
  page('np3', 5, 'triple', '✖️'),
] };
const np4: SpellingStory = { id: 'np-clock-puzzle', activityId: 'number-puzzles', titleKey: 'numbers.stories.np4.title', pages: [
  page('np4', 1, 'triple', '✖️'), blank('np4', 2, ['equals', 'eleven', 'puzzle'], ['divide', 'double']),
  page('np4', 3, 'twelve', '🔢'), blank('np4', 4, ['twenty', 'double', 'divide'], ['triple', 'puzzle']),
  page('np4', 5, 'eleven', '🔢'),
] };
const np5: SpellingStory = { id: 'np-treasure-lock', activityId: 'number-puzzles', titleKey: 'numbers.stories.np5.title', pages: [
  page('np5', 1, 'equals', '⚖️'), blank('np5', 2, ['triple', 'twenty', 'divide'], ['puzzle', 'eleven']),
  page('np5', 3, 'double', '✖️'), blank('np5', 4, ['twelve', 'puzzle', 'eleven'], ['equals', 'twenty']),
  page('np5', 5, 'twenty', '🔢'),
] };

// ── HARD: adding-fun (5 stories) ───────────────────────────────────

const af1: SpellingStory = { id: 'af-sum-quest', activityId: 'adding-fun', titleKey: 'numbers.stories.af1.title', pages: [
  page('af1', 1, 'adding', '➕'), blank('af1', 2, ['twelve', 'double', 'equals'], ['total', 'twenty']),
  page('af1', 3, 'number', '🔢'), blank('af1', 4, ['twenty', 'eleven', 'total'], ['adding', 'double']),
  page('af1', 5, 'equals', '⚖️'),
] };
const af2: SpellingStory = { id: 'af-cloud-sum', activityId: 'adding-fun', titleKey: 'numbers.stories.af2.title', pages: [
  page('af2', 1, 'twelve', '🔢'), blank('af2', 2, ['adding', 'number', 'total'], ['eleven', 'equals']),
  page('af2', 3, 'double', '✖️'), blank('af2', 4, ['twenty', 'equals', 'eleven'], ['twelve', 'number']),
  page('af2', 5, 'total', '🧮'),
] };
const af3: SpellingStory = { id: 'af-river-add', activityId: 'adding-fun', titleKey: 'numbers.stories.af3.title', pages: [
  page('af3', 1, 'twenty', '🔢'), blank('af3', 2, ['total', 'twelve', 'adding'], ['double', 'number']),
  page('af3', 3, 'eleven', '🔢'), blank('af3', 4, ['number', 'double', 'equals'], ['twenty', 'total']),
  page('af3', 5, 'adding', '➕'),
] };
const af4: SpellingStory = { id: 'af-star-add', activityId: 'adding-fun', titleKey: 'numbers.stories.af4.title', pages: [
  page('af4', 1, 'total', '🧮'), blank('af4', 2, ['eleven', 'equals', 'twenty'], ['adding', 'twelve']),
  page('af4', 3, 'number', '🔢'), blank('af4', 4, ['adding', 'twelve', 'double'], ['eleven', 'total']),
  page('af4', 5, 'twenty', '🔢'),
] };
const af5: SpellingStory = { id: 'af-moon-add', activityId: 'adding-fun', titleKey: 'numbers.stories.af5.title', pages: [
  page('af5', 1, 'eleven', '🔢'), blank('af5', 2, ['double', 'total', 'number'], ['twelve', 'adding']),
  page('af5', 3, 'equals', '⚖️'), blank('af5', 4, ['twelve', 'adding', 'twenty'], ['double', 'number']),
  page('af5', 5, 'double', '✖️'),
] };

// ── HARD: number-stories (5 stories) ────────────────────────────────

const ns1: SpellingStory = { id: 'ns-dragon-count', activityId: 'number-stories', titleKey: 'numbers.stories.ns1.title', pages: [
  page('ns1', 1, 'story', '📖'), blank('ns1', 2, ['twelve', 'puzzle', 'equals'], ['number', 'count']),
  page('ns1', 3, 'twenty', '🔢'), blank('ns1', 4, ['eleven', 'count', 'number'], ['story', 'puzzle']),
  page('ns1', 5, 'puzzle', '🧩'),
] };
const ns2: SpellingStory = { id: 'ns-fairy-math', activityId: 'number-stories', titleKey: 'numbers.stories.ns2.title', pages: [
  page('ns2', 1, 'twelve', '🔢'), blank('ns2', 2, ['story', 'number', 'count'], ['twenty', 'equals']),
  page('ns2', 3, 'equals', '⚖️'), blank('ns2', 4, ['twenty', 'puzzle', 'eleven'], ['twelve', 'story']),
  page('ns2', 5, 'number', '🔢'),
] };
const ns3: SpellingStory = { id: 'ns-pirate-sum', activityId: 'number-stories', titleKey: 'numbers.stories.ns3.title', pages: [
  page('ns3', 1, 'count', '🔢'), blank('ns3', 2, ['eleven', 'twenty', 'story'], ['puzzle', 'twelve']),
  page('ns3', 3, 'number', '🔢'), blank('ns3', 4, ['puzzle', 'twelve', 'equals'], ['count', 'eleven']),
  page('ns3', 5, 'eleven', '🔢'),
] };
const ns4: SpellingStory = { id: 'ns-robot-tale', activityId: 'number-stories', titleKey: 'numbers.stories.ns4.title', pages: [
  page('ns4', 1, 'eleven', '🔢'), blank('ns4', 2, ['count', 'equals', 'twelve'], ['number', 'twenty']),
  page('ns4', 3, 'puzzle', '🧩'), blank('ns4', 4, ['story', 'number', 'twenty'], ['equals', 'count']),
  page('ns4', 5, 'twelve', '🔢'),
] };
const ns5: SpellingStory = { id: 'ns-wizard-count', activityId: 'number-stories', titleKey: 'numbers.stories.ns5.title', pages: [
  page('ns5', 1, 'number', '🔢'), blank('ns5', 2, ['puzzle', 'story', 'eleven'], ['count', 'twelve']),
  page('ns5', 3, 'twenty', '🔢'), blank('ns5', 4, ['twelve', 'equals', 'count'], ['number', 'story']),
  page('ns5', 5, 'story', '📖'),
] };

// ── HARD: number-patterns (5 stories) ──────────────────────────────

const npa1: SpellingStory = { id: 'npa-stripe-code', activityId: 'number-patterns', titleKey: 'numbers.stories.npa1.title', pages: [
  page('npa1', 1, 'series', '📊'), blank('npa1', 2, ['twelve', 'double', 'repeat'], ['triple', 'equals']),
  page('npa1', 3, 'twenty', '🔢'), blank('npa1', 4, ['eleven', 'triple', 'equals'], ['series', 'double']),
  page('npa1', 5, 'repeat', '🔄'),
] };
const npa2: SpellingStory = { id: 'npa-bead-chain', activityId: 'number-patterns', titleKey: 'numbers.stories.npa2.title', pages: [
  page('npa2', 1, 'double', '✖️'), blank('npa2', 2, ['series', 'twenty', 'eleven'], ['repeat', 'twelve']),
  page('npa2', 3, 'triple', '✖️'), blank('npa2', 4, ['repeat', 'twelve', 'equals'], ['double', 'twenty']),
  page('npa2', 5, 'eleven', '🔢'),
] };
const npa3: SpellingStory = { id: 'npa-tile-floor', activityId: 'number-patterns', titleKey: 'numbers.stories.npa3.title', pages: [
  page('npa3', 1, 'twelve', '🔢'), blank('npa3', 2, ['repeat', 'double', 'series'], ['triple', 'twenty']),
  page('npa3', 3, 'equals', '⚖️'), blank('npa3', 4, ['twenty', 'triple', 'eleven'], ['twelve', 'repeat']),
  page('npa3', 5, 'series', '📊'),
] };
const npa4: SpellingStory = { id: 'npa-star-spiral', activityId: 'number-patterns', titleKey: 'numbers.stories.npa4.title', pages: [
  page('npa4', 1, 'repeat', '🔄'), blank('npa4', 2, ['eleven', 'equals', 'twelve'], ['series', 'triple']),
  page('npa4', 3, 'double', '✖️'), blank('npa4', 4, ['series', 'twenty', 'triple'], ['repeat', 'eleven']),
  page('npa4', 5, 'twelve', '🔢'),
] };
const npa5: SpellingStory = { id: 'npa-wave-rhythm', activityId: 'number-patterns', titleKey: 'numbers.stories.npa5.title', pages: [
  page('npa5', 1, 'eleven', '🔢'), blank('npa5', 2, ['triple', 'series', 'twenty'], ['double', 'equals']),
  page('npa5', 3, 'repeat', '🔄'), blank('npa5', 4, ['double', 'twelve', 'equals'], ['eleven', 'series']),
  page('npa5', 5, 'twenty', '🔢'),
] };

// ── HARD: subtraction-fun (5 stories) ──────────────────────────────

const sf1: SpellingStory = { id: 'sf-cookie-share', activityId: 'subtraction-fun', titleKey: 'numbers.stories.sf1.title', pages: [
  page('sf1', 1, 'minus', '➖'), blank('sf1', 2, ['twelve', 'fewer', 'equals'], ['leave', 'remain']),
  page('sf1', 3, 'twenty', '🔢'), blank('sf1', 4, ['leave', 'eleven', 'remain'], ['minus', 'fewer']),
  page('sf1', 5, 'equals', '⚖️'),
] };
const sf2: SpellingStory = { id: 'sf-balloon-pop', activityId: 'subtraction-fun', titleKey: 'numbers.stories.sf2.title', pages: [
  page('sf2', 1, 'twelve', '🔢'), blank('sf2', 2, ['minus', 'leave', 'twenty'], ['remain', 'fewer']),
  page('sf2', 3, 'fewer', '📉'), blank('sf2', 4, ['eleven', 'equals', 'remain'], ['twelve', 'leave']),
  page('sf2', 5, 'remain', '📦'),
] };
const sf3: SpellingStory = { id: 'sf-apple-take', activityId: 'subtraction-fun', titleKey: 'numbers.stories.sf3.title', pages: [
  page('sf3', 1, 'leave', '👋'), blank('sf3', 2, ['remain', 'twelve', 'fewer'], ['equals', 'minus']),
  page('sf3', 3, 'eleven', '🔢'), blank('sf3', 4, ['twenty', 'minus', 'equals'], ['leave', 'twelve']),
  page('sf3', 5, 'fewer', '📉'),
] };
const sf4: SpellingStory = { id: 'sf-star-fall', activityId: 'subtraction-fun', titleKey: 'numbers.stories.sf4.title', pages: [
  page('sf4', 1, 'remain', '📦'), blank('sf4', 2, ['twenty', 'equals', 'leave'], ['twelve', 'minus']),
  page('sf4', 3, 'minus', '➖'), blank('sf4', 4, ['fewer', 'twelve', 'eleven'], ['remain', 'twenty']),
  page('sf4', 5, 'leave', '👋'),
] };
const sf5: SpellingStory = { id: 'sf-sand-scoop', activityId: 'subtraction-fun', titleKey: 'numbers.stories.sf5.title', pages: [
  page('sf5', 1, 'eleven', '🔢'), blank('sf5', 2, ['fewer', 'minus', 'remain'], ['twenty', 'leave']),
  page('sf5', 3, 'equals', '⚖️'), blank('sf5', 4, ['twelve', 'leave', 'twenty'], ['eleven', 'fewer']),
  page('sf5', 5, 'minus', '➖'),
] };

// ── Exports ─────────────────────────────────────────────────────────

export const ALL_NUMBERS_STORIES: SpellingStory[] = [
  cf1, cf2, cf3, cf4, cf5,
  nf1, nf2, nf3, nf4, nf5,
  cc1, cc2, cc3, cc4, cc5,
  sc1, sc2, sc3, sc4, sc5,
  ot1, ot2, ot3, ot4, ot5,
  wp1, wp2, wp3, wp4, wp5,
  ac1, ac2, ac3, ac4, ac5,
  fc1, fc2, fc3, fc4, fc5,
  tc1, tc2, tc3, tc4, tc5,
  gc1, gc2, gc3, gc4, gc5,
  np1, np2, np3, np4, np5,
  af1, af2, af3, af4, af5,
  ns1, ns2, ns3, ns4, ns5,
  npa1, npa2, npa3, npa4, npa5,
  sf1, sf2, sf3, sf4, sf5,
];
