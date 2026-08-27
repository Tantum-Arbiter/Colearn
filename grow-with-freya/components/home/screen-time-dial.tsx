import React, { memo } from 'react';
import { Circle } from 'react-native-svg';
import { SCREEN_TIME_RING, ringDashOffset } from '@/constants/screen-time-ring';

export const DIAL_RADIUS = (SCREEN_TIME_RING.size - SCREEN_TIME_RING.strokeWidth) / 2;
const DIAL_CIRCUMFERENCE = 2 * Math.PI * DIAL_RADIUS;

export interface ScreenTimeDialProps {
  cx: number;
  cy: number;
  tint: string;
  progress: number;
  testID: string;
}

export const ScreenTimeDial = memo(function ScreenTimeDial({
  cx,
  cy,
  tint,
  progress,
  testID,
}: ScreenTimeDialProps) {
  return (
    <>
      <Circle
        testID={`${testID}-track`}
        cx={cx}
        cy={cy}
        r={DIAL_RADIUS}
        stroke={tint}
        strokeOpacity={SCREEN_TIME_RING.trackOpacity}
        strokeWidth={SCREEN_TIME_RING.strokeWidth}
        fill="none"
      />

      <Circle
        testID={`${testID}-arc`}
        cx={cx}
        cy={cy}
        r={DIAL_RADIUS}
        stroke={tint}
        strokeOpacity={SCREEN_TIME_RING.arcOpacity}
        strokeWidth={SCREEN_TIME_RING.strokeWidth}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${DIAL_CIRCUMFERENCE} ${DIAL_CIRCUMFERENCE}`}
        strokeDashoffset={ringDashOffset(progress, DIAL_CIRCUMFERENCE)}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    </>
  );
});
