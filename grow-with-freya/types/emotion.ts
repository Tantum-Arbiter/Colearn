export type EmotionTheme = 'emoji' | 'animals' | 'bear';

export interface EmotionThemeItem {
  icon: string;
  name: string;
  nameKey?: string; // Translation key for the name
  image?: number; // Optional image source (require() returns a number)
}

export interface EmotionThemeData {
  id: EmotionTheme;
  name: string;
  nameKey?: string; // Translation key for the theme name
  description: string;
  descriptionKey?: string; // Translation key for the description
  icon: string;
  themeIcon?: number; // Optional image source for theme icon (require() returns a number)
  emotions: Record<string, EmotionThemeItem>;
}

export interface Emotion {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'basic' | 'complex' | 'social';
}

export interface EmotionGameState {
  currentEmotion: Emotion | null;
  score: number;
  level: number;
  completedEmotions: string[];
  currentPrompt: string;
  isGameActive: boolean;
  selectedTheme: EmotionTheme;
}

export interface EmotionGameProgress {
  totalEmotionsLearned: number;
  currentStreak: number;
  bestStreak: number;
  favoriteEmotion: string | null;
  lastPlayedDate: string | null;
  achievements: string[];
}

export type EmotionGameView = 'menu' | 'game';

export interface EmotionCardProps {
  emotion: Emotion;
  isSelected?: boolean;
  isRevealed?: boolean;
  onPress: (emotion: Emotion) => void;
  animationDelay?: number;
  size?: 'tiny' | 'small' | 'medium' | 'large';
  theme?: EmotionTheme;
}

export interface EmotionGameConfig {
  emotionsPerLevel: number;
  pointsPerCorrect: number;
  pointsForStreak: number;
  maxLevel: number;
  timePerEmotion?: number; // Optional timer
}
