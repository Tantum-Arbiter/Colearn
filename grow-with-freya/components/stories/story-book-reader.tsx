import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, StatusBar, Image, ImageBackground } from 'react-native';
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
import { Story, StoryPage, STORY_TAGS, AnimatedCharacter } from '@/types/story';
import { Fonts } from '@/constants/theme';
import { useStoryTransition } from '@/contexts/story-transition-context';
import { StoryCompletionScreen } from './story-completion-screen';
import { MusicControl } from '../ui/music-control';
import { useAppStore } from '@/store/app-store';
import { AnimatedCharacterComponent } from './animated-character';
import { characterAudioManager } from '@/services/character-audio';
import { useCharacterAnimationTiming } from '@/hooks/use-character-animation-timing';
// import { SimpleAnimatedCharacterDemo } from './simple-animated-character-demo'; // Temporarily disabled to fix infinite loop
import { shouldShowAnimationsForStory, shouldUseSimpleDemo, isFeatureEnabled } from '@/constants/feature-flags';



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

  // Feature flag debug info
  useEffect(() => {
    if (isFeatureEnabled('ENABLE_ANIMATION_DEBUG')) {
      console.log('🎬 Animation Feature Flags:', {
        storyId: story.id,
        shouldShowAnimations: shouldShowAnimationsForStory(story.id),
        shouldUseSimpleDemo: shouldUseSimpleDemo(),
        isLandscapeReady,
        currentPageIndex,
      });
    }
  }, [story.id, isLandscapeReady, currentPageIndex]);

  // Character animation timing
  const {
    isActive: isAnimationActive,
    hasStarted: hasAnimationStarted,
    resetAnimation: resetCharacterAnimations
  } = useCharacterAnimationTiming({
    isPageActive: isLandscapeReady && !isTransitioning && !showCompletionScreen,
    config: {
      startDelay: 2000,
      autoStart: true,
      resetOnInactive: true,
    },
    onAnimationStart: () => {
      console.log('Character animations started for page:', currentPageIndex);
    },
    onAnimationReset: () => {
      console.log('Character animations reset');
    },
  });



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

        // Cleanup character audio
        characterAudioManager.unloadAllCharacterAudio()
          .then(() => console.log('Character audio cleanup complete'))
          .catch(error => console.warn('Failed to cleanup character audio:', error));
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

    // Preload character audio for current page
    preloadCharacterAudio();

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

  // Preload character audio for current page
  const preloadCharacterAudio = async () => {
    const currentPage = pages[currentPageIndex];
    if (!currentPage?.animatedCharacters) return;

    for (const character of currentPage.animatedCharacters) {
      if (character.audioSource) {
        try {
          await characterAudioManager.loadCharacterAudio(
            character.id,
            character.audioSource,
            { volume: 0.8 }
          );
          console.log(`Preloaded audio for character: ${character.name}`);
        } catch (error) {
          console.warn(`Failed to preload audio for character ${character.name}:`, error);
        }
      }
    }
  };

  // Handle character press
  const handleCharacterPress = async (characterId: string) => {
    console.log(`Character pressed: ${characterId}`);

    const currentPage = pages[currentPageIndex];
    const character = currentPage?.animatedCharacters?.find(c => c.id === characterId);

    if (character?.audioSource) {
      try {
        await characterAudioManager.playCharacterAudio(characterId);
        console.log(`Playing audio for character: ${character.name}`);
      } catch (error) {
        console.warn(`Failed to play audio for character ${character.name}:`, error);
      }
    }
  };

  // Handle story completion with book closing animation
  const handleStoryCompletion = async () => {
    try {
      console.log('Starting story completion transition...');


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

    console.log('Cover tapped - going directly to page 1');

    // Go directly to page 1 with no animation
    setCurrentPageIndex(1);
  };
  const storyTag = story.category ? STORY_TAGS[story.category] : null;

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
            {/* Legacy Character overlay - only show if character image exists and no animated characters */}
            {page.characterImage && !page.animatedCharacters && (
              <Image
                source={typeof page.characterImage === 'string' ? { uri: page.characterImage } : page.characterImage}
                style={styles.characterImage}
                resizeMode="contain"
              />
            )}

            {/* Animated Characters - new system */}
            {page.animatedCharacters && page.animatedCharacters.map((character) => (
              <AnimatedCharacterComponent
                key={character.id}
                character={character}
                isActive={isLandscapeReady && !isTransitioning && !showCompletionScreen}
                onCharacterPress={handleCharacterPress}
                onAnimationComplete={() => {
                  console.log(`Animation complete for character: ${character.name}`);
                }}
              />
            ))}

            {/* Simple Animation Demo - Feature Flagged Proof of Concept - TEMPORARILY DISABLED */}
            {/* {shouldShowAnimationsForStory(story.id) && shouldUseSimpleDemo() && (
              <SimpleAnimatedCharacterDemo
                isActive={isLandscapeReady && !isTransitioning && !showCompletionScreen}
                onCharacterPress={() => {
                  console.log('Demo character pressed!');
                  // Could play a simple sound effect here
                }}
              />
            )} */}

            {/* Page indicator overlay - Top Left (hide on cover page and next page) */}
            {!isNextPage && page.pageNumber > 0 && (
              <View style={[styles.pageIndicatorOverlay, {
                top: Math.max(insets.top + 5, 20),
                left: Math.max(insets.left + 5, 20),
              }]}>
                <Text style={styles.pageIndicatorText}>
                  {page.pageNumber}/{pages.length - 1}
                </Text>
              </View>
            )}
          </View>
        ) : null}
      </>
    );
  };
  
  const handleNextPage = () => {
    if (isTransitioning) return;

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
  
  const handlePreviousPage = () => {
    if (isTransitioning || currentPageIndex <= 0) return;

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

    // Reset character animations for new page
    resetCharacterAnimations();

    // Preload character audio for new page
    setTimeout(() => {
      preloadCharacterAudio();
    }, 100);

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


        {/* Top Right Controls - Exit and Sound */}
        <View style={[styles.topRightControls, {
          paddingTop: Math.max(insets.top + 5, 20),
          paddingRight: Math.max(insets.right + 5, 20)
        }]}>
          <MusicControl size={24} color="white" />
          <Pressable style={styles.exitButton} onPress={handleExit}>
            <Text style={styles.exitButtonText}>✕</Text>
          </Pressable>
        </View>

        {/* Simple Single Page - Just Like Cover Tap */}
        <Animated.View style={[styles.pageContent, currentPageAnimatedStyle]}>
          {renderPageContent(currentPage)}
        </Animated.View>

        {/* UI Controls Layer */}
        <View style={styles.uiControlsLayer}>

        {/* Bottom UI Panel - Text and Controls (hide on cover page) */}
        {currentPage && currentPageIndex > 0 && (
          <View style={[styles.bottomUIPanel, {
            paddingLeft: Math.max(insets.left + 5, 20),
            paddingRight: Math.max(insets.right + 5, 20),
            paddingBottom: Math.max(insets.bottom + 5, 20),
          }]}>
          {/* Previous Button - Left Side */}
          <Pressable
            style={[
              styles.navButton,
              styles.prevButton,
              currentPageIndex <= 0 && styles.navButtonDisabled
            ]}
            onPress={handlePreviousPage}
            disabled={currentPageIndex <= 0 || isTransitioning}
            testID="left-touch-area"
          >
            <Text style={[
              styles.navButtonText,
              currentPageIndex <= 0 && styles.navButtonTextDisabled
            ]}>
              ←
            </Text>
          </Pressable>

          {/* Story Text Box - Center */}
          <View style={styles.centerTextContainer}>
            <View style={styles.centerTextBox}>
              <Text
                style={currentPage?.pageNumber === 0 ? styles.coverText : styles.storyText}
                numberOfLines={currentPage?.pageNumber === 0 ? 3 : 2}
                ellipsizeMode="tail"
              >
                {currentPage?.text}
              </Text>
            </View>
          </View>

          {/* Next Button - Right Side */}
          <Pressable
            style={[
              styles.navButton,
              styles.nextButton,
              currentPageIndex === pages.length - 1 && styles.completeButton
            ]}
            onPress={handleNextPage}
            disabled={isTransitioning}
            testID="right-touch-area"
          >
            <Text style={[
              styles.navButtonText,
              currentPageIndex === pages.length - 1 && styles.completeButtonText
            ]}>
              {currentPageIndex === pages.length - 1 ? '✓' : '→'}
            </Text>
          </Pressable>
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
              <Text style={styles.coverTapText}>Tap to begin</Text>
            </View>
          </Pressable>
        )}

        </View>
      </View>
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
  topRightControls: {
    position: 'absolute',
    top: 0,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 10,
  },
  exitButtonContainer: {
    position: 'absolute',
    top: 0,
    right: 20,
    zIndex: 10,
  },
  exitButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)', // Glass morphism transparency
    borderRadius: 20,
    width: 40,
    height: 40,
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
  exitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF', // White text
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
    alignItems: 'center', // Center align all elements
    justifyContent: 'space-between',
    minHeight: 100,
    paddingTop: 5,
    zIndex: 5,
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
    backgroundColor: 'rgba(255, 255, 255, 0.25)', // Glass morphism transparency
    paddingHorizontal: 8, // Reduced padding for smaller indicator
    paddingVertical: 4, // Reduced padding for smaller indicator
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)', // Subtle border for glass effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    // Glass morphism effect (backdropFilter not supported in React Native)
    overflow: 'hidden',
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
    marginHorizontal: 20, // Proper spacing from navigation buttons
    maxWidth: '70%', // Limit width to ensure button spacing on larger screens
  },
  centerTextBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 20,
    paddingHorizontal: 25,
    paddingVertical: 15, // Adequate padding for 2 lines
    minHeight: 80, // Proper height for 2 lines of text
    maxHeight: 80, // Fixed height to ensure only 2 lines
    width: '100%',
    minWidth: 200, // Minimum width for readability
    maxWidth: 500, // Maximum width to prevent over-stretching on large screens
    justifyContent: 'center', // Center text vertically
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    fontWeight: '500',
    color: '#2C3E50',
    textAlign: 'center',
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
});
