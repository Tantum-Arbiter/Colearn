import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { UNLOCK_PLAN } from '@/constants/unlock-plan';

export interface UnlockPlanButtonProps {
  onPress: () => void;
  testID?: string;
}

export const UnlockPlanButton = memo(function UnlockPlanButton({
  onPress,
  testID = 'unlock-plan-button',
}: UnlockPlanButtonProps) {
  const { t } = useTranslation();
  const label = t('subscription.startFreeTrial');

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={styles.root}
    >
      <View style={styles.lip} />

      <LinearGradient
        colors={[UNLOCK_PLAN.face, UNLOCK_PLAN.faceLow]}
        style={styles.face}
      >
        <Text style={styles.label}>{label}</Text>
        <Ionicons
          name="lock-closed"
          size={UNLOCK_PLAN.iconSize}
          color={UNLOCK_PLAN.ink}
          style={styles.icon}
        />
      </LinearGradient>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  root: {
    alignSelf: 'center',
  },
  lip: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: UNLOCK_PLAN.lipHeight,
    height: UNLOCK_PLAN.height,
    borderRadius: UNLOCK_PLAN.height / 2,
    backgroundColor: UNLOCK_PLAN.lip,
  },
  face: {
    flexDirection: 'row',
    alignItems: 'center',
    height: UNLOCK_PLAN.height,
    paddingHorizontal: UNLOCK_PLAN.paddingHorizontal,
    borderRadius: UNLOCK_PLAN.height / 2,
  },
  label: {
    fontFamily: Fonts.rounded,
    fontSize: UNLOCK_PLAN.fontSize,
    fontWeight: '700',
    color: UNLOCK_PLAN.ink,
  },
  icon: {
    marginLeft: 8,
  },
});
