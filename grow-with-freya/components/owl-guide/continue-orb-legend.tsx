import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ImageSource } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { STAT_ORB } from '@/constants/stat-orbs';
import { ALL_STORIES } from '@/data/stories';
import { StatOrbBookmark, StatOrbCover, StatOrbFace } from '@/components/home/stat-orbs';
import { useContinueStory } from '@/components/home/use-continue-story';

const ORB_SIZE = STAT_ORB.smallest;

function sampleCover(): ImageSource | number | undefined {
  const story = ALL_STORIES.find((candidate) => candidate.coverImage);
  if (!story?.coverImage) return undefined;

  return typeof story.coverImage === 'string' ? { uri: story.coverImage } : (story.coverImage as ImageSource | number);
}

export function ContinueOrbLegend({ testID = 'continue-orb-legend' }: { testID?: string }) {
  const { t } = useTranslation();
  const story = useContinueStory();
  const cover = (story?.coverImage as ImageSource | number | undefined) ?? sampleCover();

  return (
    <View style={styles.row} testID={testID}>
      <View testID={`${testID}-before`} style={styles.orb}>
        <StatOrbFace kind="continue" diameter={ORB_SIZE} lit={false} invitation={t('home.statOrb.readToBookmark')}>
          <StatOrbBookmark diameter={ORB_SIZE} inviting />
        </StatOrbFace>
      </View>

      <View testID={`${testID}-arrow`} style={styles.arrow}>
        <Ionicons name="arrow-forward" size={20} color="rgba(255, 255, 255, 0.78)" />
      </View>

      <View testID={`${testID}-after`} style={styles.orb}>
        <StatOrbFace kind="continue" diameter={ORB_SIZE} lit caption={t('home.statOrb.continue')}>
          {cover !== undefined ? (
            <StatOrbCover diameter={ORB_SIZE} source={cover} testID={`${testID}-cover`} />
          ) : (
            <StatOrbBookmark diameter={ORB_SIZE} />
          )}
        </StatOrbFace>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    marginTop: 18,
    marginBottom: 14,
  },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
  },
  arrow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
