/**
 * Numbers Words — Word Banks for Numbers Activities
 *
 * Themed word lists for all 15 numbers activities. Each activity has 8
 * words appropriate for its age group and theme.
 *
 * Age groups:
 *  - easy  (1-2): 2-5 letter words, no distractors
 *  - medium (2-4): 3-7 letter words, 2 distractors
 *  - hard  (4+):  4-9 letter words, 3 distractors + timer
 */

import type { SpellingWordBank, SpellingWord } from '@/types/spelling-game';

// Helper
function w(word: string, emoji: string, activity: string): SpellingWord {
  return { word, emoji, labelKey: `numbers.words.${activity}.${word}` };
}

// Ages 1-2 (easy)

const countingFun: SpellingWordBank = {
  activityId: 'counting-fun',
  words: [
    w('one', '1️⃣', 'countingFun'), w('two', '2️⃣', 'countingFun'),
    w('ten', '🔟', 'countingFun'), w('add', '➕', 'countingFun'),
    w('sum', '🧮', 'countingFun'), w('five', '5️⃣', 'countingFun'),
    w('four', '4️⃣', 'countingFun'), w('six', '6️⃣', 'countingFun'),
  ],
};

const numberFriends: SpellingWordBank = {
  activityId: 'number-friends',
  words: [
    w('one', '1️⃣', 'numberFriends'), w('two', '2️⃣', 'numberFriends'),
    w('big', '🐘', 'numberFriends'), w('ten', '🔟', 'numberFriends'),
    w('five', '5️⃣', 'numberFriends'), w('six', '6️⃣', 'numberFriends'),
    w('hug', '🤗', 'numberFriends'), w('fun', '🎉', 'numberFriends'),
  ],
};

const colourCounting: SpellingWordBank = {
  activityId: 'colour-counting',
  words: [
    w('red', '🔴', 'colourCounting'), w('two', '2️⃣', 'colourCounting'),
    w('blue', '🔵', 'colourCounting'), w('five', '5️⃣', 'colourCounting'),
    w('one', '1️⃣', 'colourCounting'), w('pink', '🩷', 'colourCounting'),
    w('ten', '🔟', 'colourCounting'), w('four', '4️⃣', 'colourCounting'),
  ],
};

const shapeCounting: SpellingWordBank = {
  activityId: 'shape-counting',
  words: [
    w('box', '📦', 'shapeCounting'), w('two', '2️⃣', 'shapeCounting'),
    w('star', '⭐', 'shapeCounting'), w('one', '1️⃣', 'shapeCounting'),
    w('five', '5️⃣', 'shapeCounting'), w('ring', '💍', 'shapeCounting'),
    w('ten', '🔟', 'shapeCounting'), w('cone', '🔺', 'shapeCounting'),
  ],
};

const oneTwoThree: SpellingWordBank = {
  activityId: 'one-two-three',
  words: [
    w('one', '1️⃣', 'oneTwoThree'), w('two', '2️⃣', 'oneTwoThree'),
    w('ten', '🔟', 'oneTwoThree'), w('big', '🐘', 'oneTwoThree'),
    w('six', '6️⃣', 'oneTwoThree'), w('add', '➕', 'oneTwoThree'),
    w('five', '5️⃣', 'oneTwoThree'), w('four', '4️⃣', 'oneTwoThree'),
  ],
};

// Ages 2-4 (medium)

const wombatWordPlacing: SpellingWordBank = {
  activityId: 'wombat-word-placing',
  words: [
    w('count', '🔢', 'wombatWordPlacing'), w('seven', '7️⃣', 'wombatWordPlacing'),
    w('eight', '8️⃣', 'wombatWordPlacing'), w('dozen', '📦', 'wombatWordPlacing'),
    w('total', '🧮', 'wombatWordPlacing'), w('equal', '⚖️', 'wombatWordPlacing'),
    w('minus', '➖', 'wombatWordPlacing'), w('twice', '✌️', 'wombatWordPlacing'),
  ],
};

const animalCounting: SpellingWordBank = {
  activityId: 'animal-counting',
  words: [
    w('count', '🔢', 'animalCounting'), w('seven', '7️⃣', 'animalCounting'),
    w('eight', '8️⃣', 'animalCounting'), w('three', '3️⃣', 'animalCounting'),
    w('total', '🧮', 'animalCounting'), w('panda', '🐼', 'animalCounting'),
    w('tiger', '🐯', 'animalCounting'), w('equal', '⚖️', 'animalCounting'),
  ],
};

const fruitCounting: SpellingWordBank = {
  activityId: 'fruit-counting',
  words: [
    w('apple', '🍎', 'fruitCounting'), w('seven', '7️⃣', 'fruitCounting'),
    w('eight', '8️⃣', 'fruitCounting'), w('grape', '🍇', 'fruitCounting'),
    w('count', '🔢', 'fruitCounting'), w('melon', '🍈', 'fruitCounting'),
    w('three', '3️⃣', 'fruitCounting'), w('total', '🧮', 'fruitCounting'),
  ],
};

