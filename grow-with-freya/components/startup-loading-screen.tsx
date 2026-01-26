import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';

import { useLoadingCircleAnimation, useCheckmarkAnimation, useTextFadeAnimation } from './auth/loading-animations';
import { BatchSyncService, BatchSyncProgress } from '@/services/batch-sync-service';
import { CacheManager } from '@/services/cache-manager';
import { StoryLoader } from '@/services/story-loader';
import { ApiClient } from '@/services/api-client';
import { ProfileSyncService } from '@/services/profile-sync-service';
import { StarBackground } from './ui/star-background';
import { Logger } from '@/utils/logger';

const log = Logger.create('StartupLoading');
const { width, height } = Dimensions.get('window');

// Same gradient as splash screen
const GRADIENT_COLORS = ['#1a1a2e', '#16213e', '#0f3460'] as const;

interface StartupLoadingScreenProps {
  onComplete: () => void;
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
export function StartupLoadingScreen({ onComplete, onError }: StartupLoadingScreenProps) {
  const [statusText, setStatusText] = useState('Loading content...');
  const [detailText, setDetailText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);
  const playerRef = useRef<AudioPlayer | null>(null);

  const screenOpacity = useSharedValue(1);

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
      // Cancel all Reanimated animations to prevent native crashes
      cancelAnimation(screenOpacity);
      loadingCircleAnim.stopAnimation();
      checkmarkAnim.reset();
      // Release audio player
      if (playerRef.current) {
        playerRef.current.release();
      }
    };
  }, []);

  // Start sync on mount
  useEffect(() => {
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
          switch (progress.phase) {
            case 'version-check':
              setStatusText('Checking for updates...');
              setDetailText('');
              break;
            case 'fetching-delta':
              setStatusText('Fetching updates...');
              setDetailText('');
              break;
            case 'batch-urls':
              setStatusText('Preparing downloads...');
              if (progress.detail?.currentBatch && progress.detail?.totalBatches) {
                setDetailText(`Batch ${progress.detail.currentBatch}/${progress.detail.totalBatches}`);
              } else {
                setDetailText('');
              }
              break;
            case 'downloading':
              // Show progress like "Downloading 45/176 assets..."
              setStatusText(progress.message || 'Downloading content...');
              if (progress.detail?.assetName) {
                setDetailText(progress.detail.assetName);
              } else {
                setDetailText('');
              }
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
          // Check if component is still mounted before proceeding
          if (!isMountedRef.current) return;

          // Fade out screen then call onComplete
          screenOpacity.value = withTiming(0, {
            duration: 400,
            easing: Easing.out(Easing.cubic),
          });

          setTimeout(() => {
            // Check mounted again before calling onComplete
            if (isMountedRef.current) {
              onComplete();
            }
          }, 450);
        });

      } catch (error) {
        log.error('Sync failed:', error);
        // Even on error, continue to main menu (bundled stories are always available)
        setStatusText('Using offline content');
        loadingCircleAnim.stopAnimation();

        // Still populate StoryLoader with bundled stories for offline use
        StoryLoader.invalidateCache();
        await StoryLoader.getStories();
        log.info('StoryLoader cache populated with bundled stories (offline fallback)');

        setTimeout(() => {
          // Check mounted before calling onComplete
          if (isMountedRef.current) {
            onComplete();
          }
        }, 1000);
      }
    };
    
    performSync();
  }, []);

  const screenAnimatedStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, screenAnimatedStyle]}>
      <LinearGradient colors={GRADIENT_COLORS} style={styles.gradient}>
        {/* Star background for visual consistency with main menu */}
        <StarBackground starCount={20} deferAnimation={false} />

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
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  animationContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loadingCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#4ECDC4',
    borderTopColor: 'transparent',
  },
  checkmark: {
    width: 120,
    height: 120,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
  },
  detailText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.6,
    marginTop: 8,
  },
});

