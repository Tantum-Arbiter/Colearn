import React, { memo, useCallback, useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Image, type ImageSource } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';

export type MenuIcon = 'page-preview' | 'font-size' | 'language' | 'compare' | 'tips' | 'auto-play' | 'instrument';

export interface ReaderMenuRow {
  key: string;
  icon: MenuIcon;
  label: string;
  onPress: () => void;
  testID?: string;
}

export const MENU_PANEL = {
  width: 920,
  height: 390,
  top: 174,
  bottom: 204,
  tipX: 918,
  tipY: 31,
  content: { left: 51, top: 100, right: 869, bottom: 257 },
} as const;

export const MENU_WIDTH = 276;
export const MENU_FADE_MS = 140;
export const MENU_INK = '#5A1F4A';
const SCREEN_EDGE = 2;
const SLICE_OVERLAP = 1;
const TIP_GAP = 2;
const DIVIDER = 'rgba(214, 160, 90, 0.35)';
const TILE_FACE = '#FCE6CC';
const TILE_EDGE = '#F6D2A6';
const GLYPH = '#D9661B';

const PANEL: Record<'top' | 'middle' | 'bottom', ImageSource> = {
  top: require('@/assets/images/reader-menu/panel-top.webp'),
  middle: require('@/assets/images/reader-menu/panel-middle.webp'),
  bottom: require('@/assets/images/reader-menu/panel-bottom.webp'),
};
const ICONS: Partial<Record<MenuIcon, ImageSource>> = {
  'page-preview': require('@/assets/images/reader-menu/icon-page-preview.webp'),
  'font-size': require('@/assets/images/reader-menu/icon-font-size.webp'),
  language: require('@/assets/images/reader-menu/icon-language.webp'),
  compare: require('@/assets/images/reader-menu/icon-compare.webp'),
  tips: require('@/assets/images/reader-menu/icon-tips.webp'),
};
const GLYPHS: Partial<Record<MenuIcon, keyof typeof Ionicons.glyphMap>> = {
  'auto-play': 'play',
  instrument: 'musical-notes',
};
const ARROW = require('@/assets/images/reader-menu/arrow.webp');

export function panelSlices(width: number, height: number) {
  const scale = width / MENU_PANEL.width;
  const top = MENU_PANEL.top * scale;
  const bottom = (MENU_PANEL.height - MENU_PANEL.bottom) * scale;
  return { top, bottom, middle: Math.max(0, height - top - bottom) };
}

export function menuPlacement(screenWidth: number, coinMargin: number, coinSize: number, width: number, coinBottom = 0, safeRight = 0) {
  const scale = width / MENU_PANEL.width;
  const tipFromRight = (MENU_PANEL.width - MENU_PANEL.tipX) * scale;
  const aim = screenWidth - coinMargin - coinSize - TIP_GAP;
  const edge = Math.min(aim + tipFromRight, screenWidth - Math.max(SCREEN_EDGE, safeRight));
  return { right: screenWidth - edge, tipX: edge - tipFromRight, top: coinBottom + TIP_GAP - MENU_PANEL.tipY * scale };
}

function MenuIconTile({ icon, size }: { icon: MenuIcon; size: number }) {
  const art = ICONS[icon];
  if (art) {
    return <Image testID={`reader-menu-icon-${icon}`} accessible={false} source={art} contentFit="contain" transition={0} style={{ width: size, height: size }} />;
  }
  return (
    <View testID={`reader-menu-icon-${icon}`} style={[styles.tile, { width: size, height: size, borderRadius: size * 0.3 }]}>
      <Ionicons name={GLYPHS[icon] ?? 'ellipse'} size={size * 0.5} color={GLYPH} />
    </View>
  );
}

interface PanelProps {
  top: number;
  right: number;
  width: number;
  maxHeight?: number;
  visible: boolean;
  reduceMotion: boolean;
  testID?: string;
  children: ReactNode;
}

