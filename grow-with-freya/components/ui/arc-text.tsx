/**
 * ArcText
 *
 * A single line of text bowed gently upwards, as on a storybook cover. Drawn with
 * an SVG text path rather than per-character offsets so kerning survives.
 *
 * Do not pass a platform font alias such as `ui-rounded` as `fontFamily`: the SVG
 * text layer cannot resolve it, and it then measures the line in one face while
 * drawing it in another, which throws `textAnchor="middle"` off centre.
 *
 * `curve` is the sagitta -- how far the middle of the line rises above its ends --
 * as a fraction of the line's own length, not of the container. The reference
 * artwork measures around 0.016; at the sizes this app renders at that reads as flat,
 * so the default is a touch deeper. Past about 0.07 the ends start to look like they
 * are falling off the panel.
 *
 * Curving relative to the text matters: the path spans the whole container, so a
 * short line centred on a wide one would otherwise sit on its flattest stretch and
 * come out looking straight.
 */

import React, { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Path, Text as SvgText, TextPath } from 'react-native-svg';

export const DEFAULT_ARC_CURVE = 0.035;

/** Fractions of the font size, sized so glyphs never clip at either extreme. */
const ASCENT_RATIO = 0.86;
const DESCENT_RATIO = 0.28;
/** Rough average glyph advance as a fraction of the font size, used to guess the line's length. */
const CHAR_ADVANCE_RATIO = 0.52;

export interface ArcTextProps {
  children: string;
  /** Width the line is laid out across. */
  width: number;
  fontSize: number;
  color: string;
  fontWeight?: string;
  fontFamily?: string;
  /** Sagitta as a fraction of width. 0 draws a straight line. */
  curve?: number;
  testID?: string;
}

/**
 * Radius that bows a line of `textLength` by `curve` of its own length.
 * From sagitta = length^2 / (8 * radius).
 */
export function estimateArcTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * CHAR_ADVANCE_RATIO;
}

export function arcRadiusForText(textLength: number, curve: number): number {
  if (curve <= 0 || textLength <= 0) return 0;
  return textLength / (8 * curve);
}

/**
 * Where a decoration sitting `distance` to the side of the line's middle has to go to
 * stay on the same curve: how far it drops, and the tilt of the curve under it.
 */
export function arcPointAt(distance: number, radius: number): { drop: number; angle: number } {
  if (radius <= 0 || distance <= 0) return { drop: 0, angle: 0 };
  const reach = Math.min(distance, radius);
  return {
    drop: radius - Math.sqrt(radius * radius - reach * reach),
    angle: (Math.asin(reach / radius) * 180) / Math.PI,
  };
}

/** How far the middle of a chord of `span` rises above its ends on a circle of `radius`. */
export function arcRise(span: number, radius: number): number {
  if (radius <= 0) return 0;
  const half = span / 2;
  if (half >= radius) return radius;
  return radius - Math.sqrt(radius * radius - half * half);
}

export function ArcText({
  children,
  width,
  fontSize,
  color,
  fontWeight = '800',
  fontFamily,
  curve = DEFAULT_ARC_CURVE,
  testID,
}: ArcTextProps) {
  const pathId = `arc-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const textLength = Math.min(estimateArcTextWidth(children, fontSize), width);
  const radius = arcRadiusForText(textLength, curve);
  const ascent = fontSize * ASCENT_RATIO;

  // The path spans the whole width but only its middle carries glyphs, so the box is
  // sized from the text's own rise and the baseline is dropped by the container's --
  // that lands the highest point of the text exactly one ascent below the top.
  const height = ascent + arcRise(textLength, radius) + fontSize * DESCENT_RATIO;
  const baseline = ascent + arcRise(width, radius);

  const path = radius > 0
    ? `M 0 ${baseline} A ${radius} ${radius} 0 0 1 ${width} ${baseline}`
    : `M 0 ${baseline} L ${width} ${baseline}`;

  return (
    <View style={[styles.container, { width, height }]} testID={testID}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <Path id={pathId} d={path} />
        </Defs>
        <SvgText
          fill={color}
          fontSize={fontSize}
          fontWeight={fontWeight}
          fontFamily={fontFamily}
          textAnchor="middle"
        >
          <TextPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
            {children}
          </TextPath>
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
