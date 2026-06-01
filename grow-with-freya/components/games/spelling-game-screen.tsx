/**
 * SpellingGameScreen
 *
 * Standalone spelling game — shows letter slots and a
 * tile pool. Child taps tiles to spell the word. Uses useSpellingGame hook
 * for state management. Includes progress bar, celebration overlay, and
 * bridge overlay on round completion.
 *
 * Fill-blank pages (2 & 4) show narrative text with multiple ___ blanks
 * and a word bank below. User taps a blank to select it, then taps a word.
 *
 * Visual style matches ReadingChallengeUI's pastel letter cards.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Image as RNImage } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fonts } from '@/constants/theme';
import { useAccessibility, TEXT_SIZE_OPTIONS } from '@/hooks/use-accessibility';
import { useAppStore } from '@/store/app-store';
import { useSpellingGame } from '@/hooks/use-spelling-game';
import { CelebrationOverlay } from './celebration-overlay';
import { RealWorldBridgeOverlay } from '@/components/learning/real-world-bridge-overlay';
import { PageHeader } from '@/components/ui/page-header';
import { SUPPORTED_LANGUAGES, setStoredLanguage, type SupportedLanguage } from '@/services/i18n';

const BG_HOME_TEXTURE = require('@/assets/images/ui-elements/background-home.webp');
const WOMBAT_IMAGE = require('@/assets/games/spelling/background.webp');



/** Pastel palette for letter cards — matches ReadingChallengeUI */
const LETTER_CARD_COLORS = [
  '#FF9AA2', '#FFB7B2', '#FFDAC1', '#B5EAD7', '#C7CEEA',
  '#E2F0CB', '#F3D1F4', '#FFE5B4', '#A8D8EA', '#FFD3E0',
];

/** Show the real-world bridge overlay every N completed rounds. */
const BRIDGE_SHOW_EVERY_N = 3;
/** Module-level counter — survives re-renders but resets on app restart. */
let completedRoundsCounter = 0;



interface SpellingGameScreenProps {
  activityId: string;
  /** Optional: play a specific story variation instead of a random one */
  storyId?: string;
  onBack: () => void;
  onRoundComplete?: () => void;
  /** When true, the screen is visible — re-starts game if it was cleaned up */
  isActive?: boolean;
}

