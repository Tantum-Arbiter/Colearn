import React, { useState } from 'react';
import { View, StyleSheet, Pressable, TextInput, Image, ImageSourcePropType, Dimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '../themed-text';
import { useAccessibility } from '@/hooks/use-accessibility';
import {
  useOnboardingMetrics,
  ONBOARDING_MAX_WIDTH,
  ONBOARDING_H_PADDING,
  ONBOARDING_HERO_RADIUS,
  onboardingMetricsFor,
  SAFE_BACKDROP_TOP,
  TOGETHER_BACKDROP_TOP,
  READY_BACKDROP_TOP,
} from './onboarding-metrics';
import { MIN_NICKNAME_LENGTH, MAX_NICKNAME_LENGTH } from '@/constants/profile';
import { SUPPORTED_LANGUAGES, setStoredLanguage, type SupportedLanguage } from '@/services/i18n';
import { GOLD, PURPLE, CARD_BG, CARD_BORDER, TEXT_MUTED, TEXT_FAINT, NIGHT_BASE } from './onboarding-theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// The width every hero and grid below is sized from. It is capped, so a
// tablet does not scale the art up with the screen -- see onboarding-metrics
// for why. The components override these with live values from
// `useOnboardingMetrics`; these are the static fallbacks, and they are capped
// too so a style that is never overridden still lays out sanely.
const LAYOUT_WIDTH = Math.min(SCREEN_WIDTH, ONBOARDING_MAX_WIDTH);
const SHELL_H_PADDING = ONBOARDING_H_PADDING;
const CHIP_GAP = 10;
const CHIP_SIZE = Math.floor((LAYOUT_WIDTH - SHELL_H_PADDING * 2 - CHIP_GAP * 2) / 3);
// the safety promises read as one panel of four quadrants, so the art is a small
// glyph inside each cell rather than a tile in its own right
// the promise art is a full starfield tile, sized to fill its quadrant
// the art is a starfield tile whose glyph fills ~66% of it, so the tile is
// sized to keep that glyph at roughly 61pt
// the tile claims nearly the whole cell: padding is trimmed to the minimum that
// still separates it from the gold dividers
// the art fills its whole cell, with the label sitting over it
// the panel sits just inside the together chip row opposite rather than
// matching it edge for edge, so its two cells are a little under half that
// width and tall enough to carry a chip the size of one of those, with two
// lines of label under it
const SAFETY_GRID_RATIO = 0.8;
const SAFETY_CELL_W = Math.floor(((LAYOUT_WIDTH - SHELL_H_PADDING * 2) * SAFETY_GRID_RATIO) / 2);
// every label reserves two lines, so a one-line label starts level with the
// first line of a two-line one
const SAFETY_LABEL_LINE = 16;
const SAFETY_LABEL_H = SAFETY_LABEL_LINE * 2;
// sits the tile just under the cell's top edge, so the glyph centres in the
// space above the label rather than behind it
const SAFETY_ART_TOP = 8;
// pale moonlit hairlines rather than gold, with a highlight raked across the
// panel's top edge so it catches the light from the scene above it
const SAFETY_BORDER = 'rgba(198, 219, 250, 0.42)';
const SAFETY_DIVIDER = 'rgba(198, 219, 250, 0.22)';
const SAFETY_PANEL_BG = 'rgba(9, 13, 38, 0.9)';
// the static fallbacks are the same sums the components read live, so a
// style that is never overridden still lays out to the same numbers
const FALLBACK_METRICS = onboardingMetricsFor(SCREEN_WIDTH);
const TOGETHER_BACKDROP_H = FALLBACK_METRICS.togetherBackdropHeight;
const READY_BACKDROP_H = FALLBACK_METRICS.readyBackdropHeight;
const READY_SPACER_H = FALLBACK_METRICS.readySpacerHeight;
const SAFE_SPACER_H = FALLBACK_METRICS.safeSpacerHeight;
const TOGETHER_SPACER_H = FALLBACK_METRICS.togetherSpacerHeight;
// gold hairline cards, matching the plates supplied with the ready artwork
const READY_CARD_BG = 'rgba(18, 26, 62, 0.82)';
const READY_CARD_BORDER = 'rgba(232, 184, 75, 0.5)';
const SAFE_BACKDROP_H = FALLBACK_METRICS.safeBackdropHeight;

export interface WorldTile {
  key: string;
  art: ImageSourcePropType;
}

export const WORLD_TILES: WorldTile[] = [
  { key: 'stories', art: require('@/assets/images/onboarding/world-stories.webp') },
  { key: 'music', art: require('@/assets/images/onboarding/world-music.webp') },
  { key: 'learning', art: require('@/assets/images/onboarding/world-learning.webp') },
  { key: 'feelings', art: require('@/assets/images/onboarding/world-feelings.webp') },
];

export interface WorldsPageProps {
  onSelectWorld?: (tile: WorldTile) => void;
}

export function WorldsPage({ onSelectWorld }: WorldsPageProps = {}) {
  const { t } = useTranslation();
  const { scaledFontSize } = useAccessibility();

  return (
    <View style={styles.pageContainer}>
      <View style={styles.tileGrid}>
        {WORLD_TILES.map((tile) => (
          <Pressable
            key={tile.key}
            testID={`world-tile-${tile.key}`}
            style={styles.tile}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelectWorld?.(tile);
            }}
            accessibilityRole="button"
            accessibilityLabel={t(`onboardingV2.worlds.${tile.key}`)}
          >
            <Image
              testID={`world-art-${tile.key}`}
              source={tile.art}
              style={styles.tileArt}
              resizeMode="cover"
            />
            <View style={styles.tileLabelRow} pointerEvents="none">
              <ThemedText style={[styles.tileLabel, { fontSize: scaledFontSize(19) }]}>
                {t(`onboardingV2.worlds.${tile.key}`)}
              </ThemedText>
            </View>
          </Pressable>
        ))}
      </View>

      <ThemedText style={[styles.footerNote, { fontSize: scaledFontSize(14) }]}>
        {t('onboardingV2.worlds.footer')}
      </ThemedText>
    </View>
  );
}

