import { Story, StoryPage } from '@/types/story';

// Sample story pages for "The Sleepy Forest"
const sleepyForestPages: StoryPage[] = [
  {
    id: 'sf-page-1',
    pageNumber: 1,
    text: 'In a peaceful forest, the sun was setting behind the tall trees.'
  },
  {
    id: 'sf-page-2',
    pageNumber: 2,
    text: 'The wise old owl hooted softly from his tree, "It\'s time to rest, my forest friends."'
  },
  {
    id: 'sf-page-3',
    pageNumber: 3,
    text: 'The little rabbits hopped to their cozy burrow, yawning as they snuggled together.'
  },
  {
    id: 'sf-page-4',
    pageNumber: 4,
    text: 'The squirrels gathered their acorns and curled up in their warm nest high in the oak tree.'
  },
  {
    id: 'sf-page-5',
    pageNumber: 5,
    text: 'The deer family found a soft patch of moss and lay down together under the stars.'
  },
  {
    id: 'sf-page-6',
    pageNumber: 6,
    text: 'The wise owl spread his wings wide and settled into his favorite branch.'
  },
  {
    id: 'sf-page-7',
    pageNumber: 7,
    text: 'A gentle breeze rustled through the leaves, singing a lullaby to all the forest creatures.'
  },
  {
    id: 'sf-page-8',
    pageNumber: 8,
    text: 'And all the woodland creatures drifted off to sleep, dreaming sweet dreams until morning. The End.'
  }
];

