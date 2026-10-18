import React, { memo, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View, useWindowDimensions, type AppStateStatus } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { CircleActionButton } from '@/components/child-ui/circle-action-button';
import { GoldButton } from '@/components/child-ui/gold-button';
import { CIRCLE_BUTTON_DIAMETER_PHONE, CIRCLE_BUTTON_DIAMETER_TABLET, RADIUS_CARD, SPACE_3, SPACE_4, SPACE_5, contentMargin, journeyHeaderTop } from '@/components/child-ui/tokens';
import { motionDuration, type MotionBeat } from '@/constants/child-ui-motion';
import { Fonts } from '@/constants/theme';
import { useGlobalSound } from '@/contexts/global-sound-context';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useSettledAfterTransition } from '@/hooks/use-ambient-animation';
import { loadPack, type LoadedPack } from '@/services/pack-service';
import ScreenTimeService, { type ScreenTimeWarning } from '@/services/screen-time-service';
import { useAppStore } from '@/store/app-store';
import type { EngineSave, ShellResult } from '@/types/game-pack';
import type { PlanAgeRange } from '@/types/learning-plan';
import { PlaceEngine, type EngineEvent } from './engines/place/place-engine';
import { usePackSounds } from './pack-sounds';
import { shellReducer, startingShell, type ShellPhase } from './shell-state';

export interface ExperienceShellProps {
  packId: string;
  missionId: string | null;
  band: PlanAgeRange;
  isActive: boolean;
  onDone: (result: ShellResult) => void;
  testID?: string;
}

export const CELEBRATION: MotionBeat = { duration: 2000, reducedDuration: 900 };

const BRIDGE_ROWS = [
  { key: 'atHome', icon: 'home-outline' },
  { key: 'outdoors', icon: 'leaf-outline' },
  { key: 'creative', icon: 'color-palette-outline' },
] as const;

const SHOWS_ENGINE: readonly ShellPhase[] = ['intro', 'playing', 'paused', 'celebrating', 'bridge'];