/** Bear waving from the bottom-left, rendered by the shell outside the scroll area. */
export function WorldsMascot() {
  return (
    <View style={styles.mascotWrap}>
      <Image
        testID="worlds-bear-mascot"
        source={require('@/assets/images/onboarding/bear-mascot.webp')}
        style={styles.mascotImage}
        resizeMode="contain"
      />
      <LinearGradient
        colors={['rgba(20, 26, 71, 0)', 'rgba(20, 26, 71, 0.6)', '#141A47']}
        locations={[0, 0.55, 1]}
        style={styles.mascotFade}
        pointerEvents="none"
      />
    </View>
  );
}

const TOGETHER_CHIPS: { key: string; art: ImageSourcePropType }[] = [
  { key: 'read', art: require('@/assets/images/onboarding/together-read.webp') },
  { key: 'play', art: require('@/assets/images/onboarding/together-play.webp') },
  { key: 'talk', art: require('@/assets/images/onboarding/together-talk.webp') },
];

/** Full-bleed art for the together page: the title sits over it and the chips
 *  overlap its lower edge, so it reads as the scene rather than a card. */
export function TogetherBackdrop() {
  const { layoutWidth, togetherBackdropHeight, isCapped } = useOnboardingMetrics();

  return (
    <View
      style={[
        styles.togetherBackdrop,
        { width: layoutWidth, height: togetherBackdropHeight },
        isCapped && styles.heroCapped,
      ]}
    >
      <Image
        testID="together-hero"
        source={require('@/assets/images/onboarding/together-hero.webp')}
        style={styles.togetherBackdropImage}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['#06081C', 'rgba(6, 8, 28, 0.55)', 'transparent']}
        locations={[0, 0.4, 1]}
        style={styles.backdropFadeTop}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', 'rgba(13, 18, 51, 0.55)', '#0D1233']}
        locations={[0, 0.6, 1]}
        style={styles.backdropFadeBottom}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['#090D27', 'rgba(9, 13, 39, 0.55)', 'transparent']}
        locations={[0, 0.4, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.backdropFadeLeft}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', 'rgba(9, 13, 39, 0.55)', '#090D27']}
        locations={[0, 0.6, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.backdropFadeRight}
        pointerEvents="none"
      />
    </View>
  );
}

