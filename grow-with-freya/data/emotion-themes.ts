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

// Translation keys for emotion themes - use with t() function
export const EMOTION_THEME_KEYS = {
  emoji: {
    name: 'emotions.themes.emoji.name',
    description: 'emotions.themes.emoji.description',
  },
  animals: {
    name: 'emotions.themes.animals.name',
    description: 'emotions.themes.animals.description',
  },
  bear: {
    name: 'emotions.themes.bear.name',
    description: 'emotions.themes.bear.description',
  },
} as const;

// Translation keys for emotion names by theme
export const EMOTION_NAME_KEYS = {
  emoji: {
    happy: 'emotions.emoji.happy',
    sad: 'emotions.emoji.sad',
    angry: 'emotions.emoji.angry',
    surprised: 'emotions.emoji.surprised',
    scared: 'emotions.emoji.scared',
    excited: 'emotions.emoji.excited',
    confused: 'emotions.emoji.confused',
    proud: 'emotions.emoji.proud',
    shy: 'emotions.emoji.shy',
    loving: 'emotions.emoji.loving',
  },
  animals: {
    happy: 'emotions.animals.happy',
    sad: 'emotions.animals.sad',
    angry: 'emotions.animals.angry',
    surprised: 'emotions.animals.surprised',
    scared: 'emotions.animals.scared',
    excited: 'emotions.animals.excited',
    confused: 'emotions.animals.confused',
    proud: 'emotions.animals.proud',
    shy: 'emotions.animals.shy',
    loving: 'emotions.animals.loving',
  },
  bear: {
    happy: 'emotions.bear.happy',
    sad: 'emotions.bear.sad',
    angry: 'emotions.bear.angry',
    surprised: 'emotions.bear.surprised',
    scared: 'emotions.bear.scared',
    excited: 'emotions.bear.excited',
    confused: 'emotions.bear.confused',
    proud: 'emotions.bear.proud',
    shy: 'emotions.bear.shy',
    loving: 'emotions.bear.loving',
  },
} as const;

