import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { ScreenTimeRing } from '@/components/home/screen-time-ring';

const RING_SIZE = 44;
const LIMIT = 3600;
const SOME_USED = 1200;

/**
 * The ring in both its states, drawn by the ring itself so the picture can
 * never drift from what the child sees: part-way through the day, and the
 * red orb it becomes once the time is up.
 */
export function ScreenTimeRingLegend({ testID = 'screen-time-ring-legend' }: { testID?: string }) {
  const { t } = useTranslation();
  const { scaledFontSize } = useAccessibility();

  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.item}>
        <ScreenTimeRing
          testID={`${testID}-remaining`}
          usageSeconds={SOME_USED}
          limitSeconds={LIMIT}
          size={RING_SIZE}
          backplate
        />
        <Text style={[styles.caption, { fontSize: scaledFontSize(12) }]}>
          {t('tutorial.mainMenu.screenTime.remainingCaption')}
        </Text>
      </View>
      <View style={styles.item}>
        <ScreenTimeRing
          testID={`${testID}-spent`}
          usageSeconds={LIMIT}
          limitSeconds={LIMIT}
          size={RING_SIZE}
          haloScale={1.4}
          backplate
        />
        <Text style={[styles.caption, { fontSize: scaledFontSize(12) }]}>
          {t('tutorial.mainMenu.screenTime.spentCaption')}
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
