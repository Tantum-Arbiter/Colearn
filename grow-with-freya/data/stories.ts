import { Story } from '@/types/story';

export const MOCK_STORIES: Story[] = [
  {
    id: '1',
    title: 'The Sleepy Forest',
    category: 'bedtime',
    tag: '🌙 Bedtime',
    emoji: '🌙',
    isAvailable: true,
    ageRange: '2-5',
    duration: 8,
    description: 'A gentle tale about woodland creatures getting ready for sleep.'
  },
  {
    id: '2',
    title: 'Pirate Adventure',
    category: 'adventure',
    tag: '🗺️ Adventure',
    emoji: '🗺️',
    isAvailable: true,
    ageRange: '3-6',
    duration: 12,
    description: 'Join Captain Freya on a treasure hunt across the seven seas!'
  },
  {
    id: '3',
    title: 'Turtle\'s Garden',
    category: 'nature',
    tag: '🐢 Nature',
    emoji: '🐢',
    isAvailable: true,
    ageRange: '2-4',
    duration: 10,
    description: 'Learn about plants and friendship with Tommy the turtle.'
  },
  {
    id: '4',
    title: 'Best Friends Forever',
    category: 'friendship',
    tag: '🤝 Friendship',
    emoji: '🤝',
    isAvailable: true,
    ageRange: '3-5',
    duration: 9,
    description: 'A heartwarming story about making new friends at the playground.'
  },
  {
    id: '5',
    title: 'Counting Stars',
    category: 'learning',
    tag: '📚 Learning',
    emoji: '📚',
    isAvailable: true,
    ageRange: '3-6',
    duration: 7,
    description: 'Learn to count from 1 to 10 with Luna the astronaut.'
  },
  {
    id: '6',
    title: 'Magic Rainbow',
    category: 'fantasy',
    tag: '✨ Fantasy',
    emoji: '✨',
    isAvailable: true,
    ageRange: '2-5',
    duration: 11,
    description: 'Follow the magical rainbow to discover a land of wonder.'
  }
];

// Generate placeholder stories to fill up to 10 total
export const PLACEHOLDER_STORIES: Story[] = Array.from({ length: 4 }, (_, index) => ({
  id: `placeholder-${index + 1}`,
  title: 'Coming Soon',
  category: 'adventure' as const,
  tag: '',
  emoji: '',
  isAvailable: false,
  description: 'More amazing stories are on their way!'
}));

export const ALL_STORIES = [...MOCK_STORIES, ...PLACEHOLDER_STORIES];

export const getAvailableStories = (): Story[] => {
  return MOCK_STORIES.filter(story => story.isAvailable);
};

export const getRandomStory = (): Story | null => {
  const availableStories = getAvailableStories();
  if (availableStories.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * availableStories.length);
  return availableStories[randomIndex];
};
