import { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, Text, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';

import { useLoadingCircleAnimation, useCheckmarkAnimation, useTextFadeAnimation } from './auth/loading-animations';
import { BatchSyncService, BatchSyncProgress } from '@/services/batch-sync-service';
import { CacheManager } from '@/services/cache-manager';
import { StoryLoader } from '@/services/story-loader';
import { ApiClient } from '@/services/api-client';
import { ProfileSyncService } from '@/services/profile-sync-service';
import { Logger } from '@/utils/logger';

const log = Logger.create('StartupLoading');
const { height } = Dimensions.get('window');

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

  return (
    <Animated.View style={[styles.container, slideAnimatedStyle]}>
      {/* Background — dark navy base with subtle background-home texture */}
      <View style={styles.backgroundImageContainer}>
        <Image
          source={require('../assets/images/ui-elements/background-home.webp')}
          style={styles.backgroundImage}
          resizeMode="repeat"
        />
      </View>

      <View style={styles.content}>
        {/* Loading Circle or Checkmark */}
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

        {/* Status Text */}
        <Animated.View style={textFadeAnim.animatedStyle}>
          <Text style={styles.statusText}>{statusText}</Text>
          {detailText ? (
            <Text style={styles.detailText}>{detailText}</Text>
          ) : null}
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  backgroundImageContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    backgroundColor: '#0F1D45',
  },
  backgroundImage: {
    width: '200%',
    height: '200%',
    opacity: 0.15,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
