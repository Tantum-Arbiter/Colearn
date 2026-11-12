import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { MENU_INK } from '@/components/stories/reader-menu';

export type LanguageMark = 'reading' | 'comparing';

export interface LanguageChoice {
  code: string;
  name: string;
  flag: string;
}

interface Box {
  width: number;
  height: number;
}

interface Insets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export const LANGUAGE_PANEL = {
  width: 1248,
  top: 258,
  middle: 316,
  bottom: 188,
  maxScale: 0.625,
  largestText: 1.3,
  margin: { x: 16, y: 6 },
  columns: 3,
  shownRows: 3,
  smallestPill: 40,
  peek: 26,
  face: { left: 30, top: 70, right: 30, bottom: 30, radius: 90 },
  title: { y: 142, size: 56, reach: 324, height: 96, alone: 22 },
  toggle: { left: 960, top: 106, width: 113, height: 65, size: 26 },
  close: { left: 1094, top: 91, size: 94, rim: 7, glyph: 58 },
  hint: { left: 80, y: 222, size: 30, height: 44 },
  list: { left: 63, width: 1129, padTop: 11, padBottom: 7 },
  pill: { height: 90, gap: 18, rowGap: 14, radius: 30, rim: 3, markedRim: 5, size: 30, flag: 48, tick: 42 },
  done: { left: 276, top: 38, width: 697, height: 92, radius: 40, rim: 3, lip: 5, size: 40, icon: 50 },
} as const;

export const LANGUAGE_PANEL_MOTION = { inMs: 180, outMs: 140, from: 0.96 } as const;

export const LANGUAGE_PILL = {
  plain: { rim: '#DDB585', fill: ['#FEF4E8', '#FCEAD0'], tick: 'transparent', tickInk: 'transparent' },
  reading: { rim: '#B56800', fill: ['#FDE052', '#FDD038'], tick: '#B86A03', tickInk: '#FDEFAB' },
  comparing: { rim: '#14CDB9', fill: ['#E5EBFD', '#D7D9FB'], tick: '#22C7BE', tickInk: '#FFFFFF' },
} as const;

const P = LANGUAGE_PANEL;
const SLICE_OVERLAP = 1;
const DIM = 'rgba(0, 0, 0, 0.72)';
const FACE = '#FDF1DA';
const HINT_INK = '#78575E';
const SWITCH = {
  off: { rim: '#E0BC9D', fill: ['#F8EAD1', '#EDD5B4'], ink: MENU_INK },
  on: { rim: '#14A090', fill: ['#2FD0C2', '#1FB3A4'], ink: '#FFFFFF' },
} as const;
const CLOSE = { rim: '#F3AA11', fill: '#FCE5B5', glyph: '#A84202' } as const;
const DONE = { rim: '#EDBFFA', fill: ['#7E3AA5', '#65328E'], lip: '#340F4B', ink: '#FFFFFF' } as const;

export const PANEL_COLOURS = { hint: HINT_INK, close: CLOSE, done: DONE } as const;
const DONE_HELD = { scale: 0.97, sink: 0.8 } as const;

const ART: Record<'top' | 'middle' | 'bottom' | 'fade' | 'fadeTop', ImageSource> = {
  top: require('@/assets/images/reader-languages/panel-top.webp'),
  middle: require('@/assets/images/reader-languages/panel-middle.webp'),
  bottom: require('@/assets/images/reader-languages/panel-bottom.webp'),
  fade: require('@/assets/images/reader-languages/panel-fade.webp'),
  fadeTop: require('@/assets/images/reader-languages/panel-fade-top.webp'),
};

