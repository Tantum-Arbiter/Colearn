import { useEffect, useState, useRef, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Text, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';

import { useLoadingCircleAnimation, useCheckmarkAnimation, useTextFadeAnimation } from './auth/loading-animations';
import { FreyaRocketRightSvg } from './main-menu/svg-components';
import { BatchSyncService, BatchSyncProgress } from '@/services/batch-sync-service';
import { CacheManager } from '@/services/cache-manager';
import { StoryLoader } from '@/services/story-loader';
import { ApiClient } from '@/services/api-client';
import { ProfileSyncService } from '@/services/profile-sync-service';
import { Logger } from '@/utils/logger';

const log = Logger.create('StartupLoading');
const { width, height } = Dimensions.get('window');

// Same gradient as splash screen
const GRADIENT_COLORS: [string, string, string] = ['#1E3A8A', '#3B82F6', '#4ECDC4'];

// Stars
const STAR_COUNT = 12;
const STAR_SIZE = 3;
const STAR_AREA_HEIGHT_RATIO = 0.6;

// Rocket for ambient animation
const ROCKET_SIZE = width > 768 ? 60 : 40;

// Logo size
const LOGO_SIZE = width > 768 ? 320 : 240;

// Generate deterministic star positions
const generateStars = (count: number) => {
  const stars = [];
  const starAreaHeight = height * STAR_AREA_HEIGHT_RATIO;
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed * 9999) * 10000;
    return x - Math.floor(x);
  };
  for (let i = 0; i < count; i++) {
    stars.push({
      id: i,
      left: seededRandom(i * 1.7) * (width - 20) + 10,
      top: seededRandom(i * 2.9) * starAreaHeight + 20,
      opacity: 0.3 + seededRandom(i * 3.1) * 0.4,
    });
  }
  return stars;
};

// Slide animation durations
const SLIDE_IN_DURATION = 900;
const SLIDE_OUT_DURATION = 1200;

interface StartupLoadingScreenProps {
  onComplete: () => void;
  /** Called once the slide-in animation finishes — safe to mount content behind the overlay */
  onSlideInComplete?: () => void;
  onError?: (error: string) => void;
}

/**
 * StartupLoadingScreen - Full-screen loading with sync progress
 * 
 * Shows during app startup while syncing content:
 * 1. Spinning circle animation while syncing
 * 2. Progress text showing current phase
 * 3. Checkmark animation when complete
 * 4. Smooth transition to main menu
 */
