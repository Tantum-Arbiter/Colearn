import React, { memo, useState, useCallback, useLayoutEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useAnimatedProps, useSharedValue, withTiming, withSpring, withSequence, withDelay, Easing, cancelAnimation } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { CatalogEntry, STORY_TAGS, getLocalizedText } from '@/types/story';
import { StoryDownloadService, DownloadProgress } from '@/services/story-download-service';
import { StoryAccessService } from '@/services/story-access-service';
import { ApiClient } from '@/services/api-client';
import { Fonts } from '@/constants/theme';
import type { SupportedLanguage } from '@/services/i18n';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Format bytes into a compact human-readable string. */
function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/** Check if an error message indicates an authentication / login problem */
function isAuthError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('not authenticated') ||
    lower.includes('authentication failed') ||
    lower.includes('token refresh failed') ||
    lower.includes('token refresh timeout') ||
    lower.includes('no refresh token') ||
    lower.includes('please login') ||
    lower.includes('login required') ||
    lower.includes('not_authenticated')
  );
}

interface CatalogStoryCardProps {
  entry: CatalogEntry;
  cardWidth: number;
  cardHeight: number;
  borderRadius: number;
  language: SupportedLanguage;
  onDownloadComplete?: (storyId: string) => void;
  /** Pixel offset for bubble-swap animation (negative = move left, positive = shift right) */
  swapTranslateX?: number;
  onLongPress?: (entry: CatalogEntry) => void;
  /** Called when download fails due to an auth error -parent should show sign-in flow */
  onAuthError?: () => void;
  /** Whether this story is locked behind a subscription paywall */
  isLocked?: boolean;
  /** Called when user taps a locked story -parent should show subscription overlay */
  onLockedPress?: () => void;
  /** Called when download is blocked because the tier download limit is reached */
  onDownloadLimitReached?: (entry: CatalogEntry) => void;
  /** Whether this story uses share-to-unlock (shows share icon instead of lock) */
  isShareToUnlock?: boolean;
  /** Called when user taps a share-to-unlock story -parent should open share sheet */
  onShareToUnlock?: (entry: CatalogEntry) => void;
}

