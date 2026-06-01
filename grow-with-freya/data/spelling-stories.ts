/**
 * Spelling Stories — Narrative-driven spelling challenges
 *
 * 10 mini-stories, each with 5 pages. Every page has narrative text
 * and a single word to spell that's woven into the story, so the child
 * is *helping* the character rather than doing an isolated exercise.
 *
 * Stories are grouped by difficulty (matching their activity's word bank):
 *   - Easy  (ages 1–2): Stories 1–5  — 2–4 letter words, no distractors
 *   - Medium (ages 2–4): Stories 6–8  — 4–5 letter words, 2 distractors
 *   - Hard  (ages 4+):   Stories 9–10 — 5–6 letter words, 3 distractors
 */

import type { SpellingStory, StoryPageMode } from '@/types/spelling-game';

// Helper to build page objects concisely
function page(storyId: string, pageNum: number, word: string, emoji: string, mode?: StoryPageMode) {
  return {
    narrativeKey: `spelling.stories.${storyId}.page${pageNum}`,
    word,
    emoji,
    ...(mode ? { mode } : {}),
  };
}

// Shorthand for fill-blank pages (multi-word selection)
function blank(
  storyId: string,
  pageNum: number,
  blankWords: string[],
  distractorWords?: string[],
) {
  return {
    narrativeKey: `spelling.stories.${storyId}.page${pageNum}`,
    word: blankWords[0], // primary word (for progress tracking)
    emoji: '',
    mode: 'fill-blank' as StoryPageMode,
    blankWords,
    ...(distractorWords ? { distractorWords } : {}),
  };
}

// ── EASY (Ages 1–2) ──────────────────────────────────────────────────

/** Story 1: "Owl Can't Sleep" — abc-animals */
const owlCantSleep: SpellingStory = {
  id: 'owl-cant-sleep',
  activityId: 'abc-animals',
  titleKey: 'spelling.stories.owlCantSleep.title',
  pages: [
    page('owlCantSleep', 1, 'cat', '🐱'),
    blank('owlCantSleep', 2, ['dog', 'bed']),
    page('owlCantSleep', 3, 'hen', '🐔'),
    blank('owlCantSleep', 4, ['pig', 'mud']),
    page('owlCantSleep', 5, 'owl', '🦉'),
  ],
};

/** Story 2: "Teddy's Big Day Out" — first-words */
const teddysDayOut: SpellingStory = {
  id: 'teddys-day-out',
  activityId: 'first-words',
  titleKey: 'spelling.stories.teddysDayOut.title',
  pages: [
    page('teddysDayOut', 1, 'hat', '🎩'),
    blank('teddysDayOut', 2, ['cup', 'jam']),
    page('teddysDayOut', 3, 'sun', '☀️'),
    blank('teddysDayOut', 4, ['bed', 'nap']),
    page('teddysDayOut', 5, 'bus', '🚌'),
  ],
};

/** Story 3: "The Painter Mouse" — colour-spelling */
const painterMouse: SpellingStory = {
  id: 'painter-mouse',
  activityId: 'colour-spelling',
  titleKey: 'spelling.stories.painterMouse.title',
  pages: [
    page('painterMouse', 1, 'red', '🔴'),
    blank('painterMouse', 2, ['blue', 'sky']),
    page('painterMouse', 3, 'pink', '🩷'),
    blank('painterMouse', 4, ['gold', 'sun']),
    page('painterMouse', 5, 'grey', '🩶'),
  ],
};

/** Story 4: "Shapes in the Clouds" — shape-names */
const shapesInClouds: SpellingStory = {
  id: 'shapes-in-clouds',
  activityId: 'shape-names',
  titleKey: 'spelling.stories.shapesInClouds.title',
  pages: [
    page('shapesInClouds', 1, 'star', '⭐'),
    blank('shapesInClouds', 2, ['ring', 'moon']),
    page('shapesInClouds', 3, 'box', '📦'),
    blank('shapesInClouds', 4, ['cone', 'ball']),
    page('shapesInClouds', 5, 'oval', '🥚'),
  ],
};

/** Story 5: "First Day Friends" — my-name */
const firstDayFriends: SpellingStory = {
  id: 'first-day-friends',
  activityId: 'my-name',
  titleKey: 'spelling.stories.firstDayFriends.title',
  pages: [
    page('firstDayFriends', 1, 'mia', '👧'),
    blank('firstDayFriends', 2, ['sam', 'ben']),
    page('firstDayFriends', 3, 'leo', '🦁'),
    blank('firstDayFriends', 4, ['amy', 'tom']),
    page('firstDayFriends', 5, 'ben', '🐻'),
  ],
};

// ── MEDIUM (Ages 2–4) ────────────────────────────────────────────────

/** Story 6: "Wombat Counts the Stars" — wombat-spelling */
const wombatStars: SpellingStory = {
  id: 'wombat-stars',
  activityId: 'wombat-spelling',
  titleKey: 'spelling.stories.wombatStars.title',
  pages: [
    page('wombatStars', 1, 'moon', '🌙'),
    blank('wombatStars', 2, ['star', 'sky', 'glow'], ['tree']),
    page('wombatStars', 3, 'cloud', '☁️'),
    blank('wombatStars', 4, ['dream', 'warm', 'hug'], ['cold']),
    page('wombatStars', 5, 'bear', '🐻'),
  ],
};

