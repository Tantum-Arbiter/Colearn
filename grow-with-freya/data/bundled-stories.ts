import { Story } from '@/types/story';

/**
 * Bundled stories - included in the app bundle
 * These stories work offline and don't require CMS sync
 *
 * Currently: 1 story (Snuggle Little Wombat)
 * Additional stories are loaded from CMS via delta-sync.
 */
export const BUNDLED_STORIES: Story[] = [
  {
    id: 'snuggle-little-wombat',
    title: 'Snuggle Little Wombat',
    category: 'bedtime',
    tag: '🌙 Bedtime',
    emoji: '🐨',
    coverImage: '', // Placeholder - add actual asset path
    isAvailable: true,
    ageRange: '2-5',
    duration: 8,
    description: 'A gentle bedtime story about a little wombat getting ready for sleep with cozy snuggles and sweet dreams.',
    tags: ['adventure', 'bedtime', 'calming', 'animals'], // Wombat is an adventure book
    pages: [
    {
      id: 'snuggle-little-wombat-1',
      pageNumber: 1,
      text: 'Page 1 text goes here...'
    },
    {
      id: 'snuggle-little-wombat-2',
      pageNumber: 2,
      text: 'Page 2 text goes here...',
      interactionType: 'music_challenge',
      musicChallenge: {
        enabled: true,
        instrumentId: 'flute',
        promptText: 'Play a gentle lullaby to help Wombat drift off to sleep!',
        mode: 'guided',
        songId: 'dreamtime_lullaby',
        successStateId: 'wombat_dreaming',
        autoPlaySuccessSong: true,
        allowSkip: true,
        micRequired: true,
        fallbackAllowed: true,
        hintLevel: 'standard',
      },
    },
    {
      id: 'snuggle-little-wombat-3',
      pageNumber: 3,
      text: 'Page 3 text goes here...'
    },
    {
      id: 'snuggle-little-wombat-4',
      pageNumber: 4,
      text: 'Page 4 text goes here...',
      interactionType: 'music_challenge',
      musicChallenge: {
        enabled: true,
        instrumentId: 'flute',
        promptText: 'Play a cozy tune to help Wombat snuggle into the burrow!',
        mode: 'guided',
        songId: 'au_clair_lune',
        successStateId: 'wombat_snuggled',
        autoPlaySuccessSong: true,
        allowSkip: true,
        micRequired: true,
        fallbackAllowed: true,
        hintLevel: 'standard',
      },
    },
    {
      id: 'snuggle-little-wombat-5',
      pageNumber: 5,
      text: 'Page 5 text goes here...'
    },
    {
      id: 'snuggle-little-wombat-6',
      pageNumber: 6,
      text: 'Page 6 text goes here...'
    },
    {
      id: 'snuggle-little-wombat-7',
      pageNumber: 7,
      text: 'Page 7 text goes here...'
    },
    {
      id: 'snuggle-little-wombat-8',
      pageNumber: 8,
      text: 'Page 8 text goes here...'
    }
    ]
  }
];


/**
 * Get bundled stories by category
 */
export function getBundledStoriesByCategory(category: string): Story[] {
  return BUNDLED_STORIES.filter(story => story.category === category);
}

/**
 * Get a bundled story by ID
 */
export function getBundledStoryById(storyId: string): Story | undefined {
  return BUNDLED_STORIES.find(story => story.id === storyId);
}

/**
 * Check if a story is bundled (vs CMS-only)
 */
export function isBundledStory(storyId: string): boolean {
  return BUNDLED_STORIES.some(story => story.id === storyId);
}
