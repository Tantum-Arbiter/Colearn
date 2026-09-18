import type { Ionicons } from '@expo/vector-icons';
import { type AgeRange } from '@/components/learning/age-range-carousel';

/** Game mechanic type for routing to the correct game screen */
export type GameType = 'spelling' | 'choice' | 'sorting' | 'story';

export type LearningMode = 'spelling' | 'numbers' | 'feelings';

export interface LearningActivity {
  id: string;
  nameKey: string;
  descKey: string;
  ageKey: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  /** Which game screen to open */
  gameType: GameType;
  /** Fallback story ID for 'story' game type */
  storyId?: string;
  /** Which age ranges this activity supports */
  ageRanges: AgeRange[];
}

/** Number of free activities per age group (first N are free, rest locked) */
export const FREE_PER_AGE_GROUP = 3;

export const SPELLING_ACTIVITIES: LearningActivity[] = [
  // Ages 1-2 (5 activities — first 3 free, last 2 locked)
  { id: 'abc-animals', nameKey: 'learning.abcAnimals', descKey: 'learning.abcAnimalsDesc', ageKey: 'learning.abcAnimalsAge', icon: 'paw-outline', color: '#F59E0B', gameType: 'spelling', ageRanges: ['1-2'] },
  { id: 'first-words', nameKey: 'learning.firstWords', descKey: 'learning.firstWordsDesc', ageKey: 'learning.firstWordsAge', icon: 'star-outline', color: '#EC4899', gameType: 'spelling', ageRanges: ['1-2'] },
  { id: 'colour-spelling', nameKey: 'learning.colourSpelling', descKey: 'learning.colourSpellingDesc', ageKey: 'learning.colourSpellingAge', icon: 'color-palette-outline', color: '#EF4444', gameType: 'spelling', ageRanges: ['1-2'] },
  { id: 'shape-names', nameKey: 'learning.shapeNames', descKey: 'learning.shapeNamesDesc', ageKey: 'learning.shapeNamesAge', icon: 'shapes-outline', color: '#06B6D4', gameType: 'spelling', ageRanges: ['1-2'] },
  { id: 'my-name', nameKey: 'learning.myName', descKey: 'learning.myNameDesc', ageKey: 'learning.myNameAge', icon: 'happy-outline', color: '#A855F7', gameType: 'spelling', ageRanges: ['1-2'] },
  // Ages 2-4 (5 activities — first 3 free, last 2 locked)
  { id: 'wombat-spelling', nameKey: 'learning.wombatSpelling', descKey: 'learning.wombatSpellingDesc', ageKey: 'learning.wombatSpellingAge', icon: 'paw-outline', color: '#8B5CF6', gameType: 'spelling', ageRanges: ['2-4'] },
  { id: 'animal-spelling', nameKey: 'learning.animalSpelling', descKey: 'learning.animalSpellingDesc', ageKey: 'learning.animalSpellingAge', icon: 'bug-outline', color: '#10B981', gameType: 'spelling', ageRanges: ['2-4'] },
  { id: 'food-spelling', nameKey: 'learning.foodSpelling', descKey: 'learning.foodSpellingDesc', ageKey: 'learning.foodSpellingAge', icon: 'nutrition-outline', color: '#EF4444', gameType: 'spelling', ageRanges: ['2-4'] },
  { id: 'nature-words', nameKey: 'learning.natureWords', descKey: 'learning.natureWordsDesc', ageKey: 'learning.natureWordsAge', icon: 'leaf-outline', color: '#06B6D4', gameType: 'spelling', ageRanges: ['2-4'] },
  { id: 'garden-words', nameKey: 'learning.gardenWords', descKey: 'learning.gardenWordsDesc', ageKey: 'learning.gardenWordsAge', icon: 'flower-outline', color: '#F59E0B', gameType: 'spelling', ageRanges: ['2-4'] },
  // Ages 4+ (5 activities — first 3 free, last 2 locked)
  { id: 'word-builder', nameKey: 'learning.wordBuilder', descKey: 'learning.wordBuilderDesc', ageKey: 'learning.wordBuilderAge', icon: 'extension-puzzle-outline', color: '#14B8A6', gameType: 'spelling', ageRanges: ['4+'] },
  { id: 'sentence-speller', nameKey: 'learning.sentenceSpeller', descKey: 'learning.sentenceSpellerDesc', ageKey: 'learning.sentenceSpellerAge', icon: 'create-outline', color: '#6366F1', gameType: 'spelling', ageRanges: ['4+'] },
  { id: 'tricky-words', nameKey: 'learning.trickyWords', descKey: 'learning.trickyWordsDesc', ageKey: 'learning.trickyWordsAge', icon: 'flag-outline', color: '#F97316', gameType: 'spelling', ageRanges: ['4+'] },

  { id: 'story-spelling', nameKey: 'learning.storySpelling', descKey: 'learning.storySpellingDesc', ageKey: 'learning.storySpellingAge', icon: 'book-outline', color: '#8B5CF6', gameType: 'spelling', ageRanges: ['4+'] },
];

