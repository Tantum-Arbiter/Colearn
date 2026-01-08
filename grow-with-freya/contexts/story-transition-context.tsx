import React, { createContext, useContext, useState, useEffect } from 'react';
import { Dimensions, Image, StyleSheet, View, Text, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
  SharedValue,
  FadeIn,
  SlideInDown,
  SlideInLeft,
  SlideOutLeft,
  interpolate,
} from 'react-native-reanimated';
import { Story } from '@/types/story';
import { AuthenticatedImage } from '@/components/ui/authenticated-image';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { voiceRecordingService, VoiceOver } from '@/services/voice-recording-service';
import { useParentsOnlyChallenge } from '@/hooks/use-parents-only-challenge';
import { ParentsOnlyModal } from '@/components/ui/parents-only-modal';
import { StoryPreviewModal } from '@/components/stories/story-preview-modal';

// Animation timing constants
const MOVE_TO_CENTER_DURATION = 450;
const BUTTONS_DELAY = 200; // Delay before buttons slide in

export type ReadingMode = 'read' | 'record' | 'narrate';

interface StoryTransitionContextType {
  // Animation state
  isTransitioning: boolean;
  showModeSelection: boolean;
  selectedStoryId: string | null;
  selectedStory: Story | null;
  selectedMode: ReadingMode;
  selectedVoiceOver: VoiceOver | null;
  isExpandingToReader: boolean;

  // Flag to indicate story reader should start loading
  shouldShowStoryReader: boolean;

  // Callback when user taps "Begin" - the _layout listens to this
  onBeginCallback: (() => void) | null;
  setOnBeginCallback: (callback: (() => void) | null) => void;

  // Card position and size for animation
  cardPosition: { x: number; y: number; width: number; height: number } | null;

  // Animation functions
  startTransition: (storyId: string, cardLayout: { x: number; y: number; width: number; height: number }, story?: Story) => void;
  selectModeAndBegin: (mode: ReadingMode) => void;
  cancelTransition: () => void;
  completeTransition: () => void;
  startExitAnimation: (onComplete: () => void) => void;
  isExitAnimating: boolean;

