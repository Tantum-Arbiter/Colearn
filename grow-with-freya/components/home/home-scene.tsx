import React, { memo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MusicControl } from '@/components/ui/music-control';
import { Fonts } from '@/constants/theme';
import {
  HOME_ACTIVITIES,
  HOME_SCENE_LAYOUT,
  HOME_SCENE_TYPE,
  HOME_THEMES,
  homeCardHeight,
  type HomeActivity,
  type TimeOfDay,
} from '@/constants/home-scene';
import { SCREEN_TIME_RING, ringCentre } from '@/constants/screen-time-ring';
import { useTimeOfDay } from '@/hooks/use-time-of-day';
import type { ScreenTimeAllowance } from '@/hooks/use-screen-time-allowance';
import { NightSky } from './night-sky';
import { SkyFace } from './sky-face';
import { GrownUpsPill } from './grown-ups-pill';
import { ActivityCard } from './activity-card';
import { ScreenTimeRing } from './screen-time-ring';
import { UnlockPlanButton } from './unlock-plan-button';
import { ContinueTogetherCard } from './continue-together-card';

export interface ContinueReadingSummary {
  storyId: string;
  title: string;
  coverImage: string;
  pageIndex: number;
  totalPages: number;
}

export interface HomeSceneProps {
  onNavigate: (destination: string) => void;
  onOpenGrownUps: () => void;
  onContinueReading: (storyId: string) => void;
  continueReading: ContinueReadingSummary | null;
  screenTime?: ScreenTimeAllowance | null;
  /** Receives the ring's centre so the glance can open out of it. */
  onOpenScreenTime?: (origin: { x: number; y: number }) => void;
  /** True while the glance is open -- the ring steps aside for the orb that
   *  rises in its place. */
  screenTimeHidden?: boolean;
  onOpenPlans?: () => void;
  timeOfDay?: TimeOfDay;
  testID?: string;
}

export const HomeScene = memo(function HomeScene({
  onNavigate,
  onOpenGrownUps,
  onContinueReading,
  continueReading,
  screenTime = null,
  onOpenScreenTime,
  screenTimeHidden = false,
  onOpenPlans,
  timeOfDay,
  testID = 'home-scene',
}: HomeSceneProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const clockTimeOfDay = useTimeOfDay();
  const activeTimeOfDay = timeOfDay ?? clockTimeOfDay;
  const theme = HOME_THEMES[activeTimeOfDay];

  const cardWidth = width - HOME_SCENE_LAYOUT.screenMargin * 2;
  const cardHeight = homeCardHeight(width);
  const continueWidth = width - HOME_SCENE_LAYOUT.continueInset * 2;
  const skyFaceSize = Math.round(width * HOME_SCENE_LAYOUT.skyFaceSizeRatio);

  const handleActivity = useCallback(
    (activity: HomeActivity) => {
      onNavigate(activity.destination);
    },
    [onNavigate]
  );

  const handleContinue = useCallback(() => {
    if (continueReading) {
      onContinueReading(continueReading.storyId);
    }
  }, [continueReading, onContinueReading]);

  return (
    <View testID={testID} style={[styles.root, { backgroundColor: theme.skyTop }]}>
      <NightSky width={width} height={height} timeOfDay={activeTimeOfDay} />

      <View style={[styles.moon, { top: insets.top + 6 }]} pointerEvents="none">
        <SkyFace size={skyFaceSize} timeOfDay={activeTimeOfDay} />
      </View>

      <View style={[styles.chrome, { top: insets.top + HOME_SCENE_LAYOUT.chromeTop }]}>
        <GrownUpsPill timeOfDay={activeTimeOfDay} onPress={onOpenGrownUps} />
        <MusicControl />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + skyFaceSize + 26, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.greeting, { color: theme.title }]}>{t('home.greeting')}</Text>

        {continueReading ? (
          <View style={styles.continueSlot}>
            <ContinueTogetherCard
              title={continueReading.title}
              coverImage={continueReading.coverImage}
              pageIndex={continueReading.pageIndex}
              totalPages={continueReading.totalPages}
              width={continueWidth}
              timeOfDay={activeTimeOfDay}
              onPress={handleContinue}
            />
          </View>
        ) : null}

        {HOME_ACTIVITIES.map((activity) => (
          <View key={activity.id} style={styles.cardSlot}>
            <ActivityCard
              testID={`activity-card-${activity.id}`}
              activity={activity}
              width={cardWidth}
              height={cardHeight}
              timeOfDay={activeTimeOfDay}
              onPress={handleActivity}
            />
          </View>
        ))}

        {/* the offer sits with the cards it is an offer about, rather than
            floating over the art -- the bottom edge belongs to the ring */}
        {onOpenPlans ? (
          <View style={styles.planSlot}>
            <UnlockPlanButton onPress={onOpenPlans} />
          </View>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.screenTimeBar,
          { bottom: insets.bottom + SCREEN_TIME_RING.marginBottom },
        ]}
        pointerEvents="box-none"
      >
        {screenTime ? (
          <ScreenTimeRing
            usageSeconds={screenTime.usageSeconds}
            limitSeconds={screenTime.limitSeconds}
            tint={theme.chromeInk}
            onPress={
              onOpenScreenTime
                ? () => onOpenScreenTime(ringCentre(width, height, insets.bottom))
                : undefined
            }
            hidden={screenTimeHidden}
          />
        ) : null}
      </View>

    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  moon: {
    position: 'absolute',
    alignSelf: 'center',
  },
  chrome: {
    position: 'absolute',
    left: HOME_SCENE_LAYOUT.screenMargin,
    right: HOME_SCENE_LAYOUT.screenMargin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  content: {
    alignItems: 'center',
  },
  greeting: {
    fontFamily: Fonts.rounded,
    fontSize: HOME_SCENE_TYPE.greeting,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 22,
  },
  continueSlot: {
    marginBottom: 22,
  },
  cardSlot: {
    marginBottom: HOME_SCENE_LAYOUT.cardGap,
  },
  // centred along the bottom edge: this is where the glance's orb rises
  // from and where its closing drop falls back to, so it has to match
  // `ringCentre`
  screenTimeBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  planSlot: {
    alignItems: 'center',
    marginTop: 6,
  },
});
