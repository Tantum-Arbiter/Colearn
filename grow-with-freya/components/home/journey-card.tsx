import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Fonts } from '@/constants/theme';
import {
  HOME_CARDS,
  HOME_CARD_TINTS,
  HOME_CARD_TYPE,
  formatReadingTime,
  homeTileWidth,
  type StatIconKind,
} from '@/constants/home-journey';
import { HomeCard } from './home-card';
import { StatIcon } from './stat-icons';

export interface JourneyCardProps {
  storiesCompleted: number;
  readingMinutes: number;
  readingStreakDays: number;
  screenTimeSafety?: number;
  width: number;
  animated: boolean;
  onPress: () => void;
  testID?: string;
}

interface Tile {
  id: string;
  icon: StatIconKind;
  value: string;
  label: string;
}

interface StatTileProps {
  tile: Tile;
  index: number;
  width: number;
  animated: boolean;
}

const StatTile = memo(function StatTile({ tile, index, width, animated }: StatTileProps) {
  return (
    <View testID={`journey-tile-${tile.id}`} style={[styles.tile, { width }]}>
      <StatIcon kind={tile.icon} size={HOME_CARDS.tileIcon} index={index} animated={animated} />
      <Text testID={`journey-tile-${tile.id}-value`} style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {tile.value}
      </Text>
      <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
        {tile.label}
      </Text>
    </View>
  );
});

export const JourneyCard = memo(function JourneyCard({
  storiesCompleted,
  readingMinutes,
  readingStreakDays,
  screenTimeSafety,
  width,
  animated,
  onPress,
  testID = 'journey-card',
}: JourneyCardProps) {
  const { t } = useTranslation();
  const time = formatReadingTime(readingMinutes);

  const tiles: Tile[] = [
    { id: 'stories', icon: 'book', value: String(storiesCompleted), label: t('home.journey.storiesLabel') },
    {
      id: 'time',
      icon: 'clock',
      value: time.hours > 0 ? t('home.journey.timeLong', { hours: time.hours, minutes: time.minutes }) : t('home.journey.timeShort', { minutes: time.minutes }),
      label: t('home.journey.timeLabel'),
    },
  ];

  if (screenTimeSafety !== undefined) {
    tiles.push({ id: 'safety', icon: 'shield', value: `${screenTimeSafety}%`, label: t('home.journey.safetyLabel') });
  }

  tiles.push(
    readingStreakDays > 0
      ? { id: 'streak', icon: 'flame', value: t('home.journey.streakDays', { count: readingStreakDays }), label: t('home.journey.streakLabel') }
      : { id: 'streak-start', icon: 'flame', value: t('home.journey.streakStart'), label: t('home.journey.streakStartLabel') }
  );

  const tileWidth = homeTileWidth(width, tiles.length);

  return (
    <HomeCard
      testID={testID}
      width={width}
      onPress={onPress}
      accessibilityLabel={t('home.journey.title')}
      accessibilityHint={t('home.journey.hint')}
    >
      <View style={styles.inner}>
        <Text style={styles.heading}>{t('home.journey.title')}</Text>
        <View style={styles.tiles}>
          {tiles.map((tile, index) => (
            <StatTile key={tile.id} tile={tile} index={index} width={tileWidth} animated={animated} />
          ))}
        </View>
      </View>
    </HomeCard>
  );
});

const styles = StyleSheet.create({
  inner: {
    padding: HOME_CARDS.padding,
  },
  heading: {
    fontFamily: Fonts.rounded,
    fontSize: HOME_CARD_TYPE.cardHeading,
    fontWeight: '800',
    color: HOME_CARD_TINTS.title,
    marginBottom: 6,
  },
  tiles: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tile: {
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 3,
    borderRadius: HOME_CARDS.tileRadius,
    backgroundColor: HOME_CARD_TINTS.tileFill,
    borderWidth: 1,
    borderColor: HOME_CARD_TINTS.tileEdge,
  },
  value: {
    fontFamily: Fonts.rounded,
    fontSize: HOME_CARD_TYPE.tileValue,
    fontWeight: '800',
    color: HOME_CARD_TINTS.title,
    marginTop: 5,
  },
  label: {
    fontFamily: Fonts.rounded,
    fontSize: HOME_CARD_TYPE.tileLabel,
    fontWeight: '600',
    color: HOME_CARD_TINTS.body,
    textAlign: 'center',
    marginTop: 1,
    lineHeight: HOME_CARD_TYPE.tileLabel + 3,
  },
});
