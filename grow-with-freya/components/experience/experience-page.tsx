import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ageMonthsToRange } from '@/constants/age-range';
import { useAppStore } from '@/store/app-store';
import type { ShellResult } from '@/types/game-pack';
import type { PlanAgeRange } from '@/types/learning-plan';
import { ExperienceShell } from './experience-shell';

export interface GameLaunch {
  packId: string;
  missionId: string | null;
  key: number;
}

export interface ExperiencePageProps {
  launch: GameLaunch | null;
  isActive: boolean;
  onDone: (result: ShellResult) => void;
}

export const DEFAULT_AGE_MONTHS = 36;

export function bandFor(ageInMonths: number | null | undefined): PlanAgeRange {
  const range = ageMonthsToRange(ageInMonths ?? DEFAULT_AGE_MONTHS);
  return range === 'all' ? '2-4' : range;
}

export const ExperiencePage = memo(function ExperiencePage({ launch, isActive, onDone }: ExperiencePageProps) {
  const ageInMonths = useAppStore((state) => state.childAgeInMonths);

  return (
    <View testID="experience-page" style={styles.root}>
      {launch ? (
        <ExperienceShell key={launch.key} packId={launch.packId} missionId={launch.missionId} band={bandFor(ageInMonths)} isActive={isActive} onDone={onDone} />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#2B2A5E',
  },
});
