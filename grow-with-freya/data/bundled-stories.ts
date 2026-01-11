import { Story } from '@/types/story';

/**
 * Bundled stories - included in the app bundle
 * These stories work offline and don't require CMS sync
 * 
 * Total: 18 stories (3 per genre × 6 genres)
 * - Bedtime: 3 stories
 * - Adventure: 3 stories
 * - Nature: 3 stories
 * - Friendship: 3 stories
 * - Learning: 3 stories
 * - Fantasy: 3 stories
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
      text: 'Page 2 text goes here...'
    },
    {
      id: 'snuggle-little-wombat-3',
      pageNumber: 3,
      text: 'Page 3 text goes here...'
    },
    {
      id: 'snuggle-little-wombat-4',
      pageNumber: 4,
      text: 'Page 4 text goes here...'
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
  },
  {
    id: 'sleepy-forest',
    title: 'The Sleepy Forest',
    category: 'bedtime',
    tag: '🌙 Bedtime',
    emoji: '🦉',
    coverImage: '', // Placeholder - add actual asset path
    isAvailable: true,
    ageRange: '2-5',
    duration: 8,
    description: 'In a peaceful forest, all the woodland creatures settle down for a cozy night\'s sleep.',
    pages: [
    {
      id: 'sleepy-forest-1',
      pageNumber: 1,
      text: 'Page 1 text goes here...'
    },
    {
      id: 'sleepy-forest-2',
      pageNumber: 2,
      text: 'Page 2 text goes here...'
    },
    {
      id: 'sleepy-forest-3',
      pageNumber: 3,
      text: 'Page 3 text goes here...'
    },
    {
      id: 'sleepy-forest-4',
      pageNumber: 4,
      text: 'Page 4 text goes here...'
    },
    {
      id: 'sleepy-forest-5',
      pageNumber: 5,
      text: 'Page 5 text goes here...'
    },
    {
      id: 'sleepy-forest-6',
      pageNumber: 6,
      text: 'Page 6 text goes here...'
    },
    {
      id: 'sleepy-forest-7',
      pageNumber: 7,
      text: 'Page 7 text goes here...'
    },
    {
      id: 'sleepy-forest-8',
      pageNumber: 8,
      text: 'Page 8 text goes here...'
    }
    ]
  },
  {
    id: 'moonlight-lullaby',
    title: 'Moonlight Lullaby',
    category: 'bedtime',
    tag: '🌙 Bedtime',
    emoji: '🌙',
    coverImage: '', // Placeholder - add actual asset path
    isAvailable: true,
    ageRange: '2-4',
    duration: 6,
    description: 'The moon sings a gentle lullaby to all the sleepy children around the world.',
    pages: [
    {
      id: 'moonlight-lullaby-1',
      pageNumber: 1,
      text: 'Page 1 text goes here...'
    },
    {
      id: 'moonlight-lullaby-2',
      pageNumber: 2,
      text: 'Page 2 text goes here...'
    },
    {
      id: 'moonlight-lullaby-3',
      pageNumber: 3,
      text: 'Page 3 text goes here...'
    },
    {
      id: 'moonlight-lullaby-4',
      pageNumber: 4,
      text: 'Page 4 text goes here...'
    },
    {
      id: 'moonlight-lullaby-5',
      pageNumber: 5,
      text: 'Page 5 text goes here...'
    },
    {
      id: 'moonlight-lullaby-6',
      pageNumber: 6,
      text: 'Page 6 text goes here...'
    }
    ]
  },
  {
    id: 'treasure-island',
    title: 'Treasure Island Adventure',
    category: 'adventure',
    tag: '🗺️ Adventure',
    emoji: '🏴‍☠️',
    coverImage: '', // Placeholder - add actual asset path
    isAvailable: true,
    ageRange: '3-6',
    duration: 10,
    description: 'Join Captain Pip on an exciting journey to find hidden treasure on a mysterious island.',
    pages: [
    {
      id: 'treasure-island-1',
      pageNumber: 1,
      text: 'Page 1 text goes here...'
    },
    {
      id: 'treasure-island-2',
      pageNumber: 2,
      text: 'Page 2 text goes here...'
    },
    {
      id: 'treasure-island-3',
      pageNumber: 3,
      text: 'Page 3 text goes here...'
    },
    {
      id: 'treasure-island-4',
      pageNumber: 4,
      text: 'Page 4 text goes here...'
    },
    {
      id: 'treasure-island-5',
      pageNumber: 5,
      text: 'Page 5 text goes here...'
    },
    {
      id: 'treasure-island-6',
      pageNumber: 6,
      text: 'Page 6 text goes here...'
    },
    {
      id: 'treasure-island-7',
      pageNumber: 7,
      text: 'Page 7 text goes here...'
    },
    {
      id: 'treasure-island-8',
      pageNumber: 8,
      text: 'Page 8 text goes here...'
    },
    {
      id: 'treasure-island-9',
      pageNumber: 9,
      text: 'Page 9 text goes here...'
    },
    {
      id: 'treasure-island-10',
      pageNumber: 10,
      text: 'Page 10 text goes here...'
    }
    ]
  },
  {
    id: 'mountain-climb',
    title: 'The Great Mountain Climb',
    category: 'adventure',
    tag: '🗺️ Adventure',
    emoji: '⛰️',
    coverImage: '', // Placeholder - add actual asset path
    isAvailable: true,
    ageRange: '3-6',
    duration: 9,
    description: 'Follow brave little goat as she climbs the tallest mountain to see the sunrise.',
    pages: [
    {
      id: 'mountain-climb-1',
      pageNumber: 1,
      text: 'Page 1 text goes here...'
    },
    {
      id: 'mountain-climb-2',
      pageNumber: 2,
      text: 'Page 2 text goes here...'
    },
    {
      id: 'mountain-climb-3',
      pageNumber: 3,
      text: 'Page 3 text goes here...'
    },
    {
      id: 'mountain-climb-4',
      pageNumber: 4,
      text: 'Page 4 text goes here...'
    },
    {
      id: 'mountain-climb-5',
      pageNumber: 5,
      text: 'Page 5 text goes here...'
    },
    {
      id: 'mountain-climb-6',
      pageNumber: 6,
      text: 'Page 6 text goes here...'
    },
    {
      id: 'mountain-climb-7',
      pageNumber: 7,
      text: 'Page 7 text goes here...'
    },
    {
      id: 'mountain-climb-8',
      pageNumber: 8,
      text: 'Page 8 text goes here...'
    },
    {
      id: 'mountain-climb-9',
      pageNumber: 9,
      text: 'Page 9 text goes here...'
    }
    ]
  },
  {
    id: 'jungle-explorer',
    title: 'Jungle Explorer',
    category: 'adventure',
    tag: '🗺️ Adventure',
    emoji: '🦁',
    coverImage: '', // Placeholder - add actual asset path
    isAvailable: true,
    ageRange: '3-6',
    duration: 10,
    description: 'Explore the jungle and meet amazing animals with young explorer Leo.',
    pages: [
    {
      id: 'jungle-explorer-1',
      pageNumber: 1,
      text: 'Page 1 text goes here...'
    },
    {
      id: 'jungle-explorer-2',
      pageNumber: 2,
      text: 'Page 2 text goes here...'
    },
    {
      id: 'jungle-explorer-3',
      pageNumber: 3,
      text: 'Page 3 text goes here...'
    },
    {
      id: 'jungle-explorer-4',
      pageNumber: 4,
      text: 'Page 4 text goes here...'
    },
    {
      id: 'jungle-explorer-5',
      pageNumber: 5,
      text: 'Page 5 text goes here...'
    },
    {
      id: 'jungle-explorer-6',
      pageNumber: 6,
      text: 'Page 6 text goes here...'
    },
    {
      id: 'jungle-explorer-7',
      pageNumber: 7,
      text: 'Page 7 text goes here...'
    },
    {
      id: 'jungle-explorer-8',
      pageNumber: 8,
      text: 'Page 8 text goes here...'
    },
    {
      id: 'jungle-explorer-9',
      pageNumber: 9,
      text: 'Page 9 text goes here...'
    },
    {
      id: 'jungle-explorer-10',
      pageNumber: 10,
      text: 'Page 10 text goes here...'
    }
    ]
  },
  {
    id: 'butterfly-garden',
    title: 'The Butterfly Garden',
    category: 'nature',
    tag: '🐢 Nature',
    emoji: '🦋',
    coverImage: '', // Placeholder - add actual asset path
    isAvailable: true,
    ageRange: '2-5',
    duration: 7,
    description: 'Discover the magical life cycle of butterflies in a beautiful garden.',
    pages: [
    {
      id: 'butterfly-garden-1',
      pageNumber: 1,
      text: 'Page 1 text goes here...'
    },
    {
      id: 'butterfly-garden-2',
      pageNumber: 2,
      text: 'Page 2 text goes here...'
    },
    {
      id: 'butterfly-garden-3',
      pageNumber: 3,
      text: 'Page 3 text goes here...'
    },
    {
      id: 'butterfly-garden-4',
      pageNumber: 4,
      text: 'Page 4 text goes here...'
    },
    {
      id: 'butterfly-garden-5',
      pageNumber: 5,
      text: 'Page 5 text goes here...'
    },
    {
      id: 'butterfly-garden-6',
      pageNumber: 6,
      text: 'Page 6 text goes here...'
    },
    {
      id: 'butterfly-garden-7',
      pageNumber: 7,
      text: 'Page 7 text goes here...'
    }
    ]
  },
  {
    id: 'ocean-friends',
    title: 'Ocean Friends',
    category: 'nature',
    tag: '🐢 Nature',
    emoji: '🐠',
    coverImage: '', // Placeholder - add actual asset path
    isAvailable: true,
    ageRange: '2-5',
    duration: 8,
    description: 'Dive deep into the ocean and meet colorful fish, playful dolphins, and gentle whales.',
    pages: [
    {
      id: 'ocean-friends-1',
      pageNumber: 1,
      text: 'Page 1 text goes here...'
    },
    {
      id: 'ocean-friends-2',
      pageNumber: 2,
      text: 'Page 2 text goes here...'
    },
    {
      id: 'ocean-friends-3',
      pageNumber: 3,
      text: 'Page 3 text goes here...'
    },
    {
      id: 'ocean-friends-4',
      pageNumber: 4,
      text: 'Page 4 text goes here...'
    },
    {
      id: 'ocean-friends-5',
      pageNumber: 5,
      text: 'Page 5 text goes here...'
    },
    {
      id: 'ocean-friends-6',
      pageNumber: 6,
      text: 'Page 6 text goes here...'
    },
    {
      id: 'ocean-friends-7',
      pageNumber: 7,
      text: 'Page 7 text goes here...'
    },
    {
      id: 'ocean-friends-8',
      pageNumber: 8,
      text: 'Page 8 text goes here...'
    }
    ]
  },
  {
    id: 'forest-walk',
    title: 'A Walk in the Forest',
    category: 'nature',
    tag: '🐢 Nature',
    emoji: '🌲',
    coverImage: '', // Placeholder - add actual asset path
    isAvailable: true,
    ageRange: '2-4',
    duration: 7,
    description: 'Take a peaceful walk through the forest and discover its hidden wonders.',
    pages: [
    {
      id: 'forest-walk-1',
      pageNumber: 1,
      text: 'Page 1 text goes here...'
    },
    {
      id: 'forest-walk-2',
      pageNumber: 2,
      text: 'Page 2 text goes here...'
    },
    {
      id: 'forest-walk-3',
      pageNumber: 3,
      text: 'Page 3 text goes here...'
    },
    {
      id: 'forest-walk-4',
      pageNumber: 4,
      text: 'Page 4 text goes here...'
    },
    {
      id: 'forest-walk-5',
      pageNumber: 5,
      text: 'Page 5 text goes here...'
    },
    {
      id: 'forest-walk-6',
      pageNumber: 6,
      text: 'Page 6 text goes here...'
    },
    {
      id: 'forest-walk-7',
      pageNumber: 7,
      text: 'Page 7 text goes here...'
    }
    ]
  },
  {
    id: 'best-friends',
    title: 'Best Friends Forever',
    category: 'friendship',
    tag: '🤝 Friendship',
    emoji: '🐻',
    coverImage: '', // Placeholder - add actual asset path
    isAvailable: true,
    ageRange: '3-5',
    duration: 8,
    description: 'Bear and Bunny learn what it means to be true friends through thick and thin.',
    pages: [
    {
      id: 'best-friends-1',
      pageNumber: 1,
      text: 'Page 1 text goes here...'
    },
    {
      id: 'best-friends-2',
      pageNumber: 2,
      text: 'Page 2 text goes here...'
    },
    {
      id: 'best-friends-3',
      pageNumber: 3,
      text: 'Page 3 text goes here...'
    },
    {
      id: 'best-friends-4',
      pageNumber: 4,
      text: 'Page 4 text goes here...'
    },
    {
      id: 'best-friends-5',
      pageNumber: 5,
      text: 'Page 5 text goes here...'
    },
    {
      id: 'best-friends-6',
      pageNumber: 6,
      text: 'Page 6 text goes here...'
    },
    {
      id: 'best-friends-7',
      pageNumber: 7,
      text: 'Page 7 text goes here...'
    },
    {
      id: 'best-friends-8',
      pageNumber: 8,
      text: 'Page 8 text goes here...'
    }
    ]
  },
  {
    id: 'sharing-is-caring',
    title: 'Sharing is Caring',
    category: 'friendship',
    tag: '🤝 Friendship',
    emoji: '🎁',
    coverImage: '', // Placeholder - add actual asset path
    isAvailable: true,
    ageRange: '2-4',
    duration: 6,
    description: 'Little Fox learns the joy of sharing with friends at the forest picnic.',
    pages: [
    {
      id: 'sharing-is-caring-1',
      pageNumber: 1,
      text: 'Page 1 text goes here...'
    },
    {
      id: 'sharing-is-caring-2',
      pageNumber: 2,
      text: 'Page 2 text goes here...'
    },
    {
      id: 'sharing-is-caring-3',
      pageNumber: 3,
      text: 'Page 3 text goes here...'
    },
    {
      id: 'sharing-is-caring-4',
      pageNumber: 4,
      text: 'Page 4 text goes here...'
    },
    {
      id: 'sharing-is-caring-5',
      pageNumber: 5,
      text: 'Page 5 text goes here...'
    },
    {
      id: 'sharing-is-caring-6',
      pageNumber: 6,
      text: 'Page 6 text goes here...'
    }
    ]
  },
  {
    id: 'new-friend',
    title: 'Making a New Friend',
    category: 'friendship',
    tag: '🤝 Friendship',
    emoji: '🐰',
    coverImage: '', // Placeholder - add actual asset path
    isAvailable: true,
    ageRange: '2-5',
    duration: 7,
    description: 'Shy Rabbit learns how to make friends at the playground.',
    pages: [
    {
      id: 'new-friend-1',
      pageNumber: 1,
      text: 'Page 1 text goes here...'
    },
    {
      id: 'new-friend-2',
      pageNumber: 2,
      text: 'Page 2 text goes here...'
    },
    {
      id: 'new-friend-3',
      pageNumber: 3,
      text: 'Page 3 text goes here...'
    },
    {
      id: 'new-friend-4',
      pageNumber: 4,
      text: 'Page 4 text goes here...'
    },
    {
      id: 'new-friend-5',
      pageNumber: 5,
      text: 'Page 5 text goes here...'
    },
    {
      id: 'new-friend-6',
      pageNumber: 6,
      text: 'Page 6 text goes here...'
    },
    {
      id: 'new-friend-7',
      pageNumber: 7,
      text: 'Page 7 text goes here...'
    }
    ]
  },
  {
    id: 'counting-stars',
    title: 'Counting Stars',
    category: 'learning',
    tag: '📚 Learning',
    emoji: '⭐',
    coverImage: '', // Placeholder - add actual asset path
    isAvailable: true,
    ageRange: '2-4',
    duration: 6,
    description: 'Learn to count from 1 to 10 by counting twinkling stars in the night sky.',
    pages: [
    {
      id: 'counting-stars-1',
      pageNumber: 1,
      text: 'Page 1 text goes here...'
    },
    {
      id: 'counting-stars-2',
      pageNumber: 2,
      text: 'Page 2 text goes here...'
    },
    {
      id: 'counting-stars-3',
      pageNumber: 3,
      text: 'Page 3 text goes here...'
    },
    {
      id: 'counting-stars-4',
      pageNumber: 4,
      text: 'Page 4 text goes here...'
    },
    {
      id: 'counting-stars-5',
      pageNumber: 5,
      text: 'Page 5 text goes here...'
    },
    {
      id: 'counting-stars-6',
      pageNumber: 6,
      text: 'Page 6 text goes here...'
    }
    ]
  },
  {
    id: 'rainbow-colors',
    title: 'Rainbow Colors',
    category: 'learning',
    tag: '📚 Learning',
    emoji: '🌈',
    coverImage: '', // Placeholder - add actual asset path
    isAvailable: true,
    ageRange: '2-4',
    duration: 7,
    description: 'Discover all the colors of the rainbow with playful animals.',
    pages: [
    {
      id: 'rainbow-colors-1',
      pageNumber: 1,
      text: 'Page 1 text goes here...'
    },
    {
      id: 'rainbow-colors-2',
      pageNumber: 2,
      text: 'Page 2 text goes here...'
    },
    {
      id: 'rainbow-colors-3',
      pageNumber: 3,
      text: 'Page 3 text goes here...'
    },
    {
      id: 'rainbow-colors-4',
      pageNumber: 4,
      text: 'Page 4 text goes here...'
    },
    {
      id: 'rainbow-colors-5',
      pageNumber: 5,
      text: 'Page 5 text goes here...'
    },
    {
      id: 'rainbow-colors-6',
      pageNumber: 6,
      text: 'Page 6 text goes here...'
    },
    {
      id: 'rainbow-colors-7',
      pageNumber: 7,
      text: 'Page 7 text goes here...'
    }
    ]
  },
  {
    id: 'abc-adventure',
    title: 'ABC Adventure',
    category: 'learning',
    tag: '📚 Learning',
    emoji: '🔤',
    coverImage: '', // Placeholder - add actual asset path
    isAvailable: true,
    ageRange: '3-5',
    duration: 8,
    description: 'Learn the alphabet with fun animals from A to Z.',
    pages: [
    {
      id: 'abc-adventure-1',
      pageNumber: 1,
      text: 'Page 1 text goes here...'
    },
    {
      id: 'abc-adventure-2',
      pageNumber: 2,
      text: 'Page 2 text goes here...'
    },
    {
      id: 'abc-adventure-3',
      pageNumber: 3,
      text: 'Page 3 text goes here...'
    },
    {
      id: 'abc-adventure-4',
      pageNumber: 4,
      text: 'Page 4 text goes here...'
    },
    {
      id: 'abc-adventure-5',
      pageNumber: 5,
      text: 'Page 5 text goes here...'
    },
    {
      id: 'abc-adventure-6',
      pageNumber: 6,
      text: 'Page 6 text goes here...'
    },
    {
      id: 'abc-adventure-7',
      pageNumber: 7,
      text: 'Page 7 text goes here...'
    },
    {
      id: 'abc-adventure-8',
      pageNumber: 8,
      text: 'Page 8 text goes here...'
    }
    ]
  },
  {
    id: 'fairy-garden',
    title: 'The Fairy Garden',
    category: 'fantasy',
    tag: '✨ Fantasy',
    emoji: '🧚',
    coverImage: '', // Placeholder - add actual asset path
    isAvailable: true,
    ageRange: '3-6',
    duration: 8,
    description: 'Visit a magical garden where fairies dance and flowers sing.',
    pages: [
    {
      id: 'fairy-garden-1',
      pageNumber: 1,
      text: 'Page 1 text goes here...'
    },
    {
      id: 'fairy-garden-2',
      pageNumber: 2,
      text: 'Page 2 text goes here...'
    },
    {
      id: 'fairy-garden-3',
      pageNumber: 3,
      text: 'Page 3 text goes here...'
    },
    {
      id: 'fairy-garden-4',
      pageNumber: 4,
      text: 'Page 4 text goes here...'
    },
    {
      id: 'fairy-garden-5',
      pageNumber: 5,
      text: 'Page 5 text goes here...'
    },
    {
      id: 'fairy-garden-6',
      pageNumber: 6,
      text: 'Page 6 text goes here...'
    },
    {
      id: 'fairy-garden-7',
      pageNumber: 7,
      text: 'Page 7 text goes here...'
    },
    {
      id: 'fairy-garden-8',
      pageNumber: 8,
      text: 'Page 8 text goes here...'
    }
    ]
  },
  {
    id: 'dragon-friend',
    title: 'My Dragon Friend',
    category: 'fantasy',
    tag: '✨ Fantasy',
    emoji: '🐉',
    coverImage: '', // Placeholder - add actual asset path
    isAvailable: true,
    ageRange: '3-6',
    duration: 9,
    description: 'Meet a friendly dragon who loves to play and share adventures.',
    pages: [
    {
      id: 'dragon-friend-1',
      pageNumber: 1,
      text: 'Page 1 text goes here...'
    },
    {
      id: 'dragon-friend-2',
      pageNumber: 2,
      text: 'Page 2 text goes here...'
    },
    {
      id: 'dragon-friend-3',
      pageNumber: 3,
      text: 'Page 3 text goes here...'
    },
    {
      id: 'dragon-friend-4',
      pageNumber: 4,
      text: 'Page 4 text goes here...'
    },
    {
      id: 'dragon-friend-5',
      pageNumber: 5,
      text: 'Page 5 text goes here...'
    },
    {
      id: 'dragon-friend-6',
      pageNumber: 6,
      text: 'Page 6 text goes here...'
    },
    {
      id: 'dragon-friend-7',
      pageNumber: 7,
      text: 'Page 7 text goes here...'
    },
    {
      id: 'dragon-friend-8',
      pageNumber: 8,
      text: 'Page 8 text goes here...'
    },
    {
      id: 'dragon-friend-9',
      pageNumber: 9,
      text: 'Page 9 text goes here...'
    }
    ]
  },
  {
    id: 'unicorn-dreams',
    title: 'Unicorn Dreams',
    category: 'fantasy',
    tag: '✨ Fantasy',
    emoji: '🦄',
    coverImage: '', // Placeholder - add actual asset path
    isAvailable: true,
    ageRange: '3-6',
    duration: 8,
    description: 'Journey to a magical land where unicorns make dreams come true.',
    pages: [
    {
      id: 'unicorn-dreams-1',
      pageNumber: 1,
      text: 'Page 1 text goes here...'
    },
    {
      id: 'unicorn-dreams-2',
      pageNumber: 2,
      text: 'Page 2 text goes here...'
    },
    {
      id: 'unicorn-dreams-3',
      pageNumber: 3,
      text: 'Page 3 text goes here...'
    },
    {
      id: 'unicorn-dreams-4',
      pageNumber: 4,
      text: 'Page 4 text goes here...'
    },
    {
      id: 'unicorn-dreams-5',
      pageNumber: 5,
      text: 'Page 5 text goes here...'
    },
    {
      id: 'unicorn-dreams-6',
      pageNumber: 6,
      text: 'Page 6 text goes here...'
    },
    {
      id: 'unicorn-dreams-7',
      pageNumber: 7,
      text: 'Page 7 text goes here...'
    },
    {
      id: 'unicorn-dreams-8',
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
