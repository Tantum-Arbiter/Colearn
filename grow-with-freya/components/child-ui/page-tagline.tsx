import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Path, Text as SvgText, TextPath } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { ACCENT_GOLD, TEXT_PRIMARY } from '@/constants/night-palette';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { SPACE_1 } from './tokens';

/**
 * How far the arch bends. The line rides a circle whose radius is a multiple
 * of the block's width, so the words lift at the middle and settle at the
 * ends -- the curve of a storybook title page, and of the planet the words
 * sit against.
 *
 * Flatter than it first was. The ends of a steeper arc sit a long way below
 * its crown, and every point of that drop is height the block has to carry to
 * avoid cutting the words that ride there.
 */
export const TAGLINE_ARCH_RADIUS_RATIO = 2.2;

/** Room below the last baseline for descenders -- the y of "Everything". */
const DESCENDER_ROOM = 0.32;

/** How far the arch's ends drop below its crown, for a block of this width. */
export function taglineArchRise(width: number): number {
  const radius = width * TAGLINE_ARCH_RADIUS_RATIO;
  const half = width / 2;

  return radius - Math.sqrt(Math.max(radius * radius - half * half, 0));
}
const LINE_SIZE = { phone: 15, tablet: 19 } as const;
/** How far the second crown sits below the first, as a share of the type. */
const CROWN_TO_CROWN = 1.25;
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
  const rise = taglineArchRise(width);
  const crownBaseline = fontSize;
  // Tall enough to hold the whole arc, not just its crown. A short line sits
  // near the top and never notices; a long one reaches the ends, which fall
  // `rise` below -- and a box sized for one line of type cuts them off there.
  // "Everything you loved" was losing its E and its d to exactly that edge.
  const height = Math.ceil(crownBaseline + rise + fontSize * DESCENDER_ROOM);

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

/** What the second line's box has to be pulled up by to sit a line below. */
function crownGap(width: number, fontSize: number): number {
  const boxHeight = fontSize + taglineArchRise(width) + fontSize * DESCENDER_ROOM;

  return CROWN_TO_CROWN * fontSize - boxHeight;
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
      {/* The words ride the crown at the top of each box, so the arch's drop
          would otherwise sit between the lines as dead space. Pulled up, the
          second line nests under the first and the ends of one curve down
          beside the start of the other -- which is the shape of the block. */}
      <View style={{ marginTop: crownGap(width, fontSize) }}>
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