function measure(screen: Box, insets: Insets, count: number, grow: number) {
  const roomWidth = screen.width - insets.left - insets.right - P.margin.x * 2;
  const roomHeight = screen.height - insets.top - insets.bottom - P.margin.y * 2;
  if (roomWidth <= 0 || roomHeight <= 0) {
    return { scale: 0, width: 0, height: 0, left: 0, top: 0, rows: 0, list: 0, scrolls: false };
  }
  const allRows = Math.ceil(count / P.columns);
  const pitch = P.pill.height + P.pill.rowGap;
  const fixed = P.top + P.bottom;
  const whole = P.list.padTop + allRows * P.pill.height + Math.max(0, allRows - 1) * P.pill.rowGap + P.list.padBottom;
  const widest = Math.min(roomWidth / P.width, P.maxScale * grow);
  const tallest = roomHeight / (fixed + whole);
  const fitted = Math.min(widest, tallest);
  const scrolls = allRows > P.shownRows && tallest < widest && tallest * P.pill.height < P.smallestPill;
  const windowOf = (rows: number) => P.list.padTop + rows * pitch + P.peek;
  const scale = scrolls ? Math.min(widest, roomHeight / (fixed + windowOf(P.shownRows))) : fitted;
  const rows = scrolls ? Math.max(P.shownRows, Math.floor((roomHeight / scale - fixed - P.list.padTop - P.peek) / pitch)) : allRows;
  const list = (scrolls ? windowOf(rows) : whole) * scale;
  const width = P.width * scale;
  const height = fixed * scale + list;
  return {
    scale,
    width,
    height,
    left: insets.left + (screen.width - insets.left - insets.right - width) / 2,
    top: insets.top + (screen.height - insets.top - insets.bottom - height) / 2,
    rows,
    list,
    scrolls,
  };
}

export function languagePanelLayout(screen: Box, insets: Insets, count: number, textScale = 1) {
  const grow = Math.min(Math.max(textScale, 1), P.largestText);
  const place = measure(screen, insets, count, grow);
  const plain = grow === 1 ? place : measure(screen, insets, count, 1);
  return { ...place, text: place.scale > 0 ? (grow * plain.scale) / place.scale : 1 };
}

interface PillProps {
  language: LanguageChoice;
  mark: LanguageMark | undefined;
  width: number;
  scale: number;
  text: number;
  onPick: (code: string) => void;
}

function LanguagePill({ language, mark, width, scale, text, onPick }: PillProps) {
  const look = LANGUAGE_PILL[mark ?? 'plain'];
  const radius = P.pill.radius * scale;
  const tick = P.pill.tick * scale;

  return (
    <Pressable
      testID={`language-pill-${language.code}`}
      accessibilityRole="button"
      accessibilityLabel={language.name}
      accessibilityState={{ selected: mark !== undefined }}
      onPress={() => onPick(language.code)}
      style={[styles.pill, { width, height: P.pill.height * scale, borderRadius: radius, backgroundColor: look.fill[1], shadowRadius: 4 * scale, shadowOffset: { width: 0, height: 4 * scale } }]}
    >
      <LinearGradient
        testID={`language-pill-face-${language.code}`}
        colors={look.fill}
        style={[
          styles.pillFace,
          {
            borderRadius: radius,
            borderWidth: Math.max(1, (mark ? P.pill.markedRim : P.pill.rim) * scale),
            borderColor: look.rim,
            paddingLeft: 44 * scale,
            paddingRight: 18 * scale,
            gap: 20 * scale,
          },
        ]}
      >
        <Text testID={`language-pill-flag-${language.code}`} accessible={false} allowFontScaling={false} style={[styles.flag, { fontSize: P.pill.flag * scale }]}>
          {language.flag}
        </Text>
        <Text
          testID={`language-pill-name-${language.code}`}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          allowFontScaling={false}
          style={[styles.name, { fontSize: P.pill.size * scale * text }]}
        >
          {language.name}
        </Text>
        {mark ? (
          <View testID={`language-pill-tick-${language.code}`} style={[styles.tick, { width: tick, height: tick, borderRadius: tick / 2, backgroundColor: look.tick }]}>
            <Ionicons name="checkmark" size={tick * 0.72} color={look.tickInk} />
          </View>
        ) : null}
      </LinearGradient>
    </Pressable>
  );
}