/** Story 7: "The Jungle Welcomes You" — animal-spelling */
const jungleWelcome: SpellingStory = {
  id: 'jungle-welcome',
  activityId: 'animal-spelling',
  titleKey: 'spelling.stories.jungleWelcome.title',
  pages: [
    page('jungleWelcome', 1, 'horse', '🐴'),
    blank('jungleWelcome', 2, ['sheep', 'grass', 'hill'], ['pond']),
    page('jungleWelcome', 3, 'zebra', '🦓'),
    blank('jungleWelcome', 4, ['panda', 'leaf', 'tree'], ['rock']),
    page('jungleWelcome', 5, 'koala', '🐨'),
  ],
};

/** Story 8: "Bear's Hungry Tummy" — food-spelling */
const bearHungry: SpellingStory = {
  id: 'bear-hungry',
  activityId: 'food-spelling',
  titleKey: 'spelling.stories.bearHungry.title',
  pages: [
    page('bearHungry', 1, 'bread', '🍞'),
    blank('bearHungry', 2, ['grape', 'bowl', 'vine'], ['cake']),
    page('bearHungry', 3, 'pizza', '🍕'),
    blank('bearHungry', 4, ['toast', 'warm', 'jam'], ['rice']),
    page('bearHungry', 5, 'mango', '🥭'),
  ],
};

// ── HARD (Ages 4+) ───────────────────────────────────────────────────

/** Story 9: "The Enchanted Castle" — story-spelling */
const enchantedCastle: SpellingStory = {
  id: 'enchanted-castle',
  activityId: 'story-spelling',
  titleKey: 'spelling.stories.enchantedCastle.title',
  pages: [
    page('enchantedCastle', 1, 'castle', '🏰'),
    blank('enchantedCastle', 2, ['dragon', 'fire', 'kind'], ['giant', 'cold']),
    page('enchantedCastle', 3, 'queen', '👸'),
    blank('enchantedCastle', 4, ['forest', 'path', 'light'], ['tower', 'dark']),
    page('enchantedCastle', 5, 'magic', '🪄'),
  ],
};

// ── EASY Variations (4 more per activity) ─────────────────────────────

// abc-animals variations 2–5
const farmyardFriends: SpellingStory = { id: 'farmyard-friends', activityId: 'abc-animals', titleKey: 'spelling.stories.farmyardFriends.title', pages: [
  page('farmyardFriends', 1, 'cow', '🐄'), blank('farmyardFriends', 2, ['fox', 'den']),
  page('farmyardFriends', 3, 'bee', '🐝'), blank('farmyardFriends', 4, ['hen', 'egg']),
  page('farmyardFriends', 5, 'pig', '🐷'),
] };
const bugHunt: SpellingStory = { id: 'bug-hunt', activityId: 'abc-animals', titleKey: 'spelling.stories.bugHunt.title', pages: [
  page('bugHunt', 1, 'bee', '🐝'), blank('bugHunt', 2, ['ant', 'log']),
  page('bugHunt', 3, 'owl', '🦉'), blank('bugHunt', 4, ['fox', 'run']),
  page('bugHunt', 5, 'dog', '🐶'),
] };
const pondLife: SpellingStory = { id: 'pond-life', activityId: 'abc-animals', titleKey: 'spelling.stories.pondLife.title', pages: [
  page('pondLife', 1, 'fox', '🦊'), blank('pondLife', 2, ['cow', 'moo']),
  page('pondLife', 3, 'pig', '🐷'), blank('pondLife', 4, ['bee', 'hum']),
  page('pondLife', 5, 'cat', '🐱'),
] };
const barnDance: SpellingStory = { id: 'barn-dance', activityId: 'abc-animals', titleKey: 'spelling.stories.barnDance.title', pages: [
  page('barnDance', 1, 'hen', '🐔'), blank('barnDance', 2, ['pig', 'mud']),
  page('barnDance', 3, 'cow', '🐄'), blank('barnDance', 4, ['owl', 'hoo']),
  page('barnDance', 5, 'fox', '🦊'),
] };

// first-words variations 2–5
const kitchenAdventure: SpellingStory = { id: 'kitchen-adventure', activityId: 'first-words', titleKey: 'spelling.stories.kitchenAdventure.title', pages: [
  page('kitchenAdventure', 1, 'cup', '☕'), blank('kitchenAdventure', 2, ['mum', 'tea']),
  page('kitchenAdventure', 3, 'bag', '👜'), blank('kitchenAdventure', 4, ['dad', 'hat']),
  page('kitchenAdventure', 5, 'bed', '🛏️'),
] };
const parkDay: SpellingStory = { id: 'park-day', activityId: 'first-words', titleKey: 'spelling.stories.parkDay.title', pages: [
  page('parkDay', 1, 'sun', '☀️'), blank('parkDay', 2, ['hat', 'hot']),
  page('parkDay', 3, 'bus', '🚌'), blank('parkDay', 4, ['bag', 'run']),
  page('parkDay', 5, 'mum', '👩'),
] };
const rainyMorning: SpellingStory = { id: 'rainy-morning', activityId: 'first-words', titleKey: 'spelling.stories.rainyMorning.title', pages: [
  page('rainyMorning', 1, 'hat', '🎩'), blank('rainyMorning', 2, ['cup', 'wet']),
  page('rainyMorning', 3, 'dad', '👨'), blank('rainyMorning', 4, ['sun', 'dry']),
  page('rainyMorning', 5, 'bus', '🚌'),
] };
const bedtimeRoutine: SpellingStory = { id: 'bedtime-routine', activityId: 'first-words', titleKey: 'spelling.stories.bedtimeRoutine.title', pages: [
  page('bedtimeRoutine', 1, 'bed', '🛏️'), blank('bedtimeRoutine', 2, ['mum', 'hug']),
  page('bedtimeRoutine', 3, 'cup', '☕'), blank('bedtimeRoutine', 4, ['dad', 'nap']),
  page('bedtimeRoutine', 5, 'sun', '☀️'),
] };