  // Animation values
  transitionScale: SharedValue<number>;
  transitionX: SharedValue<number>;
  transitionY: SharedValue<number>;
  transitionOpacity: SharedValue<number>;
  overlayOpacity: SharedValue<number>;

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
  const [showModeSelection, setShowModeSelection] = useState(false);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [selectedMode, setSelectedMode] = useState<ReadingMode>('read');
  const [cardPosition, setCardPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [originalCardPosition, setOriginalCardPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [targetBookPosition, setTargetBookPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [shouldShowStoryReader, setShouldShowStoryReader] = useState(false);
  const [onBeginCallback, setOnBeginCallback] = useState<(() => void) | null>(null);
  const [isExitAnimating, setIsExitAnimating] = useState(false);

  // Voice over state for record/narrate mode selection
  const [availableVoiceOvers, setAvailableVoiceOvers] = useState<VoiceOver[]>([]);
  const [currentVoiceOver, setCurrentVoiceOver] = useState<VoiceOver | null>(null);
  const [showVoiceOverNameModal, setShowVoiceOverNameModal] = useState(false);
  const [showVoiceOverSelectModal, setShowVoiceOverSelectModal] = useState(false);
  const [voiceOverName, setVoiceOverName] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const insets = useSafeAreaInsets();
  const { scaledFontSize, scaledButtonSize, scaledPadding } = useAccessibility();
  const parentsOnly = useParentsOnlyChallenge();

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  // Animation values for the transitioning card
  const transitionScale = useSharedValue(1);
  const transitionX = useSharedValue(0);
  const transitionY = useSharedValue(0);
  const transitionOpacity = useSharedValue(1);
  const overlayOpacity = useSharedValue(0);

  // Book page flip and expansion animation values
  const pageFlipProgress = useSharedValue(0); // 0 = closed, 1 = open (cover rotated away)
  const bookExpansion = useSharedValue(0); // 0 = book size, 1 = full screen
  const [isExpandingToReader, setIsExpandingToReader] = useState(false);
  
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
            if (source && source.uri) {
              Image.prefetch(source.uri).then(resolve).catch(resolve);
            } else {
              resolve(undefined);
            }
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
            if (source && source.uri) {
              Image.prefetch(source.uri).then(resolve).catch(resolve);
            } else {
              resolve(undefined);
            }
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
    console.log('Starting book preview transition for:', storyId, 'from position:', cardLayout);

    // Reset ALL animation values from any previous transition FIRST
    pageFlipProgress.value = 0;
    bookExpansion.value = 0;
    transitionScale.value = 1;
    transitionX.value = 0;
    transitionY.value = 0;
    transitionOpacity.value = 1;
    overlayOpacity.value = 0;

    // Reset ALL state that could affect rendering
    setIsExitAnimating(false);
    setIsExpandingToReader(false);

    setSelectedStoryId(storyId);
    setSelectedStory(story || null);
    setCardPosition(cardLayout);
    setOriginalCardPosition(cardLayout); // Save original position for exit animation
    setIsTransitioning(true);
    setSelectedMode('read'); // Reset to default mode

    // Start preloading story images during the transition
    if (story) {
      preloadStoryImages(story);
    }

    // Calculate target position (center of screen)
    // Target book size: 55% of screen width
    const targetWidth = screenWidth * 0.55;
    const targetScale = targetWidth / cardLayout.width;

    // Calculate center position for the scaled book
    // The scale transform is applied from the center of the element, so we need to
    // calculate where the top-left corner needs to be for the book to appear centered
    const targetCenterX = screenWidth / 2;
    const targetCenterY = (screenHeight / 2) - 30; // Slightly above center for buttons

    // Current center position
    const currentCenterX = cardLayout.x + cardLayout.width / 2;
    const currentCenterY = cardLayout.y + cardLayout.height / 2;

    // How much to move the center
    const moveX = targetCenterX - currentCenterX;
    const moveY = targetCenterY - currentCenterY;

    // Calculate final book position (after animation) for positioning close button
    const scaledWidth = cardLayout.width * targetScale;
    const scaledHeight = cardLayout.height * targetScale;
    const targetBookX = targetCenterX - scaledWidth / 2;
    const targetBookY = targetCenterY - scaledHeight / 2;
    setTargetBookPosition({ x: targetBookX, y: targetBookY, width: scaledWidth, height: scaledHeight });

    // Reset animation values
    transitionOpacity.value = 1;
    transitionScale.value = 1;
    transitionX.value = 0;
    transitionY.value = 0;
    overlayOpacity.value = 0;

    // Animate card to center of screen
    transitionX.value = withTiming(moveX, {
      duration: MOVE_TO_CENTER_DURATION,
      easing: Easing.out(Easing.cubic)
    });

    transitionY.value = withTiming(moveY, {
      duration: MOVE_TO_CENTER_DURATION,
      easing: Easing.out(Easing.cubic)
    });

    transitionScale.value = withTiming(targetScale, {
      duration: MOVE_TO_CENTER_DURATION,
      easing: Easing.out(Easing.cubic)
    });

    // Fade in the shadow overlay
    overlayOpacity.value = withTiming(1, {
      duration: MOVE_TO_CENTER_DURATION,
      easing: Easing.out(Easing.cubic)
    });

    // Show mode selection buttons after animation completes
    setTimeout(() => {
      setShowModeSelection(true);
    }, MOVE_TO_CENTER_DURATION + BUTTONS_DELAY);
  };

  // User selects a mode and taps "Begin"
  const selectModeAndBegin = (mode: ReadingMode) => {
    console.log('Starting story with mode:', mode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMode(mode);

    // Hide mode selection to trigger slide-out animation
    setShowModeSelection(false);

    // Animation timing
    const BUTTON_EXIT_DURATION = 250;  // Time for buttons to slide out
    const COVER_FLIP_DURATION = 600;
    const HOLD_AFTER_FLIP = 500;  // Time to see the page after cover flips
    const SCALE_DURATION = 400;   // Time to scale up to full screen

    // DON'T change cardPosition or reset transforms here!
    // The book is already visually centered via transitionX/Y/Scale.
    // Changing them causes a flash because state updates are async but
    // shared value updates are sync.

    // Just reset flip/expansion values (these don't affect position)
    bookExpansion.value = 0;
    pageFlipProgress.value = 0;

    // Wait for buttons to slide out before starting flip
    setTimeout(() => {
      // DON'T change cardPosition or reset transforms here!
      // The book is visually centered via transitionX/Y/Scale transforms.
      // Changing cardPosition causes a flash because state updates are async
      // but shared value updates are sync.

      // Set expanding state
      setIsExpandingToReader(true);

      // Start the flip animation
      requestAnimationFrame(() => {
        pageFlipProgress.value = withTiming(1, {
          duration: COVER_FLIP_DURATION,
          easing: Easing.inOut(Easing.cubic)
        });

        // After flip completes + hold time, scale to full screen
        setTimeout(() => {
          // Load the story reader NOW (at start of scale) so it loads behind
          if (onBeginCallback) {
            onBeginCallback();
          }

          // Scale the book to fill the screen
          bookExpansion.value = withTiming(1, {
            duration: SCALE_DURATION,
            easing: Easing.inOut(Easing.cubic)
          });

          // After scale completes, instant switch - reader is already loaded behind
          setTimeout(() => {
            transitionOpacity.value = 0;
            overlayOpacity.value = 0;
            completeTransitionOnly();
          }, SCALE_DURATION);
        }, COVER_FLIP_DURATION + HOLD_AFTER_FLIP);
      });
    }, BUTTON_EXIT_DURATION);
  };

  // Complete transition without calling onBeginCallback (already called)
  const completeTransitionOnly = () => {
    console.log('Story transition complete');
    setIsTransitioning(false);
    setShowModeSelection(false);
    setIsExpandingToReader(false);
    setCardPosition(null);
    setTargetBookPosition(null);
    setShouldShowStoryReader(false);

    setTimeout(() => {
      transitionScale.value = 1;
      transitionX.value = 0;
      transitionY.value = 0;
      transitionOpacity.value = 1;
      overlayOpacity.value = 0;
      pageFlipProgress.value = 0;
      bookExpansion.value = 0;
    }, 50);
  };

  // User cancels (taps X)
  const cancelTransition = () => {
    console.log('Cancelling story transition');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowModeSelection(false);

    // Animate back and fade out
    transitionX.value = withTiming(0, {
      duration: 300,
      easing: Easing.out(Easing.cubic)
    });
    transitionY.value = withTiming(0, {
      duration: 300,
      easing: Easing.out(Easing.cubic)
    });
    transitionScale.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.cubic)
    });
    overlayOpacity.value = withTiming(0, {
      duration: 300,
      easing: Easing.out(Easing.quad)
    }, () => {
      runOnJS(resetTransition)();
    });
  };