export const MOCK_STORIES: Story[] = [
  // Add snuggle-little-wombat story first
  {
    id: 'snuggle-little-wombat',
    title: 'Snuggle Little Wombat',
    category: 'bedtime',
    tag: '🌙 Bedtime',
    emoji: '🐨',
    coverImage: require('../assets/stories/snuggle-little-wombat/cover/thumbnail.webp'),
    isAvailable: true,
    ageRange: '2-5',
    duration: 9, // 8 story pages + 1 cover page
    description: 'A gentle bedtime story about a little wombat getting ready for sleep with cozy snuggles and sweet dreams.',
    pages: [
      {
        id: 'snuggle-little-wombat-cover',
        pageNumber: 0,
        backgroundImage: require('../assets/stories/snuggle-little-wombat/cover/cover-large.webp'),
        text: 'Snuggle Little Wombat\n\nA gentle bedtime story'
      },
      {
        id: 'snuggle-little-wombat-1',
        pageNumber: 1,
        backgroundImage: require('../assets/stories/snuggle-little-wombat/page-1/background.webp'),
        text: 'Wombat yawned, the sky turnt blue, time to rest, the stars peek through.'
      },
      {
        id: 'snuggle-little-wombat-2',
        pageNumber: 2,
        backgroundImage: require('../assets/stories/snuggle-little-wombat/page-2/background.webp'),
        text: 'Wombat stared, the night felt new, time to dream, like we must do.'
      },
      {
        id: 'snuggle-little-wombat-3',
        pageNumber: 3,
        backgroundImage: require('../assets/stories/snuggle-little-wombat/page-3/background.webp'),
        text: 'Wombat walked, the stars shined through, looking for a nest, that\'s warm and new.'
      },
      {
        id: 'snuggle-little-wombat-4',
        pageNumber: 4,
        backgroundImage: require('../assets/stories/snuggle-little-wombat/page-4/background.webp'),
        text: 'Wombat smiled, a burrow in view, time to rest, and dream things new.'
      },
      {
        id: 'snuggle-little-wombat-5',
        pageNumber: 5,
        backgroundImage: require('../assets/stories/snuggle-little-wombat/page-5/background.webp'),
        text: 'Wombat stopped, where soft roots grew, inside the burrow, the quietness grew.'
      },
      {
        id: 'snuggle-little-wombat-6',
        pageNumber: 6,
        backgroundImage: require('../assets/stories/snuggle-little-wombat/page-6/background.webp'),
        text: 'Wombat nests, the night time grew, sleeping in a bed, where dreams come true.'
      },
      {
        id: 'snuggle-little-wombat-7',
        pageNumber: 7,
        backgroundImage: require('../assets/stories/snuggle-little-wombat/page-7/background.webp'),
        text: 'Wombat dreamt, with gentle cheer, hugging berries he held so dear.'
      },
      {
        id: 'snuggle-little-wombat-8',
        pageNumber: 8,
        backgroundImage: require('../assets/stories/snuggle-little-wombat/page-8/background.webp'),
        text: 'Wombat sleeps, in quiet delight, your turn - turn off the light... goodnight!'
      }
    ]
  } as Story,
  {
    id: '1',
    title: 'The Sleepy Forest',
    category: 'bedtime',
    tag: '🌙 Bedtime',
    emoji: '🌙',
    coverImage: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop&crop=center',
    isAvailable: true,
    ageRange: '2-5',
    duration: 8,
    description: 'A gentle tale about woodland creatures getting ready for sleep.',
    pages: sleepyForestPages
  },
  {
    id: '2',
    title: 'Pirate Adventure',
    category: 'adventure',
    tag: '🗺️ Adventure',
    emoji: '🗺️',
    coverImage: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop&crop=center',
    isAvailable: true,
    ageRange: '3-6',
    duration: 12,
    description: 'Join Captain Freya on a treasure hunt across the seven seas!',
    pages: [
      {
        id: 'pa-page-1',
        pageNumber: 1,
        text: 'Captain Freya stood on the deck of her ship, looking at an old treasure map.'
      },
      {
        id: 'pa-page-2',
        pageNumber: 2,
        text: '"Ahoy, crew!" she called. "We\'re going on the greatest treasure hunt ever!"'
      },
      {
        id: 'pa-page-3',
        pageNumber: 3,
        text: 'They sailed across the sparkling blue ocean, following the map\'s mysterious clues.'
      },
      {
        id: 'pa-page-4',
        pageNumber: 4,
        text: 'On a tropical island, they found a cave hidden behind a waterfall.'
      },
      {
        id: 'pa-page-5',
        pageNumber: 5,
        text: 'Inside the cave, golden coins and precious gems sparkled in the torchlight.'
      },
      {
        id: 'pa-page-6',
        pageNumber: 6,
        text: '"We did it!" cheered Captain Freya. "The greatest treasure of all is our friendship!"'
      },
      {
        id: 'pa-page-7',
        pageNumber: 7,
        text: 'They shared the treasure with everyone in their village, making everyone happy.'
      },
      {
        id: 'pa-page-8',
        pageNumber: 8,
        text: 'And Captain Freya\'s crew sailed home under the sunset, ready for their next adventure. The End.'
      }
    ]
  },
  {
    id: '3',
    title: 'The Magical Garden',
    category: 'nature',
    tag: '🐢 Nature',
    emoji: '🌸',
    coverImage: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop&crop=center',
    isAvailable: true,
    ageRange: '2-4',
    duration: 6,
    description: 'Discover the wonders of nature in a magical garden.',
    pages: [
      {
        id: 'mg-page-1',
        pageNumber: 1,
        text: 'In a secret garden, flowers danced in the gentle breeze.'
      },
      {
        id: 'mg-page-2',
        pageNumber: 2,
        text: 'Butterflies painted rainbows as they fluttered from bloom to bloom.'
      },
      {
        id: 'mg-page-3',
        pageNumber: 3,
        text: 'A wise old tree whispered stories of seasons past.'
      },
      {
        id: 'mg-page-4',
        pageNumber: 4,
        text: 'Little seeds dreamed of growing tall and strong.'
      },
      {
        id: 'mg-page-5',
        pageNumber: 5,
        text: 'The garden taught everyone that with love and care, beautiful things grow.'
      }
    ]
  },
  {
    id: '4',
    title: 'Best Friends Forever',
    category: 'friendship',
    tag: '🤝 Friendship',
    emoji: '🤝',
    coverImage: 'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=400&h=300&fit=crop&crop=center',
    isAvailable: true,
    ageRange: '3-5',
    duration: 9,
    description: 'A heartwarming story about making new friends.',
    pages: [
      {
        id: 'bff-page-1',
        pageNumber: 1,
        text: 'Maya was nervous about her first day at the new playground.'
      },
      {
        id: 'bff-page-2',
        pageNumber: 2,
        text: 'She sat on a bench, watching other children play together happily.'
      },
      {
        id: 'bff-page-3',
        pageNumber: 3,
        text: 'A friendly boy named Sam noticed Maya sitting alone.'
      },
      {
        id: 'bff-page-4',
        pageNumber: 4,
        text: '"Would you like to play with us?" Sam asked with a warm smile.'
      },
      {
        id: 'bff-page-5',
        pageNumber: 5,
        text: 'Maya smiled back and joined the group, feeling happy and included.'
      }
    ]
  },
  {
    id: '5',
    title: 'Counting with Dragons',
    category: 'learning',
    tag: '📚 Learning',
    emoji: '🐉',
    coverImage: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center',
    isAvailable: true,
    ageRange: '3-6',
    duration: 7,
    description: 'Learn to count with friendly dragons!',
    pages: [
      {
        id: 'cd-page-1',
        pageNumber: 1,
        text: 'One little dragon loved to count everything he saw.'
      },
      {
        id: 'cd-page-2',
        pageNumber: 2,
        text: 'Two butterflies danced around his head.'
      },
      {
        id: 'cd-page-3',
        pageNumber: 3,
        text: 'Three birds sang beautiful songs in the trees.'
      },
      {
        id: 'cd-page-4',
        pageNumber: 4,
        text: 'Four flowers bloomed in the meadow.'
      },
      {
        id: 'cd-page-5',
        pageNumber: 5,
        text: 'Five friends came to play, and they all counted together!'
      }
    ]
  },
  {
    id: '6',
    title: 'The Unicorn\'s Dream',
    category: 'fantasy',
    tag: 'Fantasy',
    emoji: '🦄',
    coverImage: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center',
    isAvailable: true,
    ageRange: '4-7',
    duration: 10,
    description: 'A magical adventure in a land of dreams and wonder.',
    pages: [
      {
        id: 'ud-page-1',
        pageNumber: 1,
        text: 'In a land where dreams come true, lived a gentle unicorn named Luna.'
      },
      {
        id: 'ud-page-2',
        pageNumber: 2,
        text: 'Luna\'s horn sparkled with stardust and her mane shimmered like moonbeams.'
      },
      {
        id: 'ud-page-3',
        pageNumber: 3,
        text: 'Every night, she would grant wishes to children who believed in magic.'
      },
      {
        id: 'ud-page-4',
        pageNumber: 4,
        text: 'One special night, Luna decided to visit the dream world herself.'
      },
      {
        id: 'ud-page-5',
        pageNumber: 5,
        text: 'She discovered that the most magical dreams are the ones we share with others.'
      }
    ]
  }
];

