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
  pageLines: 3,
  pageLineWidth: 2,
  pageGap: 2,
  pageInset: 5,
} as const;

export function bookSpineWidth(width: number): number {
  return Math.round(Math.min(BOOK_FRAME.spineMax, Math.max(BOOK_FRAME.spineMin, width * BOOK_FRAME.spineRatio)));
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
export function BookPages({ testID = 'book-pages' }: { testID?: string }) {
  const pagesWidth = BOOK_FRAME.pageLines * BOOK_FRAME.pageLineWidth + (BOOK_FRAME.pageLines - 1) * BOOK_FRAME.pageGap;

  return (
    <View style={[styles.pages, { width: pagesWidth, right: BOOK_FRAME.pageInset }]} pointerEvents="none" testID={testID}>
      {Array.from({ length: BOOK_FRAME.pageLines }, (_, i) => (
        <View key={i} style={[styles.pageLine, { width: BOOK_FRAME.pageLineWidth, marginLeft: i === 0 ? 0 : BOOK_FRAME.pageGap }]} />
      ))}
    </View>
  );
}

/** The hinge shadow where the cover meets the spine; drawn over any cover. */
export function BookHinge() {
  return <LinearGradient colors={[...COVER_SHADE]} start={{ x: 0, y: 0.5 }} end={{ x: 0.35, y: 0.5 }} style={styles.hinge} pointerEvents="none" />;
}

export function BookFrame({ width, height, radius, spineColor = '#1D2657', children, style, testID = 'book-frame' }: BookFrameProps) {
  const spineWidth = bookSpineWidth(width);
  const coverWidth = width - spineWidth;

  return (
    <View style={[styles.book, { width, height, borderRadius: radius }, style]} testID={testID}>
      <View style={[styles.spine, { width: spineWidth, backgroundColor: spineColor, borderTopLeftRadius: radius, borderBottomLeftRadius: radius }]} testID={`${testID}-spine`}>
        <LinearGradient colors={[...SPINE_SHADE]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
      </View>

      <View style={[styles.cover, { width: coverWidth, borderTopRightRadius: radius, borderBottomRightRadius: radius }]} testID={`${testID}-cover`}>
        {children}
        <BookHinge />
        <BookPages testID={`${testID}-pages`} />
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
  pages: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    flexDirection: 'row',
  },
  pageLine: {
    height: '100%',
    backgroundColor: 'rgba(246, 239, 226, 0.8)',
    borderRadius: 1,
  },
});
