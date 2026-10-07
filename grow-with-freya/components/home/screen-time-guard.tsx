import React, { memo } from 'react';
import { Image } from 'react-native';

const SHIELD_ART = require('../../assets/images/ui-elements/screensafe-shield.png');

export interface ScreenTimeGuardProps {
  size: number;
  colour: string;
  opacity: number;
  testID?: string;
}

/**
 * The Screensafe mark inside the ring: a shield holding a clock, the app's
 * own artwork rather than a drawn glyph, white on alpha so the ring can tint
 * it to its state.
 */
export const ScreenTimeGuard = memo(function ScreenTimeGuard({
  size,
  colour,
  opacity,
  testID = 'screen-time-guard',
}: ScreenTimeGuardProps) {
  return (
    <Image
      testID={`${testID}-glyph`}
      source={SHIELD_ART}
      style={{ width: size, height: size, tintColor: colour, opacity }}
      resizeMode="contain"
      fadeDuration={0}
    />
  );
});
