import { EmotionTheme, EmotionThemeData } from '@/types/emotion';

// Bear emotion images - preloaded for performance
export const BEAR_EMOTION_IMAGES = {
  happy: require('../assets/images/emotions/bear-happy.webp'),
  sad: require('../assets/images/emotions/bear-sad.webp'),
  angry: require('../assets/images/emotions/bear-angry.webp'),
  surprised: require('../assets/images/emotions/bear-surprised.webp'),
  scared: require('../assets/images/emotions/bear-scared.webp'),
  excited: require('../assets/images/emotions/bear-excited.webp'),
  confused: require('../assets/images/emotions/bear-confused.webp'),
  proud: require('../assets/images/emotions/bear-proud.webp'),
  shy: require('../assets/images/emotions/bear-shy.webp'),
  loving: require('../assets/images/emotions/bear-loving.webp'),
} as const;

// Animal emotion images - preloaded for performance
export const ANIMAL_EMOTION_IMAGES = {
  happy: require('../assets/images/emotions/animal-happy.webp'),
  sad: require('../assets/images/emotions/animal-sad.webp'),
  angry: require('../assets/images/emotions/animal-angry.webp'),
  surprised: require('../assets/images/emotions/animal-surprised.webp'),
  scared: require('../assets/images/emotions/animal-scared.webp'),
  excited: require('../assets/images/emotions/animal-excited.webp'),
  confused: require('../assets/images/emotions/animal-confused.webp'),
  proud: require('../assets/images/emotions/animal-proud.webp'),
  shy: require('../assets/images/emotions/animal-shy.webp'),
  loving: require('../assets/images/emotions/animal-loving.webp'),
} as const;

// Theme icons - representative images for each theme
export const THEME_ICONS = {
  animals: require('../assets/images/emotions/animal-loving.webp'),
  bear: require('../assets/images/emotions/bear-loving.webp'),
} as const;

export const EMOTION_THEMES: Record<EmotionTheme, EmotionThemeData> = {
  emoji: {
    id: 'emoji',
    name: 'Emoji',
    description: 'Express emotions with fun emoji faces',
    icon: '😊',
    emotions: {
      happy: { icon: '😊', name: 'Happy' },
      sad: { icon: '😢', name: 'Sad' },
      angry: { icon: '😠', name: 'Angry' },
      surprised: { icon: '😲', name: 'Surprised' },
      scared: { icon: '😨', name: 'Scared' },
      excited: { icon: '🤩', name: 'Excited' },
      confused: { icon: '😕', name: 'Confused' },
      proud: { icon: '😌', name: 'Proud' },
      shy: { icon: '😳', name: 'Shy' },
      loving: { icon: '🥰', name: 'Loving' }
    }
  },
  animals: {
    id: 'animals',
    name: 'Animals',
    description: 'Learn emotions through cute animal friends',
    icon: '🐱',
    themeIcon: THEME_ICONS.animals,
    emotions: {
      happy: { icon: '🐰', name: 'Happy Bunny', image: ANIMAL_EMOTION_IMAGES.happy },
      sad: { icon: '🐱', name: 'Sad Kitty', image: ANIMAL_EMOTION_IMAGES.sad },
      angry: { icon: '🐶', name: 'Angry Dog', image: ANIMAL_EMOTION_IMAGES.angry },
      surprised: { icon: '🐥', name: 'Surprised Chick', image: ANIMAL_EMOTION_IMAGES.surprised },
      scared: { icon: '🦝', name: 'Scared Raccoon', image: ANIMAL_EMOTION_IMAGES.scared },
      excited: { icon: '🦊', name: 'Excited Fox', image: ANIMAL_EMOTION_IMAGES.excited },
      confused: { icon: '🐘', name: 'Confused Elephant', image: ANIMAL_EMOTION_IMAGES.confused },
      proud: { icon: '🐻', name: 'Proud Bear', image: ANIMAL_EMOTION_IMAGES.proud },
      shy: { icon: '🦥', name: 'Shy Sloth', image: ANIMAL_EMOTION_IMAGES.shy },
      loving: { icon: '🐼', name: 'Loving Panda', image: ANIMAL_EMOTION_IMAGES.loving }
    }
  },
  bear: {
    id: 'bear',
    name: 'Bear',
    description: 'Learn emotions with our friendly bear',
    icon: '🐻',
    themeIcon: THEME_ICONS.bear,
    emotions: {
      happy: { icon: '🐻', name: 'Happy Bear', image: BEAR_EMOTION_IMAGES.happy },
      sad: { icon: '🐻', name: 'Sad Bear', image: BEAR_EMOTION_IMAGES.sad },
      angry: { icon: '🐻', name: 'Angry Bear', image: BEAR_EMOTION_IMAGES.angry },
      surprised: { icon: '🐻', name: 'Surprised Bear', image: BEAR_EMOTION_IMAGES.surprised },
      scared: { icon: '🐻', name: 'Scared Bear', image: BEAR_EMOTION_IMAGES.scared },
      excited: { icon: '🐻', name: 'Excited Bear', image: BEAR_EMOTION_IMAGES.excited },
      confused: { icon: '🐻', name: 'Confused Bear', image: BEAR_EMOTION_IMAGES.confused },
      proud: { icon: '🐻', name: 'Proud Bear', image: BEAR_EMOTION_IMAGES.proud },
      shy: { icon: '🐻', name: 'Shy Bear', image: BEAR_EMOTION_IMAGES.shy },
      loving: { icon: '🐻', name: 'Loving Bear', image: BEAR_EMOTION_IMAGES.loving }
    }
  }
};

export const getThemeIcon = (emotionId: string, theme: EmotionTheme): string => {
  const themeData = EMOTION_THEMES[theme];
  return themeData.emotions[emotionId]?.icon || '❓';
};

export const getThemeName = (emotionId: string, theme: EmotionTheme): string => {
  const themeData = EMOTION_THEMES[theme];
  return themeData.emotions[emotionId]?.name || 'Unknown';
};

export const getThemeImage = (emotionId: string, theme: EmotionTheme): number | undefined => {
  const themeData = EMOTION_THEMES[theme];
  return themeData.emotions[emotionId]?.image;
};

export const getAllThemes = (): EmotionThemeData[] => {
  return Object.values(EMOTION_THEMES);
};

export const getThemeById = (themeId: EmotionTheme): EmotionThemeData => {
  return EMOTION_THEMES[themeId];
};