// colour-spelling variations 2–5
const rainbowGarden: SpellingStory = { id: 'rainbow-garden', activityId: 'colour-spelling', titleKey: 'spelling.stories.rainbowGarden.title', pages: [
  page('rainbowGarden', 1, 'blue', '🔵'), blank('rainbowGarden', 2, ['red', 'sun']),
  page('rainbowGarden', 3, 'gold', '🥇'), blank('rainbowGarden', 4, ['pink', 'sky']),
  page('rainbowGarden', 5, 'grey', '🩶'),
] };
const paintSplash: SpellingStory = { id: 'paint-splash', activityId: 'colour-spelling', titleKey: 'spelling.stories.paintSplash.title', pages: [
  page('paintSplash', 1, 'pink', '🩷'), blank('paintSplash', 2, ['blue', 'mix']),
  page('paintSplash', 3, 'red', '🔴'), blank('paintSplash', 4, ['gold', 'art']),
  page('paintSplash', 5, 'lime', '🍋'),
] };
const sunsetColours: SpellingStory = { id: 'sunset-colours', activityId: 'colour-spelling', titleKey: 'spelling.stories.sunsetColours.title', pages: [
  page('sunsetColours', 1, 'gold', '🥇'), blank('sunsetColours', 2, ['pink', 'glow']),
  page('sunsetColours', 3, 'grey', '🩶'), blank('sunsetColours', 4, ['red', 'dim']),
  page('sunsetColours', 5, 'blue', '🔵'),
] };
const colourParade: SpellingStory = { id: 'colour-parade', activityId: 'colour-spelling', titleKey: 'spelling.stories.colourParade.title', pages: [
  page('colourParade', 1, 'lime', '🍋'), blank('colourParade', 2, ['grey', 'fog']),
  page('colourParade', 3, 'teal', '🫧'), blank('colourParade', 4, ['cyan', 'sea']),
  page('colourParade', 5, 'red', '🔴'),
] };

// shape-names variations 2–5
const shapeParty: SpellingStory = { id: 'shape-party', activityId: 'shape-names', titleKey: 'spelling.stories.shapeParty.title', pages: [
  page('shapeParty', 1, 'box', '📦'), blank('shapeParty', 2, ['ring', 'spin']),
  page('shapeParty', 3, 'cone', '🔺'), blank('shapeParty', 4, ['star', 'sky']),
  page('shapeParty', 5, 'oval', '🥚'),
] };
const shapeIsland: SpellingStory = { id: 'shape-island', activityId: 'shape-names', titleKey: 'spelling.stories.shapeIsland.title', pages: [
  page('shapeIsland', 1, 'ring', '💍'), blank('shapeIsland', 2, ['box', 'sand']),
  page('shapeIsland', 3, 'star', '⭐'), blank('shapeIsland', 4, ['cone', 'wave']),
  page('shapeIsland', 5, 'cube', '🧊'),
] };
const shapeTreasure: SpellingStory = { id: 'shape-treasure', activityId: 'shape-names', titleKey: 'spelling.stories.shapeTreasure.title', pages: [
  page('shapeTreasure', 1, 'cube', '🧊'), blank('shapeTreasure', 2, ['oval', 'gem']),
  page('shapeTreasure', 3, 'dot', '⚫'), blank('shapeTreasure', 4, ['arch', 'map']),
  page('shapeTreasure', 5, 'star', '⭐'),
] };
const shapeRace: SpellingStory = { id: 'shape-race', activityId: 'shape-names', titleKey: 'spelling.stories.shapeRace.title', pages: [
  page('shapeRace', 1, 'arch', '🌈'), blank('shapeRace', 2, ['dot', 'hop']),
  page('shapeRace', 3, 'ring', '💍'), blank('shapeRace', 4, ['cube', 'win']),
  page('shapeRace', 5, 'box', '📦'),
] };

// my-name variations 2–5
const nameGarden: SpellingStory = { id: 'name-garden', activityId: 'my-name', titleKey: 'spelling.stories.nameGarden.title', pages: [
  page('nameGarden', 1, 'sam', '🧒'), blank('nameGarden', 2, ['amy', 'zoe']),
  page('nameGarden', 3, 'max', '⚡'), blank('nameGarden', 4, ['tom', 'leo']),
  page('nameGarden', 5, 'mia', '👧'),
] };
const nameStars: SpellingStory = { id: 'name-stars', activityId: 'my-name', titleKey: 'spelling.stories.nameStars.title', pages: [
  page('nameStars', 1, 'zoe', '🌟'), blank('nameStars', 2, ['max', 'ben']),
  page('nameStars', 3, 'amy', '🌸'), blank('nameStars', 4, ['mia', 'sam']),
  page('nameStars', 5, 'leo', '🦁'),
] };
const namePicnic: SpellingStory = { id: 'name-picnic', activityId: 'my-name', titleKey: 'spelling.stories.namePicnic.title', pages: [
  page('namePicnic', 1, 'tom', '👦'), blank('namePicnic', 2, ['leo', 'sam']),
  page('namePicnic', 3, 'ben', '🐻'), blank('namePicnic', 4, ['zoe', 'max']),
  page('namePicnic', 5, 'amy', '🌸'),
] };
const nameRainbow: SpellingStory = { id: 'name-rainbow', activityId: 'my-name', titleKey: 'spelling.stories.nameRainbow.title', pages: [
  page('nameRainbow', 1, 'leo', '🦁'), blank('nameRainbow', 2, ['tom', 'mia']),
  page('nameRainbow', 3, 'sam', '🧒'), blank('nameRainbow', 4, ['amy', 'ben']),
  page('nameRainbow', 5, 'zoe', '🌟'),
] };