export function StartupLoadingScreen({ onComplete, onSlideInComplete, onError }: StartupLoadingScreenProps) {
  const [statusText, setStatusText] = useState('Loading content...');
  const [detailText, setDetailText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);
  const playerRef = useRef<AudioPlayer | null>(null);

  // Slide: starts above viewport, slides down to 0, then slides back up on complete
  const slideY = useSharedValue(-height);

  // Rocket ambient animation — gentle orbit loop
  const rocketX = useSharedValue(width + ROCKET_SIZE);
  const rocketY = useSharedValue(height * 0.7);
  const rocketOpacity = useSharedValue(0);
  const starRotation = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.9);

  const stars = useMemo(() => generateStars(STAR_COUNT), []);

  const loadingCircleAnim = useLoadingCircleAnimation();
  const checkmarkAnim = useCheckmarkAnimation();
  const textFadeAnim = useTextFadeAnimation();

  // Track if component is mounted to prevent callbacks after unmount
  const isMountedRef = useRef(true);

  // Play success sound
  const playSuccessSound = async () => {
    try {
      if (playerRef.current) {
        playerRef.current.release();
      }
      const player = createAudioPlayer(require('@/assets/sounds/click.wav'));
      playerRef.current = player;
      player.play();
    } catch (error) {
      log.error('Error playing sound:', error);
    }
  };

  // Cleanup on unmount - cancel all animations to prevent display link crashes
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cancelAnimation(slideY);
      cancelAnimation(rocketX);
      cancelAnimation(rocketY);
      cancelAnimation(starRotation);
      loadingCircleAnim.stopAnimation();
      checkmarkAnim.reset();
      if (playerRef.current) {
        playerRef.current.release();
      }
    };
  }, []);

  // Start sync on mount — slide the background in first
  useEffect(() => {
    // Slide background down into view
    slideY.value = withTiming(0, {
      duration: SLIDE_IN_DURATION,
      easing: Easing.out(Easing.cubic),
    });

    // Fade in logo
    logoOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    logoScale.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });

    // Star twinkle rotation
    starRotation.value = withRepeat(
      withTiming(360, { duration: 4000, easing: Easing.linear }),
      -1
    );

    // Rocket: gentle fly-by from right to left
    rocketOpacity.value = withTiming(0.7, { duration: 400 });
    rocketX.value = withTiming(-ROCKET_SIZE * 2, {
      duration: 3000,
      easing: Easing.inOut(Easing.cubic),
    });
    rocketY.value = withTiming(height * 0.55, {
      duration: 3000,
      easing: Easing.inOut(Easing.cubic),
    });

    // Notify parent when slide-in finishes — safe to mount content behind the overlay
    const slideInTimer = setTimeout(() => {
      onSlideInComplete?.();
    }, SLIDE_IN_DURATION + 50);

    loadingCircleAnim.startAnimation();
    textFadeAnim.startFadeIn();
    
    const performSync = async () => {
      try {
        // Sync user profile first (nickname, avatar, settings)
        // This ensures profile is restored from server after app reset
        try {
          log.info('Syncing profile...');
          const profile = await ApiClient.getProfile();
          await ProfileSyncService.fullSync(profile);
          log.info('Profile synced');
        } catch (profileError) {
          // Profile sync is non-critical - user may not have a profile yet
          log.warn('Profile sync skipped:', profileError);
        }

        // Validate cache and remove any corrupted files before sync
        log.info('Validating cache...');
        setStatusText('Validating cache...');
        const cacheValidation = await CacheManager.validateAndCleanCache();
        if (cacheValidation.removed > 0) {
          log.warn(`Removed ${cacheValidation.removed} corrupted files from cache`);
        }

        log.info('Starting batch sync...');

        const stats = await BatchSyncService.performBatchSync((progress: BatchSyncProgress) => {
          // Update progress percentage
          setProgressPercent(progress.progress);

          // Update status text based on sync phase
          // Note: No download phases — assets are downloaded on-demand when user taps a story
          switch (progress.phase) {
            case 'version-check':
              setStatusText('Checking for updates...');
              setDetailText('');
              break;
            case 'fetching-delta':
              setStatusText('Fetching updates...');
              setDetailText('');
              break;
            case 'saving':
              setStatusText('Updating stories...');
              setDetailText('');
              break;
            case 'complete':
              setStatusText('Ready!');
              setDetailText('');
              break;
            case 'skipped':
              setStatusText('Already up to date');
              setDetailText('');
              break;
          }
        });

        log.info('Batch sync complete:', {
          storiesUpdated: stats.storiesUpdated,
          storiesDeleted: stats.storiesDeleted,
          assetsDownloaded: stats.assetsDownloaded,
          assetsFailed: stats.assetsFailed,
          apiCalls: stats.apiCalls,
          durationMs: stats.durationMs,
        });

        // Invalidate and pre-populate StoryLoader cache BEFORE transitioning to main menu
        // This ensures stories are immediately available when story selection screen loads
        StoryLoader.invalidateCache();
        await StoryLoader.getStories();
        log.info('StoryLoader cache populated with synced stories');

        // Show success animation
        setSyncComplete(true);
        loadingCircleAnim.stopAnimation();
        setShowCheckmark(true);
        textFadeAnim.startFadeOut();

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await playSuccessSound();

        checkmarkAnim.playCheckmarkEffect(() => {
          if (!isMountedRef.current) return;

          // Slide up to reveal the pre-mounted main menu underneath
          slideY.value = withTiming(-height, {
            duration: SLIDE_OUT_DURATION,
            easing: Easing.in(Easing.cubic),
          });

          setTimeout(() => {
            if (isMountedRef.current) onComplete();
          }, SLIDE_OUT_DURATION + 50);
        });

      } catch (error) {
        log.error('Sync failed:', error);
        setStatusText('Using offline content');
        loadingCircleAnim.stopAnimation();

        StoryLoader.invalidateCache();
        await StoryLoader.getStories();
        log.info('StoryLoader cache populated with bundled stories (offline fallback)');

        // On error, still slide up after a pause
        setTimeout(() => {
          if (!isMountedRef.current) return;
          slideY.value = withTiming(-height, {
            duration: SLIDE_OUT_DURATION,
            easing: Easing.in(Easing.cubic),
          });
          setTimeout(() => {
            if (isMountedRef.current) onComplete();
          }, SLIDE_OUT_DURATION + 50);
        }, 1000);
      }
    };
    
    performSync();
  }, []);

  const slideAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value }],
  }));

  const rocketAnimatedStyle = useAnimatedStyle(() => ({
    opacity: rocketOpacity.value,
    transform: [
      { translateX: rocketX.value },
      { translateY: rocketY.value },
      { rotate: '-30deg' },
    ],
  }));

  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${starRotation.value}deg` }],
  }));

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  return (
    <Animated.View style={[styles.container, slideAnimatedStyle]}>
      <LinearGradient
        colors={GRADIENT_COLORS}
        style={styles.gradientContainer}
      >
        {/* Stars */}
        <View style={styles.starsContainer}>
          {stars.map((star) => (
            <Animated.View
              key={`star-${star.id}`}
              style={[
                styles.star,
                starAnimatedStyle,
                { left: star.left, top: star.top, opacity: star.opacity },
              ]}
            />
          ))}
        </View>

        {/* Moon */}
        <View style={styles.moonContainer} pointerEvents="none">
          <Image
            source={require('@/assets/images/ui-elements/moon-top-screen.webp')}
            style={styles.moonImage}
            resizeMode="contain"
          />
        </View>

        {/* Bear */}
        <View style={styles.bearContainer} pointerEvents="none">
          <Image
            source={require('@/assets/images/ui-elements/bear-bottom-screen.webp')}
            style={styles.bearImage}
            resizeMode="contain"
          />
        </View>

        {/* Rocket fly-by */}
        <View style={styles.rocketLayer}>
          <Animated.View style={[styles.rocketWrapper, rocketAnimatedStyle]}>
            <FreyaRocketRightSvg width={ROCKET_SIZE} height={ROCKET_SIZE} />
          </Animated.View>
        </View>

        {/* Earlyroots logo */}
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <Image
            source={require('@/assets/images/ui-elements/earlyroots-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Loading / Checkmark + Status Text below logo */}
        <View style={styles.content}>
          <View style={styles.animationContainer}>
            {!showCheckmark && (
              <Animated.View style={loadingCircleAnim.animatedStyle}>
                <View style={styles.loadingCircle} />
              </Animated.View>
            )}

            {showCheckmark && (
              <Animated.View style={checkmarkAnim.checkmarkAnimatedStyle}>
                <LottieView
                  source={require('@/assets/animations/right-tick.json')}
                  autoPlay
                  loop={false}
                  style={styles.checkmark}
                />
              </Animated.View>
            )}
          </View>

          <Animated.View style={textFadeAnim.animatedStyle}>
            <Text style={styles.statusText}>{statusText}</Text>
            {detailText ? (
              <Text style={styles.detailText}>{detailText}</Text>
            ) : null}
          </Animated.View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  gradientContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 1,
  },
  star: {
    position: 'absolute',
    width: STAR_SIZE,
    height: STAR_SIZE,
    backgroundColor: '#FFFFFF',
    borderRadius: STAR_SIZE / 2,
  },
  moonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: '15%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 2,
  },
  moonImage: {
    width: 286,
    height: 286,
    opacity: 0.8,
  },
  bearContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: '15%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 2,
  },
  bearImage: {
    width: 286,
    height: 286,
    opacity: 0.8,
  },
  rocketLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: ROCKET_SIZE,
    height: ROCKET_SIZE,
    zIndex: 5,
  },
  rocketWrapper: {
    width: ROCKET_SIZE,
    height: ROCKET_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    position: 'absolute',
    top: (height - LOGO_SIZE) / 2 - 40,
    left: (width - LOGO_SIZE) / 2,
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  content: {
    position: 'absolute',
    bottom: height * 0.15,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 15,
  },
  animationContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderTopColor: 'transparent',
  },
  checkmark: {
    width: 80,
    height: 80,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
  },
  detailText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.6,
    marginTop: 6,
  },
});