export function TogetherPage() {
  const { t } = useTranslation();
  const { scaledFontSize } = useAccessibility();
  const { chipSize, togetherSpacerHeight } = useOnboardingMetrics();

  return (
    <View style={styles.pageContainer}>
      <View style={[styles.backdropSpacer, { height: togetherSpacerHeight }]} />

      <View style={styles.chipRow}>
        {TOGETHER_CHIPS.map((chip) => (
          <View
            key={chip.key}
            testID={`together-chip-${chip.key}`}
            style={[styles.chip, { width: chipSize }]}
          >
            <View
              style={[
                styles.chipArtFrame,
                { width: chipSize, height: chipSize, borderRadius: chipSize * 0.22 },
              ]}
            >
              <Image
                testID={`together-art-${chip.key}`}
                source={chip.art}
                style={[styles.chipArt, { width: chipSize + 10, height: chipSize + 10 }]}
                resizeMode="cover"
              />
            </View>
            <ThemedText style={[styles.chipLabel, { fontSize: scaledFontSize(13) }]}>
              {t(`onboardingV2.together.${chip.key}`)}
            </ThemedText>
          </View>
        ))}
      </View>

      <ThemedText style={[styles.togetherBody, { fontSize: scaledFontSize(15) }]}>
        {t('onboardingV2.together.body')}
      </ThemedText>
    </View>
  );
}

/** `nudgeX` corrects art whose glyph does not sit optically centred in its own
 *  frame; `labelNudgeX` does the same for the label. Positive values move
 *  right. */
const SAFETY_ITEMS: {
  key: string;
  art: ImageSourcePropType;
  nudgeX?: number;
  labelNudgeX?: number;
}[] = [
  { key: 'noAds', art: require('@/assets/images/onboarding/safe-no-ads.webp') },
  {
    key: 'noTracking',
    art: require('@/assets/images/onboarding/safe-no-tracking.webp'),
    nudgeX: 5,
    labelNudgeX: 3,
  },
  { key: 'noPressure', art: require('@/assets/images/onboarding/safe-no-streaks.webp') },
  { key: 'gentle', art: require('@/assets/images/onboarding/safe-gentle.webp') },
];

/** Full-bleed cloud art: the title sits over it and the promise tiles overlap
 *  its base, matching the together page. */
export function SafetyBackdrop() {
  const { layoutWidth, safeBackdropHeight } = useOnboardingMetrics();

  return (
    <View
      style={[styles.safeBackdrop, { width: layoutWidth, height: safeBackdropHeight }]}
    >
      {/* the art is cut out to the constellation itself, so it sits on the
          page's own sky -- no band, and nothing to fade at the edges */}
      <Image
        testID="safe-hero"
        source={require('@/assets/images/onboarding/safe-hero.webp')}
        style={styles.togetherBackdropImage}
        resizeMode="contain"
      />
    </View>
  );
}

