import React, { memo } from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';

const GRID = 24;
const SHIELD =
  'M 12 2.6 C 10.1 4.3 7.3 5.4 4.4 5.6 C 3.8 5.65 3.4 6.1 3.4 6.7 ' +
  'L 3.4 11.4 C 3.4 16.4 6.9 20.1 12 21.8 C 17.1 20.1 20.6 16.4 20.6 11.4 ' +
  'L 20.6 6.7 C 20.6 6.1 20.2 5.65 19.6 5.6 C 16.7 5.4 13.9 4.3 12 2.6 Z';
const TICKS =
  'M 12 7.0 L 12 7.9 M 16.4 11.2 L 15.5 11.2 M 12 15.4 L 12 14.5 M 7.6 11.2 L 8.5 11.2';
const HANDS = 'M 12 11.2 L 12 8.6 M 12 11.2 L 14.3 13.1';

export interface ScreenTimeGuardProps {
  size: number;
  colour: string;
  opacity: number;
  testID?: string;
}

export const ScreenTimeGuard = memo(function ScreenTimeGuard({
  size,
  colour,
  opacity,
  testID = 'screen-time-guard',
}: ScreenTimeGuardProps) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${GRID} ${GRID}`} testID={`${testID}-glyph`}>
      <G
        stroke={colour}
        strokeOpacity={opacity}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <Path d={SHIELD} />
        <Circle cx={12} cy={11.2} r={4.9} />
        <Path d={TICKS} />
        <Path d={HANDS} />
      </G>
    </Svg>
  );
});
