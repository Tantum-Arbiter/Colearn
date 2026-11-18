import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Dresses a cover as a book on a shelf: a spine down the left edge, the
 * block of pages showing along the right, and a shadow that lifts it off the
 * shelf. The cover keeps square corners against the spine and rounded ones
 * at the fore-edge, the way a real hardback does.
 */
export const BOOK_FRAME = {
  spineRatio: 0.075,
  spineMin: 8,
  spineMax: 22,
  rimRatio: 0.014,
  rimMin: 2,
  rimMax: 5,
  pagesRatio: 0.032,
  pagesMin: 4,
  pagesMax: 10,
  leafLines: 2,
  leafLineWidth: 1,
  lipWidth: 1,
} as const;

export function bookSpineWidth(width: number): number {
  return Math.round(Math.min(BOOK_FRAME.spineMax, Math.max(BOOK_FRAME.spineMin, width * BOOK_FRAME.spineRatio)));
}

export interface BookPageCurve {
  inset: number;
  corner: number;
}

export interface BookPagesGeometry {
  rim: number;
  block: number;
  corner: number;
  leaves: BookPageCurve[];
  lip: BookPageCurve;
}

function clampRound(value: number, min: number, max: number): number {
  return Math.round(Math.min(max, Math.max(min, value)));
}

export function bookPagesGeometry(width: number, radius: number): BookPagesGeometry {
  const rim = clampRound(width * BOOK_FRAME.rimRatio, BOOK_FRAME.rimMin, BOOK_FRAME.rimMax);
  const block = clampRound(width * BOOK_FRAME.pagesRatio, BOOK_FRAME.pagesMin, BOOK_FRAME.pagesMax);
  const curve = (inset: number): BookPageCurve => ({ inset, corner: Math.max(0, radius - inset) });

  return {
    rim,
    block,
    corner: Math.max(0, radius - rim),
    leaves: Array.from({ length: BOOK_FRAME.leafLines }, (_, i) => curve(rim + (block * (i + 1)) / (BOOK_FRAME.leafLines + 1))),
    lip: curve(rim + block),
  };
}

export interface BookFrameProps {
  width: number;
  height: number;
  radius: number;
  /** Deepest colour of the spine; the highlight is drawn over it. */
  spineColor?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const SPINE_SHADE = ['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.02)', 'rgba(0,0,0,0.28)'] as const;
const COVER_SHADE = ['rgba(0,0,0,0.22)', 'rgba(0,0,0,0)'] as const;

/** The block of pages showing at the fore-edge; drawn over any cover. */
export const BOOK_BOARD_COLOR = '#1D2657';

export interface BookPagesProps {
  width: number;
  radius: number;
  scale?: number;
  boardColor?: string;
  testID?: string;
}

export function BookPages({ width, radius, scale = 1, boardColor = BOOK_BOARD_COLOR, testID = 'book-pages' }: BookPagesProps) {
  const { rim, block, corner, leaves, lip } = bookPagesGeometry(width * scale, radius);
  const frame = scale === 1 ? styles.pagesFrame : [styles.pagesFrame, { width: `${scale * 100}%` as const, height: `${scale * 100}%` as const, transform: [{ scale: 1 / scale }], transformOrigin: 'left top' as const }];
  const curved = ({ inset, corner: turn }: BookPageCurve) => ({ top: inset, bottom: inset, right: inset, borderTopRightRadius: turn, borderBottomRightRadius: turn });

  return (
    <View style={frame} pointerEvents="none" testID={testID}>
      <View testID={`${testID}-board`} style={[styles.pageEdge, curved({ inset: 0, corner: radius }), { borderRightWidth: rim, borderColor: boardColor }]} />
      <View testID={`${testID}-block`} style={[styles.pageEdge, styles.paper, curved({ inset: rim, corner }), { borderRightWidth: block }]} />
      {leaves.map((leaf, i) => (
        <View key={i} testID={`${testID}-leaf`} style={[styles.pageEdge, styles.leaf, curved(leaf), { borderRightWidth: BOOK_FRAME.leafLineWidth }]} />
      ))}
      <View testID={`${testID}-lip`} style={[styles.pageEdge, styles.lip, curved(lip), { borderRightWidth: BOOK_FRAME.lipWidth }]} />
    </View>
  );
}

/** The light down the spine: a highlight at its ridge, shade where it meets the cover. */
export function BookSpineShade() {
  return <LinearGradient colors={[...SPINE_SHADE]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} pointerEvents="none" />;
}

/** The hinge shadow where the cover meets the spine; drawn over any cover. */
export function BookHinge() {
  return <LinearGradient colors={[...COVER_SHADE]} start={{ x: 0, y: 0.5 }} end={{ x: 0.35, y: 0.5 }} style={styles.hinge} pointerEvents="none" />;
}

export function BookFrame({ width, height, radius, spineColor = BOOK_BOARD_COLOR, children, style, testID = 'book-frame' }: BookFrameProps) {
  const spineWidth = bookSpineWidth(width);
  const coverWidth = width - spineWidth;

  return (
    <View style={[styles.book, { width, height, borderRadius: radius }, style]} testID={testID}>
      <View style={[styles.spine, { width: spineWidth, backgroundColor: spineColor, borderTopLeftRadius: radius, borderBottomLeftRadius: radius }]} testID={`${testID}-spine`}>
        <BookSpineShade />
      </View>

      <View style={[styles.cover, { width: coverWidth, borderTopRightRadius: radius, borderBottomRightRadius: radius }]} testID={`${testID}-cover`}>
        {children}
        <BookHinge />
        <BookPages width={width} radius={radius} boardColor={spineColor} testID={`${testID}-pages`} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  book: {
    flexDirection: 'row',
    overflow: 'visible',
    shadowColor: '#04091F',
    shadowOffset: { width: 4, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  spine: {
    height: '100%',
    overflow: 'hidden',
  },
  cover: {
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#141C4A',
  },
  hinge: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '18%',
  },
  pagesFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  pageEdge: {
    position: 'absolute',
    left: '50%',
  },
  paper: {
    borderColor: 'rgba(246, 239, 226, 0.94)',
  },
  leaf: {
    borderColor: 'rgba(120, 96, 60, 0.45)',
  },
  lip: {
    borderColor: 'rgba(4, 9, 31, 0.38)',
  },
});
