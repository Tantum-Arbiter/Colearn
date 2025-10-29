import { Dimensions } from 'react-native';

// Dynamic screen dimensions that update with orientation changes
export const getScreenDimensions = () => {
  const { width, height } = Dimensions.get('window');
  return { width, height };
};

// Static screen dimensions for components that need them
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
export { SCREEN_WIDTH, SCREEN_HEIGHT };

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

// Helper function to get responsive size for iPad (20% bigger)
const getResponsiveLayoutSize = (baseSize: number): number => {
  const { width: screenWidth } = getScreenDimensions();
  const isTablet = screenWidth >= 768;
  return isTablet ? Math.round(baseSize * 1.2) : baseSize;
};

export const LAYOUT = {
  get ICON_CONTAINER_WIDTH() { return getResponsiveLayoutSize(280); },
  get ICON_SPACING() { return getResponsiveLayoutSize(30); },
  get CENTER_MARGIN_BOTTOM() { return getResponsiveLayoutSize(40); },
  get TOP_ROW_MARGIN_BOTTOM() { return getResponsiveLayoutSize(20); },
  get ICON_SIZE_SMALL() { return getResponsiveLayoutSize(48); },
  get ICON_SIZE_MEDIUM() { return getResponsiveLayoutSize(58); },
  get ICON_SIZE_LARGE() { return getResponsiveLayoutSize(70); },
  get MENU_ICON_SIZE() { return getResponsiveLayoutSize(90); },
  get LARGE_MENU_ICON_SIZE() { return getResponsiveLayoutSize(110); },
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
  get GLOW_BASE_RADIUS() { return getResponsiveLayoutSize(16); },
  get GLOW_INACTIVE_RADIUS() { return getResponsiveLayoutSize(8); },
  get GLOW_RADIUS_MULTIPLIER() { return getResponsiveLayoutSize(8); },
  get GLOW_RADIUS_INACTIVE_MULTIPLIER() { return getResponsiveLayoutSize(6); },
  SELECTION_GLOW_OPACITY: 1.8,
  get SELECTION_GLOW_RADIUS() { return getResponsiveLayoutSize(8); },
  SHIMMER_BASE_OPACITY: 0.3,
  SHIMMER_MULTIPLIER: 0.7,
  GLOW_COLOR: '#FFFF00',
  GRADIENT_COLORS: ['#1E3A8A', '#3B82F6', '#4ECDC4'],
  STAR_COUNT: 15,
  get STAR_SIZE() { return getResponsiveLayoutSize(3); },
  get STAR_BORDER_RADIUS() { return getResponsiveLayoutSize(1.5); },
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
