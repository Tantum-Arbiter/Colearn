import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Fonts } from '@/constants/theme';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export function getTimeOfDay(date: Date = new Date()): TimeOfDay {
  const hour = date.getHours();

  if (hour < 12) {
    return 'morning';
  }

  if (hour < 18) {
    return 'afternoon';
  }

  return 'evening';
}

export interface GardenGreetingProps {
  nickname: string | null;
  now?: Date;
}

export const GardenGreeting = memo(function GardenGreeting({ nickname, now }: GardenGreetingProps) {
  const { t } = useTranslation();
  const timeOfDay = getTimeOfDay(now);

  const greeting = nickname
    ? t(`storyGarden.greeting.${timeOfDay}Named`, { name: nickname })
    : t(`storyGarden.greeting.${timeOfDay}`);

  return (
    <View style={styles.container} testID="garden-greeting">
      <Text style={styles.greeting} testID="garden-greeting-line">
        {greeting}
      </Text>
      <Text style={styles.invitation} testID="garden-greeting-invitation">
        {t('storyGarden.invitation')}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  greeting: {
    fontFamily: Fonts.rounded,
    fontSize: 26,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  invitation: {
    fontFamily: Fonts.rounded,
    fontSize: 17,
    color: '#FFFFFF',
    opacity: 0.85,
  },
});