// ── MEDIUM Variations ─────────────────────────────────────────────────

// wombat-spelling variations 2–5
const wombatPicnic: SpellingStory = { id: 'wombat-picnic', activityId: 'wombat-spelling', titleKey: 'spelling.stories.wombatPicnic.title', pages: [
  page('wombatPicnic', 1, 'star', '⭐'), blank('wombatPicnic', 2, ['moon', 'glow', 'warm'], ['cold']),
  page('wombatPicnic', 3, 'lamp', '🪔'), blank('wombatPicnic', 4, ['dream', 'night', 'star'], ['rain']),
  page('wombatPicnic', 5, 'sleep', '😴'),
] };
const wombatDream: SpellingStory = { id: 'wombat-dream', activityId: 'wombat-spelling', titleKey: 'spelling.stories.wombatDream.title', pages: [
  page('wombatDream', 1, 'night', '🌃'), blank('wombatDream', 2, ['cloud', 'soft', 'bear'], ['wind']),
  page('wombatDream', 3, 'dream', '💭'), blank('wombatDream', 4, ['sleep', 'lamp', 'moon'], ['dark']),
  page('wombatDream', 5, 'star', '⭐'),
] };
const wombatGarden: SpellingStory = { id: 'wombat-garden', activityId: 'wombat-spelling', titleKey: 'spelling.stories.wombatGarden.title', pages: [
  page('wombatGarden', 1, 'bear', '🐻'), blank('wombatGarden', 2, ['moon', 'star', 'lamp'], ['fog']),
  page('wombatGarden', 3, 'cloud', '☁️'), blank('wombatGarden', 4, ['sleep', 'warm', 'night'], ['snow']),
  page('wombatGarden', 5, 'dream', '💭'),
] };
const wombatSnow: SpellingStory = { id: 'wombat-snow', activityId: 'wombat-spelling', titleKey: 'spelling.stories.wombatSnow.title', pages: [
  page('wombatSnow', 1, 'moon', '🌙'), blank('wombatSnow', 2, ['bear', 'warm', 'cloud'], ['ice']),
  page('wombatSnow', 3, 'sleep', '😴'), blank('wombatSnow', 4, ['star', 'night', 'dream'], ['gust']),
  page('wombatSnow', 5, 'lamp', '🪔'),
] };

// animal-spelling variations 2–5
const safariSunrise: SpellingStory = { id: 'safari-sunrise', activityId: 'animal-spelling', titleKey: 'spelling.stories.safariSunrise.title', pages: [
  page('safariSunrise', 1, 'tiger', '🐯'), blank('safariSunrise', 2, ['eagle', 'soar', 'hill'], ['cave']),
  page('safariSunrise', 3, 'whale', '🐋'), blank('safariSunrise', 4, ['horse', 'mane', 'trot'], ['lake']),
  page('safariSunrise', 5, 'panda', '🐼'),
] };
const oceanAnimals: SpellingStory = { id: 'ocean-animals', activityId: 'animal-spelling', titleKey: 'spelling.stories.oceanAnimals.title', pages: [
  page('oceanAnimals', 1, 'whale', '🐋'), blank('oceanAnimals', 2, ['koala', 'tree', 'nap'], ['reef']),
  page('oceanAnimals', 3, 'sheep', '🐑'), blank('oceanAnimals', 4, ['tiger', 'roar', 'paw'], ['wave']),
  page('oceanAnimals', 5, 'eagle', '🦅'),
] };
const mountainAnimals: SpellingStory = { id: 'mountain-animals', activityId: 'animal-spelling', titleKey: 'spelling.stories.mountainAnimals.title', pages: [
  page('mountainAnimals', 1, 'koala', '🐨'), blank('mountainAnimals', 2, ['sheep', 'wool', 'hill'], ['snow']),
  page('mountainAnimals', 3, 'horse', '🐴'), blank('mountainAnimals', 4, ['zebra', 'fast', 'run'], ['cliff']),
  page('mountainAnimals', 5, 'tiger', '🐯'),
] };
const animalBedtime: SpellingStory = { id: 'animal-bedtime', activityId: 'animal-spelling', titleKey: 'spelling.stories.animalBedtime.title', pages: [
  page('animalBedtime', 1, 'sheep', '🐑'), blank('animalBedtime', 2, ['panda', 'yawn', 'cosy'], ['dawn']),
  page('animalBedtime', 3, 'eagle', '🦅'), blank('animalBedtime', 4, ['whale', 'calm', 'deep'], ['loud']),
  page('animalBedtime', 5, 'koala', '🐨'),
] };

