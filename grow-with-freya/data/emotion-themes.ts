import { EmotionTheme, EmotionThemeData } from '@/types/emotion';

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
    emotions: {
      happy: { icon: '🐱', name: 'Happy Cat' },
      sad: { icon: '🐶', name: 'Sad Puppy' },
      angry: { icon: '🦁', name: 'Angry Lion' },
      surprised: { icon: '🐰', name: 'Surprised Bunny' },
      scared: { icon: '🐭', name: 'Scared Mouse' },
      excited: { icon: '🐵', name: 'Excited Monkey' },
      confused: { icon: '🐼', name: 'Confused Panda' },
      proud: { icon: '🦅', name: 'Proud Eagle' },
      shy: { icon: '🐹', name: 'Shy Hamster' },
      loving: { icon: '🐻', name: 'Loving Bear' }
    }
  },
  fairies: {
    id: 'fairies',
    name: 'Fairies',
    description: 'Magical fairy emotions from enchanted lands',
    icon: '🧚',
    emotions: {
      happy: { icon: '🧚‍♀️', name: 'Joyful Fairy' },
      sad: { icon: '🧚‍♂️', name: 'Tearful Sprite' },
      angry: { icon: '🔥', name: 'Fire Fairy' },
      surprised: { icon: '✨', name: 'Sparkle Fairy' },
      scared: { icon: '🌙', name: 'Moon Fairy' },
      excited: { icon: '⭐', name: 'Star Fairy' },
      confused: { icon: '🌀', name: 'Whirlwind Fairy' },
      proud: { icon: '👑', name: 'Royal Fairy' },
      shy: { icon: '🌸', name: 'Blossom Fairy' },
      loving: { icon: '💖', name: 'Heart Fairy' }
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

export const getAllThemes = (): EmotionThemeData[] => {
  return Object.values(EMOTION_THEMES);
};

export const getThemeById = (themeId: EmotionTheme): EmotionThemeData => {
  return EMOTION_THEMES[themeId];
};