  const resetTransition = () => {
    setIsTransitioning(false);
    setSelectedStoryId(null);
    setSelectedStory(null);
    setCardPosition(null);
    setTargetBookPosition(null);
    // Reset voice over state
    setCurrentVoiceOver(null);
    setAvailableVoiceOvers([]);
    setVoiceOverName('');
    transitionScale.value = 1;
    transitionX.value = 0;
    transitionY.value = 0;
    transitionOpacity.value = 1;
    overlayOpacity.value = 0;
    // Reset page flip and expansion values
    pageFlipProgress.value = 0;
    bookExpansion.value = 0;
    setIsExpandingToReader(false);
  };

  const completeTransition = () => {
    console.log('Story transition complete');
    // First hide the overlay by setting isTransitioning false
    // This removes the overlay from the DOM
    setIsTransitioning(false);
    setShowModeSelection(false);
    setIsExpandingToReader(false);
    // Keep selectedStory and selectedMode for the story reader to use
    setCardPosition(null);
    setTargetBookPosition(null);
    setShouldShowStoryReader(false);

    // Reset animation values AFTER the overlay is hidden
    // Using setTimeout to ensure the overlay is unmounted first
    setTimeout(() => {
      transitionScale.value = 1;
      transitionX.value = 0;
      transitionY.value = 0;
      transitionOpacity.value = 1;
      overlayOpacity.value = 0;
      pageFlipProgress.value = 0;
      bookExpansion.value = 0;
    }, 50);
  };

  // Start the exit animation (called by story reader when exiting)
  const startExitAnimation = (onComplete: () => void) => {
    if (!originalCardPosition || !selectedStory) {
      onComplete();
      return;
    }

    console.log('Starting exit animation back to original position:', originalCardPosition);
    setIsExitAnimating(true);
    setIsTransitioning(true);

    // Animation timing - simple: dissolve in, flip cover, animate back
    const DISSOLVE_IN_DURATION = 300;
    const COVER_FLIP_DURATION = 600;
    const RETURN_DURATION = 400;

    // Use the SAME centered position calculation as the mode selection window
    const targetScale = 1.2;
    const targetCenterX = screenWidth / 2;
    const targetCenterY = (screenHeight / 2) - 30; // Same offset as mode selection
    const scaledWidth = originalCardPosition.width * targetScale;
    const scaledHeight = originalCardPosition.height * targetScale;
    const centeredPosition = {
      x: targetCenterX - scaledWidth / 2,
      y: targetCenterY - scaledHeight / 2,
      width: scaledWidth,
      height: scaledHeight,
    };

    // Start with the book at center, page open (first page showing)
    setCardPosition(centeredPosition);
    setTargetBookPosition(centeredPosition);

    // Initial state: page is open, overlay fading in
    transitionX.value = 0;
    transitionY.value = 0;
    transitionScale.value = 1;
    transitionOpacity.value = 0; // Start invisible, fade in
    overlayOpacity.value = 0;
    pageFlipProgress.value = 1; // Page is open

    // Phase 1: Fade in the overlay with the first page showing
    transitionOpacity.value = withTiming(1, {
      duration: DISSOLVE_IN_DURATION,
      easing: Easing.out(Easing.quad)
    });
    overlayOpacity.value = withTiming(0.85, {
      duration: DISSOLVE_IN_DURATION,
      easing: Easing.out(Easing.quad)
    });

    // Phase 2: Flip the cover back over the page
    setTimeout(() => {
      pageFlipProgress.value = withTiming(0, {
        duration: COVER_FLIP_DURATION,
        easing: Easing.inOut(Easing.cubic)
      });
    }, DISSOLVE_IN_DURATION + 100);

    // Phase 3: After cover flips, animate back to original grid position
    setTimeout(() => {
      const deltaX = originalCardPosition.x - centeredPosition.x;
      const deltaY = originalCardPosition.y - centeredPosition.y;
      const scaleRatio = originalCardPosition.width / centeredPosition.width;

      transitionX.value = withTiming(deltaX, {
        duration: RETURN_DURATION,
        easing: Easing.inOut(Easing.cubic)
      });
      transitionY.value = withTiming(deltaY, {
        duration: RETURN_DURATION,
        easing: Easing.inOut(Easing.cubic)
      });
      transitionScale.value = withTiming(scaleRatio, {
        duration: RETURN_DURATION,
        easing: Easing.inOut(Easing.cubic)
      });

      // Fade out overlay as book returns
      overlayOpacity.value = withTiming(0, {
        duration: RETURN_DURATION,
        easing: Easing.out(Easing.quad)
      });
    }, DISSOLVE_IN_DURATION + 100 + COVER_FLIP_DURATION + 100);

    // Complete the animation
    setTimeout(() => {
      finishExitAnimation(onComplete);
    }, DISSOLVE_IN_DURATION + 100 + COVER_FLIP_DURATION + 100 + RETURN_DURATION + 50);
  };

