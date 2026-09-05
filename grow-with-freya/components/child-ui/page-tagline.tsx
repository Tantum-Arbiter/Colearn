import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Path, Text as SvgText, TextPath } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { ACCENT_GOLD, TEXT_PRIMARY } from '@/constants/night-palette';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { SPACE_1 } from './tokens';

/**
 * How far the arch bends. The line rides a circle whose radius is a little
 * over the block's width, so the words lift at the middle and settle at the
 * ends -- the curve of a storybook title page, and of the planet the words
 * sit against.
 */
export const TAGLINE_ARCH_RADIUS_RATIO = 1.15;
const LINE_SIZE = { phone: 15, tablet: 19 } as const;
/** The second line rides a touch lower, so the two read as one block. */
const LINE_GAP = 1;
const STAR_SIZE = { phone: 12, tablet: 15 } as const;

let taglineCount = 0;

interface PageTaglineProps {
  /** The two lines, in reading order; each rides its own arch. */
  lines: readonly [string, string];
  /** The width the block is given, which sets how far the arch bends. */
  width: number;
  testID?: string;
}

interface ArchedLineProps {
  id: string;
  text: string;
  width: number;
  fontSize: number;
}

/**
 * One line of words following a shallow arc. The arc is drawn but never
 * painted: it is only the line the glyphs stand on.
 */
function ArchedLine({ id, text, width, fontSize }: ArchedLineProps) {
  const radius = width * TAGLINE_ARCH_RADIUS_RATIO;
  const half = width / 2;
  const rise = radius - Math.sqrt(Math.max(radius * radius - half * half, 0));
  // The crown of the arch carries the words, so the box need only be as tall
  // as a line of type; the ends of the arc fall away below it, unpainted
  const crownBaseline = fontSize;
  const height = Math.ceil(fontSize * 1.3);

  return (
    <Svg testID={`${id}-arc`} width={width} height={height}>
      <Defs>
        <Path id={id} d={`M 0 ${crownBaseline + rise} A ${radius} ${radius} 0 0 1 ${width} ${crownBaseline + rise}`} />
      </Defs>
      <SvgText
        fill={TEXT_PRIMARY}
        fontSize={fontSize}
        fontFamily={Fonts.rounded}
        fontWeight="600"
        textAnchor="middle"
      >
        <TextPath href={`#${id}`} startOffset="50%">
          {text}
        </TextPath>
      </SvgText>
    </Svg>
  );
}

/**
 * The line beneath the page title -- "A brighter world in every story" -- set
 * on two shallow arches in the app's own rounded face, with a small gold star
 * under it, the way a storybook closes a title page.
 */
export function PageTagline({ lines, width, testID = 'page-tagline' }: PageTaglineProps) {
  const { isTablet } = useAccessibility();
  const [uid] = useState(() => `page-tagline-${(taglineCount += 1)}`);
  const fontSize = isTablet ? LINE_SIZE.tablet : LINE_SIZE.phone;

  return (
    <View
      testID={testID}
      style={styles.block}
      pointerEvents="none"
      accessible
      accessibilityRole="text"
      accessibilityLabel={lines.join(' ')}
    >
      <ArchedLine id={`${uid}-1`} text={lines[0]} width={width} fontSize={fontSize} />
      <View style={{ marginTop: LINE_GAP }}>
        <ArchedLine id={`${uid}-2`} text={lines[1]} width={width} fontSize={fontSize} />
      </View>
      <Ionicons name="star" size={isTablet ? STAR_SIZE.tablet : STAR_SIZE.phone} color={ACCENT_GOLD} style={styles.star} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    alignItems: 'center',
  },
  star: {
    marginTop: SPACE_1 / 2,
  },
});
