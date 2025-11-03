/**
 * Feature flags for controlling experimental and new features
 * This allows us to safely test new functionality without affecting production
 */

export const FEATURE_FLAGS = {
  // Animation System Features
  ENABLE_ANIMATED_CHARACTERS: false, // Temporarily disabled to fix infinite loop
  ENABLE_SIMPLE_ANIMATION_DEMO: false, // Temporarily disabled to fix infinite loop
  ENABLE_FULL_FRAME_ANIMATION: false, // Enable full 10-20 frame animation system
  ENABLE_CHARACTER_AUDIO: false, // Enable character audio interactions
  ENABLE_MOVEMENT_PATTERNS: false, // Enable complex movement patterns
  
  // Development and Testing
  ENABLE_ANIMATION_DEBUG: process.env.NODE_ENV === 'development', // Show animation debug info in development
  ENABLE_PERFORMANCE_MONITORING: process.env.NODE_ENV === 'development', // Monitor animation performance
  
  // Story Features
  ENABLE_STORY_ANIMATIONS_FOR_ALL: false, // Enable animations for all stories
  ENABLE_STORY_ANIMATIONS_FOR_WOMBAT: true, // Enable animations only for wombat story
  
  // UI Features
  SHOW_ANIMATION_CONTROLS: process.env.NODE_ENV === 'development', // Show animation control buttons in dev
  ENABLE_ANIMATION_RESET_BUTTON: process.env.NODE_ENV === 'development', // Show reset button for testing
} as const;

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag];
}

/**
 * Get all enabled features (useful for debugging)
 */
export function getEnabledFeatures(): string[] {
  return Object.entries(FEATURE_FLAGS)
    .filter(([, enabled]) => enabled)
    .map(([flag]) => flag);
}

/**
 * Story-specific feature checks
 */
export function shouldShowAnimationsForStory(storyId: string): boolean {
  if (!isFeatureEnabled('ENABLE_ANIMATED_CHARACTERS')) {
    return false;
  }
  
  if (isFeatureEnabled('ENABLE_STORY_ANIMATIONS_FOR_ALL')) {
    return true;
  }
  
  if (isFeatureEnabled('ENABLE_STORY_ANIMATIONS_FOR_WOMBAT') && storyId === 'snuggle-little-wombat') {
    return true;
  }
  
  return false;
}

/**
 * Animation type checks
 */
export function shouldUseSimpleDemo(): boolean {
  return isFeatureEnabled('ENABLE_SIMPLE_ANIMATION_DEMO') && 
         !isFeatureEnabled('ENABLE_FULL_FRAME_ANIMATION');
}

export function shouldUseFullFrameAnimation(): boolean {
  return isFeatureEnabled('ENABLE_FULL_FRAME_ANIMATION');
}
