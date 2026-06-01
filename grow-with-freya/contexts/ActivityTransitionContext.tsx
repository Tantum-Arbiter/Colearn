/**
 * ActivityTransitionContext
 *
 * Simplified StoryTransitionContext for learning activities.
 * Card-to-center transition, background scroll, Play/Preview buttons,
 * X close, tap-to-begin.
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { Dimensions, Image, StyleSheet, View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence,
  Easing, SharedValue, SlideInDown, SlideOutDown, FadeIn, cancelAnimation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/app-store';

const MOVE_TO_CENTER_DURATION = 1600;
const BUTTONS_DELAY = 400;

export interface TransitionActivity {
  id: string;
  nameKey: string;
  descKey: string;
  ageKey: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}

export type ActivityMode = 'play' | 'preview';

interface CtxType {
  isTransitioning: boolean;
  showModeSelection: boolean;
  selectedActivity: TransitionActivity | null;
  selectedMode: ActivityMode;
  onBeginCallback: (() => void) | null;
  setOnBeginCallback: (cb: (() => void) | null) => void;
  onCancelCallback: (() => void) | null;
  setOnCancelCallback: (cb: (() => void) | null) => void;
  onReturnCallback: (() => void) | null;
  setOnReturnCallback: (cb: (() => void) | null) => void;
  cardPosition: { x: number; y: number; width: number; height: number } | null;
  startTransition: (a: TransitionActivity, l: { x: number; y: number; width: number; height: number }) => void;
  cancelTransition: () => void;
  beginActivity: () => void;
  returnToModeSelection: () => void;
  exitGame: () => void;
  isInGame: boolean;
  transitionScale: SharedValue<number>;
  transitionX: SharedValue<number>;
  transitionY: SharedValue<number>;
  transitionOpacity: SharedValue<number>;
  overlayOpacity: SharedValue<number>;
  transitionAnimatedStyle: any;
}

const Ctx = createContext<CtxType | null>(null);

export function useActivityTransition() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useActivityTransition must be used within ActivityTransitionProvider');
  return c;
}

export function ActivityTransitionProvider({ children }: { children: React.ReactNode }) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showModeSelection, setShowModeSelection] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<TransitionActivity | null>(null);
  const [selectedMode, setSelectedMode] = useState<ActivityMode>('play');
  const [cardPosition, setCardPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isCancelAnimating, setIsCancelAnimating] = useState(false);
  const [onBeginCallback, setOnBeginCallback] = useState<(() => void) | null>(null);
  const [onCancelCallback, setOnCancelCallback] = useState<(() => void) | null>(null);
  const [onReturnCallback, setOnReturnCallback] = useState<(() => void) | null>(null);
  const [showPreviewInfo, setShowPreviewInfo] = useState(false);
  const [isInGame, setIsInGame] = useState(false);

  const insets = useSafeAreaInsets();
  const { scaledFontSize, scaledButtonSize, scaledPadding, isTablet } = useAccessibility();
  const { t } = useTranslation();
  const toggleFavoriteActivity = useAppStore((s) => s.toggleFavoriteActivity);
  const favoriteActivityIds = useAppStore((s) => s.favoriteActivityIds);

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isPhone = !isTablet;
  const bookBorderRadius = scaledButtonSize(15);

  // Animation shared values
  const transitionScale = useSharedValue(1);
  const transitionX = useSharedValue(0);
  const transitionY = useSharedValue(0);
  const transitionOpacity = useSharedValue(1);
  const overlayOpacity = useSharedValue(0);
  const backgroundSlideY = useSharedValue(-screenHeight);
  const levitationY = useSharedValue(0);
  const overlaySlideY = useSharedValue(0);

  const animateToCenter = useCallback((
    cl: { x: number; y: number; width: number; height: number },
    w: number, h: number,
  ) => {
    const tw = isPhone ? w * 0.75 : w * 0.55;
    const ts = tw / cl.width;
    const tcx = w / 2;
    const tcy = isPhone ? h * 0.38 : h / 2;
    const g = Easing.bezier(0.25, 0.1, 0.25, 1);
    transitionX.value = withTiming(tcx - (cl.x + cl.width / 2), { duration: MOVE_TO_CENTER_DURATION, easing: g });
    transitionY.value = withTiming(tcy - (cl.y + cl.height / 2), { duration: MOVE_TO_CENTER_DURATION, easing: g });
    transitionScale.value = withTiming(ts, { duration: MOVE_TO_CENTER_DURATION, easing: g });
    overlayOpacity.value = withTiming(1, { duration: MOVE_TO_CENTER_DURATION * 0.7, easing: Easing.out(Easing.quad) });
    backgroundSlideY.value = withTiming(0, { duration: MOVE_TO_CENTER_DURATION * 1.8, easing: g });
    levitationY.value = withRepeat(withSequence(
      withTiming(-6, { duration: 600, easing: Easing.inOut(Easing.quad) }),
      withTiming(6, { duration: 600, easing: Easing.inOut(Easing.quad) }),
    ), -1, true);
    setTimeout(() => {
      levitationY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) });
      setShowModeSelection(true);
    }, MOVE_TO_CENTER_DURATION + BUTTONS_DELAY);
  }, [isPhone, transitionX, transitionY, transitionScale, overlayOpacity, backgroundSlideY, levitationY]);

  const resetAll = useCallback(() => {
    setIsTransitioning(false); setShowModeSelection(false); setSelectedActivity(null);
    setCardPosition(null); setIsCancelAnimating(false); setShowPreviewInfo(false); setIsInGame(false);
    setTimeout(() => {
      transitionScale.value = 1; transitionX.value = 0; transitionY.value = 0;
      transitionOpacity.value = 1; overlayOpacity.value = 0; backgroundSlideY.value = -screenHeight;
      overlaySlideY.value = 0;
    }, 50);
  }, [transitionScale, transitionX, transitionY, transitionOpacity, overlayOpacity, backgroundSlideY, overlaySlideY, screenHeight]);

  const startTransition = useCallback((activity: TransitionActivity, cl: { x: number; y: number; width: number; height: number }) => {
    transitionScale.value = 1; transitionX.value = 0; transitionY.value = 0;
    transitionOpacity.value = 1; overlayOpacity.value = 0;
    backgroundSlideY.value = -screenHeight; cancelAnimation(levitationY); levitationY.value = 0;
    overlaySlideY.value = 0;
    setSelectedActivity(activity); setCardPosition(cl); setIsTransitioning(true);
    setSelectedMode('play'); setShowPreviewInfo(false); setIsCancelAnimating(false); setIsInGame(false);
    animateToCenter(cl, screenWidth, screenHeight);
  }, [animateToCenter, screenWidth, screenHeight, transitionScale, transitionX, transitionY, transitionOpacity, overlayOpacity, backgroundSlideY, levitationY]);

  const cancelTransition = useCallback(async () => {
    if (isCancelAnimating) return; setIsCancelAnimating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowModeSelection(false);
    // If we're on the game page, navigate back to the learning list first
    if (isInGame && onReturnCallback) onReturnCallback();
    await new Promise(r => setTimeout(r, 280));
    const D = 400; const ch = Dimensions.get('window').height;
    transitionY.value = withTiming(ch + 200, { duration: D, easing: Easing.in(Easing.cubic) });
    setTimeout(() => {
      transitionOpacity.value = 0;
      backgroundSlideY.value = withTiming(-ch, { duration: D, easing: Easing.in(Easing.cubic) });
      overlayOpacity.value = withTiming(0, { duration: D, easing: Easing.out(Easing.quad) });
      setTimeout(() => { if (onCancelCallback) onCancelCallback(); resetAll(); }, D + 50);
    }, D);
  }, [isCancelAnimating, isInGame, onReturnCallback, onCancelCallback, resetAll, transitionY, transitionOpacity, backgroundSlideY, overlayOpacity]);

  const beginActivity = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowModeSelection(false);
    setShowPreviewInfo(false); setIsInGame(true);
    // Trigger page navigation immediately so the game page starts appearing.
    if (onBeginCallback) onBeginCallback();
    // Slide the ENTIRE overlay up as one unit, revealing the game underneath.
    // Matches EnhancedPageTransition duration (800ms) for a seamless feel.
    const ch = Dimensions.get('window').height;
    const config = { duration: 800, easing: Easing.bezier(0.25, 0.1, 0.25, 1) };
    overlaySlideY.value = withTiming(-ch, config);
  }, [onBeginCallback, overlaySlideY]);

  const returnToModeSelection = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Slide the overlay back into view over the game — game page stays mounted underneath.
    // User can then tap "Tap to begin" to resume, or X to go back to the learning list.
    const config = { duration: 800, easing: Easing.bezier(0.25, 0.1, 0.25, 1) };
    overlaySlideY.value = withTiming(0, config);
    setIsInGame(false);
    // Re-show mode selection after the slide-in settles
    setTimeout(() => { setShowModeSelection(true); }, 400);
  }, [overlaySlideY]);

  // Exit game: navigate back to selection page (game slides up off screen) and clean up overlay
  const exitGame = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsInGame(false);
    // Navigate back — the page transition animates the game sliding up (800ms)
    if (onReturnCallback) onReturnCallback();
    // Wait for the page transition to finish before cleaning up the overlay
    setTimeout(() => { resetAll(); }, 850);
  }, [onReturnCallback, resetAll]);

  // Animated styles
  const transitionAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: transitionX.value },
      { translateY: transitionY.value + levitationY.value },
      { scale: transitionScale.value },
    ],
    opacity: transitionOpacity.value,
    borderRadius: bookBorderRadius / transitionScale.value,
  }));
  const bgSlideStyle = useAnimatedStyle(() => ({ transform: [{ translateY: backgroundSlideY.value }] }));
  const overlaySlideStyle = useAnimatedStyle(() => ({ transform: [{ translateY: overlaySlideY.value }] }));

  // Target position for button placement
  const targetPos = cardPosition ? (() => {
    const tw = isPhone ? screenWidth * 0.75 : screenWidth * 0.55;
    const ts = tw / cardPosition.width;
    const tcx = screenWidth / 2; const tcy = isPhone ? screenHeight * 0.38 : screenHeight / 2;
    const cw = cardPosition.width * ts; const ch = cardPosition.height * ts;
    return { x: tcx - cw / 2, y: tcy - ch / 2, width: cw, height: ch };
  })() : null;

  // Sizing — fixed width wide enough for "Preview" so both buttons match
  const btnW = scaledButtonSize(78);
  const btnPV = scaledPadding(10); const btnPH = scaledPadding(8);
  const btnR = scaledButtonSize(14);
  const iconSz = scaledFontSize(20); const txtSz = scaledFontSize(11);
  const closeSz = scaledButtonSize(36); const closeOff = scaledButtonSize(8);
  const closeIconSz = scaledFontSize(16);
  const beginR = scaledButtonSize(18);
  const beginPV = scaledPadding(10); const beginPH = scaledPadding(20);
  const beginTxt = scaledFontSize(16);

  const ctxVal: CtxType = {
    isTransitioning, showModeSelection, selectedActivity, selectedMode,
    onBeginCallback, setOnBeginCallback, onCancelCallback, setOnCancelCallback,
    onReturnCallback, setOnReturnCallback,
    cardPosition, startTransition, cancelTransition, beginActivity,
    returnToModeSelection, exitGame, isInGame,
    transitionScale, transitionX, transitionY, transitionOpacity, overlayOpacity, transitionAnimatedStyle,
  };

  const isFav = selectedActivity ? favoriteActivityIds.includes(selectedActivity.id) : false;

  return (
    <Ctx.Provider value={ctxVal}>
      {children}

      {/* TRANSITION OVERLAY */}
      {isTransitioning && cardPosition && selectedActivity && (
        <Animated.View style={[styles.overlay, overlaySlideStyle]} pointerEvents={(showModeSelection || isCancelAnimating) ? 'auto' : isInGame ? 'none' : 'none'}>
          {/* Scrolling background */}
          <Animated.View style={[styles.bgContainer, bgSlideStyle]} pointerEvents="none">
            <Image
              source={require('../assets/images/ui-elements/background-home.webp')}
              style={styles.bgImage}
              resizeMode="repeat"
            />
          </Animated.View>

          {/* Tap anywhere to begin */}
          {showModeSelection && !showPreviewInfo && (
            <Pressable style={styles.tapAnywhere} onPress={() => {
              if (selectedMode === 'play') beginActivity();
              else setShowPreviewInfo(true);
            }} />
          )}

          {/* X Close button */}
          {showModeSelection && targetPos && !showPreviewInfo && (
            <Animated.View entering={FadeIn.delay(100).duration(200)}
              style={[styles.closeBtnWrap, { left: targetPos.x - closeOff, top: targetPos.y - closeOff }]}>
              <Pressable style={[styles.closeBtn, { width: closeSz, height: closeSz, borderRadius: closeSz / 2 }]}
                onPress={cancelTransition} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={[styles.closeBtnTxt, { fontSize: closeIconSz }]}>✕</Text>
              </Pressable>
            </Animated.View>
          )}

          {/* Activity card */}
          <Animated.View style={[styles.cardContainer, {
            left: cardPosition.x, top: cardPosition.y,
            width: cardPosition.width, height: cardPosition.height,
            borderRadius: bookBorderRadius, overflow: 'hidden',
          }, transitionAnimatedStyle]}>
            <View style={[styles.cardInner, { backgroundColor: selectedActivity.color }]}>
              <Ionicons name={selectedActivity.icon} size={cardPosition.width * 0.4} color="rgba(255,255,255,0.9)" />
              <Text style={[styles.cardTitle, { fontSize: scaledFontSize(14) }]} numberOfLines={2}>
                {t(selectedActivity.nameKey)}
              </Text>
            </View>
          </Animated.View>

          {/* Play / Preview buttons */}
          {showModeSelection && targetPos && !showPreviewInfo && (
            <Animated.View
              entering={SlideInDown.delay(0).duration(450).easing(Easing.out(Easing.cubic))}
              exiting={SlideOutDown.duration(250)}
              style={[styles.modeContainer, {
                flexDirection: 'row', top: targetPos.y + targetPos.height + 20,
                left: 0, right: 0, justifyContent: 'center', alignItems: 'center', gap: 8,
              }]}>
              <Pressable style={[styles.modeBtn, selectedMode === 'play' && !showPreviewInfo && styles.modeBtnSel, {
                flexDirection: 'column', borderRadius: btnR, paddingVertical: btnPV,
                paddingHorizontal: btnPH, width: btnW, gap: scaledPadding(3),
              }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedMode('play'); }}>
                <Ionicons name="play" size={iconSz} color="#FFFFFF" />
                <Text style={[styles.modeBtnTxt, { fontSize: txtSz }]} numberOfLines={1}>{t('learning.activityMode.play')}</Text>
              </Pressable>
              <Pressable style={[styles.modeBtn, (selectedMode === 'preview' || showPreviewInfo) && styles.modeBtnSel, {
                flexDirection: 'column', borderRadius: btnR, paddingVertical: btnPV,
                paddingHorizontal: btnPH, width: btnW, gap: scaledPadding(3),
              }]} onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowPreviewInfo(true);
              }}>
                <Ionicons name="eye" size={iconSz} color="#FFFFFF" />
                <Text style={[styles.modeBtnTxt, { fontSize: txtSz }]} numberOfLines={1}>{t('learning.activityMode.preview')}</Text>
              </Pressable>
            </Animated.View>
          )}

          {/* Tap to begin */}
          {showModeSelection && !showPreviewInfo && (
            <Animated.View entering={SlideInDown.delay(100).duration(450).easing(Easing.out(Easing.cubic))}
              style={[styles.tapToBegin, { bottom: insets.bottom + 20 }]}>
              <Pressable style={[styles.modeBtn, styles.modeBtnSel, {
                borderRadius: beginR, paddingVertical: beginPV, paddingHorizontal: beginPH, gap: scaledPadding(8),
              }]} onPress={() => { selectedMode === 'play' ? beginActivity() : setShowPreviewInfo(true); }}>
                <Text style={[styles.modeBtnTxt, { fontSize: beginTxt }]}>{t('learning.activityMode.tapToBegin')}</Text>
              </Pressable>
            </Animated.View>
          )}

          {/* Preview info overlay */}
          {showPreviewInfo && selectedActivity && (
            <Animated.View entering={FadeIn.duration(250)} style={styles.previewOverlay}>
              <View style={styles.previewContent}>
                <Pressable style={styles.previewClose} onPress={() => setShowPreviewInfo(false)}>
                  <Text style={styles.closeBtnTxt}>✕</Text>
                </Pressable>
                <Pressable style={styles.previewFav} onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  toggleFavoriteActivity(selectedActivity.id);
                }}>
                  <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={20} color={isFav ? '#FF6B6B' : '#999'} />
                </Pressable>
                <Text style={styles.previewTitle}>{t(selectedActivity.nameKey)}</Text>
                <View style={styles.previewMeta}>
                  <Text style={styles.previewLabel}>{t('learning.activityPreview.ageRange')}</Text>
                  <Text style={styles.previewValue}>{t(selectedActivity.ageKey)}</Text>
                </View>
                <View style={styles.previewMeta}>
                  <Text style={styles.previewLabel}>{t('learning.activityPreview.aboutThisActivity')}</Text>
                  <Text style={styles.previewValue}>{t(selectedActivity.descKey)}</Text>
                </View>
                <Pressable style={styles.previewPlayBtn} onPress={() => {
                  setShowPreviewInfo(false); setSelectedMode('play'); beginActivity();
                }}>
                  <Text style={styles.previewPlayTxt}>{t('learning.activityPreview.playActivity')}</Text>
                </Pressable>
              </View>
            </Animated.View>
          )}
        </Animated.View>
      )}
    </Ctx.Provider>
  );
}


