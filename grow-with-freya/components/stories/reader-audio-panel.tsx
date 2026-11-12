import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image, type ImageSource } from 'expo-image';
import { Fonts } from '@/constants/theme';
import { MENU_INK } from './reader-menu';
import { LANGUAGE_PANEL, PanelClose, PanelDone, PanelFrame, PanelTitle, usePanelPresence, type PanelPlace } from './language-panel';
import { PaintedSlider } from './painted-slider';

export const AUDIO_PANEL = {
  width: 1277,
  height: 992,
  title: { x: 638.5, y: 169, reach: 330, height: 96, size: 60 },
  close: { left: 1103, top: 122 },
  crestFoot: 108,
  leaf: 1155,
  cards: [230, 433, 632],
  card: { height: 177 },
  slot: { x: 151, size: 140 },
  icon: 82,
  off: { length: 104, thickness: 9 },
  label: { left: 250, y: 0.32, height: 56, size: 40 },
  level: { right: 1140, size: 36 },
  slider: { left: 250, right: 1140, y: 0.68, height: 64, track: 12, knob: { width: 66, height: 40 } },
  done: { left: 346, width: 585, top: 844 },
} as const;

const A = AUDIO_PANEL;
const L = LANGUAGE_PANEL;
const WIDEST = (L.width * L.maxScale) / A.width;
const MUTED = 0.4;

const ART: ImageSource = require('@/assets/images/reader-audio/panel.webp');
const ICONS: Record<string, ImageSource> = {
  master: require('@/assets/images/reader-audio/icon-master.webp'),
  music: require('@/assets/images/reader-audio/icon-music.webp'),
  voice: require('@/assets/images/reader-audio/icon-voice.webp'),
};

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

function fit(screen: Box, insets: Insets, grow: number): PanelPlace {
  const roomWidth = screen.width - insets.left - insets.right - L.margin.x * 2;
  const roomHeight = screen.height - insets.top - insets.bottom - L.margin.y * 2;
  if (roomWidth <= 0 || roomHeight <= 0) return { scale: 0, width: 0, height: 0, left: 0, top: 0 };
  const scale = Math.min(roomWidth / A.width, WIDEST * grow, roomHeight / A.height);
  const width = A.width * scale;
  const height = A.height * scale;
  return {
    scale,
    width,
    height,
    left: insets.left + (screen.width - insets.left - insets.right - width) / 2,
    top: insets.top + (screen.height - insets.top - insets.bottom - height) / 2,
  };
}

export function audioPanelLayout(screen: Box, insets: Insets, textScale = 1) {
  const grow = Math.min(Math.max(textScale, 1), L.largestText);
  const place = fit(screen, insets, grow);
  const plain = grow === 1 ? place : fit(screen, insets, 1);
  return { ...place, text: place.scale > 0 ? (grow * plain.scale) / place.scale : 1 };
}

export interface AudioChannel {
  id: 'master' | 'music' | 'voice';
  label: string;
  value: number;
  onChange: (value: number) => void;
}

interface ReaderAudioPanelProps {
  visible: boolean;
  screen: Box;
  insets: Insets;
  textScale?: number;
  reduceMotion: boolean;
  title: string;
  doneLabel: string;
  closeLabel: string;
  muteLabel: string;
  unmuteLabel: string;
  channels: readonly AudioChannel[];
  onClose: () => void;
}