// food-spelling variations 2–5
const picnicBasket: SpellingStory = { id: 'picnic-basket', activityId: 'food-spelling', titleKey: 'spelling.stories.picnicBasket.title', pages: [
  page('picnicBasket', 1, 'grape', '🍇'), blank('picnicBasket', 2, ['toast', 'warm', 'bowl'], ['fork']),
  page('picnicBasket', 3, 'mango', '🥭'), blank('picnicBasket', 4, ['bread', 'soft', 'jam'], ['pan']),
  page('picnicBasket', 5, 'melon', '🍈'),
] };
const bakingDay: SpellingStory = { id: 'baking-day', activityId: 'food-spelling', titleKey: 'spelling.stories.bakingDay.title', pages: [
  page('bakingDay', 1, 'toast', '🍞'), blank('bakingDay', 2, ['pizza', 'warm', 'oven'], ['cup']),
  page('bakingDay', 3, 'salad', '🥗'), blank('bakingDay', 4, ['grape', 'bowl', 'mix'], ['pot']),
  page('bakingDay', 5, 'pasta', '🍝'),
] };
const fruitFeast: SpellingStory = { id: 'fruit-feast', activityId: 'food-spelling', titleKey: 'spelling.stories.fruitFeast.title', pages: [
  page('fruitFeast', 1, 'melon', '🍈'), blank('fruitFeast', 2, ['mango', 'ripe', 'sweet'], ['sour']),
  page('fruitFeast', 3, 'bread', '🍞'), blank('fruitFeast', 4, ['pasta', 'warm', 'dish'], ['cold']),
  page('fruitFeast', 5, 'pizza', '🍕'),
] };
const kitchenMagic: SpellingStory = { id: 'kitchen-magic', activityId: 'food-spelling', titleKey: 'spelling.stories.kitchenMagic.title', pages: [
  page('kitchenMagic', 1, 'pasta', '🍝'), blank('kitchenMagic', 2, ['salad', 'leaf', 'toss'], ['spoon']),
  page('kitchenMagic', 3, 'pizza', '🍕'), blank('kitchenMagic', 4, ['melon', 'cool', 'bite'], ['plate']),
  page('kitchenMagic', 5, 'grape', '🍇'),
] };

// nature-words (5 new stories — none existed)
const forestWalk: SpellingStory = { id: 'forest-walk', activityId: 'nature-words', titleKey: 'spelling.stories.forestWalk.title', pages: [
  page('forestWalk', 1, 'leaf', '🍃'), blank('forestWalk', 2, ['rain', 'pond'], ),
  page('forestWalk', 3, 'seed', '🌱'), blank('forestWalk', 4, ['rock', 'moss']),
  page('forestWalk', 5, 'nest', '🪺'),
] };
const riverAdventure: SpellingStory = { id: 'river-adventure', activityId: 'nature-words', titleKey: 'spelling.stories.riverAdventure.title', pages: [
  page('riverAdventure', 1, 'pond', '🌊'), blank('riverAdventure', 2, ['fern', 'rock']),
  page('riverAdventure', 3, 'rain', '🌧️'), blank('riverAdventure', 4, ['leaf', 'seed']),
  page('riverAdventure', 5, 'moss', '🌿'),
] };
const hilltopView: SpellingStory = { id: 'hilltop-view', activityId: 'nature-words', titleKey: 'spelling.stories.hilltopView.title', pages: [
  page('hilltopView', 1, 'rock', '🪨'), blank('hilltopView', 2, ['nest', 'leaf']),
  page('hilltopView', 3, 'fern', '🌿'), blank('hilltopView', 4, ['rain', 'moss']),
  page('hilltopView', 5, 'seed', '🌱'),
] };
const meadowMorning: SpellingStory = { id: 'meadow-morning', activityId: 'nature-words', titleKey: 'spelling.stories.meadowMorning.title', pages: [
  page('meadowMorning', 1, 'moss', '🌿'), blank('meadowMorning', 2, ['seed', 'rock']),
  page('meadowMorning', 3, 'nest', '🪺'), blank('meadowMorning', 4, ['pond', 'fern']),
  page('meadowMorning', 5, 'leaf', '🍃'),
] };
const rainyDay: SpellingStory = { id: 'rainy-day-nature', activityId: 'nature-words', titleKey: 'spelling.stories.rainyDayNature.title', pages: [
  page('rainyDayNature', 1, 'rain', '🌧️'), blank('rainyDayNature', 2, ['moss', 'pond']),
  page('rainyDayNature', 3, 'leaf', '🍃'), blank('rainyDayNature', 4, ['nest', 'rock']),
  page('rainyDayNature', 5, 'fern', '🌿'),
] };

// ── HARD Variations ─────────────────────────────────────────────────

