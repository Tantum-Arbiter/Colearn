import React from 'react';
import { View, StyleSheet, Image, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '../themed-text';
import { AuthPillButton } from './auth-pill-button';
import { useAccessibility } from '@/hooks/use-accessibility';
import { Fonts } from '@/constants/theme';
import { GOLD, TEXT_MUTED } from '../onboarding/onboarding-theme';
import {
  CARD_PADDING,
  CARD_V_PADDING,
  CARD_RADIUS,
  CREAM,
  PANEL_BG,
  PANEL_BORDER,
  useAuthLayout,
  CARD_BLOCK_GAP,
} from './auth-theme';

const MISSING_KEYS = ['syncProgress', 'multiDevice', 'cloudBackup', 'personalised'] as const;

// the overlay takes 900ms to slide over the login screen, and its content is
// offscreen for most of that; the onboarding FadeInDown cascade starts as the
// sheet settles so nothing fades in unseen
const CASCADE_BASE_MS = 350;
const CASCADE_STEP_MS = 120;
const CASCADE_DURATION_MS = 450;

interface GuestInfoScreenProps {
  onContinue: () => void;
  onBack: () => void;
}

/**
 * Shown when a free-tier user chooses to carry on without an account: what
 * guest mode costs them, and how to unlock the rest. Deliberately sky-less --
 * it slides over the login screen's night sky, which stays put; only the card
 * travels. Follows the onboarding back-pill and entrance-cascade conventions.
 */
export function GuestInfoScreen({ onContinue, onBack }: GuestInfoScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { scaledFontSize } = useAccessibility();
  const { cardWidth, cardMaxHeight, isCapped } = useAuthLayout();

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack();
  };

  return (
    <View style={styles.screen}>
      {/* full-bleed story-art backdrop, the subscription page treatment */}
      <Image
        testID="guest-info-art"
        source={require('@/assets/images/ui-elements/story-art-strip-subscribe.webp')}
        style={styles.screenArt}
        resizeMode="cover"
      />
      <View style={styles.screenArtScrim} />

      <View
        style={[
          styles.card,
          isCapped && styles.cardCompact,
          {
            width: cardWidth,
            maxHeight: cardMaxHeight,
            marginTop: insets.top + 8,
            marginBottom: insets.bottom + 8,
          },
        ]}
        testID="guest-info-card"
      >
        <Animated.View
          entering={FadeInDown.delay(CASCADE_BASE_MS).duration(CASCADE_DURATION_MS)}
          style={styles.header}
        >
          <Image
            testID="guest-info-badge"
            source={require('@/assets/images/login/guest-avatar.webp')}
            style={styles.badge}
            resizeMode="contain"
          />
          <ThemedText style={[styles.title, { fontSize: scaledFontSize(28) }]}>
            {t('guestInfo.title')}
          </ThemedText>
          <ThemedText style={[styles.description, { fontSize: scaledFontSize(15) }]}>
            {t('guestInfo.description')}
          </ThemedText>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(CASCADE_BASE_MS + CASCADE_STEP_MS).duration(CASCADE_DURATION_MS)}
          style={styles.panel}
          testID="guest-info-missing"
        >
          <ThemedText style={[styles.panelTitle, { fontSize: scaledFontSize(16) }]}>
            {t('guestInfo.missingOutTitle')}
          </ThemedText>
          {MISSING_KEYS.map((key) => (
            <View key={key} style={styles.item} testID={`guest-info-missing-${key}`}>
              <Ionicons name="checkmark-circle-outline" size={scaledFontSize(17)} color={GOLD} />
              <ThemedText style={[styles.itemText, { fontSize: scaledFontSize(14) }]}>
                {t(`guestInfo.missing.${key}`)}
              </ThemedText>
            </View>
          ))}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(CASCADE_BASE_MS + CASCADE_STEP_MS * 2).duration(CASCADE_DURATION_MS)}
          style={styles.panel}
          testID="guest-info-subscription"
        >
          <ThemedText style={[styles.panelTitle, { fontSize: scaledFontSize(16) }]}>
            {t('guestInfo.subscriptionTitle')}
          </ThemedText>
          <ThemedText
            testID="guest-info-subscription-body"
            style={[styles.bodyText, { fontSize: scaledFontSize(14) }]}
          >
            {t('guestInfo.subscriptionDescription')}
          </ThemedText>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(CASCADE_BASE_MS + CASCADE_STEP_MS * 3).duration(CASCADE_DURATION_MS)}
          style={styles.buttonRow}
        >
          <Pressable
            testID="guest-info-back"
            style={styles.backButton}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="chevron-back" size={scaledFontSize(18)} color="#FFFFFF" />
            <ThemedText style={[styles.backText, { fontSize: scaledFontSize(15) }]}>
              {t('common.back')}
            </ThemedText>
          </Pressable>

          <AuthPillButton
            label={t('guestInfo.continueButton')}
            variant="guest"
            onPress={onContinue}
            testID="guest-info-continue"
            style={styles.continueButton}
            icon={
              <Image
                source={require('@/assets/images/login/guest-avatar.webp')}
                style={styles.buttonIcon}
                resizeMode="contain"
              />
            }
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // opaque night base so the page reads as its own sheet while it travels
  screen: {
    flex: 1,
    backgroundColor: '#0d0d2b',
    // the card hugs its content on a tablet, so the spare height goes above
    // and below it rather than all at the bottom. On a phone the card fills
    // the screen and there is no spare height for this to move.
    justifyContent: 'center',
  },
  screenArt: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
    opacity: 0.35,
  },
  screenArtScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 5, 20, 0.45)',
  },
  // translucent over the full-bleed art, matching the login card's weight
  card: {
    flex: 1,
    // same capped, centred panel as the login card behind it
    alignSelf: 'center',
    maxWidth: '100%',
    paddingHorizontal: CARD_PADDING,
    paddingVertical: CARD_V_PADDING,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    backgroundColor: 'rgba(10, 15, 44, 0.45)',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 5,
  },
  // On a phone the card fills the screen and `space-between` is what spaces
  // the four blocks -- none of them carries a margin of its own. On a tablet
  // that same rule deals the spare height out as ~150pt gaps, so the card
  // hugs its content instead and the blocks take a deliberate rhythm. The
  // sky centres what is left.
  cardCompact: {
    flex: 0,
    justifyContent: 'flex-start',
    gap: CARD_BLOCK_GAP,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    width: 72,
    height: 72,
  },
  title: {
    fontFamily: Fonts.serif,
    fontWeight: '700',
    textAlign: 'center',
    color: CREAM,
    lineHeight: 34,
    textShadowColor: 'rgba(232, 184, 75, 0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  description: {
    fontFamily: Fonts.rounded,
    textAlign: 'center',
    color: TEXT_MUTED,
    lineHeight: 21,
  },
  // matches the login screen's promise panel: a single gap for every line, with
  // explicit line heights so the rhythm is the same on both screens
  panel: {
    width: '100%',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    backgroundColor: PANEL_BG,
  },
  panelTitle: {
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: GOLD,
    lineHeight: 21,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // flex:1 lets the label share a row with its tick; the panel body must not
  // use it -- as a direct child of the column panel it would collapse to nothing
  itemText: {
    flex: 1,
    fontFamily: Fonts.rounded,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  bodyText: {
    fontFamily: Fonts.rounded,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  // the onboarding flow's back pill, so going back reads the same here as it
  // does between onboarding pages
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  backText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  continueButton: {
    flex: 1,
    width: 'auto',
  },
  buttonIcon: {
    width: 26,
    height: 26,
  },
});
