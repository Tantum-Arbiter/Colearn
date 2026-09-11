/**
 * MusicChallengeUI - Landscape instrument view with note buttons
 *
 * Two play modes, toggled by user:
 *  🌬️ Blow mode  -mic listens while user holds note buttons
 *  ♫ Press mode -tapping buttons directly plays notes (no mic)
 *
 * Multi-touch: users can hold multiple buttons simultaneously.
 */

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Image, type LayoutChangeEvent, type StyleProp, type TextStyle } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Logger } from '@/utils/logger';
import { useAccessibility } from '@/hooks/use-accessibility';
import type { MusicChallengeHookResult } from '@/hooks/use-music-challenge';
import type { InstrumentArtwork, NoteLayoutItem } from '@/services/music-asset-registry';
import { isChordEntry, parseChordEntry } from '@/services/sequence-matcher';
import {
  layoutInstrumentStage,
  flippedSurfaceShift,
  regionTurnsForBlow,
  instrumentFlipTransform,
  noteLabelTransform,
  type SurfaceBox,
} from '@/services/instrument-surface-layout';
import { layoutStaffStrip, STAFF_ASPECT_RATIO } from '@/services/staff-notation';
import { InstrumentBell } from '@/components/music/instrument-bell';
import { MusicStaffStrip } from '@/components/music/music-staff-strip';

const log = Logger.create('MusicChallengeUI');

const ARTWORK_EDGE_MARGIN = 8;

/**
 * Side padding on the challenge container. The instrument surface cancels it
 * with a negative margin so the body art can bleed off the screen edge, so the
 * two have to stay in step.
 */
const CONTAINER_PADDING = 16;

export const ARTWORK_TOP_MARGIN = 12;
export const LOWER_BLOCK_BUTTON_GAP = 16;

/**
 * How far the music sheet may hang over the top of the instrument. Only the
 * transparent skirt of the banner reaches that far, so nothing is hidden.
 */
export const STAFF_SHEET_OVERLAP = 12;

/** Share of the fallback tube layout's height the sheet may take. */
const TUBE_SHEET_HEIGHT_FRACTION = 0.3;

export function instrumentLowerBlockHeight(
  scaledButtonSize: (size: number) => number,
  scaledFontSize: (size: number) => number,
  hasSequence: boolean,
): number {
  const controls = scaledButtonSize(40) + 24;
  // The notes themselves are written on the sheet above the instrument; all
  // that is left down here is the "3/17" progress line.
  const progress = hasSequence ? scaledFontSize(12) + 10 : 0;
  return controls + progress;
}

type PlayMode = 'blow' | 'press';

interface MusicChallengeUIProps {
  challenge: MusicChallengeHookResult;
  promptText: string;
  requiredSequence: string[];
  noteLayout: NoteLayoutItem[];
  /** Body illustration the note buttons are pinned to; omitted instruments use the generic tube */
  artwork?: InstrumentArtwork;
  showBreathButton: boolean;
  onSkip?: () => void;
  onContinue?: () => void;
  onMusicSheet?: () => void;
  allowSkip?: boolean;
  /** Override the "Continue Story" button label (e.g. for practise mode) */
  continueLabel?: string;
  /** Called when the instrument rotation state changes (blow mode or manual rotate) */
  onRotationChange?: (isRotated: boolean) => void;
  /** Called when the user toggles between blow/press mode so the parent can start/stop the mic */
  onPlayModeChange?: (mode: PlayMode) => void;
  /** Called when the user toggles the hide/show UI button */
  onVisibilityChange?: (hidden: boolean) => void;
  /** Override safe-area insets (e.g. when the component is rendered inside a CSS-rotated container) */
  insetsOverride?: { top: number; bottom: number; left: number; right: number };
}

