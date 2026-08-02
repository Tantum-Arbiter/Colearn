import React from 'react';
import { View, StyleSheet, Pressable, TextInput, Image, ImageSourcePropType, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '../themed-text';
import { useAccessibility } from '@/hooks/use-accessibility';
import { GOLD, PURPLE, CARD_BG, CARD_BORDER, TEXT_MUTED, TEXT_FAINT, NIGHT_BASE } from './onboarding-theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SHELL_H_PADDING = 24;
const CHIP_GAP = 10;
const CHIP_SIZE = Math.floor((SCREEN_WIDTH - SHELL_H_PADDING * 2 - CHIP_GAP * 2) / 3);

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

export function TogetherPage() {
  const { t } = useTranslation();
  const { scaledFontSize, isTablet } = useAccessibility();

  return (
    <View style={styles.pageContainer}>
      <View style={[styles.heroWrap, isTablet ? styles.heroWrapTablet : null]}>
        <Image
          testID="together-hero"
          source={require('@/assets/images/onboarding/together-hero.webp')}
          style={styles.togetherHero}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['#070A1E', 'rgba(7, 10, 30, 0.55)', 'transparent']}
          locations={[0, 0.45, 1]}
          style={styles.heroFadeTop}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['transparent', 'rgba(13, 19, 56, 0.6)', '#0D1338']}
          locations={[0, 0.5, 1]}
          style={styles.heroFadeBottom}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['#0A0F2C', 'rgba(10, 15, 44, 0.5)', 'transparent']}
          locations={[0, 0.4, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.heroFadeLeft}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['transparent', 'rgba(10, 15, 44, 0.5)', '#0A0F2C']}
          locations={[0, 0.6, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.heroFadeRight}
          pointerEvents="none"
        />
      </View>

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

const SAFETY_ITEMS = ['noAds', 'noTracking', 'noPressure', 'gentle'];

export function SafetyPage() {
  const { t } = useTranslation();
  const { scaledFontSize } = useAccessibility();

  return (
    <View style={styles.pageContainer}>
      <View style={styles.shieldCircle}>
        <Ionicons name="shield-checkmark" size={scaledFontSize(40)} color={GOLD} />
      </View>

      <View style={styles.checkList}>
        {SAFETY_ITEMS.map((key) => (
          <View key={key} testID={`safety-item-${key}`} style={styles.checkRow}>
            <Ionicons name="checkmark-circle" size={scaledFontSize(20)} color={GOLD} />
            <ThemedText style={[styles.checkLabel, { fontSize: scaledFontSize(15) }]}>
              {t(`onboardingV2.safe.${key}`)}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const READY_ITEMS: { key: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'offline', icon: 'cloud-download-outline' },
  { key: 'routines', icon: 'moon-outline' },
  { key: 'parent', icon: 'lock-closed-outline' },
];

export function ReadyPage() {
  const { t } = useTranslation();
  const { scaledFontSize } = useAccessibility();

  return (
    <View style={styles.pageContainer}>
      <View style={styles.featureList}>
        {READY_ITEMS.map((item) => (
          <View key={item.key} testID={`ready-item-${item.key}`} style={styles.featureCard}>
            <View style={styles.featureIconCircle}>
              <Ionicons name={item.icon} size={scaledFontSize(20)} color={GOLD} />
            </View>
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

export interface ProfilePageProps {
  nickname: string;
  onNicknameChange: (value: string) => void;
  avatarType: 'boy' | 'girl';
  onAvatarTypeChange: (value: 'boy' | 'girl') => void;
  ageMonths: number;
  onAgeChange: (months: number) => void;
}

export function ProfilePage({
  nickname,
  onNicknameChange,
  avatarType,
  onAvatarTypeChange,
  ageMonths,
  onAgeChange,
}: ProfilePageProps) {
  const { t } = useTranslation();
  const { scaledFontSize } = useAccessibility();

  const avatarOptions: { type: 'girl' | 'boy'; source: ImageSourcePropType }[] = [
    { type: 'girl', source: require('@/assets/images/ui-elements/girl-avatar.webp') },
    { type: 'boy', source: require('@/assets/images/ui-elements/boy-avatar.webp') },
  ];

  return (
    <View style={styles.pageContainer}>
      <View style={styles.avatarRow}>
        {avatarOptions.map((option) => {
          const selected = avatarType === option.type;
          return (
            <Pressable
              key={option.type}
              testID={`avatar-option-${option.type}`}
              style={[styles.avatarOption, selected && styles.avatarOptionSelected]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onAvatarTypeChange(option.type);
              }}
              accessibilityState={{ selected }}
            >
              <Image source={option.source} style={styles.avatarImage} resizeMode="cover" />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.field}>
        <ThemedText style={[styles.fieldLabel, { fontSize: scaledFontSize(13) }]}>
          {t('onboardingV2.profile.nicknameLabel')}
        </ThemedText>
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
  togetherHero: {
    width: '100%',
    height: '100%',
  },
  heroFadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '18%',
  },
  heroFadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '16%',
  },
  heroFadeLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '12%',
  },
  heroFadeRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '12%',
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
    width: '100%',
    height: '100%',
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
  featureList: {
    gap: 12,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  featureIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232, 184, 75, 0.12)',
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
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  avatarOption: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
    backgroundColor: CARD_BG,
  },
  avatarOptionSelected: {
    borderColor: GOLD,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
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