export function SpellingGameScreen({
  activityId,
  storyId,
  onBack,
  onRoundComplete,
  isActive = true,
}: SpellingGameScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { scaledFontSize, isTablet, scaledButtonSize, textSizeScale: accessTextSizeScale } = useAccessibility();
  const { textSizeScale, setTextSizeScale } = useAppStore();

  const [showCelebration, setShowCelebration] = useState(false);
  const [showBridge, setShowBridge] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<'main' | 'fontSize' | 'language' | null>(null);

  // Fade-in animation for word_complete prompt
  const wordCompleteOpacity = useSharedValue(0);
  const wordCompleteTranslateY = useSharedValue(12);
  const wordCompleteAnimatedStyle = useAnimatedStyle(() => ({
    opacity: wordCompleteOpacity.value,
    transform: [{ translateY: wordCompleteTranslateY.value }],
  }));

  // Wrong-answer flash — opacity pulses red then fades back
  const wrongFlashOpacity = useSharedValue(0);
  const wrongFlashAnimatedStyle = useAnimatedStyle(() => ({
    opacity: wrongFlashOpacity.value,
  }));

  // Fill-blank wrong-answer shake — horizontal shake on the word bank area
  const wrongShakeX = useSharedValue(0);
  const wrongShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: wrongShakeX.value }],
  }));

  // Content fade for transitions between words/pages
  const contentFadeOpacity = useSharedValue(1);
  const contentFadeStyle = useAnimatedStyle(() => ({
    opacity: contentFadeOpacity.value,
  }));

  const handleRoundComplete = useCallback(() => {
    completedRoundsCounter += 1;
    setShowCelebration(true);
    onRoundComplete?.();
  }, [onRoundComplete]);

  const game = useSpellingGame(activityId, handleRoundComplete, storyId);

  // Animate word_complete prompt in
  useEffect(() => {
    if (game.state === 'word_complete') {
      wordCompleteOpacity.value = 0;
      wordCompleteTranslateY.value = 12;
      const ease = Easing.out(Easing.cubic);
      wordCompleteOpacity.value = withTiming(1, { duration: 400, easing: ease });
      wordCompleteTranslateY.value = withTiming(0, { duration: 400, easing: ease });
    }
  }, [game.state]); // eslint-disable-line react-hooks/exhaustive-deps

  // Flash red on every wrong attempt — wrongAttemptCount increments each time
  useEffect(() => {
    if (game.wrongAttemptCount > 0) {
      // Red flash for spell mode slot overlay
      wrongFlashOpacity.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }),
      );
      // Horizontal shake for fill-blank word bank area
      wrongShakeX.value = withSequence(
        withTiming(8, { duration: 50 }),
        withTiming(-8, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
      // Stronger haptic for wrong answer
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [game.wrongAttemptCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-start when screen becomes active or activityId changes
  useEffect(() => {
    if (isActive) {
      game.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId, isActive]);

  const handleTileTap = (tileId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    game.tapTile(tileId);
  };

  const handleUndo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    game.undoLastLetter();
  };

  const handleNextWord = () => {
    // Fade content out, swap word, fade back in
    contentFadeOpacity.value = withTiming(0, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
    setTimeout(() => {
      game.nextWord();
      contentFadeOpacity.value = withTiming(1, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      });
    }, 320);
  };

  const handleCelebrationContinue = () => {
    setShowCelebration(false);
    if (completedRoundsCounter % BRIDGE_SHOW_EVERY_N === 0) {
      setShowBridge(true);
    } else {
      onBack();
    }
  };

  const handleCelebrationClose = () => {
    setShowCelebration(false);
    onBack();
  };

  const handleBridgeDismiss = () => {
    setShowBridge(false);
    onBack();
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack();
    // Delay cleanup so the game content stays visible while the page slides out (800ms transition)
    setTimeout(() => { game.cleanup(); }, 900);
  };

  const toggleHint = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHintVisible(prev => !prev);
  };

  const word = game.currentWord;
  const sf = scaledFontSize;
  const isStoryMode = !!game.story;
  const isFillBlank = game.pageMode === 'fill-blank';
  const effectiveHint = hintVisible;

  const handleTapBlank = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    game.tapBlank(index);
  };

  const handleTapWordBank = (itemId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    game.tapWordBankItem(itemId);
  };

  const handleSettingsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (showSettingsMenu) {
      setShowSettingsMenu(false);
      setActiveSubmenu(null);
    } else {
      setShowSettingsMenu(true);
      setActiveSubmenu('main');
    }
  };

  /**
   * For fill-blank mode, split the narrative around `___` placeholders.
   * Uses nested <Text> for proper inline alignment — blanks sit on the
   * same baseline as surrounding words instead of floating above.
   */
  const renderFillBlankNarrative = () => {
    if (!game.storyNarrativeKey) return null;
    const narrative = t(game.storyNarrativeKey);
    const parts = narrative.split('___');

    if (parts.length < 2) {
      return (
        <Text style={[styles.narrativeText, { fontSize: sf(16) }]} testID="narrative-text">
          {narrative}
        </Text>
      );
    }

    // Build inline text with tappable blank spans — all inside a single <Text>
    // so blanks sit on the same baseline as surrounding words.
    const elements: React.ReactNode[] = [];
    parts.forEach((part, i) => {
      // Strip trailing '.' before a blank placeholder to avoid ". ___"
      const cleanPart = (i < parts.length - 1) ? part.replace(/\.\s*$/, ' ') : part;
      if (cleanPart) {
        elements.push(<Text key={`t-${i}`}>{cleanPart}</Text>);
      }
      if (i < parts.length - 1 && i < game.blankSlots.length) {
        const slot = game.blankSlots[i];
        const filled = slot.placedWord !== '';
        const isSelected = game.selectedBlankIndex === i;
        // Highlight only the active blank red on wrong attempt
        const isWrongBlank = isSelected && game.lastAttemptWrong;
        elements.push(
          <Text
            key={`b-${i}`}
            onPress={() => handleTapBlank(i)}
            accessibilityRole="button"
            accessibilityLabel={filled ? slot.placedWord : `blank ${i + 1}`}
            testID={`blank-slot-${i}`}
            style={[
              styles.inlineBlankText,
              { fontSize: sf(16) },
              filled && styles.inlineBlankTextFilled,
              isSelected && !filled && styles.inlineBlankTextSelected,
              isWrongBlank && styles.inlineBlankTextWrong,
            ]}
          >
            {filled ? ` ${slot.placedWord} ` : ' ___ '}
          </Text>
        );
      }
    });

    return (
      <Text style={[styles.narrativeText, { fontSize: sf(16), textAlign: 'center' }]} testID="fill-blank-narrative">
        {elements}
      </Text>
    );
  };

  return (
    <LinearGradient colors={['#1E3A8A', '#3B82F6', '#4ECDC4']} style={styles.container} testID="story-background">
      {/* Subtle children's art texture overlay — matches story screens */}
      <View style={styles.bgTextureContainer} pointerEvents="none">
        <RNImage source={BG_HOME_TEXTURE} style={styles.bgTexture} resizeMode="repeat" />
      </View>

      {/* Page header — back + music + menu, no title */}
      <PageHeader
        title=""
        onBack={handleBack}
        useBackArrow
        rightActionIcon="menu"
        onRightAction={handleSettingsPress}
      />

      {/* Settings overlay — tap outside to close */}
      {showSettingsMenu && (
        <Pressable
          style={styles.settingsOverlay}
          onPress={() => { setShowSettingsMenu(false); setActiveSubmenu(null); }}
        />
      )}

      {/* Settings dropdown — main menu */}
      {showSettingsMenu && activeSubmenu === 'main' && (
        <View style={[styles.settingsMenu, {
          top: insets.top + 8 + scaledButtonSize(40) + 16,
          right: 16,
        }]}>
          <Pressable
            style={styles.menuItem}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveSubmenu('fontSize'); }}
          >
            <Text style={[styles.menuItemText, { fontSize: sf(14) }]}>{t('reader.fontButtonSize', 'Font / Button Size')}</Text>
            <Text style={[styles.menuItemArrow, { fontSize: sf(14) }]}>›</Text>
          </Pressable>
          <Pressable
            style={styles.menuItem}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveSubmenu('language'); }}
          >
            <Text style={[styles.menuItemText, { fontSize: sf(14) }]}>
              {SUPPORTED_LANGUAGES.find(l => l.code === i18n.language)?.flag || '🌐'}{' '}
              {t('account.language', 'Language')}
            </Text>
            <Text style={[styles.menuItemArrow, { fontSize: sf(14) }]}>›</Text>
          </Pressable>
        </View>
      )}

      {/* Settings dropdown — font size */}
      {showSettingsMenu && activeSubmenu === 'fontSize' && (
        <View style={[styles.settingsMenu, {
          top: insets.top + 8 + scaledButtonSize(40) + 16,
          right: 16,
        }]}>
          <Pressable
            style={styles.submenuHeader}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveSubmenu('main'); }}
          >
            <Text style={[styles.settingsMenuTitle, { fontSize: sf(14) }]}>{t('reader.fontButtonSize', 'Font / Button Size')}</Text>
            <Text style={[styles.menuItemArrow, { fontSize: sf(14) }]}>›</Text>
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
                  {t(option.labelKey)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Settings dropdown — language */}
      {showSettingsMenu && activeSubmenu === 'language' && (
        <View style={[styles.settingsMenu, {
          top: insets.top + 8 + scaledButtonSize(40) + 16,
          right: 16,
          maxHeight: 320,
          minWidth: 220,
        }]}>
          <Pressable
            style={styles.submenuHeader}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveSubmenu('main'); }}
          >
            <Text style={[styles.settingsMenuTitle, { fontSize: sf(14) }]}>{t('account.language', 'Language')}</Text>
            <Text style={[styles.menuItemArrow, { fontSize: sf(14) }]}>›</Text>
          </Pressable>
          <ScrollView showsVerticalScrollIndicator style={{ maxHeight: 250 }}>
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = i18n.language === lang.code;
              return (
                <Pressable
                  key={lang.code}
                  style={[styles.languageItem, isSelected && styles.languageItemSelected]}
                  onPress={async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    await setStoredLanguage(lang.code);
                    setShowSettingsMenu(false);
                    setActiveSubmenu(null);
                  }}
                >
                  <Text style={[styles.languageFlag, { fontSize: sf(18) }]}>{lang.flag}</Text>
                  <Text style={[styles.languageName, { fontSize: sf(13) }]} numberOfLines={1}>{lang.nativeName}</Text>
                  {isSelected && <Ionicons name="checkmark" size={sf(16)} color="#4ECDC4" />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Storybook image — fixed in the upper half, never below centre */}
      {game.state !== 'idle' && (
        <View
          style={[
            styles.storybookFrame,
            isTablet && styles.storybookFrameTablet,
          ]}
          testID="storybook-frame"
          pointerEvents="none"
        >
          <View style={[styles.storybookInner, isTablet && styles.storybookInnerTablet]}>
            <RNImage
              source={WOMBAT_IMAGE}
              style={styles.storybookImage}
              resizeMode="cover"
              testID="storybook-image"
            />
          </View>
        </View>
      )}

      {/* Game content — scrollable so nothing gets cut off */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Page dots — centred progress indicator */}
        {game.state !== 'idle' && game.wordsTotal > 0 && (
          <View style={styles.pageDots} testID="page-dots">
            {Array.from({ length: game.wordsTotal }).map((_, i) => (
              <View
                key={`dot-${i}`}
                style={[
                  styles.pageDot,
                  i < game.wordsCompleted && styles.pageDotCompleted,
                  i === game.pageIndex && styles.pageDotActive,
                ]}
              />
            ))}
          </View>
        )}

        {/* Game area — wrapped in fade transition for word-to-word transitions */}
        {game.state === 'playing' && word && (
          <Animated.View style={[styles.gameArea, contentFadeStyle]}>
            {isFillBlank ? (
              <>
                {renderFillBlankNarrative()}
                {/* Word bank — shakes on wrong answer */}
                <Animated.View style={[styles.wordBank, wrongShakeStyle]}>
                  <Text style={[styles.poolLabel, { fontSize: sf(14) }]}>
                    {t('games.chooseWord', 'Choose a word:')}
                  </Text>
                  <View style={styles.wordBankRow}>
                    {game.wordBankItems.map((item, idx) => {
                      const bg = LETTER_CARD_COLORS[idx % LETTER_CARD_COLORS.length];
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => !item.used && handleTapWordBank(item.id)}
                          accessibilityRole="button"
                          accessibilityLabel={item.word}
                          testID={`word-bank-${item.id}`}
                          style={[styles.wordBankItem, { backgroundColor: bg }, item.used && styles.wordBankItemUsed]}
                        >
                          <Text style={[styles.wordBankText, { fontSize: sf(18) }, item.used && styles.wordBankTextUsed]}>
                            {item.word}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </Animated.View>
              </>
            ) : (
              <>
                {isStoryMode && game.storyNarrativeKey && (
                  <Text style={[styles.narrativeText, { fontSize: sf(16), textAlign: 'center', marginBottom: 16, paddingHorizontal: 12 }]} testID="narrative-text">
                    {t(game.storyNarrativeKey)}
                  </Text>
                )}
                <View style={styles.hintRow}>
                  {effectiveHint && (
                    <Text style={[styles.wordHint, { fontSize: sf(22) }]}>{word.word}</Text>
                  )}
                  <Pressable
                    onPress={toggleHint}
                    style={styles.hintToggle}
                    accessibilityRole="button"
                    accessibilityLabel={effectiveHint ? t('games.hideHint', 'Hide hint') : t('games.showHint', 'Show hint')}
                    testID="hint-toggle"
                  >
                    <Ionicons name={effectiveHint ? 'eye' : 'eye-off'} size={isTablet ? 24 : 20} color="rgba(255,255,255,0.5)" />
                  </Pressable>
                </View>
                <View style={styles.slotsRow}>
                  {word.word.split('').map((_, i) => {
                    const filled = i < game.placedLetters.length;
                    const isNext = i === game.placedLetters.length;
                    const cardColor = filled ? LETTER_CARD_COLORS[i % LETTER_CARD_COLORS.length] : 'transparent';
                    // The "next" slot is where a wrong letter would land — flash it red
                    const showWrongFlash = isNext && game.lastAttemptWrong;
                    return (
                      <View key={`slot-${i}`} style={{ position: 'relative' }}>
                        <Pressable
                          onPress={() => filled && handleUndo()}
                          style={[
                            styles.slotCard,
                            filled && { backgroundColor: cardColor, borderColor: cardColor },
                            isNext && !game.lastAttemptWrong && styles.slotNext,
                          ]}
                        >
                          {filled ? (
                            <Text style={[styles.slotLetter, { fontSize: sf(28) }]}>{game.placedLetters[i].toUpperCase()}</Text>
                          ) : (
                            <View style={styles.slotDot} />
                          )}
                        </Pressable>
                        {showWrongFlash && (
                          <Animated.View style={[styles.slotWrongOverlay, wrongFlashAnimatedStyle]} pointerEvents="none" />
                        )}
                      </View>
                    );
                  })}
                </View>
                <View style={styles.tilePool}>
                  <Text style={[styles.poolLabel, { fontSize: sf(14) }]}>{t('games.chooseLetter', 'Choose a letter:')}</Text>
                  <View style={styles.tileRow}>
                    {game.tiles.map((tile, idx) => {
                      const bg = LETTER_CARD_COLORS[idx % LETTER_CARD_COLORS.length];
                      return (
                        <Pressable
                          key={tile.id}
                          onPress={() => !tile.used && handleTileTap(tile.id)}
                          accessibilityRole="button"
                          accessibilityLabel={tile.letter}
                          style={[styles.tileCard, { backgroundColor: bg }, tile.used && styles.tileUsed]}
                        >
                          <Text style={[styles.tileLetter, { fontSize: sf(26) }, tile.used && styles.tileLetterUsed]}>
                            {tile.letter.toUpperCase()}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </>
            )}
          </Animated.View>
        )}

        {/* Word complete — "next" prompt with fade-in */}
        {game.state === 'word_complete' && (
          <Animated.View style={[styles.gameArea, wordCompleteAnimatedStyle]}>
            <Pressable
              onPress={handleNextWord}
              style={styles.nextButton}
              accessibilityRole="button"
              accessibilityLabel={t('games.nextWord', 'Next word')}
            >
              <Text style={[styles.nextText, { fontSize: sf(18) }]}>
                {isStoryMode ? t('games.nextPage', 'Next page') : t('games.nextWord', 'Next word')}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#1E3A8A" />
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>

      {/* Celebration + Bridge overlays */}
      <CelebrationOverlay
        visible={showCelebration}
        onContinue={handleCelebrationContinue}
        onClose={handleCelebrationClose}
      />
      <RealWorldBridgeOverlay
        visible={showBridge}
        activityId={activityId}
        gameSection="spelling"
        onDismiss={handleBridgeDismiss}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgTextureContainer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.09,
    zIndex: 0,
  },
  bgTexture: {
    width: '100%',
    height: '100%',
  },

  // Storybook image — absolutely positioned in the upper half of the screen
  storybookFrame: {
    position: 'absolute',
    top: '12%',
    left: 0,
    right: 0,
    bottom: '50%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  storybookFrameTablet: {
    top: '15%',
    bottom: '40%',
  },
  storybookInner: {
    width: '85%',
    maxWidth: 400,
    aspectRatio: 4 / 3,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F5F0E8',
    borderWidth: 3,
    borderColor: 'rgba(139, 115, 85, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  storybookInnerTablet: {
    width: '65%',
    maxWidth: 560,
    borderRadius: 20,
  },
  storybookImage: {
    width: '100%',
    height: '100%',
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
    backgroundColor: 'rgba(130, 130, 130, 0.75)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(100, 100, 100, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 100,
    overflow: 'hidden',
  },
  settingsMenuTitle: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  submenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 8,
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
  textSizeOptionsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  textSizeOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  textSizeOptionSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  textSizeOptionText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  textSizeOptionTextSelected: {
    fontWeight: '700',
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  languageItemSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  languageFlag: {
    width: 28,
    textAlign: 'center',
  },
  languageName: {
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
  },

  pageDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    zIndex: 10,
  },
  pageDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  pageDotCompleted: {
    backgroundColor: '#4ADE80',
  },
  pageDotActive: {
    backgroundColor: '#FFD700',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  scrollArea: {
    flex: 1,
    zIndex: 5,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  gameArea: {
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    paddingTop: 28,
  },
  narrativeText: {
    color: 'rgba(255,255,255,0.95)',
    fontFamily: Fonts.sans,
    lineHeight: 28,
  },
  inlineBlankText: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  inlineBlankTextFilled: {
    color: '#4ECDC4',
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    textDecorationLine: 'none',
  },
  inlineBlankTextSelected: {
    color: '#FFD700',
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    textDecorationLine: 'underline',
    textDecorationColor: '#FFD700',
  },
  inlineBlankTextWrong: {
    color: '#FFFFFF',
    backgroundColor: 'rgba(255, 80, 80, 0.45)',
    textDecorationLine: 'underline',
    textDecorationColor: '#FF6B6B',
    borderRadius: 4,
    overflow: 'hidden',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  wordHint: {
    color: '#FFD700',
    fontFamily: Fonts.rounded,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 6,
    textShadowColor: 'rgba(255, 215, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  hintToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  slotCard: {
    width: 56,
    height: 68,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 14,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  slotNext: {
    borderColor: '#FFD700',
    borderStyle: 'solid',
    borderWidth: 3,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
  },
  slotLetter: {
    color: '#1a1a2e',
    fontFamily: Fonts.rounded,
    fontWeight: '800',
  },
  slotDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  slotWrongOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#FF6B6B',
    backgroundColor: 'rgba(255, 107, 107, 0.25)',
  },

  wordBank: {
    width: '100%',
    paddingHorizontal: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  wordBankRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  wordBankItem: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  wordBankItemUsed: {
    opacity: 0.2,
    shadowOpacity: 0,
    elevation: 0,
  },
  wordBankText: {
    color: '#1a1a2e',
    fontFamily: Fonts.rounded,
    fontWeight: '700',
  },
  wordBankTextUsed: {
    textDecorationLine: 'line-through',
  },
  tilePool: {
    width: '100%',
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  poolLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: Fonts.sans,
    marginBottom: 10,
    textAlign: 'center',
  },
  tileRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  tileCard: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  tileUsed: {
    opacity: 0.2,
    shadowOpacity: 0,
    elevation: 0,
  },
  tileLetter: {
    color: '#1a1a2e',
    fontFamily: Fonts.rounded,
    fontWeight: '800',
  },
  tileLetterUsed: {
    textDecorationLine: 'line-through',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: '#4ADE80',
    marginTop: 16,
  },
  nextText: {
    fontFamily: Fonts.rounded,
    color: '#1E3A8A',
    fontWeight: '700',
  },
});