export function ReaderAudioPanel({ visible, screen, insets, textScale, reduceMotion, title, doneLabel, closeLabel, muteLabel, unmuteLabel, channels, onClose }: ReaderAudioPanelProps) {
  const { mounted, dimStyle, panelStyle } = usePanelPresence(visible, reduceMotion);
  const heard = useRef<Record<string, number>>({});
  useEffect(() => {
    channels.forEach((channel) => {
      if (channel.value > 0) heard.current[channel.id] = channel.value;
    });
  }, [channels]);

  const place = audioPanelLayout(screen, insets, textScale);
  if (!mounted || place.scale <= 0) return null;

  const u = (units: number) => units * place.scale;
  const toggle = (channel: AudioChannel) => {
    if (channel.value > 0) {
      heard.current[channel.id] = channel.value;
      channel.onChange(0);
      return;
    }
    channel.onChange(heard.current[channel.id] ?? 1);
  };

  return (
    <PanelFrame id="audio-panel" visible={visible} place={place} dimStyle={dimStyle} panelStyle={panelStyle} onBackdrop={onClose}>
      <Image testID="audio-panel-art" accessible={false} source={ART} contentFit="fill" transition={0} style={[styles.spot, { left: 0, top: 0, width: place.width, height: place.height }]} />
      <PanelTitle id="audio-panel" title={title} scale={place.scale} text={place.text} spot={A.title} />
      <PanelClose id="audio-panel" label={closeLabel} scale={place.scale} left={u(A.close.left)} top={u(A.close.top)} onPress={onClose} />

      {channels.map((channel, row) => {
        const cardTop = A.cards[row];
        const muted = channel.value <= 0;
        return (
          <React.Fragment key={channel.id}>
            <Pressable
              testID={`audio-panel-button-${channel.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${muted ? unmuteLabel : muteLabel} ${channel.label}`}
              hitSlop={6}
              onPress={() => toggle(channel)}
              style={[styles.spot, styles.centred, { left: u(A.slot.x - A.slot.size / 2), top: u(cardTop + A.card.height / 2 - A.slot.size / 2), width: u(A.slot.size), height: u(A.slot.size) }]}
            >
              <Image
                testID={`audio-panel-icon-${channel.id}`}
                accessible={false}
                source={ICONS[channel.id]}
                contentFit="contain"
                transition={0}
                style={[{ width: u(A.icon), height: u(A.icon) }, muted && { opacity: MUTED }]}
              />
              {muted ? (
                <View
                  testID={`audio-panel-off-${channel.id}`}
                  pointerEvents="none"
                  style={[styles.off, { width: u(A.off.length), height: u(A.off.thickness), borderRadius: u(A.off.thickness / 2) }]}
                />
              ) : null}
            </Pressable>

            <View style={[styles.spot, styles.labelRow, { left: u(A.label.left), width: u(A.level.right - A.label.left), top: u(cardTop + A.card.height * A.label.y - A.label.height / 2), height: u(A.label.height) }]}>
              <Text testID={`audio-panel-label-${channel.id}`} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} allowFontScaling={false} style={[styles.label, { fontSize: u(A.label.size) * place.text }]}>
                {channel.label}
              </Text>
              <Text testID={`audio-panel-level-${channel.id}`} allowFontScaling={false} style={[styles.level, { fontSize: u(A.level.size) * place.text }]}>
                {`${Math.round(channel.value * 100)}%`}
              </Text>
            </View>

            <View style={[styles.spot, { left: u(A.slider.left), top: u(cardTop + A.card.height * A.slider.y - A.slider.height / 2) }]}>
              <PaintedSlider
                testID={`audio-panel-slider-${channel.id}`}
                accessibilityLabel={channel.label}
                value={channel.value}
                onValueChange={channel.onChange}
                width={u(A.slider.right - A.slider.left)}
                height={u(A.slider.height)}
                track={u(A.slider.track)}
                knob={{ width: u(A.slider.knob.width), height: u(A.slider.knob.height) }}
              />
            </View>
          </React.Fragment>
        );
      })}

      <PanelDone id="audio-panel" label={doneLabel} scale={place.scale} text={place.text} left={u(A.done.left)} top={u(A.done.top)} width={u(A.done.width)} onPress={onClose} />
    </PanelFrame>
  );
}

const styles = StyleSheet.create({
  spot: {
    position: 'absolute',
  },
  centred: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  off: {
    position: 'absolute',
    backgroundColor: MENU_INK,
    transform: [{ rotate: '-45deg' }],
    borderWidth: 2,
    borderColor: '#FDF1DA',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    flex: 1,
    fontFamily: Fonts.rounded,
    fontWeight: '800',
    color: MENU_INK,
    includeFontPadding: false,
  },
  level: {
    fontFamily: Fonts.rounded,
    fontWeight: '800',
    color: MENU_INK,
    includeFontPadding: false,
  },
});
