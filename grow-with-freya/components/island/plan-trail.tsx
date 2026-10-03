import React, { memo, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, FeGaussianBlur, Filter, Path, Rect } from 'react-native-svg';
import { ISLAND_ART } from '@/constants/island-art';
import { ISLAND_TRAIL, ISLAND_TRAIL_VIA, TRAIL_DASH, trailDashes, type TrailDash } from '@/constants/island-trail';
import type { IslandLayout } from '@/constants/island-scene';

export const TRAIL_LIT = '#FFFBE0';
export const TRAIL_PALE = '#FEF9CD';
export const TRAIL_RIBBON = '#8EC5FF';
export const TRAIL_RIBBON_LIT = '#FFE08A';
export const TRAIL_GLINT_LIT = '#FFA81E';
export const TRAIL_GLINT_AHEAD = '#F8EFA8';
export const TRAIL_DASH_WIDTH = 8;

const RIBBON = { width: 24, blur: 6, opacity: 0.85 } as const;
const GLINT = { spread: 5, blur: 1.8, opacityLit: 1, opacityAhead: 0.85 } as const;

export interface PlanTrailProps {
  layout: IslandLayout;
  litLegs: number;
}

function capsule(x: number, y: number, length: number, width: number) {
  return { x: x - length / 2, y: y - width / 2, width: length, height: width, rx: width / 2 };
}

export function ribbonPath(points: readonly TrailDash[]): string {
  const [first, ...rest] = points;
  const after = rest.length > 0 ? rest : [first];

  return `M ${first.x} ${first.y}${after.map((point) => ` L ${point.x} ${point.y}`).join('')}`;
}

export const PlanTrail = memo(function PlanTrail({ layout, litLegs }: PlanTrailProps) {
  const dashes = useMemo(() => trailDashes(ISLAND_TRAIL, TRAIL_DASH, ISLAND_TRAIL_VIA), []);
  const legs = useMemo(() => {
    const byLeg = new Map<number, TrailDash[]>();
    dashes.forEach((dash) => byLeg.set(dash.leg, [...(byLeg.get(dash.leg) ?? []), dash]));
    return [...byLeg.entries()];
  }, [dashes]);

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
      <Defs>
        <Filter id="plan-trail-glow" x="-50%" y="-50%" width="200%" height="200%">
          <FeGaussianBlur stdDeviation={RIBBON.blur} />
        </Filter>
        <Filter id="plan-trail-glint" x="-100%" y="-100%" width="300%" height="300%">
          <FeGaussianBlur stdDeviation={GLINT.blur} />
        </Filter>
      </Defs>
      {legs.map(([leg, onLeg]) => (
        <Path
          key={`ribbon-${leg}`}
          testID={`plan-ribbon-${leg}`}
          d={ribbonPath(onLeg)}
          fill="none"
          stroke={leg < litLegs ? TRAIL_RIBBON_LIT : TRAIL_RIBBON}
          strokeWidth={RIBBON.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={RIBBON.opacity}
          filter="url(#plan-trail-glow)"
        />
      ))}
      {dashes.map((dash, index) => {
        const lit = dash.leg < litLegs;
        const rotate = `rotate(${dash.angle} ${dash.x} ${dash.y})`;

        return (
          <Rect
            key={`glint-${index}`}
            testID={`plan-glint-${index}`}
            {...capsule(dash.x, dash.y, TRAIL_DASH.length + GLINT.spread, TRAIL_DASH_WIDTH + GLINT.spread)}
            fill={lit ? TRAIL_GLINT_LIT : TRAIL_GLINT_AHEAD}
            opacity={lit ? GLINT.opacityLit : GLINT.opacityAhead}
            filter="url(#plan-trail-glint)"
            transform={rotate}
          />
        );
      })}
      {dashes.map((dash, index) => (
        <Rect
          key={`dash-${index}`}
          testID={`plan-dash-${index}`}
          {...capsule(dash.x, dash.y, TRAIL_DASH.length, TRAIL_DASH_WIDTH)}
          fill={dash.leg < litLegs ? TRAIL_LIT : TRAIL_PALE}
          transform={`rotate(${dash.angle} ${dash.x} ${dash.y})`}
        />
      ))}
    </Svg>
  );
});

const styles = StyleSheet.create({
  trail: {
    position: 'absolute',
  },
});