const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 1000, justifyContent: 'center', alignItems: 'center' },
  bgContainer: { ...StyleSheet.absoluteFillObject, zIndex: 0, overflow: 'hidden', backgroundColor: '#1E3A8A' },
  bgImage: { width: '200%', height: '200%', opacity: 0.25 },
  tapAnywhere: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  closeBtnWrap: { position: 'absolute', zIndex: 1001 },
  closeBtn: {
    backgroundColor: 'rgba(255,255,255,0.95)', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5,
  },
  closeBtnTxt: { fontSize: 20, fontWeight: '600', color: '#333' },
  cardContainer: {
    position: 'absolute', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 15, zIndex: 50,
  },
  cardInner: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  cardTitle: {
    fontFamily: Fonts.primary, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', marginTop: 8,
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },
  modeContainer: { position: 'absolute', zIndex: 100 },
  modeBtn: {
    backgroundColor: 'rgba(130,130,130,0.45)', borderRadius: 15, paddingVertical: 12, paddingHorizontal: 20,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
  },
  modeBtnSel: { backgroundColor: 'rgba(130,130,130,0.5)', borderColor: 'rgba(255,255,255,0.6)' },
  modeBtnTxt: {
    fontSize: 12, fontFamily: Fonts.sans, fontWeight: '600', color: '#FFFFFF', textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },
  tapToBegin: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 200 },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject, zIndex: 2000, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
  },
  previewContent: { backgroundColor: 'white', borderRadius: 20, padding: 24, width: '85%', maxWidth: 400 },
  previewClose: {
    position: 'absolute', top: 12, left: 12, width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.95)', justifyContent: 'center', alignItems: 'center', zIndex: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5,
  },
  previewFav: {
    position: 'absolute', top: 12, right: 12, width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.95)', justifyContent: 'center', alignItems: 'center', zIndex: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5,
  },
  previewTitle: {
    fontSize: 22, fontWeight: 'bold', color: '#333', textAlign: 'center',
    marginBottom: 16, marginTop: 20, fontFamily: Fonts.primary,
  },
  previewMeta: { marginBottom: 12 },
  previewLabel: { fontSize: 13, fontWeight: '600', color: '#888', marginBottom: 2, fontFamily: Fonts.sans },
  previewValue: { fontSize: 15, color: '#333', fontFamily: Fonts.sans },
  previewPlayBtn: { backgroundColor: '#4ECDC4', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  previewPlayTxt: { fontSize: 16, fontWeight: '600', color: 'white', fontFamily: Fonts.sans },
});