export const ReaderMenuPanel = memo(function ReaderMenuPanel({ top, right, width, maxHeight, visible, reduceMotion, testID = 'reader-menu', children }: PanelProps) {
  const [height, setHeight] = useState(0);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.height;
    setHeight((previous) => (previous === next ? previous : next));
  }, []);
  const scale = width / MENU_PANEL.width;
  const slices = panelSlices(width, height);
  const shown = visible && height > 0 ? 1 : 0;
  const fade = useSharedValue(shown);
  useEffect(() => {
    fade.value = reduceMotion ? shown : withTiming(shown, { duration: MENU_FADE_MS });
  }, [shown, reduceMotion, fade]);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const art = (name: 'top' | 'middle' | 'bottom', place: object) => (
    <Image testID={`reader-menu-panel-${name}`} accessible={false} source={PANEL[name]} contentFit="fill" transition={0} style={{ position: 'absolute', left: 0, width, ...place }} />
  );

  return (
    <Animated.View
      testID={testID}
      onLayout={onLayout}
      pointerEvents={shown ? 'auto' : 'none'}
      accessibilityElementsHidden={!shown}
      importantForAccessibility={shown ? 'auto' : 'no-hide-descendants'}
      style={[
        styles.panel,
        {
          top,
          right,
          width,
          maxHeight,
          minHeight: (MENU_PANEL.top + MENU_PANEL.height - MENU_PANEL.bottom) * scale,
          paddingTop: MENU_PANEL.content.top * scale,
          paddingBottom: (MENU_PANEL.height - MENU_PANEL.content.bottom) * scale,
          paddingLeft: MENU_PANEL.content.left * scale,
          paddingRight: (MENU_PANEL.width - MENU_PANEL.content.right) * scale,
          opacity: shown,
        },
        fadeStyle,
      ]}
    >
      {height > 0 ? (
        <>
          {art('top', { top: 0, height: slices.top })}
          {art('middle', { top: slices.top - SLICE_OVERLAP, height: slices.middle + SLICE_OVERLAP * 2 })}
          {art('bottom', { bottom: 0, height: slices.bottom })}
        </>
      ) : null}
      {children}
    </Animated.View>
  );
});

interface ReaderMenuProps {
  rows: readonly ReaderMenuRow[];
  top: number;
  right: number;
  width: number;
  fontSize: number;
  scale: number;
  maxHeight?: number;
  visible: boolean;
  reduceMotion: boolean;
}

export const ReaderMenu = memo(function ReaderMenu({ rows, top, right, width, fontSize, scale, maxHeight, visible, reduceMotion }: ReaderMenuProps) {
  const tile = 32 * scale;
  const arrow = 24 * scale;

  return (
    <ReaderMenuPanel top={top} right={right} width={width} maxHeight={maxHeight} visible={visible} reduceMotion={reduceMotion}>
      <ScrollView testID="reader-menu-scroll" bounces={false} showsVerticalScrollIndicator={false}>
        {rows.map((row, i) => (
          <React.Fragment key={row.key}>
            {i > 0 ? <View testID="reader-menu-divider" style={styles.divider} /> : null}
            <Pressable
              testID={row.testID}
              accessibilityRole="button"
              accessibilityLabel={row.label}
              onPress={row.onPress}
              style={[styles.row, { paddingVertical: 4 * scale, gap: 10 * scale }]}
            >
              <MenuIconTile icon={row.icon} size={tile} />
              <Text style={[styles.label, { fontSize }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                {row.label}
              </Text>
              <Image testID="reader-menu-arrow" accessible={false} source={ARROW} contentFit="contain" transition={0} style={{ width: arrow, height: arrow }} />
            </Pressable>
          </React.Fragment>
        ))}
      </ScrollView>
    </ReaderMenuPanel>
  );
});

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    zIndex: 100,
    shadowColor: '#7A4A00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    flex: 1,
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: MENU_INK,
  },
  divider: {
    height: 1,
    backgroundColor: DIVIDER,
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TILE_FACE,
    borderWidth: 1.5,
    borderColor: TILE_EDGE,
  },
});