// garden-words (5 new — none existed)
const gardenSunrise: SpellingStory = { id: 'garden-sunrise', activityId: 'garden-words', titleKey: 'spelling.stories.gardenSunrise.title', pages: [
  page('gardenSunrise', 1, 'bloom', '🌸'), blank('gardenSunrise', 2, ['petal', 'earth', 'roots'], ['weeds', 'frost']),
  page('gardenSunrise', 3, 'hedge', '🌿'), blank('gardenSunrise', 4, ['thorn', 'creek', 'trunk'], ['shade', 'stone']),
  page('gardenSunrise', 5, 'fruit', '🍎'),
] };
const gardenRain: SpellingStory = { id: 'garden-rain', activityId: 'garden-words', titleKey: 'spelling.stories.gardenRain.title', pages: [
  page('gardenRain', 1, 'roots', '🌱'), blank('gardenRain', 2, ['bloom', 'hedge', 'creek'], ['storm', 'cloud']),
  page('gardenRain', 3, 'petal', '🌺'), blank('gardenRain', 4, ['fruit', 'earth', 'thorn'], ['shade', 'fence']),
  page('gardenRain', 5, 'trunk', '🌳'),
] };
const gardenNight: SpellingStory = { id: 'garden-night', activityId: 'garden-words', titleKey: 'spelling.stories.gardenNight.title', pages: [
  page('gardenNight', 1, 'thorn', '🌹'), blank('gardenNight', 2, ['trunk', 'roots', 'bloom'], ['dusk', 'mist']),
  page('gardenNight', 3, 'earth', '🪴'), blank('gardenNight', 4, ['petal', 'hedge', 'fruit'], ['dark', 'cool']),
  page('gardenNight', 5, 'creek', '💧'),
] };
const gardenSpring: SpellingStory = { id: 'garden-spring', activityId: 'garden-words', titleKey: 'spelling.stories.gardenSpring.title', pages: [
  page('gardenSpring', 1, 'creek', '💧'), blank('gardenSpring', 2, ['earth', 'fruit', 'petal'], ['rain', 'wind']),
  page('gardenSpring', 3, 'trunk', '🌳'), blank('gardenSpring', 4, ['bloom', 'thorn', 'hedge'], ['hail', 'snow']),
  page('gardenSpring', 5, 'roots', '🌱'),
] };
const gardenHarvest: SpellingStory = { id: 'garden-harvest', activityId: 'garden-words', titleKey: 'spelling.stories.gardenHarvest.title', pages: [
  page('gardenHarvest', 1, 'fruit', '🍎'), blank('gardenHarvest', 2, ['creek', 'trunk', 'earth'], ['leaf', 'vine']),
  page('gardenHarvest', 3, 'bloom', '🌸'), blank('gardenHarvest', 4, ['roots', 'petal', 'thorn'], ['bark', 'moss']),
  page('gardenHarvest', 5, 'hedge', '🌿'),
] };

// word-builder (5 new — none existed)
const wordFactory: SpellingStory = { id: 'word-factory', activityId: 'word-builder', titleKey: 'spelling.stories.wordFactory.title', pages: [
  page('wordFactory', 1, 'splash', '💦'), blank('wordFactory', 2, ['bridge', 'planet', 'frozen'], ['castle', 'dragon']),
  page('wordFactory', 3, 'flight', '✈️'), blank('wordFactory', 4, ['stream', 'garden', 'sunset'], ['throne', 'knight']),
  page('wordFactory', 5, 'wonder', '✨'),
] };
const wordQuest: SpellingStory = { id: 'word-quest', activityId: 'word-builder', titleKey: 'spelling.stories.wordQuest.title', pages: [
  page('wordQuest', 1, 'bridge', '🌉'), blank('wordQuest', 2, ['frozen', 'stream', 'wonder'], ['spirit', 'shadow']),
  page('wordQuest', 3, 'planet', '🪐'), blank('wordQuest', 4, ['garden', 'splash', 'flight'], ['candle', 'feather']),
  page('wordQuest', 5, 'sunset', '🌅'),
] };
const wordForest: SpellingStory = { id: 'word-forest', activityId: 'word-builder', titleKey: 'spelling.stories.wordForest.title', pages: [
  page('wordForest', 1, 'frozen', '❄️'), blank('wordForest', 2, ['sunset', 'flight', 'bridge'], ['ripple', 'breeze']),
  page('wordForest', 3, 'stream', '🏞️'), blank('wordForest', 4, ['planet', 'wonder', 'splash'], ['meadow', 'tunnel']),
  page('wordForest', 5, 'garden', '🏡'),
] };
const wordStar: SpellingStory = { id: 'word-star', activityId: 'word-builder', titleKey: 'spelling.stories.wordStar.title', pages: [
  page('wordStar', 1, 'garden', '🏡'), blank('wordStar', 2, ['splash', 'wonder', 'frozen'], ['silver', 'golden']),
  page('wordStar', 3, 'sunset', '🌅'), blank('wordStar', 4, ['bridge', 'stream', 'planet'], ['harbor', 'valley']),
  page('wordStar', 5, 'flight', '✈️'),
] };
const wordOcean: SpellingStory = { id: 'word-ocean', activityId: 'word-builder', titleKey: 'spelling.stories.wordOcean.title', pages: [
  page('wordOcean', 1, 'wonder', '✨'), blank('wordOcean', 2, ['flight', 'garden', 'sunset'], ['mirror', 'beacon']),
  page('wordOcean', 3, 'splash', '💦'), blank('wordOcean', 4, ['frozen', 'planet', 'bridge'], ['anchor', 'rapids']),
  page('wordOcean', 5, 'stream', '🏞️'),
] };

