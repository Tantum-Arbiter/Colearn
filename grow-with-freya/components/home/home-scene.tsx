import React, { memo, type RefObject } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MusicControl } from '@/components/ui/music-control';
import { Fonts } from '@/constants/theme';
import { HOME_SCENE_LAYOUT, HOME_THEMES, type TimeOfDay } from '@/constants/home-scene';
import { HOME_CARDS, HOME_CARD_TYPE, homeContentWidth, pairedCardWidth } from '@/constants/home-journey';
import { HERO_SKY, heroContentTop, sunFrame } from '@/constants/home-sky';
import { SCREEN_TIME_RING, ringCentre, ringClearance } from '@/constants/screen-time-ring';
import { useTimeOfDay } from '@/hooks/use-time-of-day';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useSettledAfterTransition } from '@/hooks/use-ambient-animation';
import type { ScreenTimeAllowance } from '@/hooks/use-screen-time-allowance';
import type { ChildHomeData, WelcomeCopy } from '@/types/child-home';
import type { GuideScrollerBinding } from '@/components/owl-guide/use-guide-scroller';
import { NightSky } from './night-sky';
import { HomeHeroSky } from './home-hero-sky';
import { GrownUpsPill } from './grown-ups-pill';
import { ScreenTimeRing } from './screen-time-ring';
import { UnlockPlanButton } from './unlock-plan-button';
import { ContinueCard } from './continue-card';
import { StreakChip } from './streak-chip';
import { WeeklyReadingChip } from './weekly-reading-chip';
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
  /** Hands the page's scroll to the tour, which moves it to bring a step's
   *  subject clear of the owl rather than taking the bubble off him. */
  scrollBinding?: Pick<GuideScrollerBinding, 'scrollRef' | 'onScroll' | 'onLayout' | 'onContentSizeChange' | 'reserve'>;
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
  scrollBinding,
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

  // A tablet's shorter axis stays >= 768 in either orientation -- use it,
  // not raw width, so landscape isn't misread as a phone-width screen.
  const isTablet = Math.min(width, height) >= 768;
  // Landscape is already tight on height (that's what the paired cards and
  // the ring clearance above are for). Portrait is the one with height to
  // spare, so it's the one that gets a bigger sun and bigger welcome text
  // rather than just more empty sky above the cards.
  const portraitTablet = isTablet && height > width;
  const sun = sunFrame(width, insets.top, height, portraitTablet ? 1.3 : 1);
  const contentWidth = homeContentWidth(width);
  const pairedWidth = pairedCardWidth(contentWidth);
  // On a phone the content overflows the screen, so the ring's clearance
  // can live inside the scrollable padding -- it just scrolls into view.
  // On a tablet the content is centred and *fits*, so that same padding
  // gets treated as extra slack to centre around and only half of it ends
  // up as a real gap. Carved out of the ScrollView's own height instead
  // (before centring runs on what's left), it stays a full, guaranteed gap.
  const tabletRingReserve = isTablet && screenTime ? ringClearance(28) : 0;

  return (
    <View testID={testID} style={[styles.root, { backgroundColor: theme.skyTop }]}>
      <NightSky width={width} height={height} timeOfDay={activeTimeOfDay} active={isActive} />

      <HomeHeroSky
        width={width}
        height={height}
        topInset={insets.top}
        timeOfDay={activeTimeOfDay}
        active={isActive}
        sizeScale={portraitTablet ? 1.3 : 1}
      />

      <View style={[styles.chrome, { top: insets.top + HOME_SCENE_LAYOUT.chromeTop }]}>
        <View ref={guideTargets?.settings} collapsable={false}>
          <GrownUpsPill timeOfDay={activeTimeOfDay} onPress={onOpenGrownUps} />
        </View>
        <View ref={guideTargets?.sound} collapsable={false}>
          <MusicControl />
        </View>
      </View>

      <ScrollView
        ref={scrollBinding?.scrollRef}
        onScroll={scrollBinding?.onScroll}
        onLayout={scrollBinding?.onLayout}
        onContentSizeChange={scrollBinding?.onContentSizeChange}
        scrollEventThrottle={16}
        style={isTablet ? [styles.scrollTablet, { marginBottom: tabletRingReserve }] : undefined}
        contentContainerStyle={[
          styles.content,
          isTablet && styles.contentTabletCenter,
          {
            paddingTop: heroContentTop(insets.top, sun.size),
            paddingBottom: insets.bottom + 52 + (scrollBinding?.reserve ?? 0),
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Text
          testID="home-welcome-title"
          style={[styles.welcome, { color: theme.title }, portraitTablet && styles.welcomePortraitTablet]}
        >
          {t(welcome.titleKey, welcome.params)}
        </Text>
        <Text
          testID="home-welcome-subtitle"
          style={[
            styles.subtitle,
            { color: theme.subtitle },
            portraitTablet && styles.subtitlePortraitTablet,
          ]}
        >
          {t(welcome.subtitleKey, welcome.params)}
        </Text>

        <View style={styles.cardSlot} ref={guideTargets?.stories} collapsable={false}>
          <ContinueCard story={data.currentStory} width={contentWidth} animated={animated} onPress={onContinue} />
        </View>

        {isTablet ? (
          <View style={[styles.cardSlot, styles.pairedRow]}>
            <View style={styles.pairedSlot} ref={guideTargets?.achievement} collapsable={false}>
              <AchievementCard
                next={data.nextAchievement}
                width={pairedWidth}
                animated={animated}
                celebrate={celebrateAchievement}
                onPress={onOpenAchievements}
                compact
              />
            </View>
            <View style={styles.pairedSlot} ref={guideTargets?.learning} collapsable={false}>
              <ContinueLearningCard width={pairedWidth} animated={animated} onPress={onContinueLearning} compact />
            </View>
          </View>
        ) : (
          <>
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
          </>
        )}

        <View style={styles.statsRow}>
          <StreakChip days={data.readingStreakDays} animated={animated} />
          <View style={styles.statsDivider} />
          <WeeklyReadingChip minutes={data.weeklyReadingMinutes} animated={animated} />
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
  // On a tablet the content rarely fills the taller viewport -- stretch the
  // scroller to full height and centre the block within it instead of
  // leaving it pinned to the top with empty space below.
  scrollTablet: {
    flex: 1,
  },
  contentTabletCenter: {
    flexGrow: 1,
    justifyContent: 'center',
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
  // A tablet in portrait has the height to spend on a bigger greeting
  // instead of just more sky above the cards -- matches the sun's own
  // `sizeScale` so the two grow together.
  welcomePortraitTablet: {
    fontSize: Math.round(HOME_CARD_TYPE.welcome * 1.3),
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
  // Bigger type, but *less* of the gap it would otherwise want beneath it --
  // the point is to close the distance to the cards, not just make the
  // words above them larger.
  subtitlePortraitTablet: {
    fontSize: Math.round(HOME_CARD_TYPE.welcomeSubtitle * 1.3),
    marginBottom: 0,
  },
  cardSlot: {
    marginBottom: HOME_CARDS.gap,
  },
  // The achievement and continue-learning cards, side by side on a tablet
  // instead of stacked -- see `pairedCardWidth`.
  pairedRow: {
    flexDirection: 'row',
    gap: HOME_CARDS.gap,
  },
  // No `flex: 1` here -- each card already gets its exact pixel width from
  // `pairedCardWidth`, and flexing this wrapper on top of that fights it:
  // with no width of its own to hand out, `pairedRow` collapsed and the two
  // tiles drifted apart instead of sitting flush against the gap between
  // them.
  pairedSlot: {},
  // The streak and the week's reading, together under the cards rather than
  // above them -- an answer to "how am I doing", read after the "here's what
  // to do next" the cards themselves are.
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statsDivider: {
    width: 1,
    height: 18,
    marginHorizontal: 4,
    backgroundColor: 'rgba(255,255,255,0.16)',
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
