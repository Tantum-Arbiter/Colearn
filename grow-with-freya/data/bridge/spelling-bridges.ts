/**
 * Real World Bridge data for all 15 Spelling activities.
 * Each entry has a narration (Wombat storytelling), 3 adventures
 * (at-home, outdoors, creative), and a closing encouragement.
 */
import type { RealWorldBridgeData } from '@/types/real-world-bridge';

export const SPELLING_BRIDGES: RealWorldBridgeData[] = [
  // ── Ages 1-2 ───────────────────────────────────────────────────────
  {
    activityId: 'abc-animals',
    section: 'spelling',
    narrationKey: 'bridge.spelling.abcAnimals.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.spelling.abcAnimals.home', skills: ['letter-recognition', 'vocabulary'] },
      { category: 'outdoors', descriptionKey: 'bridge.spelling.abcAnimals.outdoors', skills: ['vocabulary', 'phonics-awareness'] },
      { category: 'creative', descriptionKey: 'bridge.spelling.abcAnimals.creative', skills: ['fine-motor', 'letter-recognition'] },
    ],
    closingKey: 'bridge.spelling.abcAnimals.closing',
  },
  {
    activityId: 'first-words',
    section: 'spelling',
    narrationKey: 'bridge.spelling.firstWords.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.spelling.firstWords.home', skills: ['letter-recognition', 'vocabulary'] },
      { category: 'outdoors', descriptionKey: 'bridge.spelling.firstWords.outdoors', skills: ['phonics-awareness', 'vocabulary'] },
      { category: 'creative', descriptionKey: 'bridge.spelling.firstWords.creative', skills: ['fine-motor', 'letter-recognition'] },
    ],
    closingKey: 'bridge.spelling.firstWords.closing',
  },
  {
    activityId: 'colour-spelling',
    section: 'spelling',
    narrationKey: 'bridge.spelling.colourSpelling.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.spelling.colourSpelling.home', skills: ['vocabulary', 'sorting-categorisation'] },
      { category: 'outdoors', descriptionKey: 'bridge.spelling.colourSpelling.outdoors', skills: ['vocabulary', 'phonics-awareness'] },
      { category: 'creative', descriptionKey: 'bridge.spelling.colourSpelling.creative', skills: ['creative-expression', 'vocabulary'] },
    ],
    closingKey: 'bridge.spelling.colourSpelling.closing',
  },
  {
    activityId: 'shape-names',
    section: 'spelling',
    narrationKey: 'bridge.spelling.shapeNames.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.spelling.shapeNames.home', skills: ['spatial-awareness', 'vocabulary'] },
      { category: 'outdoors', descriptionKey: 'bridge.spelling.shapeNames.outdoors', skills: ['spatial-awareness', 'vocabulary'] },
      { category: 'creative', descriptionKey: 'bridge.spelling.shapeNames.creative', skills: ['fine-motor', 'spatial-awareness'] },
    ],
    closingKey: 'bridge.spelling.shapeNames.closing',
  },
  {
    activityId: 'my-name',
    section: 'spelling',
    narrationKey: 'bridge.spelling.myName.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.spelling.myName.home', skills: ['letter-recognition', 'spelling'] },
      { category: 'outdoors', descriptionKey: 'bridge.spelling.myName.outdoors', skills: ['letter-recognition', 'phonics-awareness'] },
      { category: 'creative', descriptionKey: 'bridge.spelling.myName.creative', skills: ['fine-motor', 'spelling'] },
    ],
    closingKey: 'bridge.spelling.myName.closing',
  },
  // ── Ages 2-4 ───────────────────────────────────────────────────────
  {
    activityId: 'wombat-spelling',
    section: 'spelling',
    narrationKey: 'bridge.spelling.wombatSpelling.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.spelling.wombatSpelling.home', skills: ['spelling', 'vocabulary'] },
      { category: 'outdoors', descriptionKey: 'bridge.spelling.wombatSpelling.outdoors', skills: ['vocabulary', 'imagination'] },
      { category: 'creative', descriptionKey: 'bridge.spelling.wombatSpelling.creative', skills: ['creative-expression', 'spelling'] },
    ],
    closingKey: 'bridge.spelling.wombatSpelling.closing',
  },
  {
    activityId: 'animal-spelling',
    section: 'spelling',
    narrationKey: 'bridge.spelling.animalSpelling.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.spelling.animalSpelling.home', skills: ['reading-comprehension', 'spelling'] },
      { category: 'outdoors', descriptionKey: 'bridge.spelling.animalSpelling.outdoors', skills: ['counting', 'vocabulary'] },
      { category: 'creative', descriptionKey: 'bridge.spelling.animalSpelling.creative', skills: ['fine-motor', 'spelling'] },
    ],
    closingKey: 'bridge.spelling.animalSpelling.closing',
  },
  {
    activityId: 'food-spelling',
    section: 'spelling',
    narrationKey: 'bridge.spelling.foodSpelling.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.spelling.foodSpelling.home', skills: ['spelling', 'vocabulary'] },
      { category: 'outdoors', descriptionKey: 'bridge.spelling.foodSpelling.outdoors', skills: ['vocabulary', 'letter-recognition'] },
      { category: 'creative', descriptionKey: 'bridge.spelling.foodSpelling.creative', skills: ['fine-motor', 'creative-expression'] },
    ],
    closingKey: 'bridge.spelling.foodSpelling.closing',
  },
  {
    activityId: 'nature-words',
    section: 'spelling',
    narrationKey: 'bridge.spelling.natureWords.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.spelling.natureWords.home', skills: ['vocabulary', 'spelling'] },
      { category: 'outdoors', descriptionKey: 'bridge.spelling.natureWords.outdoors', skills: ['vocabulary', 'environmental-awareness'] },
      { category: 'creative', descriptionKey: 'bridge.spelling.natureWords.creative', skills: ['creative-expression', 'spelling'] },
    ],
    closingKey: 'bridge.spelling.natureWords.closing',
  },
  {
    activityId: 'garden-words',
    section: 'spelling',
    narrationKey: 'bridge.spelling.gardenWords.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.spelling.gardenWords.home', skills: ['vocabulary', 'environmental-awareness'] },
      { category: 'outdoors', descriptionKey: 'bridge.spelling.gardenWords.outdoors', skills: ['vocabulary', 'environmental-awareness'] },
      { category: 'creative', descriptionKey: 'bridge.spelling.gardenWords.creative', skills: ['fine-motor', 'spelling'] },
    ],
    closingKey: 'bridge.spelling.gardenWords.closing',
  },
  // ── Ages 4+ ────────────────────────────────────────────────────────
  {
    activityId: 'word-builder',
    section: 'spelling',
    narrationKey: 'bridge.spelling.wordBuilder.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.spelling.wordBuilder.home', skills: ['spelling', 'letter-recognition'] },
      { category: 'outdoors', descriptionKey: 'bridge.spelling.wordBuilder.outdoors', skills: ['spelling', 'imagination'] },
      { category: 'creative', descriptionKey: 'bridge.spelling.wordBuilder.creative', skills: ['storytelling', 'spelling'] },
    ],
    closingKey: 'bridge.spelling.wordBuilder.closing',
  },
  {
    activityId: 'sentence-speller',
    section: 'spelling',
    narrationKey: 'bridge.spelling.sentenceSpeller.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.spelling.sentenceSpeller.home', skills: ['spelling', 'reading-comprehension'] },
      { category: 'outdoors', descriptionKey: 'bridge.spelling.sentenceSpeller.outdoors', skills: ['vocabulary', 'spelling'] },
      { category: 'creative', descriptionKey: 'bridge.spelling.sentenceSpeller.creative', skills: ['storytelling', 'creative-expression'] },
    ],
    closingKey: 'bridge.spelling.sentenceSpeller.closing',
  },
  {
    activityId: 'tricky-words',
    section: 'spelling',
    narrationKey: 'bridge.spelling.trickyWords.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.spelling.trickyWords.home', skills: ['spelling', 'reading-comprehension'] },
      { category: 'outdoors', descriptionKey: 'bridge.spelling.trickyWords.outdoors', skills: ['spelling', 'creative-expression'] },
      { category: 'creative', descriptionKey: 'bridge.spelling.trickyWords.creative', skills: ['spelling', 'patterns'] },
    ],
    closingKey: 'bridge.spelling.trickyWords.closing',
  },

  {
    activityId: 'story-spelling',
    section: 'spelling',
    narrationKey: 'bridge.spelling.storySpelling.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.spelling.storySpelling.home', skills: ['reading-comprehension', 'spelling'] },
      { category: 'outdoors', descriptionKey: 'bridge.spelling.storySpelling.outdoors', skills: ['storytelling', 'imagination'] },
      { category: 'creative', descriptionKey: 'bridge.spelling.storySpelling.creative', skills: ['storytelling', 'creative-expression'] },
    ],
    closingKey: 'bridge.spelling.storySpelling.closing',
  },
];