// sentence-speller (5 new — none existed)
const sentenceParty: SpellingStory = { id: 'sentence-party', activityId: 'sentence-speller', titleKey: 'spelling.stories.sentenceParty.title', pages: [
  page('sentenceParty', 1, 'the cat', '🐱'), blank('sentenceParty', 2, ['big dog', 'ran far', 'red hat'], ['old box', 'wet mop']),
  page('sentenceParty', 3, 'we play', '⚽'), blank('sentenceParty', 4, ['he sits', 'go home', 'my toy'], ['no fun', 'so sad']),
  page('sentenceParty', 5, 'I jump', '🤸'),
] };
const sentenceForest: SpellingStory = { id: 'sentence-forest', activityId: 'sentence-speller', titleKey: 'spelling.stories.sentenceForest.title', pages: [
  page('sentenceForest', 1, 'big dog', '🐕'), blank('sentenceForest', 2, ['the cat', 'we play', 'I jump'], ['no way', 'do run']),
  page('sentenceForest', 3, 'red hat', '🎩'), blank('sentenceForest', 4, ['he sits', 'go home', 'my toy'], ['up top', 'be sad']),
  page('sentenceForest', 5, 'ran far', '🏃'),
] };
const sentenceBeach: SpellingStory = { id: 'sentence-beach', activityId: 'sentence-speller', titleKey: 'spelling.stories.sentenceBeach.title', pages: [
  page('sentenceBeach', 1, 'go home', '🏠'), blank('sentenceBeach', 2, ['my toy', 'ran far', 'the cat'], ['am wet', 'is hot']),
  page('sentenceBeach', 3, 'he sits', '🪑'), blank('sentenceBeach', 4, ['big dog', 'I jump', 'we play'], ['on top', 'it was']),
  page('sentenceBeach', 5, 'red hat', '🎩'),
] };
const sentenceNight: SpellingStory = { id: 'sentence-night', activityId: 'sentence-speller', titleKey: 'spelling.stories.sentenceNight.title', pages: [
  page('sentenceNight', 1, 'my toy', '🧸'), blank('sentenceNight', 2, ['I jump', 'the cat', 'red hat'], ['at top', 'be shy']),
  page('sentenceNight', 3, 'ran far', '🏃'), blank('sentenceNight', 4, ['we play', 'big dog', 'go home'], ['in bed', 'so dim']),
  page('sentenceNight', 5, 'he sits', '🪑'),
] };
const sentencePark: SpellingStory = { id: 'sentence-park', activityId: 'sentence-speller', titleKey: 'spelling.stories.sentencePark.title', pages: [
  page('sentencePark', 1, 'I jump', '🤸'), blank('sentencePark', 2, ['go home', 'big dog', 'we play'], ['do hop', 'am out']),
  page('sentencePark', 3, 'the cat', '🐱'), blank('sentencePark', 4, ['ran far', 'my toy', 'he sits'], ['on log', 'by sun']),
  page('sentencePark', 5, 'red hat', '🎩'),
] };

// tricky-words (5 new — none existed)
const trickyIsland: SpellingStory = { id: 'tricky-island', activityId: 'tricky-words', titleKey: 'spelling.stories.trickyIsland.title', pages: [
  page('trickyIsland', 1, 'enough', '✅'), blank('trickyIsland', 2, ['people', 'friend', 'school'], ['though', 'weight']),
  page('trickyIsland', 3, 'island', '🏝️'), blank('trickyIsland', 4, ['castle', 'knight', 'listen'], ['should', 'could']),
  page('trickyIsland', 5, 'orange', '🍊'),
] };
const trickyJungle: SpellingStory = { id: 'tricky-jungle', activityId: 'tricky-words', titleKey: 'spelling.stories.trickyJungle.title', pages: [
  page('trickyJungle', 1, 'friend', '🤝'), blank('trickyJungle', 2, ['castle', 'island', 'orange'], ['height', 'rough']),
  page('trickyJungle', 3, 'people', '👥'), blank('trickyJungle', 4, ['enough', 'school', 'knight'], ['would', 'heart']),
  page('trickyJungle', 5, 'listen', '👂'),
] };
const trickyCastle: SpellingStory = { id: 'tricky-castle', activityId: 'tricky-words', titleKey: 'spelling.stories.trickyCastle.title', pages: [
  page('trickyCastle', 1, 'castle', '🏰'), blank('trickyCastle', 2, ['knight', 'listen', 'people'], ['cough', 'eight']),
  page('trickyCastle', 3, 'school', '🏫'), blank('trickyCastle', 4, ['friend', 'orange', 'enough'], ['piece', 'whole']),
  page('trickyCastle', 5, 'island', '🏝️'),
] };
const trickyOcean: SpellingStory = { id: 'tricky-ocean', activityId: 'tricky-words', titleKey: 'spelling.stories.trickyOcean.title', pages: [
  page('trickyOcean', 1, 'knight', '⚔️'), blank('trickyOcean', 2, ['orange', 'enough', 'castle'], ['built', 'laugh']),
  page('trickyOcean', 3, 'listen', '👂'), blank('trickyOcean', 4, ['school', 'island', 'friend'], ['break', 'great']),
  page('trickyOcean', 5, 'people', '👥'),
] };
const trickyMountain: SpellingStory = { id: 'tricky-mountain', activityId: 'tricky-words', titleKey: 'spelling.stories.trickyMountain.title', pages: [
  page('trickyMountain', 1, 'school', '🏫'), blank('trickyMountain', 2, ['listen', 'friend', 'knight'], ['guard', 'sword']),
  page('trickyMountain', 3, 'orange', '🍊'), blank('trickyMountain', 4, ['people', 'castle', 'island'], ['guide', 'choir']),
  page('trickyMountain', 5, 'enough', '✅'),
] };

