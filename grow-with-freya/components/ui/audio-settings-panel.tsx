import React, { useEffect, useRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { useGlobalSound } from '@/contexts/global-sound-context';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { Image, type ImageSource } from 'expo-image';
import { Fonts } from '@/constants/theme';
import { MENU_INK } from '@/components/stories/reader-menu';
import { LANGUAGE_PANEL, PanelDone, PanelFrame, PanelTitle, usePanelPresence, type PanelPlace } from '@/components/stories/language-panel';
import { PaintedSlider } from './painted-slider';

export const AUDIO_PANEL = {
  width: 1387,
  height: 1028,
  title: { x: 708, y: 159, reach: 330, height: 96, size: 60 },
  crest: 708,
  crestFoot: 120,
  leaf: 1262,
  cards: [198.7, 421.7, 644.7],
  card: { left: 54.7, right: 1332.3, height: 193.3 },
  slot: { x: 164.4, size: 152 },
  icon: 89,
  off: { length: 113, thickness: 10 },
  label: { left: 272, y: 0.32, height: 61, size: 43 },
  level: { right: 1240, size: 39 },
  slider: { left: 272, right: 1240, y: 0.68, height: 70, track: 13, knob: { width: 72, height: 43 } },
  done: { left: 458.5, width: 470, top: 852 },
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

interface AudioSettingsPanelProps {
  visible: boolean;
  screen: Box;
  insets: Insets;
  textScale?: number;
  reduceMotion: boolean;
  title: string;
  doneLabel: string;
  muteLabel: string;
  unmuteLabel: string;
  channels: readonly AudioChannel[];
  onClose: () => void;
}

export function AudioSettingsPanel({ visible, screen, insets, textScale, reduceMotion, title, doneLabel, muteLabel, unmuteLabel, channels, onClose }: AudioSettingsPanelProps) {
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

interface AudioSettingsProps {
  visible: boolean;
  onClose: () => void;
  presentation?: 'window' | 'overlay';
}

export function AudioSettings({ visible, onClose, presentation = 'window' }: AudioSettingsProps) {
  const { t } = useTranslation();
  const sound = useGlobalSound();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { textSizeScale } = useAccessibility();
  const reduceMotion = useReducedMotion();
  const inWindow = presentation === 'window';
  const close = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const panel = (
    <AudioSettingsPanel
      visible={visible}
      screen={{ width, height }}
      insets={insets}
      textScale={textSizeScale}
      reduceMotion={reduceMotion || inWindow}
      title={t('audioSettings.title')}
      doneLabel={t('reader.done')}
      muteLabel={t('audioSettings.mute')}
      unmuteLabel={t('audioSettings.unmute')}
      channels={[
        { id: 'master', label: t('audioSettings.masterVolume'), value: sound.masterVolume, onChange: sound.setMasterVolume },
        { id: 'music', label: t('audioSettings.music'), value: sound.musicVolume, onChange: sound.setMusicVolume },
        { id: 'voice', label: t('audioSettings.voiceOver'), value: sound.voiceOverVolume, onChange: sound.setVoiceOverVolume },
      ]}
      onClose={close}
    />
  );

  if (!inWindow) return panel;
  return (
    <Modal visible={visible} transparent animationType={reduceMotion ? 'none' : 'fade'} statusBarTranslucent supportedOrientations={['portrait', 'landscape']} onRequestClose={close}>
      {panel}
    </Modal>
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
