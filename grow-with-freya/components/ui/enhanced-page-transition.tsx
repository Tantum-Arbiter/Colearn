import React, { useEffect } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { getScreenDimensions } from '@/components/main-menu/constants';

interface EnhancedPageTransitionProps {
  currentPage: string;
  pages: Record<string, React.ReactNode>;
  duration?: number;
}

interface AnimatedPageProps {
  pageKey: string;
  pageComponent: React.ReactNode;
  isActive: boolean;
  animationValue: SharedValue<number>;
}

const AnimatedPage: React.FC<AnimatedPageProps> = ({ pageKey, pageComponent, isActive, animationValue }) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: animationValue.value }],
  }));

  return (
    <Animated.View
      key={pageKey}
      style={[styles.page, animatedStyle]}
      pointerEvents={isActive ? 'auto' : 'none'}
    >
      {pageComponent || (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'red' }}>
          <Text style={{ color: 'white', fontSize: 18 }}>Missing component for {pageKey}</Text>
        </View>
      )}
    </Animated.View>
  );
};

/**
 * EnhancedPageTransition provides vertical scroll transitions between any pages
 * - Main menu stays at top (translateY: 0 when active, -screenHeight when inactive)
 * - All other pages scroll up from bottom (translateY: screenHeight when inactive, 0 when active)
 */
export const EnhancedPageTransition: React.FC<EnhancedPageTransitionProps> = ({
  currentPage,
  pages,
  duration = 600,
}) => {
  // Get initial screen height and track changes
  const [screenHeight, setScreenHeight] = React.useState(() => getScreenDimensions().height);

  // Update screen height when dimensions change (orientation changes)
  useEffect(() => {
    const updateDimensions = () => {
      const { height } = getScreenDimensions();
      setScreenHeight(height);
    };

    // Listen for dimension changes
    const subscription = Dimensions.addEventListener('change', updateDimensions);

    return () => subscription?.remove();
  }, []);

  // Create animation values for specific pages we know about
  const mainTranslateY = useSharedValue(
    currentPage === 'main' ? 0 :
    currentPage === 'account' ? screenHeight :
    -screenHeight
  );
  const storiesTranslateY = useSharedValue(currentPage === 'stories' ? 0 : screenHeight);
  const sensoryTranslateY = useSharedValue(currentPage === 'sensory' ? 0 : screenHeight);
  const emotionsTranslateY = useSharedValue(currentPage === 'emotions' ? 0 : screenHeight);
  const bedtimeTranslateY = useSharedValue(currentPage === 'bedtime' ? 0 : screenHeight);
  const screenTimeTranslateY = useSharedValue(currentPage === 'screen_time' ? 0 : screenHeight);
  const accountTranslateY = useSharedValue(currentPage === 'account' ? 0 : -screenHeight);

  // Map page keys to their animation values
  // Page animations mapping - force cache refresh
  const pageAnimations: Record<string, any> = {
    main: mainTranslateY,
    stories: storiesTranslateY,
    sensory: sensoryTranslateY,
    emotions: emotionsTranslateY,
    bedtime: bedtimeTranslateY,
    'screen_time': screenTimeTranslateY,
    account: accountTranslateY,
  };

  // Update animation values when screen height changes (orientation change)
  useEffect(() => {
    // Update positions for inactive pages when screen height changes
    if (currentPage !== 'main') {
      mainTranslateY.value = currentPage === 'account' ? screenHeight : -screenHeight;
    }
    if (currentPage !== 'stories') {
      storiesTranslateY.value = screenHeight;
    }
    if (currentPage !== 'sensory') {
      sensoryTranslateY.value = screenHeight;
    }
    if (currentPage !== 'emotions') {
      emotionsTranslateY.value = screenHeight;
    }
    if (currentPage !== 'bedtime') {
      bedtimeTranslateY.value = screenHeight;
    }
    if (currentPage !== 'screen_time') {
      screenTimeTranslateY.value = screenHeight;
    }
    if (currentPage !== 'account') {
      // Account page slides down from top - force cache refresh
      accountTranslateY.value = -screenHeight;
    }
  }, [screenHeight]);

  useEffect(() => {
    const animationConfig = {
      duration,
      easing: Easing.out(Easing.cubic),
    };

    console.log('EnhancedPageTransition: Animating to page:', currentPage);

    // Animate main menu
    if (currentPage === 'account') {
      // Account page: main menu slides down (positive translateY)
      mainTranslateY.value = withTiming(screenHeight, animationConfig);
    } else {
      // Other pages: main menu slides up when not active (negative translateY)
      mainTranslateY.value = withTiming(
        currentPage === 'main' ? 0 : -screenHeight,
        animationConfig
      );
    }

    // Animate all other pages
    storiesTranslateY.value = withTiming(
      currentPage === 'stories' ? 0 : screenHeight,
      animationConfig
    );

    sensoryTranslateY.value = withTiming(
      currentPage === 'sensory' ? 0 : screenHeight,
      animationConfig
    );

    emotionsTranslateY.value = withTiming(
      currentPage === 'emotions' ? 0 : screenHeight,
      animationConfig
    );

    bedtimeTranslateY.value = withTiming(
      currentPage === 'bedtime' ? 0 : screenHeight,
      animationConfig
    );

    screenTimeTranslateY.value = withTiming(
      currentPage === 'screen_time' ? 0 : screenHeight,
      animationConfig
    );

    // Account page slides down from top
    accountTranslateY.value = withTiming(
      currentPage === 'account' ? 0 : -screenHeight,
      animationConfig
    );
  }, [currentPage, duration]);

  return (
    <LinearGradient
      colors={['#1E3A8A', '#3B82F6', '#4ECDC4']}
      style={styles.container}
    >
      {Object.entries(pages).map(([pageKey, pageComponent]) => {
        // Only render pages that have animation values
        if (!pageAnimations[pageKey]) {
          console.warn(`No animation value for page: ${pageKey}`);
          return null;
        }

        const isActive = currentPage === pageKey;
        console.log(`Rendering page ${pageKey}, active: ${isActive}, component:`, !!pageComponent);

        return (
          <AnimatedPage
            key={pageKey}
            pageKey={pageKey}
            pageComponent={pageComponent}
            isActive={isActive}
            animationValue={pageAnimations[pageKey]}
          />
        );
      })}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  page: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