export function SafetyPage() {
  const { t } = useTranslation();
  const { scaledFontSize } = useAccessibility();
  const { safeSpacerHeight, safetyCellHeight, safetyArtSize } = useOnboardingMetrics();

  return (
    <View style={styles.pageContainer}>
      <View style={[styles.safeBackdropSpacer, { height: safeSpacerHeight }]} />

      <View style={styles.safetyGrid}>
        {SAFETY_ITEMS.map((item, index) => (
          <View
            key={item.key}
            testID={`safety-item-${item.key}`}
            style={[
              styles.safetyCell,
              { height: safetyCellHeight },
              index % 2 === 0 && styles.safetyCellDividerRight,
              index < 2 && styles.safetyCellDividerBottom,
            ]}
          >
            <Image
              testID={`safety-art-${item.key}`}
              source={item.art}
              style={[
                styles.safetyArt,
                { width: safetyArtSize, height: safetyArtSize, borderRadius: Math.round(safetyArtSize * 0.25) },
                item.nudgeX ? { transform: [{ translateX: item.nudgeX }] } : null,
              ]}
              resizeMode="contain"
            />
            <LinearGradient
              colors={['transparent', 'rgba(6, 9, 26, 0.55)', 'rgba(6, 9, 26, 0.92)']}
              locations={[0, 0.55, 1]}
              style={styles.safetyLabelScrim}
              pointerEvents="none"
            />
            <ThemedText
              numberOfLines={2}
              style={[
                styles.safetyLabel,
                { fontSize: scaledFontSize(13) },
                item.labelNudgeX ? { transform: [{ translateX: item.labelNudgeX }] } : null,
              ]}
            >
              {t(`onboardingV2.safe.${item.key}`)}
            </ThemedText>
          </View>
        ))}

        <LinearGradient
          colors={['rgba(214, 231, 255, 0.22)', 'rgba(214, 231, 255, 0.06)', 'transparent']}
          locations={[0, 0.35, 1]}
          style={styles.safetyTopLight}
          pointerEvents="none"
        />
      </View>

      <ThemedText style={[styles.togetherBody, { fontSize: scaledFontSize(14) }]}>
        {t('onboardingV2.safe.body')}
      </ThemedText>
    </View>
  );
}

const READY_ITEMS: { key: string; art: ImageSourcePropType }[] = [
  { key: 'offline', art: require('@/assets/images/onboarding/ready-offline.webp') },
  { key: 'routines', art: require('@/assets/images/onboarding/ready-routines.webp') },
  { key: 'parent', art: require('@/assets/images/onboarding/ready-parent.webp') },
];

/** Full-bleed hero, same treatment as the together backdrop: the scene runs
 *  edge to edge behind the title and dissolves into the night sky. */
export function ReadyBackdrop() {
  const { layoutWidth, readyBackdropHeight, isCapped } = useOnboardingMetrics();

  return (
    <View
      style={[
        styles.readyBackdrop,
        { width: layoutWidth, height: readyBackdropHeight },
        isCapped && styles.heroCapped,
      ]}
    >
      <Image
        testID="ready-hero"
        source={require('@/assets/images/onboarding/ready-hero.webp')}
        style={styles.togetherBackdropImage}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['#06081C', 'rgba(6, 8, 28, 0.55)', 'transparent']}
        locations={[0, 0.4, 1]}
        style={styles.backdropFadeTop}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', 'rgba(13, 18, 51, 0.55)', '#0D1233']}
        locations={[0, 0.6, 1]}
        style={styles.backdropFadeBottom}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['#090D27', 'rgba(9, 13, 39, 0.55)', 'transparent']}
        locations={[0, 0.4, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.backdropFadeLeft}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', 'rgba(9, 13, 39, 0.55)', '#090D27']}
        locations={[0, 0.6, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.backdropFadeRight}
        pointerEvents="none"
      />
    </View>
  );
}

