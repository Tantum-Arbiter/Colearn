import { Emotion, EmotionGameConfig } from '@/types/emotion';

// Emotion IDs for type safety
export type EmotionId = 'happy' | 'sad' | 'angry' | 'surprised' | 'scared' | 'excited' | 'confused' | 'proud' | 'shy' | 'loving';

// Number of prompts per emotion (used for random selection)
export const PROMPTS_PER_EMOTION = 4;

export const EMOTIONS: Emotion[] = [
  // Basic emotions - easy level
  {
    id: 'happy',
    name: 'Happy',
    emoji: '😊',
    color: '#FFD700',
    description: 'Feeling joyful and cheerful',
    difficulty: 'easy',
    category: 'basic'
  },
  {
    id: 'sad',
    name: 'Sad',
    emoji: '😢',
    color: '#4A90E2',
    description: 'Feeling down or unhappy',
    difficulty: 'easy',
    category: 'basic'
  },
  {
    id: 'angry',
    name: 'Angry',
    emoji: '😠',
    color: '#FF6B6B',
    description: 'Feeling mad or frustrated',
    difficulty: 'easy',
    category: 'basic'
  },
  {
    id: 'surprised',
    name: 'Surprised',
    emoji: '😲',
    color: '#FF9500',
    description: 'Feeling shocked or amazed',
    difficulty: 'easy',
    category: 'basic'
  },
  {
    id: 'scared',
    name: 'Scared',
    emoji: '😨',
    color: '#8E44AD',
    description: 'Feeling afraid or frightened',
    difficulty: 'medium',
    category: 'basic'
  },
  {
    id: 'excited',
    name: 'Excited',
    emoji: '🤩',
    color: '#E74C3C',
    description: 'Feeling thrilled and energetic',
    difficulty: 'medium',
    category: 'basic'
  },

  // Complex emotions - medium/hard level
  {
    id: 'confused',
    name: 'Confused',
    emoji: '😕',
    color: '#95A5A6',
    description: 'Feeling puzzled or uncertain',
    difficulty: 'medium',
    category: 'complex'
  },
  {
    id: 'proud',
    name: 'Proud',
    emoji: '😌',
    color: '#2ECC71',
    description: 'Feeling accomplished and confident',
    difficulty: 'medium',
    category: 'complex'
  },
  {
    id: 'shy',
    name: 'Shy',
    emoji: '😳',
    color: '#F39C12',
    description: 'Feeling bashful or timid',
    difficulty: 'medium',
    category: 'social'
  },
  {
    id: 'loving',
    name: 'Loving',
    emoji: '🥰',
    color: '#E91E63',
    description: 'Feeling affectionate and caring',
    difficulty: 'hard',
    category: 'social'
  }
];

export const EMOTION_GAME_CONFIG: EmotionGameConfig = {
  emotionsPerLevel: 5,
  pointsPerCorrect: 10,
  pointsForStreak: 5,
  maxLevel: 5,
  timePerEmotion: 60 // 60 seconds per emotion
};

export const getEmotionsByDifficulty = (difficulty: 'easy' | 'medium' | 'hard'): Emotion[] => {
  return EMOTIONS.filter(emotion => emotion.difficulty === difficulty);
};

export const getEmotionsByCategory = (category: 'basic' | 'complex' | 'social'): Emotion[] => {
  return EMOTIONS.filter(emotion => emotion.category === category);
};

export const getRandomEmotion = (excludeIds: string[] = []): Emotion => {
  const availableEmotions = EMOTIONS.filter(emotion => !excludeIds.includes(emotion.id));
  const randomIndex = Math.floor(Math.random() * availableEmotions.length);
  return availableEmotions[randomIndex];
};

/**
 * Get a random prompt index for an emotion (0-3)
 * Use with t(`emotions.prompts.${emotion.id}.${index}`) to get the translated prompt
 */
export const getRandomPromptIndex = (): number => {
  return Math.floor(Math.random() * PROMPTS_PER_EMOTION);
};

/**
 * Get the translation key for a specific emotion prompt
 * @param emotionId The emotion ID (e.g., 'happy', 'sad')
 * @param promptIndex The prompt index (0-3)
 * @returns The translation key to use with t()
 */
export const getPromptTranslationKey = (emotionId: string, promptIndex: number): string => {
  return `emotions.prompts.${emotionId}.${promptIndex}`;
};

export const getEmotionById = (id: string): Emotion | undefined => {
  return EMOTIONS.find(emotion => emotion.id === id);
};