export function usePanelPresence(visible: boolean, reduceMotion: boolean) {
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  if (!visible && mounted && reduceMotion) setMounted(false);
  const shown = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) {
      shown.value = visible ? 1 : 0;
      return;
    }
    if (!mounted) return;
    if (visible) {
      shown.value = withTiming(1, { duration: LANGUAGE_PANEL_MOTION.inMs, easing: Easing.out(Easing.cubic) });
      return;
    }
    shown.value = withTiming(0, { duration: LANGUAGE_PANEL_MOTION.outMs, easing: Easing.in(Easing.quad) }, (finished) => {
      if (finished) runOnJS(setMounted)(false);
    });
  }, [visible, mounted, reduceMotion, shown]);
  const dimStyle = useAnimatedStyle(() => ({ opacity: shown.value }));
  const panelStyle = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ scale: LANGUAGE_PANEL_MOTION.from + (1 - LANGUAGE_PANEL_MOTION.from) * shown.value }],
  }));
  return { mounted, dimStyle, panelStyle };
}

export interface PanelPlace {
  scale: number;
  width: number;
  height: number;
  left: number;
  top: number;
}

interface PanelFrameProps {
  id: string;
  visible: boolean;
  place: PanelPlace;
  dimStyle: ReturnType<typeof usePanelPresence>['dimStyle'];
  panelStyle: ReturnType<typeof usePanelPresence>['panelStyle'];
  onBackdrop: () => void;
  children: React.ReactNode;
}

export function PanelFrame({ id, visible, place, dimStyle, panelStyle, onBackdrop, children }: PanelFrameProps) {
  return (
    <View testID={`${id}-layer`} accessibilityViewIsModal={visible} pointerEvents={visible ? 'box-none' : 'none'} style={styles.layer}>
      <Animated.View style={[styles.dim, dimStyle]}>
        <Pressable testID={`${id}-backdrop`} accessible={false} importantForAccessibility="no" onPress={onBackdrop} style={styles.fill} />
      </Animated.View>
      <Animated.View testID={id} style={[styles.panel, { left: place.left, top: place.top, width: place.width, height: place.height }, panelStyle]}>
        {children}
      </Animated.View>
    </View>
  );
}

export interface PanelTitleSpot {
  x: number;
  y: number;
  reach: number;
  height: number;
  size: number;
}

interface PanelTitleProps {
  id: string;
  title: string;
  scale: number;
  text: number;
  spot: PanelTitleSpot;
  drop?: number;
}

export function PanelTitle({ id, title, scale, text, spot, drop = 0 }: PanelTitleProps) {
  const u = (units: number) => units * scale;
  return (
    <View testID={`${id}-heading`} style={[styles.titleBox, { left: u(spot.x - spot.reach), width: u(spot.reach * 2), top: u(spot.y - spot.height / 2) + drop, height: u(spot.height) }]}>
      <Text testID={`${id}-title`} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} allowFontScaling={false} style={[styles.title, { fontSize: u(spot.size) * text }]}>
        {title}
      </Text>
    </View>
  );
}

interface PanelCloseProps {
  id: string;
  label: string;
  scale: number;
  left: number;
  top: number;
  onPress: () => void;
}

export function PanelClose({ id, label, scale, left, top, onPress }: PanelCloseProps) {
  const u = (units: number) => units * scale;
  return (
    <Pressable
      testID={`${id}-close`}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={[styles.spot, styles.close, { left, top, width: u(P.close.size), height: u(P.close.size), borderRadius: u(P.close.size / 2), borderWidth: Math.max(2, u(P.close.rim)) }]}
    >
      <Ionicons name="close" size={u(P.close.glyph)} color={CLOSE.glyph} />
    </Pressable>
  );
}

interface PanelDoneProps {
  id: string;
  label: string;
  scale: number;
  text: number;
  left: number;
  top: number;
  width: number;
  onPress: () => void;
}

