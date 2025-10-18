import React, { createContext, useContext, useState, useRef } from 'react';
import { Dimensions, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS
} from 'react-native-reanimated';
import { Story } from '@/types/story';

interface StoryTransitionContextType {
  // Animation state
  isTransitioning: boolean;
  selectedStoryId: string | null;
  selectedStory: Story | null;

  // Card position and size for animation
  cardPosition: { x: number; y: number; width: number; height: number } | null;

  // Animation functions
  startTransition: (storyId: string, cardLayout: { x: number; y: number; width: number; height: number }, story?: Story) => void;
  completeTransition: () => void;

  // Animation values
  transitionScale: Animated.SharedValue<number>;
  transitionX: Animated.SharedValue<number>;
  transitionY: Animated.SharedValue<number>;
  transitionOpacity: Animated.SharedValue<number>;

  // Animated style for the transitioning card
  transitionAnimatedStyle: any;
}

const StoryTransitionContext = createContext<StoryTransitionContextType | null>(null);

export function useStoryTransition() {
  const context = useContext(StoryTransitionContext);
  if (!context) {
    throw new Error('useStoryTransition must be used within a StoryTransitionProvider');
  }
  return context;
}

interface StoryTransitionProviderProps {
  children: React.ReactNode;
}

export function StoryTransitionProvider({ children }: StoryTransitionProviderProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [cardPosition, setCardPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  
  // Animation values for the transitioning card
  const transitionScale = useSharedValue(1);
  const transitionX = useSharedValue(0);
  const transitionY = useSharedValue(0);
  const transitionOpacity = useSharedValue(1);
  
  // Preload story images during transition
  const preloadStoryImages = (story: Story) => {
    if (!story.pages) return;

    console.log('Preloading story images during transition...');
    const preloadPromises = story.pages.map((page) => {
      const promises = [];

      // Preload background image
      if (page.backgroundImage) {
        promises.push(
          new Promise((resolve) => {
            const source = typeof page.backgroundImage === 'string'
              ? { uri: page.backgroundImage }
              : page.backgroundImage;
            Image.prefetch(source.uri || '').then(resolve).catch(resolve);
          })
        );
      }

      // Preload character image
      if (page.characterImage) {
        promises.push(
          new Promise((resolve) => {
            const source = typeof page.characterImage === 'string'
              ? { uri: page.characterImage }
              : page.characterImage;
            Image.prefetch(source.uri || '').then(resolve).catch(resolve);
          })
        );
      }

      return Promise.all(promises);
    });

    Promise.all(preloadPromises).then(() => {
      console.log('Story image preloading complete');
    }).catch((error) => {
      console.warn('Story image preloading failed:', error);
    });
  };

  const startTransition = (storyId: string, cardLayout: { x: number; y: number; width: number; height: number }, story?: Story) => {
    console.log('Starting story transition for:', storyId, 'from position:', cardLayout);

    setSelectedStoryId(storyId);
    setSelectedStory(story || null);
    setCardPosition(cardLayout);
    setIsTransitioning(true);

    // Start preloading story images during the transition
    if (story) {
      preloadStoryImages(story);
    }
    
    // Calculate target position (center of screen)
    const targetX = screenWidth / 2 - cardLayout.width / 2;
    const targetY = screenHeight / 2 - cardLayout.height / 2;
    
    // Calculate scale to be larger but not full screen (50% of screen width)
    const targetScale = (screenWidth * 0.5) / cardLayout.width;
    
    // Start animation: move to center and scale up
    transitionX.value = withTiming(targetX - cardLayout.x, {
      duration: 600,
      easing: Easing.out(Easing.cubic)
    });
    
    transitionY.value = withTiming(targetY - cardLayout.y, {
      duration: 600,
      easing: Easing.out(Easing.cubic)
    });
    
    transitionScale.value = withTiming(targetScale, {
      duration: 600,
      easing: Easing.out(Easing.cubic)
    });
    
    // After expansion, fade out to transition to story reader
    setTimeout(() => {
      transitionOpacity.value = withTiming(0, {
        duration: 250,
        easing: Easing.out(Easing.quad)
      }, () => {
        // Transition complete - story reader should now be visible
        runOnJS(completeTransition)();
      });
    }, 600);
  };
  
  const completeTransition = () => {
    console.log('Story transition complete');
    setIsTransitioning(false);
    setSelectedStoryId(null);
    setSelectedStory(null);
    setCardPosition(null);

    // Reset animation values
    transitionScale.value = 1;
    transitionX.value = 0;
    transitionY.value = 0;
    transitionOpacity.value = 1;
  };
  
  const transitionAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: transitionX.value },
        { translateY: transitionY.value },
        { scale: transitionScale.value }
      ],
      opacity: transitionOpacity.value,
    };
  });
  
  const contextValue: StoryTransitionContextType = {
    isTransitioning,
    selectedStoryId,
    selectedStory,
    cardPosition,
    startTransition,
    completeTransition,
    transitionScale,
    transitionX,
    transitionY,
    transitionOpacity,
    transitionAnimatedStyle,
  };
  
  return (
    <StoryTransitionContext.Provider value={contextValue}>
      {children}
    </StoryTransitionContext.Provider>
  );
}
