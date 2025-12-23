import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, StatusBar, Image, ImageBackground, ScrollView, NativeSyntheticEvent, NativeScrollEvent, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Audio } from 'expo-av';
import { Story, StoryPage, STORY_TAGS } from '@/types/story';
import { Fonts } from '@/constants/theme';
import { useStoryTransition } from '@/contexts/story-transition-context';
import { StoryCompletionScreen } from './story-completion-screen';
import { MusicControl } from '../ui/music-control';
import { ParentsOnlyModal } from '../ui/parents-only-modal';
import { useAppStore } from '@/store/app-store';
import { useAccessibility, TEXT_SIZE_OPTIONS } from '@/hooks/use-accessibility';
import { useParentsOnlyChallenge } from '@/hooks/use-parents-only-challenge';
import * as Haptics from 'expo-haptics';
import { voiceRecordingService, VoiceOver } from '@/services/voice-recording-service';
import { useGlobalSound } from '@/contexts/global-sound-context';



interface StoryBookReaderProps {
  story: Story;
  onExit: () => void;
  onReadAnother?: (story: Story) => void;
  onBedtimeMusic?: () => void;
}

export function StoryBookReader({ story, onExit, onReadAnother, onBedtimeMusic }: StoryBookReaderProps) {
  const insets = useSafeAreaInsets();
  const { isTransitioning: isStoryTransitioning, completeTransition } = useStoryTransition();
  const [currentPageIndex, setCurrentPageIndex] = useState(0); // Start with cover page
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isOrientationTransitioning, setIsOrientationTransitioning] = useState(false);
  const [isLandscapeReady, setIsLandscapeReady] = useState(false);

  const [preloadedPages, setPreloadedPages] = useState<Set<number>>(new Set());
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<'main' | 'fontSize' | null>(null);
  const [readingMode, setReadingMode] = useState<'read' | 'record' | 'narrate'>('read');

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [currentVoiceOver, setCurrentVoiceOver] = useState<VoiceOver | null>(null);
  const [showVoiceOverNameModal, setShowVoiceOverNameModal] = useState(false);
  const [voiceOverName, setVoiceOverName] = useState('');
  const [currentRecordingUri, setCurrentRecordingUri] = useState<string | null>(null);
  const [tempRecordingUri, setTempRecordingUri] = useState<string | null>(null);
  const [tempRecordingDuration, setTempRecordingDuration] = useState(0);
  const [playbackSound, setPlaybackSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [availableVoiceOvers, setAvailableVoiceOvers] = useState<VoiceOver[]>([]);
  const [showVoiceOverSelectModal, setShowVoiceOverSelectModal] = useState(false);
  const [selectedVoiceOver, setSelectedVoiceOver] = useState<VoiceOver | null>(null);
  const [isOverwriteSession, setIsOverwriteSession] = useState(false);
  const [isNewVoiceOver, setIsNewVoiceOver] = useState(false);
  const [narrationProgress, setNarrationProgress] = useState(0);
  const [narrationDuration, setNarrationDuration] = useState(0);
  const [shouldAutoStopRecording, setShouldAutoStopRecording] = useState(false);
  const [shouldAutoAdvance, setShouldAutoAdvance] = useState(false);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textScrollViewRef = useRef<ScrollView>(null);

  // Parents Only modal - using shared hook
  const parentsOnly = useParentsOnlyChallenge();

  // Background music control for recording
  const globalSound = useGlobalSound();
  const [wasMusicPlayingBeforeRecording, setWasMusicPlayingBeforeRecording] = useState(false);

  // Accessibility scaling
  const { scaledFontSize, scaledButtonSize, textSizeScale } = useAccessibility();
  const setTextSizeScale = useAppStore((state) => state.setTextSizeScale);

  // Track if text box needs scrolling (for larger text sizes)
  const [canScrollText, setCanScrollText] = useState(false);
  // true = show up arrow (user is at bottom), false = show down arrow (user is at top/middle)
  const [showUpArrow, setShowUpArrow] = useState(false);

  // Reset scroll state when page changes and scroll to top
  useEffect(() => {
    setCanScrollText(false);
    setShowUpArrow(false);
    setScrollViewHeight(0);
    setTextContentHeight(0);
    // Scroll to top of text box when page changes
    textScrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, [currentPageIndex]);

  // Handle text scroll events - track position for up/down indicators
  const handleTextScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    // Add small tolerance for edge detection
    const isAtBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 10;
    const isAtTop = contentOffset.y <= 5;
    // Show up arrow only when at bottom (and not at top for single-screen content)
    setShowUpArrow(isAtBottom && !isAtTop);
  }, []);

  // Track ScrollView layout height for accurate overflow detection
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [textContentHeight, setTextContentHeight] = useState(0);

  // Check if text can scroll whenever either dimension changes
  useEffect(() => {
    if (scrollViewHeight > 0 && textContentHeight > 0) {
      setCanScrollText(textContentHeight > scrollViewHeight + 2);
    }
  }, [scrollViewHeight, textContentHeight]);

  // Handle text content size change to detect overflow
  const handleTextContentSizeChange = useCallback((contentWidth: number, contentHeight: number) => {
    setTextContentHeight(contentHeight);
  }, []);

  // Handle ScrollView layout to get actual visible height
  const handleScrollViewLayout = useCallback((event: { nativeEvent: { layout: { height: number } } }) => {
    setScrollViewHeight(event.nativeEvent.layout.height);
  }, []);



  // Completion screen entrance animation
  const completionOpacity = useSharedValue(0);
  const completionScale = useSharedValue(0.8);

  // Soft fade exit animation
  const scrollUpOpacity = useSharedValue(1);



  // Simple single page approach - no caching needed


  useEffect(() => {
    let isMounted = true;

    const checkAndSetLandscape = async () => {
      try {
        console.log('Story reader mounted - checking orientation...');


        const orientation = await ScreenOrientation.getOrientationAsync();
        const isLandscape = orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
                           orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;

        if (isLandscape) {
          console.log('Already in landscape from thumbnail expansion');
          setIsLandscapeReady(true);
        } else {
          console.log('Not in landscape yet - thumbnail expansion should have handled this');

          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
          console.log('Fallback landscape transition complete');
          setIsLandscapeReady(true);
        }
      } catch (error) {
        console.warn('Failed to check/set orientation:', error);
        setIsLandscapeReady(true); // Continue anyway
      }
    };

    checkAndSetLandscape();


    return () => {
      if (isMounted) {
        isMounted = false;
        console.log('Restoring portrait orientation...');
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
          .then(() => console.log('Successfully restored to portrait'))
          .catch(error => console.warn('Failed to restore orientation:', error));
      }
    };
  }, []);

  // Handle story fade-in animation and initial preloading (only once when component mounts)
  useEffect(() => {
    console.log('Story reader starting - book opening animation');

    // Start with book in closed state
    exitScale.value = 0.3;
    exitOpacity.value = 0;
    exitRotateY.value = -90;
    storyOpacity.value = 1;

    // Book opening animation (reverse of closing)
    // Phase 1: Initial opening
    exitScale.value = withTiming(0.8, { duration: 400, easing: Easing.out(Easing.cubic) });
    exitOpacity.value = withTiming(0.7, { duration: 400, easing: Easing.out(Easing.cubic) });
    exitRotateY.value = withTiming(-20, { duration: 400, easing: Easing.out(Easing.cubic) });

    // Phase 2: Full opening after delay
    setTimeout(() => {
      exitScale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
      exitOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
      exitRotateY.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) });
    }, 400);



    // Preload all story pages immediately for instant navigation
    console.log('Starting aggressive preload of all story pages');
    const pages = story.pages || [];
    pages.forEach((page, index) => {
      if (page.backgroundImage) {
        const source = typeof page.backgroundImage === 'string'
          ? { uri: page.backgroundImage }
          : page.backgroundImage;

        if (source.uri) {
          Image.prefetch(source.uri).catch(() => {});
        }
      }

      if (page.characterImage) {
        const source = typeof page.characterImage === 'string'
          ? { uri: page.characterImage }
          : page.characterImage;

        if (source.uri) {
          Image.prefetch(source.uri).catch(() => {});
        }
      }
    });

    // Mark all pages as preloaded
    setPreloadedPages(new Set(pages.map((_, index) => index)));
    console.log(`Preloaded all ${pages.length} story pages for instant navigation`);
  }, []); // Empty dependency array ensures this only runs once

  // Preload adjacent pages when current page changes (skip on last page)
  useEffect(() => {
    if (isLandscapeReady) {
      const pages = story.pages || [];
      const isLastPage = currentPageIndex >= pages.length - 1;

      // Don't preload on last page to avoid interference with completion transition
      if (!isLastPage) {
        preloadAdjacentPages(currentPageIndex);
      } else {
        console.log('Skipping preload on last page to ensure clean completion transition');
      }
    }
  }, [currentPageIndex, isLandscapeReady]);

  // Get screen dimensions for landscape layout (forced for all devices in story mode)
  const [screenDimensions, setScreenDimensions] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return { width, height };
  });

  // Update dimensions when orientation changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenDimensions({ width: window.width, height: window.height });
    });

    return () => subscription?.remove();
  }, []);

  const { width: screenWidth, height: screenHeight } = screenDimensions;
  const isTablet = Math.min(screenWidth, screenHeight) >= 768; // iPad and larger
  const isLandscape = screenWidth > screenHeight;

  // Image resize mode based on device type
  const imageResizeMode = isTablet ? 'contain' : 'cover';

  // Aggressive preloading for instant page transitions
  const preloadAdjacentPages = (currentIndex: number) => {
    const pages = story.pages || [];
    const pagesToPreload = [];
    const isLastPage = currentIndex >= pages.length - 1;

    // Skip preloading entirely if we're on the last page
    if (isLastPage) {
      console.log('On last page - skipping all preloading to ensure clean completion');
      return;
    }

    // Preload 2 pages in each direction for ultra-smooth navigation
    for (let i = Math.max(0, currentIndex - 2); i <= Math.min(pages.length - 1, currentIndex + 2); i++) {
      if (i !== currentIndex) {
        pagesToPreload.push(i);
      }
    }

    pagesToPreload.forEach((pageIndex) => {
      if (!preloadedPages.has(pageIndex)) {
        const page = pages[pageIndex];
        if (page) {
          console.log(`Preloading page ${pageIndex} for instant transitions`);

          // Preload background image with high priority
          if (page.backgroundImage) {
            const source = typeof page.backgroundImage === 'string'
              ? { uri: page.backgroundImage }
              : page.backgroundImage;

            // Use Image.prefetch for local images, or direct prefetch for URIs
            if (source.uri) {
              Image.prefetch(source.uri).catch(() => {});
            } else {
              // For require() images, they're already bundled - just mark as preloaded
            }
          }

          // Preload character image
          if (page.characterImage) {
            const source = typeof page.characterImage === 'string'
              ? { uri: page.characterImage }
              : page.characterImage;

            if (source.uri) {
              Image.prefetch(source.uri).catch(() => {});
            }
          }

          // Mark as preloaded immediately for tracking
          setPreloadedPages(prev => new Set([...prev, pageIndex]));
        }
      }
    });
  };

  // Handle story completion with book closing animation
  const handleStoryCompletion = async () => {
    try {
      console.log('Starting story completion transition...');

      // In record mode, go back to cover page instead of showing completion screen
      if (readingMode === 'record') {
        console.log('Recording complete - returning to cover page');
        const voiceOverName = currentVoiceOver?.name || 'this story';
        // Reset recording state
        setTempRecordingUri(null);
        setCurrentRecordingUri(null);
        setIsNewVoiceOver(false);
        setIsOverwriteSession(false);
        setReadingMode('read');
        setCurrentVoiceOver(null);
        // Go back to cover page
        setCurrentPageIndex(0);
        // Ensure page opacity is correct
        currentPageOpacity.value = 1;
        Alert.alert(
          'Recording Complete',
          `Your voice recording for "${voiceOverName}" has been saved.`,
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('Waiting for final page to settle...');
      await new Promise(resolve => {
        // Use requestAnimationFrame to ensure render cycle is complete
        requestAnimationFrame(() => {
          // Add small additional delay to ensure image rendering is complete
          setTimeout(resolve, 50);
        });
      });

      // Start book closing animation
      console.log('Starting completion animation phase 1');
      exitScale.value = withTiming(0.8, { duration: 400, easing: Easing.out(Easing.cubic) });
      exitOpacity.value = withTiming(0.7, { duration: 400, easing: Easing.out(Easing.cubic) });
      exitRotateY.value = withTiming(-20, { duration: 400, easing: Easing.out(Easing.cubic) });


      await new Promise(resolve => setTimeout(resolve, 400));

      // Continue closing animation
      exitScale.value = withTiming(0.3, { duration: 600, easing: Easing.in(Easing.cubic) });
      exitOpacity.value = withTiming(0, { duration: 600, easing: Easing.in(Easing.cubic) });
      exitRotateY.value = withTiming(-90, { duration: 600, easing: Easing.in(Easing.cubic) });


      await new Promise(resolve => setTimeout(resolve, 600));

      // Show completion screen with entrance animation
      console.log('Book closing animation complete - animating in completion screen');
      setShowCompletionScreen(true);

      // Small delay to ensure completion screen is mounted, then animate in
      await new Promise(resolve => setTimeout(resolve, 50));

      // Animate completion screen entrance
      completionOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
      completionScale.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });

      // Reset animation values for potential re-entry
      exitScale.value = 1;
      exitOpacity.value = 1;
      exitRotateY.value = 0;

    } catch (error) {
      console.error('Error during story completion transition:', error);
      // Fallback: show completion screen immediately
      setShowCompletionScreen(true);
    }
  };

  // Handle exit with orientation restore
  const handleExit = async () => {
    try {
      console.log('Starting exit transition...');

      // Start book closing animation
      console.log('Starting exit animation phase 1');
      exitScale.value = withTiming(0.8, { duration: 300, easing: Easing.out(Easing.cubic) });
      exitOpacity.value = withTiming(0.7, { duration: 300, easing: Easing.out(Easing.cubic) });
      exitRotateY.value = withTiming(-20, { duration: 300, easing: Easing.out(Easing.cubic) });


      await new Promise(resolve => setTimeout(resolve, 300));

      // Continue closing animation
      exitScale.value = withTiming(0.3, { duration: 400, easing: Easing.in(Easing.cubic) });
      exitOpacity.value = withTiming(0, { duration: 400, easing: Easing.in(Easing.cubic) });
      exitRotateY.value = withTiming(-90, { duration: 400, easing: Easing.in(Easing.cubic) });


      await new Promise(resolve => setTimeout(resolve, 400));

      // Restore portrait orientation
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      console.log('Successfully restored to portrait on exit');

      // Small delay for orientation change
      await new Promise(resolve => setTimeout(resolve, 200));

      onExit();
    } catch (error) {
      console.warn('Failed to restore orientation on exit:', error);
      onExit();
    }
  };
  
  // Simple fade animation for story reader
  const storyOpacity = useSharedValue(0); // Start invisible, fade in

  // Book opening animation (triggered when cover is tapped)
  const bookOpeningScale = useSharedValue(1);
  const bookOpeningRotateY = useSharedValue(0);

  // Simple single page opacity - just like cover tap
  const currentPageOpacity = useSharedValue(1);

  // Exit animation values
  const exitScale = useSharedValue(1);
  const exitOpacity = useSharedValue(1);
  const exitRotateY = useSharedValue(0);


  
  // Get story pages or create default pages if none exist
  const pages = story.pages || [];
  const currentPage = pages[currentPageIndex];

  // No caching needed - simple single page approach

  // Handle cover tap to go directly to page 1
  const handleCoverTap = () => {
    if (currentPageIndex !== 0) return; // Only work on cover page

    // In record mode, require a voice over profile to be selected first
    if (readingMode === 'record' && !currentVoiceOver) {
      setShowVoiceOverNameModal(true);
      return;
    }

    // In narrate mode, require a voice over profile to be selected first
    if (readingMode === 'narrate' && !currentVoiceOver) {
      setShowVoiceOverSelectModal(true);
      return;
    }

    console.log('Cover tapped - going directly to page 1');

    // Go directly to page 1 with no animation
    setCurrentPageIndex(1);
  };
  const storyTag = story.category ? STORY_TAGS[story.category] : null;

  // Initialize voice recording service and load voice overs
  useEffect(() => {
    const initRecording = async () => {
      await voiceRecordingService.initialize();
      const voiceOvers = await voiceRecordingService.getVoiceOversForStory(story.id);
      setAvailableVoiceOvers(voiceOvers);
    };
    initRecording();

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (playbackSound) {
        playbackSound.unloadAsync();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story.id]);

  // Load existing recording when page changes (in record mode)
  useEffect(() => {
    // Stop any current playback
    setIsPlaying(false);
    if (playbackSound) {
      playbackSound.stopAsync();
    }

    // In record mode, check if there's an existing recording for this page
    if (readingMode === 'record' && currentVoiceOver && currentPageIndex > 0) {
      const existingRecording = currentVoiceOver.pageRecordings[currentPageIndex];
      if (existingRecording) {
        setCurrentRecordingUri(existingRecording.uri);
        console.log(`Loaded existing recording for page ${currentPageIndex}: ${existingRecording.uri}`);
      } else {
        setCurrentRecordingUri(null);
      }
    } else {
      setCurrentRecordingUri(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPageIndex, readingMode, currentVoiceOver]);

  // Recording functions
  const startRecordingNow = async (activeVoiceOver: VoiceOver) => {
    try {
      // Pause background music before recording
      if (globalSound.isPlaying) {
        setWasMusicPlayingBeforeRecording(true);
        await globalSound.pause();
        console.log('Background music paused for recording');
      } else {
        setWasMusicPlayingBeforeRecording(false);
      }

      const success = await voiceRecordingService.startRecording();
      if (success) {
        setIsRecording(true);
        setRecordingDuration(0);
        setShouldAutoStopRecording(false);
        recordingTimerRef.current = setInterval(() => {
          setRecordingDuration(prev => {
            if (prev >= 29) {
              // Set flag to trigger auto-stop via useEffect (don't call async from state update)
              setShouldAutoStopRecording(true);
              return 30;
            }
            return prev + 1;
          });
        }, 1000);
      } else {
        // Resume music if recording failed
        if (wasMusicPlayingBeforeRecording) {
          await globalSound.play();
        }
        Alert.alert('Permission Required', 'Microphone access is needed to record your voice.');
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      // Resume music if recording failed
      if (wasMusicPlayingBeforeRecording) {
        await globalSound.play();
      }
      Alert.alert('Recording Error', 'Failed to start recording. Please try again.');
    }
  };

  const handleStartRecording = async (voiceOverToUse?: VoiceOver, skipOverwriteCheck?: boolean) => {
    const activeVoiceOver = voiceOverToUse || currentVoiceOver;

    if (!activeVoiceOver) {
      setShowVoiceOverNameModal(true);
      return;
    }

    // Check if there's an existing recording for this page
    // Skip if: overwrite session already started, explicitly skipped, or it's a newly created voice over
    if (!isOverwriteSession && !skipOverwriteCheck && !isNewVoiceOver) {
      const existingRecording = activeVoiceOver.pageRecordings[currentPageIndex];
      if (existingRecording || tempRecordingUri) {
        Alert.alert(
          'Overwrite Recording?',
          'This page already has a recording. Are you sure you want to overwrite it with a new recording?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Overwrite',
              style: 'destructive',
              onPress: () => {
                setTempRecordingUri(null);
                setCurrentRecordingUri(null);
                startRecordingNow(activeVoiceOver);
              },
            },
          ]
        );
        return;
      }
    }

    // Clear temp recording if re-recording on same page
    if (tempRecordingUri) {
      setTempRecordingUri(null);
      setCurrentRecordingUri(null);
    }

    startRecordingNow(activeVoiceOver);
  };

  const handleStopRecording = async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setShouldAutoStopRecording(false);

    const result = await voiceRecordingService.stopRecording();
    setIsRecording(false);

    // Resume background music if it was playing before recording
    if (wasMusicPlayingBeforeRecording) {
      await globalSound.play();
      console.log('Background music resumed after recording');
      setWasMusicPlayingBeforeRecording(false);
    }

    if (result) {
      // Store temp recording - will be saved permanently when user clicks next
      setTempRecordingUri(result.uri);
      setTempRecordingDuration(result.duration);
      setCurrentRecordingUri(result.uri);
    }
  };

  // Auto-stop recording when 30 seconds is reached
  useEffect(() => {
    if (shouldAutoStopRecording && isRecording) {
      handleStopRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAutoStopRecording, isRecording]);

  const saveCurrentRecording = async () => {
    if (!tempRecordingUri || !currentVoiceOver) return;

    try {
      const savedUri = await voiceRecordingService.saveRecording(
        story.id,
        currentVoiceOver.id,
        currentPageIndex,
        tempRecordingUri,
        tempRecordingDuration
      );
      if (savedUri) {
        await voiceRecordingService.addPageRecording(
          currentVoiceOver.id,
          currentPageIndex,
          savedUri,
          tempRecordingDuration
        );
        // Refresh voice over data
        const updatedVoiceOvers = await voiceRecordingService.getVoiceOversForStory(story.id);
        setAvailableVoiceOvers(updatedVoiceOvers);
        const updated = updatedVoiceOvers.find(vo => vo.id === currentVoiceOver.id);
        if (updated) setCurrentVoiceOver(updated);
      }
      // Clear temp recording after saving
      setTempRecordingUri(null);
      setTempRecordingDuration(0);
    } catch (error) {
      console.error('Failed to save recording:', error);
    }
  };

  const handleCreateVoiceOver = async () => {
    if (!voiceOverName.trim()) return;

    // Check for duplicate names
    const normalizedName = voiceOverName.trim().toLowerCase();
    const existingWithSameName = availableVoiceOvers.find(
      vo => vo.name.toLowerCase() === normalizedName
    );
    if (existingWithSameName) {
      Alert.alert('Name Already Exists', `A voice over named "${voiceOverName.trim()}" already exists. Please choose a different name.`);
      return;
    }

    try {
      const newVoiceOver = await voiceRecordingService.createVoiceOver(story.id, voiceOverName.trim());
      setCurrentVoiceOver(newVoiceOver);
      setAvailableVoiceOvers(prev => [...prev, newVoiceOver]);
      setVoiceOverName('');
      setShowVoiceOverNameModal(false);
      // Reset state for new voice over - no overwrite prompts needed
      setTempRecordingUri(null);
      setCurrentRecordingUri(null);
      setIsOverwriteSession(false);
      setIsNewVoiceOver(true);
    } catch (error) {
      console.error('Failed to create voice over:', error);
      Alert.alert('Error', 'Failed to create voice over. Please try again.');
    }
  };

  const handlePlayRecording = async () => {
    if (!currentRecordingUri) return;

    if (playbackSound) {
      await playbackSound.unloadAsync();
    }

    const sound = await voiceRecordingService.playRecording(currentRecordingUri);
    if (sound) {
      setPlaybackSound(sound);
      setIsPlaying(true);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    }
  };

  const handleStopPlayback = async () => {
    if (playbackSound) {
      await playbackSound.stopAsync();
      setIsPlaying(false);
    }
  };

  const handlePauseNarration = async () => {
    if (playbackSound) {
      await playbackSound.pauseAsync();
      setIsPlaying(false);
    }
  };

  const handleResumeNarration = async () => {
    if (playbackSound) {
      await playbackSound.playAsync();
      setIsPlaying(true);
    }
  };

  const handleReplayNarration = async () => {
    if (playbackSound) {
      await playbackSound.setPositionAsync(0);
      await playbackSound.playAsync();
      setIsPlaying(true);
      setNarrationProgress(0);
    }
  };

  const handleSelectVoiceOver = (voiceOver: VoiceOver) => {
    setSelectedVoiceOver(voiceOver);
    setCurrentVoiceOver(voiceOver);
    setShowVoiceOverSelectModal(false);
  };

  // Narrate mode: auto-play recording when page changes
  useEffect(() => {
    if (readingMode !== 'narrate' || !selectedVoiceOver || currentPageIndex === 0) {
      return;
    }

    const pageRecording = selectedVoiceOver.pageRecordings[currentPageIndex];
    if (!pageRecording) {
      return;
    }

    const playNarration = async () => {
      if (playbackSound) {
        await playbackSound.unloadAsync();
      }

      // Set duration from the recorded page info
      setNarrationDuration(pageRecording.duration || 0);
      setNarrationProgress(0);

      const sound = await voiceRecordingService.playRecording(pageRecording.uri);
      if (sound) {
        setPlaybackSound(sound);
        setIsPlaying(true);
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            // Update progress
            const positionMs = status.positionMillis || 0;
            const durationMs = status.durationMillis || 1;
            setNarrationProgress(positionMs / 1000);
            setNarrationDuration(durationMs / 1000);

            if (status.didJustFinish) {
              setIsPlaying(false);
              setNarrationProgress(0);
              // Set flag to trigger auto-advance via useEffect
              setShouldAutoAdvance(true);
            }
          }
        });
      }
    };

    // Wait 2 seconds before starting narration
    const delayTimer = setTimeout(() => {
      playNarration();
    }, 2000);

    return () => clearTimeout(delayTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPageIndex, readingMode, selectedVoiceOver]);

  // Show voice over selection when entering narrate mode
  useEffect(() => {
    if (readingMode === 'narrate' && availableVoiceOvers.length > 0 && !selectedVoiceOver) {
      setShowVoiceOverSelectModal(true);
    }
  }, [readingMode, availableVoiceOvers, selectedVoiceOver]);

  // Auto-advance to next page after narration finishes (2 second delay)
  useEffect(() => {
    if (shouldAutoAdvance && readingMode === 'narrate' && currentPageIndex < pages.length - 1) {
      const advanceTimer = setTimeout(() => {
        setShouldAutoAdvance(false);
        handleNextPage();
      }, 2000);

      return () => clearTimeout(advanceTimer);
    } else if (shouldAutoAdvance) {
      setShouldAutoAdvance(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAutoAdvance]);

  // Completion screen handlers
  const handleReadAnother = (newStory: Story) => {
    console.log('Reading another story:', newStory.title);
    if (onReadAnother) {
      onReadAnother(newStory);
    }
  };

  const handleRereadCurrent = async () => {
    console.log('Re-reading current story - starting reverse animation');

    try {
      // Reset to cover page immediately (before hiding completion screen)
      setCurrentPageIndex(0);

      // Reset completion animation values
      completionOpacity.value = 0;
      completionScale.value = 0.8;

      // Hide completion screen
      setShowCompletionScreen(false);

      // Small delay to ensure completion screen is hidden and cover page is ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Use the same book opening animation as initial story load
      console.log('Re-reading story - starting book opening animation');

      // Start with book in closed state
      exitScale.value = 0.3;
      exitOpacity.value = 0;
      exitRotateY.value = -90;
      storyOpacity.value = 1;

      // Book opening animation (reverse of closing)
      // Phase 1: Initial opening
      exitScale.value = withTiming(0.8, { duration: 400, easing: Easing.out(Easing.cubic) });
      exitOpacity.value = withTiming(0.7, { duration: 400, easing: Easing.out(Easing.cubic) });
      exitRotateY.value = withTiming(-20, { duration: 400, easing: Easing.out(Easing.cubic) });

      // Phase 2: Full opening after delay
      setTimeout(() => {
        exitScale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
        exitOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
        exitRotateY.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) });
      }, 400);

      console.log('Story restarted - back to cover page with fade-in');
    } catch (error) {
      console.error('Error during re-read transition:', error);
      // Fallback: immediate transition with proper animation reset
      setShowCompletionScreen(false);
      setCurrentPageIndex(0);
      exitScale.value = 1;
      exitOpacity.value = 1;
      exitRotateY.value = 0;
      storyOpacity.value = 1;
    }
  };

  const handleBedtimeMusic = () => {
    console.log('Opening bedtime music');
    if (onBedtimeMusic) {
      onBedtimeMusic();
    }
  };

  const handleCloseCompletion = async () => {
    try {
      console.log('Closing story reader with soft fade transition');

      // Simple, soft fade out transition
      scrollUpOpacity.value = withTiming(0, {
        duration: 400,
        easing: Easing.out(Easing.quad)
      });


      await new Promise(resolve => setTimeout(resolve, 400));

      // Call exit after animation
      onExit();
    } catch (error) {
      console.error('Error during close animation:', error);
      // Fallback: immediate exit
      onExit();
    }
  };

  // Function to render page content
  const renderPageContent = (page: any, isNextPage = false) => {
    if (!page) return null;

    return (
      <>
        {/* Full Screen Background Image */}
        {page.backgroundImage ? (
          <View style={[
            styles.fullScreenBackground,
            {
              backgroundColor: isTablet && imageResizeMode === 'contain' ? '#000' : 'transparent'
            }
          ]}>
            <Image
              source={typeof page.backgroundImage === 'string' ? { uri: page.backgroundImage } : page.backgroundImage}
              style={[
                styles.backgroundImageStyle,
                isTablet
                  ? { width: '100%', height: '100%' }
                  : {
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '170%',
                      width: '100%'
                    }
              ]}
              resizeMode={imageResizeMode}
            />
            {/* Character overlay - only show if character image exists */}
            {page.characterImage && (
              <Image
                source={typeof page.characterImage === 'string' ? { uri: page.characterImage } : page.characterImage}
                style={styles.characterImage}
                resizeMode="contain"
              />
            )}

            {/* Page indicator overlay - Top Left, after exit button (hide on cover page and next page) */}
            {!isNextPage && page.pageNumber > 0 && (
              <View style={[styles.pageIndicatorOverlay, {
                top: Math.max(insets.top + 5, 20) + scaledButtonSize(50) / 2 - scaledButtonSize(16),
                left: Math.max(insets.left + 5, 20) + scaledButtonSize(50) + 12,
                height: scaledButtonSize(32),
                minWidth: scaledButtonSize(50),
                paddingHorizontal: scaledButtonSize(12),
                borderRadius: scaledButtonSize(16),
              }]}>
                <Text style={[styles.pageIndicatorText, { fontSize: scaledFontSize(14) }]}>
                  {page.pageNumber}/{pages.length - 1}
                </Text>
              </View>
            )}
          </View>
        ) : null}
      </>
    );
  };
  
  const handleNextPage = async () => {
    if (isTransitioning) return;

    // In record mode, save the current recording before moving to next page
    if (readingMode === 'record' && tempRecordingUri) {
      await saveCurrentRecording();
    }

    // Clear temp recording state - existing recordings will be loaded by useEffect
    setTempRecordingUri(null);
    setTempRecordingDuration(0);

    // Check if we're on the last page
    if (currentPageIndex >= pages.length - 1) {
      console.log('Story completed - starting book closing animation');
      handleStoryCompletion();
      return;
    }

    setIsTransitioning(true);
    const targetPageIndex = currentPageIndex + 1;

    console.log('Starting beautiful crossfade to next page');

    // Beautiful crossfade: current fades out while next fades in simultaneously
    currentPageOpacity.value = withTiming(0, {
      duration: 600,
      easing: Easing.inOut(Easing.quad)
    });

    // Update content immediately so next page can start fading in
    setCurrentPageIndex(targetPageIndex);

    // Fade new page in
    setTimeout(() => {
      currentPageOpacity.value = withTiming(1, {
        duration: 600,
        easing: Easing.inOut(Easing.quad)
      });

      setIsTransitioning(false);
      console.log(`Beautiful crossfade complete - now on page ${targetPageIndex}`);
    }, 50); // Small delay to ensure content switch happens first
  };
  
  const handlePreviousPage = async () => {
    if (isTransitioning || currentPageIndex <= 0) return;

    // In record mode, save the current recording before moving to previous page
    if (readingMode === 'record' && tempRecordingUri) {
      await saveCurrentRecording();
    }

    // Clear temp recording state - existing recordings will be loaded by useEffect
    setTempRecordingUri(null);
    setTempRecordingDuration(0);

    setIsTransitioning(true);
    const targetPageIndex = currentPageIndex - 1;

    console.log('Starting beautiful crossfade to previous page');

    // Beautiful crossfade: current fades out while previous fades in simultaneously
    currentPageOpacity.value = withTiming(0, {
      duration: 600,
      easing: Easing.inOut(Easing.quad)
    });

    // Update content immediately so previous page can start fading in
    setCurrentPageIndex(targetPageIndex);

    // Fade new page in
    setTimeout(() => {
      currentPageOpacity.value = withTiming(1, {
        duration: 600,
        easing: Easing.inOut(Easing.quad)
      });

      setIsTransitioning(false);
      console.log(`Beautiful crossfade complete - now on page ${targetPageIndex}`);
    }, 50); // Small delay to ensure content switch happens first
  };
  
  // Simple animated style for single page
  const currentPageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: currentPageOpacity.value,
  }));



  const storyAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: storyOpacity.value,
    };
  });

  const bookOpeningAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: bookOpeningScale.value },
        { rotateY: `${bookOpeningRotateY.value}deg` }
      ],
    };
  });

  const exitAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: exitOpacity.value,
      transform: [
        { scale: exitScale.value },
        { rotateY: `${exitRotateY.value}deg` },
      ],
    };
  });

  // Animated style for completion screen entrance
  const completionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: completionOpacity.value,
    transform: [{ scale: completionScale.value }],
  }));

  // Animated style for soft fade exit
  const fadeExitAnimatedStyle = useAnimatedStyle(() => ({
    opacity: scrollUpOpacity.value,
  }));





  // Show transition screen while orientation is changing
  // This conditional return must come after ALL hooks to avoid Rules of Hooks violation
  if (isOrientationTransitioning) {
    return (
      <View style={styles.transitionContainer}>
        <View
          style={[styles.transitionBackground, { backgroundColor: '#4ECDC4' }]}
        >
          <View style={styles.transitionContent}>
            <Text style={styles.transitionTitle}>{story.title}</Text>
            <Text style={styles.transitionSubtitle}>Preparing your story...</Text>
            <View style={styles.transitionIndicator}>
              <Text style={styles.transitionEmoji}>{story.emoji}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // Show error if we can't find the current page
  if (!currentPage) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Story pages not available</Text>
        <Pressable style={styles.exitButton} onPress={handleExit}>
          <Text style={styles.exitButtonText}>← Back</Text>
        </Pressable>
      </View>
    );
  }

  // Show completion screen when story is finished
  if (showCompletionScreen) {
    return (
      <Animated.View style={[{ flex: 1 }, completionAnimatedStyle, fadeExitAnimatedStyle]}>
        <StoryCompletionScreen
          completedStory={story}
          onReadAnother={handleReadAnother}
          onRereadCurrent={handleRereadCurrent}
          onBedtimeMusic={handleBedtimeMusic}
          onClose={handleCloseCompletion}
        />
      </Animated.View>
    );
  }

  // Story reader is always visible with book opening animation

  return (
    <Animated.View style={[styles.container, exitAnimatedStyle, storyAnimatedStyle, bookOpeningAnimatedStyle]}>
      <View style={[
        styles.background,
        {
          backgroundColor: !isTablet && currentPage?.backgroundImage
            ? 'transparent'
            : '#4ECDC4' // Calming teal background
        }
      ]}>


        {/* Top Left Controls - Exit Button (aligned with bottom back button) */}
        <View style={[styles.topLeftControls, {
          paddingTop: Math.max(insets.top + 5, 20),
          paddingLeft: Math.max(insets.left + 5, 20)
        }]}>
          <Pressable
            style={[
              styles.exitButton,
              {
                width: scaledButtonSize(50),
                height: scaledButtonSize(50),
                borderRadius: scaledButtonSize(25),
              }
            ]}
            onPress={handleExit}
          >
            <Text style={[styles.exitButtonText, { fontSize: scaledFontSize(20) }]}>✕</Text>
          </Pressable>
        </View>

        {/* Recording Controls - Top Center (only visible in record mode on story pages) */}
        {readingMode === 'record' && currentPageIndex > 0 && (
          <View style={[styles.recordingControlsContainer, {
            paddingTop: Math.max(insets.top + 5, 20),
          }]}>
            {!isRecording && !currentRecordingUri && (
              <Pressable
                style={styles.recordButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  handleStartRecording();
                }}
              >
                <View style={styles.recordButtonInner} />
              </Pressable>
            )}
            {isRecording && (
              <View style={styles.recordingActiveContainer}>
                <Pressable
                  style={styles.stopButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    handleStopRecording();
                  }}
                >
                  <View style={styles.stopButtonInner} />
                </Pressable>
                <Text style={styles.recordingTimer}>{recordingDuration}s / 30s</Text>
              </View>
            )}
            {currentRecordingUri && !isRecording && (
              <View style={styles.playbackControlsContainer}>
                {!isPlaying ? (
                  <Pressable
                    style={styles.playButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      handlePlayRecording();
                    }}
                  >
                    <Text style={styles.playButtonIcon}>▶</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={styles.playButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      handleStopPlayback();
                    }}
                  >
                    <Text style={styles.playButtonIcon}>⏸</Text>
                  </Pressable>
                )}
                <Pressable
                  style={styles.reRecordButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCurrentRecordingUri(null);
                  }}
                >
                  <Text style={styles.reRecordButtonText}>↺</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* Narration Playback Controls - Top Center (only visible in narrate mode on story pages) */}
        {readingMode === 'narrate' && currentPageIndex > 0 && selectedVoiceOver && (
          <View style={[styles.narrationControlsContainer, {
            paddingTop: Math.max(insets.top + 5, 20),
          }]}>
            <View style={[styles.narrationPlaybackContainer, {
              paddingVertical: scaledButtonSize(6),
              paddingHorizontal: scaledButtonSize(8),
              gap: scaledButtonSize(6),
            }]}>
              {/* Play/Pause Button */}
              <Pressable
                style={[styles.narrationPlayPauseButton, {
                  width: scaledButtonSize(32),
                  height: scaledButtonSize(32),
                  borderRadius: scaledButtonSize(16),
                }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (isPlaying) {
                    handlePauseNarration();
                  } else {
                    handleResumeNarration();
                  }
                }}
              >
                <Text style={[styles.narrationPlayPauseIcon, { fontSize: scaledFontSize(14) }]}>{isPlaying ? '❚❚' : '▶'}</Text>
              </Pressable>
              {/* Progress Bar */}
              <View style={styles.narrationProgressContainer}>
                <View style={[styles.narrationProgressBar, { width: scaledButtonSize(84), height: scaledButtonSize(4) }]}>
                  <View
                    style={[
                      styles.narrationProgressFill,
                      { width: `${narrationDuration > 0 ? (narrationProgress / narrationDuration) * 100 : 0}%` }
                    ]}
                  />
                </View>
                <Text style={[styles.narrationTimeText, { fontSize: scaledFontSize(10) }]}>
                  {Math.floor(narrationProgress)}s / {Math.floor(narrationDuration)}s
                </Text>
              </View>
              {/* Replay Button */}
              <Pressable
                style={[styles.narrationReplayButton, {
                  width: scaledButtonSize(28),
                  height: scaledButtonSize(28),
                  borderRadius: scaledButtonSize(14),
                }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handleReplayNarration();
                }}
              >
                <Text style={[styles.narrationReplayIcon, { fontSize: scaledFontSize(16) }]}>↻</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Top Right Controls - Sound and Settings (aligned with bottom next button) */}
        <View style={[styles.topRightControls, {
          paddingTop: Math.max(insets.top + 5, 20),
          paddingRight: Math.max(insets.right + 5, 20)
        }]}>
          <MusicControl size={28} color="white" />
          {/* Settings/Burger Menu Button */}
          <Pressable
            style={[
              styles.settingsButton,
              {
                width: scaledButtonSize(50),
                height: scaledButtonSize(50),
                borderRadius: scaledButtonSize(25),
              }
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (showSettingsMenu) {
                setShowSettingsMenu(false);
                setActiveSubmenu(null);
              } else {
                setShowSettingsMenu(true);
                setActiveSubmenu('main');
              }
            }}
          >
            <Text style={[styles.settingsButtonText, { fontSize: scaledFontSize(28), marginTop: 2 }]}>☰</Text>
          </Pressable>
        </View>

        {/* Settings Menu Overlay - closes menu when tapping outside */}
        {showSettingsMenu && (
          <Pressable
            style={styles.settingsOverlay}
            onPress={() => {
              setShowSettingsMenu(false);
              setActiveSubmenu(null);
            }}
          />
        )}

        {/* Settings Menu Dropdown - Main Menu */}
        {showSettingsMenu && activeSubmenu === 'main' && (
          <View style={[styles.settingsMenu, {
            top: Math.max(insets.top + 5, 20) + scaledButtonSize(50) + 10,
            right: Math.max(insets.right + 5, 20),
          }]}>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveSubmenu('fontSize');
              }}
            >
              <Text style={[styles.menuItemText, { fontSize: scaledFontSize(14) }]}>Font / Button Size</Text>
              <Text style={[styles.menuItemArrow, { fontSize: scaledFontSize(14) }]}>›</Text>
            </Pressable>
          </View>
        )}

        {/* Settings Menu Dropdown - Font Size Options */}
        {showSettingsMenu && activeSubmenu === 'fontSize' && (
          <View style={[styles.settingsMenu, {
            top: Math.max(insets.top + 5, 20) + scaledButtonSize(50) + 10,
            right: Math.max(insets.right + 5, 20),
          }]}>
            <Pressable
              style={styles.submenuHeader}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveSubmenu('main');
              }}
            >
              <Text style={[styles.settingsMenuTitle, { fontSize: scaledFontSize(14) }]}>Font / Button Size</Text>
              <Text style={[styles.menuItemArrow, { fontSize: scaledFontSize(14) }]}>›</Text>
            </Pressable>
            <View style={styles.textSizeOptionsRow}>
              {TEXT_SIZE_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.textSizeOption,
                    textSizeScale === option.value && styles.textSizeOptionSelected,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setTextSizeScale(option.value);
                    setShowSettingsMenu(false);
                    setActiveSubmenu(null);
                  }}
                >
                  <Text
                    style={[
                      styles.textSizeOptionText,
                      textSizeScale === option.value && styles.textSizeOptionTextSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Simple Single Page - Just Like Cover Tap */}
        <Animated.View style={[styles.pageContent, currentPageAnimatedStyle]}>
          {renderPageContent(currentPage)}
        </Animated.View>

        {/* UI Controls Layer */}
        <View style={styles.uiControlsLayer}>

        {/* Bottom UI Panel - Text and Controls (hide on cover page) */}
        {currentPage && currentPageIndex > 0 && (
          <View style={[
            styles.bottomUIPanel,
            readingMode === 'record' && styles.bottomUIPanelRecordMode,
            {
              paddingLeft: Math.max(insets.left + 5, 20),
              paddingRight: Math.max(insets.right + 5, 20),
              paddingBottom: Math.max(insets.bottom + 5, 20),
            }
          ]}>

          {/* Record Mode: Text box above navigation row */}
          {readingMode === 'record' && (
            <View style={styles.recordModeTextWrapper}>
              <View style={styles.recordModeTextBox}>
                <Text
                  style={[
                    styles.storyText,
                    {
                      fontSize: scaledFontSize(isTablet ? 20 : 16),
                      lineHeight: scaledFontSize(isTablet ? 20 : 16) * 1.6,
                    }
                  ]}
                >
                  {currentPage?.text}
                </Text>
              </View>
            </View>
          )}

          {/* Navigation Row */}
          <View style={[
            styles.navigationRow,
            readingMode === 'record' && styles.navigationRowRecordMode
          ]}>
          {/* Previous Button - Left Side */}
          <Pressable
            style={[
              styles.navButton,
              styles.prevButton,
              {
                width: scaledButtonSize(50),
                height: scaledButtonSize(50),
                borderRadius: scaledButtonSize(25),
              },
              (currentPageIndex <= 0 || (readingMode === 'record' && isRecording)) && styles.navButtonDisabled
            ]}
            onPress={handlePreviousPage}
            disabled={currentPageIndex <= 0 || isTransitioning || (readingMode === 'record' && isRecording)}
            testID="left-touch-area"
          >
            <Text style={[
              styles.navButtonText,
              { fontSize: scaledFontSize(20) },
              currentPageIndex <= 0 && styles.navButtonTextDisabled
            ]}>
              ←
            </Text>
          </Pressable>

          {/* Story Text Box - Center - Scrollable for accessibility (non-record modes only) */}
          {readingMode !== 'record' && (
            <View style={styles.centerTextContainer}>
              {(() => {
                // Tablet gets larger base font for better readability
                // iPad base sizes are significantly larger to compensate for 2-line limit
                const baseFontSize = currentPage?.pageNumber === 0
                  ? (isTablet ? 28 : 18)
                  : (isTablet ? 26 : 16);
                const fontSize = scaledFontSize(baseFontSize);
                const lineHeight = fontSize * 1.5;
                // 2 lines on all devices - enforced for consistent reading experience
                const maxLines = 2;
                const verticalPadding = 30;
                const fixedTextBoxHeight = (lineHeight * maxLines) + verticalPadding;

                return (
                  <View style={[
                    styles.centerTextBox,
                    {
                      height: fixedTextBoxHeight,
                      minHeight: fixedTextBoxHeight,
                      maxHeight: fixedTextBoxHeight,
                    }
                  ]}>
                    <ScrollView
                      key={`text-scroll-${currentPageIndex}`}
                      ref={textScrollViewRef}
                      showsVerticalScrollIndicator={false}
                      onScroll={handleTextScroll}
                      scrollEventThrottle={16}
                      onContentSizeChange={handleTextContentSizeChange}
                      onLayout={handleScrollViewLayout}
                      bounces={false}
                    >
                      <Text
                        style={[
                          currentPage?.pageNumber === 0 ? styles.coverText : styles.storyText,
                          {
                            fontSize: fontSize,
                            lineHeight: lineHeight,
                          }
                        ]}
                      >
                        {currentPage?.text}
                      </Text>
                    </ScrollView>
                    {/* Scroll indicator - down arrow when at top/middle, up arrow when at bottom */}
                    {canScrollText && !showUpArrow && (
                      <Pressable
                        style={styles.scrollIndicator}
                        onPress={() => {
                          textScrollViewRef.current?.scrollToEnd({ animated: true });
                        }}
                      >
                        <Text style={[styles.scrollIndicatorText, { fontSize: scaledFontSize(14) }]}>↓</Text>
                      </Pressable>
                    )}
                    {canScrollText && showUpArrow && (
                      <Pressable
                        style={[styles.scrollIndicator, styles.scrollIndicatorTop]}
                        onPress={() => {
                          textScrollViewRef.current?.scrollTo({ y: 0, animated: true });
                        }}
                      >
                        <Text style={[styles.scrollIndicatorText, { fontSize: scaledFontSize(14) }]}>↑</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })()}
            </View>
          )}

          {/* Next Button - Right Side */}
          <Pressable
            style={[
              styles.navButton,
              styles.nextButton,
              {
                width: scaledButtonSize(50),
                height: scaledButtonSize(50),
                borderRadius: scaledButtonSize(25),
              },
              currentPageIndex === pages.length - 1 && styles.completeButton,
              (readingMode === 'record' && (isRecording || (currentPageIndex > 0 && !tempRecordingUri && !currentVoiceOver?.pageRecordings[currentPageIndex]))) && styles.navButtonDisabled
            ]}
            onPress={handleNextPage}
            disabled={isTransitioning || (readingMode === 'record' && (isRecording || (currentPageIndex > 0 && !tempRecordingUri && !currentVoiceOver?.pageRecordings[currentPageIndex])))}
            testID="right-touch-area"
          >
            <Text style={[
              styles.navButtonText,
              { fontSize: scaledFontSize(20) },
              currentPageIndex === pages.length - 1 && styles.completeButtonText
            ]}>
              {currentPageIndex === pages.length - 1 ? '✓' : '→'}
            </Text>
          </Pressable>
          </View>
          </View>
        )}

        {/* Cover page tap-to-continue overlay - Excludes top UI area */}
        {currentPageIndex === 0 && (
          <Pressable
            style={styles.coverTapOverlayExcludeTop}
            onPress={handleCoverTap}
            testID="cover-tap-overlay"
          >
            <View style={styles.coverTapHint}>
              {readingMode === 'record' && !currentVoiceOver ? (
                <Text style={[styles.coverTapText, { fontSize: scaledFontSize(16) }]}>Select a voice profile</Text>
              ) : readingMode === 'record' && currentVoiceOver ? (
                <>
                  <Text style={[styles.coverTapText, { fontSize: scaledFontSize(14), opacity: 0.8 }]}>Recording as: {currentVoiceOver.name}</Text>
                  <Text style={[styles.coverTapText, { fontSize: scaledFontSize(16), marginTop: 4 }]}>Tap to begin</Text>
                </>
              ) : readingMode === 'narrate' && !currentVoiceOver ? (
                <Text style={[styles.coverTapText, { fontSize: scaledFontSize(16) }]}>Select a voice over</Text>
              ) : readingMode === 'narrate' && currentVoiceOver ? (
                <>
                  <Text style={[styles.coverTapText, { fontSize: scaledFontSize(14), opacity: 0.8 }]}>Narrating as: {currentVoiceOver.name}</Text>
                  <Text style={[styles.coverTapText, { fontSize: scaledFontSize(16), marginTop: 4 }]}>Tap to begin</Text>
                </>
              ) : (
                <Text style={[styles.coverTapText, { fontSize: scaledFontSize(16) }]}>Tap to begin</Text>
              )}
            </View>
          </Pressable>
        )}

        {/* Reading Mode Selection - Bottom left of cover page */}
        {currentPageIndex === 0 && (
          <View style={[styles.modeSelectionContainer, {
            bottom: Math.max(insets.bottom + 10, 15),
            left: Math.max(insets.left + 10, 15),
          }]}>
            <Pressable
              style={[
                styles.modeButton,
                readingMode === 'read' && styles.modeButtonSelected
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setReadingMode('read');
              }}
            >
              <Text style={[styles.modeButtonIcon, { fontSize: scaledFontSize(24) }]}>∞</Text>
              <Text style={[styles.modeButtonText, { fontSize: scaledFontSize(12) }]}>Read</Text>
            </Pressable>
            <Pressable
              style={[
                styles.modeButton,
                readingMode === 'record' && styles.modeButtonSelected
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setReadingMode('record');
                setShowVoiceOverNameModal(true);
              }}
            >
              <Text style={[styles.modeButtonIcon, { fontSize: scaledFontSize(24) }]}>●</Text>
              <Text style={[styles.modeButtonText, { fontSize: scaledFontSize(12) }]}>Record</Text>
            </Pressable>
            <Pressable
              style={[
                styles.modeButton,
                readingMode === 'narrate' && styles.modeButtonSelected
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setReadingMode('narrate');
                setShowVoiceOverSelectModal(true);
              }}
            >
              <Text style={[styles.modeButtonIcon, { fontSize: scaledFontSize(24) }]}>♫</Text>
              <Text style={[styles.modeButtonText, { fontSize: scaledFontSize(12) }]}>Narrate</Text>
            </Pressable>
          </View>
        )}

        </View>
      </View>

      {/* Voice Over Name Modal */}
      <Modal
        visible={showVoiceOverNameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVoiceOverNameModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlayTop}
        >
          <View style={styles.modalContent}>
            <Pressable
              style={styles.modalCloseButton}
              onPress={() => {
                setShowVoiceOverNameModal(false);
                setVoiceOverName('');
              }}
            >
              <Text style={styles.modalCloseButtonText}>✕</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Voice Over Profile</Text>

            {/* Existing voice overs */}
            {availableVoiceOvers.length > 0 && (
              <>
                <Text style={styles.modalSubtitle}>Select existing to overwrite:</Text>
                <View style={styles.voiceOverList}>
                  {availableVoiceOvers.map((vo) => (
                    <View key={vo.id} style={styles.voiceOverItemWithDelete}>
                      <Pressable
                        style={styles.voiceOverItemSelectable}
                        onPress={() => {
                          const hasExistingRecordings = Object.keys(vo.pageRecordings).length > 0;
                          if (hasExistingRecordings) {
                            Alert.alert(
                              'Overwrite Voice Over?',
                              `"${vo.name}" already has ${Object.keys(vo.pageRecordings).length} page(s) recorded. Do you want to overwrite with new recordings?`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Overwrite',
                                  style: 'destructive',
                                  onPress: () => {
                                    setCurrentVoiceOver(vo);
                                    setIsOverwriteSession(true);
                                    setShowVoiceOverNameModal(false);
                                  },
                                },
                              ]
                            );
                          } else {
                            setCurrentVoiceOver(vo);
                            setShowVoiceOverNameModal(false);
                          }
                        }}
                      >
                        <Text style={styles.voiceOverItemText}>{vo.name}</Text>
                        <Text style={styles.voiceOverItemPages}>
                          {Object.keys(vo.pageRecordings).length} pages recorded
                        </Text>
                      </Pressable>
                      <Pressable
                        style={styles.deleteButton}
                        onPress={() => {
                          setShowVoiceOverNameModal(false);
                          setTimeout(() => {
                            parentsOnly.showChallenge(() => {
                              Alert.alert(
                                'Delete Voice Over',
                                `Are you sure you want to delete "${vo.name}"? This cannot be undone.`,
                                [
                                  {
                                    text: 'Cancel',
                                    style: 'cancel',
                                    onPress: () => setShowVoiceOverNameModal(true),
                                  },
                                  {
                                    text: 'Delete',
                                    style: 'destructive',
                                    onPress: async () => {
                                      await voiceRecordingService.deleteVoiceOver(vo.id);
                                      const updated = await voiceRecordingService.getVoiceOversForStory(story.id);
                                      setAvailableVoiceOvers(updated);
                                      if (currentVoiceOver?.id === vo.id) {
                                        setCurrentVoiceOver(null);
                                      }
                                      if (selectedVoiceOver?.id === vo.id) {
                                        setSelectedVoiceOver(null);
                                      }
                                      setShowVoiceOverNameModal(true);
                                    },
                                  },
                                ]
                              );
                            });
                          }, 300);
                        }}
                      >
                        <Text style={styles.deleteButtonText}>✕</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Create new section */}
            {availableVoiceOvers.length < 3 ? (
              <>
                <Text style={[styles.modalSubtitle, availableVoiceOvers.length > 0 && { marginTop: 16 }]}>
                  {availableVoiceOvers.length > 0 ? 'Or create new:' : 'Enter a name for your recording:'}
                </Text>
                <TextInput
                  style={styles.modalInput}
                  value={voiceOverName}
                  onChangeText={setVoiceOverName}
                  placeholder="e.g., Mummy's Voice"
                  placeholderTextColor="#999"
                  autoFocus={availableVoiceOvers.length === 0}
                />
                <View style={styles.modalButtonsCentered}>
                  <Pressable
                    style={[styles.modalButtonConfirm, !voiceOverName.trim() && styles.modalButtonDisabled]}
                    onPress={handleCreateVoiceOver}
                    disabled={!voiceOverName.trim()}
                  >
                    <Text style={styles.modalButtonConfirmText}>Create</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <Text style={[styles.modalSubtitle, { marginTop: 16, color: '#666' }]}>
                Maximum of 3 voice overs reached. Delete one to create a new one.
              </Text>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Voice Over Selection Modal */}
      <Modal
        visible={showVoiceOverSelectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVoiceOverSelectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Pressable
              style={styles.modalCloseButton}
              onPress={() => {
                setShowVoiceOverSelectModal(false);
                setReadingMode('read');
              }}
            >
              <Text style={styles.modalCloseButtonText}>✕</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Select Voice Over</Text>
            <Text style={styles.modalSubtitle}>Choose a recording to play</Text>
            {availableVoiceOvers.length === 0 ? (
              <Text style={styles.noVoiceOversText}>No voice overs recorded yet</Text>
            ) : (
              <View style={styles.voiceOverList}>
                {availableVoiceOvers.map((vo) => (
                  <Pressable
                    key={vo.id}
                    style={styles.voiceOverItem}
                    onPress={() => handleSelectVoiceOver(vo)}
                  >
                    <Text style={styles.voiceOverItemName}>{vo.name}</Text>
                    <Text style={styles.voiceOverItemPages}>
                      {Object.keys(vo.pageRecordings).length} pages recorded
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Parents Only Challenge Modal */}
      <ParentsOnlyModal
        visible={parentsOnly.isVisible}
        challenge={parentsOnly.challenge}
        inputValue={parentsOnly.inputValue}
        onInputChange={parentsOnly.setInputValue}
        onSubmit={parentsOnly.handleSubmit}
        onClose={() => {
          parentsOnly.handleClose();
          setShowVoiceOverNameModal(true);
        }}
        isInputValid={parentsOnly.isInputValid}
        scaledFontSize={scaledFontSize}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },

  pageContent: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(78, 205, 196, 0.7)', // Calming teal background with 70% opacity
  },
  pageContentOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1, // Ensure overlay appears on top
  },
  nextPageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2, // Ensure next page appears above current page for crossfade
  },
  uiControlsLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10, // Ensure UI controls appear above all page content
    pointerEvents: 'box-none', // Allow touches to pass through to page content where there are no controls
  },
  topLeftControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 20,
  },
  topRightControls: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 20,
  },
  exitButtonContainer: {
    position: 'absolute',
    top: 0,
    right: 20,
    zIndex: 10,
  },
  exitButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  exitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  settingsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  settingsButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  settingsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  settingsMenu: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 100,
    overflow: 'hidden',
  },
  settingsMenuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  menuItemText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  menuItemArrow: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 12,
  },
  submenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  textSizeOptionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  textSizeOption: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textSizeOptionSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  textSizeOptionText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 12,
  },
  textSizeOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // Transition screen styles
  transitionContainer: {
    flex: 1,
  },
  transitionBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transitionContent: {
    alignItems: 'center',
    padding: 40,
  },
  transitionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 10,
    textAlign: 'center',
  },
  transitionSubtitle: {
    fontSize: 18,
    color: '#424242',
    marginBottom: 30,
    textAlign: 'center',
  },
  transitionIndicator: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  transitionEmoji: {
    fontSize: 40,
  },

  // Full screen background layout
  fullScreenBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    // Background color is set conditionally in the component
  },
  bottomUIPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 100,
    paddingTop: 5,
    zIndex: 5,
  },
  bottomUIPanelRecordMode: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  recordModeTextWrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
  },
  navigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  navigationRowRecordMode: {
    justifyContent: 'center',
    gap: 40,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundImageStyle: {
    // Base style for background images
    // Positioning is handled by getBackgroundImageStyle() utility
  },
  characterImage: {
    position: 'absolute',
    width: '40%',
    height: '60%',
    bottom: '22%', // Closer to bottom for tighter layout
    right: '1%', // Extremely close to right edge
    zIndex: 2,
  },
  pageIndicatorOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyEmoji: {
    fontSize: 80,
    marginBottom: 10,
  },
  pageNumber: {
    fontSize: 16,
    fontFamily: Fonts.sans,
    fontWeight: '500',
    color: '#FFFFFF', // White text
  },
  // Bottom attached text styles
  bottomTextContainer: {
    flex: 1,
    marginRight: 10,
    justifyContent: 'center',
  },
  bottomTextBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 15,
    minHeight: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  centerTextContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
    maxWidth: '70%',
  },
  recordModeTextContainer: {
    flex: 0,
    flexGrow: 0,
    flexShrink: 0,
  },
  centerTextBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 20,
    paddingHorizontal: 25,
    paddingVertical: 15,
    minHeight: 80,
    width: '100%',
    minWidth: 200,
    maxWidth: 500,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  recordModeTextBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 20,
    paddingHorizontal: 25,
    paddingVertical: 20,
    width: '90%',
    maxWidth: 700,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  scrollIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(44, 62, 80, 0.7)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollIndicatorTop: {
    bottom: undefined,
    top: 4,
  },
  scrollIndicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Legacy text styles (for compatibility)
  textContainer: {
    alignItems: 'center',
    marginBottom: 20,
    flex: 1,
  },
  textBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  storyText: {
    fontSize: 16, // Slightly smaller for better fit
    fontFamily: Fonts.sans,
    color: '#2C3E50', // Dark text for readability in white text box
    textAlign: 'center',
    lineHeight: 24, // Proper line height for 2 lines (16px font + 8px spacing)
  },
  coverText: {
    fontSize: 18, // Larger for cover page
    fontFamily: Fonts.sans,
    fontWeight: '600', // Semi-bold for title
    color: '#2C3E50', // Dark text for readability
    textAlign: 'center',
    lineHeight: 26, // Proper line height for 3 lines
  },
  // Bottom navigation styles
  bottomNavigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 180,
    marginBottom: 0, // Remove bottom margin to center with text box
  },

  // Legacy navigation styles (for compatibility)
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
  },
  navButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)', // More transparent for glass effect
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)', // Subtle border for glass effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    // Glass morphism effect (backdropFilter not supported in React Native)
    overflow: 'hidden',
  },

  navButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Very transparent for disabled state
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  navButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF', // White text
  },
  navButtonTextDisabled: {
    color: '#CCC',
  },
  completeButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)', // Green background for completion
    borderColor: 'rgba(76, 175, 80, 1)',
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 22,
  },
  prevButton: {
    // Additional styles for previous button if needed
  },
  nextButton: {
    // Additional styles for next button if needed
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8F0',
  },
  errorText: {
    fontSize: 18,
    fontFamily: Fonts.sans,
    fontWeight: '500',
    color: '#666',
    marginBottom: 20,
  },
  // Cover page styles
  coverTapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverTapOverlayFullScreen: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 60,
  },
  coverTapOverlayExcludeTop: {
    position: 'absolute',
    top: 80, // Exclude top 80px where exit button is
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 60,
    zIndex: 5, // Below topLeftControls and topRightControls (zIndex: 10)
  },
  coverTapHint: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    // backdropFilter not supported in React Native
  },
  coverTapText: {
    fontSize: 16,
    fontFamily: Fonts.sans,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  pageIndicatorText: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modeSelectionContainer: {
    position: 'absolute',
    flexDirection: 'column',
    gap: 8,
    zIndex: 100,
    alignItems: 'flex-start',
  },
  modeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 15,
    paddingVertical: 4,
    paddingLeft: 8,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 0,
    borderWidth: 2,
    borderColor: 'transparent',
    width: 122,
  },
  modeButtonSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  modeButtonIcon: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginRight: 10,
    zIndex: 1,
  },
  modeButtonText: {
    color: '#FFFFFF',
    fontFamily: Fonts.sans,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Recording controls styles
  recordingControlsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 15,
    pointerEvents: 'box-none',
  },
  recordButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  recordButtonInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF4444',
  },
  recordingActiveContainer: {
    alignItems: 'center',
    gap: 8,
  },
  stopButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 68, 68, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  stopButtonInner: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  recordingTimer: {
    color: '#FFFFFF',
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  playbackControlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  playButtonIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    marginLeft: 3,
  },
  reRecordButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 152, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  reRecordButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  // Narration playback styles
  narrationControlsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 15,
  },
  narrationPlaybackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 6,
  },
  narrationPlayPauseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    overflow: 'visible',
  },
  narrationPlayPauseIcon: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
  },
  narrationReplayButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  narrationReplayIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  narrationProgressContainer: {
    flexDirection: 'column',
    gap: 2,
  },
  narrationProgressBar: {
    width: 84,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  narrationProgressFill: {
    height: '100%',
    backgroundColor: '#4ECDC4',
    borderRadius: 2,
  },
  narrationTimeText: {
    color: '#FFFFFF',
    fontSize: 10,
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalOverlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    position: 'relative',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalCloseButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  voiceOverItemWithDelete: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  voiceOverItemSelectable: {
    flex: 1,
    backgroundColor: '#F0F4F8',
    borderRadius: 12,
    padding: 14,
  },
  voiceOverItemText: {
    fontSize: 16,
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: '#2C3E50',
  },
  voiceOverItemPages: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: '#666',
    marginTop: 2,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: Fonts.sans,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    width: '100%',
    height: 50,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: Fonts.sans,
    color: '#2C3E50',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButtonsCentered: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  modalButtonCancel: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: '#666',
  },
  modalButtonConfirm: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#4ECDC4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    fontSize: 16,
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  noVoiceOversText: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: '#999',
    marginBottom: 20,
    textAlign: 'center',
  },
  voiceOverList: {
    width: '100%',
    marginBottom: 16,
  },
  voiceOverItem: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 8,
  },
  voiceOverItemName: {
    fontSize: 16,
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: '#2C3E50',
  },
});
