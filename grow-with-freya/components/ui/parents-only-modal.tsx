/**
 * ParentsOnlyModal
 *
 * The gate a grown-up passes before a parent-only door opens. Two challenge
 * variants share one night-sky glass card:
 *
 * - maths  — the owl tutor above the card, the sum in a recessed pill, and a
 *            wooden-framed chalkboard to write the answer on
 * - animal — a painted animal inside the starry orb, and a neon-rimmed field
 *
 * The card borrows its glass tokens from the instrument picker
 * (instrument-picker-overlay.tsx) so the gate reads as a sibling of the panel
 * that opens over the same book transition.
 *
 * Rendered as an absolutely positioned overlay rather than a Modal: a Modal
 * crashes on iOS when the reader flips orientation underneath it.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Platform,
  StyleSheet,
  useWindowDimensions,
  Keyboard,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useCoversJourneyBar } from '@/components/child-ui/journey-bar-cover';
import { PanelClouds } from '@/components/ui/panel-clouds';
import { PanelStarfield } from '@/components/ui/panel-starfield';
import type { ParentChallenge } from '@/hooks/use-parents-only-challenge';

const OWL_TUTOR = require('@/assets/images/parents-only/owl.webp');
const CHALKBOARD = require('@/assets/images/parents-only/board.webp');
const CONTINUE_PILL = require('@/assets/images/parents-only/btn.webp');
const ORB = require('@/assets/images/parents-only/orb.webp');

/** Aspect ratios of the supplied art, so neither piece is ever stretched. */
const OWL_ASPECT = 560 / 379;
const BOARD_ASPECT = 1.7217;
const PILL_ASPECT = 434 / 89;
/** The orb art's lit ring spans this much of its square canvas; the rest is glow. */
const ORB_RING_RATIO = 0.7528;
/** How much of the ring's width the animal inside is allowed to take. */
const ORB_SUBJECT_RATIO = 0.62;

/**
 * The chalk hand the answer is written in. iOS ships a real chalk face; Android
 * has no equivalent, so it falls back to its handwritten system alias.
 */
const CHALK_FONT = Platform.select({ ios: 'Chalkduster', android: 'casual', default: undefined });

/**
 * One rhythm, shared by both challenges, so the two cards are laid out alike.
 * A phone gives most of its height to the keyboard, so the card only gets the
 * roomy set where there is room for it; below that everything steps down
 * together rather than one piece at a time.
 */
const RHYTHM = {
  roomy: { owl: 148, orb: 132, board: '74%', cta: '92%', padTop: 30, padBottom: 20, gap: 12, title: 25, subtitle: 14, chalk: 38, chalkHint: 17 },
  tight: { owl: 116, orb: 104, board: '64%', cta: '88%', padTop: 22, padBottom: 15, gap: 8, title: 21, subtitle: 12.5, chalk: 30, chalkHint: 14 },
} as const;

/** Under this viewport height the card uses the tight rhythm. */
const TIGHT_BELOW = 780;

export const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'delete'],
] as const;
export const ANSWER_MAX_DIGITS = 3;
const KEYPAD_KEY_HEIGHT = 56;
const KEYPAD_GAP = 8;

/**
 * Where the board's green writing surface sits inside the framed art, measured
 * off the asset — the answer is laid into this box, never over the wood.
 */
const BOARD_INSET = { left: '6.1%', right: '6.2%', top: '9.6%', bottom: '11.0%' } as const;

const COLORS = {
  cardTop: 'rgba(46, 78, 176, 0.93)',
  cardBottom: 'rgba(20, 38, 104, 0.95)',
  cardBorder: 'rgba(160, 200, 255, 0.55)',
  glow: '#5AA9FF',
  orbFill: 'rgba(58, 116, 214, 0.38)',
  orbRing: 'rgba(150, 205, 255, 0.8)',
  sumPill: 'rgba(16, 34, 94, 0.72)',
  sumPillBorder: 'rgba(150, 190, 255, 0.28)',
  woodTop: '#C58A4E',
  woodMid: '#A2662F',
  woodBottom: '#7E4A21',
  woodGlow: '#E2A056',
  board: '#27462F',
  boardEdge: '#173123',
  chalk: '#E9F2E6',
  chalkDim: 'rgba(233, 242, 230, 0.5)',
  neon: '#5FD8F0',
  ctaTop: '#6FD4FF',
  ctaMid: '#39A3FF',
  ctaBottom: '#1565E8',
  gold: '#FFD75E',
  white: '#FFFFFF',
};