export const CatalogStoryCard = memo(function CatalogStoryCard({
  entry,
  cardWidth,
  cardHeight,
  borderRadius,
  language,
  onDownloadComplete,
  swapTranslateX = 0,
  onLongPress,
  onAuthError,
  isLocked = false,
  onLockedPress,
  onDownloadLimitReached,
  isShareToUnlock = false,
  onShareToUnlock,
}: CatalogStoryCardProps) {
  const displayTitle = getLocalizedText(entry.localizedTitle, entry.title, language);
  const [downloading, setDownloading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null); // e.g. "Connection issue…"
  const [downloadInfo, setDownloadInfo] = useState<string | null>(null); // e.g. "1.2 MB / 3 MB • 400 KB/s"

  // Speed tracking refs (not state to avoid re-renders on every tick)
  const lastBytesRef = useRef(0);
  const lastSpeedTimeRef = useRef(0);

  // Animated values
  const progressValue = useSharedValue(0);     // 0-100 ring progress
  const overlayOpacity = useSharedValue(1);    // dark overlay
  const ringOpacity = useSharedValue(0);       // progress ring visibility
  const ringScale = useSharedValue(1);         // ring scale on completion
  const checkOpacity = useSharedValue(0);      // checkmark
  const checkScale = useSharedValue(0.5);      // checkmark scale
  const cardScale = useSharedValue(1);         // card pop on reveal
  const collapseWidth = useSharedValue(cardWidth + 15); // width including margin for collapse
  const swapTx = useSharedValue(0);            // bubble-swap translateX

  // Circular progress ring constants
  const RING_SIZE = 48;
  const RING_STROKE = 3.5;
  const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - progressValue.value / 100),
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const ringContainerStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  const checkmarkStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
    transform: [{ scale: checkScale.value }],
  }));

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  // Animate swap translateX when prop changes (bubble-swap effect)
  // useLayoutEffect ensures the shared value update commits BEFORE the frame is painted.
  // This prevents a one-frame gap where the FlatList has already shifted cells to new
  // layout positions but the old translateX offset is still applied (which doubles the
  // displacement and leaves an empty slot).
  useLayoutEffect(() => {
    if (swapTranslateX === 0) {
      cancelAnimation(swapTx);   // stop any in-flight animation immediately
      swapTx.value = 0;          // snap before paint -no visible artifact
    } else {
      swapTx.value = withTiming(swapTranslateX, {
        duration: 280,
        easing: Easing.inOut(Easing.ease),
      });
    }
  }, [swapTranslateX]);

  // Wrapper style for collapse + swap animation.
  // IMPORTANT: always include transform and zIndex so the native property set is stable.
  // Conditionally adding/removing these properties causes a native view‑tree structural
  // update that can desync from the value change and flash a gap for one frame.
  const collapseStyle = useAnimatedStyle(() => {
    const style: Record<string, unknown> = {
      transform: [{ translateX: swapTx.value }],
      zIndex: swapTx.value < 0 ? 10 : 1,
    };
    if (collapseWidth.value < cardWidth + 15) {
      style.width = collapseWidth.value;
      style.overflow = 'hidden';
    }
    return style;
  });

  // Tracks the current download "session". Incremented on cancel so old
  // promise resolutions are silently ignored (prevents stale state updates).
  const downloadSessionRef = useRef(0);

  /** Reset the card to its idle (not-downloading) state. */
  const resetToIdle = useCallback(() => {
    setDownloading(false);
    setStatusText(null);
    setDownloadInfo(null);
    lastBytesRef.current = 0;
    lastSpeedTimeRef.current = 0;
    progressValue.value = withTiming(0, { duration: 200 });
    ringOpacity.value = withTiming(0, { duration: 200 });
  }, [progressValue, ringOpacity]);

  const handlePress = useCallback(async () => {
    // ── Share-to-unlock story -open share sheet ──
    if (isShareToUnlock) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onShareToUnlock?.(entry);
      return;
    }

    // ── Locked story -show subscription overlay ──
    if (isLocked) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onLockedPress?.();
      return;
    }

    // ── Tap to cancel -immediate, no confirmation dialog ──
    if (downloading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      downloadSessionRef.current += 1; // invalidate old session
      StoryDownloadService.cancelDownload(entry.storyId);
      resetToIdle();
      return;
    }
    if (complete) return;

    // ── Check download limit before starting ──
    try {
      const { atLimit } = await StoryAccessService.checkDownloadLimit();
      if (atLimit) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onDownloadLimitReached?.(entry);
        return;
      }
    } catch (e) {
      // If limit check fails, proceed with download anyway
      console.warn('Download limit check failed, proceeding:', e);
    }

    // No network pre-check -start immediately, fail fast on actual error.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const session = ++downloadSessionRef.current;
    setDownloading(true);
    setStatusText(null);
    ringOpacity.value = withTiming(1, { duration: 200 });

    try {
      const result = await StoryDownloadService.downloadStory(
        entry.storyId,
        entry,
        (p: DownloadProgress) => {
          // Ignore callbacks from a stale session
          if (downloadSessionRef.current !== session) return;

          if (p.phase === 'stalled') {
            setStatusText(p.message === 'Connection lost' ? 'Connection lost…' : 'Connection issue…');
            setDownloadInfo(null); // hide speed/size when stalled
            return;
          }

          if (p.phase === 'downloading-assets' && p.detail) {
            const { bytesDownloaded = 0, totalBytes = 0 } = p.detail;
            const now = Date.now();

            // Compute speed (bytes/s) from delta since last callback
            let speedStr = '';
            if (lastSpeedTimeRef.current > 0 && bytesDownloaded > lastBytesRef.current) {
              const elapsed = (now - lastSpeedTimeRef.current) / 1000;
              if (elapsed > 0) {
                const speed = (bytesDownloaded - lastBytesRef.current) / elapsed;
                speedStr = ` · ${formatBytes(speed)}/s`;
              }
            }
            lastBytesRef.current = bytesDownloaded;
            lastSpeedTimeRef.current = now;

            const sizePart = totalBytes > 0
              ? `${formatBytes(bytesDownloaded)} / ${formatBytes(totalBytes)}`
              : formatBytes(bytesDownloaded);
            setDownloadInfo(`${sizePart}${speedStr}`);
          }

          if (p.progress >= 0) {
            setStatusText(null);
            progressValue.value = withTiming(p.progress, { duration: 800, easing: Easing.linear });
          }
        }
      );

      // Ignore result from a stale session (user already cancelled & may have retried)
      if (downloadSessionRef.current !== session) return;

      // ── Cancelled (user tap or auto-cancel from stall) ──
      if (result.cancelled) {
        resetToIdle();
        // Show error only for auto-cancel (stall/timeout), not user-initiated
        if (result.error && !result.error.includes('cancelled by user')) {
          Alert.alert('Download Failed', 'Connection lost. Please check your internet and try again.', [{ text: 'OK' }]);
        }
        return;
      }

      if (result.success) {
        setStatusText(null);
        setDownloadInfo(null);

        if (result.partialFailure) {
          Alert.alert(
            'Download Complete',
            `Some content may be missing (${result.assetsFailed} file${result.assetsFailed === 1 ? '' : 's'} failed). ` +
            'You can delete and re-download the story to try again.',
            [{ text: 'OK' }],
          );
        }

        progressValue.value = withTiming(100, { duration: 300, easing: Easing.out(Easing.ease) });
        ringScale.value = withDelay(300, withTiming(1.8, { duration: 350, easing: Easing.out(Easing.ease) }));
        ringOpacity.value = withDelay(300, withTiming(0, { duration: 350 }));
        checkOpacity.value = withDelay(400, withTiming(1, { duration: 200 }));
        checkScale.value = withDelay(400, withSpring(1, { damping: 12, stiffness: 200 }));
        overlayOpacity.value = withDelay(500, withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }));
        cardScale.value = withDelay(600, withSequence(
          withSpring(1.04, { damping: 15, stiffness: 300 }),
          withSpring(1, { damping: 15, stiffness: 300 })
        ));
        checkOpacity.value = withDelay(900, withTiming(0, { duration: 300 }));
        checkScale.value = withDelay(900, withTiming(1.3, { duration: 300 }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setComplete(true);

        setTimeout(() => {
          if (onDownloadComplete) onDownloadComplete(entry.storyId);
        }, 1300);
      } else {
        resetToIdle();
        const errorMsg = result.error || 'Something went wrong. Please try again.';
        if (isAuthError(errorMsg) && onAuthError) {
          Alert.alert('Sign In Required', 'Please sign in to download stories.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign In', onPress: () => onAuthError() },
          ]);
        } else {
          // Detect network errors -but first check if the real problem is auth
          const isNetworkError = /network|fetch|timeout|connection|internet|abort/i.test(errorMsg);
          if (isNetworkError && onAuthError) {
            // Network error might be a masked auth failure (token refresh fetch failed)
            const isAuthed = await ApiClient.isAuthenticated();
            if (!isAuthed) {
              Alert.alert('Sign In Required', 'Please sign in to download stories.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign In', onPress: () => onAuthError() },
              ]);
              return;
            }
          }
          Alert.alert(
            'Download Failed',
            isNetworkError
              ? 'Please check your internet connection and try again.'
              : errorMsg,
            [{ text: 'OK' }],
          );
        }
      }
    } catch (err) {
      if (downloadSessionRef.current !== session) return;
      resetToIdle();
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      if (isAuthError(errorMsg) && onAuthError) {
        Alert.alert('Sign In Required', 'Please sign in to download stories.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => onAuthError() },
        ]);
      } else {
        const isNetworkError = /network|fetch|timeout|connection|internet|abort/i.test(errorMsg);
        if (isNetworkError && onAuthError) {
          const isAuthed = await ApiClient.isAuthenticated();
          if (!isAuthed) {
            Alert.alert('Sign In Required', 'Please sign in to download stories.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign In', onPress: () => onAuthError() },
            ]);
            return;
          }
        }
        Alert.alert(
          'Download Failed',
          isNetworkError
            ? 'Please check your internet connection and try again.'
            : 'An unexpected error occurred. Please try again.',
          [{ text: 'OK' }],
        );
      }
    }
  }, [downloading, complete, entry, isLocked, onLockedPress, onDownloadLimitReached, onDownloadComplete, onAuthError, progressValue, ringOpacity, ringScale, checkOpacity, checkScale, overlayOpacity, cardScale, resetToIdle]);

  const handleLongPress = useCallback(() => {
    if (downloading) return;
    onLongPress?.(entry);
  }, [downloading, entry, onLongPress]);

  return (
    <Animated.View style={collapseStyle}>
    <Pressable onPress={handlePress} onLongPress={handleLongPress} delayLongPress={400} style={cardStyles.pressable}>
      <Animated.View style={[cardStyles.card, { width: cardWidth, height: cardHeight, borderRadius }, cardAnimStyle]}>
        {/* Thumbnail image */}
        {entry.thumbnailUrl ? (
          <Image
            source={{ uri: entry.thumbnailUrl, cacheKey: `catalog-thumb-${entry.storyId}` }}
            style={[cardStyles.coverImage, { width: cardWidth, height: cardHeight, borderRadius }]}
            contentFit="cover"
            transition={0}
            cachePolicy="memory-disk"
            onError={(e) => console.warn(`[CatalogCard] Image failed for ${entry.storyId}:`, e)}
          />
        ) : (
          <View style={[cardStyles.placeholder, { width: cardWidth, height: cardHeight, borderRadius }]}>
            <Text style={cardStyles.emoji}>{STORY_TAGS[entry.category].emoji}</Text>
          </View>
        )}

        {/* Dark overlay -stays full during download, fades on completion */}
        <Animated.View style={[cardStyles.darkOverlay, { borderRadius }, overlayStyle]} />

        {/* Share / Lock / Download icon (before downloading) */}
        {!downloading && !complete && (
          <View style={cardStyles.iconContainer}>
            {isShareToUnlock ? (
              <View style={cardStyles.shareCircle}>
                <Ionicons name="share-outline" size={22} color="#FFFFFF" />
              </View>
            ) : isLocked ? (
              <View style={cardStyles.lockCircle}>
                <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
              </View>
            ) : (
              <View style={cardStyles.iconCircle}>
                <Ionicons name="cloud-download-outline" size={22} color="#FFFFFF" />
              </View>
            )}
          </View>
        )}

        {/* Circular progress ring (during download) -tap to cancel */}
        {downloading && (
          <Animated.View style={[cardStyles.iconContainer, ringContainerStyle]}>
            <View style={cardStyles.ringWrapper}>
              <Svg width={RING_SIZE} height={RING_SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  stroke="rgba(255, 255, 255, 0.2)"
                  strokeWidth={RING_STROKE}
                  fill="rgba(0, 0, 0, 0.3)"
                />
                <AnimatedCircle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  stroke={statusText ? '#FFD93D' : '#4ECDC4'}
                  strokeWidth={RING_STROKE}
                  fill="transparent"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  animatedProps={animatedCircleProps}
                  strokeLinecap="round"
                />
              </Svg>
              {/* Small stop/cancel icon centred inside the ring */}
              <View style={cardStyles.cancelIcon}>
                <Ionicons name="stop" size={14} color="rgba(255,255,255,0.7)" />
              </View>
            </View>
            {/* Status: stall message takes priority, otherwise show speed/size */}
            {statusText ? (
              <Text style={cardStyles.stallText}>{statusText}</Text>
            ) : downloadInfo ? (
              <Text style={cardStyles.downloadInfoText} numberOfLines={1}>{downloadInfo}</Text>
            ) : null}
          </Animated.View>
        )}

        {/* Checkmark on completion */}
        {complete && (
          <Animated.View style={[cardStyles.iconContainer, checkmarkStyle]}>
            <View style={cardStyles.checkCircle}>
              <Ionicons name="checkmark" size={26} color="#FFFFFF" />
            </View>
          </Animated.View>
        )}

        {/* Free badge */}
        {entry.isFree && !downloading && !complete && (
          <View style={cardStyles.freeBadge}>
            <Text style={cardStyles.freeBadgeText}>FREE</Text>
          </View>
        )}
      </Animated.View>

      {/* Title below the card */}
      <View style={[cardStyles.titleContainer, { width: cardWidth }]}>
        <Text style={cardStyles.title} numberOfLines={2}>{displayTitle}</Text>
      </View>
    </Pressable>
    </Animated.View>
  );
});

const cardStyles = StyleSheet.create({
  pressable: {
    marginRight: 15,
  },
  card: {
    backgroundColor: '#666',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  coverImage: {
    backgroundColor: '#e8e8e8',
  },
  placeholder: {
    backgroundColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 36,
    opacity: 0.5,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  iconContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  lockCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 200, 50, 0.7)',
  },
  shareCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(100, 180, 255, 0.7)',
  },
  checkCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(78, 205, 196, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  freeBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  freeBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  titleContainer: {
    paddingTop: 6,
    paddingHorizontal: 2,
  },
  title: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: Fonts.rounded,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    minHeight: 32,
  },
  ringWrapper: {
    position: 'relative',
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelIcon: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadInfoText: {
    position: 'absolute',
    bottom: 6,
    color: 'rgba(255, 255, 255, 0.65)',
    fontFamily: Fonts.rounded,
    fontSize: 8,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    paddingHorizontal: 4,
  },
  stallText: {
    position: 'absolute',
    bottom: 6,
    color: '#FFD93D',
    fontFamily: Fonts.rounded,
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