// story-spelling variations 2–5 (enchantedCastle is #1)
const dragonLibrary: SpellingStory = { id: 'dragon-library', activityId: 'story-spelling', titleKey: 'spelling.stories.dragonLibrary.title', pages: [
  page('dragonLibrary', 1, 'dragon', '🐉'), blank('dragonLibrary', 2, ['forest', 'castle', 'magic'], ['tower', 'quest']),
  page('dragonLibrary', 3, 'bridge', '🌉'), blank('dragonLibrary', 4, ['knight', 'wander', 'golden'], ['flame', 'storm']),
  page('dragonLibrary', 5, 'scroll', '📜'),
] };
const moonlitPath: SpellingStory = { id: 'moonlit-path', activityId: 'story-spelling', titleKey: 'spelling.stories.moonlitPath.title', pages: [
  page('moonlitPath', 1, 'forest', '🌲'), blank('moonlitPath', 2, ['golden', 'wander', 'dragon'], ['riddle', 'shield']),
  page('moonlitPath', 3, 'castle', '🏰'), blank('moonlitPath', 4, ['scroll', 'bridge', 'knight'], ['cloak', 'crown']),
  page('moonlitPath', 5, 'magic', '🪄'),
] };
const starryKingdom: SpellingStory = { id: 'starry-kingdom', activityId: 'story-spelling', titleKey: 'spelling.stories.starryKingdom.title', pages: [
  page('starryKingdom', 1, 'knight', '⚔️'), blank('starryKingdom', 2, ['scroll', 'magic', 'forest'], ['ocean', 'armor']),
  page('starryKingdom', 3, 'golden', '🥇'), blank('starryKingdom', 4, ['dragon', 'castle', 'wander'], ['charm', 'jewel']),
  page('starryKingdom', 5, 'bridge', '🌉'),
] };
const enchantedForest: SpellingStory = { id: 'enchanted-forest', activityId: 'story-spelling', titleKey: 'spelling.stories.enchantedForest.title', pages: [
  page('enchantedForest', 1, 'wander', '🚶'), blank('enchantedForest', 2, ['bridge', 'knight', 'scroll'], ['pixie', 'river']),
  page('enchantedForest', 3, 'magic', '🪄'), blank('enchantedForest', 4, ['golden', 'forest', 'dragon'], ['grove', 'fairy']),
  page('enchantedForest', 5, 'castle', '🏰'),
] };

// ── Exports ──────────────────────────────────────────────────────────

export const ALL_SPELLING_STORIES: SpellingStory[] = [
  owlCantSleep, farmyardFriends, bugHunt, pondLife, barnDance,
  teddysDayOut, kitchenAdventure, parkDay, rainyMorning, bedtimeRoutine,
  painterMouse, rainbowGarden, paintSplash, sunsetColours, colourParade,
  shapesInClouds, shapeParty, shapeIsland, shapeTreasure, shapeRace,
  firstDayFriends, nameGarden, nameStars, namePicnic, nameRainbow,
  wombatStars, wombatPicnic, wombatDream, wombatGarden, wombatSnow,
  jungleWelcome, safariSunrise, oceanAnimals, mountainAnimals, animalBedtime,
  bearHungry, picnicBasket, bakingDay, fruitFeast, kitchenMagic,
  forestWalk, riverAdventure, hilltopView, meadowMorning, rainyDay,
  gardenSunrise, gardenRain, gardenNight, gardenSpring, gardenHarvest,
  wordFactory, wordQuest, wordForest, wordStar, wordOcean,
  sentenceParty, sentenceForest, sentenceBeach, sentenceNight, sentencePark,
  trickyIsland, trickyJungle, trickyCastle, trickyOcean, trickyMountain,
  enchantedCastle, dragonLibrary, moonlitPath, starryKingdom, enchantedForest,
];

/** Build a multi-story map: activityId → SpellingStory[] */
function buildStoryMap(stories: SpellingStory[]): Map<string, SpellingStory[]> {
  const map = new Map<string, SpellingStory[]>();
  for (const story of stories) {
    const existing = map.get(story.activityId) ?? [];
    existing.push(story);
    map.set(story.activityId, existing);
  }
  return map;
}

import { ALL_NUMBERS_STORIES } from './numbers-stories';

/** Combined spelling + numbers stories */
export const ALL_STORIES: SpellingStory[] = [
  ...ALL_SPELLING_STORIES,
  ...ALL_NUMBERS_STORIES,
];

const STORY_MAP = buildStoryMap(ALL_STORIES);

/** Get all spelling stories for an activity ID */
export function getSpellingStories(activityId: string): SpellingStory[] {
  return STORY_MAP.get(activityId) ?? [];
}

/** Get a random spelling story for an activity ID (O(1) lookup) */
export function getSpellingStory(activityId: string): SpellingStory | undefined {
  const stories = STORY_MAP.get(activityId);
  if (!stories || stories.length === 0) return undefined;
  return stories[Math.floor(Math.random() * stories.length)];
}

// Build a flat ID → story lookup for getStoryById
const STORY_BY_ID = new Map<string, SpellingStory>(
  ALL_STORIES.map(s => [s.id, s]),
);

/** Get a specific story by its unique ID */
export function getStoryById(storyId: string): SpellingStory | undefined {
  return STORY_BY_ID.get(storyId);
}