// Additional stories for better genre representation
const ADDITIONAL_STORIES: Story[] = [
  {
    id: '7',
    title: 'Ocean Adventure',
    category: 'adventure',
    tag: '🗺️ Adventure',
    emoji: '🌊',
    coverImage: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=300&fit=crop&crop=center',
    isAvailable: true,
    ageRange: '3-6',
    duration: 8,
    description: 'Dive deep into the ocean and meet amazing sea creatures.',
    pages: []
  },
  {
    id: '8',
    title: 'Forest Friends',
    category: 'nature',
    tag: '🐢 Nature',
    emoji: '🦌',
    coverImage: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop&crop=center',
    isAvailable: true,
    ageRange: '2-4',
    duration: 6,
    description: 'Meet the friendly animals that live in the forest.',
    pages: []
  },
  {
    id: '9',
    title: 'Sharing is Caring',
    category: 'friendship',
    tag: '🤝 Friendship',
    emoji: '🎁',
    coverImage: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop&crop=center',
    isAvailable: true,
    ageRange: '3-5',
    duration: 7,
    description: 'Learn about the joy of sharing with friends.',
    pages: []
  },
  {
    id: '10',
    title: 'ABC Safari',
    category: 'learning',
    tag: '📚 Learning',
    emoji: '🦁',
    coverImage: 'https://images.unsplash.com/photo-1549366021-9f761d040a94?w=400&h=300&fit=crop&crop=center',
    isAvailable: true,
    ageRange: '3-6',
    duration: 10,
    description: 'Learn the alphabet with amazing animals from around the world.',
    pages: []
  },
  {
    id: '11',
    title: 'The Magic Castle',
    category: 'fantasy',
    tag: 'Fantasy',
    emoji: '🏰',
    coverImage: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center',
    isAvailable: true,
    ageRange: '4-7',
    duration: 12,
    description: 'Explore a magical castle filled with wonder and surprises.',
    pages: []
  },
  {
    id: '12',
    title: 'Goodnight Moon',
    category: 'bedtime',
    tag: '🌙 Bedtime',
    emoji: '🌙',
    coverImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&crop=center',
    isAvailable: true,
    ageRange: '1-4',
    duration: 5,
    description: 'A peaceful bedtime story to help you drift off to sleep.',
    pages: []
  }
];

// Create placeholder stories for empty slots
export const PLACEHOLDER_STORIES: Story[] = Array.from({ length: 4 }, (_, index) => ({
  id: `placeholder-${index + 1}`,
  title: 'Coming Soon',
  category: 'adventure',
  tag: '🗺️ Adventure',
  emoji: '📚',
  coverImage: '',
  isAvailable: false,
  ageRange: '2-5',
  duration: 8,
  description: 'A new story is coming soon!',
  pages: []
}));

// Combine all stories
export const ALL_STORIES: Story[] = [...MOCK_STORIES, ...ADDITIONAL_STORIES, ...PLACEHOLDER_STORIES];

// Helper functions
export function getAvailableStories(): Story[] {
  return ALL_STORIES.filter(story => story.isAvailable);
}

export function getRandomStory(): Story {
  const availableStories = getAvailableStories();
  const randomIndex = Math.floor(Math.random() * availableStories.length);
  return availableStories[randomIndex];
}

export function getStoriesByGenre(): Record<string, Story[]> {
  const genreMap: Record<string, Story[]> = {};

  ALL_STORIES.forEach(story => {
    if (!genreMap[story.category]) {
      genreMap[story.category] = [];
    }
    genreMap[story.category].push(story);
  });

  return genreMap;
}

export function getGenresWithStories(): string[] {
  const genreMap = getStoriesByGenre();
  return Object.keys(genreMap).filter(genre => genreMap[genre].length > 0);
}
