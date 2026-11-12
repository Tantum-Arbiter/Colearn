import React, { memo, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { RADIUS_CARD, SPACE_2, SPACE_3, SPACE_4 } from '@/components/child-ui/tokens';
import { ChooseEngine, LEAVE_MS, pictureSource, type ChooseEvent } from '@/components/experience/engines/choose/choose-engine';
import { SAFE_ZONE, centredTray, trayFrame } from '@/components/experience/engines/choose/choose-layout';
import { engineFor } from '@/components/experience/engines';
import { SceneEngine, type SceneEvent } from '@/components/experience/engines/scene/scene-engine';
import { spotFrame } from '@/components/experience/engines/scene/scene-layout';
import type { ScreenFrame } from '@/components/experience/engines/place/place-geometry';
import { CELEBRATION } from '@/components/experience/experience-shell';
import { shellReducer, startingShell } from '@/components/experience/shell-state';
import { motionDuration } from '@/constants/child-ui-motion';
import { Fonts } from '@/constants/theme';
import type { SupportedLanguage } from '@/services/i18n';
import type { PlanAgeRange } from '@/types/learning-plan';
import type { AgeGroup, AgeGroupText, LearningChallenge } from '@/types/story';
import { challengeView } from './learning-challenge-view';
import type { ChallengeTips } from './learning-tips';
import { patchFrame } from './page-frame';

export interface PageChrome {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const NO_CHROME: PageChrome = { top: 0, bottom: 0, left: 0, right: 0 };

export const PROMPT_HEIGHT = 48;

export interface ChallengeResult {
  tips: ChallengeTips | null;
  storyText: AgeGroupText | null;
}

export interface LearningChallengeHostProps {
  challenge: LearningChallenge;
  band: PlanAgeRange;
  language: SupportedLanguage;
  ageGroup: AgeGroup;
  screen: { width: number; height: number };
  /** Where the page art sits on screen; the screen itself when the book is not cover-fit. */
  art?: ScreenFrame;
  trayArt?: ScreenFrame;
  chrome?: PageChrome;
  isTablet: boolean;
  reduceMotion: boolean;
  onDone: (result: ChallengeResult) => void;
  testID?: string;
}

export const LearningChallengeHost = memo(function LearningChallengeHost({
  challenge,
  band,
  language,
  ageGroup,
  screen,
  art,
  trayArt,
  chrome = NO_CHROME,
  isTablet,
  reduceMotion,
  onDone,
  testID = 'learning-challenge-host',
}: LearningChallengeHostProps) {
  const [shell, dispatch] = useReducer(shellReducer, Date.now(), startingShell);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const reported = useRef(false);
  const view = useMemo(() => challengeView(challenge, band, language, ageGroup), [challenge, band, language, ageGroup]);
  const promptTop = chrome.top + SPACE_2;
  const stageBottom = screen.height - chrome.bottom - SPACE_3;
  const frame = useMemo<ScreenFrame>(() => art ?? { left: 0, top: 0, width: screen.width, height: screen.height }, [art, screen]);
  const tray = useMemo(() => {
    const below = promptTop + PROMPT_HEIGHT + SPACE_3;
    if (isTablet && screen.width > screen.height) return centredTray(screen, below);
    const basis = trayArt ?? frame;
    return trayFrame(basis, { top: below, bottom: Math.min(stageBottom, basis.top + basis.height * SAFE_ZONE.bottom) });
  }, [frame, trayArt, isTablet, screen, promptTop, stageBottom]);
  const { phase } = shell;
  const resolving = phase === 'celebrating';
  const inPlay = phase === 'intro' || phase === 'playing' || phase === 'paused';
  const scene = engineFor(challenge.family) === 'scene';
  const spots = useMemo(() => view.spots.map((spot) => ({ id: spot.id, label: spot.label, frame: spotFrame(spot.hotspot, frame) })), [view.spots, frame]);
  const chosen = view.choices.find((choice) => choice.id === chosenId);
  const found = view.spots.find((spot) => spot.id === chosenId);
  const outcome = chosen ?? found;
  const teaching = phase === 'celebrating' && (chosen?.tips?.length ?? 0) > 0;

  useEffect(() => {
    dispatch({ type: 'loaded', at: Date.now() });
  }, []);

  useEffect(() => {
    if (!resolving) return undefined;
    const wait = teaching ? (reduceMotion ? 0 : LEAVE_MS) : motionDuration(CELEBRATION, reduceMotion);
    const timer = setTimeout(() => dispatch({ type: 'celebrated', at: Date.now() }), wait);
    return () => clearTimeout(timer);
  }, [resolving, teaching, reduceMotion]);

  useEffect(() => {
    if (phase === 'bridge') dispatch({ type: 'finish', at: Date.now() });
  }, [phase]);

  useEffect(() => {
    if (phase !== 'done' || reported.current) return;
    reported.current = true;
    onDone({
      tips: chosen?.tips?.length ? { picture: chosen.image, label: chosen.label, heading: chosen.successLine ?? view.successLine, tips: chosen.tips } : null,
      storyText: challenge.items.find((item) => item.id === chosenId)?.outcome?.storyText ?? null,
    });
  }, [phase, chosen, chosenId, challenge.items, view.successLine, onDone]);

  const handleEngineEvent = useCallback((event: ChooseEvent | SceneEvent) => {
    if (event.type === 'first-action-shown') dispatch({ type: 'introDone', at: Date.now() });
    else if (event.type === 'complete') {
      setChosenId(event.choice);
      dispatch({ type: 'complete', at: Date.now() });
    }
  }, []);

  const prompt = phase === 'celebrating' ? outcome?.successLine ?? view.successLine : view.instruction;
  const promptSize = isTablet ? 20 : 16;
  const after = (phase === 'celebrating' && outcome?.stateAfter) || challenge.stateAfter;
  const showEngine = inPlay || phase === 'celebrating';

  return (
    <View testID={testID} style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={[StyleSheet.absoluteFill, styles.veil]} pointerEvents="none" />

      {after && resolving ? (
        <Image
          testID="learning-challenge-after"
          source={pictureSource(after.image)}
          style={{ position: 'absolute', ...patchFrame(after, frame) }}
          contentFit="contain"
          transition={reduceMotion ? 0 : 300}
          accessible={false}
        />
      ) : null}

      {showEngine && scene ? <SceneEngine spots={spots} mode={view.mode} target={view.target} reduceMotion={reduceMotion} paused={phase !== 'playing' && phase !== 'intro'} onEvent={handleEngineEvent} /> : null}
      {showEngine && !scene ? <ChooseEngine choices={view.choices} target={view.target} tray={tray} reduceMotion={reduceMotion} paused={phase !== 'playing' && phase !== 'intro'} leaving={teaching} onEvent={handleEngineEvent} /> : null}

      {teaching || !(inPlay || resolving) ? null : <View testID="learning-challenge-prompt" pointerEvents="none" style={[styles.prompt, { top: promptTop, minHeight: PROMPT_HEIGHT, left: chrome.left + SPACE_4, right: chrome.right + SPACE_4 }]}>
        <Text style={[styles.promptText, { fontSize: promptSize }]} numberOfLines={2}>
          {prompt}
        </Text>
      </View>}

      <View testID={`learning-phase-${phase}`} pointerEvents="none" style={styles.marker} />
    </View>
  );
});

const styles = StyleSheet.create({
  veil: {
    backgroundColor: 'rgba(10, 15, 44, 0.3)',
  },
  prompt: {
    position: 'absolute',
    justifyContent: 'center',
    paddingHorizontal: SPACE_4,
    paddingVertical: SPACE_2,
    borderRadius: RADIUS_CARD,
    backgroundColor: 'rgba(10, 15, 44, 0.6)',
  },
  promptText: {
    fontFamily: Fonts.rounded,
    fontWeight: '600',
    color: '#FFF6E3',
    textAlign: 'center',
  },
  marker: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: 2,
    height: 2,
  },
});
