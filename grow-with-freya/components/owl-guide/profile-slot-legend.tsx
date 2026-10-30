import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { ProfileNavAvatar } from '@/components/child-ui/profile-nav-avatar';

const SLOT_SIZE = 44;

/**
 * The profile slot in both its states, drawn by the slot itself so the
 * picture can never drift from what the family sees: the child's own face,
 * and the gold sign-in symbol it turns into while nobody is signed in.
 */
export function ProfileSlotLegend({ testID = 'profile-slot-legend' }: { testID?: string }) {
  const { t } = useTranslation();
  const { scaledFontSize } = useAccessibility();

  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.item}>
        <ProfileNavAvatar testID={`${testID}-profile`} selected={false} size={SLOT_SIZE} hold="avatar" />
        <Text style={[styles.caption, { fontSize: scaledFontSize(12) }]}>
          {t('tutorial.catalogue.navProfile.profileCaption')}
        </Text>
      </View>
      <View style={styles.item}>
        <ProfileNavAvatar testID={`${testID}-login`} selected={false} size={SLOT_SIZE} hold="login" />
        <Text style={[styles.caption, { fontSize: scaledFontSize(12) }]}>
          {t('tutorial.catalogue.navProfile.loginCaption')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 36,
    marginTop: 12,
    marginBottom: 4,
  },
  item: {
    alignItems: 'center',
    gap: 8,
    minWidth: 72,
  },
  caption: {
    fontFamily: Fonts.rounded,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.78)',
  },
});