export function ReadyPage() {
  const { t } = useTranslation();
  const { scaledFontSize } = useAccessibility();
  const { readySpacerHeight, readyCardPadding, readyListGap } = useOnboardingMetrics();

  return (
    <View style={styles.pageContainer}>
      <View style={[styles.readyBackdropSpacer, { height: readySpacerHeight }]} />

      <View style={[styles.featureList, { gap: readyListGap }]}>
        {READY_ITEMS.map((item) => (
          <View
            key={item.key}
            testID={`ready-item-${item.key}`}
            style={[styles.featureCard, { paddingVertical: readyCardPadding }]}
          >
            <Image
              testID={`ready-art-${item.key}`}
              source={item.art}
              style={styles.featureIconTile}
              resizeMode="contain"
            />
            <View style={styles.featureTextBlock}>
              <ThemedText style={[styles.featureTitle, { fontSize: scaledFontSize(15) }]}>
                {t(`onboardingV2.ready.${item.key}Title`)}
              </ThemedText>
              <ThemedText style={[styles.featureDesc, { fontSize: scaledFontSize(13) }]}>
                {t(`onboardingV2.ready.${item.key}Desc`)}
              </ThemedText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export const AGE_RANGE_OPTIONS: { key: string; months: number; label: string }[] = [
  { key: '0-2', months: 18, label: '0 – 2' },
  { key: '2-4', months: 36, label: '2 – 4' },
  { key: '4-6', months: 60, label: '4 – 6' },
];

const AVATAR_HERO = 148;
const AVATAR_CHIP = 62;

interface SelectOption {
  key: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
}

/** Label over a tappable value row that expands its options in place. Used for
 *  the age range and language on the profile step. */
function SelectField({
  testID,
  label,
  value,
  open,
  onToggle,
  options,
  onChosen,
  scaledFontSize,
}: {
  testID: string;
  label: string;
  value: string;
  open: boolean;
  onToggle: () => void;
  options: SelectOption[];
  onChosen: () => void;
  scaledFontSize: (size: number) => number;
}) {
  return (
    <View style={styles.field}>
      <ThemedText style={[styles.fieldLabel, { fontSize: scaledFontSize(13) }]}>{label}</ThemedText>

      <Pressable
        testID={`${testID}-select`}
        style={[styles.select, open && styles.selectOpen]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggle();
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <ThemedText style={[styles.selectValue, { fontSize: scaledFontSize(16) }]}>
          {value}
        </ThemedText>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={scaledFontSize(18)} color={TEXT_MUTED} />
      </Pressable>

      {/* the options open as an overlay rather than inline: these fields sit low
          on the screen, and a fourteen-item list expanded in place runs off the
          bottom. Matches how the account screen presents language. */}
      {open && (
        <Pressable testID={`${testID}-dismiss`} style={styles.selectBackdrop} onPress={onChosen}>
          <Pressable style={styles.selectSheet}>
            <ThemedText style={[styles.selectSheetTitle, { fontSize: scaledFontSize(15) }]}>
              {label}
            </ThemedText>
            <ScrollView
              testID={`${testID}-options`}
              style={styles.selectList}
              contentContainerStyle={styles.selectListContent}
              showsVerticalScrollIndicator
            >
              {options.map((option) => (
                <Pressable
                  key={option.key}
                  testID={`${testID}-option-${option.key}`}
                  style={styles.selectOption}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    option.onSelect();
                    onChosen();
                  }}
                  accessibilityState={{ selected: option.selected }}
                >
                  <ThemedText style={[styles.selectOptionText, { fontSize: scaledFontSize(15) }]}>
                    {option.label}
                  </ThemedText>
                  {option.selected && (
                    <Ionicons name="checkmark" size={scaledFontSize(17)} color={GOLD} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      )}
    </View>
  );
}

export const AVATAR_OPTIONS: { key: string; art: ImageSourcePropType }[] = [
  { key: 'bear', art: require('@/assets/images/onboarding/avatar-bear.webp') },
  { key: 'rabbit', art: require('@/assets/images/onboarding/avatar-rabbit.webp') },
  { key: 'fox', art: require('@/assets/images/onboarding/avatar-fox.webp') },
  { key: 'dino', art: require('@/assets/images/onboarding/avatar-dino.webp') },
  { key: 'elephant', art: require('@/assets/images/onboarding/avatar-elephant.webp') },
];

export interface ProfilePageProps {
  nickname: string;
  onNicknameChange: (value: string) => void;
  avatarKey: string;
  onAvatarKeyChange: (value: string) => void;
  ageMonths: number;
  onAgeChange: (months: number) => void;
}

export function ProfilePage({
  nickname,
  onNicknameChange,
  avatarKey,
  onAvatarKeyChange,
  ageMonths,
  onAgeChange,
}: ProfilePageProps) {
  const { t, i18n } = useTranslation();
  const { scaledFontSize } = useAccessibility();
  const [openField, setOpenField] = useState<'age' | 'language' | null>(null);
  const language = i18n.language as SupportedLanguage;

  const index = Math.max(0, AVATAR_OPTIONS.findIndex((a) => a.key === avatarKey));
  const selected = AVATAR_OPTIONS[index];

  const step = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = (index + delta + AVATAR_OPTIONS.length) % AVATAR_OPTIONS.length;
    onAvatarKeyChange(AVATAR_OPTIONS[next].key);
  };

  return (
    <View style={styles.pageContainer}>
      <View style={styles.avatarStage}>
        <Pressable
          testID="avatar-prev"
          onPress={() => step(-1)}
          hitSlop={14}
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="chevron-back" size={scaledFontSize(30)} color="#FFFFFF" />
        </Pressable>

        <View style={styles.avatarHeroWrap}>
          <Image
            testID={`avatar-hero-${selected.key}`}
            source={selected.art}
            style={styles.avatarHero}
            resizeMode="contain"
          />
        </View>

        <Pressable testID="avatar-next" onPress={() => step(1)} hitSlop={14}>
          <Ionicons name="chevron-forward" size={scaledFontSize(30)} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={styles.avatarRow}>
        {AVATAR_OPTIONS.map((option) => (
          <Pressable
            key={option.key}
            testID={`avatar-option-${option.key}`}
            style={[styles.avatarOption, option.key === selected.key && styles.avatarOptionSelected]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onAvatarKeyChange(option.key);
            }}
            accessibilityState={{ selected: option.key === selected.key }}
          >
            <Image source={option.art} style={styles.avatarImage} resizeMode="contain" />
          </Pressable>
        ))}
      </View>

      <View style={styles.field}>
        <ThemedText style={[styles.fieldLabel, { fontSize: scaledFontSize(13) }]}>
          {t('onboardingV2.profile.nicknameLabel')}
        </ThemedText>
        <View style={styles.inputWrap}>
          <TextInput
            testID="profile-nickname-input"
            style={[styles.input, { fontSize: scaledFontSize(16) }]}
            value={nickname}
            onChangeText={onNicknameChange}
            placeholder={t('onboardingV2.profile.nicknamePlaceholder')}
            placeholderTextColor={TEXT_FAINT}
            maxLength={MAX_NICKNAME_LENGTH}
            autoCorrect={false}
          />
          {nickname.trim().length >= MIN_NICKNAME_LENGTH && (
            <Ionicons
              testID="profile-nickname-valid"
              name="checkmark"
              size={scaledFontSize(20)}
              color="#6FD08C"
              style={styles.inputCheck}
            />
          )}
        </View>
      </View>

      <SelectField
        testID="age"
        label={t('onboardingV2.profile.ageLabel')}
        value={(AGE_RANGE_OPTIONS.find((o) => o.months === ageMonths) ?? AGE_RANGE_OPTIONS[1]).label}
        open={openField === 'age'}
        onToggle={() => setOpenField(openField === 'age' ? null : 'age')}
        options={AGE_RANGE_OPTIONS.map((o) => ({
          key: o.key,
          label: o.label,
          selected: o.months === ageMonths,
          onSelect: () => onAgeChange(o.months),
        }))}
        onChosen={() => setOpenField(null)}
        scaledFontSize={scaledFontSize}
      />

      <SelectField
        testID="language"
        label={t('onboardingV2.profile.languageLabel')}
        value={SUPPORTED_LANGUAGES.find((l) => l.code === language)?.nativeName ?? 'English'}
        open={openField === 'language'}
        onToggle={() => setOpenField(openField === 'language' ? null : 'language')}
        options={SUPPORTED_LANGUAGES.map((l) => ({
          key: l.code,
          label: `${l.flag}  ${l.nativeName}`,
          selected: l.code === language,
          onSelect: () => setStoredLanguage(l.code),
        }))}
        onChosen={() => setOpenField(null)}
        scaledFontSize={scaledFontSize}
      />

      <ThemedText style={[styles.helperText, { fontSize: scaledFontSize(13) }]}>
        {t('onboardingV2.profile.helper')}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pageContainer: {
    alignSelf: 'stretch',
    gap: 12,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  tile: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 22,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  tileArt: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
  },
  tileLabelRow: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  tileLabel: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  mascotWrap: {
    width: 340,
    height: 486,
  },
  mascotImage: {
    width: '100%',
    height: '100%',
    opacity: 0.82,
  },
  mascotFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '46%',
  },
  footerNote: {
    color: TEXT_MUTED,
    marginTop: 150,
    marginLeft: 186,
  },
  safeBackdrop: {
    alignSelf: 'center',
    height: SAFE_BACKDROP_H,
    marginTop: SAFE_BACKDROP_TOP,
  },
  safeBackdropSpacer: {
    // clears the artwork plus a gap. The cut-out has transparent margin around
    // the constellation, so this reaches into it rather than clearing the box.
    height: SAFE_SPACER_H,
  },
  togetherBackdrop: {
    alignSelf: 'center',
    height: TOGETHER_BACKDROP_H,
    marginTop: TOGETHER_BACKDROP_TOP,
  },
  // once a hero no longer bleeds off the screen its side edges are visible.
  // The left and right fades were drawn to run off a phone's edge, so on a
  // capped layout the scene takes a corner instead and reads as an inset
  // illustration rather than a full-bleed one that has been cut short.
  heroCapped: {
    borderRadius: ONBOARDING_HERO_RADIUS,
    overflow: 'hidden',
  },
  togetherBackdropImage: {
    width: '100%',
    height: '100%',
  },
  backdropFadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '22%',
  },
  backdropFadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '22%',
  },
  // the band keeps crisp top and bottom edges; just enough of a gradient to
  // stop the cut reading as a hard seam
  safeFadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '10%',
  },
  safeFadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '10%',
  },
  backdropFadeLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '22%',
  },
  backdropFadeRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '22%',
  },
  // reserves the space the backdrop occupies so the chips land over its base
  backdropSpacer: {
    height: TOGETHER_SPACER_H,
  },
  heroWrap: {
    alignSelf: 'center',
    width: 299,
    height: 312,
    marginTop: 4,
    overflow: 'hidden',
  },
  heroWrapTablet: {
    width: 374,
    height: 392,
  },
  safeHeroWrap: {
    width: 196,
    height: 162,
  },
  safeHeroWrapTablet: {
    width: 260,
    height: 216,
  },
  togetherHero: {
    width: '100%',
    height: '100%',
  },
  heroFadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  heroFadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '38%',
  },
  heroFadeLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '30%',
  },
  heroFadeRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '30%',
  },
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: CHIP_GAP,
  },
  chip: {
    width: CHIP_SIZE,
    alignItems: 'center',
    gap: 8,
  },
  chipArtFrame: {
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: CHIP_SIZE * 0.22,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    overflow: 'hidden',
    backgroundColor: 'rgba(12, 16, 44, 0.6)',
  },
  chipArt: {
    // slight overscan: the frame's overflow clip shapes the corners, so no
    // sliver of frame background can show between artwork and border
    width: CHIP_SIZE + 10,
    height: CHIP_SIZE + 10,
    marginLeft: -5,
    marginTop: -5,
  },
  chipLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  togetherBody: {
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  safetyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: `${SAFETY_GRID_RATIO * 100}%`,
    alignSelf: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: SAFETY_BORDER,
    backgroundColor: SAFETY_PANEL_BG,
    overflow: 'hidden',
  },
  safetyCell: {
    width: '50%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
    // no horizontal padding here: the art is absolutely positioned and a
    // percentage width would resolve against the padded box, leaving a strip of
    // bare cell down the side. The label carries the inset instead.
    overflow: 'hidden',
  },
  safetyCellDividerRight: {
    borderRightWidth: 1,
    borderRightColor: SAFETY_DIVIDER,
  },
  safetyCellDividerBottom: {
    borderBottomWidth: 1,
    borderBottomColor: SAFETY_DIVIDER,
  },
  // width/height are explicit rather than derived from left/right/bottom insets:
  // with only insets, a remounted Image falls back to its intrinsic 420x420 and
  // anchors top-left, which put the cell's window on the artwork's empty corner
  // and made the glyph vanish when paging back to this screen.
  // the tile no longer reaches the cell's edges, so it takes a corner of its
  // own and reads as a chip rather than a square cut out of the panel. Its size
  // and corner come from the metrics, which shrink both with the cell.
  safetyArt: {
    position: 'absolute',
    alignSelf: 'center',
    top: SAFETY_ART_TOP,
  },
  // catches the light from the scene above: a highlight raked down from the
  // panel's top edge, over the cells
  safetyTopLight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 34,
  },
  // darkens the base of each cell so the label stays readable over the art
  safetyLabelScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '48%',
  },
  safetyLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
    lineHeight: SAFETY_LABEL_LINE,
    height: SAFETY_LABEL_H,
    textAlign: 'center',
    // narrow enough that the longer promises wrap onto their second line
    paddingHorizontal: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  shieldCircle: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232, 184, 75, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(232, 184, 75, 0.3)',
  },
  checkList: {
    gap: 2,
    borderRadius: 20,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingVertical: 6,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  checkLabel: {
    color: '#FFFFFF',
    flex: 1,
  },
  readyBackdrop: {
    alignSelf: 'center',
    height: READY_BACKDROP_H,
    marginTop: READY_BACKDROP_TOP,
  },
  // reserves the space the backdrop occupies so the feature cards land over its
  // base, the same overlap the together chips use
  readyBackdropSpacer: {
    height: READY_SPACER_H,
  },
  featureList: {
    gap: 12,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: 18,
    backgroundColor: READY_CARD_BG,
    borderWidth: 1,
    borderColor: READY_CARD_BORDER,
  },
  // the supplied tiles carry their own navy plate and rounded corner
  featureIconTile: {
    width: 52,
    height: 52,
  },
  featureTextBlock: {
    flex: 1,
    gap: 3,
  },
  featureTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  featureDesc: {
    color: TEXT_MUTED,
    lineHeight: 18,
  },
  avatarStage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  // the art is cut to the bare disc, so the ring is drawn here and is therefore
  // identical on every avatar rather than varying with each render's own frame
  avatarHeroWrap: {
    width: AVATAR_HERO,
    height: AVATAR_HERO,
    borderRadius: AVATAR_HERO / 2,
    borderWidth: 4,
    borderColor: GOLD,
    overflow: 'hidden',
    backgroundColor: NIGHT_BASE,
  },
  avatarHero: {
    width: '100%',
    height: '100%',
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  avatarOption: {
    width: AVATAR_CHIP,
    height: AVATAR_CHIP,
    borderRadius: AVATAR_CHIP / 2,
    borderWidth: 2,
    borderColor: 'rgba(232, 184, 75, 0.35)',
    overflow: 'hidden',
    backgroundColor: NIGHT_BASE,
  },
  avatarOptionSelected: {
    borderWidth: 3,
    borderColor: GOLD,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  inputWrap: {
    justifyContent: 'center',
  },
  inputCheck: {
    position: 'absolute',
    right: 14,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    color: TEXT_FAINT,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    color: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  selectOpen: {
    borderColor: GOLD,
  },
  selectValue: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // positioned relative to its own field, so it reaches up over the page and
  // stops just below it -- the shell paints its footer after the scroll area,
  // and anything extending past that gets clipped by it
  selectBackdrop: {
    position: 'absolute',
    top: -Math.round(SCREEN_HEIGHT * 0.62),
    bottom: -Math.round(SCREEN_HEIGHT * 0.05),
    left: -SHELL_H_PADDING,
    right: -SHELL_H_PADDING,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: 'rgba(4, 6, 20, 0.86)',
    zIndex: 50,
  },
  selectSheet: {
    alignSelf: 'stretch',
    borderRadius: 20,
    paddingVertical: 14,
    backgroundColor: '#111838',
    borderWidth: 1,
    borderColor: GOLD,
    maxHeight: SCREEN_HEIGHT * 0.44,
  },
  selectSheetTitle: {
    color: TEXT_MUTED,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  selectList: {
    flexGrow: 0,
  },
  selectListContent: {
    paddingBottom: 4,
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  selectOptionText: {
    color: '#FFFFFF',
  },
  helperText: {
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 19,
  },
});
