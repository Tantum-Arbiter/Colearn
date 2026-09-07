import React, { memo, type RefObject } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MusicControl } from '@/components/ui/music-control';
import { Fonts } from '@/constants/theme';
import { HOME_SCENE_LAYOUT, HOME_THEMES, type TimeOfDay } from '@/constants/home-scene';
import { HOME_CARDS, HOME_CARD_TYPE, homeContentWidth } from '@/constants/home-journey';
import { HERO_SKY, heroContentTop, sunFrame } from '@/constants/home-sky';
import { SCREEN_TIME_RING, ringCentre } from '@/constants/screen-time-ring';
import { useTimeOfDay } from '@/hooks/use-time-of-day';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useSettledAfterTransition } from '@/hooks/use-ambient-animation';
import type { ScreenTimeAllowance } from '@/hooks/use-screen-time-allowance';
import type { ChildHomeData, WelcomeCopy } from '@/types/child-home';
import { NightSky } from './night-sky';
import { HomeHeroSky } from './home-hero-sky';
import { GrownUpsPill } from './grown-ups-pill';
import { ScreenTimeRing } from './screen-time-ring';
import { UnlockPlanButton } from './unlock-plan-button';
import { ContinueCard } from './continue-card';
import { StreakChip } from './streak-chip';
import { AchievementCard } from './achievement-card';
import { ContinueLearningCard } from './continue-learning-card';

export interface HomeGuideTargets {
  stories?: RefObject<View | null>;
  achievement?: RefObject<View | null>;
  learning?: RefObject<View | null>;
  screenTime?: RefObject<View | null>;
  settings?: RefObject<View | null>;
  sound?: RefObject<View | null>;
}

export interface HomeSceneProps {
  data: ChildHomeData;
  welcome: WelcomeCopy;
  celebrateAchievement?: boolean;
  onContinue: () => void;
  onOpenAchievements: () => void;
  onContinueLearning: () => void;
  onOpenGrownUps: () => void;
  screenTime?: ScreenTimeAllowance | null;
  /** Receives the ring's centre so the glance can open out of it. */
  onOpenScreenTime?: (origin: { x: number; y: number }) => void;
  /** True while the glance is open -- the ring steps aside for the orb that
   *  rises in its place. */
  screenTimeHidden?: boolean;
  onOpenPlans?: () => void;
  timeOfDay?: TimeOfDay;
  isActive?: boolean;
  guideTargets?: HomeGuideTargets;
  testID?: string;
}

export const HomeScene = memo(function HomeScene({
  data,
  welcome,
  celebrateAchievement = false,
  onContinue,
  onOpenAchievements,
  onContinueLearning,
  onOpenGrownUps,
  screenTime = null,
  onOpenScreenTime,
  screenTimeHidden = false,
  onOpenPlans,
  timeOfDay,
  isActive = true,
  guideTargets,
  testID = 'home-scene',
}: HomeSceneProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const clockTimeOfDay = useTimeOfDay();
  const activeTimeOfDay = timeOfDay ?? clockTimeOfDay;
  const theme = HOME_THEMES[activeTimeOfDay];
  const reduceMotion = useReducedMotion();
  const settled = useSettledAfterTransition(isActive);
  const animated = settled && !reduceMotion;

  const sun = sunFrame(width, insets.top);
  const contentWidth = homeContentWidth(width);

  return (
    <View testID={testID} style={[styles.root, { backgroundColor: theme.skyTop }]}>
      <NightSky width={width} height={height} timeOfDay={activeTimeOfDay} active={isActive} />

      <HomeHeroSky width={width} topInset={insets.top} timeOfDay={activeTimeOfDay} active={isActive} />

      <View style={[styles.chrome, { top: insets.top + HOME_SCENE_LAYOUT.chromeTop }]}>
        <View ref={guideTargets?.settings} collapsable={false}>
          <GrownUpsPill timeOfDay={activeTimeOfDay} onPress={onOpenGrownUps} />
        </View>
        <View ref={guideTargets?.sound} collapsable={false}>
          <MusicControl />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: heroContentTop(insets.top, sun.size), paddingBottom: insets.bottom + 52 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Text testID="home-welcome-title" style={[styles.welcome, { color: theme.title }]}>
          {t(welcome.titleKey, welcome.params)}
        </Text>
        <Text testID="home-welcome-subtitle" style={[styles.subtitle, { color: theme.subtitle }]}>
          {t(welcome.subtitleKey, welcome.params)}
        </Text>

        <View style={styles.streakSlot}>
          <StreakChip days={data.readingStreakDays} animated={animated} />
        </View>

        <View style={styles.cardSlot} ref={guideTargets?.stories} collapsable={false}>
          <ContinueCard story={data.currentStory} width={contentWidth} animated={animated} onPress={onContinue} />
        </View>

        <View style={styles.cardSlot} ref={guideTargets?.achievement} collapsable={false}>
          <AchievementCard
            next={data.nextAchievement}
            width={contentWidth}
            animated={animated}
            celebrate={celebrateAchievement}
            onPress={onOpenAchievements}
          />
        </View>

        <View style={styles.cardSlot} ref={guideTargets?.learning} collapsable={false}>
          <ContinueLearningCard width={contentWidth} animated={animated} onPress={onContinueLearning} />
        </View>

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
          <View ref={guideTargets?.screenTime} collapsable={false}>
          <ScreenTimeRing
            backplate
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
          </View>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
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
  welcome: {
    fontFamily: Fonts.rounded,
    fontSize: HOME_CARD_TYPE.welcome,
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: 32,
    textShadowColor: HERO_SKY.welcomeGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  subtitle: {
    fontFamily: Fonts.rounded,
    fontSize: HOME_CARD_TYPE.welcomeSubtitle,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginTop: 3,
    marginBottom: 8,
    textShadowColor: HERO_SKY.welcomeGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  cardSlot: {
    marginBottom: HOME_CARDS.gap,
  },
  streakSlot: {
    alignItems: 'center',
    marginBottom: 10,
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
    marginTop: 10,
  },
});