// Get full screen dimensions (ignores keyboard resize on Android)
const getFullScreenHeight = () => {
  const screen = Dimensions.get('screen');
  return screen.height;
};

/**
 * The starry orb the animal stands in. `size` is the diameter of the lit ring,
 * not of the art: the canvas is grown so the glow around the ring has room and
 * is never clipped.
 */
function ChallengeOrb({ size, children }: { size: number; children: React.ReactNode }) {
  const canvas = size / ORB_RING_RATIO;
  return (
    <View testID="parents-only-orb" style={[styles.orb, { width: canvas, height: canvas }]}>
      <Image source={ORB} style={StyleSheet.absoluteFill} contentFit="contain" />
      {children}
    </View>
  );
}

interface ParentsOnlyModalProps {
  visible: boolean;
  challenge: ParentChallenge;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  isInputValid: boolean;
  scaledFontSize?: (size: number) => number;
}

export function ParentsOnlyModal({
  visible,
  challenge,
  inputValue,
  onInputChange,
  onSubmit,
  onClose,
  isInputValid,
  scaledFontSize = (size) => size,
}: ParentsOnlyModalProps) {
  const { t } = useTranslation();
  const { isTablet } = useAccessibility();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const { width, height } = useWindowDimensions();
  const keyboardOffset = useRef(new Animated.Value(0)).current;
  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const entranceTranslateY = useRef(new Animated.Value(30)).current;
  const entranceScale = useRef(new Animated.Value(0.92)).current;

  const isMath = challenge.type === 'math';
  // The gate covers the page, so the journey bar steps aside while it is up.
  useCoversJourneyBar(visible);
  const m = height > 0 && height < TIGHT_BELOW ? RHYTHM.tight : RHYTHM.roomy;

  // Detect phone in landscape (small height + landscape orientation)
  const isPhoneLandscape = height < 500 && width > height;
  const drawsKeypad = isMath && isTablet && !isPhoneLandscape;

  // Entrance animation — fade in backdrop + settle the card up into place
  useEffect(() => {
    if (visible) {
      entranceOpacity.setValue(0);
      entranceTranslateY.setValue(30);
      entranceScale.setValue(0.92);
      Animated.parallel([
        Animated.timing(entranceOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(entranceTranslateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(entranceScale, {
          toValue: 1,
          friction: 7,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, entranceOpacity, entranceTranslateY, entranceScale]);

  // Smooth keyboard animation using Animated API
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const keyboardShowListener = Keyboard.addListener(showEvent, (event) => {
      const keyboardHeight = event.endCoordinates.height;
      // Move content up - Android needs more offset since we're using fixed screen height
      const offset = Platform.OS === 'ios'
        ? -(keyboardHeight / 2.5)
        : -(keyboardHeight / 2);

      Animated.timing(keyboardOffset, {
        toValue: offset,
        duration: Platform.OS === 'ios' ? event.duration : 250,
        useNativeDriver: true,
      }).start();
    });

    const keyboardHideListener = Keyboard.addListener(hideEvent, (event) => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? event.duration : 250,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, [keyboardOffset]);

  // Auto-focus the input when modal becomes visible
  useEffect(() => {
    if (visible) {
      // Small delay to ensure modal is fully visible before focusing
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      // Reset keyboard offset when modal closes
      keyboardOffset.setValue(0);
    }
  }, [visible, keyboardOffset]);

  // On Android, use fixed screen height to prevent overlay from shrinking when keyboard appears
  const fullScreenStyle = Platform.OS === 'android' ? {
    height: getFullScreenHeight(),
    paddingTop: StatusBar.currentHeight || 0,
  } : {};

  // Early return if not visible - using conditional rendering instead of Modal
  // to avoid iOS crash during orientation changes
  if (!visible) {
    return null;
  }

  const renderInput = (compact: boolean) => {
    // The maths challenge writes on a wooden-framed chalkboard; the animal
    // challenge writes in a neon-rimmed field.
    const field = (
      <TextInput
        ref={inputRef}
        testID="parents-only-input"
        style={[
          isMath ? styles.chalkInput : styles.neonInput,
          compact && styles.inputCompact,
          { fontSize: scaledFontSize(isMath ? m.chalk : compact ? 16 : 18) },
          !isMath && isFocused && styles.neonInputFocused,
        ]}
        value={inputValue}
        onChangeText={onInputChange}
        placeholder={isMath ? '' : t('parentsOnly.placeholder')}
        placeholderTextColor="rgba(255, 255, 255, 0.5)"
        keyboardType={isMath ? 'number-pad' : 'default'}
        editable={!drawsKeypad}
        showSoftInputOnFocus={!drawsKeypad}
        // At chalk size the caret is tall enough to strike through the centred
        // hint, so it only appears once there is an answer to sit beside.
        caretHidden={isMath && inputValue.length === 0}
        selectionColor={isMath ? COLORS.chalk : COLORS.neon}
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={onSubmit}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    );

    if (isMath) {
      return (
        <View
          testID="parents-only-chalkboard"
          style={[styles.chalkGlow, compact ? styles.chalkGlowCompact : { width: m.board, marginBottom: m.gap }]}
        >
          <Image source={CHALKBOARD} style={StyleSheet.absoluteFill} contentFit="fill" />
          <View style={styles.chalkSurface}>
            {field}
            {inputValue.length === 0 && (
              <View style={styles.chalkHintWrap} pointerEvents="none">
                <Text style={[styles.chalkHint, { fontSize: scaledFontSize(m.chalkHint) }]}>
                  {t('parentsOnly.placeholder')}
                </Text>
              </View>
            )}
          </View>
        </View>
      );
    }

    return <View style={compact ? styles.neonWrapCompact : styles.neonWrap}>{field}</View>;
  };

  const pressKey = (key: string) => {
    if (key === 'delete') {
      onInputChange(inputValue.slice(0, -1));
      return;
    }
    if (inputValue.length >= ANSWER_MAX_DIGITS) return;
    onInputChange(inputValue + key);
  };

  const renderKeypad = () => (
    <View testID="parents-only-keypad" style={[styles.keypad, { width: m.board, marginBottom: m.gap }]}>
      {KEYPAD_ROWS.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.keypadRow}>
          {row.map((key, keyIndex) =>
            key === '' ? (
              <View key={keyIndex} style={styles.keypadBlank} />
            ) : (
              <Pressable
                key={keyIndex}
                testID={`parents-only-key-${key}`}
                accessibilityRole="button"
                accessibilityLabel={key === 'delete' ? t('common.delete') : key}
                onPress={() => pressKey(key)}
                style={({ pressed }) => [styles.keypadKey, pressed && styles.keypadKeyPressed]}
              >
                {key === 'delete' ? (
                  <Ionicons name="backspace-outline" size={scaledFontSize(26)} color={COLORS.chalk} />
                ) : (
                  <Text style={[styles.keypadKeyText, { fontSize: scaledFontSize(m.title) }]}>{key}</Text>
                )}
              </Pressable>
            )
          )}
        </View>
      ))}
    </View>
  );

  const renderCta = (compact: boolean) => (
    <Pressable
      testID="parents-only-submit"
      style={({ pressed }) => [
        styles.ctaShell,
        compact ? styles.ctaShellCompact : { width: m.cta },
        !isInputValid && styles.ctaDisabled,
        pressed && isInputValid && styles.ctaPressed,
      ]}
      onPress={onSubmit}
      disabled={!isInputValid}
    >
      <Image source={CONTINUE_PILL} style={StyleSheet.absoluteFill} contentFit="fill" />
      {!isInputValid && <View style={styles.ctaVeil} pointerEvents="none" />}
      <View style={styles.ctaFill}>
        <Text style={[styles.ctaText, { fontSize: scaledFontSize(compact ? 14 : 17) }]}>
          {compact ? t('parentsOnly.go') : t('parentsOnly.continue')}
        </Text>
        <Text style={[styles.ctaArrow, { fontSize: scaledFontSize(compact ? 15 : 19) }]}>→</Text>
      </View>
    </Pressable>
  );

  return (
    <Animated.View testID="parents-only-modal" style={[styles.absoluteContainer, fullScreenStyle, { opacity: entranceOpacity }]}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.modalOverlay, fullScreenStyle]} pointerEvents="box-none">
        <Animated.View style={[
          styles.cardShell,
          isPhoneLandscape && styles.cardShellLandscape,
          {
            // Two stacked translateY entries rather than Animated.add: they
            // compose the same way and survive the web Animated shim in tests.
            transform: [
              { translateY: keyboardOffset },
              { translateY: entranceTranslateY },
              { scale: entranceScale },
            ],
          },
        ]}>
          <LinearGradient
            colors={[COLORS.cardTop, COLORS.cardBottom]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[
              styles.card,
              isPhoneLandscape ? styles.cardLandscape : { paddingTop: m.padTop, paddingBottom: m.padBottom },
            ]}
          >
            <PanelStarfield cloudScale={0.3} testID="parents-only-stars" />
            <PanelClouds scale={0.3} opacity={0.55} testID="parents-only-clouds" />

            <Pressable testID="parents-only-close" style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>

            {isPhoneLandscape ? (
              // Compact horizontal layout for phone landscape
              <View style={styles.landscapeLayout}>
                <View style={styles.landscapeLeft}>
                  {isMath ? (
                    <Image source={OWL_TUTOR} style={styles.owlCompact} contentFit="contain" />
                  ) : (
                    <ChallengeOrb size={64}>
                      <Image
                        testID="parents-only-animal"
                        source={challenge.art}
                        style={styles.animalCompact}
                        contentFit="contain"
                      />
                    </ChallengeOrb>
                  )}
                </View>
                <View style={styles.landscapeRight}>
                  <Text style={[styles.titleCompact, { fontSize: scaledFontSize(16) }]}>
                    {isMath ? t('parentsOnly.solveMath') : t('parentsOnly.typeAnimalName')}
                  </Text>
                  {isMath && (
                    <Text testID="parents-only-sum" style={[styles.sumTextCompact, { fontSize: scaledFontSize(18) }]}>
                      {challenge.num1} {challenge.operation} {challenge.num2} = ?
                    </Text>
                  )}
                  <View style={styles.inputRow}>
                    <View style={styles.inputRowField}>{renderInput(true)}</View>
                    {renderCta(true)}
                  </View>
                </View>
              </View>
            ) : (
              // Standard vertical layout for portrait/tablet
              <>
                {isMath && (
                  <Image
                    testID="parents-only-owl"
                    source={OWL_TUTOR}
                    style={{ width: m.owl, height: m.owl / OWL_ASPECT }}
                    contentFit="contain"
                  />
                )}

                <Text style={[styles.title, { fontSize: scaledFontSize(m.title), marginBottom: m.gap / 2 }]}>
                  {t('parentsOnly.title')}
                </Text>

                {isMath ? (
                  <>
                    <Text style={[styles.subtitle, { fontSize: scaledFontSize(m.subtitle), marginBottom: m.gap }]}>
                      {t('parentsOnly.mathSubtitle')}
                    </Text>
                    <View style={[styles.sumPill, { marginBottom: m.gap }]}>
                      <Text testID="parents-only-sum" style={[styles.sumText, { fontSize: scaledFontSize(m.title * 1.15) }]}>
                        {challenge.num1} {challenge.operation} {challenge.num2} = ?
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <ChallengeOrb size={m.orb}>
                      <Image
                        testID="parents-only-animal"
                        source={challenge.art}
                        style={{ width: m.orb * ORB_SUBJECT_RATIO, height: m.orb * ORB_SUBJECT_RATIO }}
                        contentFit="contain"
                      />
                    </ChallengeOrb>
                    <Text style={[styles.subtitle, { fontSize: scaledFontSize(m.subtitle), marginBottom: m.gap }]}>
                      {t('parentsOnly.subtitle')}
                    </Text>
                  </>
                )}

                {renderInput(false)}
                {drawsKeypad ? renderKeypad() : null}
                {renderCta(false)}
              </>
            )}
          </LinearGradient>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Absolute container to replace Modal - avoids iOS crash during orientation changes
  absoluteContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3000, // Above other modals in story-transition-context
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(3, 8, 30, 0.68)',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  // The shell carries the outer glow; the gradient card carries the fill.
  cardShell: {
    borderRadius: 28,
    shadowColor: COLORS.glow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 22,
    elevation: 14,
  },
  cardShellLandscape: {
    borderRadius: 22,
  },
  card: {
    borderRadius: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    minWidth: 300,
    maxWidth: 340,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
  },
  cardLandscape: {
    borderRadius: 22,
    flexDirection: 'row',
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 16,
    minWidth: 'auto',
    maxWidth: 460,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(200, 225, 255, 0.5)',
    zIndex: 10,
  },
  closeButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  // Portrait/tablet styles
  title: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.sans,
    color: 'rgba(214, 231, 255, 0.92)',
    textAlign: 'center',
    marginBottom: 12,
  },
  orb: {
    alignItems: 'center',
    justifyContent: 'center',
    // The art carries its own ring and glow, so the view adds nothing.
    marginVertical: 2,
  },
  animalCompact: {
    width: 64 * ORB_SUBJECT_RATIO,
    height: 64 * ORB_SUBJECT_RATIO,
  },
  sumPill: {
    width: '100%',
    backgroundColor: COLORS.sumPill,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.sumPillBorder,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  sumText: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    color: COLORS.white,
    textAlign: 'center',
  },
  keypad: {
    gap: KEYPAD_GAP,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: KEYPAD_GAP,
  },
  keypadBlank: {
    flex: 1,
  },
  keypadKey: {
    flex: 1,
    height: KEYPAD_KEY_HEIGHT,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.sumPillBorder,
    backgroundColor: COLORS.sumPill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadKeyPressed: {
    backgroundColor: COLORS.orbFill,
    transform: [{ scale: 0.96 }],
  },
  keypadKeyText: {
    fontFamily: CHALK_FONT,
    color: COLORS.chalk,
  },
  // Wooden-framed chalkboard (maths variant)
  chalkGlow: {
    aspectRatio: BOARD_ASPECT,
    shadowColor: COLORS.woodGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 8,
  },
  chalkGlowCompact: {
    height: 74,
    marginBottom: 0,
    shadowRadius: 8,
  },
  // The answer is laid into the board's green area, clear of the wooden frame.
  chalkSurface: {
    position: 'absolute',
    left: BOARD_INSET.left,
    right: BOARD_INSET.right,
    top: BOARD_INSET.top,
    bottom: BOARD_INSET.bottom,
    justifyContent: 'center',
  },
  chalkInput: {
    width: '100%',
    color: COLORS.chalk,
    textAlign: 'center',
    letterSpacing: 0.6,
    fontFamily: CHALK_FONT,
  },
  // Sits over the empty board; the input behind it stays tappable.
  chalkHintWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chalkHint: {
    color: COLORS.chalkDim,
    textAlign: 'center',
    fontFamily: CHALK_FONT,
  },
  // Neon field (animal variant)
  neonWrap: {
    width: '100%',
    marginBottom: 18,
  },
  neonWrapCompact: {
    width: '100%',
  },
  neonInput: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 26,
    paddingVertical: 14,
    paddingHorizontal: 18,
    color: COLORS.white,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: COLORS.neon,
    fontFamily: Fonts.sans,
  },
  neonInputFocused: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: COLORS.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 6,
  },
  inputCompact: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  // Continue CTA
  ctaShell: {
    aspectRatio: PILL_ASPECT,
    shadowColor: '#3BA5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 18,
    elevation: 10,
  },
  ctaShellCompact: {
    width: 190,
    shadowRadius: 10,
    shadowOpacity: 0.5,
  },
  ctaFill: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  // Greys the pill back while the answer is still wrong.
  ctaVeil: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(28, 38, 66, 0.62)',
    borderRadius: 999,
  },
  ctaText: {
    fontFamily: Fonts.sans,
    fontWeight: '700',
    color: COLORS.white,
  },
  ctaArrow: {
    color: COLORS.white,
    fontWeight: '700',
  },
  ctaDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaPressed: {
    opacity: 0.85,
  },
  // Landscape phone compact styles
  landscapeLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  landscapeLeft: {
    marginRight: 14,
  },
  landscapeRight: {
    flex: 1,
  },
  owlCompact: {
    width: 92,
    height: 92 / OWL_ASPECT,
  },
  titleCompact: {
    fontFamily: Fonts.sans,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 6,
  },
  sumTextCompact: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputRowField: {
    flex: 1,
  },
});
