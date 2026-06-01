/**
 * Real World Bridge data for all 15 Numbers activities.
 */
import type { RealWorldBridgeData } from '@/types/real-world-bridge';

export const NUMBERS_BRIDGES: RealWorldBridgeData[] = [
  // ── Ages 1-2 ───────────────────────────────────────────────────────
  {
    activityId: 'counting-fun',
    section: 'numbers',
    narrationKey: 'bridge.numbers.countingFun.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.numbers.countingFun.home', skills: ['counting', 'number-recognition'] },
      { category: 'outdoors', descriptionKey: 'bridge.numbers.countingFun.outdoors', skills: ['counting', 'vocabulary'] },
      { category: 'creative', descriptionKey: 'bridge.numbers.countingFun.creative', skills: ['fine-motor', 'counting'] },
    ],
    closingKey: 'bridge.numbers.countingFun.closing',
  },
  {
    activityId: 'number-friends',
    section: 'numbers',
    narrationKey: 'bridge.numbers.numberFriends.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.numbers.numberFriends.home', skills: ['counting', 'sorting-categorisation'] },
      { category: 'outdoors', descriptionKey: 'bridge.numbers.numberFriends.outdoors', skills: ['counting', 'vocabulary'] },
      { category: 'creative', descriptionKey: 'bridge.numbers.numberFriends.creative', skills: ['fine-motor', 'number-recognition'] },
    ],
    closingKey: 'bridge.numbers.numberFriends.closing',
  },
  {
    activityId: 'colour-counting',
    section: 'numbers',
    narrationKey: 'bridge.numbers.colourCounting.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.numbers.colourCounting.home', skills: ['sorting-categorisation', 'counting'] },
      { category: 'outdoors', descriptionKey: 'bridge.numbers.colourCounting.outdoors', skills: ['counting', 'vocabulary'] },
      { category: 'creative', descriptionKey: 'bridge.numbers.colourCounting.creative', skills: ['fine-motor', 'sorting-categorisation'] },
    ],
    closingKey: 'bridge.numbers.colourCounting.closing',
  },
  {
    activityId: 'shape-counting',
    section: 'numbers',
    narrationKey: 'bridge.numbers.shapeCounting.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.numbers.shapeCounting.home', skills: ['spatial-awareness', 'counting'] },
      { category: 'outdoors', descriptionKey: 'bridge.numbers.shapeCounting.outdoors', skills: ['spatial-awareness', 'counting'] },
      { category: 'creative', descriptionKey: 'bridge.numbers.shapeCounting.creative', skills: ['fine-motor', 'spatial-awareness'] },
    ],
    closingKey: 'bridge.numbers.shapeCounting.closing',
  },
  {
    activityId: 'one-two-three',
    section: 'numbers',
    narrationKey: 'bridge.numbers.oneTwoThree.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.numbers.oneTwoThree.home', skills: ['counting', 'number-recognition'] },
      { category: 'outdoors', descriptionKey: 'bridge.numbers.oneTwoThree.outdoors', skills: ['counting', 'rhythm-timing'] },
      { category: 'creative', descriptionKey: 'bridge.numbers.oneTwoThree.creative', skills: ['fine-motor', 'counting'] },
    ],
    closingKey: 'bridge.numbers.oneTwoThree.closing',
  },
  // ── Ages 2-4 ───────────────────────────────────────────────────────
  {
    activityId: 'wombat-word-placing',
    section: 'numbers',
    narrationKey: 'bridge.numbers.wombatWordPlacing.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.numbers.wombatWordPlacing.home', skills: ['number-recognition', 'problem-solving'] },
      { category: 'outdoors', descriptionKey: 'bridge.numbers.wombatWordPlacing.outdoors', skills: ['counting', 'vocabulary'] },
      { category: 'creative', descriptionKey: 'bridge.numbers.wombatWordPlacing.creative', skills: ['creative-expression', 'number-recognition'] },
    ],
    closingKey: 'bridge.numbers.wombatWordPlacing.closing',
  },
  {
    activityId: 'animal-counting',
    section: 'numbers',
    narrationKey: 'bridge.numbers.animalCounting.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.numbers.animalCounting.home', skills: ['counting', 'vocabulary'] },
      { category: 'outdoors', descriptionKey: 'bridge.numbers.animalCounting.outdoors', skills: ['counting', 'environmental-awareness'] },
      { category: 'creative', descriptionKey: 'bridge.numbers.animalCounting.creative', skills: ['fine-motor', 'counting'] },
    ],
    closingKey: 'bridge.numbers.animalCounting.closing',
  },
  {
    activityId: 'fruit-counting',
    section: 'numbers',
    narrationKey: 'bridge.numbers.fruitCounting.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.numbers.fruitCounting.home', skills: ['counting', 'vocabulary'] },
      { category: 'outdoors', descriptionKey: 'bridge.numbers.fruitCounting.outdoors', skills: ['counting', 'environmental-awareness'] },
      { category: 'creative', descriptionKey: 'bridge.numbers.fruitCounting.creative', skills: ['counting', 'fine-motor'] },
    ],
    closingKey: 'bridge.numbers.fruitCounting.closing',
  },
  {
    activityId: 'toy-counting',
    section: 'numbers',
    narrationKey: 'bridge.numbers.toyCounting.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.numbers.toyCounting.home', skills: ['counting', 'sorting-categorisation'] },
      { category: 'outdoors', descriptionKey: 'bridge.numbers.toyCounting.outdoors', skills: ['counting', 'sorting-categorisation'] },
      { category: 'creative', descriptionKey: 'bridge.numbers.toyCounting.creative', skills: ['fine-motor', 'counting'] },
    ],
    closingKey: 'bridge.numbers.toyCounting.closing',
  },
  {
    activityId: 'garden-counting',
    section: 'numbers',
    narrationKey: 'bridge.numbers.gardenCounting.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.numbers.gardenCounting.home', skills: ['counting', 'environmental-awareness'] },
      { category: 'outdoors', descriptionKey: 'bridge.numbers.gardenCounting.outdoors', skills: ['counting', 'environmental-awareness'] },
      { category: 'creative', descriptionKey: 'bridge.numbers.gardenCounting.creative', skills: ['fine-motor', 'counting'] },
    ],
    closingKey: 'bridge.numbers.gardenCounting.closing',
  },
  // ── Ages 4+ ────────────────────────────────────────────────────────
  {
    activityId: 'number-puzzles',
    section: 'numbers',
    narrationKey: 'bridge.numbers.numberPuzzles.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.numbers.numberPuzzles.home', skills: ['problem-solving', 'patterns'] },
      { category: 'outdoors', descriptionKey: 'bridge.numbers.numberPuzzles.outdoors', skills: ['problem-solving', 'counting'] },
      { category: 'creative', descriptionKey: 'bridge.numbers.numberPuzzles.creative', skills: ['creative-expression', 'problem-solving'] },
    ],
    closingKey: 'bridge.numbers.numberPuzzles.closing',
  },

  {
    activityId: 'adding-fun',
    section: 'numbers',
    narrationKey: 'bridge.numbers.addingFun.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.numbers.addingFun.home', skills: ['addition-subtraction', 'counting'] },
      { category: 'outdoors', descriptionKey: 'bridge.numbers.addingFun.outdoors', skills: ['addition-subtraction', 'counting'] },
      { category: 'creative', descriptionKey: 'bridge.numbers.addingFun.creative', skills: ['fine-motor', 'addition-subtraction'] },
    ],
    closingKey: 'bridge.numbers.addingFun.closing',
  },
  {
    activityId: 'number-stories',
    section: 'numbers',
    narrationKey: 'bridge.numbers.numberStories.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.numbers.numberStories.home', skills: ['counting', 'reading-comprehension'] },
      { category: 'outdoors', descriptionKey: 'bridge.numbers.numberStories.outdoors', skills: ['counting', 'storytelling'] },
      { category: 'creative', descriptionKey: 'bridge.numbers.numberStories.creative', skills: ['storytelling', 'counting'] },
    ],
    closingKey: 'bridge.numbers.numberStories.closing',
  },
  {
    activityId: 'number-patterns',
    section: 'numbers',
    narrationKey: 'bridge.numbers.numberPatterns.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.numbers.numberPatterns.home', skills: ['patterns', 'rhythm-timing'] },
      { category: 'outdoors', descriptionKey: 'bridge.numbers.numberPatterns.outdoors', skills: ['patterns', 'spatial-awareness'] },
      { category: 'creative', descriptionKey: 'bridge.numbers.numberPatterns.creative', skills: ['patterns', 'creative-expression'] },
    ],
    closingKey: 'bridge.numbers.numberPatterns.closing',
  },
  {
    activityId: 'subtraction-fun',
    section: 'numbers',
    narrationKey: 'bridge.numbers.subtractionFun.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.numbers.subtractionFun.home', skills: ['addition-subtraction', 'counting'] },
      { category: 'outdoors', descriptionKey: 'bridge.numbers.subtractionFun.outdoors', skills: ['addition-subtraction', 'problem-solving'] },
      { category: 'creative', descriptionKey: 'bridge.numbers.subtractionFun.creative', skills: ['addition-subtraction', 'fine-motor'] },
    ],
    closingKey: 'bridge.numbers.subtractionFun.closing',
  },
];