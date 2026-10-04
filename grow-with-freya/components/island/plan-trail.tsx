import React, { memo, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { TABLET_ISLAND, type IslandMap } from '@/constants/island-map';
import { trailDashes, type TrailDash } from '@/constants/island-trail';
import type { IslandLayout } from '@/constants/island-scene';

export const TRAIL_LIT = '#FFFBE0';
export const TRAIL_PALE = '#FEF9CD';
export const TRAIL_RIBBON = '#8EC5FF';
export const TRAIL_RIBBON_LIT = '#FFE08A';
export const TRAIL_GLINT_LIT = '#FFA81E';
export const TRAIL_GLINT_AHEAD = '#F8EFA8';
export const TRAIL_DASH_WIDTH = 8;

const RIBBON_LAYERS = [
  { width: 50, opacity: 0.1 },
  { width: 43, opacity: 0.11 },
  { width: 36, opacity: 0.12 },
  { width: 30, opacity: 0.13 },
  { width: 25, opacity: 0.14 },
  { width: 20, opacity: 0.15 },
] as const;
const GLINT_LAYERS = [
  { spread: 10, opacity: 0.32 },
  { spread: 5, opacity: 0.78 },
] as const;
const GLINT_AHEAD = 0.85;

export interface PlanTrailProps {
  map?: IslandMap;
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

export const PlanTrail = memo(function PlanTrail({ map = TABLET_ISLAND, layout, litLegs }: PlanTrailProps) {
  const dashes = useMemo(() => trailDashes(map.trail, map.dash, map.via), [map]);
  const scale = map.trailScale;
  const dashWidth = TRAIL_DASH_WIDTH * scale;
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
      viewBox={`0 0 ${map.art.width} ${map.art.height}`}
      preserveAspectRatio="none"
    >
      {legs.flatMap(([leg, onLeg]) =>
        RIBBON_LAYERS.map((layer, index) => (
          <Path
            key={`ribbon-${leg}-${index}`}
            testID={`plan-ribbon-${leg}-${index}`}
            d={ribbonPath(onLeg)}
            fill="none"
            stroke={leg < litLegs ? TRAIL_RIBBON_LIT : TRAIL_RIBBON}
            strokeWidth={layer.width * scale}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={layer.opacity}
          />
        ))
      )}
      {dashes.flatMap((dash, index) => {
        const lit = dash.leg < litLegs;
        const rotate = `rotate(${dash.angle} ${dash.x} ${dash.y})`;

        return GLINT_LAYERS.map((layer, layerIndex) => (
          <Rect
            key={`glint-${index}-${layerIndex}`}
            testID={`plan-glint-${index}-${layerIndex}`}
            {...capsule(dash.x, dash.y, map.dash.length + layer.spread * scale, dashWidth + layer.spread * scale)}
            fill={lit ? TRAIL_GLINT_LIT : TRAIL_GLINT_AHEAD}
            opacity={lit ? layer.opacity : layer.opacity * GLINT_AHEAD}
            transform={rotate}
          />
        ));
      })}
      {dashes.map((dash, index) => (
        <Rect
          key={`dash-${index}`}
          testID={`plan-dash-${index}`}
          {...capsule(dash.x, dash.y, map.dash.length, dashWidth)}
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
