import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Logger } from '@/utils/logger';

const log = Logger.create('StoryTransition');
import { Dimensions, Image, InteractionManager, StyleSheet, View, Text, Pressable, TextInput, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ScreenOrientation from 'expo-screen-orientation';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
  SharedValue,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideInLeft,
  SlideOutDown,
  SlideOutLeft,
  interpolate,
  cancelAnimation,
} from 'react-native-reanimated';
import { Story } from '@/types/story';
// All story images are loaded from local cache after batch sync - no authenticated fetching needed
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { voiceRecordingService, VoiceOver } from '@/services/voice-recording-service';
import { useParentsOnlyChallenge } from '@/hooks/use-parents-only-challenge';
import { ParentsOnlyModal } from '@/components/ui/parents-only-modal';
import { StoryPreviewModal } from '@/components/stories/story-preview-modal';
import { TutorialOverlay } from '@/components/tutorial/tutorial-overlay';
import { useTutorial } from '@/contexts/tutorial-context';
import { useTranslation } from 'react-i18next';

// Animation timing constants
const MOVE_TO_CENTER_DURATION = 1600; // Slow, cinematic glide from tile to center
const BUTTONS_DELAY = 400; // Delay before buttons slide in after book settles

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

  // Callback when returning to mode selection - the _layout listens to hide story reader
  onReturnToModeSelectionCallback: (() => void) | null;
  setOnReturnToModeSelectionCallback: (callback: (() => void) | null) => void;

  // Callback when transition is cancelled - the _layout listens to restore view state
  onCancelCallback: (() => void) | null;
  setOnCancelCallback: (callback: (() => void) | null) => void;

  // Card position and size for animation
  cardPosition: { x: number; y: number; width: number; height: number } | null;

  // Animation functions
  startTransition: (storyId: string, cardLayout: { x: number; y: number; width: number; height: number }, story?: Story) => void;
  selectModeAndBegin: (mode: ReadingMode) => void;
  cancelTransition: () => void;
  completeTransition: () => void;
  startExitAnimation: (onComplete: () => void, currentPageIndex?: number) => Promise<void>;
  returnToModeSelection: (onComplete: () => void, currentPageIndex?: number) => void;
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
  const [onReturnToModeSelectionCallback, setOnReturnToModeSelectionCallback] = useState<(() => void) | null>(null);
  const [onCancelCallback, setOnCancelCallback] = useState<(() => void) | null>(null);
  const [isExitAnimating, setIsExitAnimating] = useState(false);
  // Track when we're animating the cancel transition - blocks touches during animation
  const [isCancelAnimating, setIsCancelAnimating] = useState(false);

  // Preview page browsing -swipe through story pages on the cover overlay
  const [previewPageIndex, setPreviewPageIndex] = useState(0);
  const [prevPreviewPageIndex, setPrevPreviewPageIndex] = useState<number | null>(null); // For crossfade
  const isPageFlipping = useRef(false); // Guards against concurrent flips

  // Screen dimensions state - updates when orientation changes
  const [screenDimensions, setScreenDimensions] = useState(Dimensions.get('window'));
  // Track if we rotated to landscape for the current transition (to rotate back on cancel/exit)
  const wasRotatedForTransition = useRef(false);

  // Store opening animation transform values so exit/cancel can use the EXACT same values
  // This prevents position mismatch when the book returns to the carousel
  const openingTransformRef = useRef<{ moveX: number; moveY: number; scale: number } | null>(null);

  // Voice over state for record/narrate mode selection
  const [availableVoiceOvers, setAvailableVoiceOvers] = useState<VoiceOver[]>([]);
  const [currentVoiceOver, setCurrentVoiceOver] = useState<VoiceOver | null>(null);
  const [showVoiceOverNameModal, setShowVoiceOverNameModal] = useState(false);
  const [showVoiceOverSelectModal, setShowVoiceOverSelectModal] = useState(false);
  const [voiceOverName, setVoiceOverName] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  // Ref for exit page index - synchronous, available immediately (React state is async)
  const exitPageIndexRef = useRef<number | null>(null);

  // Refs for tutorial spotlight targets (mode buttons)
  const readButtonRef = useRef<View>(null);
  const recordButtonRef = useRef<View>(null);
  const narrateButtonRef = useRef<View>(null);
  const previewButtonRef = useRef<View>(null);

  // Tutorial hook
  const { shouldShowTutorial, activeTutorial } = useTutorial();

  // Translation hook
  const { t } = useTranslation();

  // Block touches immediately when book mode tutorial should show but hasn't started yet
  const shouldBlockBookModeTouches = showModeSelection &&
    shouldShowTutorial('book_mode_tour') && activeTutorial !== 'book_mode_tour';

  const insets = useSafeAreaInsets();
  const { scaledFontSize, scaledButtonSize, scaledPadding, isTablet } = useAccessibility();
  const parentsOnly = useParentsOnlyChallenge();

  // Use screenDimensions state so layout updates when orientation changes
  const { width: screenWidth, height: screenHeight } = screenDimensions;
  const isPhone = !isTablet;
  const isLandscape = screenWidth > screenHeight;

  // Border radius for book covers - matches StoryCard (computed once, used in animations)
  const bookBorderRadius = scaledButtonSize(15);

  // Listen for dimension changes (orientation changes)
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  // Animation values for the transitioning card
  const transitionScale = useSharedValue(1);
  const transitionX = useSharedValue(0);
  const transitionY = useSharedValue(0);
  const transitionOpacity = useSharedValue(1);
  const overlayOpacity = useSharedValue(0);

  // Background image slide animation (children art texture)
  // Slides down from above viewport on entry, slides back up on exit
  const backgroundSlideY = useSharedValue(-screenHeight);

  // Book page flip and expansion animation values
  const pageFlipProgress = useSharedValue(0); // 0 = closed, 1 = open (cover rotated away)
  const bookExpansion = useSharedValue(0); // 0 = book size, 1 = full screen
  const bookRotation = useSharedValue(0); // Rotation in degrees - used to counter-rotate during screen rotation
  const [isExpandingToReader, setIsExpandingToReader] = useState(false);

  // Levitation effect -gentle vertical bob while book is in flight
  const levitationY = useSharedValue(0);

  // Preview carousel -simple slide offset for page flip animation
  const pageSlideX = useSharedValue(0);

  // Current compensated border radius - updated by bookExpansionAnimatedStyle
  // Used by child views that need to match parent's borderRadius when overflow: 'visible'
  const currentCompensatedBorderRadius = useSharedValue(bookBorderRadius);

  // Shared value for exit animating - used in animated styles for immediate effect
  // (React state isExitAnimating is async and can cause a frame delay)
  const isExitAnimatingShared = useSharedValue(0); // 0 = not exiting, 1 = exiting
  
  // Preload story images during transition
  const preloadStoryImages = (story: Story) => {
    if (!story.pages) return;

    log.debug('Preloading story images…');
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
      log.debug('Story images preloaded');
    }).catch((error) => {
      log.warn('Story image preloading failed:', error);
    });
  };

  // Helper to calculate and animate to center position
  const animateToCenter = (
    cardLayout: { x: number; y: number; width: number; height: number },
    width: number,
    height: number,
    showButtons: boolean = true
  ) => {
    // Detect if we're in phone portrait mode (phones stay in portrait for mode selection)
    const isLandscapeNow = width > height;
    const isPhonePortraitNow = isPhone && !isLandscapeNow;

    // For phone portrait mode: book positioned above center, buttons below
    // Book takes about 75% of screen width for phones (larger to fill space better)
    // For tablets: 55% of screen width
    const targetWidth = isPhonePortraitNow ? width * 0.75 : width * 0.55;
    const targetScale = targetWidth / cardLayout.width;

    // Calculate center position for the scaled book
    // Book + buttons group should be visually centered on screen
    const targetCenterX = width / 2;
    // Phone portrait: book sits slightly above true center so the book+buttons group is centered
    // Tablet/landscape: buttons are to the side, so book itself is at true vertical center
    const targetCenterY = isPhonePortraitNow
      ? height * 0.44  // Near center -leaves just enough room for mode buttons + begin button below
      : height / 2;    // True center for tablets (buttons sit beside the book)

    // Current center position
    const currentCenterX = cardLayout.x + cardLayout.width / 2;
    const currentCenterY = cardLayout.y + cardLayout.height / 2;

    // How much to move the center
    const moveX = targetCenterX - currentCenterX;
    const moveY = targetCenterY - currentCenterY;

    // Store opening animation values so exit/cancel can reuse the EXACT same values
    // This prevents position mismatch when the book returns to carousel
    openingTransformRef.current = { moveX, moveY, scale: targetScale };

    // Calculate final book position (after animation) for positioning close button
    const scaledWidth = cardLayout.width * targetScale;
    const scaledHeight = cardLayout.height * targetScale;
    const targetBookX = targetCenterX - scaledWidth / 2;
    const targetBookY = targetCenterY - scaledHeight / 2;
    setTargetBookPosition({ x: targetBookX, y: targetBookY, width: scaledWidth, height: scaledHeight });

    // Smooth bezier curve -gentle acceleration then long, soft deceleration
    const glideEasing = Easing.bezier(0.25, 0.1, 0.25, 1);

    // Animate card to center of screen
    transitionX.value = withTiming(moveX, {
      duration: MOVE_TO_CENTER_DURATION,
      easing: glideEasing,
    });

    transitionY.value = withTiming(moveY, {
      duration: MOVE_TO_CENTER_DURATION,
      easing: glideEasing,
    });

    transitionScale.value = withTiming(targetScale, {
      duration: MOVE_TO_CENTER_DURATION,
      easing: glideEasing,
    });

    // Fade in the shadow overlay (slightly faster so it's settled before the book lands)
    overlayOpacity.value = withTiming(1, {
      duration: MOVE_TO_CENTER_DURATION * 0.7,
      easing: Easing.out(Easing.quad),
    });

    // Slide the children-art background image down into view (much slower for a dramatic reveal)
    backgroundSlideY.value = withTiming(0, {
      duration: MOVE_TO_CENTER_DURATION * 1.8,
      easing: glideEasing,
    });

    // ── Levitation effect: gentle bob + glow pulse while book is in flight ──
    levitationY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 600, easing: Easing.inOut(Easing.quad) }),
        withTiming(6, { duration: 600, easing: Easing.inOut(Easing.quad) }),
      ),
      -1, // infinite
      true,
    );
    // Show mode selection buttons after animation completes
    if (showButtons) {
      setTimeout(() => {
        // Settle the levitation -ease back to 0 and stop
        levitationY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) });
        setShowModeSelection(true);
      }, MOVE_TO_CENTER_DURATION + BUTTONS_DELAY);
    }
  };

  const startTransition = async (storyId: string, cardLayout: { x: number; y: number; width: number; height: number }, story?: Story) => {
    // Reset ALL animation values from any previous transition FIRST
    pageFlipProgress.value = 0;
    bookExpansion.value = 0;
    transitionScale.value = 1;
    transitionX.value = 0;
    transitionY.value = 0;
    transitionOpacity.value = 1;
    overlayOpacity.value = 0;
    backgroundSlideY.value = -screenHeight; // Start above viewport
    cancelAnimation(levitationY);
    levitationY.value = 0;

    // Reset ALL state that could affect rendering
    setIsExitAnimating(false);
    setIsExpandingToReader(false);

    setSelectedStoryId(storyId);
    setSelectedStory(story || null);
    setCardPosition(cardLayout);
    setOriginalCardPosition(cardLayout); // Save original position for exit animation

    setIsTransitioning(true);
    setSelectedMode('read'); // Reset to default mode
    setPreviewPageIndex(0); // Reset preview to cover
    setPrevPreviewPageIndex(null);
    pageSlideX.value = 1;

    // Animate from card position to center
    transitionOpacity.value = 1;
    transitionScale.value = 1;
    transitionX.value = 0;
    transitionY.value = 0;
    overlayOpacity.value = 0;

    // Start animation synchronously so it begins on the same frame as the overlay mount
    // -withTiming runs on the UI thread and isn't affected by JS thread renders
    animateToCenter(cardLayout, screenWidth, screenHeight, true);

    // Defer image preloading until the animation has settled
    // -Image.prefetch causes JS thread pressure that jitters the animation
    if (story) {
      InteractionManager.runAfterInteractions(() => {
        preloadStoryImages(story);
      });
    }
  };

  // User selects a mode and taps "Begin"
  const selectModeAndBegin = async (mode: ReadingMode) => {
    log.info('Starting story, mode:', mode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMode(mode);

    // Hide mode selection to trigger slide-out animation
    setShowModeSelection(false);
    // Reset preview to cover so the underlying book layer shows the cover image
    // during the flip-open animation (preview overlay unmounts when showModeSelection goes false)
    setPreviewPageIndex(0);
    setPrevPreviewPageIndex(null);
    pageSlideX.value = 1;

    // Animation timing - very fast to minimize pixelation visibility during scaling
    const BUTTON_EXIT_DURATION = 300;  // Time for buttons to slide out (SlideOutDown is 250ms + buffer)
    const ROTATION_DURATION = 300;     // Time for rotation to landscape
    const COVER_FLIP_DURATION = 200;   // Fast flip to reduce pixelation visibility
    const HOLD_AFTER_FLIP = 100;       // Brief pause to see the page after cover flips
    const SCALE_DURATION = 200;        // Very fast scale to full screen

    // Just reset flip/expansion values (these don't affect position)
    bookExpansion.value = 0;
    pageFlipProgress.value = 0;

    // Wait for buttons to slide out
    await new Promise(resolve => setTimeout(resolve, BUTTON_EXIT_DURATION));

    // For phones in portrait: rotate to landscape before opening the book
    if (isPhone && !isLandscape && cardPosition) {
      log.debug('Rotating to landscape…');
      wasRotatedForTransition.current = true;

      // Fade overlay slightly to smooth the rotation
      overlayOpacity.value = withTiming(0.9, {
        duration: 150,
        easing: Easing.out(Easing.cubic)
      });

      try {
        // Rotate to landscape
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);

        // Wait for dimensions to settle
        await new Promise(resolve => setTimeout(resolve, ROTATION_DURATION));

        // Get new dimensions after rotation
        const newDims = Dimensions.get('window');
        log.debug('Landscape dims:', newDims.width, '×', newDims.height);
        setScreenDimensions(newDims);

        // Recalculate book position for landscape - center it for the opening animation
        const targetWidth = newDims.width * 0.55;
        const targetScale = targetWidth / cardPosition.width;
        const targetHeight = cardPosition.height * targetScale;
        const targetCenterX = newDims.width / 2;
        const targetCenterY = newDims.height / 2;

        // Update target book position for landscape
        setTargetBookPosition({
          x: targetCenterX - targetWidth / 2,
          y: targetCenterY - targetHeight / 2,
          width: targetWidth,
          height: targetHeight,
        });

        // Animate book to center of landscape screen
        const cardCenterX = cardPosition.x + cardPosition.width / 2;
        const cardCenterY = cardPosition.y + cardPosition.height / 2;
        const landscapeMoveX = targetCenterX - cardCenterX;
        const landscapeMoveY = targetCenterY - cardCenterY;

        transitionX.value = withTiming(landscapeMoveX, { duration: 200, easing: Easing.out(Easing.cubic) });
        transitionY.value = withTiming(landscapeMoveY, { duration: 200, easing: Easing.out(Easing.cubic) });
        transitionScale.value = withTiming(targetScale, { duration: 200, easing: Easing.out(Easing.cubic) });

        // UPDATE opening transform ref with LANDSCAPE values
        // This is critical for exit animation to use the correct centering values
        openingTransformRef.current = { moveX: landscapeMoveX, moveY: landscapeMoveY, scale: targetScale };

        // Wait for position animation
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        log.warn('Failed to rotate to landscape:', error);
      }
    }

    // Set expanding state
    setIsExpandingToReader(true);

    requestAnimationFrame(() => {
      // PHASE 1: Flip the cover (2D scaleX - no pixelation!)
      pageFlipProgress.value = withTiming(1, {
        duration: COVER_FLIP_DURATION,
        easing: Easing.inOut(Easing.cubic)
      });

      // PHASE 2: After flip completes + hold, scale to full screen
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
  };

  // Complete transition without calling onBeginCallback (already called)
  const completeTransitionOnly = () => {
    log.debug('Transition complete');
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

  // Return to portrait orientation on phones
  const returnToPortrait = async () => {
    if (wasRotatedForTransition.current) {
      log.debug('Returning to portrait…');
      wasRotatedForTransition.current = false;
      try {
        // Lock back to portrait (phones should stay portrait-locked)
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);

        // Wait for the orientation change to take effect
        await new Promise(resolve => setTimeout(resolve, 100));

        // Update dimensions
        const newDims = Dimensions.get('window');
        setScreenDimensions(newDims);

        // Note: Do NOT call unlockAsync() - phones should remain portrait-locked
      } catch (error) {
        log.warn('Failed to return to portrait:', error);
      }
    }
  };

  // User cancels (taps X) -book slides down, then background slides up
  const cancelTransition = async () => {
    log.debug('Cancelling transition');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Block touches during the entire cancel animation
    setIsCancelAnimating(true);

    // Step 1: Trigger button exit animations (SlideOutLeft takes 250ms)
    setShowModeSelection(false);

    // Step 2: Wait for button exit animations to complete
    await new Promise(resolve => setTimeout(resolve, 280));

    // If we rotated for this transition, rotate back to portrait first
    if (wasRotatedForTransition.current && originalCardPosition) {
      log.debug('Cancel: rotating back to portrait');
      await returnToPortrait();
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    const SLIDE_DURATION = 400;
    const currentHeight = Dimensions.get('window').height;

    // Slide book down off screen
    transitionY.value = withTiming(currentHeight + 200, {
      duration: SLIDE_DURATION,
      easing: Easing.in(Easing.cubic)
    });

    // Wait for book to slide out, then slide background up
    setTimeout(() => {
      transitionOpacity.value = 0; // Hide the animated book (already off-screen)

      backgroundSlideY.value = withTiming(-currentHeight, {
        duration: SLIDE_DURATION,
        easing: Easing.in(Easing.cubic)
      });
      overlayOpacity.value = withTiming(0, {
        duration: SLIDE_DURATION,
        easing: Easing.out(Easing.quad)
      });

      // Complete -resetTransition will clear selectedStoryId and unmount overlay
      setTimeout(() => {
        resetTransition();
      }, SLIDE_DURATION + 50);
    }, SLIDE_DURATION);
  };

  const resetTransition = () => {
    // First: unmount the overlay by clearing state
    // Do NOT reset shared values here -they run on the UI thread immediately,
    // but React re-render is async. If we reset transitionX/Y/Scale to 0 now,
    // the book would snap back to its tile position for 1 frame before the overlay unmounts.
    setIsTransitioning(false);
    setSelectedStoryId(null);
    setSelectedStory(null);
    setCardPosition(null);
    setTargetBookPosition(null);
    // Reset voice over state
    setCurrentVoiceOver(null);
    setAvailableVoiceOvers([]);
    setVoiceOverName('');
    setIsExpandingToReader(false);
    setShowPreviewModal(false);
    // Reset rotation tracking
    wasRotatedForTransition.current = false;
    // Clear stored opening transform values
    openingTransformRef.current = null;
    // Reset cancel animation flag
    setIsCancelAnimating(false);
    // Notify _layout that transition was cancelled so it can restore view state
    if (onCancelCallback) {
      onCancelCallback();
    }

    // Reset shared values AFTER React has unmounted the overlay (next frame)
    // This prevents the 1-frame snap-back where the book jumps to tile position
    setTimeout(() => {
      transitionScale.value = 1;
      transitionX.value = 0;
      transitionY.value = 0;
      transitionOpacity.value = 1;
      overlayOpacity.value = 0;
      backgroundSlideY.value = -screenHeight;
      pageFlipProgress.value = 0;
      bookExpansion.value = 0;
      bookRotation.value = 0;
      isExitAnimatingShared.value = 0;
      isExpandingOrExitingShared.value = 0;
      exitCardX.value = 0;
      exitCardY.value = 0;
      exitCardWidth.value = 0;
      exitCardHeight.value = 0;
    }, 50);
  };

  const completeTransition = () => {
    log.debug('Transition complete');
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
      backgroundSlideY.value = -screenHeight;
    }, 50);
  };

  // Start the exit animation (called by story reader when exiting)
  // Flow: Take over at full screen → shrink with curved box → close cover → return to tile
  // This mirrors the opening animation but in reverse
  // On PHONE: shrink first (while in landscape), rotate to portrait, then close cover and return
  // On TABLET: no rotation needed, just shrink/close/return
  const startExitAnimation = async (onComplete: () => void, currentPageIndex?: number) => {
    if (!originalCardPosition || !selectedStory) {
      onComplete();
      return;
    }

    // Get current screen dimensions to detect if we're in landscape
    const currentDims = Dimensions.get('window');
    const currentWidth = currentDims.width;
    const currentHeight = currentDims.height;
    const isCurrentlyLandscape = currentWidth > currentHeight;

    // Detect phone vs tablet based on the SMALLER dimension (doesn't change with orientation)
    // Phones typically have a smaller dimension under 500-600 points
    const smallerDimension = Math.min(currentWidth, currentHeight);
    const isActuallyPhone = smallerDimension < 500;

    // We need to rotate if: we're on a phone AND currently in landscape
    // (phone story reader forces landscape, so we need to rotate back to portrait on exit)
    const needsRotation = isActuallyPhone && isCurrentlyLandscape;

    log.debug(`Exit animation: phone=${isActuallyPhone}, landscape=${isCurrentlyLandscape}, needsRotation=${needsRotation}`);

    // Animation timing - slowed down for smoother feel
    const SHRINK_DURATION = 350;       // Shrink from full screen to book size
    const HOLD_AFTER_SHRINK = 150;     // Pause after shrink before next phase
    const COVER_FLIP_DURATION = 300;   // Flip to close cover
    const RETURN_DURATION = 600;       // Smooth return to tile position

    // Use STORED opening animation values (exact same as when opened)
    // This ensures the book returns to the EXACT position it was at when opened
    const storedTransform = openingTransformRef.current;
    const moveX = storedTransform?.moveX ?? 0;
    const moveY = storedTransform?.moveY ?? 0;
    const targetScale = storedTransform?.scale ?? 1;

    // Calculate final book position for targetBookPosition using stored values
    const scaledWidth = originalCardPosition.width * targetScale;
    const scaledHeight = originalCardPosition.height * targetScale;
    // For centered position, use stored moveX/moveY to derive the target position
    const cardCenterX = originalCardPosition.x + originalCardPosition.width / 2;
    const cardCenterY = originalCardPosition.y + originalCardPosition.height / 2;
    const targetCenterX = cardCenterX + moveX;
    const targetCenterY = cardCenterY + moveY;
    const targetBookX = targetCenterX - scaledWidth / 2;
    const targetBookY = targetCenterY - scaledHeight / 2;

    const centeredPosition = {
      x: targetBookX,
      y: targetBookY,
      width: scaledWidth,
      height: scaledHeight,
    };

    // SET ALL ANIMATION VALUES FIRST - before any state changes
    // For phones in landscape, use landscape screen center so the book stays centered
    // during shrink (otherwise it drifts to the portrait center position).
    // For tablets/portrait, use the stored opening values.
    if (needsRotation) {
      // Center the book on the landscape screen at the same scale as the original selection view
      const cardCX = originalCardPosition.x + originalCardPosition.width / 2;
      const cardCY = originalCardPosition.y + originalCardPosition.height / 2;
      transitionX.value = currentWidth / 2 - cardCX;
      transitionY.value = currentHeight / 2 - cardCY;
      transitionScale.value = targetScale; // Same scale as when the book was originally selected
    } else {
      transitionX.value = moveX;          // Same X offset as end of opening animation
      transitionY.value = moveY;          // Same Y offset as end of opening animation
      transitionScale.value = targetScale; // Same scale as end of opening animation
    }
    transitionOpacity.value = 1;
    pageFlipProgress.value = 1;         // Cover is open (current page visible)
    bookExpansion.value = 1;            // Start at FULL SCREEN
    overlayOpacity.value = 1;           // Full opacity - hides everything until book renders
    isExitAnimatingShared.value = 1;        // Set immediately for animated styles
    isExpandingOrExitingShared.value = 1;   // Also set this for styles that check it

    // Set exit card position in shared values
    exitCardX.value = originalCardPosition.x;
    exitCardY.value = originalCardPosition.y;
    exitCardWidth.value = originalCardPosition.width;
    exitCardHeight.value = originalCardPosition.height;

    // Set current screen dimensions in shared values for exit animation
    // This ensures the animated style uses the correct (current) screen dimensions
    // rather than potentially stale React state captured in the worklet closure
    exitScreenWidth.value = currentWidth;
    exitScreenHeight.value = currentHeight;

    // Use ORIGINAL card position as base (same as opening animation)
    // This way animating transitionX/Y/Scale to 0/0/1 returns to original position
    // Set ref IMMEDIATELY (synchronous) so renderPageImage uses correct page on first render
    exitPageIndexRef.current = currentPageIndex ?? 1;
    setCardPosition(originalCardPosition);
    setTargetBookPosition(centeredPosition);
    setIsExitAnimating(true);
    setIsTransitioning(true);

    // Delay before starting animations to let React render with correct initial state
    const SETTLE_DELAY = 50;

    // Quickly fade overlay from fully opaque (1) to slightly transparent
    // so the book shrink animation is visible
    setTimeout(() => {
      overlayOpacity.value = withTiming(0.85, {
        duration: 100,
        easing: Easing.out(Easing.quad)
      });
    }, 16); // After first frame

    // Phase 1: Shrink from full screen to centered book size (with curved corners)
    setTimeout(() => {
      log.debug('Shrinking to book size…');
      bookExpansion.value = withTiming(0, {
        duration: SHRINK_DURATION,
        easing: Easing.out(Easing.cubic)  // Ease out for more natural deceleration
      });
    }, SETTLE_DELAY);

    // If we need to rotate (phone in landscape): shrink, close cover, fade to black, rotate, fade in
    // The carousel isn't visible in landscape, so we use the overlay as a transition screen
    if (needsRotation) {
      log.debug('Phone exit: landscape → portrait → slide out');

      // Mirrored timing from selectModeAndBegin opening animation
      const ROTATION_WAIT = 300;           // Same as ROTATION_DURATION in opening
      const REPOSITION_DURATION = 200;     // Same as opening reposition (200ms)
      const REPOSITION_SETTLE = 200;       // Same as opening settle wait

      // Wait for shrink to complete
      await new Promise(resolve => setTimeout(resolve, SETTLE_DELAY + SHRINK_DURATION + HOLD_AFTER_SHRINK));

      // Phase 2: Close the cover (still in landscape) -reverse of opening's cover flip
      pageFlipProgress.value = withTiming(0, {
        duration: COVER_FLIP_DURATION,
        easing: Easing.inOut(Easing.cubic)
      });
      await new Promise(resolve => setTimeout(resolve, COVER_FLIP_DURATION + 100));

      // Phase 3: Fade overlay -same as opening's overlay fade (reversed: we fade IN)
      overlayOpacity.value = withTiming(0.9, {
        duration: 150,
        easing: Easing.out(Easing.cubic)
      });
      await new Promise(resolve => setTimeout(resolve, 150));

      // Phase 4: Rotate to portrait -reverse of opening's rotate to landscape
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        await new Promise(resolve => setTimeout(resolve, ROTATION_WAIT));
      } catch (error) {
        log.warn('Failed to rotate to portrait during exit:', error);
      }

      const portraitDims = Dimensions.get('window');
      const portraitW = portraitDims.width;
      const portraitH = portraitDims.height;
      setScreenDimensions(portraitDims);

      // Phase 5: Animate book to portrait center -reverse of opening's landscape reposition
      // Same duration (200ms) and easing as the opening animation
      const cardCX = originalCardPosition.x + originalCardPosition.width / 2;
      const cardCY = originalCardPosition.y + originalCardPosition.height / 2;
      const portraitTargetWidth = portraitW * 0.75;
      const portraitScale = portraitTargetWidth / originalCardPosition.width;
      const portraitCenterX = portraitW / 2;
      const portraitCenterY = portraitH * 0.32;

      exitCardWidth.value = 0;
      exitCardHeight.value = 0;
      bookExpansion.value = 0;
      pageFlipProgress.value = 0;

      transitionX.value = withTiming(portraitCenterX - cardCX, {
        duration: REPOSITION_DURATION,
        easing: Easing.out(Easing.cubic)
      });
      transitionY.value = withTiming(portraitCenterY - cardCY, {
        duration: REPOSITION_DURATION,
        easing: Easing.out(Easing.cubic)
      });
      transitionScale.value = withTiming(portraitScale, {
        duration: REPOSITION_DURATION,
        easing: Easing.out(Easing.cubic)
      });
      await new Promise(resolve => setTimeout(resolve, REPOSITION_DURATION + REPOSITION_SETTLE));

      // Phase 6: Slide book down off screen
      const SLIDE_DURATION = 400;
      const currentMoveY = portraitCenterY - cardCY;
      transitionY.value = withTiming(currentMoveY + portraitH + 200, {
        duration: SLIDE_DURATION,
        easing: Easing.in(Easing.cubic)
      });
      await new Promise(resolve => setTimeout(resolve, SLIDE_DURATION));

      // Phase 7: Slide background up to reveal menu
      transitionOpacity.value = 0;
      backgroundSlideY.value = withTiming(-portraitH, { duration: SLIDE_DURATION, easing: Easing.in(Easing.cubic) });
      overlayOpacity.value = withTiming(0, { duration: SLIDE_DURATION, easing: Easing.out(Easing.quad) });
      await new Promise(resolve => setTimeout(resolve, SLIDE_DURATION + 50));

      finishExitAnimation(onComplete);
    } else {
      // TABLET or already portrait: Original flow - no rotation needed
      log.debug('Tablet/portrait exit flow');
      const SLIDE_DOWN_DURATION = 500; // Book slides down off screen

      // Phase 2: Close the cover
      setTimeout(() => {
        pageFlipProgress.value = withTiming(0, {
          duration: COVER_FLIP_DURATION,
          easing: Easing.inOut(Easing.cubic)
        });
      }, SETTLE_DELAY + SHRINK_DURATION + HOLD_AFTER_SHRINK);

      // Phase 3: Hold briefly at the selection view (centered book, cover closed)
      const HOLD_AT_SELECTION = 300; // Let user see the selection view before slide-out
      const phase3Start = SETTLE_DELAY + SHRINK_DURATION + HOLD_AFTER_SHRINK + COVER_FLIP_DURATION + HOLD_AT_SELECTION;

      // Phase 4: Slide the book down off screen
      setTimeout(() => {
        const slideTarget = currentHeight + 200; // Well below viewport
        transitionY.value = withTiming(moveY + slideTarget, {
          duration: SLIDE_DOWN_DURATION,
          easing: Easing.in(Easing.cubic)
        });
      }, phase3Start);

      // Phase 5: After book slides out, fade overlay away (no background slide in portrait/tablet)
      setTimeout(() => {
        transitionOpacity.value = 0; // Hide animated book (already off-screen)

        overlayOpacity.value = withTiming(0, {
          duration: SLIDE_DOWN_DURATION,
          easing: Easing.out(Easing.quad)
        });
        backgroundSlideY.value = withTiming(-currentHeight, {
          duration: SLIDE_DOWN_DURATION,
          easing: Easing.out(Easing.quad)
        });
      }, phase3Start + SLIDE_DOWN_DURATION);

      // Complete the animation
      setTimeout(() => {
        finishExitAnimation(onComplete);
      }, phase3Start + SLIDE_DOWN_DURATION * 2 + 50);
    }
  };

  const finishExitAnimation = (onComplete: () => void) => {
    // Don't reset shared values here -resetTransition defers them to avoid snap-back.
    // Just clear React state to unmount the overlay.
    setIsExitAnimating(false);
    exitPageIndexRef.current = null;
    resetTransition();
    setOriginalCardPosition(null);
    onComplete();
  };

  // Return to mode selection overlay (from story reader, e.g., after recording completes)
  // Animates from full screen back to centered book with mode selection buttons
  // Reverse of selectModeAndBegin: shrink -> flip cover back -> show buttons
  const returnToModeSelection = (onComplete: () => void, currentPageIndex?: number) => {
    if (!originalCardPosition || !selectedStory) {
      onComplete();
      return;
    }

    log.debug('Returning to mode selection');

    // Get CURRENT screen dimensions - we're returning from story reader which is in landscape
    // Don't use screenDimensions state as it may have stale portrait values
    const currentDims = Dimensions.get('window');
    const currentScreenWidth = currentDims.width;
    const currentScreenHeight = currentDims.height;
    const isCurrentLandscape = currentScreenWidth > currentScreenHeight;
    const isPhoneLandscape = isPhone && isCurrentLandscape;
    log.debug(`Mode selection dims: ${currentDims.width}×${currentDims.height}, phone=${isPhone}, landscape=${isPhoneLandscape}`);

    // IMPORTANT: Update screenDimensions state so the button rendering uses current landscape values
    // Without this, buttons would use stale portrait dimensions and get wrong sizing
    setScreenDimensions(currentDims);

    // Animation timing (reverse of selectModeAndBegin)
    const SHRINK_DURATION = 200;        // Shrink from full screen to book size
    const HOLD_AFTER_SHRINK = 100;      // Brief pause before flipping
    const COVER_FLIP_DURATION = 200;    // Flip cover back
    const BUTTONS_DELAY = 50;           // Delay before showing buttons

    // Calculate the centered position using CURRENT dimensions (landscape)
    // For phone landscape: use 35% of width - balanced size for phone screens
    // For tablet: use 55% of width
    const targetWidthPercent = isPhoneLandscape ? 0.35 : 0.55;
    const targetWidth = currentScreenWidth * targetWidthPercent;
    const targetScale = targetWidth / originalCardPosition.width;
    // For phone landscape: shift book slightly right to make room for buttons on left
    const targetCenterX = isPhoneLandscape ? currentScreenWidth * 0.55 : currentScreenWidth / 2;
    // True vertical center for all devices
    const targetCenterY = currentScreenHeight / 2;
    const currentCenterX = originalCardPosition.x + originalCardPosition.width / 2;
    const currentCenterY = originalCardPosition.y + originalCardPosition.height / 2;
    const moveX = targetCenterX - currentCenterX;
    const moveY = targetCenterY - currentCenterY;
    const scaledWidth = originalCardPosition.width * targetScale;
    const scaledHeight = originalCardPosition.height * targetScale;
    const targetBookX = targetCenterX - scaledWidth / 2;
    const targetBookY = targetCenterY - scaledHeight / 2;

    const centeredPosition = {
      x: targetBookX,
      y: targetBookY,
      width: scaledWidth,
      height: scaledHeight,
    };

    // Set initial values (starting from full screen, showing first page)
    transitionX.value = moveX;
    transitionY.value = moveY;
    transitionScale.value = targetScale;
    transitionOpacity.value = 1;
    pageFlipProgress.value = 1; // Start showing first page (flipped open)
    bookExpansion.value = 1;    // Full screen
    overlayOpacity.value = 1;
    isExitAnimatingShared.value = 1;
    isExpandingOrExitingShared.value = 1;

    // Set exit card position in shared values (React state is async, shared values are immediate)
    exitCardX.value = originalCardPosition.x;
    exitCardY.value = originalCardPosition.y;
    exitCardWidth.value = originalCardPosition.width;
    exitCardHeight.value = originalCardPosition.height;

    // Set current screen dimensions in shared values for the animated style
    // This is critical - bookExpansionAnimatedStyle uses these to calculate correct centering
    exitScreenWidth.value = currentScreenWidth;
    exitScreenHeight.value = currentScreenHeight;

    // Set page index for renderPageImage - show the current page during the shrink animation
    exitPageIndexRef.current = currentPageIndex ?? 1;

    // Set state
    setCardPosition(originalCardPosition);
    setTargetBookPosition(centeredPosition);
    setIsExitAnimating(true);
    setIsTransitioning(true);

    // Now hide the story reader - the animated book will be visible on top
    if (onReturnToModeSelectionCallback) {
      onReturnToModeSelectionCallback();
    }

    // PHASE 1: Shrink from full screen to book size
    requestAnimationFrame(() => {
      bookExpansion.value = withTiming(0, {
        duration: SHRINK_DURATION,
        easing: Easing.inOut(Easing.cubic)
      });
      overlayOpacity.value = withTiming(0.92, {
        duration: SHRINK_DURATION,
        easing: Easing.out(Easing.quad)
      });

      // PHASE 2: After shrink completes, flip cover back
      setTimeout(() => {
        pageFlipProgress.value = withTiming(0, {
          duration: COVER_FLIP_DURATION,
          easing: Easing.inOut(Easing.cubic)
        });

        // PHASE 3: After flip completes, show mode selection buttons
        setTimeout(() => {
          isExitAnimatingShared.value = 0;
          isExpandingOrExitingShared.value = 0;
          exitPageIndexRef.current = null; // Reset page index ref
          setIsExitAnimating(false);
          setShowModeSelection(true);
          setSelectedMode('read'); // Reset to default mode
          onComplete();
        }, COVER_FLIP_DURATION + BUTTONS_DELAY);
      }, SHRINK_DURATION + HOLD_AFTER_SHRINK);
    });
  };

  const transitionAnimatedStyle = useAnimatedStyle(() => {
    // Compensate border radius for scale to keep visual radius consistent
    // When element is scaled up, we need to reduce border radius proportionally
    const compensatedBorderRadius = bookBorderRadius / transitionScale.value;

    return {
      transform: [
        { translateX: transitionX.value },
        { translateY: transitionY.value + levitationY.value },
        { scale: transitionScale.value },
        { rotate: `${bookRotation.value}deg` }
      ],
      opacity: transitionOpacity.value,
      borderRadius: compensatedBorderRadius,
    };
  });



  const overlayAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: overlayOpacity.value,
    };
  });

  const backgroundSlideAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: backgroundSlideY.value }],
    };
  });

  // Check if expansion/exit animations should be active (using shared value for immediate effect)
  const isExpandingOrExitingShared = useSharedValue(0);

  // Sync the shared value with React state
  // This ensures the shared value is updated when isExpandingToReader or isExitAnimating changes
  useEffect(() => {
    isExpandingOrExitingShared.value = (isExpandingToReader || isExitAnimating) ? 1 : 0;
  }, [isExpandingToReader, isExitAnimating]);

  // Animated style for the book cover flip (rotates around left edge like opening a book)
  // Uses shared values for immediate effect during exit
  const coverFlipAnimatedStyle = useAnimatedStyle(() => {
    // Check shared values directly for immediate effect
    const isActive = isExitAnimatingShared.value === 1 || isExpandingOrExitingShared.value === 1;
    if (!cardPosition || !isActive) {
      return {
        transform: [{ perspective: 1000 }, { rotateY: '0deg' }],
      };
    }

    const halfWidth = cardPosition.width / 2;
    // Rotate from 0 to -150 degrees around left edge (spine)
    const rotation = interpolate(pageFlipProgress.value, [0, 1], [0, -150]);

    return {
      transform: [
        { perspective: 1200 },
        { translateX: -halfWidth },
        { rotateY: `${rotation}deg` },
        { translateX: halfWidth },
      ],
    };
  });

  // Animated style for cover front face - hide when rotated past 90 degrees
  // Also handles borderRadius compensation when parent has overflow: 'visible' during expansion
  const coverFrontFaceStyle = useAnimatedStyle(() => {
    const isActive = isExitAnimatingShared.value === 1 || isExpandingOrExitingShared.value === 1;

    // Use the shared compensated border radius - this is updated by bookExpansionAnimatedStyle
    // to match the parent container's borderRadius during expansion
    const compensatedBorderRadius = currentCompensatedBorderRadius.value;

    if (!isActive) return { opacity: 1, borderRadius: compensatedBorderRadius };

    const rotation = interpolate(pageFlipProgress.value, [0, 1], [0, -150]);
    const opacity = Math.abs(rotation) < 90 ? 1 : 0;

    return { opacity, borderRadius: compensatedBorderRadius };
  });

  // Animated style for cover back face - show when rotated past 90 degrees
  // Also handles borderRadius compensation when parent has overflow: 'visible' during expansion
  const coverBackFaceStyle = useAnimatedStyle(() => {
    const isActive = isExitAnimatingShared.value === 1 || isExpandingOrExitingShared.value === 1;

    // Use the shared compensated border radius - this is updated by bookExpansionAnimatedStyle
    const compensatedBorderRadius = currentCompensatedBorderRadius.value;

    if (!isActive) return { opacity: 0, borderRadius: compensatedBorderRadius };

    const rotation = interpolate(pageFlipProgress.value, [0, 1], [0, -150]);
    const opacity = Math.abs(rotation) >= 90 ? 1 : 0;
    return { opacity, borderRadius: compensatedBorderRadius };
  });

  // Animated style for the first page behind the cover
  // Needs borderRadius when parent has overflow: 'visible' during expansion
  const firstPageAnimatedStyle = useAnimatedStyle(() => {
    return { borderRadius: currentCompensatedBorderRadius.value };
  });

  // Store original card position in shared values for exit animation (React state is async)
  const exitCardX = useSharedValue(0);
  const exitCardY = useSharedValue(0);
  const exitCardWidth = useSharedValue(0);
  const exitCardHeight = useSharedValue(0);

  // Store screen dimensions in shared values for exit animation (React state can be stale in worklets)
  const exitScreenWidth = useSharedValue(screenWidth);
  const exitScreenHeight = useSharedValue(screenHeight);

  // Animated style for book expansion to full screen
  // IMPORTANT: This must include ALL transforms (position + scale) because
  // React Native style arrays don't merge transforms - they replace them.
  const bookExpansionAnimatedStyle = useAnimatedStyle(() => {
    const isExiting = isExitAnimatingShared.value === 1;

    // During EXIT: Use shared values for the exit card position AND screen dimensions
    // React state can be stale in worklets, so we use shared values that are updated
    // at the start of startExitAnimation to ensure correct centering
    if (isExiting && exitCardWidth.value > 0) {
      // bookExpansion: 1 = full screen, 0 = centered book size (same as opening animation)
      // transitionScale.value holds the scale from tile to centered book

      // Use shared values for screen dimensions (set at start of exit animation)
      const currentScreenWidth = exitScreenWidth.value;
      const currentScreenHeight = exitScreenHeight.value;

      // Calculate full screen scale based on original card size
      const scaleToFillX = currentScreenWidth / exitCardWidth.value;
      const scaleToFillY = currentScreenHeight / exitCardHeight.value;
      const scaleToFill = Math.max(scaleToFillX, scaleToFillY);

      // Current scale: interpolate from CENTERED BOOK scale to full-screen scale
      // transitionScale.value is the scale from tile to centered book (set during opening)
      const currentScale = interpolate(bookExpansion.value, [0, 1], [transitionScale.value, scaleToFill]);

      // The center of the original card (tile position)
      const cardCenterX = exitCardX.value + exitCardWidth.value / 2;
      const cardCenterY = exitCardY.value + exitCardHeight.value / 2;

      // The center of the screen (using shared values for current dimensions)
      const screenCenterX = currentScreenWidth / 2;
      const screenCenterY = currentScreenHeight / 2;

      // How much to move to center the card on screen
      const moveToScreenCenterX = screenCenterX - cardCenterX;
      const moveToScreenCenterY = screenCenterY - cardCenterY;

      // Interpolate position:
      // bookExpansion=1: centered on screen (full screen mode)
      // bookExpansion=0: use transitionX/Y (centered book position - same offset used during opening)
      const currentTranslateX = interpolate(bookExpansion.value, [0, 1], [transitionX.value, moveToScreenCenterX]);
      const currentTranslateY = interpolate(bookExpansion.value, [0, 1], [transitionY.value, moveToScreenCenterY]);

      // Border radius: keep compensated for current scale (maintains curved appearance)
      // The visual radius stays consistent as the book scales up/down
      const currentBorderRadius = bookBorderRadius / currentScale;

      // Update shared value for child views to use
      currentCompensatedBorderRadius.value = currentBorderRadius;

      return {
        transform: [
          { translateX: currentTranslateX },
          { translateY: currentTranslateY },
          { scale: currentScale }
        ],
        borderRadius: currentBorderRadius,
      };
    }

    // OPENING animation (expanding to reader): use the existing system
    if (!targetBookPosition || bookExpansion.value < 0.01) {
      // Not expanding - update shared value to match transitionAnimatedStyle
      currentCompensatedBorderRadius.value = bookBorderRadius / transitionScale.value;
      return {};
    }

    // Calculate scale needed to fill the ENTIRE screen (use the larger ratio)
    const scaleX = screenWidth / targetBookPosition.width;
    const scaleY = screenHeight / targetBookPosition.height;
    const scaleToFill = Math.max(scaleX, scaleY);

    // Interpolate scale from 1 to full screen scale
    const expansionScale = interpolate(bookExpansion.value, [0, 1], [1, scaleToFill]);

    // Combined scale
    const combinedScale = transitionScale.value * expansionScale;

    // Border radius: keep compensated for current scale (maintains curved appearance)
    // The visual radius stays consistent as the book scales up to full screen
    const currentBorderRadius = bookBorderRadius / combinedScale;

    // Update shared value for child views to use
    currentCompensatedBorderRadius.value = currentBorderRadius;

    // MUST include the position transforms from transitionAnimatedStyle
    // because this style will override them when active
    return {
      transform: [
        { translateX: transitionX.value },
        { translateY: transitionY.value },
        { scale: combinedScale }
      ],
      borderRadius: currentBorderRadius,
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
          log.error('Failed to load voice overs:', error);
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
      Alert.alert(t('storyMode.nameAlreadyExists'), t('storyMode.nameAlreadyExistsMessage', { name: voiceOverName.trim() }));
      return;
    }

    try {
      const newVoiceOver = await voiceRecordingService.createVoiceOver(selectedStory.id, voiceOverName.trim());
      setCurrentVoiceOver(newVoiceOver);
      setAvailableVoiceOvers(prev => [...prev, newVoiceOver]);
      setVoiceOverName('');
      setShowVoiceOverNameModal(false);
    } catch (error) {
      log.error('Failed to create voice over:', error);
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
                  log.error('Failed to delete voice over:', error);
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
    onReturnToModeSelectionCallback,
    setOnReturnToModeSelectionCallback,
    onCancelCallback,
    setOnCancelCallback,
    cardPosition,
    startTransition,
    selectModeAndBegin,
    cancelTransition,
    completeTransition,
    startExitAnimation,
    returnToModeSelection,
    isExitAnimating,
    transitionScale,
    transitionX,
    transitionY,
    transitionOpacity,
    overlayOpacity,
    transitionAnimatedStyle,
  };

  // Render the cover image for the selected story
  // Note: No borderRadius on images - parent container handles clipping with overflow: hidden
  // All images are loaded from local cache after batch sync
  const renderCoverImage = () => {
    if (!selectedStory?.coverImage || !cardPosition) return null;

    return (
      <ExpoImage
        source={typeof selectedStory.coverImage === 'string'
          ? { uri: selectedStory.coverImage }
          : selectedStory.coverImage}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
        cachePolicy="memory-disk"
        priority="high"
      />
    );
  };

  // Render a page image (revealed when cover flips open, or during exit)
  // pageIndex defaults to 1 (first content page) for opening, or exitPageIndex for exiting
  // Note: No borderRadius on images - parent container handles clipping with overflow: hidden
  // All images are loaded from local cache after batch sync
  const renderPageImage = (pageIndex?: number) => {
    if (!selectedStory?.pages || selectedStory.pages.length < 2 || !cardPosition) return null;

    // Use provided pageIndex, or exitPageIndexRef (synchronous) during exit, or default to first content page
    // exitPageIndexRef.current is set synchronously so it's available on first render
    const targetPageIndex = pageIndex ?? (exitPageIndexRef.current !== null ? exitPageIndexRef.current : 1);
    const page = selectedStory.pages[targetPageIndex];
    const imageSource = page?.backgroundImage || page?.characterImage;

    if (!imageSource) {
      // Show a placeholder with the story theme
      return (
        <View style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#F5F5DC',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Text style={{ fontSize: 48 }}>{selectedStory.emoji}</Text>
        </View>
      );
    }

    return (
      <ExpoImage
        source={typeof imageSource === 'string' ? { uri: imageSource } : imageSource}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
        cachePolicy="memory-disk"
        priority="high"
      />
    );
  };

  // Render a preview image for any page index (cover or content)
  const renderPreviewImage = (index: number) => {
    if (!selectedStory) return null;
    if (index === 0) return renderCoverImage();
    return renderPageImage(index);
  };

  // Total number of previewable pages (cover + content pages)
  const totalPreviewPages = selectedStory?.pages?.length ?? 1;

  // Two-layer crossfade page flip -matches the story book reader's transition.
  // Previous page stays visible underneath at full opacity while the new page
  // fades in on top, then the previous layer is cleared.
  const flipToPage = useCallback((newIndex: number, _direction: 'forward' | 'back') => {
    if (isPageFlipping.current) return;
    isPageFlipping.current = true;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Step 1: Keep current page visible underneath as "previous"
    setPrevPreviewPageIndex(previewPageIndex);

    // Step 2: After React renders the previous layer, hide current & swap index
    requestAnimationFrame(() => {
      pageSlideX.value = 0; // instant -new image invisible
      setPreviewPageIndex(newIndex);

      // Step 3: Small delay so React renders the new page content, then fade in
      setTimeout(() => {
        pageSlideX.value = withTiming(1, {
          duration: 400,
          easing: Easing.inOut(Easing.quad),
        });

        // Step 4: Clear previous layer after crossfade completes
        setTimeout(() => {
          setPrevPreviewPageIndex(null);
          isPageFlipping.current = false;
        }, 420);
      }, 50);
    });
  }, [pageSlideX, previewPageIndex]);

  // Animated style for the current preview page -fades in over previous layer
  const previewFadeStyle = useAnimatedStyle(() => ({
    opacity: pageSlideX.value,
  }));

  return (
    <StoryTransitionContext.Provider value={contextValue}>
      {children}

      {/* Book preview and mode selection overlay */}
      {/* Keep blocking touches during cancel animation to prevent taps passing through to elements below */}
      {isTransitioning && cardPosition && selectedStory && (
        <View style={styles.overlay} pointerEvents={(showModeSelection || isCancelAnimating) ? 'auto' : 'none'}>
          {/* Children art background image -slides down on entry, up on exit.
              No overlay opacity -stays fully opaque so the background is always
              full colour while sliding in/out. */}
          <Animated.View
            style={[styles.backgroundImageContainer, backgroundSlideAnimatedStyle]}
            pointerEvents="none"
          >
            <Image
              source={require('../assets/images/ui-elements/background-home.webp')}
              style={styles.backgroundImage}
              resizeMode="repeat"
            />
          </Animated.View>

          {/* Tap anywhere to begin overlay - sits above shadow but below buttons */}
          {/* Disabled when any modal is open */}
          {showModeSelection && !showVoiceOverNameModal && !showVoiceOverSelectModal && !showPreviewModal && (
            <Pressable
              style={styles.tapAnywhereOverlay}
              onPress={() => {
                // Handle each mode appropriately
                if (selectedMode === 'read') {
                  selectModeAndBegin(selectedMode);
                } else if (selectedMode === 'record') {
                  if (currentVoiceOver) {
                    selectModeAndBegin(selectedMode);
                  } else {
                    setShowVoiceOverNameModal(true);
                  }
                } else if (selectedMode === 'narrate') {
                  if (currentVoiceOver) {
                    selectModeAndBegin(selectedMode);
                  } else {
                    setShowVoiceOverSelectModal(true);
                  }
                } else if (selectedMode === 'preview') {
                  setShowPreviewModal(true);
                }
              }}
            />
          )}

          {/* X Close button - top left of book */}
          {/* Stays visible when preview modal is showing, but dimmed by overlay */}
          {showModeSelection && targetBookPosition && (() => {
            // Determine layout mode for close button sizing
            const isPhonePortrait = isPhone && !isLandscape;
            const isPhoneLandscape = isPhone && isLandscape;

            let closeButtonSize: number;
            let closeButtonOffset: number;
            let closeIconSize: number;

            if (isPhonePortrait) {
              closeButtonSize = scaledButtonSize(36);
              closeButtonOffset = scaledButtonSize(8);
              closeIconSize = scaledFontSize(16);
            } else if (isPhoneLandscape) {
              // Phone landscape: compact but tappable close button
              closeButtonSize = scaledButtonSize(28);
              closeButtonOffset = scaledButtonSize(6);
              closeIconSize = scaledFontSize(14);
            } else {
              // Tablet
              closeButtonSize = scaledButtonSize(44);
              closeButtonOffset = scaledButtonSize(12);
              closeIconSize = scaledFontSize(20);
            }

            const closeButtonRadius = closeButtonSize / 2;

            // Hide close button completely when preview modal is showing to avoid z-index conflicts
            if (showPreviewModal) return null;

            return (
            <Animated.View
              entering={FadeIn.delay(100).duration(200)}
              style={[styles.closeButtonContainer, {
                left: targetBookPosition.x - closeButtonOffset,
                top: targetBookPosition.y - closeButtonOffset,
              }]}
            >
              <Pressable
                style={[styles.closeButton, {
                  width: closeButtonSize,
                  height: closeButtonSize,
                  borderRadius: closeButtonRadius,
                }]}
                onPress={cancelTransition}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.closeButtonText, { fontSize: closeIconSize }]}>✕</Text>
              </Pressable>
            </Animated.View>
            );
          })()}

          {/* Centered book with page flip and expansion animation */}
          <Animated.View
            style={[
              styles.bookContainer,
              {
                left: cardPosition.x,
                top: cardPosition.y,
                width: cardPosition.width,
                height: cardPosition.height,
                borderRadius: bookBorderRadius,
                overflow: (isExpandingToReader || isExitAnimating) ? 'visible' : 'hidden',
              },
              transitionAnimatedStyle,
              bookExpansionAnimatedStyle,
            ]}
          >
            {/* First page behind the cover - always render so it's ready for exit animation
                The cover is on top, so this is only visible when cover flips open */}
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  overflow: 'hidden',
                  backgroundColor: '#F5F5DC', // Fallback color
                },
                firstPageAnimatedStyle, // Handles borderRadius when parent has overflow: 'visible'
              ]}
            >
              {renderPageImage()}
            </Animated.View>

            {/* Book cover -shows current preview page when user has swiped,
                or the cover image when on page 0. This ensures the correct image
                is visible during cancel/exit animations (the preview overlay unmounts
                when showModeSelection goes false, revealing this layer). */}
            <Animated.View
              style={[
                { position: 'absolute', width: '100%', height: '100%', overflow: 'visible' },
                coverFlipAnimatedStyle, // Always apply - style handles inactive case
              ]}
            >
              {/* Front of cover - shows preview page or cover (hidden when rotation > 90deg) */}
              <Animated.View style={[
                {
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  overflow: 'hidden',
                  opacity: 1, // Default: visible
                },
                coverFrontFaceStyle, // Always apply - style handles inactive case
              ]}>
                {renderPreviewImage(previewPageIndex)}
                {/* Book spine shadow effect */}
                <View style={styles.spineGradient} />
              </Animated.View>

              {/* Back of cover - white page (shown when rotation > 90deg) */}
              <Animated.View style={[
                {
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#FFFEF5',
                  opacity: 0, // Default: hidden until flip animation starts
                },
                coverBackFaceStyle, // Always apply - style handles inactive case
              ]} />
            </Animated.View>
          </Animated.View>

          {/* Swipeable page preview overlay -single layer with cross-fade on swipe */}
          {showModeSelection && targetBookPosition && cardPosition && !isExpandingToReader && (() => {
            const spineWidth = 8 * (targetBookPosition.width / cardPosition.width);

            // Build swipe gesture for page flipping
            const swipeGesture = Gesture.Pan()
              .activeOffsetX([-20, 20])
              .onEnd((e) => {
                const SWIPE_THRESHOLD = 40;
                if (e.translationX < -SWIPE_THRESHOLD) {
                  const nextIndex = previewPageIndex + 1;
                  if (nextIndex < totalPreviewPages) {
                    runOnJS(flipToPage)(nextIndex, 'forward');
                  }
                } else if (e.translationX > SWIPE_THRESHOLD) {
                  const prevIndex = previewPageIndex - 1;
                  if (prevIndex >= 0) {
                    runOnJS(flipToPage)(prevIndex, 'back');
                  }
                }
              });

            // Tap gesture that does nothing -absorbs taps on the book area
            // so they don't fall through to the "tap anywhere to begin" overlay
            const tapBlocker = Gesture.Tap().onEnd(() => {});
            const composedGesture = Gesture.Race(swipeGesture, tapBlocker);

            return (
            <View
              style={{
                position: 'absolute',
                left: targetBookPosition.x,
                top: targetBookPosition.y,
                width: targetBookPosition.width,
                height: targetBookPosition.height,
                zIndex: 60,
              }}
            >
              <GestureHandlerRootView style={{ flex: 1 }}>
                <GestureDetector gesture={composedGesture}>
                  <View style={{ width: '100%', height: '100%', borderRadius: bookBorderRadius, overflow: 'hidden' }}>
                    {/* Previous page layer -stays at full opacity during crossfade */}
                    {prevPreviewPageIndex !== null && (
                      <View style={{ position: 'absolute', width: '100%', height: '100%' }}>
                        {renderPreviewImage(prevPreviewPageIndex)}
                        <View style={[styles.spineGradient, { width: spineWidth }]} />
                      </View>
                    )}

                    {/* Current page layer -fades in over previous page */}
                    <Animated.View style={[{ position: 'absolute', width: '100%', height: '100%' }, previewFadeStyle]}>
                      {renderPreviewImage(previewPageIndex)}
                      <View style={[styles.spineGradient, { width: spineWidth }]} />
                    </Animated.View>

                    {/* Page indicator -inside the book, bottom */}
                    {totalPreviewPages > 1 && (
                      <View style={styles.pageIndicatorContainer}>
                        <View style={styles.pageIndicatorPill}>
                          <View style={styles.pageDotsRow}>
                            {Array.from({ length: Math.min(totalPreviewPages, 5) }, (_, i) => {
                              let pageIdx: number;
                              if (totalPreviewPages <= 5) {
                                pageIdx = i;
                              } else {
                                const half = 2;
                                let start = previewPageIndex - half;
                                if (start < 0) start = 0;
                                if (start + 5 > totalPreviewPages) start = totalPreviewPages - 5;
                                pageIdx = start + i;
                              }
                              return (
                                <View
                                  key={pageIdx}
                                  style={[
                                    styles.pageDot,
                                    pageIdx === previewPageIndex && styles.pageDotActive,
                                  ]}
                                />
                              );
                            })}
                          </View>
                          <Text style={styles.pageCounter}>
                            {previewPageIndex + 1}/{totalPreviewPages}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </GestureDetector>
              </GestureHandlerRootView>
            </View>
            );
          })()}

          {/* Mode selection buttons - positioned BELOW the book for phone portrait, LEFT for tablet/phone landscape */}
          {showModeSelection && targetBookPosition && (() => {
            // Determine layout mode: phone portrait, phone landscape, or tablet
            const isPhonePortrait = isPhone && !isLandscape;
            const isPhoneLandscape = isPhone && isLandscape;

            // Sizing based on device and orientation
            // Phone portrait: small boxed buttons with icon on top, text below
            // Phone landscape: compact buttons to fit beside the book
            // Tablet: larger horizontal buttons (icon beside text)
            let buttonWidth: number;
            let buttonPaddingV: number;
            let buttonPaddingH: number;
            let buttonRadius: number;
            let iconSize: number;
            let textSize: number;
            let buttonGap: number;
            let containerGap: number;
            let containerMargin: number;
            let iconMarginRight: number;
            let buttonFlexDirection: 'row' | 'column';

            if (isPhonePortrait) {
              // Phone portrait: boxed buttons below the book
              buttonWidth = scaledButtonSize(68);
              buttonPaddingV = scaledPadding(10);
              buttonPaddingH = scaledPadding(6);
              buttonRadius = scaledButtonSize(14);
              iconSize = scaledFontSize(22);
              textSize = scaledFontSize(10);
              buttonGap = scaledPadding(3);
              containerGap = 8;
              containerMargin = 20;
              iconMarginRight = 0;
              buttonFlexDirection = 'column';
            } else if (isPhoneLandscape) {
              // Phone landscape: compact but readable buttons
              // Use column layout (icon on top) to save horizontal space
              buttonWidth = scaledButtonSize(52);
              buttonPaddingV = scaledPadding(6);
              buttonPaddingH = scaledPadding(4);
              buttonRadius = scaledButtonSize(10);
              iconSize = scaledFontSize(18);
              textSize = scaledFontSize(9);
              buttonGap = scaledPadding(2);
              containerGap = 6;
              containerMargin = 16;  // More margin from left edge
              iconMarginRight = 0;
              buttonFlexDirection = 'column'; // Stack icon on top of text to save width
            } else {
              // Tablet: larger buttons
              buttonWidth = scaledButtonSize(140);
              buttonPaddingV = scaledPadding(12);
              buttonPaddingH = scaledPadding(20);
              buttonRadius = scaledButtonSize(20);
              iconSize = scaledFontSize(22);
              textSize = scaledFontSize(18);
              buttonGap = scaledPadding(8);
              containerGap = 20;
              containerMargin = 20;
              iconMarginRight = 10;
              buttonFlexDirection = 'row';
            }

            // For phone portrait: position buttons horizontally below the book, centered on screen
            // For tablet/phone landscape: position buttons vertically to the left of the book
            const buttonContainerStyle = isPhonePortrait
              ? {
                  // Horizontal layout below the book, centered
                  flexDirection: 'row' as const,
                  top: targetBookPosition.y + targetBookPosition.height + containerMargin,
                  left: 0,
                  right: 0,
                  justifyContent: 'center' as const,
                  alignItems: 'center' as const,
                  gap: containerGap,
                }
              : isPhoneLandscape
              ? {
                  // Phone landscape: position buttons just to the left of the book
                  // Use 'right' positioning relative to book's left edge
                  right: screenWidth - targetBookPosition.x + containerMargin,
                  top: targetBookPosition.y,
                  height: targetBookPosition.height,
                  justifyContent: 'center' as const,
                  gap: containerGap,
                }
              : {
                  // Tablet: position buttons to the left of the book
                  right: screenWidth - targetBookPosition.x + containerMargin,
                  top: targetBookPosition.y,
                  height: targetBookPosition.height,
                  justifyContent: 'center' as const,
                  gap: containerGap,
                };

            return (
            <Animated.View
              entering={isPhonePortrait ? SlideInDown.delay(0).duration(450).easing(Easing.out(Easing.cubic)) : SlideInLeft.delay(0).duration(450).easing(Easing.out(Easing.cubic))}
              exiting={isPhonePortrait ? SlideOutDown.duration(250) : SlideOutLeft.duration(250)}
              style={[styles.modeSelectionContainer, buttonContainerStyle]}
            >
              <View ref={readButtonRef} collapsable={false}>
                <Pressable
                  style={[
                    styles.modeButton,
                    selectedMode === 'read' && styles.modeButtonSelected,
                    {
                      flexDirection: buttonFlexDirection,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: buttonRadius,
                      paddingVertical: buttonPaddingV,
                      paddingHorizontal: buttonPaddingH,
                      gap: buttonGap,
                      width: buttonWidth,
                    }
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedMode('read');
                    setCurrentVoiceOver(null); // Clear voice over for read mode
                  }}
                >
                  <Text style={[styles.modeButtonIcon, { fontSize: iconSize, marginRight: iconMarginRight }]}>∞</Text>
                  <Text style={[styles.modeButtonText, { fontSize: textSize, textAlign: 'center' }]}>{t('storyMode.read')}</Text>
                </Pressable>
              </View>

              <View ref={recordButtonRef} collapsable={false}>
                <Pressable
                  style={[
                    styles.modeButton,
                    selectedMode === 'record' && styles.modeButtonSelected,
                    {
                      flexDirection: buttonFlexDirection,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: buttonRadius,
                      paddingVertical: buttonPaddingV,
                      paddingHorizontal: buttonPaddingH,
                      gap: buttonGap,
                      width: buttonWidth,
                    }
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedMode('record');
                    // Close narrate modal if open, then show record modal
                    setShowVoiceOverSelectModal(false);
                    setShowVoiceOverNameModal(true);
                  }}
                >
                  <Text style={[styles.modeButtonIcon, { fontSize: iconSize, marginRight: iconMarginRight }]}>●</Text>
                  <Text style={[styles.modeButtonText, { fontSize: textSize, textAlign: 'center' }]}>{t('storyMode.record')}</Text>
                </Pressable>
              </View>

              <View ref={narrateButtonRef} collapsable={false}>
                <Pressable
                  style={[
                    styles.modeButton,
                    selectedMode === 'narrate' && styles.modeButtonSelected,
                    {
                      flexDirection: buttonFlexDirection,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: buttonRadius,
                      paddingVertical: buttonPaddingV,
                      paddingHorizontal: buttonPaddingH,
                      gap: buttonGap,
                      width: buttonWidth,
                    }
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedMode('narrate');
                    // Close record modal if open, then show narrate modal
                    setShowVoiceOverNameModal(false);
                    setShowVoiceOverSelectModal(true);
                  }}
                >
                  <Text style={[styles.modeButtonIcon, { fontSize: iconSize, marginRight: iconMarginRight }]}>♫</Text>
                  <Text style={[styles.modeButtonText, { fontSize: textSize, textAlign: 'center' }]}>{t('storyMode.narrate')}</Text>
                </Pressable>
              </View>

              <View ref={previewButtonRef} collapsable={false}>
                <Pressable
                  style={[
                    styles.modeButton,
                    showPreviewModal && styles.modeButtonSelected,
                    {
                      flexDirection: buttonFlexDirection,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: buttonRadius,
                      paddingVertical: buttonPaddingV,
                      paddingHorizontal: buttonPaddingH,
                      gap: buttonGap,
                      width: buttonWidth,
                    }
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowPreviewModal(true);
                  }}
                >
                  <Text style={[styles.modeButtonIcon, { fontSize: iconSize, marginRight: iconMarginRight }]}>◉</Text>
                  <Text style={[styles.modeButtonText, { fontSize: textSize, textAlign: 'center' }]}>{t('storyMode.preview')}</Text>
                </Pressable>
              </View>
            </Animated.View>
            );
          })()}

          {/* Tap to begin button (bottom center with padding) */}
          {showModeSelection && (() => {
            // Determine layout mode for begin button sizing
            const isPhonePortrait = isPhone && !isLandscape;
            const isPhoneLandscape = isPhone && isLandscape;

            let beginButtonRadius: number;
            let beginButtonPaddingV: number;
            let beginButtonPaddingH: number;
            let beginTextSize: number;
            let bottomPadding: number;

            if (isPhonePortrait) {
              beginButtonRadius = scaledButtonSize(18);
              beginButtonPaddingV = scaledPadding(10);
              beginButtonPaddingH = scaledPadding(20);
              beginTextSize = scaledFontSize(16);
              bottomPadding = Math.max(insets.bottom + 16, 24);
            } else if (isPhoneLandscape) {
              // Phone landscape: compact but readable begin button
              beginButtonRadius = scaledButtonSize(14);
              beginButtonPaddingV = scaledPadding(8);
              beginButtonPaddingH = scaledPadding(16);
              beginTextSize = scaledFontSize(14);
              bottomPadding = Math.max(insets.bottom + 8, 12);
            } else {
              // Tablet
              beginButtonRadius = scaledButtonSize(20);
              beginButtonPaddingV = scaledPadding(12);
              beginButtonPaddingH = scaledPadding(24);
              beginTextSize = scaledFontSize(18);
              bottomPadding = insets.bottom + 20;
            }

            return (
            <Animated.View
              entering={SlideInDown.delay(100).duration(450).easing(Easing.out(Easing.cubic))}
              style={[styles.tapToBeginContainer, { bottom: bottomPadding }]}
            >
              <Pressable
                style={[
                  styles.modeButton,
                  styles.modeButtonSelected,
                  {
                    borderRadius: beginButtonRadius,
                    paddingVertical: beginButtonPaddingV,
                    paddingHorizontal: beginButtonPaddingH,
                    gap: scaledPadding(8),
                  }
                ]}
                onPress={() => {
                  // For record/narrate modes, require a voice over to be selected
                  if (selectedMode === 'record' && !currentVoiceOver) {
                    setShowVoiceOverNameModal(true);
                    return;
                  }
                  if (selectedMode === 'narrate' && !currentVoiceOver) {
                    setShowVoiceOverSelectModal(true);
                    return;
                  }
                  selectModeAndBegin(selectedMode);
                }}
              >
                <Text style={[styles.modeButtonText, { fontSize: beginTextSize }]}>
                  {selectedMode === 'record' && currentVoiceOver
                    ? t('storyMode.recordAs', { name: currentVoiceOver.name })
                    : selectedMode === 'narrate' && currentVoiceOver
                    ? t('storyMode.narrateAs', { name: currentVoiceOver.name })
                    : t('storyMode.tapToBegin')}
                </Text>
              </Pressable>
            </Animated.View>
            );
          })()}

          {/* Voice Over Name Modal (for Record mode) - Using absolute positioning to avoid iOS crash during orientation changes */}
          {showVoiceOverNameModal && (
            <View style={styles.absoluteModalContainer}>
              <Pressable
                style={styles.absoluteModalBackdrop}
                onPress={() => {
                  setShowVoiceOverNameModal(false);
                  setVoiceOverName('');
                }}
              />
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.absoluteModalCentered}
                pointerEvents="box-none"
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
                  <Text style={styles.modalTitle}>{t('storyMode.recordVoiceOver')}</Text>

                  {/* Existing voice overs */}
                  {availableVoiceOvers.length > 0 && (
                    <>
                      <Text style={styles.modalSubtitle}>{t('storyMode.selectExisting')}</Text>
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
                                {t('storyMode.pagesRecorded', { count: Object.keys(vo.pageRecordings).length })}
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
                        {availableVoiceOvers.length > 0 ? t('storyMode.orCreateNew') : t('storyMode.enterName')}
                      </Text>
                      <TextInput
                        style={styles.modalInput}
                        value={voiceOverName}
                        onChangeText={setVoiceOverName}
                        placeholder={t('storyMode.enterName')}
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
                        <Text style={styles.modalButtonText}>{t('storyMode.create')}</Text>
                      </Pressable>
                    </>
                  )}
                  {availableVoiceOvers.length >= 3 && (
                    <Text style={styles.maxVoiceOversText}>Maximum of 3 voice overs reached</Text>
                  )}
                </View>
              </KeyboardAvoidingView>
            </View>
          )}

          {/* Voice Over Selection Modal (for Narrate mode) - Using absolute positioning to avoid iOS crash during orientation changes */}
          {showVoiceOverSelectModal && (
            <View style={styles.absoluteModalContainer}>
              <Pressable
                style={styles.absoluteModalBackdrop}
                onPress={() => {
                  setShowVoiceOverSelectModal(false);
                  if (!currentVoiceOver) {
                    setSelectedMode('read'); // Reset to read if no voice over selected
                  }
                }}
              />
              <View style={styles.absoluteModalCentered} pointerEvents="box-none">
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
                  <Text style={styles.modalTitle}>{t('storyMode.selectVoiceOver')}</Text>
                  <Text style={styles.modalSubtitle}>{t('storyMode.chooseRecording')}</Text>
                  {availableVoiceOvers.length === 0 ? (
                    <Text style={styles.noVoiceOversText}>{t('storyMode.noVoiceOvers')}</Text>
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
                              {t('storyMode.pagesRecorded', { count: Object.keys(vo.pageRecordings).length })}
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
            </View>
          )}

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

          {/* Touch blocking layer - shown immediately when book mode tutorial should show */}
          {/* Must have higher zIndex than modeSelectionContainer (100) to block button touches */}
          {shouldBlockBookModeTouches && (
            <Pressable
              style={[StyleSheet.absoluteFill, { zIndex: 200 }]}
              onPress={() => {}}
              onPressIn={() => {}}
              onPressOut={() => {}}
            />
          )}

          {/* Book Mode Tutorial Overlay - shows on first book open */}
          {showModeSelection && shouldShowTutorial('book_mode_tour') && (
            <TutorialOverlay
              tutorialId="book_mode_tour"
              targetRefs={{
                'read_button': readButtonRef,
                'record_button': recordButtonRef,
                'narrate_button': narrateButtonRef,
                'preview_button': previewButtonRef,
              }}
            />
          )}
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
  // Absolute-positioned modal styles to avoid iOS crash during orientation changes
  absoluteModalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000, // Above all other content including overlay
  },
  absoluteModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  absoluteModalCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundImageContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0, // Below buttons/book
    overflow: 'hidden',
    backgroundColor: '#1E3A8A', // Deep blue base matching brand gradient
  },
  backgroundImage: {
    width: '200%',
    height: '200%',
    opacity: 0.25, // Subtle texture on deep blue base
  },
  tapAnywhereOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1, // Below all buttons and book
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
    // borderRadius set dynamically via scaledButtonSize(15) to match StoryCard
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
    zIndex: 50, // Above tap-anywhere overlay (zIndex: 1)
  },
  spineGradient: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 8,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  // Page preview indicator -pill container with dots + counter (matches button style)
  pageIndicatorContainer: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  pageIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(130, 130, 130, 0.45)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  pageDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  pageDotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  pageCounter: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modeButtonSelected: {
    backgroundColor: 'rgba(130, 130, 130, 0.5)',
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  modeButtonIcon: {
    fontSize: 24,
    color: '#FFFFFF',
    textAlign: 'center',
    // marginRight is handled inline based on button layout direction
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
    zIndex: 200,
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
    left: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalCloseButtonText: {
    fontSize: 20,
    color: '#333',
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
