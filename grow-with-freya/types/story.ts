import { ImageSourcePropType } from 'react-native';

export interface CharacterAnimation {
  id: string;
  name: string; // Animation name (e.g., 'idle', 'walking', 'jumping')
  frames: string[]; // Array of image paths for animation frames (10-20 frames)
  duration: number; // Total animation duration in milliseconds
  loop: boolean; // Whether animation should loop
  startDelay?: number; // Delay before animation starts (default: 2000ms)
}

export interface CharacterMovement {
  type: 'translate' | 'scale' | 'rotate';
  direction?: 'left' | 'right' | 'up' | 'down'; // For translate movements
  distance?: number; // Distance in pixels or percentage
  duration: number; // Movement duration in milliseconds
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface CharacterPosition {
  x: number | string; // X position (pixels or percentage)
  y: number | string; // Y position (pixels or percentage)
  width: number | string; // Character width (pixels or percentage)
  height: number | string; // Character height (pixels or percentage)
  zIndex?: number; // Layer order
}

export interface AnimatedCharacter {
  id: string;
  name: string;
  position: CharacterPosition;
  animations: CharacterAnimation[];
  defaultAnimation?: string; // Default animation to play
  audioSource?: string; // Audio file to play when character is tapped
  movements?: CharacterMovement[]; // Sequential movements after animation
  isInteractive?: boolean; // Whether character responds to touch
}

export interface StoryPage {
  id: string;
  pageNumber: number;
  type?: string; // Page type (e.g., 'cover', 'story')
  backgroundImage?: string; // Background image for the page
  characterImage?: string; // Legacy character image (for backward compatibility)
  animatedCharacters?: AnimatedCharacter[]; // New animated characters system
  text: string; // Story text for this page
}

export interface Story {
  id: string;
  title: string;
  category: StoryCategory;
  tag: string;
  emoji: string;
  coverImage?: ImageSourcePropType | string; // Optional - will use placeholder if not provided
  isAvailable: boolean;
  ageRange?: string;
  duration?: number; // in minutes
  description?: string;
  pages?: StoryPage[]; // 8 pages for the story book
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
