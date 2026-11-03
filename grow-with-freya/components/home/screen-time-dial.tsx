import React, { memo } from 'react';
import { Circle } from 'react-native-svg';
import { SCREEN_TIME_RING, ringDashOffset } from '@/constants/screen-time-ring';

export const DIAL_RADIUS = (SCREEN_TIME_RING.size - SCREEN_TIME_RING.strokeWidth) / 2;

export interface ScreenTimeDialProps {
  cx: number;
  cy: number;
  tint: string;
  progress: number;
  testID: string;
  /** Defaults to the home scene's dial; the nav bar draws a larger one. */
  radius?: number;
  strokeWidth?: number;
  /** The unspent part of the circle. Off where the dial is large enough that
   *  a full faint ring reads as something sitting behind the glyph. */
  showTrack?: boolean;
  /** How strongly the spent arc is drawn. Faint over the home sky; the bar
   *  draws it at full strength so it reads like the glyphs beside it. */
  arcOpacity?: number;
}

export const ScreenTimeDial = memo(function ScreenTimeDial({
  cx,
  cy,
  tint,
  progress,
  testID,
  radius = DIAL_RADIUS,
  strokeWidth = SCREEN_TIME_RING.strokeWidth,
  showTrack = true,
  arcOpacity = SCREEN_TIME_RING.arcOpacity,
}: ScreenTimeDialProps) {
  const circumference = 2 * Math.PI * radius;

  return (
    <>
      {showTrack ? (
      <Circle
        testID={`${testID}-track`}
        cx={cx}
        cy={cy}
        r={radius}
        stroke={tint}
        strokeOpacity={SCREEN_TIME_RING.trackOpacity}
        strokeWidth={strokeWidth}
        fill="none"
      />
      ) : null}

      <Circle
        testID={`${testID}-arc`}
        cx={cx}
        cy={cy}
        r={radius}
        stroke={tint}
        strokeOpacity={arcOpacity}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={ringDashOffset(progress, circumference)}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    </>
  );
});
