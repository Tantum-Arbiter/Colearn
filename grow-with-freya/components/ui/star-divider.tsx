/**
 * StarDivider
 *
 * A lit rule with a gold star at its centre, used to part one block of text
 * from the next inside a night-sky panel.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

const DIVIDER = require('@/assets/images/ui-elements/star-divider.webp');
const DIVIDER_ASPECT = 900 / 202;

interface StarDividerProps {
  /** Width as a fraction of the space the divider is given. */
  width?: `${number}%`;
  testID?: string;
}

export function StarDivider({ width = '86%', testID = 'star-divider' }: StarDividerProps) {
  return (
    <View style={styles.row} pointerEvents="none">
      <Image
        testID={testID}
        source={DIVIDER}
        style={[styles.rule, { width }]}
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    alignItems: 'center',
  },
  rule: {
    aspectRatio: DIVIDER_ASPECT,
  },
});