export const EMOTION_THEMES: Record<EmotionTheme, EmotionThemeData> = {
  emoji: {
    id: 'emoji',
    name: 'Emoji',
    nameKey: 'emotions.themes.emoji.name',
    description: 'Express emotions with fun emoji faces',
    descriptionKey: 'emotions.themes.emoji.description',
    icon: '😊',
    emotions: {
      happy: { icon: '😊', name: 'Happy', nameKey: 'emotions.emoji.happy' },
      sad: { icon: '😢', name: 'Sad', nameKey: 'emotions.emoji.sad' },
      angry: { icon: '😠', name: 'Angry', nameKey: 'emotions.emoji.angry' },
      surprised: { icon: '😲', name: 'Surprised', nameKey: 'emotions.emoji.surprised' },
      scared: { icon: '😨', name: 'Scared', nameKey: 'emotions.emoji.scared' },
      excited: { icon: '🤩', name: 'Excited', nameKey: 'emotions.emoji.excited' },
      confused: { icon: '😕', name: 'Confused', nameKey: 'emotions.emoji.confused' },
      proud: { icon: '😌', name: 'Proud', nameKey: 'emotions.emoji.proud' },
      shy: { icon: '😳', name: 'Shy', nameKey: 'emotions.emoji.shy' },
      loving: { icon: '🥰', name: 'Loving', nameKey: 'emotions.emoji.loving' }
    }
  },
  animals: {
    id: 'animals',
    name: 'Animals',
    nameKey: 'emotions.themes.animals.name',
    description: 'Learn emotions through cute animal friends',
    descriptionKey: 'emotions.themes.animals.description',
    icon: '🐱',
    themeIcon: THEME_ICONS.animals,
    emotions: {
      happy: { icon: '🐰', name: 'Happy Bunny', nameKey: 'emotions.animals.happy', image: ANIMAL_EMOTION_IMAGES.happy },
      sad: { icon: '🐱', name: 'Sad Kitty', nameKey: 'emotions.animals.sad', image: ANIMAL_EMOTION_IMAGES.sad },
      angry: { icon: '🐶', name: 'Angry Dog', nameKey: 'emotions.animals.angry', image: ANIMAL_EMOTION_IMAGES.angry },
      surprised: { icon: '🐥', name: 'Surprised Chick', nameKey: 'emotions.animals.surprised', image: ANIMAL_EMOTION_IMAGES.surprised },
      scared: { icon: '🦝', name: 'Scared Raccoon', nameKey: 'emotions.animals.scared', image: ANIMAL_EMOTION_IMAGES.scared },
      excited: { icon: '🦊', name: 'Excited Fox', nameKey: 'emotions.animals.excited', image: ANIMAL_EMOTION_IMAGES.excited },
      confused: { icon: '🐘', name: 'Confused Elephant', nameKey: 'emotions.animals.confused', image: ANIMAL_EMOTION_IMAGES.confused },
      proud: { icon: '🐻', name: 'Proud Bear', nameKey: 'emotions.animals.proud', image: ANIMAL_EMOTION_IMAGES.proud },
      shy: { icon: '🦥', name: 'Shy Sloth', nameKey: 'emotions.animals.shy', image: ANIMAL_EMOTION_IMAGES.shy },
      loving: { icon: '🐼', name: 'Loving Panda', nameKey: 'emotions.animals.loving', image: ANIMAL_EMOTION_IMAGES.loving }
    }
  },
  bear: {
    id: 'bear',
    name: 'Bear',
    nameKey: 'emotions.themes.bear.name',
    description: 'Learn emotions with our friendly bear',
    descriptionKey: 'emotions.themes.bear.description',
    icon: '🐻',
    themeIcon: THEME_ICONS.bear,
    emotions: {
      happy: { icon: '🐻', name: 'Happy Bear', nameKey: 'emotions.bear.happy', image: BEAR_EMOTION_IMAGES.happy },
      sad: { icon: '🐻', name: 'Sad Bear', nameKey: 'emotions.bear.sad', image: BEAR_EMOTION_IMAGES.sad },
      angry: { icon: '🐻', name: 'Angry Bear', nameKey: 'emotions.bear.angry', image: BEAR_EMOTION_IMAGES.angry },
      surprised: { icon: '🐻', name: 'Surprised Bear', nameKey: 'emotions.bear.surprised', image: BEAR_EMOTION_IMAGES.surprised },
      scared: { icon: '🐻', name: 'Scared Bear', nameKey: 'emotions.bear.scared', image: BEAR_EMOTION_IMAGES.scared },
      excited: { icon: '🐻', name: 'Excited Bear', nameKey: 'emotions.bear.excited', image: BEAR_EMOTION_IMAGES.excited },
      confused: { icon: '🐻', name: 'Confused Bear', nameKey: 'emotions.bear.confused', image: BEAR_EMOTION_IMAGES.confused },
      proud: { icon: '🐻', name: 'Proud Bear', nameKey: 'emotions.bear.proud', image: BEAR_EMOTION_IMAGES.proud },
      shy: { icon: '🐻', name: 'Shy Bear', nameKey: 'emotions.bear.shy', image: BEAR_EMOTION_IMAGES.shy },
      loving: { icon: '🐻', name: 'Loving Bear', nameKey: 'emotions.bear.loving', image: BEAR_EMOTION_IMAGES.loving }
    }
  }
};

export const getThemeIcon = (emotionId: string, theme: EmotionTheme): string => {
  const themeData = EMOTION_THEMES[theme];
  return themeData.emotions[emotionId]?.icon || '❓';
};

/**
 * Get the fallback name for an emotion (English)
 * For translated names, use getThemeNameKey and pass to t()
 */
export const getThemeName = (emotionId: string, theme: EmotionTheme): string => {
  const themeData = EMOTION_THEMES[theme];
  return themeData.emotions[emotionId]?.name || 'Unknown';
};

/**
 * Get the translation key for an emotion name
 * Use with t() function: t(getThemeNameKey(emotionId, theme))
 */
export const getThemeNameKey = (emotionId: string, theme: EmotionTheme): string | undefined => {
  const themeData = EMOTION_THEMES[theme];
  return themeData.emotions[emotionId]?.nameKey;
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