const toyCounting: SpellingWordBank = {
  activityId: 'toy-counting',
  words: [
    w('block', '🧱', 'toyCounting'), w('seven', '7️⃣', 'toyCounting'),
    w('eight', '8️⃣', 'toyCounting'), w('count', '🔢', 'toyCounting'),
    w('total', '🧮', 'toyCounting'), w('train', '🚂', 'toyCounting'),
    w('dolly', '🪆', 'toyCounting'), w('truck', '🚚', 'toyCounting'),
  ],
};

const gardenCounting: SpellingWordBank = {
  activityId: 'garden-counting',
  words: [
    w('seven', '7️⃣', 'gardenCounting'), w('eight', '8️⃣', 'gardenCounting'),
    w('count', '🔢', 'gardenCounting'), w('bloom', '🌸', 'gardenCounting'),
    w('petal', '🌺', 'gardenCounting'), w('total', '🧮', 'gardenCounting'),
    w('three', '3️⃣', 'gardenCounting'), w('bunch', '💐', 'gardenCounting'),
  ],
};

// Ages 4+ (hard)

const numberPuzzles: SpellingWordBank = {
  activityId: 'number-puzzles',
  words: [
    w('puzzle', '🧩', 'numberPuzzles'), w('twelve', '🔢', 'numberPuzzles'),
    w('twenty', '🔢', 'numberPuzzles'), w('double', '✖️', 'numberPuzzles'),
    w('triple', '✖️', 'numberPuzzles'), w('divide', '➗', 'numberPuzzles'),
    w('equals', '⚖️', 'numberPuzzles'), w('eleven', '🔢', 'numberPuzzles'),
  ],
};

const addingFun: SpellingWordBank = {
  activityId: 'adding-fun',
  words: [
    w('adding', '➕', 'addingFun'), w('twelve', '🔢', 'addingFun'),
    w('twenty', '🔢', 'addingFun'), w('eleven', '🔢', 'addingFun'),
    w('equals', '⚖️', 'addingFun'), w('double', '✖️', 'addingFun'),
    w('total', '🧮', 'addingFun'), w('number', '🔢', 'addingFun'),
  ],
};

const numberStories: SpellingWordBank = {
  activityId: 'number-stories',
  words: [
    w('twelve', '🔢', 'numberStories'), w('twenty', '🔢', 'numberStories'),
    w('eleven', '🔢', 'numberStories'), w('story', '📖', 'numberStories'),
    w('count', '🔢', 'numberStories'), w('puzzle', '🧩', 'numberStories'),
    w('equals', '⚖️', 'numberStories'), w('number', '🔢', 'numberStories'),
  ],
};

const numberPatterns: SpellingWordBank = {
  activityId: 'number-patterns',
  words: [
    w('twelve', '🔢', 'numberPatterns'), w('twenty', '🔢', 'numberPatterns'),
    w('eleven', '🔢', 'numberPatterns'), w('double', '✖️', 'numberPatterns'),
    w('triple', '✖️', 'numberPatterns'), w('equals', '⚖️', 'numberPatterns'),
    w('series', '📊', 'numberPatterns'), w('repeat', '🔄', 'numberPatterns'),
  ],
};

const subtractionFun: SpellingWordBank = {
  activityId: 'subtraction-fun',
  words: [
    w('twelve', '🔢', 'subtractionFun'), w('twenty', '🔢', 'subtractionFun'),
    w('eleven', '🔢', 'subtractionFun'), w('minus', '➖', 'subtractionFun'),
    w('equals', '⚖️', 'subtractionFun'), w('fewer', '📉', 'subtractionFun'),
    w('leave', '👋', 'subtractionFun'), w('remain', '📦', 'subtractionFun'),
  ],
};

// Exports

export const ALL_NUMBERS_WORD_BANKS: SpellingWordBank[] = [
  countingFun, numberFriends, colourCounting, shapeCounting, oneTwoThree,
  wombatWordPlacing, animalCounting, fruitCounting, toyCounting, gardenCounting,
  numberPuzzles, addingFun, numberStories, numberPatterns, subtractionFun,
];

const NUMBERS_WORD_BANK_MAP = new Map<string, SpellingWordBank>(
  ALL_NUMBERS_WORD_BANKS.map(bank => [bank.activityId, bank])
);

/** Get the word bank for a numbers activity ID (O(1) lookup) */
export function getNumbersWordBank(activityId: string): SpellingWordBank | undefined {
  return NUMBERS_WORD_BANK_MAP.get(activityId);
}
