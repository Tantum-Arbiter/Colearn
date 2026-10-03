import React, { memo, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { ISLAND_ART } from '@/constants/island-art';
import { ISLAND_TRAIL, TRAIL_DASH, trailDashes } from '@/constants/island-trail';
import type { IslandLayout } from '@/constants/island-scene';

export const TRAIL_LIT = '#FFE27A';
export const TRAIL_LIT_HALO = 'rgba(255, 226, 122, 0.38)';
export const TRAIL_PALE = 'rgba(255, 255, 255, 0.78)';

const DASH_WIDTH = 15;
const HALO_SPREAD = 10;

export interface PlanTrailProps {
  layout: IslandLayout;
  litLegs: number;
}

export const PlanTrail = memo(function PlanTrail({ layout, litLegs }: PlanTrailProps) {
  const dashes = useMemo(() => trailDashes(ISLAND_TRAIL, TRAIL_DASH), []);

  return (
    <Svg
      testID="plan-trail"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.trail, layout.picture]}
      viewBox={`0 0 ${ISLAND_ART.width} ${ISLAND_ART.height}`}
      preserveAspectRatio="none"
    >
      {dashes.map((dash, index) => {
        const lit = dash.leg < litLegs;
        const rotate = `rotate(${dash.angle} ${dash.x} ${dash.y})`;

        return (
          <React.Fragment key={index}>
            {lit ? (
              <Rect
                x={dash.x - (TRAIL_DASH.length + HALO_SPREAD) / 2}
                y={dash.y - (DASH_WIDTH + HALO_SPREAD) / 2}
                width={TRAIL_DASH.length + HALO_SPREAD}
                height={DASH_WIDTH + HALO_SPREAD}
                rx={(DASH_WIDTH + HALO_SPREAD) / 2}
                fill={TRAIL_LIT_HALO}
                transform={rotate}
              />
            ) : null}
            <Rect
              testID={`plan-dash-${index}`}
              x={dash.x - TRAIL_DASH.length / 2}
              y={dash.y - DASH_WIDTH / 2}
              width={TRAIL_DASH.length}
              height={DASH_WIDTH}
              rx={DASH_WIDTH / 2}
              fill={lit ? TRAIL_LIT : TRAIL_PALE}
              transform={rotate}
            />
          </React.Fragment>
        );
      })}
    </Svg>
  );
});

const styles = StyleSheet.create({
  trail: {
    position: 'absolute',
  },
});