export const ExperienceShell = memo(function ExperienceShell({ packId, missionId, band, isActive, onDone, testID = 'experience-shell' }: ExperienceShellProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { isTablet, scaledFontSize } = useAccessibility();
  const { isMuted } = useGlobalSound();
  const reduceMotion = useReducedMotion();
  const settled = useSettledAfterTransition(isActive);
  const gameSaveFor = useAppStore((state) => state.gameSaveFor);
  const saveGame = useAppStore((state) => state.saveGame);
  const clearGameSave = useAppStore((state) => state.clearGameSave);
  const recordMissionFinished = useAppStore((state) => state.recordMissionFinished);
  const [shell, dispatch] = useReducer(shellReducer, Date.now(), startingShell);
  const [pack, setPack] = useState<LoadedPack | null>(null);
  const [promptKey, setPromptKey] = useState<string | null>(null);
  const [resumeFrom] = useState<EngineSave | null>(() => {
    const kept = gameSaveFor(packId);
    return kept && kept.missionId === missionId ? kept : null;
  });
  const latestSave = useRef<EngineSave | null>(resumeFrom);
  const reported = useRef(false);
  const sounds = usePackSounds(pack, isMuted);
  const mission = useMemo(() => pack?.mission(missionId) ?? null, [pack, missionId]);
  const { phase } = shell;
  const done = phase === 'done';

  useEffect(() => {
    let alive = true;
    loadPack(packId)
      .then((loaded) => {
        if (!alive) return;
        setPack(loaded);
        dispatch({ type: 'loaded', at: Date.now() });
      })
      .catch(() => {
        if (alive) dispatch({ type: 'failed', at: Date.now() });
      });
    return () => {
      alive = false;
    };
  }, [packId]);

  useEffect(() => {
    if (!mission) return;
    const stage = Math.min(resumeFrom?.stage ?? 0, Math.max(mission.byAge[band].stages.length - 1, 0));
    setPromptKey(mission.byAge[band].stages[stage]?.promptKey ?? mission.promptKey);
  }, [band, mission, resumeFrom]);

  useEffect(() => {
    if (done) return undefined;
    const handleWarning = (warning: ScreenTimeWarning) => {
      if (warning.type === 'limit_reached') dispatch({ type: 'limitReached', at: Date.now() });
    };
    const service = ScreenTimeService.getInstance();
    service.onWarning(handleWarning);
    return () => service.removeWarningCallback(handleWarning);
  }, [done]);

  useEffect(() => {
    if (done) return undefined;
    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      dispatch({ type: next === 'active' ? 'resume' : 'pause', at: Date.now() });
    });
    return () => subscription.remove();
  }, [done]);

  useEffect(() => {
    if (phase !== 'celebrating') return undefined;
    if (missionId !== null) recordMissionFinished(packId, missionId);
    clearGameSave(packId);
    latestSave.current = null;
    const timer = setTimeout(() => dispatch({ type: 'celebrated', at: Date.now() }), motionDuration(CELEBRATION, reduceMotion));
    return () => clearTimeout(timer);
  }, [phase, packId, missionId, recordMissionFinished, clearGameSave, reduceMotion]);

  useEffect(() => {
    if (!done || reported.current) return;
    reported.current = true;
    if (shell.left && latestSave.current) saveGame(packId, latestSave.current);
    const durationMs = Math.max(0, Date.now() - shell.startedAt);
    onDone(
      shell.left || missionId === null
        ? { outcome: 'left', packId, missionId, durationMs }
        : { outcome: 'completed', packId, missionId, durationMs }
    );
  }, [done, shell.left, shell.startedAt, missionId, packId, onDone, saveGame]);

  const handleEngineEvent = useCallback((event: EngineEvent) => {
    if (event.type === 'first-action-shown') dispatch({ type: 'introDone', at: Date.now() });
    else if (event.type === 'complete') dispatch({ type: 'complete', at: Date.now() });
    else if (event.type === 'save') latestSave.current = event.save;
    else if (event.type === 'stage') setPromptKey(event.promptKey);
  }, []);

  const handleBack = useCallback(() => dispatch({ type: 'back', at: Date.now() }), []);
  const handleFinish = useCallback(() => dispatch({ type: 'finish', at: Date.now() }), []);

  const margin = contentMargin(isTablet);
  const chromeTop = journeyHeaderTop(insets.top, isTablet);
  const buttonSize = isTablet ? CIRCLE_BUTTON_DIAMETER_TABLET : CIRCLE_BUTTON_DIAMETER_PHONE;
  const screen = useMemo(
    () => ({ width, height, insets: { top: chromeTop + buttonSize + SPACE_3, bottom: insets.bottom, left: insets.left, right: insets.right } }),
    [width, height, chromeTop, buttonSize, insets.bottom, insets.left, insets.right]
  );
  const bridgeId = mission?.bridgeActivityId ?? null;

  return (
    <View testID={testID} style={styles.root}>
      {pack && SHOWS_ENGINE.includes(phase) ? (
        <PlaceEngine
          pack={pack}
          mission={mission}
          band={band}
          crop={isTablet ? 'tablet' : 'phone'}
          screen={screen}
          reduceMotion={reduceMotion}
          paused={phase !== 'playing' && phase !== 'intro'}
          demo={phase === 'intro' && settled}
          save={resumeFrom}
          sounds={sounds}
          onEvent={handleEngineEvent}
        />
      ) : null}

      {phase === 'loading' ? (
        <View testID="experience-loading" style={styles.centre} pointerEvents="none">
          <Text style={[styles.loading, { fontSize: scaledFontSize(16) }]}>{t('experience.loading')}</Text>
        </View>
      ) : null}

      {promptKey && (phase === 'intro' || phase === 'playing' || phase === 'paused') ? (
        <View testID="experience-prompt" pointerEvents="none" style={[styles.prompt, { top: chromeTop, left: margin + buttonSize + SPACE_3, right: margin + buttonSize + SPACE_3, minHeight: buttonSize }]}>
          <Text style={[styles.promptText, { fontSize: scaledFontSize(isTablet ? 18 : 15) }]} numberOfLines={2}>
            {t(promptKey)}
          </Text>
        </View>
      ) : null}

      {phase === 'paused' ? (
        <View testID="experience-paused" style={styles.veil} pointerEvents="none">
          <Text style={[styles.veilText, { fontSize: scaledFontSize(22) }]}>{t('experience.paused')}</Text>
        </View>
      ) : null}

      {phase === 'celebrating' ? (
        <View testID="experience-celebrating" style={styles.veil} pointerEvents="none">
          <Ionicons name="checkmark-circle" size={scaledFontSize(isTablet ? 96 : 72)} color="#FFE14A" />
          <Text style={[styles.veilText, { fontSize: scaledFontSize(isTablet ? 30 : 24) }]}>{t('experience.wellDone')}</Text>
        </View>
      ) : null}

      {phase === 'bridge' && bridgeId ? (
        <View testID="experience-bridge" style={[styles.veil, { paddingTop: chromeTop + buttonSize + SPACE_4, paddingBottom: insets.bottom + SPACE_5 }]}>
          <View style={[styles.card, { maxWidth: isTablet ? 560 : 420 }]}>
            <Text style={[styles.cardTitle, { fontSize: scaledFontSize(isTablet ? 24 : 20) }]}>{t('experience.bridgeTitle')}</Text>
            {BRIDGE_ROWS.map((row) => (
              <View key={row.key} testID={`experience-bridge-${row.key}`} style={styles.row}>
                <Ionicons name={row.icon} size={scaledFontSize(22)} color="#FFE14A" style={styles.rowIcon} />
                <View style={styles.rowWords}>
                  <Text style={[styles.rowTitle, { fontSize: scaledFontSize(isTablet ? 17 : 15) }]}>{t(`bridges.${bridgeId}.${row.key}.title`)}</Text>
                  <Text style={[styles.rowBody, { fontSize: scaledFontSize(isTablet ? 15 : 13) }]}>{t(`bridges.${bridgeId}.${row.key}.body`)}</Text>
                </View>
              </View>
            ))}
            <View style={styles.finish}>
              <GoldButton label={t('experience.finish')} icon="checkmark" onPress={handleFinish} accessibilityLabel={t('experience.finish')} testID="experience-finish" />
            </View>
          </View>
        </View>
      ) : null}

      <View testID={`experience-phase-${phase}`} pointerEvents="none" style={styles.marker} />

      {!done ? (
        <View testID="experience-chrome" style={[styles.chrome, { top: chromeTop, left: margin }]}>
          <CircleActionButton type="back" onPress={handleBack} accessibilityLabel={t('experience.back')} testID="experience-back" />
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#2B2A5E',
  },
  centre: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    fontFamily: Fonts.rounded,
    color: '#FFF6E3',
  },
  chrome: {
    position: 'absolute',
  },
  prompt: {
    position: 'absolute',
    justifyContent: 'center',
    paddingHorizontal: SPACE_4,
    paddingVertical: SPACE_3,
    borderRadius: RADIUS_CARD,
    backgroundColor: 'rgba(10, 15, 44, 0.45)',
  },
  promptText: {
    fontFamily: Fonts.rounded,
    fontWeight: '600',
    color: '#FFF6E3',
    textAlign: 'center',
  },
  veil: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 15, 44, 0.55)',
    paddingHorizontal: SPACE_5,
  },
  veilText: {
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: '#FFF6E3',
    marginTop: SPACE_3,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    borderRadius: RADIUS_CARD,
    backgroundColor: 'rgba(16, 22, 60, 0.92)',
    padding: SPACE_5,
    gap: SPACE_4,
  },
  cardTitle: {
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: '#FFF6E3',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE_3,
  },
  rowIcon: {
    marginTop: 2,
  },
  rowWords: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: '#FFF6E3',
  },
  rowBody: {
    fontFamily: Fonts.rounded,
    color: '#D9DFF6',
  },
  finish: {
    alignItems: 'center',
    marginTop: SPACE_3,
  },
  marker: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: 2,
    height: 2,
  },
});
