import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Logger } from '@/utils/logger';

const log = Logger.create('StoryTransition');
import { Dimensions, Image, InteractionManager, StyleSheet, View, Text, Pressable, TextInput, KeyboardAvoidingView, Platform, Alert, ScrollView, ScaledSize } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as ScreenOrientation from 'expo-screen-orientation';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  SharedValue,
  interpolate,
  cancelAnimation,
} from 'react-native-reanimated';
import { Story, STORY_TAGS } from '@/types/story';
// All story images are loaded from local cache after batch sync - no authenticated fetching needed
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { voiceRecordingService, VoiceOver } from '@/services/voice-recording-service';
import { useParentsOnlyChallenge } from '@/hooks/use-parents-only-challenge';
import { ParentsOnlyModal } from '@/components/ui/parents-only-modal';
import { StoryPreviewModal } from '@/components/stories/story-preview-modal';
import { StoryDetailOverlay } from '@/components/stories/story-detail-overlay';
import { RotatePromptOverlay } from '@/components/stories/rotate-prompt-overlay';
import { TutorialOverlay } from '@/components/tutorial/tutorial-overlay';
import { useTutorial } from '@/contexts/tutorial-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/store/app-store';

// Animation timing constants
const HERO_GLIDE_DURATION = 1000; // Glide from tile into the detail-view hero area
const HERO_HEIGHT_RATIO = 0.44; // Portion of the screen the detail hero occupies
const PROMPT_BOOK_WIDTH_RATIO = 0.52; // Book width on the rotate-prompt screen
const PROMPT_BOOK_CENTER_Y_RATIO = 0.42; // Vertical centre of the book on the rotate-prompt screen
const PROMPT_GLIDE_DURATION = 450; // Glide from hero into the rotate-prompt book position
const ROTATION_MASK_FADE_MS = 180; // Fade of the opaque mask that hides the OS rotation snap
const LANDSCAPE_DIMENSIONS_TIMEOUT_MS = 800; // Fallback if the dimension-change event never fires

export type ReadingMode = 'read' | 'record' | 'narrate';