/** Individual note button with its own bounce animation */
const NoteButton = React.memo(function NoteButton({
  note,
  color,
  highlighted,
  onPressIn,
  onPressOut,
  playbackActive,
  playbackTick,
  rotationStyle,
  size = 60,
  fontSize = 22,
}: {
  note: string;
  color: string;
  highlighted: boolean;
  onPressIn: (note: string) => void;
  onPressOut: (note: string) => void;
  playbackActive: boolean;
  /** Incrementing counter to force re-trigger even when the same note repeats */
  playbackTick: number;
  /** Animated pose applied to just the letter */
  rotationStyle?: StyleProp<TextStyle>;
  /** Scaled button size */
  size?: number;
  /** Scaled font size */
  fontSize?: number;
}) {
  const bounceScale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  // Glow border: 0 = resting (no border), 1 = fully lit (pressed/playback)
  const glowIntensity = useSharedValue(0);
  // Track press start for decay speed
  const pressStartRef = useRef(0);

  // Pulse for highlighted (next expected) note
  useEffect(() => {
    if (highlighted) {
      pulseScale.value = withSequence(
        withTiming(1.1, { duration: 280, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 280, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.04, { duration: 220, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 220, easing: Easing.inOut(Easing.ease) })
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [highlighted, pulseScale]);

  // Playback highlight -keyed on playbackTick so it re-triggers for repeated notes
  useEffect(() => {
    if (playbackActive && playbackTick > 0) {
      bounceScale.value = withSequence(
        withTiming(0.92, { duration: 60 }),
        withSpring(1, { damping: 15, stiffness: 300 })
      );
      // Light up then fade
      glowIntensity.value = withSequence(
        withTiming(1, { duration: 60 }),
        withTiming(0, { duration: 600, easing: Easing.out(Easing.ease) })
      );
    }
  }, [playbackTick, playbackActive, bounceScale, glowIntensity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value * bounceScale.value }],
  }));

  // Animated border/shadow glow that fades in on press and out on release
  const glowStyle = useAnimatedStyle(() => ({
    borderWidth: 3 * glowIntensity.value,
    borderColor: `rgba(255, 255, 255, ${glowIntensity.value})`,
    shadowOpacity: 0.8 * glowIntensity.value,
    shadowRadius: 12 * glowIntensity.value,
  }));

  const isPressed = useRef(false);

  const handleTouchStart = useCallback(() => {
    if (isPressed.current) return; // already pressed (duplicate event)
    isPressed.current = true;
    pressStartRef.current = Date.now();
    // Slight depress + glow up instantly -stays glowing while held
    bounceScale.value = withTiming(0.93, { duration: 60 });
    glowIntensity.value = withTiming(1, { duration: 40 });
    onPressIn(note);
  }, [note, onPressIn, bounceScale, glowIntensity]);

  const handleTouchEnd = useCallback(() => {
    if (!isPressed.current) return;
    isPressed.current = false;
    const holdMs = Date.now() - pressStartRef.current;
    // Quick tap = snappy decay, long hold = slower natural fade
    const decayMs = holdMs < 150 ? 250 : 600;
    bounceScale.value = withSpring(1, { damping: 15, stiffness: 300 });
    // Fade the glow out naturally
    glowIntensity.value = withTiming(0, { duration: decayMs, easing: Easing.out(Easing.ease) });
    onPressOut(note);
  }, [note, onPressOut, bounceScale, glowIntensity]);

  return (
    <Animated.View style={animatedStyle}>
      <Animated.View
        style={[
          styles.noteButton,
          { backgroundColor: color, width: size, height: size, borderRadius: size / 2, shadowColor: '#FFF' },
          highlighted && styles.noteButtonHighlighted,
          glowStyle,
        ]}
        testID={`note-disc-${note}`}
      >
        <View
          style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          testID={`note-button-${note}`}
        >
          <Animated.Text style={[styles.noteButtonLetter, { fontSize }, rotationStyle]}>
            {note}
          </Animated.Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
});

export const MusicChallengeUI: React.FC<MusicChallengeUIProps> = ({
  challenge,
  promptText,
  requiredSequence,
  noteLayout,
  artwork,
  showBreathButton,
  onSkip,
  onContinue,
  onMusicSheet,
  allowSkip = false,
  continueLabel,
  onRotationChange,
  onPlayModeChange,
  onVisibilityChange,
  insetsOverride,
}) => {
  const { t } = useTranslation();
  const [playMode, setPlayMode] = useState<PlayMode>('press');
  const [uiHidden, setUiHidden] = useState(false);
  const [surfaceBox, setSurfaceBox] = useState<SurfaceBox>({ width: 0, height: 0 });
  const [containerBox, setContainerBox] = useState<SurfaceBox>({ width: 0, height: 0 });
  const activeNotesRef = useRef<Set<string>>(new Set());
  const { scaledFontSize, scaledButtonSize } = useAccessibility();
  const systemInsets = useSafeAreaInsets();
  const insets = insetsOverride ?? systemInsets;


  const playbackIndex = challenge.playbackPosition?.index ?? -1;
  const playbackTick = challenge.playbackPosition?.tick ?? 0;

  // Rotation for blow mode -instrument faces bottom of phone
  const instrumentRotation = useSharedValue(0);

  const isPlayingSong = challenge.state === 'playing_success_song';
  // The challenge no longer stops on a finished state -- it clears the song and
  // waits to be played again -- so the only special state left is the reward
  // melody, and `hasCompleted` is what says the story may be carried on.

  // Whether rotation is active (user holding phone in portrait orientation)
  const isRotated = playMode === 'blow';

  // Report rotation state changes to parent (so music sheet can rotate too)
  useEffect(() => {
    onRotationChange?.(isRotated);
  }, [isRotated, onRotationChange]);

  // In press mode, set breath active permanently
  useEffect(() => {
    if (playMode === 'press') {
      challenge.setBreathActive(true);
    } else {
      challenge.setBreathActive(false);
    }
  }, [playMode]);

  // Animate rotation: automatic in blow mode, manual toggle in press mode
  useEffect(() => {
    if (playMode === 'blow') {
      instrumentRotation.value = withTiming(-90, { duration: 500, easing: Easing.inOut(Easing.ease) });
    } else {
      instrumentRotation.value = withTiming(0, { duration: 500, easing: Easing.inOut(Easing.ease) });
    }
  }, [playMode, instrumentRotation]);

  const instrumentRotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${instrumentRotation.value}deg` }],
  }));

  // The active sequence -use currentSequence from the hook when available
  const activeSequence = challenge.currentSequence?.length > 0 ? challenge.currentSequence : requiredSequence;
  const hasSequence = activeSequence.length > 0;

  const togglePlayMode = useCallback(() => {
    setPlayMode(prev => {
      const next = prev === 'blow' ? 'press' : 'blow';
      onPlayModeChange?.(next);
      return next;
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [onPlayModeChange]);

  const handleNotePressIn = useCallback((note: string) => {
    activeNotesRef.current.add(note);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    challenge.playNote(note);
  }, [challenge]);

  const handleNotePressOut = useCallback((note: string) => {
    activeNotesRef.current.delete(note);
    challenge.stopNote(note);
  }, [challenge]);


  const handleRegionLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSurfaceBox(prev => (prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerBox(prev => (prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  const reserveRight = insets.right + ARTWORK_EDGE_MARGIN;
  const topSectionHeight = scaledFontSize(36) + scaledFontSize(14) + 24;
  const bottomSectionHeight = scaledButtonSize(40) + 24;
  const lowerBlockHeight = instrumentLowerBlockHeight(scaledButtonSize, scaledFontSize, hasSequence);
  const stage = useMemo(
    () => (artwork
      ? layoutInstrumentStage(artwork, noteLayout, { ...surfaceBox, reserveRight }, {
          maxButtonSize: scaledButtonSize(60),
          lowerBlockHeight,
          topMargin: ARTWORK_TOP_MARGIN,
          buttonGap: LOWER_BLOCK_BUTTON_GAP,
        })
      : null),
    [artwork, noteLayout, surfaceBox, reserveRight, scaledButtonSize, lowerBlockHeight],
  );
  const surfaceLayout = stage?.layout ?? null;

  // The sheet fills the space the stage left above the instrument, and turns
  // with the instrument when the child holds the phone up to blow.
  const sheet = useMemo(
    () => (stage
      ? layoutStaffStrip({
          width: surfaceBox.width,
          height: surfaceBox.height,
          instrumentTop: stage.surfaceTop,
          overlap: STAFF_SHEET_OVERLAP,
          // In blow mode the sheet moves to what is then the top of the phone,
          // which in this landscape layout is whichever side the notch is on.
          edgeInset: Math.max(insets.left, insets.right),
        })
      : null),
    [stage, surfaceBox.width, surfaceBox.height, insets.left, insets.right],
  );

  // Blowing means holding the phone upright with the mouthpiece over the
  // microphone at the bottom, so the instrument turns end for end to meet it.
  const flipShift = stage
    ? flippedSurfaceShift(stage.layout, surfaceBox.width + 2 * CONTAINER_PADDING)
    : 0;
  const turnsForBlow = regionTurnsForBlow(surfaceBox);

  const instrumentFlipStyle = useAnimatedStyle(() => {
    const turn = turnsForBlow ? instrumentRotation.value : 0;
    const { translateX, scaleX } = instrumentFlipTransform(flipShift, turn);
    return { transform: [{ translateX }, { scaleX }] };
  }, [flipShift, turnsForBlow]);

  const mirroredLabelStyle = useAnimatedStyle(() => {
    const { rotate, scaleX } = noteLabelTransform(instrumentRotation.value);
    return { transform: [{ rotate }, { scaleX }] };
  });
  // Only an instrument that turned needs its letters turned back.
  const noteLabelStyle = turnsForBlow ? mirroredLabelStyle : instrumentRotationStyle;

  const sheetStyle = useAnimatedStyle(() => {
    // instrumentRotation runs 0 -> -90 as the instrument turns, so it doubles
    // as the progress of the sheet's move to the bottom of the phone.
    const turned = sheet?.turnsForBlow ? instrumentRotation.value / -90 : 0;
    return {
      transform: [
        { translateX: (sheet?.rotatedTranslateX ?? 0) * turned },
        { translateY: (sheet?.rotatedTranslateY ?? 0) * turned },
        { rotate: `${(sheet?.turnsForBlow ? instrumentRotation.value : 0)}deg` },
        { scale: 1 + ((sheet?.rotatedScale ?? 1) - 1) * turned },
      ],
    };
  }, [sheet]);

  // The hold on the sheet runs off the credit's own clock, so what the child
  // sees creeping left is exactly the time the note still has to be held. Key
  // state is not enough: a finger left down across a note boundary would run
  // the next note's hold without the score ever counting it.
  const holdingCurrent = isPlayingSong
    // The reward melody holds each note itself, so the sheet runs through the
    // song with it rather than sitting still.
    ? true
    : challenge.holdingIndex === challenge.currentNoteIndex;

  // Turned and zoomed past the screen, the title would be cut off at both ends,
  // so it comes off the paper until the sheet lies flat again.
  const sheetZoomed = Boolean(isRotated && sheet?.turnsForBlow && sheet.rotatedZoom > 1);
  const titleOnSheet = !sheetZoomed;
  const sheetVisibleFraction = sheetZoomed && sheet ? 1 / sheet.rotatedZoom : 1;

  const staffStrip = (width: number) => (
    <MusicStaffStrip
      sequence={activeSequence}
      noteLayout={noteLayout}
      currentIndex={challenge.currentNoteIndex}
      holdPlan={challenge.holdPlan}
      holdingCurrent={holdingCurrent}
      playbackIndex={isPlayingSong ? playbackIndex : -1}
      wrongCue={challenge.wrongCue}
      replayCue={challenge.replayCue}
      width={width}
      title={titleOnSheet ? promptText : undefined}
      visibleFraction={sheetVisibleFraction}
    />
  );

  /** Sheet width for the fallback tube layout, which has no measured stage. */
  const tubeSheetWidth = Math.min(
    containerBox.width - 24,
    containerBox.height * TUBE_SHEET_HEIGHT_FRACTION * STAFF_ASPECT_RATIO,
  );

  // With a sheet on screen the prompt is written on the paper, so the floating
  // caption would only sit on top of it.
  const showsSheet = hasSequence && (artwork ? sheet != null : tubeSheetWidth > 0);

  const renderNoteButton = (
    item: NoteLayoutItem,
    size: number,
    fontSize: number,
    labelStyle: StyleProp<TextStyle> = instrumentRotationStyle,
  ) => {
    // Disable next-note highlight during playback to avoid double-flash
    // For chord entries like "C+E", highlight all notes in the chord
    const nextNote = challenge.nextExpectedNote;
    const highlighted = !isPlayingSong && nextNote != null && (
      nextNote === item.note ||
      (isChordEntry(nextNote) && parseChordEntry(nextNote).includes(item.note))
    );
    // For chord entries, highlight all notes in the chord during playback
    const playbackEntry = isPlayingSong && playbackIndex >= 0
      ? activeSequence[playbackIndex] : null;
    const isPlaybackNote = playbackEntry != null && (
      playbackEntry === item.note ||
      (isChordEntry(playbackEntry) && parseChordEntry(playbackEntry).includes(item.note))
    );
    return (
      <NoteButton
        key={item.note}
        note={item.note}
        color={item.color}
        highlighted={highlighted}
        onPressIn={handleNotePressIn}
        onPressOut={handleNotePressOut}
        playbackActive={isPlaybackNote}
        playbackTick={isPlaybackNote ? playbackTick : 0}
        rotationStyle={labelStyle}
        size={size}
        fontSize={fontSize}
      />
    );
  };

  return (
    <View style={styles.container} onLayout={handleContainerLayout} testID="challenge-container">
      {/* Top section: prompt OR celebration.
          When there's no sequence (freeplay), use equal flex so the instrument is centered. */}
      <View style={[styles.topSection, !hasSequence && { flex: 1 }, artwork && styles.sectionCompact, artwork && styles.topSectionFloating, artwork && { height: topSectionHeight }]} testID="top-section" pointerEvents="box-none">
        {showsSheet ? null : (
          <View style={[styles.promptContainer, isPlayingSong && { opacity: 0 }]} testID="prompt-pill">
            <Text style={[styles.promptText, { fontSize: scaledFontSize(16) }]}>{promptText}</Text>
          </View>
        )}
      </View>

      {/* Center section: instrument body (not rotated) */}
      {artwork ? (
      <View style={styles.instrumentRegion} testID="instrument-region" onLayout={handleRegionLayout}>
        {sheet && hasSequence && (
          <Animated.View
            style={[
              styles.staffSheet,
              { left: sheet.left, top: sheet.top },
              // Lying across the screen the instrument paints over the sheet's
              // empty skirt, which looks right; stood upright the sheet has to
              // come forward or the bell covers the notes.
              isRotated && sheet.turnsForBlow && styles.staffSheetLifted,
              sheetStyle,
            ]}
            pointerEvents="none"
            testID="staff-strip-wrapper"
          >
            {staffStrip(sheet.width)}
          </Animated.View>
        )}
        <View
          style={[
            styles.instrumentSurface,
            stage && { position: 'absolute', left: 0, right: 0, top: stage.surfaceTop, height: stage.layout.height },
          ]}
          testID="instrument-surface"
        >
          {surfaceLayout && (() => {
            const body = (
              <Animated.View
                style={[{
                  width: surfaceLayout.width,
                  height: surfaceLayout.height,
                  marginLeft: surfaceLayout.left,
                }, instrumentFlipStyle]}
                testID="instrument-body-flip"
              >
                <Image
                  source={artwork.image}
                  style={{ width: surfaceLayout.width, height: surfaceLayout.height }}
                  resizeMode="contain"
                  testID="instrument-artwork"
                />
                {artwork.bell && surfaceLayout.bell && (
                  <InstrumentBell bell={artwork.bell} placement={surfaceLayout.bell} noteEvents={challenge.noteEvents} />
                )}
                {noteLayout.map((item) => {
                  const position = surfaceLayout.positions[item.note];
                  if (!position) return null;
                  return (
                    <View key={item.note} style={[styles.holeButton, position]} testID={`note-hole-${item.note}`}>
                      {renderNoteButton(item, surfaceLayout.buttonSize, Math.round(surfaceLayout.buttonSize * 0.37), noteLabelStyle)}
                    </View>
                  );
                })}
              </Animated.View>
            );
            return body;
          })()}
        </View>
        <View style={[styles.lowerBlock, stage && { position: 'absolute', left: 0, right: 0, top: stage.lowerBlockTop, height: lowerBlockHeight }]} testID="lower-block">
      {/* Progress line under the instrument -the notes themselves are on the
          sheet above it. Uses currentSequence when the hook has one (Go Harder). */}
      {(() => {
        const displaySeq = challenge.currentSequence?.length > 0 ? challenge.currentSequence : requiredSequence;
        if (displaySeq.length === 0) return null;
        return (
          <View style={styles.sequenceContainer} testID="sequence-container">
            <Animated.Text
              style={[styles.sequenceProgress, { fontSize: scaledFontSize(12) }, instrumentRotationStyle, isPlayingSong && { opacity: 0 }]}
              testID="sequence-progress"
            >
              {Math.min(challenge.currentNoteIndex, displaySeq.length)}/{displaySeq.length}
            </Animated.Text>
          </View>
        );
      })()}

      {/* Bottom section: controls (not rotated) */}
      <View style={[styles.bottomSection, artwork && styles.sectionCompact, artwork && { height: bottomSectionHeight }]} testID="bottom-section">

        {/* Bottom row: controls change based on state */}
        <View style={[styles.bottomRow, isPlayingSong && { opacity: 0 }]}>
          {!uiHidden ? (
            <>
              <Pressable
                style={[
                  styles.modeToggleButton,
                  playMode === 'blow' && styles.modeToggleActive,
                ]}
                onPress={togglePlayMode}
                testID="play-mode-toggle"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="musical-note" size={scaledFontSize(12)} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={[styles.modeToggleText, { fontSize: scaledFontSize(14) }]}>
                    {playMode === 'blow' ? t('music.blowMode') : t('music.pressMode')}
                  </Text>
                </View>
              </Pressable>

              {/* Once the song has been played through the story can be carried
                  on, but the sheet stays playable -- it clears itself back to
                  the first note so it can simply be played again. */}
              {challenge.hasCompleted && (
                <Pressable
                  style={styles.continueButton}
                  onPress={onContinue}
                  testID="continue-story-button"
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.continueButtonText, { fontSize: scaledFontSize(15) }]}>{continueLabel ?? t('music.continueStory')}</Text>
                    <Ionicons name="chevron-forward" size={scaledFontSize(14)} color="#FFFFFF" style={{ marginLeft: 4 }} />
                  </View>
                </Pressable>
              )}

              {allowSkip && (
                <Pressable style={styles.skipButton} onPress={onSkip}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.skipButtonText, { fontSize: scaledFontSize(13) }]}>{t('music.skip')}</Text>
                    <Ionicons name="chevron-forward" size={scaledFontSize(12)} color="rgba(255,255,255,0.7)" style={{ marginLeft: 2 }} />
                  </View>
                </Pressable>
              )}
            </>
          ) : null}
        </View>
      </View>

        </View>
      </View>
      ) : (
        <>
        {hasSequence && tubeSheetWidth > 0 && (
          <View style={styles.staffSheetFlow} pointerEvents="none" testID="staff-strip-wrapper">
            {staffStrip(tubeSheetWidth)}
          </View>
        )}
        <View style={styles.instrumentBody}>
          <View style={styles.instrumentTube} testID="instrument-tube">
              <View style={styles.noteButtonsRow}>
              {noteLayout.map((item) => renderNoteButton(item, scaledButtonSize(60), scaledFontSize(22)))}
            </View>
          </View>

          {/* Mouthpiece on the right */}
          <View style={styles.mouthpiece}>
            <View style={styles.mouthpieceInner} />
          </View>
        </View>
      {/* Progress line under the instrument -the notes themselves are on the
          sheet above it. Uses currentSequence when the hook has one (Go Harder). */}
      {(() => {
        const displaySeq = challenge.currentSequence?.length > 0 ? challenge.currentSequence : requiredSequence;
        if (displaySeq.length === 0) return null;
        return (
          <View style={styles.sequenceContainer} testID="sequence-container">
            <Animated.Text
              style={[styles.sequenceProgress, { fontSize: scaledFontSize(12) }, instrumentRotationStyle, isPlayingSong && { opacity: 0 }]}
              testID="sequence-progress"
            >
              {Math.min(challenge.currentNoteIndex, displaySeq.length)}/{displaySeq.length}
            </Animated.Text>
          </View>
        );
      })()}

      {/* Bottom section: controls (not rotated) */}
      <View style={[styles.bottomSection, artwork && styles.sectionCompact, artwork && { height: bottomSectionHeight }]} testID="bottom-section">

        {/* Bottom row: controls change based on state */}
        <View style={[styles.bottomRow, isPlayingSong && { opacity: 0 }]}>
          {!uiHidden ? (
            <>
              <Pressable
                style={[
                  styles.modeToggleButton,
                  playMode === 'blow' && styles.modeToggleActive,
                ]}
                onPress={togglePlayMode}
                testID="play-mode-toggle"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="musical-note" size={scaledFontSize(12)} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={[styles.modeToggleText, { fontSize: scaledFontSize(14) }]}>
                    {playMode === 'blow' ? t('music.blowMode') : t('music.pressMode')}
                  </Text>
                </View>
              </Pressable>

              {/* Once the song has been played through the story can be carried
                  on, but the sheet stays playable -- it clears itself back to
                  the first note so it can simply be played again. */}
              {challenge.hasCompleted && (
                <Pressable
                  style={styles.continueButton}
                  onPress={onContinue}
                  testID="continue-story-button"
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.continueButtonText, { fontSize: scaledFontSize(15) }]}>{continueLabel ?? t('music.continueStory')}</Text>
                    <Ionicons name="chevron-forward" size={scaledFontSize(14)} color="#FFFFFF" style={{ marginLeft: 4 }} />
                  </View>
                </Pressable>
              )}

              {allowSkip && (
                <Pressable style={styles.skipButton} onPress={onSkip}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.skipButtonText, { fontSize: scaledFontSize(13) }]}>{t('music.skip')}</Text>
                    <Ionicons name="chevron-forward" size={scaledFontSize(12)} color="rgba(255,255,255,0.7)" style={{ marginLeft: 2 }} />
                  </View>
                </Pressable>
              )}
            </>
          ) : null}
        </View>
      </View>

        </>
      )}
      {/* Floating controls -bottom left in landscape, rotate with instrument in portrait */}
      {onMusicSheet && !uiHidden && (
        <Animated.View style={[
          styles.floatingControlsWrapper,
          { bottom: Math.max(insets.bottom + 20, 20), left: Math.max(insets.left + 20, 20) },
          instrumentRotationStyle,
        ]}>
          <Pressable
            style={[styles.floatingControlButton, { width: scaledButtonSize(44), height: scaledButtonSize(44), borderRadius: scaledButtonSize(22) }]}
            onPress={onMusicSheet}
            testID="music-sheet-button"
            accessibilityLabel={t('music.openMusicSheet')}
          >
            <MaterialIcons name="library-music" size={scaledFontSize(22)} color="#FFFFFF" testID="music-sheet-icon" />
          </Pressable>
        </Animated.View>
      )}

      {/* Hide/Unhide button -bottom right, aligned with burger menu */}
      <View style={[
        styles.floatingControlsWrapper,
        { bottom: Math.max(insets.bottom + 20, 20), right: Math.max(insets.right + 20, 20) },
      ]}>
        <Pressable
          style={[styles.floatingControlButton, { width: scaledButtonSize(44), height: scaledButtonSize(44), borderRadius: scaledButtonSize(22) }]}
          onPress={() => {
            const newVal = !uiHidden;
            setUiHidden(newVal);
            onVisibilityChange?.(newVal);
          }}
          testID="hide-ui-button"
          accessibilityLabel={uiHidden ? t('music.showControls') : t('music.hideControls')}
        >
          <MaterialIcons name={uiHidden ? 'visibility' : 'visibility-off'} size={scaledFontSize(22)} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  staffSheet: {
    position: 'absolute',
  },
  staffSheetLifted: {
    zIndex: 1,
  },
  staffSheetFlow: {
    alignItems: 'center',
  },
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: CONTAINER_PADDING,
  },

  // Top section: flex 1.8 to push instrument + sequence lower
  topSection: {
    flex: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  promptContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    maxWidth: '85%',
  },

  // Bottom section: flex 1 so it shares space equally with top, keeping instrument centered
  bottomSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 16,
    gap: 10,
  },
  promptText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Rotate button -absolutely positioned at far left inside tube
  sectionCompact: {
    flex: 0,
    paddingVertical: 0,
    paddingBottom: 0,
  },
  instrumentSurface: {
    alignSelf: 'stretch',
    marginHorizontal: -CONTAINER_PADDING,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  topSectionFloating: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  instrumentRegion: {
    flex: 1,
    alignSelf: 'stretch',
  },
  lowerBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  holeButton: {
    position: 'absolute',
  },

  // Instrument body -horizontal across the screen
  instrumentBody: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
  },
  instrumentTube: {
    flex: 1,
    backgroundColor: 'rgba(60, 60, 80, 0.6)',
    borderRadius: 28,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    minHeight: 90,
    justifyContent: 'center',
  },
  noteButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 26,
  },

  // Mouthpiece on the right
  mouthpiece: {
    width: 32,
    height: 50,
    backgroundColor: 'rgba(80, 80, 100, 0.7)',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -2,
    borderWidth: 2,
    borderLeftWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  mouthpieceInner: {
    width: 10,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 5,
  },

  // Note buttons on the instrument -circular with letter only
  noteButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  noteButtonHighlighted: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#FFF',
    shadowOpacity: 0.6,
  },
  noteButtonLetter: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Sequence progress dots -below instrument
  sequenceContainer: {
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  sequenceProgress: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.6,
  },

  // Bottom row -mode toggle, feedback, skip
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  modeToggleButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modeToggleActive: {
    backgroundColor: 'rgba(78, 205, 196, 0.5)',
    borderColor: '#4ECDC4',
  },
  modeToggleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  blowHint: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.7,
  },
  feedbackWrong: {
    color: '#FF6B6B',
    fontSize: 15,
    fontWeight: '600',
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  skipButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    opacity: 0.7,
  },
  floatingControlsWrapper: {
    position: 'absolute',
    zIndex: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  floatingControlButton: {
    backgroundColor: 'rgba(80, 60, 140, 0.85)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  // Celebration (shown above instrument on completion -landscape, no rotation)
  // Celebration when rotated -stays in the top section so it doesn't overlap note buttons
  // Retry + Continue buttons
  continueButton: {
    backgroundColor: 'rgba(80, 60, 160, 0.9)',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});