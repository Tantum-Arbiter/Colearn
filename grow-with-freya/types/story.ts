export interface Story {
  id: string;
  title: string;
  category: StoryCategory;
  tag: string;
  emoji: string;
  coverImage?: string; // Optional - will use placeholder if not provided
  isAvailable: boolean;
  ageRange?: string;
  duration?: number; // in minutes
  description?: string;
}

export type StoryCategory = 'bedtime' | 'adventure' | 'nature' | 'friendship' | 'learning' | 'fantasy';

export interface StoryTag {
  category: StoryCategory;
  emoji: string;
  label: string;
  color: string;
}

export const STORY_TAGS: Record<StoryCategory, StoryTag> = {
  bedtime: {
    category: 'bedtime',
    emoji: '🌙',
    label: 'Bedtime',
    color: '#96CEB4'
  },
  adventure: {
    category: 'adventure',
    emoji: '🗺️',
    label: 'Adventure',
    color: '#FF6B6B'
  },
  nature: {
    category: 'nature',
    emoji: '🐢',
    label: 'Nature',
    color: '#4ECDC4'
  },
  friendship: {
    category: 'friendship',
    emoji: '🤝',
    label: 'Friendship',
    color: '#45B7D1'
  },
  learning: {
    category: 'learning',
    emoji: '📚',
    label: 'Learning',
    color: '#FFEAA7'
  },
  fantasy: {
    category: 'fantasy',
    emoji: '✨',
    label: 'Fantasy',
    color: '#DDA0DD'
  }
};
