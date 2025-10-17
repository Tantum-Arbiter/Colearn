import { Dimensions } from 'react-native';

// Dynamic screen dimensions that update with orientation changes
export const getScreenDimensions = () => {
  const { width, height } = Dimensions.get('window');
  return { width, height };
};

export const ANIMATION_TIMINGS = {
  ROCKET_DURATION: 12000,
  ROCKET_WAIT_TIME: 4000,
  BALLOON_DURATION: 40000,
  BALLOON_STAGGER_DELAY: 15000,
  CLOUD_DURATION: 40000, // Backward compatibility
  CLOUD_STAGGER_DELAY: 15000, // Backward compatibility
  ICON_PULSE_DURATION: 2000,
  ICON_GLOW_DURATION: 2500,
  ICON_SHIMMER_DURATION: 1500,
  SELECTION_SCALE_DURATION: 250,
  SELECTION_GLOW_DURATION: 150,
  SELECTION_TIMEOUT: 1000,
  PRESS_SCALE_DURATION: 150,
  GLOW_BURST_DURATION: 100,
} as const;

export const LAYOUT = {
  ICON_CONTAINER_WIDTH: 280,
  ICON_SPACING: 30,
  CENTER_MARGIN_BOTTOM: 40,
  TOP_ROW_MARGIN_BOTTOM: 20,
  ICON_SIZE_SMALL: 48,
  ICON_SIZE_MEDIUM: 58,
  ICON_SIZE_LARGE: 70,
  MENU_ICON_SIZE: 90,
  LARGE_MENU_ICON_SIZE: 110,
  Z_INDEX: {
    BACKGROUND: 0,
    BEAR: 1, // Behind everything except background
    CLOUDS_BEHIND: 2,
    CLOUDS_FRONT: 3,
    ROCKETS: 4,
    UI: 10,
  },
  ROCKET_TOP_POSITION: 0.25,
  ROCKET_RIGHT_TOP_POSITION: 0.20,
  BALLOON_TOP_POSITION_1: 0.75,
  BALLOON_TOP_POSITION_2: 0.78,
  CLOUD_TOP_POSITION_1: 0.75, // Backward compatibility
  CLOUD_TOP_POSITION_2: 0.78, // Backward compatibility
  BEAR_HEIGHT_RATIO: 0.15,
  OFF_SCREEN_LEFT: -200,
  OFF_SCREEN_RIGHT_OFFSET: 100,
  HIDDEN_POSITION: -9999,
  BALLOON_EXIT_MARGIN: 250,
  CLOUD_EXIT_MARGIN: 250, // Backward compatibility
} as const;

export const VISUAL_EFFECTS = {
  BALLOON_OPACITY: 0.8,
  CLOUD_OPACITY: 0.8, // Backward compatibility
  ROCKET_OPACITY: 0.9,
  BEAR_OPACITY: 0.8,
  STAR_BASE_OPACITY: 0.4,
  GLOW_BASE_OPACITY: 0.7,
  GLOW_INACTIVE_OPACITY: 0.3,
  GLOW_MULTIPLIER: 0.9,
  GLOW_INACTIVE_MULTIPLIER: 0.6,
  GLOW_BASE_RADIUS: 16,
  GLOW_INACTIVE_RADIUS: 8,
  GLOW_RADIUS_MULTIPLIER: 8,
  GLOW_RADIUS_INACTIVE_MULTIPLIER: 6,
  SELECTION_GLOW_OPACITY: 1.8,
  SELECTION_GLOW_RADIUS: 8,
  SHIMMER_BASE_OPACITY: 0.3,
  SHIMMER_MULTIPLIER: 0.7,
  GLOW_COLOR: '#FFFF00',
  GRADIENT_COLORS: ['#1E3A8A', '#3B82F6', '#4ECDC4'],
  STAR_COUNT: 15,
  STAR_SIZE: 3,
  STAR_BORDER_RADIUS: 1.5,
  STAR_AREA_HEIGHT_RATIO: 0.6,
} as const;

export interface MenuItemData {
  icon: string;
  label: string;
  destination: string;
}

export const DEFAULT_MENU_ITEMS: MenuItemData[] = [
  { icon: 'stories-icon', label: 'Stories', destination: 'stories' },
  { icon: 'sensory-icon', label: 'Sensory', destination: 'sensory' },
  { icon: 'emotions-icon', label: 'Emotions', destination: 'emotions' },
  { icon: 'bedtime-icon', label: 'Bedtime Music', destination: 'bedtime' },
  { icon: 'screentime-icon', label: 'Screen Time', destination: 'screen_time' },
] as const;

export type IconStatus = 'animated_interactive' | 'inactive';

export { Easing } from 'react-native-reanimated';