export const NUMBERS_ACTIVITIES: LearningActivity[] = [
  // Ages 1-2 (5 activities — first 3 free, last 2 locked)
  { id: 'counting-fun', nameKey: 'learning.countingFun', descKey: 'learning.countingFunDesc', ageKey: 'learning.countingFunAge', icon: 'calculator-outline', color: '#F59E0B', gameType: 'spelling', ageRanges: ['1-2'] },
  { id: 'number-friends', nameKey: 'learning.numberFriends', descKey: 'learning.numberFriendsDesc', ageKey: 'learning.numberFriendsAge', icon: 'heart-outline', color: '#EC4899', gameType: 'spelling', ageRanges: ['1-2'] },
  { id: 'colour-counting', nameKey: 'learning.colourCounting', descKey: 'learning.colourCountingDesc', ageKey: 'learning.colourCountingAge', icon: 'color-palette-outline', color: '#EF4444', gameType: 'spelling', ageRanges: ['1-2'] },
  { id: 'shape-counting', nameKey: 'learning.shapeCounting', descKey: 'learning.shapeCountingDesc', ageKey: 'learning.shapeCountingAge', icon: 'shapes-outline', color: '#06B6D4', gameType: 'spelling', ageRanges: ['1-2'] },
  { id: 'one-two-three', nameKey: 'learning.oneTwoThree', descKey: 'learning.oneTwoThreeDesc', ageKey: 'learning.oneTwoThreeAge', icon: 'balloon-outline', color: '#A855F7', gameType: 'spelling', ageRanges: ['1-2'] },
  // Ages 2-4 (5 activities — first 3 free, last 2 locked)
  { id: 'wombat-word-placing', nameKey: 'learning.wombatWordPlacing', descKey: 'learning.wombatWordPlacingDesc', ageKey: 'learning.wombatWordPlacingAge', icon: 'paw-outline', color: '#6366F1', gameType: 'spelling', ageRanges: ['2-4'] },
  { id: 'animal-counting', nameKey: 'learning.animalCounting', descKey: 'learning.animalCountingDesc', ageKey: 'learning.animalCountingAge', icon: 'bug-outline', color: '#14B8A6', gameType: 'spelling', ageRanges: ['2-4'] },
  { id: 'fruit-counting', nameKey: 'learning.fruitCounting', descKey: 'learning.fruitCountingDesc', ageKey: 'learning.fruitCountingAge', icon: 'nutrition-outline', color: '#EF4444', gameType: 'spelling', ageRanges: ['2-4'] },
  { id: 'toy-counting', nameKey: 'learning.toyCounting', descKey: 'learning.toyCountingDesc', ageKey: 'learning.toyCountingAge', icon: 'cube-outline', color: '#F59E0B', gameType: 'spelling', ageRanges: ['2-4'] },
  { id: 'garden-counting', nameKey: 'learning.gardenCounting', descKey: 'learning.gardenCountingDesc', ageKey: 'learning.gardenCountingAge', icon: 'flower-outline', color: '#10B981', gameType: 'spelling', ageRanges: ['2-4'] },
  // Ages 4+ (5 activities — first 3 free, last 2 locked)
  { id: 'number-puzzles', nameKey: 'learning.numberPuzzles', descKey: 'learning.numberPuzzlesDesc', ageKey: 'learning.numberPuzzlesAge', icon: 'grid-outline', color: '#14B8A6', gameType: 'spelling', ageRanges: ['4+'] },
  { id: 'adding-fun', nameKey: 'learning.addingFun', descKey: 'learning.addingFunDesc', ageKey: 'learning.addingFunAge', icon: 'add-circle-outline', color: '#6366F1', gameType: 'spelling', ageRanges: ['4+'] },
  { id: 'number-stories', nameKey: 'learning.numberStories', descKey: 'learning.numberStoriesDesc', ageKey: 'learning.numberStoriesAge', icon: 'book-outline', color: '#F97316', gameType: 'spelling', ageRanges: ['4+'] },
  { id: 'number-patterns', nameKey: 'learning.numberPatterns', descKey: 'learning.numberPatternsDesc', ageKey: 'learning.numberPatternsAge', icon: 'sparkles-outline', color: '#EC4899', gameType: 'spelling', ageRanges: ['4+'] },
  { id: 'subtraction-fun', nameKey: 'learning.subtractionFun', descKey: 'learning.subtractionFunDesc', ageKey: 'learning.subtractionFunAge', icon: 'remove-circle-outline', color: '#8B5CF6', gameType: 'spelling', ageRanges: ['4+'] },
];

