/**
 * Spelling Words - Word Banks
 *
 * Themed word lists for all 15 spelling activities. Each activity has 8
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
  return { word, emoji, labelKey: `spelling.words.${activity}.${word}` };
}

// Ages 1-2 (easy)

const abcAnimals: SpellingWordBank = {
  activityId: 'abc-animals',
  words: [
    w('cat', '🐱', 'abcAnimals'), w('dog', '🐶', 'abcAnimals'),
    w('hen', '🐔', 'abcAnimals'), w('pig', '🐷', 'abcAnimals'),
    w('cow', '🐄', 'abcAnimals'), w('fox', '🦊', 'abcAnimals'),
    w('bee', '🐝', 'abcAnimals'), w('owl', '🦉', 'abcAnimals'),
  ],
};

const firstWords: SpellingWordBank = {
  activityId: 'first-words',
  words: [
    w('mum', '👩', 'firstWords'), w('dad', '👨', 'firstWords'),
    w('cup', '☕', 'firstWords'), w('hat', '🎩', 'firstWords'),
    w('sun', '☀️', 'firstWords'), w('bed', '🛏️', 'firstWords'),
    w('bag', '👜', 'firstWords'), w('bus', '🚌', 'firstWords'),
  ],
};

const colourSpelling: SpellingWordBank = {
  activityId: 'colour-spelling',
  words: [
    w('red', '🔴', 'colourSpelling'), w('blue', '🔵', 'colourSpelling'),
    w('pink', '🩷', 'colourSpelling'), w('gold', '🥇', 'colourSpelling'),
    w('grey', '🩶', 'colourSpelling'), w('lime', '🍋', 'colourSpelling'),
    w('teal', '🫧', 'colourSpelling'), w('cyan', '💎', 'colourSpelling'),
  ],
};

const shapeNames: SpellingWordBank = {
  activityId: 'shape-names',
  words: [
    w('box', '📦', 'shapeNames'), w('star', '⭐', 'shapeNames'),
    w('cone', '🔺', 'shapeNames'), w('cube', '🧊', 'shapeNames'),
    w('oval', '🥚', 'shapeNames'), w('arch', '🌈', 'shapeNames'),
    w('ring', '💍', 'shapeNames'), w('dot', '⚫', 'shapeNames'),
  ],
};

const myName: SpellingWordBank = {
  activityId: 'my-name',
  words: [
    w('sam', '🧒', 'myName'), w('tom', '👦', 'myName'),
    w('mia', '👧', 'myName'), w('leo', '🦁', 'myName'),
    w('amy', '🌸', 'myName'), w('max', '⚡', 'myName'),
    w('zoe', '🌟', 'myName'), w('ben', '🐻', 'myName'),
  ],
};

// Ages 2-4 (medium)

const wombatSpelling: SpellingWordBank = {
  activityId: 'wombat-spelling',
  words: [
    w('moon', '🌙', 'wombatSpelling'), w('star', '⭐', 'wombatSpelling'),
    w('sleep', '😴', 'wombatSpelling'), w('dream', '💭', 'wombatSpelling'),
    w('night', '🌃', 'wombatSpelling'), w('cloud', '☁️', 'wombatSpelling'),
    w('bear', '🐻', 'wombatSpelling'), w('lamp', '🪔', 'wombatSpelling'),
  ],
};

const animalSpelling: SpellingWordBank = {
  activityId: 'animal-spelling',
  words: [
    w('horse', '🐴', 'animalSpelling'), w('sheep', '🐑', 'animalSpelling'),
    w('tiger', '🐯', 'animalSpelling'), w('zebra', '🦓', 'animalSpelling'),
    w('panda', '🐼', 'animalSpelling'), w('whale', '🐋', 'animalSpelling'),
    w('eagle', '🦅', 'animalSpelling'), w('koala', '🐨', 'animalSpelling'),
  ],
};

const foodSpelling: SpellingWordBank = {
  activityId: 'food-spelling',
  words: [
    w('bread', '🍞', 'foodSpelling'), w('grape', '🍇', 'foodSpelling'),
    w('pizza', '🍕', 'foodSpelling'), w('melon', '🍈', 'foodSpelling'),
    w('pasta', '🍝', 'foodSpelling'), w('mango', '🥭', 'foodSpelling'),
    w('toast', '🍞', 'foodSpelling'), w('salad', '🥗', 'foodSpelling'),
  ],
};

const natureWords: SpellingWordBank = {
  activityId: 'nature-words',
  words: [
    w('leaf', '🍃', 'natureWords'), w('rain', '🌧️', 'natureWords'),
    w('pond', '🌊', 'natureWords'), w('seed', '🌱', 'natureWords'),
    w('rock', '🪨', 'natureWords'), w('moss', '🌿', 'natureWords'),
    w('nest', '🪺', 'natureWords'), w('fern', '🌿', 'natureWords'),
  ],
};

const gardenWords: SpellingWordBank = {
  activityId: 'garden-words',
  words: [
    w('rose', '🌹', 'gardenWords'), w('soil', '🟫', 'gardenWords'),
    w('stem', '🌱', 'gardenWords'), w('root', '🌳', 'gardenWords'),
    w('weed', '🌿', 'gardenWords'), w('bulb', '🌷', 'gardenWords'),
    w('vine', '🍇', 'gardenWords'), w('herb', '🌿', 'gardenWords'),
  ],
};

// Ages 4+ (hard)

const wordBuilder: SpellingWordBank = {
  activityId: 'word-builder',
  words: [
    w('jump', '🦘', 'wordBuilder'), w('swim', '🏊', 'wordBuilder'),
    w('sing', '🎤', 'wordBuilder'), w('clap', '👏', 'wordBuilder'),
    w('wish', '🌠', 'wordBuilder'), w('drum', '🥁', 'wordBuilder'),
    w('glow', '✨', 'wordBuilder'), w('snap', '🫰', 'wordBuilder'),
  ],
};

const sentenceSpeller: SpellingWordBank = {
  activityId: 'sentence-speller',
  words: [
    w('under', '⬇️', 'sentenceSpeller'), w('above', '⬆️', 'sentenceSpeller'),
    w('happy', '😊', 'sentenceSpeller'), w('water', '💧', 'sentenceSpeller'),
    w('house', '🏠', 'sentenceSpeller'), w('table', '🪑', 'sentenceSpeller'),
    w('chair', '💺', 'sentenceSpeller'), w('story', '📖', 'sentenceSpeller'),
  ],
};

const trickyWords: SpellingWordBank = {
  activityId: 'tricky-words',
  words: [
    w('said', '💬', 'trickyWords'), w('come', '👋', 'trickyWords'),
    w('some', '🤏', 'trickyWords'), w('were', '📝', 'trickyWords'),
    w('there', '👉', 'trickyWords'), w('where', '🗺️', 'trickyWords'),
    w('have', '🤲', 'trickyWords'), w('love', '❤️', 'trickyWords'),
  ],
};



const storySpelling: SpellingWordBank = {
  activityId: 'story-spelling',
  words: [
    w('knight', '⚔️', 'storySpelling'), w('castle', '🏰', 'storySpelling'),
    w('dragon', '🐉', 'storySpelling'), w('forest', '🌲', 'storySpelling'),
    w('prince', '🤴', 'storySpelling'), w('queen', '👸', 'storySpelling'),
    w('magic', '🪄', 'storySpelling'), w('crown', '👑', 'storySpelling'),
  ],
};

// Exports

export const ALL_SPELLING_WORD_BANKS: SpellingWordBank[] = [
  abcAnimals, firstWords, colourSpelling, shapeNames, myName,
  wombatSpelling, animalSpelling, foodSpelling, natureWords, gardenWords,
  wordBuilder, sentenceSpeller, trickyWords, storySpelling,
];

import { ALL_NUMBERS_WORD_BANKS } from './numbers-words';

/** Combined spelling + numbers word banks */
export const ALL_WORD_BANKS: SpellingWordBank[] = [
  ...ALL_SPELLING_WORD_BANKS,
  ...ALL_NUMBERS_WORD_BANKS,
];

const WORD_BANK_MAP = new Map<string, SpellingWordBank>(
  ALL_WORD_BANKS.map(bank => [bank.activityId, bank])
);

/** O(1) lookup of word bank by activity ID (works for both spelling and numbers) */
export function getSpellingWordBank(activityId: string): SpellingWordBank | undefined {
  return WORD_BANK_MAP.get(activityId);
}
