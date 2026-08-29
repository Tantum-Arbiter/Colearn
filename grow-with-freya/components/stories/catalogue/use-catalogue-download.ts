import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { Easing, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { CatalogEntry } from '@/types/story';
import { StoryDownloadService, DownloadProgress } from '@/services/story-download-service';
import { StoryAccessService } from '@/services/story-access-service';
import { ApiClient } from '@/services/api-client';

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

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

export interface CatalogueDownloadCallbacks {
  onDownloadComplete?: (storyId: string) => void;
  onAuthError?: () => void;
  onDownloadLimitReached?: (entry: CatalogEntry) => void;
}

export function useCatalogueDownload(entry: CatalogEntry | null, callbacks: CatalogueDownloadCallbacks) {
  const { onDownloadComplete, onAuthError, onDownloadLimitReached } = callbacks;
  const [downloading, setDownloading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [downloadInfo, setDownloadInfo] = useState<string | null>(null);

  const lastBytesRef = useRef(0);
  const lastSpeedTimeRef = useRef(0);
  const downloadSessionRef = useRef(0);

  const progressValue = useSharedValue(0);
  const overlayOpacity = useSharedValue(1);
  const ringOpacity = useSharedValue(0);
  const ringScale = useSharedValue(1);
  const checkOpacity = useSharedValue(0);
  const checkScale = useSharedValue(0.5);
  const cardScale = useSharedValue(1);

  const resetToIdle = useCallback(() => {
    setDownloading(false);
    setStatusText(null);
    setDownloadInfo(null);
    lastBytesRef.current = 0;
    lastSpeedTimeRef.current = 0;
    progressValue.value = withTiming(0, { duration: 200 });
    ringOpacity.value = withTiming(0, { duration: 200 });
  }, [progressValue, ringOpacity]);

  const showAuthAlert = useCallback(() => {
    Alert.alert('Sign In Required', 'Please sign in to download stories.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign In', onPress: () => onAuthError?.() },
    ]);
  }, [onAuthError]);

  const handleFailure = useCallback(async (errorMsg: string) => {
    resetToIdle();
    if (isAuthError(errorMsg) && onAuthError) {
      showAuthAlert();
      return;
    }
    const isNetworkError = /network|fetch|timeout|connection|internet|abort/i.test(errorMsg);
    if (isNetworkError && onAuthError) {
      const isAuthed = await ApiClient.isAuthenticated();
      if (!isAuthed) {
        showAuthAlert();
        return;
      }
    }
    Alert.alert(
      'Download Failed',
      isNetworkError ? 'Please check your internet connection and try again.' : errorMsg,
      [{ text: 'OK' }],
    );
  }, [onAuthError, resetToIdle, showAuthAlert]);

  const startOrCancel = useCallback(async () => {
    if (!entry) return;

    if (downloading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      downloadSessionRef.current += 1;
      StoryDownloadService.cancelDownload(entry.storyId);
      resetToIdle();
      return;
    }
    if (complete) return;

    try {
      const { atLimit } = await StoryAccessService.checkDownloadLimit();
      if (atLimit) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onDownloadLimitReached?.(entry);
        return;
      }
    } catch (e) {
      console.warn('Download limit check failed, proceeding:', e);
    }

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
          if (downloadSessionRef.current !== session) return;

          if (p.phase === 'stalled') {
            setStatusText(p.message === 'Connection lost' ? 'Connection lost…' : 'Connection issue…');
            setDownloadInfo(null);
            return;
          }

          if (p.phase === 'downloading-assets' && p.detail) {
            const { bytesDownloaded = 0, totalBytes = 0 } = p.detail;
            const now = Date.now();
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

      if (downloadSessionRef.current !== session) return;

      if (result.cancelled) {
        resetToIdle();
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
          onDownloadComplete?.(entry.storyId);
        }, 1300);
      } else {
        await handleFailure(result.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      if (downloadSessionRef.current !== session) return;
      await handleFailure(err instanceof Error ? err.message : 'An unexpected error occurred.');
    }
  }, [entry, downloading, complete, onDownloadComplete, onDownloadLimitReached, handleFailure, resetToIdle, progressValue, ringOpacity, ringScale, checkOpacity, checkScale, overlayOpacity, cardScale]);

  return {
    downloading,
    complete,
    statusText,
    downloadInfo,
    progressValue,
    overlayOpacity,
    ringOpacity,
    ringScale,
    checkOpacity,
    checkScale,
    cardScale,
    startOrCancel,
  };
}
