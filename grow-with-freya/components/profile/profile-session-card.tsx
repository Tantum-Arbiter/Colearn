import React, { type RefObject } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ACCENT_GOLD, TEXT_SECONDARY } from '@/constants/night-palette';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { SPACE_2, SPACE_4 } from '@/components/child-ui/tokens';
import { GoldButton } from '@/components/child-ui/gold-button';

const CTA_SHARE = 0.72;
export const PROFILE_CTA_MAX_WIDTH = 300;

interface ProfileSessionCardProps {
  needsSignIn: boolean;
  width: number;
  onLogin: () => void;
  /** The tour points at the sign-in button from here. */
  guideRef?: RefObject<View | null>;
}

/**
 * Where signing in lives. Whoever needs to sign in gets one gold Login button under the name,
 * in the gold of the sign-in symbol the profile slot turns into, and nothing
 * else to read; a signed-in family sees a quiet line saying so. Signing out lives on Grown-ups.
 */
export function ProfileSessionCard({ needsSignIn, width, onLogin, guideRef }: ProfileSessionCardProps) {
  const { t } = useTranslation();
  const { scaledFontSize } = useAccessibility();

  if (!needsSignIn) {
    return (
      <View testID="profile-session-card" style={styles.signedIn}>
        <Ionicons name="checkmark-circle" size={16} color={ACCENT_GOLD} />
        <Text style={[styles.signedInText, { fontSize: scaledFontSize(13) }]}>{t('profile.signedIn')}</Text>
      </View>
    );
  }

  return (
    <View testID="profile-session-card" style={[styles.card, { width: Math.min(Math.round(width * CTA_SHARE), PROFILE_CTA_MAX_WIDTH) }]}>
      <View ref={guideRef} collapsable={false}>
        <GoldButton testID="profile-session" label={t('common.login')} icon="log-in-outline" onPress={onLogin} style={styles.cta} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'center',
    marginBottom: SPACE_4,
  },
  cta: {
    alignSelf: 'stretch',
  },
  signedIn: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE_2,
    marginBottom: SPACE_4,
  },
  signedInText: {
    color: TEXT_SECONDARY,
    fontFamily: Fonts.rounded,
    fontWeight: '600',
  },
});