export type TransitionPhase = 'flying' | 'detail' | 'prompt' | 'opening' | null;

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
  const [phase, setPhase] = useState<TransitionPhase>(null);
  const showModeSelection = phase === 'detail';
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

  // Screen dimensions state - updates when orientation changes
  const [screenDimensions, setScreenDimensions] = useState(Dimensions.get('window'));
  // Track if we rotated to landscape for the current transition (to rotate back on cancel/exit)
  const wasRotatedForTransition = useRef(false);

  // Store opening animation transform values so exit/cancel can use the EXACT same values
  // This prevents position mismatch when the book returns to the carousel
  const openingTransformRef = useRef<{ moveX: number; moveY: number; scale: number } | null>(null);
  // Hero landing transform so the book can return from the rotate prompt to the detail view
  const heroTransformRef = useRef<{ moveX: number; moveY: number; scale: number } | null>(null);
  // Guards against double-triggering the opening sequence (sensor + fallback button)
  const isOpeningRef = useRef(false);

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

  const { scaledFontSize, scaledButtonSize, isTablet } = useAccessibility();
  const parentsOnly = useParentsOnlyChallenge();
  const toggleFavoriteStory = useAppStore((s) => s.toggleFavoriteStory);
  const favoriteStoryIds = useAppStore((s) => s.favoriteStoryIds);

  // Use screenDimensions state so layout updates when orientation changes
  const { width: screenWidth, height: screenHeight } = screenDimensions;
  const isPhone = !isTablet;

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

  // Opaque full-screen mask that hides the OS rotation snap during lockAsync
  const rotationMaskOpacity = useSharedValue(0);

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

  // Resolves with window dimensions once they satisfy the predicate, or after the timeout
  const waitForDimensions = (
    predicate: (dims: ScaledSize) => boolean,
    timeoutMs: number
  ): Promise<ScaledSize> => {
    return new Promise((resolve) => {
      const current = Dimensions.get('window');
      if (predicate(current)) {
        resolve(current);
        return;
      }
      const timeout = setTimeout(() => {
        subscription?.remove();
        resolve(Dimensions.get('window'));
      }, timeoutMs);
      const subscription = Dimensions.addEventListener('change', ({ window }) => {
        if (predicate(window)) {
          clearTimeout(timeout);
          subscription?.remove();
          resolve(window);
        }
      });
    });
  };

  // Compute the transform that lands the card in the detail-view hero area
  const computeHeroTransform = (
    cardLayout: { x: number; y: number; width: number; height: number },
    width: number,
    height: number
  ) => {
    const heroHeight = height * HERO_HEIGHT_RATIO;
    const targetScale = (heroHeight * 0.82) / cardLayout.height;
    const targetCenterX = width / 2;
    const targetCenterY = heroHeight * 0.52;
    const currentCenterX = cardLayout.x + cardLayout.width / 2;
    const currentCenterY = cardLayout.y + cardLayout.height / 2;
    const moveX = targetCenterX - currentCenterX;
    const moveY = targetCenterY - currentCenterY;
    const scaledWidth = cardLayout.width * targetScale;
    const scaledHeight = cardLayout.height * targetScale;
    return {
      moveX,
      moveY,
      scale: targetScale,
      rect: {
        x: targetCenterX - scaledWidth / 2,
        y: targetCenterY - scaledHeight / 2,
        width: scaledWidth,
        height: scaledHeight,
      },
    };
  };

  // Compute the transform that centers the card on the rotate-prompt screen
  const computePromptTransform = (
    cardLayout: { x: number; y: number; width: number; height: number },
    width: number,
    height: number
  ) => {
    const targetWidth = width * PROMPT_BOOK_WIDTH_RATIO;
    const targetScale = targetWidth / cardLayout.width;
    const targetCenterX = width / 2;
    const targetCenterY = height * PROMPT_BOOK_CENTER_Y_RATIO;
    const currentCenterX = cardLayout.x + cardLayout.width / 2;
    const currentCenterY = cardLayout.y + cardLayout.height / 2;
    const moveX = targetCenterX - currentCenterX;
    const moveY = targetCenterY - currentCenterY;
    const scaledHeight = cardLayout.height * targetScale;
    return {
      moveX,
      moveY,
      scale: targetScale,
      rect: {
        x: targetCenterX - targetWidth / 2,
        y: targetCenterY - scaledHeight / 2,
        width: targetWidth,
        height: scaledHeight,
      },
    };
  };

  // Animate the card from its tile into the detail-view hero area
  const animateToHero = (
    cardLayout: { x: number; y: number; width: number; height: number },
    width: number,
    height: number
  ) => {
    const hero = computeHeroTransform(cardLayout, width, height);
    heroTransformRef.current = { moveX: hero.moveX, moveY: hero.moveY, scale: hero.scale };
    openingTransformRef.current = { moveX: hero.moveX, moveY: hero.moveY, scale: hero.scale };
    setTargetBookPosition(hero.rect);

    // Smooth bezier curve -gentle acceleration then long, soft deceleration
    const glideEasing = Easing.bezier(0.25, 0.1, 0.25, 1);

    transitionX.value = withTiming(hero.moveX, {
      duration: HERO_GLIDE_DURATION,
      easing: glideEasing,
    });

    transitionY.value = withTiming(hero.moveY, {
      duration: HERO_GLIDE_DURATION,
      easing: glideEasing,
    });

    transitionScale.value = withTiming(hero.scale, {
      duration: HERO_GLIDE_DURATION,
      easing: glideEasing,
    });

    // Fade in the shadow overlay (slightly faster so it's settled before the book lands)
    overlayOpacity.value = withTiming(1, {
      duration: HERO_GLIDE_DURATION * 0.7,
      easing: Easing.out(Easing.quad),
    });

    // Slide the night-sky background down into view behind the detail sheet
    backgroundSlideY.value = withTiming(0, {
      duration: HERO_GLIDE_DURATION * 1.2,
      easing: glideEasing,
    });

    setTimeout(() => {
      setPhase('detail');
    }, HERO_GLIDE_DURATION + 100);
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
    isOpeningRef.current = false;
    rotationMaskOpacity.value = 0;

    setSelectedStoryId(storyId);
    setSelectedStory(story || null);
    setCardPosition(cardLayout);
    setOriginalCardPosition(cardLayout); // Save original position for exit animation

    setIsTransitioning(true);
    setPhase('flying');
    setSelectedMode('read'); // Reset to default mode

    // Animate from card position to center
    transitionOpacity.value = 1;
    transitionScale.value = 1;
    transitionX.value = 0;
    transitionY.value = 0;
    overlayOpacity.value = 0;

    // Start animation synchronously so it begins on the same frame as the overlay mount
    // -withTiming runs on the UI thread and isn't affected by JS thread renders
    animateToHero(cardLayout, screenWidth, screenHeight);

    // Defer image preloading until the animation has settled
    // -Image.prefetch causes JS thread pressure that jitters the animation
    if (story) {
      InteractionManager.runAfterInteractions(() => {
        preloadStoryImages(story);
      });
    }
  };

  // Mode chip tapped on the detail view -record/narrate need a voice over first
  const handleSelectMode = (mode: ReadingMode) => {
    setSelectedMode(mode);
    if (mode === 'read') {
      setCurrentVoiceOver(null);
    } else if (mode === 'record') {
      setShowVoiceOverSelectModal(false);
      setShowVoiceOverNameModal(true);
    } else if (mode === 'narrate') {
      setShowVoiceOverNameModal(false);
      setShowVoiceOverSelectModal(true);
    }
  };

  // "Read now" tapped on the detail view -move to the rotate prompt (or open
  // directly when the interface is already landscape, e.g. tablets)
  const goToRotatePrompt = () => {
    if (selectedMode === 'record' && !currentVoiceOver) {
      setShowVoiceOverNameModal(true);
      return;
    }
    if (selectedMode === 'narrate' && !currentVoiceOver) {
      setShowVoiceOverSelectModal(true);
      return;
    }
    if (!cardPosition) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const dims = Dimensions.get('window');
    if (dims.width > dims.height) {
      beginStory();
      return;
    }

    setPhase('prompt');

    const prompt = computePromptTransform(cardPosition, dims.width, dims.height);
    openingTransformRef.current = { moveX: prompt.moveX, moveY: prompt.moveY, scale: prompt.scale };
    setTargetBookPosition(prompt.rect);

    // Small delay so the detail sheet's exit animation reveals the card mid-flight
    setTimeout(() => {
      const glide = Easing.out(Easing.cubic);
      transitionX.value = withTiming(prompt.moveX, { duration: PROMPT_GLIDE_DURATION, easing: glide });
      transitionY.value = withTiming(prompt.moveY, { duration: PROMPT_GLIDE_DURATION, easing: glide });
      transitionScale.value = withTiming(prompt.scale, { duration: PROMPT_GLIDE_DURATION, easing: glide });

      levitationY.value = withRepeat(
        withSequence(
          withTiming(-6, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          withTiming(6, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      );
    }, 120);
  };

  // Back tapped on the rotate prompt -return the book to the detail hero
  const returnToDetailFromPrompt = () => {
    if (isOpeningRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    cancelAnimation(levitationY);
    levitationY.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) });

    setPhase('flying');

    const hero = heroTransformRef.current;
    if (hero && cardPosition) {
      openingTransformRef.current = { ...hero };
      const heroRect = computeHeroTransform(cardPosition, screenWidth, screenHeight).rect;
      setTargetBookPosition(heroRect);
      const glide = Easing.out(Easing.cubic);
      transitionX.value = withTiming(hero.moveX, { duration: 350, easing: glide });
      transitionY.value = withTiming(hero.moveY, { duration: 350, easing: glide });
      transitionScale.value = withTiming(hero.scale, { duration: 350, easing: glide });
    }

    setTimeout(() => setPhase('detail'), 380);
  };

  // Flip the cover open and expand to full screen, then hand over to the reader
  const openBookIntoReader = () => {
    const COVER_FLIP_DURATION = 200;
    const HOLD_AFTER_FLIP = 100;
    const SCALE_DURATION = 200;

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

  // The physical turn was detected (or the fallback was tapped) -lock landscape
  // behind an opaque mask so the OS rotation snap is never visible, then open the book
  const beginStory = async () => {
    if (isOpeningRef.current) return;
    isOpeningRef.current = true;

    log.info('Opening story, mode:', selectedMode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    cancelAnimation(levitationY);
    levitationY.value = 0;
    setPhase('opening');

    bookExpansion.value = 0;
    pageFlipProgress.value = 0;

    const dims = Dimensions.get('window');
    const needsRotation = dims.width <= dims.height;

    if (needsRotation && cardPosition) {
      rotationMaskOpacity.value = withTiming(1, {
        duration: ROTATION_MASK_FADE_MS,
        easing: Easing.out(Easing.quad)
      });
      await new Promise(resolve => setTimeout(resolve, ROTATION_MASK_FADE_MS + 40));

      wasRotatedForTransition.current = true;
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      } catch (error) {
        log.warn('Failed to rotate to landscape:', error);
      }

      const newDims = await waitForDimensions(
        (d) => d.width > d.height,
        LANDSCAPE_DIMENSIONS_TIMEOUT_MS
      );
      log.debug('Landscape dims:', newDims.width, '×', newDims.height);
      setScreenDimensions(newDims);

      // Recenter the book on the landscape screen while it's hidden by the mask
      const targetWidth = newDims.width * 0.55;
      const targetScale = targetWidth / cardPosition.width;
      const targetHeight = cardPosition.height * targetScale;
      const targetCenterX = newDims.width / 2;
      const targetCenterY = newDims.height / 2;

      setTargetBookPosition({
        x: targetCenterX - targetWidth / 2,
        y: targetCenterY - targetHeight / 2,
        width: targetWidth,
        height: targetHeight,
      });

      const cardCenterX = cardPosition.x + cardPosition.width / 2;
      const cardCenterY = cardPosition.y + cardPosition.height / 2;
      const landscapeMoveX = targetCenterX - cardCenterX;
      const landscapeMoveY = targetCenterY - cardCenterY;

      transitionX.value = landscapeMoveX;
      transitionY.value = landscapeMoveY;
      transitionScale.value = targetScale;

      // UPDATE opening transform ref with LANDSCAPE values
      // This is critical for exit animation to use the correct centering values
      openingTransformRef.current = { moveX: landscapeMoveX, moveY: landscapeMoveY, scale: targetScale };

      overlayOpacity.value = 0.9;
      await new Promise(resolve => setTimeout(resolve, 50));

      rotationMaskOpacity.value = withTiming(0, {
        duration: 250,
        easing: Easing.in(Easing.quad)
      });
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    openBookIntoReader();
  };

  // Complete transition without calling onBeginCallback (already called)
  const completeTransitionOnly = () => {
    log.debug('Transition complete');
    setIsTransitioning(false);
    setPhase(null);
    setIsExpandingToReader(false);
    setCardPosition(null);
    setTargetBookPosition(null);
    setShouldShowStoryReader(false);
    isOpeningRef.current = false;

    setTimeout(() => {
      transitionScale.value = 1;
      transitionX.value = 0;
      transitionY.value = 0;
      transitionOpacity.value = 1;
      overlayOpacity.value = 0;
      rotationMaskOpacity.value = 0;
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

  // User cancels (back from the detail view) -book slides down, then background slides up
  const cancelTransition = async () => {
    log.debug('Cancelling transition');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Block touches during the entire cancel animation
    setIsCancelAnimating(true);

    // Step 1: Unmount the detail sheet to trigger its exit animations
    setPhase('flying');

    // Step 2: Wait for the exit animations to complete
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
    setPhase(null);
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
    isOpeningRef.current = false;
    // Clear stored opening transform values
    openingTransformRef.current = null;
    heroTransformRef.current = null;
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
      rotationMaskOpacity.value = 0;
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
    setPhase(null);
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

    log.debug('Returning to detail view');

    // Get CURRENT screen dimensions - we're returning from story reader which is in landscape
    // Don't use screenDimensions state as it may have stale portrait values
    const currentDims = Dimensions.get('window');
    const currentScreenWidth = currentDims.width;
    const currentScreenHeight = currentDims.height;
    const isCurrentLandscape = currentScreenWidth > currentScreenHeight;
    setScreenDimensions(currentDims);

    // Animation timing (reverse of the opening flow)
    const SHRINK_DURATION = 200;        // Shrink from full screen to book size
    const HOLD_AFTER_SHRINK = 100;      // Brief pause before flipping
    const COVER_FLIP_DURATION = 200;    // Flip cover back

    // Centre the closed book on the current (landscape) screen while it shrinks
    const targetWidth = currentScreenWidth * (isCurrentLandscape ? 0.35 : 0.55);
    const targetScale = targetWidth / originalCardPosition.width;
    const targetCenterX = currentScreenWidth / 2;
    const targetCenterY = currentScreenHeight / 2;
    const currentCenterX = originalCardPosition.x + originalCardPosition.width / 2;
    const currentCenterY = originalCardPosition.y + originalCardPosition.height / 2;
    const moveX = targetCenterX - currentCenterX;
    const moveY = targetCenterY - currentCenterY;
    const scaledWidth = originalCardPosition.width * targetScale;
    const scaledHeight = originalCardPosition.height * targetScale;

    const centeredPosition = {
      x: targetCenterX - scaledWidth / 2,
      y: targetCenterY - scaledHeight / 2,
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
    isOpeningRef.current = false;

    // Now hide the story reader - the animated book will be visible on top
    if (onReturnToModeSelectionCallback) {
      onReturnToModeSelectionCallback();
    }

    const finishOnDetail = async () => {
      // Hide the rotation snap behind the opaque mask, restore portrait, then
      // land the book in the detail hero and remount the detail sheet
      rotationMaskOpacity.value = withTiming(1, {
        duration: ROTATION_MASK_FADE_MS,
        easing: Easing.out(Easing.quad)
      });
      await new Promise(resolve => setTimeout(resolve, ROTATION_MASK_FADE_MS + 40));

      if (isCurrentLandscape && isPhone) {
        try {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        } catch (error) {
          log.warn('Failed to restore portrait:', error);
        }
        wasRotatedForTransition.current = false;
      }

      const portraitDims = await waitForDimensions(
        (d) => d.height >= d.width,
        LANDSCAPE_DIMENSIONS_TIMEOUT_MS
      );
      setScreenDimensions(portraitDims);

      const hero = computeHeroTransform(originalCardPosition, portraitDims.width, portraitDims.height);
      heroTransformRef.current = { moveX: hero.moveX, moveY: hero.moveY, scale: hero.scale };
      openingTransformRef.current = { moveX: hero.moveX, moveY: hero.moveY, scale: hero.scale };
      setTargetBookPosition(hero.rect);

      transitionX.value = hero.moveX;
      transitionY.value = hero.moveY;
      transitionScale.value = hero.scale;

      isExitAnimatingShared.value = 0;
      isExpandingOrExitingShared.value = 0;
      exitPageIndexRef.current = null;
      setIsExitAnimating(false);
      setSelectedMode('read');
      setPhase('detail');

      await new Promise(resolve => setTimeout(resolve, 60));
      rotationMaskOpacity.value = withTiming(0, {
        duration: 250,
        easing: Easing.in(Easing.quad)
      });
      onComplete();
    };

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

        // PHASE 3: After flip completes, rotate back and land on the detail view
        setTimeout(() => {
          finishOnDetail();
        }, COVER_FLIP_DURATION + 80);
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
          <Text style={{ fontSize: 48 }}>{STORY_TAGS[selectedStory.category].emoji}</Text>
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

  // Animated style for the opaque rotation mask
  const rotationMaskAnimatedStyle = useAnimatedStyle(() => ({
    opacity: rotationMaskOpacity.value,
  }));

  const heroHeight = screenHeight * HERO_HEIGHT_RATIO;
  const isFavorite = selectedStoryId ? favoriteStoryIds.includes(selectedStoryId) : false;

  return (
    <StoryTransitionContext.Provider value={contextValue}>
      {children}

      {/* Book preview and mode selection overlay */}
      {/* Keep blocking touches during cancel animation to prevent taps passing through to elements below */}
      {isTransitioning && cardPosition && selectedStory && (
        <View style={styles.overlay} pointerEvents={((phase !== null && phase !== 'flying') || isCancelAnimating) ? 'auto' : 'none'}>
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

          {/* Screen 6 -story detail sheet (covers the card with hero art + info) */}
          {phase === 'detail' && selectedStory && (
            <View style={styles.detailLayer} pointerEvents="box-none">
              <StoryDetailOverlay
                story={selectedStory}
                heroHeight={heroHeight}
                isFavorite={isFavorite}
                selectedMode={selectedMode}
                onSelectMode={handleSelectMode}
                onReadNow={goToRotatePrompt}
                onPreview={() => setShowPreviewModal(true)}
                onClose={cancelTransition}
                onToggleFavorite={() => {
                  if (selectedStoryId) toggleFavoriteStory(selectedStoryId);
                }}
                readButtonRef={readButtonRef}
                recordButtonRef={recordButtonRef}
                narrateButtonRef={narrateButtonRef}
                previewButtonRef={previewButtonRef}
              />
            </View>
          )}

          {/* Screen 7 -rotate prompt around the floating book */}
          {phase === 'prompt' && (
            <RotatePromptOverlay
              bookRect={targetBookPosition}
              onTurned={beginStory}
              onOpenAnyway={beginStory}
              onBack={returnToDetailFromPrompt}
            />
          )}

          {/* Opaque mask that hides the OS rotation snap during lockAsync */}
          <Animated.View
            style={[styles.rotationMask, rotationMaskAnimatedStyle]}
            pointerEvents="none"
          />

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
    backgroundColor: '#0A0F2C', // Night-sky navy matching the detail/prompt design
  },
  backgroundImage: {
    width: '200%',
    height: '200%',
    opacity: 0.12, // Subtle texture on the night-sky base
  },
  detailLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 60, // Above the animated book card (50)
  },
  rotationMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0F2C',
    zIndex: 900, // Above everything except system modals
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
