import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Dimensions, Image, StyleSheet, View, Text, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ScreenOrientation from 'expo-screen-orientation';
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
  SlideOutDown,
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
import { TutorialOverlay } from '@/components/tutorial/tutorial-overlay';
import { useTutorial } from '@/contexts/tutorial-context';

// Animation timing constants
const MOVE_TO_CENTER_DURATION = 600; // Slower, smoother transition from tile to center
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

  // Callback when returning to mode selection - the _layout listens to hide story reader
  onReturnToModeSelectionCallback: (() => void) | null;
  setOnReturnToModeSelectionCallback: (callback: (() => void) | null) => void;

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
  const [isExitAnimating, setIsExitAnimating] = useState(false);

  // Screen dimensions state - updates when orientation changes
  const [screenDimensions, setScreenDimensions] = useState(Dimensions.get('window'));
  // Track if we rotated to landscape for the current transition (to rotate back on cancel/exit)
  const wasRotatedForTransition = useRef(false);

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

  // Book page flip and expansion animation values
  const pageFlipProgress = useSharedValue(0); // 0 = closed, 1 = open (cover rotated away)
  const bookExpansion = useSharedValue(0); // 0 = book size, 1 = full screen
  const bookRotation = useSharedValue(0); // Rotation in degrees - used to counter-rotate during screen rotation
  const [isExpandingToReader, setIsExpandingToReader] = useState(false);

  // Current compensated border radius - updated by bookExpansionAnimatedStyle
  // Used by child views that need to match parent's borderRadius when overflow: 'visible'
  const currentCompensatedBorderRadius = useSharedValue(bookBorderRadius);

  // Shared value for exit animating - used in animated styles for immediate effect
  // (React state isExitAnimating is async and can cause a frame delay)
  const isExitAnimatingShared = useSharedValue(0); // 0 = not exiting, 1 = exiting
  
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

    console.log('animateToCenter - width:', width, 'height:', height, 'isPhonePortraitNow:', isPhonePortraitNow);

    // For phone portrait mode: book positioned above center, buttons below
    // Book takes about 75% of screen width for phones (larger to fill space better)
    // For tablets: 55% of screen width
    const targetWidth = isPhonePortraitNow ? width * 0.75 : width * 0.55;
    const targetScale = targetWidth / cardLayout.width;

    // Calculate center position for the scaled book
    // For phone portrait: book is positioned above center (in upper portion of screen)
    const targetCenterX = width / 2;
    // Position book in upper portion - leave room for buttons below
    // The book should take up roughly the top 55% of the screen
    const targetCenterY = isPhonePortraitNow
      ? height * 0.32  // Above center for portrait phones
      : (height / 2) - 30;  // Slightly above center for tablets

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
    if (showButtons) {
      setTimeout(() => {
        setShowModeSelection(true);
      }, MOVE_TO_CENTER_DURATION + BUTTONS_DELAY);
    }
  };

  const startTransition = async (storyId: string, cardLayout: { x: number; y: number; width: number; height: number }, story?: Story) => {
    console.log('Starting book preview transition for:', storyId, 'from position:', cardLayout, 'isPhone:', isPhone);

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

    // Animate from card position to center
    transitionOpacity.value = 1;
    transitionScale.value = 1;
    transitionX.value = 0;
    transitionY.value = 0;
    overlayOpacity.value = 0;

    // For phones: stay in portrait for mode selection (book above, buttons below)
    // Rotation to landscape happens when "Begin" is pressed
    // For tablets: animate normally
    animateToCenter(cardLayout, screenWidth, screenHeight, true);
  };

  // User selects a mode and taps "Begin"
  const selectModeAndBegin = async (mode: ReadingMode) => {
    console.log('Starting story with mode:', mode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMode(mode);

    // Hide mode selection to trigger slide-out animation
    setShowModeSelection(false);

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
      console.log('Phone in portrait - rotating to landscape before opening book');
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
        console.log('Rotated to landscape, new dimensions:', newDims);
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
        transitionX.value = withTiming(targetCenterX - cardCenterX, { duration: 200, easing: Easing.out(Easing.cubic) });
        transitionY.value = withTiming(targetCenterY - cardCenterY, { duration: 200, easing: Easing.out(Easing.cubic) });
        transitionScale.value = withTiming(targetScale, { duration: 200, easing: Easing.out(Easing.cubic) });

        // Wait for position animation
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.warn('Failed to rotate to landscape:', error);
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

  // Return to portrait orientation on phones
  const returnToPortrait = async () => {
    if (wasRotatedForTransition.current) {
      console.log('Returning to portrait orientation');
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
        console.warn('Failed to return to portrait:', error);
      }
    }
  };

  // User cancels (taps X)
  const cancelTransition = async () => {
    console.log('Cancelling story transition');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Step 1: Trigger button exit animations (SlideOutLeft takes 250ms)
    setShowModeSelection(false);

    // Step 2: Wait for button exit animations to complete
    await new Promise(resolve => setTimeout(resolve, 280));

    // If we rotated for this transition, rotate back first then animate
    if (wasRotatedForTransition.current && originalCardPosition) {
      console.log('Cancelling with rotation - rotating to portrait');

      // Step 3: Rotate back to portrait
      await returnToPortrait();

      // Step 4: Wait for layout to settle
      await new Promise(resolve => setTimeout(resolve, 150));

      // Step 5: Get portrait dimensions and calculate centered position
      const dims = Dimensions.get('window');
      const targetWidth = dims.width * 0.55;
      const targetScale = targetWidth / originalCardPosition.width;
      const targetCenterX = dims.width / 2;
      const targetCenterY = (dims.height / 2) - 30;
      const cardCenterX = originalCardPosition.x + originalCardPosition.width / 2;
      const cardCenterY = originalCardPosition.y + originalCardPosition.height / 2;
      const moveX = targetCenterX - cardCenterX;
      const moveY = targetCenterY - cardCenterY;

      // Step 6: Set cardPosition to original and position book at center
      setCardPosition(originalCardPosition);
      transitionX.value = moveX;
      transitionY.value = moveY;
      transitionScale.value = targetScale;
      overlayOpacity.value = 1;

      // Step 7: Wait for state to apply
      await new Promise(resolve => setTimeout(resolve, 50));

      // Step 8: Animate book back to tile position and fade out
      transitionX.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
      transitionY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
      transitionScale.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
      overlayOpacity.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) }, () => {
        runOnJS(resetTransition)();
      });
      return;
    }

    // Standard cancel (no rotation) - animate back and fade out
    transitionX.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
    transitionY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
    transitionScale.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
    overlayOpacity.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) }, () => {
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
    bookRotation.value = 0;
    isExitAnimatingShared.value = 0;
    isExpandingOrExitingShared.value = 0;
    setIsExpandingToReader(false);
    // Reset rotation tracking
    wasRotatedForTransition.current = false;
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

    console.log('Starting exit animation - isActuallyPhone:', isActuallyPhone, 'smallerDim:', smallerDimension, 'isCurrentlyLandscape:', isCurrentlyLandscape, 'needsRotation:', needsRotation);

    // Animation timing - slowed down for smoother feel
    const SHRINK_DURATION = 350;       // Shrink from full screen to book size
    const HOLD_AFTER_SHRINK = 150;     // Pause after shrink before next phase
    const COVER_FLIP_DURATION = 300;   // Flip to close cover
    const RETURN_DURATION = 600;       // Smooth return to tile position

    // Calculate the SAME values as startTransition uses for the CURRENT orientation
    // Target book size: 55% of screen width (for landscape/tablet)
    const targetWidth = currentWidth * 0.55;
    const targetScale = targetWidth / originalCardPosition.width;

    // Calculate center positions for CURRENT orientation
    const targetCenterX = currentWidth / 2;
    const targetCenterY = (currentHeight / 2) - 30;

    // Current center position of original card (for the opening animation match)
    const currentCenterX = originalCardPosition.x + originalCardPosition.width / 2;
    const currentCenterY = originalCardPosition.y + originalCardPosition.height / 2;

    // How much to move the center (same as startTransition calculates)
    const moveX = targetCenterX - currentCenterX;
    const moveY = targetCenterY - currentCenterY;

    // Calculate final book position for targetBookPosition
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

    // SET ALL ANIMATION VALUES FIRST - before any state changes
    // Start positioned at CENTER (where the open book was) using the SAME transform values as opening end state
    transitionX.value = moveX;          // Same X offset as end of opening animation
    transitionY.value = moveY;          // Same Y offset as end of opening animation
    transitionScale.value = targetScale; // Same scale as end of opening animation
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

    // Use ORIGINAL card position as base (same as opening animation)
    // This way animating transitionX/Y/Scale to 0/0/1 returns to original position
    // Set ref IMMEDIATELY (synchronous) so renderPageImage uses correct page on first render
    exitPageIndexRef.current = currentPageIndex ?? 1;
    setCardPosition(originalCardPosition);
    setTargetBookPosition(centeredPosition);
    setIsExitAnimating(true);
    setIsTransitioning(true);

    // Delay before starting animations to let React render with correct initial state
    const SETTLE_DELAY = 100;

    // Quickly fade overlay from fully opaque (1) to normal level (0.92)
    // This happens immediately so there's no white flash
    setTimeout(() => {
      overlayOpacity.value = withTiming(0.92, {
        duration: 50,
        easing: Easing.out(Easing.quad)
      });
    }, 16); // After first frame

    // Phase 1: Shrink from full screen to centered book size (with curved corners)
    setTimeout(() => {
      bookExpansion.value = withTiming(0, {
        duration: SHRINK_DURATION,
        easing: Easing.inOut(Easing.cubic)
      });
    }, SETTLE_DELAY);

    // If we need to rotate (phone in landscape): shrink, close cover, fade to black, rotate, fade in
    // The carousel isn't visible in landscape, so we use the overlay as a transition screen
    if (needsRotation) {
      console.log('Phone exit: using rotation flow with black screen transition');
      // Wait for shrink to complete
      await new Promise(resolve => setTimeout(resolve, SETTLE_DELAY + SHRINK_DURATION + HOLD_AFTER_SHRINK));

      // Phase 2: Close the cover (still in landscape)
      pageFlipProgress.value = withTiming(0, {
        duration: COVER_FLIP_DURATION,
        easing: Easing.inOut(Easing.cubic)
      });
      await new Promise(resolve => setTimeout(resolve, COVER_FLIP_DURATION + 100));

      // Disable bookExpansionAnimatedStyle
      exitCardWidth.value = 0;
      exitCardHeight.value = 0;

      // Phase 3: Fade to full black overlay (hide the book, keep overlay dark)
      // This creates a clean transition screen for the rotation
      overlayOpacity.value = withTiming(1, { duration: 300 }); // Ensure overlay is fully opaque
      transitionOpacity.value = withTiming(0, { duration: 300 }); // Fade out the book
      await new Promise(resolve => setTimeout(resolve, 350));

      // Phase 4: Rotate screen to portrait (user sees black screen)
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        // Wait for rotation to fully settle
        await new Promise(resolve => setTimeout(resolve, 400));
      } catch (error) {
        console.warn('Failed to rotate to portrait during exit:', error);
      }

      // Update dimensions after rotation
      const portraitDims = Dimensions.get('window');
      setScreenDimensions(portraitDims);

      // Wait for layout to update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Phase 5: Fade out overlay to reveal carousel in portrait
      overlayOpacity.value = withTiming(0, { duration: 400 });
      await new Promise(resolve => setTimeout(resolve, 450));

      // Complete the animation
      finishExitAnimation(onComplete);
    } else {
      // TABLET or already portrait: Original flow - no rotation needed
      console.log('Tablet/portrait exit: using non-rotation flow');
      // Phase 2: Close the cover
      setTimeout(() => {
        pageFlipProgress.value = withTiming(0, {
          duration: COVER_FLIP_DURATION,
          easing: Easing.inOut(Easing.cubic)
        });
      }, SETTLE_DELAY + SHRINK_DURATION + HOLD_AFTER_SHRINK);

      // Phase 3: Return to original position - exact reverse of opening animation
      setTimeout(() => {
        transitionX.value = withTiming(0, {
          duration: RETURN_DURATION,
          easing: Easing.out(Easing.cubic)
        });
        transitionY.value = withTiming(0, {
          duration: RETURN_DURATION,
          easing: Easing.out(Easing.cubic)
        });
        transitionScale.value = withTiming(1, {
          duration: RETURN_DURATION,
          easing: Easing.out(Easing.cubic)
        });
        overlayOpacity.value = withTiming(0, {
          duration: RETURN_DURATION,
          easing: Easing.out(Easing.quad)
        });
      }, SETTLE_DELAY + SHRINK_DURATION + HOLD_AFTER_SHRINK + COVER_FLIP_DURATION);

      // Complete the animation
      setTimeout(() => {
        finishExitAnimation(onComplete);
      }, SETTLE_DELAY + SHRINK_DURATION + HOLD_AFTER_SHRINK + COVER_FLIP_DURATION + RETURN_DURATION + 50);
    }
  };

  const finishExitAnimation = (onComplete: () => void) => {
    isExitAnimatingShared.value = 0;
    isExpandingOrExitingShared.value = 0;
    exitCardX.value = 0;
    exitCardY.value = 0;
    exitCardWidth.value = 0;
    exitCardHeight.value = 0;
    bookRotation.value = 0; // Ensure rotation is reset
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

    console.log('Returning to mode selection from reader');

    // Animation timing (reverse of selectModeAndBegin)
    const SHRINK_DURATION = 200;        // Shrink from full screen to book size
    const HOLD_AFTER_SHRINK = 100;      // Brief pause before flipping
    const COVER_FLIP_DURATION = 200;    // Flip cover back
    const BUTTONS_DELAY = 50;           // Delay before showing buttons

    // Calculate the centered position (same as startTransition)
    const targetWidth = screenWidth * 0.55;
    const targetScale = targetWidth / originalCardPosition.width;
    const targetCenterX = screenWidth / 2;
    const targetCenterY = (screenHeight / 2) - 30;
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
        { translateY: transitionY.value },
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

  // Animated style for book expansion to full screen
  // IMPORTANT: This must include ALL transforms (position + scale) because
  // React Native style arrays don't merge transforms - they replace them.
  const bookExpansionAnimatedStyle = useAnimatedStyle(() => {
    const isExiting = isExitAnimatingShared.value === 1;

    // During EXIT: Use shared values for the exit card position (not React state)
    // The book starts at FULL SCREEN and shrinks to CENTERED BOOK size (not tile size)
    if (isExiting && exitCardWidth.value > 0) {
      // bookExpansion: 1 = full screen, 0 = centered book size (same as opening animation)
      // transitionScale.value holds the scale from tile to centered book

      // Calculate full screen scale based on original card size
      const scaleToFillX = screenWidth / exitCardWidth.value;
      const scaleToFillY = screenHeight / exitCardHeight.value;
      const scaleToFill = Math.max(scaleToFillX, scaleToFillY);

      // Current scale: interpolate from CENTERED BOOK scale to full-screen scale
      // transitionScale.value is the scale from tile to centered book (set during opening)
      const currentScale = interpolate(bookExpansion.value, [0, 1], [transitionScale.value, scaleToFill]);

      // The center of the original card (tile position)
      const cardCenterX = exitCardX.value + exitCardWidth.value / 2;
      const cardCenterY = exitCardY.value + exitCardHeight.value / 2;

      // The center of the screen
      const screenCenterX = screenWidth / 2;
      const screenCenterY = screenHeight / 2;

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
    onReturnToModeSelectionCallback,
    setOnReturnToModeSelectionCallback,
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
  const renderCoverImage = () => {
    if (!selectedStory?.coverImage || !cardPosition) return null;

    const isCmsImage = typeof selectedStory.coverImage === 'string' &&
      selectedStory.coverImage.includes('api.colearnwithfreya.co.uk');

    if (isCmsImage) {
      return (
        <AuthenticatedImage
          uri={selectedStory.coverImage as string}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      );
    }

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
  const renderPageImage = (pageIndex?: number) => {
    if (!selectedStory?.pages || selectedStory.pages.length < 2 || !cardPosition) return null;

    // Use provided pageIndex, or exitPageIndexRef (synchronous) during exit, or default to first content page
    // exitPageIndexRef.current is set synchronously so it's available on first render
    const targetPageIndex = pageIndex ?? (exitPageIndexRef.current !== null ? exitPageIndexRef.current : 1);
    console.log('[renderPageImage] exitPageIndexRef.current:', exitPageIndexRef.current, 'targetPageIndex:', targetPageIndex);
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

    const isCmsImage = typeof imageSource === 'string' &&
      imageSource.includes('api.colearnwithfreya.co.uk');

    if (isCmsImage) {
      return (
        <AuthenticatedImage
          uri={imageSource as string}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
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

  return (
    <StoryTransitionContext.Provider value={contextValue}>
      {children}

      {/* Book preview and mode selection overlay */}
      {isTransitioning && cardPosition && selectedStory && (
        <View style={styles.overlay} pointerEvents={showModeSelection ? 'auto' : 'none'}>
          {/* Shadow overlay background */}
          <Animated.View style={[styles.shadowOverlay, overlayAnimatedStyle]} />

          {/* X Close button - top left of book */}
          {/* Stays visible when preview modal is showing, but dimmed by overlay */}
          {showModeSelection && targetBookPosition && (() => {
            // Phone portrait mode: standard close button size
            const isPhonePortrait = isPhone && !isLandscape;
            const closeButtonSize = isPhonePortrait ? scaledButtonSize(36) : scaledButtonSize(44);
            const closeButtonRadius = closeButtonSize / 2;
            const closeButtonOffset = isPhonePortrait ? scaledButtonSize(8) : scaledButtonSize(12);
            const closeIconSize = isPhonePortrait ? scaledFontSize(16) : scaledFontSize(20);

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

            {/* Book cover (flips open when "Begin" is pressed)
                No borderRadius here - parent container handles clipping */}
            <Animated.View
              style={[
                { position: 'absolute', width: '100%', height: '100%', overflow: 'visible' },
                coverFlipAnimatedStyle, // Always apply - style handles inactive case
              ]}
            >
              {/* Front of cover - the cover image (hidden when rotation > 90deg) */}
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
                {renderCoverImage()}
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

          {/* High-resolution cover overlay - appears after animation completes */}
          {/* This is positioned at the actual target position (no scaling) for crisp rendering */}
          {showModeSelection && targetBookPosition && cardPosition && !isExpandingToReader && (
            <Animated.View
              entering={FadeIn.duration(150)}
              style={{
                position: 'absolute',
                left: targetBookPosition.x,
                top: targetBookPosition.y,
                width: targetBookPosition.width,
                height: targetBookPosition.height,
                borderRadius: bookBorderRadius, // This one is NOT scaled, so use the actual value
                overflow: 'hidden',
                zIndex: 10, // Above the scaled container
              }}
            >
              {renderCoverImage()}
              {/* Book spine shadow effect - scaled to match the scaled container's spine */}
              {/* The original spine is 8px but gets scaled up in the container, so we match that */}
              <View style={[styles.spineGradient, { width: 8 * (targetBookPosition.width / cardPosition.width) }]} />
            </Animated.View>
          )}



          {/* Mode selection buttons - positioned BELOW the book for phone portrait, LEFT for tablet */}
          {showModeSelection && targetBookPosition && (() => {
            // Phone portrait mode: buttons below the book in a horizontal row
            const isPhonePortrait = isPhone && !isLandscape;

            // Sizing for phone portrait mode - boxed buttons with icon on top, text below
            // Tablet keeps horizontal button layout (icon and text side by side)
            // Use fixed width for phone to ensure consistent button sizes
            const buttonWidth = isPhonePortrait ? scaledButtonSize(68) : scaledButtonSize(140);
            const buttonPaddingV = isPhonePortrait ? scaledPadding(10) : scaledPadding(12);
            const buttonPaddingH = isPhonePortrait ? scaledPadding(6) : scaledPadding(20);
            const buttonRadius = isPhonePortrait ? scaledButtonSize(14) : scaledButtonSize(20);
            const iconSize = isPhonePortrait ? scaledFontSize(22) : scaledFontSize(22);
            const textSize = isPhonePortrait ? scaledFontSize(10) : scaledFontSize(18);
            const buttonGap = isPhonePortrait ? scaledPadding(3) : scaledPadding(8);
            const containerGap = isPhonePortrait ? 8 : 20;
            const containerMargin = isPhonePortrait ? 20 : 20;
            // Only add margin to icon on tablet (row layout) - phone column layout uses gap instead
            const iconMarginRight = isPhonePortrait ? 0 : 10;

            // Button layout: column for phone (icon on top), row for tablet (icon beside text)
            const buttonFlexDirection = isPhonePortrait ? 'column' as const : 'row' as const;

            // For phone portrait: position buttons horizontally below the book, centered on screen
            // For tablet: position buttons vertically to the left of the book
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
              : {
                  // Vertical layout to the left of the book (tablet)
                  right: screenWidth - targetBookPosition.x + containerMargin,
                  top: targetBookPosition.y,
                  height: targetBookPosition.height,
                  justifyContent: 'center' as const,
                  gap: containerGap,
                };

            return (
            <Animated.View
              entering={isPhonePortrait ? SlideInDown.delay(0).duration(350).springify() : SlideInLeft.delay(0).duration(350).springify()}
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
                  <Text style={[styles.modeButtonText, { fontSize: textSize, textAlign: 'center' }]}>Read</Text>
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
                  <Text style={[styles.modeButtonText, { fontSize: textSize, textAlign: 'center' }]}>Record</Text>
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
                  <Text style={[styles.modeButtonText, { fontSize: textSize, textAlign: 'center' }]}>Narrate</Text>
                </Pressable>
              </View>

              <View ref={previewButtonRef} collapsable={false}>
                <Pressable
                  style={[
                    styles.modeButton,
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
                  <Text style={[styles.modeButtonText, { fontSize: textSize, textAlign: 'center' }]}>Preview</Text>
                </Pressable>
              </View>
            </Animated.View>
            );
          })()}

          {/* Tap to begin button (bottom center with padding) */}
          {showModeSelection && (() => {
            // Phone portrait mode: slightly smaller begin button
            const isPhonePortrait = isPhone && !isLandscape;
            const beginButtonRadius = isPhonePortrait ? scaledButtonSize(18) : scaledButtonSize(20);
            const beginButtonPaddingV = isPhonePortrait ? scaledPadding(10) : scaledPadding(12);
            const beginButtonPaddingH = isPhonePortrait ? scaledPadding(20) : scaledPadding(24);
            const beginTextSize = isPhonePortrait ? scaledFontSize(16) : scaledFontSize(18);
            const bottomPadding = isPhonePortrait ? Math.max(insets.bottom + 16, 24) : insets.bottom + 20;

            return (
            <Animated.View
              entering={SlideInDown.delay(100).duration(350).springify()}
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
                    ? `Record as: ${currentVoiceOver.name}`
                    : selectedMode === 'narrate' && currentVoiceOver
                    ? `Narrate as: ${currentVoiceOver.name}`
                    : 'Tap to begin'}
                </Text>
              </Pressable>
            </Animated.View>
            );
          })()}

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
                      autoCorrect={false}
                      spellCheck={false}
                      underlineColorAndroid="transparent"
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
  shadowOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
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
