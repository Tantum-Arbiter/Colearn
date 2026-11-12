import React, { memo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { Fonts } from '@/constants/theme';

const RIM = ['#FFF6D6', '#F9D877', '#F3AA0C'] as const;
const FACE = ['#FFFDF6', '#FEF1CB', '#FDE8AE'] as const;
const INK = '#4F0E05';
const COVER = '#F2A818';
const COVER_EDGE = '#C27410';
const PAGE = '#FFFBEF';
const PAGE_LINE = '#E9C98C';

interface PagePillProps {
  page: number;
  total: number;
  height: number;
  fontSize: number;
  label: string;
  style?: StyleProp<ViewStyle>;
}

function BookGlyph({ size }: { size: number }) {
  return (
    <View testID="page-pill-book">
      <Svg width={size * 1.25} height={size} viewBox="0 0 30 24">
        <Path d="M1.5 4.5 Q8 2 15 5 Q22 2 28.5 4.5 L28.5 21.5 Q22 19 15 22.5 Q8 19 1.5 21.5 Z" fill={COVER} stroke={COVER_EDGE} strokeWidth={1.4} strokeLinejoin="round" />
        <Path d="M3.5 3 Q9 1 14.2 4 L14.2 20 Q9 17.4 3.5 19.2 Z" fill={PAGE} stroke={COVER_EDGE} strokeWidth={0.9} strokeLinejoin="round" />
        <Path d="M26.5 3 Q21 1 15.8 4 L15.8 20 Q21 17.4 26.5 19.2 Z" fill={PAGE} stroke={COVER_EDGE} strokeWidth={0.9} strokeLinejoin="round" />
        <Path d="M6 7 Q9 6 12 7.4 M6 10.5 Q9 9.5 12 10.9 M6 14 Q9 13 12 14.4 M18 7.4 Q21 6 24 7 M18 10.9 Q21 9.5 24 10.5 M18 14.4 Q21 13 24 14" stroke={PAGE_LINE} strokeWidth={1.1} strokeLinecap="round" fill="none" />
      </Svg>
    </View>
  );
}

export const PagePill = memo(function PagePill({ page, total, height, fontSize, label, style }: PagePillProps) {
  const rim = Math.max(2, Math.round(height * 0.08));
  const faceHeight = height - rim * 2;

  return (
    <View
      testID="page-indicator"
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
      style={[styles.pill, { height, borderRadius: height / 2 }, style]}
    >
      <LinearGradient colors={RIM} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: height / 2 }]} />
      <LinearGradient
        colors={FACE}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.face, { height: faceHeight, borderRadius: faceHeight / 2, marginHorizontal: rim, paddingHorizontal: Math.round(height * 0.32), gap: Math.round(height * 0.2) }]}
      >
        <BookGlyph size={Math.round(height * 0.5)} />
        <Text testID="page-pill-number" allowFontScaling={false} style={[styles.number, { fontSize }]}>
          {`${page} / ${total}`}
        </Text>
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  pill: {
    justifyContent: 'center',
    shadowColor: '#7A4A00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 3,
    elevation: 4,
  },
  face: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: INK,
    fontVariant: ['tabular-nums'],
  },
});
