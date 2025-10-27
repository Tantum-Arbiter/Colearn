import { Emotion, EmotionGameConfig } from '@/types/emotion';

export const EMOTIONS: Emotion[] = [
  // Basic emotions - easy level
  {
    id: 'happy',
    name: 'Happy',
    emoji: '😊',
    color: '#FFD700',
    description: 'Feeling joyful and cheerful',
    expressionPrompts: [
      'Show me your biggest smile!',
      'Can you laugh like you heard something funny?',
      'Make a happy face and clap your hands!',
      'Show me how you look when you get a present!'
    ],
    difficulty: 'easy',
    category: 'basic'
  },
  {
    id: 'sad',
    name: 'Sad',
    emoji: '😢',
    color: '#4A90E2',
    description: 'Feeling down or unhappy',
    expressionPrompts: [
      'Show me a sad face',
      'Can you make your face look like you lost your toy?',
      'Show me how you feel when you have to say goodbye',
      'Make a pouty face like when you\'re disappointed'
    ],
    difficulty: 'easy',
    category: 'basic'
  },
  {
    id: 'angry',
    name: 'Angry',
    emoji: '😠',
    color: '#FF6B6B',
    description: 'Feeling mad or frustrated',
    expressionPrompts: [
      'Show me an angry face',
      'Can you scrunch up your face like you\'re mad?',
      'Show me how you look when someone takes your toy',
      'Make a grumpy face with crossed arms!'
    ],
    difficulty: 'easy',
    category: 'basic'
  },
  {
    id: 'surprised',
    name: 'Surprised',
    emoji: '😲',
    color: '#FF9500',
    description: 'Feeling shocked or amazed',
    expressionPrompts: [
      'Show me a surprised face!',
      'Can you open your eyes and mouth really wide?',
      'Show me how you look when you see something amazing!',
      'Make a face like you just saw magic!'
    ],
    difficulty: 'easy',
    category: 'basic'
  },
  {
    id: 'scared',
    name: 'Scared',
    emoji: '😨',
    color: '#8E44AD',
    description: 'Feeling afraid or frightened',
    expressionPrompts: [
      'Show me a scared face',
      'Can you hide behind your hands like you\'re scared?',
      'Show me how you look during a thunderstorm',
      'Make a face like you saw something spooky!'
    ],
    difficulty: 'medium',
    category: 'basic'
  },
  {
    id: 'excited',
    name: 'Excited',
    emoji: '🤩',
    color: '#E74C3C',
    description: 'Feeling thrilled and energetic',
    expressionPrompts: [
      'Show me how excited you get!',
      'Can you jump up and down with a big smile?',
      'Show me your face when you\'re going somewhere fun!',
      'Make an excited face and wave your hands!'
    ],
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
    expressionPrompts: [
      'Show me a confused face',
      'Can you scrunch your eyebrows like you\'re thinking hard?',
      'Show me how you look when you don\'t understand something',
      'Make a face like you\'re trying to solve a puzzle!'
    ],
    difficulty: 'medium',
    category: 'complex'
  },
  {
    id: 'proud',
    name: 'Proud',
    emoji: '😌',
    color: '#2ECC71',
    description: 'Feeling accomplished and confident',
    expressionPrompts: [
      'Show me how proud you are!',
      'Can you stand tall and smile like you did something great?',
      'Show me your proud face when you finish a puzzle!',
      'Make a face like you just helped someone!'
    ],
    difficulty: 'medium',
    category: 'complex'
  },
  {
    id: 'shy',
    name: 'Shy',
    emoji: '😳',
    color: '#F39C12',
    description: 'Feeling bashful or timid',
    expressionPrompts: [
      'Show me a shy face',
      'Can you hide your face a little bit?',
      'Show me how you look when meeting someone new',
      'Make a shy smile and look down!'
    ],
    difficulty: 'medium',
    category: 'social'
  },
  {
    id: 'loving',
    name: 'Loving',
    emoji: '🥰',
    color: '#E91E63',
    description: 'Feeling affectionate and caring',
    expressionPrompts: [
      'Show me your loving face!',
      'Can you give yourself a big hug?',
      'Show me how you look at someone you love!',
      'Make a face like you\'re giving kisses!'
    ],
    difficulty: 'hard',
    category: 'social'
  }
];

export const EMOTION_GAME_CONFIG: EmotionGameConfig = {
  emotionsPerLevel: 5,
  pointsPerCorrect: 10,
  pointsForStreak: 5,
  maxLevel: 5,
  timePerEmotion: 15 // 15 seconds per emotion
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

export const getRandomPrompt = (emotion: Emotion): string => {
  const randomIndex = Math.floor(Math.random() * emotion.expressionPrompts.length);
  return emotion.expressionPrompts[randomIndex];
};

export const getEmotionById = (id: string): Emotion | undefined => {
  return EMOTIONS.find(emotion => emotion.id === id);
};