export function PanelDone({ id, label, scale, text, left, top, width, onPress }: PanelDoneProps) {
  const u = (units: number) => units * scale;
  const [held, setHeld] = useState(false);
  return (
    <Pressable
      testID={`${id}-done`}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={() => setHeld(true)}
      onPressOut={() => setHeld(false)}
      style={[styles.spot, styles.doneLip, { left, top, width, height: u(P.done.height), borderRadius: u(P.done.radius), paddingBottom: u(P.done.lip) }, held && { transform: [{ scale: DONE_HELD.scale }] }]}
    >
      <LinearGradient testID={`${id}-done-face`} colors={DONE.fill} style={[styles.doneFace, { borderRadius: u(P.done.radius), borderWidth: Math.max(1, u(P.done.rim)), gap: u(18), paddingHorizontal: u(40) }, held && { transform: [{ translateY: u(P.done.lip) * DONE_HELD.sink }] }]}>
        <Ionicons name="checkmark-circle" size={u(P.done.icon)} color={DONE.ink} />
        <Text testID={`${id}-done-label`} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} allowFontScaling={false} style={[styles.doneLabel, { fontSize: u(P.done.size) * text }]}>
          {label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

interface LanguagePanelProps {
  visible: boolean;
  screen: Box;
  insets: Insets;
  textScale?: number;
  reduceMotion: boolean;
  title: string;
  hint?: string;
  doneLabel: string;
  closeLabel: string;
  toggle?: { on: boolean; label: string; onPress: () => void };
  languages: readonly LanguageChoice[];
  marks: Readonly<Record<string, LanguageMark | undefined>>;
  onPick: (code: string) => void;
  onDone: () => void;
  onClose: () => void;
}

export function LanguagePanel({ visible, screen, insets, textScale, reduceMotion, title, hint, doneLabel, closeLabel, toggle, languages, marks, onPick, onDone, onClose }: LanguagePanelProps) {
  const { mounted, dimStyle, panelStyle } = usePanelPresence(visible, reduceMotion);

  const place = languagePanelLayout(screen, insets, languages.length, textScale);
  if (!mounted || place.scale <= 0) return null;

  const scale = place.scale;
  const u = (units: number) => units * scale;
  const listTop = u(P.top);
  const listWidth = u(P.list.width);
  const pillWidth = (listWidth - u(P.pill.gap) * (P.columns - 1)) / P.columns - 0.01;
  const look = toggle?.on ? SWITCH.on : SWITCH.off;
  const drop = hint ? 0 : u(P.title.alone);
  const art = (name: 'top' | 'middle' | 'bottom', box: object) => (
    <Image testID={`language-panel-art-${name}`} accessible={false} source={ART[name]} contentFit="fill" transition={0} style={[styles.art, { width: place.width }, box]} />
  );

  return (
    <PanelFrame id="language-panel" visible={visible} place={place} dimStyle={dimStyle} panelStyle={panelStyle} onBackdrop={onClose}>
      <View style={[styles.face, { left: u(P.face.left), top: u(P.face.top), right: u(P.face.right), bottom: u(P.face.bottom), borderRadius: u(P.face.radius) }]} />
      {art('top', { top: 0, height: listTop })}
      {art('middle', { top: listTop - SLICE_OVERLAP, height: place.list + SLICE_OVERLAP * 2 })}
      {art('bottom', { bottom: 0, height: u(P.bottom) })}

      <PanelTitle id="language-panel" title={title} scale={scale} text={place.text} spot={{ x: P.width / 2, y: P.title.y, reach: P.title.reach, height: P.title.height, size: P.title.size }} drop={drop} />

      {toggle ? (
        <Pressable
          testID="language-panel-toggle"
          accessibilityRole="switch"
          accessibilityLabel={title}
          accessibilityState={{ checked: toggle.on }}
          hitSlop={8}
          onPress={toggle.onPress}
          style={[styles.spot, { left: u(P.toggle.left), top: u(P.toggle.top) + drop, width: u(P.toggle.width), height: u(P.toggle.height) }]}
        >
          <LinearGradient
            testID="language-panel-toggle-face"
            colors={look.fill}
            style={[styles.toggleFace, { borderRadius: u(P.toggle.height / 2), borderWidth: Math.max(1, u(P.pill.rim)), borderColor: look.rim, paddingHorizontal: u(14) }]}
          >
            <Text testID="language-panel-toggle-label" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} allowFontScaling={false} style={[styles.toggleLabel, { fontSize: u(P.toggle.size) * place.text, color: look.ink }]}>
              {toggle.label}
            </Text>
          </LinearGradient>
        </Pressable>
      ) : null}

      <PanelClose id="language-panel" label={closeLabel} scale={scale} left={u(P.close.left)} top={u(P.close.top) + drop} onPress={onClose} />

      {hint ? (
        <View style={[styles.hintBox, { left: u(P.hint.left), right: u(P.hint.left), top: u(P.hint.y - P.hint.height / 2), height: u(P.hint.height) }]}>
          <Text testID="language-panel-hint" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} allowFontScaling={false} style={[styles.hint, { fontSize: u(P.hint.size) * place.text }]}>
            {hint}
          </Text>
        </View>
      ) : null}

      <ScrollView
        testID="language-panel-list"
        scrollEnabled={place.scrolls}
        showsVerticalScrollIndicator={place.scrolls}
        bounces={false}
        style={[styles.spot, { left: u(P.list.left), top: listTop, width: listWidth, height: place.list }]}
        contentContainerStyle={[styles.listContent, { columnGap: u(P.pill.gap), rowGap: u(P.pill.rowGap), paddingTop: u(P.list.padTop), paddingBottom: u(place.scrolls ? P.peek : P.list.padBottom) }]}
      >
        {languages.map((language) => (
          <LanguagePill key={language.code} language={language} mark={marks[language.code]} width={pillWidth} scale={scale} text={place.text} onPick={onPick} />
        ))}
      </ScrollView>
      {place.scrolls ? (
        <>
          <View testID="language-panel-above" pointerEvents="none" style={[styles.spot, { left: u(P.list.left), width: listWidth, top: listTop, height: u(P.list.padTop) }]}>
            <Image accessible={false} source={ART.fadeTop} contentFit="fill" transition={0} style={{ width: listWidth, height: u(P.list.padTop) }} />
          </View>
          <View testID="language-panel-more" pointerEvents="none" style={[styles.spot, { left: u(P.list.left), width: listWidth, top: listTop + place.list - u(P.peek), height: u(P.peek) }]}>
            <Image accessible={false} source={ART.fade} contentFit="fill" transition={0} style={{ width: listWidth, height: u(P.peek) }} />
          </View>
        </>
      ) : null}

      <PanelDone id="language-panel" label={doneLabel} scale={scale} text={place.text} left={u(P.done.left)} top={listTop + place.list + u(P.done.top)} width={u(P.done.width)} onPress={onDone} />
    </PanelFrame>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: DIM,
  },
  panel: {
    position: 'absolute',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  face: {
    position: 'absolute',
    backgroundColor: FACE,
  },
  art: {
    position: 'absolute',
    left: 0,
  },
  spot: {
    position: 'absolute',
  },
  titleBox: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.rounded,
    fontWeight: '800',
    color: MENU_INK,
    textAlign: 'center',
  },
  hintBox: {
    position: 'absolute',
    justifyContent: 'center',
  },
  hint: {
    fontFamily: Fonts.rounded,
    fontWeight: '600',
    color: HINT_INK,
    textAlign: 'center',
  },
  toggleFace: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleLabel: {
    fontFamily: Fonts.rounded,
    fontWeight: '800',
    textAlign: 'center',
  },
  close: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CLOSE.fill,
    borderColor: CLOSE.rim,
  },
  listContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pill: {
    shadowColor: '#A8763A',
    shadowOpacity: 0.3,
  },
  pillFace: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    includeFontPadding: false,
    textAlign: 'center',
  },
  name: {
    flex: 1,
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: MENU_INK,
    includeFontPadding: false,
  },
  tick: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneLip: {
    backgroundColor: DONE.lip,
  },
  doneFace: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: DONE.rim,
  },
  doneLabel: {
    fontFamily: Fonts.rounded,
    fontWeight: '800',
    color: DONE.ink,
    flexShrink: 1,
  },
});