  const finishExitAnimation = (onComplete: () => void) => {
    setIsExitAnimating(false);
    resetTransition();
    setOriginalCardPosition(null);
    onComplete();
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

  const overlayAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: overlayOpacity.value,
    };
  });

  // Animated style for the book cover flip (rotates around left edge like opening a book)
  // IMPORTANT: Use cardPosition.width (the actual rendered size), NOT targetBookPosition.width
  // (which is the visually scaled size). The cover element is sized relative to cardPosition.
  const coverFlipAnimatedStyle = useAnimatedStyle(() => {
    if (!cardPosition) {
      return {
        transform: [{ perspective: 1000 }, { rotateY: '0deg' }],
      };
    }

    const halfWidth = cardPosition.width / 2;
    // Rotate from 0 to -150 degrees around left edge (spine)
    // This keeps the cover visible (attached at spine) while revealing the first page
    // -150 instead of -180 so the cover doesn't completely disappear behind the book
    const rotation = interpolate(pageFlipProgress.value, [0, 1], [0, -150]);

    return {
      transform: [
        { perspective: 1200 },  // Higher perspective for less distortion
        { translateX: -halfWidth },  // Move pivot point to left edge (spine)
        { rotateY: `${rotation}deg` },
        { translateX: halfWidth },   // Move back
      ],
    };
  });

  // Animated style for book expansion to full screen
  // IMPORTANT: This must include ALL transforms (position + scale) because
  // React Native style arrays don't merge transforms - they replace them.
  const bookExpansionAnimatedStyle = useAnimatedStyle(() => {
    // Don't apply any transform until expansion actually starts
    if (!targetBookPosition || bookExpansion.value < 0.01) {
      return {};
    }

    // Calculate scale needed to fill the ENTIRE screen (use the larger ratio)
    const scaleX = screenWidth / targetBookPosition.width;
    const scaleY = screenHeight / targetBookPosition.height;
    const scaleToFill = Math.max(scaleX, scaleY);

    // Interpolate scale from 1 to full screen scale
    const expansionScale = interpolate(bookExpansion.value, [0, 1], [1, scaleToFill]);

    // MUST include the position transforms from transitionAnimatedStyle
    // because this style will override them when active
    return {
      transform: [
        { translateX: transitionX.value },
        { translateY: transitionY.value },
        { scale: transitionScale.value * expansionScale }
      ],
    };
  });

  // Load voice overs when mode selection appears
  useEffect(() => {
    if (showModeSelection && selectedStory) {
      const loadVoiceOvers = async () => {
        try {
          await voiceRecordingService.initialize();
          const voiceOvers = await voiceRecordingService.getVoiceOversForStory(selectedStory.id);
          setAvailableVoiceOvers(voiceOvers);
        } catch (error) {
          console.error('Failed to load voice overs:', error);
        }
      };
      loadVoiceOvers();
    }
  }, [showModeSelection, selectedStory]);

  // Handle creating a new voice over
  const handleCreateVoiceOver = async () => {
    if (!voiceOverName.trim() || !selectedStory) return;

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
      const newVoiceOver = await voiceRecordingService.createVoiceOver(selectedStory.id, voiceOverName.trim());
      setCurrentVoiceOver(newVoiceOver);
      setAvailableVoiceOvers(prev => [...prev, newVoiceOver]);
      setVoiceOverName('');
      setShowVoiceOverNameModal(false);
    } catch (error) {
      console.error('Failed to create voice over:', error);
      Alert.alert('Error', 'Failed to create voice over. Please try again.');
    }
  };

  // Handle selecting an existing voice over
  const handleSelectVoiceOver = (voiceOver: VoiceOver) => {
    setCurrentVoiceOver(voiceOver);
    setShowVoiceOverSelectModal(false);
  };

  // Handle deleting a voice over (requires parents only challenge)
  const handleDeleteVoiceOver = (voiceOver: VoiceOver) => {
    // Track which modal was open so we can reopen it after
    const wasNameModalOpen = showVoiceOverNameModal;
    const wasSelectModalOpen = showVoiceOverSelectModal;

    // Close the modals first
    setShowVoiceOverNameModal(false);
    setShowVoiceOverSelectModal(false);

    // Wait for modal to close, then show parents only challenge
    setTimeout(() => {
      parentsOnly.showChallenge(() => {
        Alert.alert(
          'Delete Voice Over',
          `Are you sure you want to delete "${voiceOver.name}"? This cannot be undone.`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                // Reopen the modal that was open before
                if (wasNameModalOpen) setShowVoiceOverNameModal(true);
                if (wasSelectModalOpen) setShowVoiceOverSelectModal(true);
              }
            },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                try {
                  await voiceRecordingService.deleteVoiceOver(voiceOver.id);
                  if (selectedStory) {
                    const updated = await voiceRecordingService.getVoiceOversForStory(selectedStory.id);
                    setAvailableVoiceOvers(updated);
                  }
                  if (currentVoiceOver?.id === voiceOver.id) {
                    setCurrentVoiceOver(null);
                  }
                  // Reopen the modal that was open before
                  if (wasNameModalOpen) setShowVoiceOverNameModal(true);
                  if (wasSelectModalOpen) setShowVoiceOverSelectModal(true);
                } catch (error) {
                  console.error('Failed to delete voice over:', error);
                  Alert.alert('Error', 'Failed to delete voice over. Please try again.');
                }
              },
            },
          ]
        );
      });
    }, 300);
  };

  const contextValue: StoryTransitionContextType = {
    isTransitioning,
    showModeSelection,
    selectedStoryId,
    selectedStory,
    selectedMode,
    selectedVoiceOver: currentVoiceOver,
    isExpandingToReader,
    shouldShowStoryReader,
    onBeginCallback,
    setOnBeginCallback,
    cardPosition,
    startTransition,
    selectModeAndBegin,
    cancelTransition,
    completeTransition,
    startExitAnimation,
    isExitAnimating,
    transitionScale,
    transitionX,
    transitionY,
    transitionOpacity,
    overlayOpacity,
    transitionAnimatedStyle,
  };

  // Render the cover image for the selected story
  // Use 100% width/height so the image scales properly with the container
  const renderCoverImage = () => {
    if (!selectedStory?.coverImage || !cardPosition) return null;

    const isCmsImage = typeof selectedStory.coverImage === 'string' &&
      selectedStory.coverImage.includes('api.colearnwithfreya.co.uk');

    if (isCmsImage) {
      return (
        <AuthenticatedImage
          uri={selectedStory.coverImage as string}
          style={{ width: '100%', height: '100%', borderRadius: 15 }}
          resizeMode="cover"
        />
      );
    }

    return (
      <ExpoImage
        source={typeof selectedStory.coverImage === 'string'
          ? { uri: selectedStory.coverImage }
          : selectedStory.coverImage}
        style={{ width: '100%', height: '100%', borderRadius: 15 }}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    );
  };

  // Render the first page image (revealed when cover flips open)
  // This shows the actual first page content
  const renderFirstPageImage = () => {
    if (!selectedStory?.pages || selectedStory.pages.length < 2 || !cardPosition) return null;

    // Get the first content page (index 1, after cover at index 0)
    const firstPage = selectedStory.pages[1];
    const imageSource = firstPage?.backgroundImage || firstPage?.characterImage;

    if (!imageSource) {
      // Show a placeholder with the story theme
      return (
        <View style={{
          width: '100%',
          height: '100%',
          borderRadius: 15,
          backgroundColor: '#F5F5DC',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Text style={{ fontSize: 48 }}>{selectedStory.emoji}</Text>
        </View>
      );
    }

    const isCmsImage = typeof imageSource === 'string' &&
      imageSource.includes('api.colearnwithfreya.co.uk');

    if (isCmsImage) {
      return (
        <AuthenticatedImage
          uri={imageSource as string}
          style={{ width: '100%', height: '100%', borderRadius: 15 }}
          resizeMode="cover"
        />
      );
    }

    return (
      <ExpoImage
        source={typeof imageSource === 'string' ? { uri: imageSource } : imageSource}
        style={{ width: '100%', height: '100%', borderRadius: 15 }}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    );
  };

  return (
    <StoryTransitionContext.Provider value={contextValue}>
      {children}

      {/* Book preview and mode selection overlay */}
      {isTransitioning && cardPosition && selectedStory && (
        <View style={styles.overlay} pointerEvents={showModeSelection ? 'auto' : 'none'}>
          {/* Shadow overlay background */}
          <Animated.View style={[styles.shadowOverlay, overlayAnimatedStyle]} />

          {/* X Close button - top left of book (hidden when preview modal is showing) */}
          {showModeSelection && targetBookPosition && !showPreviewModal && (
            <Animated.View
              entering={FadeIn.delay(100).duration(200)}
              style={[styles.closeButtonContainer, {
                left: targetBookPosition.x - scaledButtonSize(12),
                top: targetBookPosition.y - scaledButtonSize(12),
              }]}
            >
              <Pressable
                style={[styles.closeButton, {
                  width: scaledButtonSize(44),
                  height: scaledButtonSize(44),
                  borderRadius: scaledButtonSize(22),
                }]}
                onPress={cancelTransition}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.closeButtonText, { fontSize: scaledFontSize(20) }]}>✕</Text>
              </Pressable>
            </Animated.View>
          )}

          {/* Centered book with page flip and expansion animation */}
          <Animated.View
            style={[
              styles.bookContainer,
              {
                left: cardPosition.x,
                top: cardPosition.y,
                width: cardPosition.width,
                height: cardPosition.height,
                // Allow overflow during page flip for rotation
                overflow: (isExpandingToReader || isExitAnimating) ? 'visible' : 'hidden',
              },
              transitionAnimatedStyle,
              (isExpandingToReader || isExitAnimating) && bookExpansionAnimatedStyle,
            ]}
          >
            {/* First page behind the cover - ONLY render when flipping/exiting */}
            {(isExpandingToReader || isExitAnimating) && (
              <View
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  borderRadius: 15,
                  overflow: 'hidden',
                  backgroundColor: '#F5F5DC', // Fallback color
                }}
              >
                {renderFirstPageImage()}
              </View>
            )}

            {/* Book cover (flips open when "Begin" is pressed) */}
            <Animated.View
              style={[
                { position: 'absolute', width: '100%', height: '100%', borderRadius: 15, overflow: 'visible' },
                (isExpandingToReader || isExitAnimating) && coverFlipAnimatedStyle,
              ]}
            >
              {/* Front of cover - the cover image */}
              <View style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: 15,
                overflow: 'hidden',
                backfaceVisibility: 'hidden',
              }}>
                {renderCoverImage()}
                {/* Book spine shadow effect */}
                <View style={styles.spineGradient} />
              </View>

              {/* Back of cover - white page (rotated 180deg so it shows when cover flips) */}
              <View style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: 15,
                backgroundColor: '#FFFEF5',
                backfaceVisibility: 'hidden',
                transform: [{ rotateY: '180deg' }],
              }} />
            </Animated.View>
          </Animated.View>

          {/* Mode selection buttons - positioned to the LEFT of the book */}
          {showModeSelection && targetBookPosition && (
            <Animated.View
              entering={SlideInLeft.delay(0).duration(350).springify()}
              exiting={SlideOutLeft.duration(250)}
              style={[styles.modeSelectionContainer, {
                right: screenWidth - targetBookPosition.x + 20,
                top: targetBookPosition.y,
                height: targetBookPosition.height,
                justifyContent: 'center',
              }]}
            >
              <Pressable
                style={[
                  styles.modeButton,
                  selectedMode === 'read' && styles.modeButtonSelected,
                  {
                    borderRadius: scaledButtonSize(20),
                    paddingVertical: scaledPadding(12),
                    paddingHorizontal: scaledPadding(20),
                    gap: scaledPadding(8),
                    width: scaledButtonSize(140),
                  }
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedMode('read');
                  setCurrentVoiceOver(null); // Clear voice over for read mode
                }}
              >
                <Text style={[styles.modeButtonIcon, { fontSize: scaledFontSize(22) }]}>∞</Text>
                <Text style={[styles.modeButtonText, { fontSize: scaledFontSize(18) }]}>Read</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.modeButton,
                  selectedMode === 'record' && styles.modeButtonSelected,
                  {
                    borderRadius: scaledButtonSize(20),
                    paddingVertical: scaledPadding(12),
                    paddingHorizontal: scaledPadding(20),
                    gap: scaledPadding(8),
                    width: scaledButtonSize(140),
                  }
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedMode('record');
                  // Only show modal if no voice over is selected for record mode
                  if (!currentVoiceOver || selectedMode !== 'record') {
                    setShowVoiceOverNameModal(true);
                  }
                }}
              >
                <Text style={[styles.modeButtonIcon, { fontSize: scaledFontSize(22) }]}>●</Text>
                <Text style={[styles.modeButtonText, { fontSize: scaledFontSize(18) }]}>Record</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.modeButton,
                  selectedMode === 'narrate' && styles.modeButtonSelected,
                  {
                    borderRadius: scaledButtonSize(20),
                    paddingVertical: scaledPadding(12),
                    paddingHorizontal: scaledPadding(20),
                    gap: scaledPadding(8),
                    width: scaledButtonSize(140),
                  }
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedMode('narrate');
                  // Only show modal if no voice over is selected for narrate mode
                  if (!currentVoiceOver || selectedMode !== 'narrate') {
                    setShowVoiceOverSelectModal(true);
                  }
                }}
              >
                <Text style={[styles.modeButtonIcon, { fontSize: scaledFontSize(22) }]}>♫</Text>
                <Text style={[styles.modeButtonText, { fontSize: scaledFontSize(18) }]}>Narrate</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.modeButton,
                  {
                    borderRadius: scaledButtonSize(20),
                    paddingVertical: scaledPadding(12),
                    paddingHorizontal: scaledPadding(20),
                    gap: scaledPadding(8),
                    width: scaledButtonSize(140),
                  }
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowPreviewModal(true);
                }}
              >
                <Text style={[styles.modeButtonIcon, { fontSize: scaledFontSize(22) }]}>👁</Text>
                <Text style={[styles.modeButtonText, { fontSize: scaledFontSize(18) }]}>Preview</Text>
              </Pressable>
            </Animated.View>
          )}

          {/* Tap to begin button - same position as Surprise Me (bottom center with padding) */}
          {showModeSelection && (
            <Animated.View
              entering={SlideInDown.delay(100).duration(350).springify()}
              style={[styles.tapToBeginContainer, { bottom: insets.bottom + 20 }]}
            >
              <Pressable
                style={[
                  styles.modeButton,
                  styles.modeButtonSelected,
                  {
                    borderRadius: scaledButtonSize(20),
                    paddingVertical: scaledPadding(12),
                    paddingHorizontal: scaledPadding(24),
                    gap: scaledPadding(8),
                  }
                ]}
                onPress={() => selectModeAndBegin(selectedMode)}
              >
                <Text style={[styles.modeButtonText, { fontSize: scaledFontSize(18) }]}>
                  {selectedMode === 'record' && currentVoiceOver
                    ? `Record as: ${currentVoiceOver.name}`
                    : selectedMode === 'narrate' && currentVoiceOver
                    ? `Narrate as: ${currentVoiceOver.name}`
                    : 'Tap to begin'}
                </Text>
              </Pressable>
            </Animated.View>
          )}

          {/* Voice Over Name Modal (for Record mode) */}
          <Modal
            visible={showVoiceOverNameModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowVoiceOverNameModal(false)}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalOverlay}
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
                <Text style={styles.modalTitle}>Record Voice Over</Text>

                {/* Existing voice overs */}
                {availableVoiceOvers.length > 0 && (
                  <>
                    <Text style={styles.modalSubtitle}>Select existing to overwrite:</Text>
                    <ScrollView style={styles.voiceOverList} showsVerticalScrollIndicator={false}>
                      {availableVoiceOvers.map((vo) => (
                        <View key={vo.id} style={styles.voiceOverItemWithDelete}>
                          <Pressable
                            style={[
                              styles.voiceOverItemSelectable,
                              currentVoiceOver?.id === vo.id && styles.voiceOverItemSelected,
                            ]}
                            onPress={() => {
                              setCurrentVoiceOver(vo);
                              setShowVoiceOverNameModal(false);
                            }}
                          >
                            <Text style={styles.voiceOverItemName}>{vo.name}</Text>
                            <Text style={styles.voiceOverItemPages}>
                              {Object.keys(vo.pageRecordings).length} pages recorded
                            </Text>
                          </Pressable>
                          <Pressable
                            style={styles.deleteButton}
                            onPress={() => handleDeleteVoiceOver(vo)}
                          >
                            <Text style={styles.deleteButtonText}>✕</Text>
                          </Pressable>
                        </View>
                      ))}
                    </ScrollView>
                  </>
                )}

                {/* Create new section */}
                {availableVoiceOvers.length < 3 && (
                  <>
                    <Text style={[styles.modalSubtitle, availableVoiceOvers.length > 0 && { marginTop: 16 }]}>
                      {availableVoiceOvers.length > 0 ? 'Or create new:' : 'Enter a name:'}
                    </Text>
                    <TextInput
                      style={styles.modalInput}
                      value={voiceOverName}
                      onChangeText={setVoiceOverName}
                      placeholder="e.g., Mummy's Voice"
                      placeholderTextColor="#999"
                      autoFocus={availableVoiceOvers.length === 0}
                    />
                    <Pressable
                      style={[
                        styles.modalButton,
                        !voiceOverName.trim() && styles.modalButtonDisabled,
                      ]}
                      onPress={handleCreateVoiceOver}
                      disabled={!voiceOverName.trim()}
                    >
                      <Text style={styles.modalButtonText}>Create</Text>
                    </Pressable>
                  </>
                )}
                {availableVoiceOvers.length >= 3 && (
                  <Text style={styles.maxVoiceOversText}>Maximum of 3 voice overs reached</Text>
                )}
              </View>
            </KeyboardAvoidingView>
          </Modal>

          {/* Voice Over Selection Modal (for Narrate mode) */}
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
                    if (!currentVoiceOver) {
                      setSelectedMode('read'); // Reset to read if no voice over selected
                    }
                  }}
                >
                  <Text style={styles.modalCloseButtonText}>✕</Text>
                </Pressable>
                <Text style={styles.modalTitle}>Select Voice Over</Text>
                <Text style={styles.modalSubtitle}>Choose a recording to play</Text>
                {availableVoiceOvers.length === 0 ? (
                  <Text style={styles.noVoiceOversText}>No voice overs recorded yet</Text>
                ) : (
                  <ScrollView style={styles.voiceOverList} showsVerticalScrollIndicator={false}>
                    {availableVoiceOvers.map((vo) => (
                      <View key={vo.id} style={styles.voiceOverItemWithDelete}>
                        <Pressable
                          style={[
                            styles.voiceOverItemSelectable,
                            currentVoiceOver?.id === vo.id && styles.voiceOverItemSelected,
                          ]}
                          onPress={() => handleSelectVoiceOver(vo)}
                        >
                          <Text style={styles.voiceOverItemName}>{vo.name}</Text>
                          <Text style={styles.voiceOverItemPages}>
                            {Object.keys(vo.pageRecordings).length} pages recorded
                          </Text>
                        </Pressable>
                        <Pressable
                          style={styles.deleteButton}
                          onPress={() => handleDeleteVoiceOver(vo)}
                        >
                          <Text style={styles.deleteButtonText}>✕</Text>
                        </Pressable>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            </View>
          </Modal>

          {/* Parents Only Modal for delete confirmation */}
          <ParentsOnlyModal
            visible={parentsOnly.isVisible}
            challenge={parentsOnly.challenge}
            inputValue={parentsOnly.inputValue}
            onInputChange={parentsOnly.setInputValue}
            onSubmit={parentsOnly.handleSubmit}
            onClose={parentsOnly.handleClose}
            isInputValid={parentsOnly.isInputValid}
            scaledFontSize={scaledFontSize}
          />

          {/* Story Preview Modal (no Read Story button) */}
          <StoryPreviewModal
            story={selectedStory}
            visible={showPreviewModal}
            onClose={() => setShowPreviewModal(false)}
          />
        </View>
      )}
    </StoryTransitionContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shadowOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  closeButtonContainer: {
    position: 'absolute',
    zIndex: 1001,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  bookContainer: {
    position: 'absolute',
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  spineGradient: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 8,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  // Mode selection - matches cover page styling exactly
  modeSelectionContainer: {
    position: 'absolute',
    flexDirection: 'column',
    gap: 8,
    zIndex: 100,
    alignItems: 'flex-start',
  },
  modeButton: {
    backgroundColor: 'rgba(130, 130, 130, 0.45)',
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeButtonSelected: {
    backgroundColor: 'rgba(130, 130, 130, 0.5)',
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  modeButtonIcon: {
    fontSize: 24,
    color: '#FFFFFF',
    textAlign: 'center',
    marginRight: 10,
    zIndex: 1,
  },
  modeButtonText: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Tap to begin container
  tapToBeginContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalCloseButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Fonts.primary,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: Fonts.sans,
  },
  voiceOverList: {
    maxHeight: 200,
    marginBottom: 8,
  },
  voiceOverItem: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
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
    borderWidth: 2,
    borderColor: 'transparent',
  },
  voiceOverItemSelected: {
    borderColor: '#4ECDC4',
    backgroundColor: '#e8f8f7',
  },
  voiceOverItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    fontFamily: Fonts.primary,
  },
  voiceOverItemPages: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    fontFamily: Fonts.sans,
  },
  modalInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    fontFamily: Fonts.sans,
  },
  modalButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  modalButtonDisabled: {
    backgroundColor: '#ccc',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    fontFamily: Fonts.sans,
  },
  noVoiceOversText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    paddingVertical: 20,
    fontFamily: Fonts.sans,
  },
  maxVoiceOversText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 12,
    fontFamily: Fonts.sans,
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
});
