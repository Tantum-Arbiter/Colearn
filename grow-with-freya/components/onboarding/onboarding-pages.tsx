import React from 'react';
import { View, StyleSheet, Pressable, TextInput, Image, ImageSourcePropType, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '../themed-text';
import { useAccessibility } from '@/hooks/use-accessibility';
import { GOLD, PURPLE, CARD_BG, CARD_BORDER, TEXT_MUTED, TEXT_FAINT, NIGHT_BASE } from './onboarding-theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHELL_H_PADDING = 24;
const CHIP_GAP = 10;
const CHIP_SIZE = Math.floor((SCREEN_WIDTH - SHELL_H_PADDING * 2 - CHIP_GAP * 2) / 3);
// the safety promises read as one panel of four quadrants, so the art is a small
// glyph inside each cell rather than a tile in its own right
// the promise art is a full starfield tile, sized to fill its quadrant
// the art is a starfield tile whose glyph fills ~66% of it, so the tile is
// sized to keep that glyph at roughly 61pt
// the tile claims nearly the whole cell: padding is trimmed to the minimum that
// still separates it from the gold dividers
// the art fills its whole cell, with the label sitting over it
const SAFETY_CELL_H = 128;
const SAFETY_GRID_RATIO = 0.86;
const SAFETY_CELL_W = Math.floor(((SCREEN_WIDTH - SHELL_H_PADDING * 2) * SAFETY_GRID_RATIO) / 2);
// every label reserves two lines, so a one-line label starts level with the
// first line of a two-line one
const SAFETY_LABEL_LINE = 16;
const SAFETY_LABEL_H = SAFETY_LABEL_LINE * 2;
// lifts the art so the glyph centres in the space above the label. Capped so
// the frame never grows taller than the cell is wide -- past that, cover would
// scale to the height and enlarge the glyph instead of just moving it.
const SAFETY_ART_LIFT = Math.max(0, Math.min(24, SAFETY_CELL_W - SAFETY_CELL_H));
// pale moonlit hairlines rather than gold, with a highlight raked across the
// panel's top edge so it catches the light from the scene above it
const SAFETY_BORDER = 'rgba(198, 219, 250, 0.42)';
const SAFETY_DIVIDER = 'rgba(198, 219, 250, 0.22)';
const SAFETY_PANEL_BG = 'rgba(9, 13, 38, 0.9)';
// the together art is 900x941; sizing the backdrop to that ratio means the full
// scene shows edge-to-edge with no crop
const TOGETHER_ART_RATIO = 941 / 900;
const TOGETHER_BACKDROP_H = Math.round(SCREEN_WIDTH * TOGETHER_ART_RATIO);
// safety art is 900x774; same full-bleed treatment as the together backdrop
// the ready hero is a 3:2 scene; sized to the content width it keeps that ratio
const READY_HERO_H = Math.round((SCREEN_WIDTH - SHELL_H_PADDING * 2) * (600 / 900));
// gold hairline cards, matching the plates supplied with the ready artwork
const READY_CARD_BG = 'rgba(18, 26, 62, 0.82)';
const READY_CARD_BORDER = 'rgba(232, 184, 75, 0.5)';
// the cut-out constellation is shown whole rather than cropped into a band
const SAFE_BACKDROP_H = Math.round(SCREEN_WIDTH * 0.62);
const SAFE_BACKDROP_TOP = 160;
// drops the scene down the screen so the headline has clear sky above it
const TOGETHER_BACKDROP_TOP = 128;

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
  return (
    <View style={styles.togetherBackdrop}>
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

  return (
    <View style={styles.pageContainer}>
      <View style={styles.backdropSpacer} />

      <View style={styles.chipRow}>
        {TOGETHER_CHIPS.map((chip) => (
          <View key={chip.key} testID={`together-chip-${chip.key}`} style={styles.chip}>
            <View style={styles.chipArtFrame}>
              <Image
                testID={`together-art-${chip.key}`}
                source={chip.art}
                style={styles.chipArt}
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
  return (
    <View style={styles.safeBackdrop}>
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

  return (
    <View style={styles.pageContainer}>
      <View style={styles.safeBackdropSpacer} />

      <View style={styles.safetyGrid}>
        {SAFETY_ITEMS.map((item, index) => (
          <View
            key={item.key}
            testID={`safety-item-${item.key}`}
            style={[
              styles.safetyCell,
              index % 2 === 0 && styles.safetyCellDividerRight,
              index < 2 && styles.safetyCellDividerBottom,
            ]}
          >
            <Image
              testID={`safety-art-${item.key}`}
              source={item.art}
              style={[
                styles.safetyArt,
                item.nudgeX ? { transform: [{ translateX: item.nudgeX }] } : null,
              ]}
              resizeMode="cover"
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
                { fontSize: scaledFontSize(12) },
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

export function ReadyPage() {
  const { t } = useTranslation();
  const { scaledFontSize } = useAccessibility();

  return (
    <View style={styles.pageContainer}>
      {/* same edge treatment as the together hero: the scene dissolves into the
          night sky rather than ending on a hard card edge */}
      <View style={styles.readyHeroWrap}>
        <Image
          testID="ready-hero"
          source={require('@/assets/images/onboarding/ready-hero.webp')}
          style={styles.readyHero}
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

      <View style={styles.featureList}>
        {READY_ITEMS.map((item) => (
          <View key={item.key} testID={`ready-item-${item.key}`} style={styles.featureCard}>
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
  const { t } = useTranslation();
  const { scaledFontSize } = useAccessibility();

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
            maxLength={20}
            autoCorrect={false}
          />
          {nickname.trim().length > 0 && (
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

      <View style={styles.field}>
        <ThemedText style={[styles.fieldLabel, { fontSize: scaledFontSize(13) }]}>
          {t('onboardingV2.profile.ageLabel')}
        </ThemedText>
        <View style={styles.ageRow}>
          {AGE_RANGE_OPTIONS.map((option) => {
            const selected = ageMonths === option.months;
            return (
              <Pressable
                key={option.key}
                testID={`age-option-${option.key}`}
                style={[styles.ageChip, selected && styles.ageChipSelected]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onAgeChange(option.months);
                }}
                accessibilityState={{ selected }}
              >
                <ThemedText
                  style={[
                    styles.ageChipText,
                    selected && styles.ageChipTextSelected,
                    { fontSize: scaledFontSize(15) },
                  ]}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

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
    width: SCREEN_WIDTH,
    height: SAFE_BACKDROP_H,
    marginTop: SAFE_BACKDROP_TOP,
  },
  safeBackdropSpacer: {
    // clears the artwork plus a gap. The cut-out has transparent margin around
    // the constellation, so this reaches into it rather than clearing the box.
    height: SAFE_BACKDROP_H + SAFE_BACKDROP_TOP - 197,
  },
  togetherBackdrop: {
    width: SCREEN_WIDTH,
    height: TOGETHER_BACKDROP_H,
    marginTop: TOGETHER_BACKDROP_TOP,
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
    height: TOGETHER_BACKDROP_H + TOGETHER_BACKDROP_TOP - 246,
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
    height: SAFETY_CELL_H,
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
  safetyArt: {
    position: 'absolute',
    left: 0,
    top: -SAFETY_ART_LIFT,
    width: '100%',
    height: SAFETY_CELL_H + SAFETY_ART_LIFT,
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
  readyHeroWrap: {
    alignSelf: 'center',
    width: '100%',
    height: READY_HERO_H,
  },
  readyHero: {
    width: '100%',
    height: '100%',
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
  ageRow: {
    flexDirection: 'row',
    gap: 10,
  },
  ageChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: CARD_BG,
    borderWidth: 1.5,
    borderColor: CARD_BORDER,
  },
  ageChipSelected: {
    backgroundColor: 'rgba(109, 93, 245, 0.22)',
    borderColor: PURPLE,
  },
  ageChipText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  ageChipTextSelected: {
    color: '#CFC7FF',
  },
  helperText: {
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 19,
  },
});
