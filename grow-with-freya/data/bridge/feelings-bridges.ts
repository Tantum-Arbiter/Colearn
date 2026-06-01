/**
 * Real World Bridge data for all 15 Feelings activities.
 */
import type { RealWorldBridgeData } from '@/types/real-world-bridge';

export const FEELINGS_BRIDGES: RealWorldBridgeData[] = [
  // ── Ages 1-2 ───────────────────────────────────────────────────────
  {
    activityId: 'happy-faces',
    section: 'feelings',
    narrationKey: 'bridge.feelings.happyFaces.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.feelings.happyFaces.home', skills: ['emotional-literacy', 'vocabulary'] },
      { category: 'outdoors', descriptionKey: 'bridge.feelings.happyFaces.outdoors', skills: ['emotional-literacy', 'empathy'] },
      { category: 'creative', descriptionKey: 'bridge.feelings.happyFaces.creative', skills: ['creative-expression', 'emotional-literacy'] },
    ],
    closingKey: 'bridge.feelings.happyFaces.closing',
  },
  {
    activityId: 'feeling-colours',
    section: 'feelings',
    narrationKey: 'bridge.feelings.feelingColours.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.feelings.feelingColours.home', skills: ['emotional-literacy', 'vocabulary'] },
      { category: 'outdoors', descriptionKey: 'bridge.feelings.feelingColours.outdoors', skills: ['emotional-literacy', 'imagination'] },
      { category: 'creative', descriptionKey: 'bridge.feelings.feelingColours.creative', skills: ['creative-expression', 'emotional-literacy'] },
    ],
    closingKey: 'bridge.feelings.feelingColours.closing',
  },
  {
    activityId: 'mood-music',
    section: 'feelings',
    narrationKey: 'bridge.feelings.moodMusic.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.feelings.moodMusic.home', skills: ['listening', 'emotional-literacy'] },
      { category: 'outdoors', descriptionKey: 'bridge.feelings.moodMusic.outdoors', skills: ['listening', 'rhythm-timing'] },
      { category: 'creative', descriptionKey: 'bridge.feelings.moodMusic.creative', skills: ['creative-expression', 'rhythm-timing'] },
    ],
    closingKey: 'bridge.feelings.moodMusic.closing',
  },
  {
    activityId: 'animal-feelings',
    section: 'feelings',
    narrationKey: 'bridge.feelings.animalFeelings.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.feelings.animalFeelings.home', skills: ['empathy', 'vocabulary'] },
      { category: 'outdoors', descriptionKey: 'bridge.feelings.animalFeelings.outdoors', skills: ['empathy', 'environmental-awareness'] },
      { category: 'creative', descriptionKey: 'bridge.feelings.animalFeelings.creative', skills: ['creative-expression', 'empathy'] },
    ],
    closingKey: 'bridge.feelings.animalFeelings.closing',
  },
  {
    activityId: 'my-feelings',
    section: 'feelings',
    narrationKey: 'bridge.feelings.myFeelings.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.feelings.myFeelings.home', skills: ['self-regulation', 'emotional-literacy'] },
      { category: 'outdoors', descriptionKey: 'bridge.feelings.myFeelings.outdoors', skills: ['emotional-literacy', 'vocabulary'] },
      { category: 'creative', descriptionKey: 'bridge.feelings.myFeelings.creative', skills: ['creative-expression', 'self-regulation'] },
    ],
    closingKey: 'bridge.feelings.myFeelings.closing',
  },
  // ── Ages 2-4 ───────────────────────────────────────────────────────
  {
    activityId: 'emotion-faces',
    section: 'feelings',
    narrationKey: 'bridge.feelings.emotionFaces.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.feelings.emotionFaces.home', skills: ['emotional-literacy', 'empathy'] },
      { category: 'outdoors', descriptionKey: 'bridge.feelings.emotionFaces.outdoors', skills: ['emotional-literacy', 'vocabulary'] },
      { category: 'creative', descriptionKey: 'bridge.feelings.emotionFaces.creative', skills: ['fine-motor', 'emotional-literacy'] },
    ],
    closingKey: 'bridge.feelings.emotionFaces.closing',
  },
  {
    activityId: 'calm-breathing',
    section: 'feelings',
    narrationKey: 'bridge.feelings.calmBreathing.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.feelings.calmBreathing.home', skills: ['self-regulation', 'patience'] },
      { category: 'outdoors', descriptionKey: 'bridge.feelings.calmBreathing.outdoors', skills: ['self-regulation', 'listening'] },
      { category: 'creative', descriptionKey: 'bridge.feelings.calmBreathing.creative', skills: ['creative-expression', 'self-regulation'] },
    ],
    closingKey: 'bridge.feelings.calmBreathing.closing',
  },
  {
    activityId: 'kindness-quest',
    section: 'feelings',
    narrationKey: 'bridge.feelings.kindnessQuest.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.feelings.kindnessQuest.home', skills: ['kindness', 'empathy'] },
      { category: 'outdoors', descriptionKey: 'bridge.feelings.kindnessQuest.outdoors', skills: ['kindness', 'turn-taking'] },
      { category: 'creative', descriptionKey: 'bridge.feelings.kindnessQuest.creative', skills: ['kindness', 'creative-expression'] },
    ],
    closingKey: 'bridge.feelings.kindnessQuest.closing',
  },
  {
    activityId: 'friendship-stories',
    section: 'feelings',
    narrationKey: 'bridge.feelings.friendshipStories.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.feelings.friendshipStories.home', skills: ['empathy', 'turn-taking'] },
      { category: 'outdoors', descriptionKey: 'bridge.feelings.friendshipStories.outdoors', skills: ['turn-taking', 'empathy'] },
      { category: 'creative', descriptionKey: 'bridge.feelings.friendshipStories.creative', skills: ['creative-expression', 'empathy'] },
    ],
    closingKey: 'bridge.feelings.friendshipStories.closing',
  },
  {
    activityId: 'worry-monster',
    section: 'feelings',
    narrationKey: 'bridge.feelings.worryMonster.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.feelings.worryMonster.home', skills: ['self-regulation', 'emotional-literacy'] },
      { category: 'outdoors', descriptionKey: 'bridge.feelings.worryMonster.outdoors', skills: ['self-regulation', 'patience'] },
      { category: 'creative', descriptionKey: 'bridge.feelings.worryMonster.creative', skills: ['creative-expression', 'self-regulation'] },
    ],
    closingKey: 'bridge.feelings.worryMonster.closing',
  },
  // ── Ages 4+ ────────────────────────────────────────────────────────
  {
    activityId: 'empathy-explorer',
    section: 'feelings',
    narrationKey: 'bridge.feelings.empathyExplorer.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.feelings.empathyExplorer.home', skills: ['empathy', 'reading-comprehension'] },
      { category: 'outdoors', descriptionKey: 'bridge.feelings.empathyExplorer.outdoors', skills: ['empathy', 'vocabulary'] },
      { category: 'creative', descriptionKey: 'bridge.feelings.empathyExplorer.creative', skills: ['storytelling', 'empathy'] },
    ],
    closingKey: 'bridge.feelings.empathyExplorer.closing',
  },

  {
    activityId: 'feeling-journal',
    section: 'feelings',
    narrationKey: 'bridge.feelings.feelingJournal.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.feelings.feelingJournal.home', skills: ['emotional-literacy', 'self-regulation'] },
      { category: 'outdoors', descriptionKey: 'bridge.feelings.feelingJournal.outdoors', skills: ['emotional-literacy', 'vocabulary'] },
      { category: 'creative', descriptionKey: 'bridge.feelings.feelingJournal.creative', skills: ['creative-expression', 'emotional-literacy'] },
    ],
    closingKey: 'bridge.feelings.feelingJournal.closing',
  },
  {
    activityId: 'conflict-solver',
    section: 'feelings',
    narrationKey: 'bridge.feelings.conflictSolver.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.feelings.conflictSolver.home', skills: ['self-regulation', 'empathy'] },
      { category: 'outdoors', descriptionKey: 'bridge.feelings.conflictSolver.outdoors', skills: ['turn-taking', 'self-regulation'] },
      { category: 'creative', descriptionKey: 'bridge.feelings.conflictSolver.creative', skills: ['storytelling', 'self-regulation'] },
    ],
    closingKey: 'bridge.feelings.conflictSolver.closing',
  },
  {
    activityId: 'gratitude-garden',
    section: 'feelings',
    narrationKey: 'bridge.feelings.gratitudeGarden.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.feelings.gratitudeGarden.home', skills: ['emotional-literacy', 'kindness'] },
      { category: 'outdoors', descriptionKey: 'bridge.feelings.gratitudeGarden.outdoors', skills: ['environmental-awareness', 'kindness'] },
      { category: 'creative', descriptionKey: 'bridge.feelings.gratitudeGarden.creative', skills: ['creative-expression', 'kindness'] },
    ],
    closingKey: 'bridge.feelings.gratitudeGarden.closing',
  },
  {
    activityId: 'self-esteem-stars',
    section: 'feelings',
    narrationKey: 'bridge.feelings.selfEsteemStars.narration',
    adventures: [
      { category: 'at-home', descriptionKey: 'bridge.feelings.selfEsteemStars.home', skills: ['self-regulation', 'emotional-literacy'] },
      { category: 'outdoors', descriptionKey: 'bridge.feelings.selfEsteemStars.outdoors', skills: ['self-regulation', 'patience'] },
      { category: 'creative', descriptionKey: 'bridge.feelings.selfEsteemStars.creative', skills: ['creative-expression', 'self-regulation'] },
    ],
    closingKey: 'bridge.feelings.selfEsteemStars.closing',
  },
];