export const FEELINGS_ACTIVITIES: LearningActivity[] = [
  // Ages 1-2 (5 activities — first 3 free, last 2 locked)
  { id: 'happy-faces', nameKey: 'learning.happyFaces', descKey: 'learning.happyFacesDesc', ageKey: 'learning.happyFacesAge', icon: 'happy-outline', color: '#F59E0B', gameType: 'story', storyId: 'wombat-spelling', ageRanges: ['1-2'] },
  { id: 'feeling-colours', nameKey: 'learning.feelingColours', descKey: 'learning.feelingColoursDesc', ageKey: 'learning.feelingColoursAge', icon: 'color-palette-outline', color: '#EC4899', gameType: 'story', storyId: 'wombat-spelling', ageRanges: ['1-2'] },
  { id: 'mood-music', nameKey: 'learning.moodMusic', descKey: 'learning.moodMusicDesc', ageKey: 'learning.moodMusicAge', icon: 'musical-notes-outline', color: '#EF4444', gameType: 'story', storyId: 'wombat-spelling', ageRanges: ['1-2'] },
  { id: 'animal-feelings', nameKey: 'learning.animalFeelings', descKey: 'learning.animalFeelingsDesc', ageKey: 'learning.animalFeelingsAge', icon: 'paw-outline', color: '#06B6D4', gameType: 'story', storyId: 'wombat-spelling', ageRanges: ['1-2'] },
  { id: 'my-feelings', nameKey: 'learning.myFeelings', descKey: 'learning.myFeelingsDesc', ageKey: 'learning.myFeelingsAge', icon: 'heart-outline', color: '#A855F7', gameType: 'story', storyId: 'wombat-spelling', ageRanges: ['1-2'] },
  // Ages 2-4 (5 activities — first 3 free, last 2 locked)
  { id: 'emotion-faces', nameKey: 'learning.emotionFaces', descKey: 'learning.emotionFacesDesc', ageKey: 'learning.emotionFacesAge', icon: 'heart-circle-outline', color: '#8B5CF6', gameType: 'story', storyId: 'wombat-spelling', ageRanges: ['2-4'] },
  { id: 'calm-breathing', nameKey: 'learning.calmBreathing', descKey: 'learning.calmBreathingDesc', ageKey: 'learning.calmBreathingAge', icon: 'cloud-outline', color: '#10B981', gameType: 'story', storyId: 'wombat-spelling', ageRanges: ['2-4'] },
  { id: 'kindness-quest', nameKey: 'learning.kindnessQuest', descKey: 'learning.kindnessQuestDesc', ageKey: 'learning.kindnessQuestAge', icon: 'gift-outline', color: '#EF4444', gameType: 'story', storyId: 'wombat-spelling', ageRanges: ['2-4'] },
  { id: 'friendship-stories', nameKey: 'learning.friendshipStories', descKey: 'learning.friendshipStoriesDesc', ageKey: 'learning.friendshipStoriesAge', icon: 'people-outline', color: '#06B6D4', gameType: 'story', storyId: 'wombat-spelling', ageRanges: ['2-4'] },
  { id: 'worry-monster', nameKey: 'learning.worryMonster', descKey: 'learning.worryMonsterDesc', ageKey: 'learning.worryMonsterAge', icon: 'shield-outline', color: '#F59E0B', gameType: 'story', storyId: 'wombat-spelling', ageRanges: ['2-4'] },
  // Ages 4+ (5 activities — first 3 free, last 2 locked)
  { id: 'empathy-explorer', nameKey: 'learning.empathyExplorer', descKey: 'learning.empathyExplorerDesc', ageKey: 'learning.empathyExplorerAge', icon: 'compass-outline', color: '#14B8A6', gameType: 'story', storyId: 'wombat-spelling', ageRanges: ['4+'] },
  { id: 'feeling-journal', nameKey: 'learning.feelingJournal', descKey: 'learning.feelingJournalDesc', ageKey: 'learning.feelingJournalAge', icon: 'journal-outline', color: '#6366F1', gameType: 'story', storyId: 'wombat-spelling', ageRanges: ['4+'] },
  { id: 'conflict-solver', nameKey: 'learning.conflictSolver', descKey: 'learning.conflictSolverDesc', ageKey: 'learning.conflictSolverAge', icon: 'hand-left-outline', color: '#F97316', gameType: 'story', storyId: 'wombat-spelling', ageRanges: ['4+'] },
  { id: 'gratitude-garden', nameKey: 'learning.gratitudeGarden', descKey: 'learning.gratitudeGardenDesc', ageKey: 'learning.gratitudeGardenAge', icon: 'rose-outline', color: '#EC4899', gameType: 'story', storyId: 'wombat-spelling', ageRanges: ['4+'] },
  { id: 'self-esteem-stars', nameKey: 'learning.selfEsteemStars', descKey: 'learning.selfEsteemStarsDesc', ageKey: 'learning.selfEsteemStarsAge', icon: 'star-outline', color: '#8B5CF6', gameType: 'story', storyId: 'wombat-spelling', ageRanges: ['4+'] },
];

/** Which set a mode draws on. */
export const ACTIVITIES_BY_MODE: Record<LearningMode, LearningActivity[]> = {
  spelling: SPELLING_ACTIVITIES,
  numbers: NUMBERS_ACTIVITIES,
  feelings: FEELINGS_ACTIVITIES,
};

/**
 * Every activity the app carries, in mode order.
 *
 * The saved shelf has to find an activity by id without knowing which mode it
 * came from -- an id is all the store keeps.
 */
export const ALL_LEARNING_ACTIVITIES: LearningActivity[] = [
  ...SPELLING_ACTIVITIES,
  ...NUMBERS_ACTIVITIES,
  ...FEELINGS_ACTIVITIES,
];
