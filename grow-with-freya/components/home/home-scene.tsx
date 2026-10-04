import React, { useCallback, useMemo, useState, memo, type RefObject } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { AudioControlModal } from '@/components/ui/audio-control-modal';
import { LanguagePicker } from '@/components/ui/language-picker';
import { baseLanguage, languageFlag } from '@/services/i18n';
import { CircleActionButton } from '@/components/child-ui/circle-action-button';
import { CIRCLE_BUTTON_DIAMETER_PHONE, CIRCLE_BUTTON_DIAMETER_TABLET, contentMargin, journeyHeaderTop } from '@/components/child-ui/tokens';
import { useGlobalSound } from '@/contexts/global-sound-context';
import { useAccessibility } from '@/hooks/use-accessibility';
import { HOME_THEMES, type TimeOfDay } from '@/constants/home-scene';
import { HOME_CARDS, HOME_CARD_TYPE, homeContentWidth } from '@/constants/home-journey';
import { HERO_SKY, heroContentDrop, heroContentLift, heroContentTop, heroSunFrame, heroSunScale } from '@/constants/home-sky';
import { useTimeOfDay } from '@/hooks/use-time-of-day';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useSettledAfterTransition } from '@/hooks/use-ambient-animation';
import type { ScreenTimeAllowance } from '@/hooks/use-screen-time-allowance';
import type { ChildHomeData, ChildHomeJourneyStep, WelcomeCopy } from '@/types/child-home';
import type { GuideScrollerBinding } from '@/components/owl-guide/use-guide-scroller';
import { NightSky } from './night-sky';
import { HomeHeroSky } from './home-hero-sky';
import { ChildBottomNavigation, navClearance, navItemCentre, type ChildNavItemId } from '@/components/child-ui/child-bottom-navigation';
import { UnlockPlanButton } from './unlock-plan-button';
import { ContinueCard } from './continue-card';
import { StreakChip } from './streak-chip';
import { WeeklyReadingChip } from './weekly-reading-chip';
import { AchievementTallyChip } from './achievement-tally-chip';
import { VoyageRow, useVoyageZoom } from './voyage-row';
import { AchievementCard } from './achievement-card';
import { ArchedGreeting } from './arched-greeting';

/** The phone's own gaps beneath the stats row and above the plan button --
 *  the styles below use these, and the tablet's spacing is derived from them. */
const STATS_BASE_GAP = 4;
const PLAN_BASE_GAP = 10;
const GREETING_CARD_GAP = 24;

/**
 * How much taller the stats row's box is than the words you actually see in
 * it: the streak and reading chips pad themselves, and their icons stand
 * taller than their text. The margin below them therefore *looks* bigger than
 * it is, so the greeting's gap adds this back to match it by eye rather than
 * on paper. Measured against the rendered screen, not derived -- it is a fact
 * about the chips' artwork, which is why it is written down here rather than
 * folded silently into the gap.
 */
export const STATS_CHIP_INSET = 21;

export const STATS_LINE_TUCK = 6;

export interface HomeGuideTargets {
  stories?: RefObject<View | null>;
  achievement?: RefObject<View | null>;
  screenTime?: RefObject<View | null>;
  learn?: RefObject<View | null>;
  progress?: RefObject<View | null>;
  search?: RefObject<View | null>;
  profile?: RefObject<View | null>;
  sound?: RefObject<View | null>;
  language?: RefObject<View | null>;
}


export const TABLET_FOOT_PADDING = 24;

export type HomeSection = Exclude<ChildNavItemId, 'screensafe'>;

export interface HomeSceneProps {
  data: ChildHomeData;
  welcome: WelcomeCopy;
  celebrateAchievement?: boolean;
  journeySteps?: readonly ChildHomeJourneyStep[];
  onContinue: () => void;
  onOpenJourney: () => void;
  /** An item in the bar at the foot that is a place to go: the library opens on that section. */
  onSelectSection: (id: HomeSection) => void;
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
  journeySteps,
  onContinue,
  onOpenJourney,
  onSelectSection,
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
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { isTablet: journeyTablet } = useAccessibility();
  const sound = useGlobalSound();
  const [audioSettingsOpen, setAudioSettingsOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const closeLanguage = useCallback(() => setLanguageOpen(false), []);
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
  const sun = heroSunFrame(width, height, insets.top);
  // The sky sits behind the page rather than in it, so the sun is told how far
  // the page has travelled and rides up with the content instead of hanging in
  // the corner. The stars stay put, which reads as depth behind it.
  const skyLift = useSharedValue(0);
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      skyLift.value = event.nativeEvent.contentOffset.y;
      scrollBinding?.onScroll(event);
    },
    [skyLift, scrollBinding]
  );
  const contentWidth = homeContentWidth(
    width,
    isTablet ? HOME_CARDS.tabletContentMaxWidth : HOME_CARDS.contentMaxWidth
  );
  // On a phone the content overflows the screen, so the ring's clearance
  // can live inside the scrollable padding -- it just scrolls into view.
  // On a tablet the content is centred and *fits*, so that same padding
  // gets treated as extra slack to centre around and only half of it ends
  // up as a real gap. Carved out of the ScrollView's own height instead
  // (before centring runs on what's left), it stays a full, guaranteed gap.
  const footClearance = navClearance(insets.bottom);
  const navItemRefs = useMemo(
    () => ({
      home: guideTargets?.learn,
      progress: guideTargets?.progress,
      screensafe: guideTargets?.screenTime,
      search: guideTargets?.search,
      profile: guideTargets?.profile,
    }),
    [guideTargets?.learn, guideTargets?.progress, guideTargets?.screenTime, guideTargets?.search, guideTargets?.profile]
  );
  const handleSelect = useCallback((id: ChildNavItemId) => {
    if (id === 'screensafe') {
      onOpenScreenTime?.(navItemCentre('screensafe', width, height, insets.bottom, isTablet));
      return;
    }
    onSelectSection(id);
  }, [onOpenScreenTime, onSelectSection, width, height, insets.bottom, isTablet]);
  // A tablet has room the phone's spacing never asks for, and the panels read
  // as one block without it. Portrait has hundreds of points spare and takes
  // the generous set; landscape has tens, so it takes a smaller one rather
  // than pushing the plan button into the ring.
  const gaps = portraitTablet
    ? { card: 14, stats: 10, plan: 14 }
    : isTablet
      ? { card: 3, stats: 2, plan: 4 }
      : null;
  // The greeting stands the same distance above the first card as the stats
  // row stands below the last one, so the block reads as evenly spaced rather
  // than top-heavy. Derived from that gap rather than set beside it, so the
  // two cannot drift apart when either is tuned.
  const statsToPlan = gaps ? STATS_BASE_GAP + gaps.stats + PLAN_BASE_GAP + gaps.plan : 0;
  const subtitleGap = gaps ? statsToPlan + STATS_CHIP_INSET - HOME_CARDS.gap : 0;
  // Centring splits any height the content gains evenly above and below it,
  // so the panels spreading out would walk the greeting up the screen with
  // them. The gaps *below* the greeting are pushed back down by exactly what
  // they added, spending all of that space beneath it; the greeting's own gap
  // is subtracted instead, which lifts the greeting and leaves the cards where
  // they were rather than driving the plan button lower.
  // Both halves come out of the slack the centring had, so landscape's set
  // stays small enough to still fit -- past that the plan button runs off the
  // bottom instead of merely sitting lower.
  const spread = gaps ? gaps.card * 2 + gaps.stats * 2 + gaps.plan - subtitleGap : 0;
  const lift = heroContentLift(width, height);
  const tally = data.achievementTally;
  const zoom = useVoyageZoom(width, height);
  const tallyChip = tally ? (
    <AchievementTallyChip unlocked={tally.unlocked} remaining={tally.remaining} animated={animated} />
  ) : null;

  return (
    <View testID={testID} style={[styles.root, { backgroundColor: theme.skyTop }]}>
      <Animated.View testID="home-sky-zoom" style={[StyleSheet.absoluteFill, zoom]} pointerEvents="none">
        <NightSky width={width} height={height} timeOfDay={activeTimeOfDay} active={isActive} />
      </Animated.View>

      <HomeHeroSky
        width={width}
        height={height}
        topInset={insets.top}
        timeOfDay={activeTimeOfDay}
        active={isActive}
        sizeScale={heroSunScale(width, height)}
        lift={skyLift}
        zoomStyle={zoom}
      />

      <VoyageRow
        row="chrome"
        testID="home-corner-controls"
        style={[
          styles.chrome,
          {
            top: journeyHeaderTop(insets.top, journeyTablet),
            left: contentMargin(journeyTablet),
            right: contentMargin(journeyTablet),
            height: journeyTablet ? CIRCLE_BUTTON_DIAMETER_TABLET : CIRCLE_BUTTON_DIAMETER_PHONE,
          },
        ]}
      >
        <View ref={guideTargets?.language} collapsable={false}>
          <CircleActionButton
            type="language"
            testID="home-language-button"
            emoji={languageFlag(i18n.language)}
            language={baseLanguage(i18n.language)}
            onPress={() => setLanguageOpen(true)}
            accessibilityLabel={t('account.language')}
          />
        </View>
        <View ref={guideTargets?.sound} collapsable={false}>
          <CircleActionButton
            type="audio"
            testID="home-sound-button"
            muted={sound.isMuted}
            onPress={() => { void sound.toggleMute(); }}
            onLongPress={() => setAudioSettingsOpen(true)}
            accessibilityLabel={t('catalogue.sound')}
          />
        </View>
      </VoyageRow>
      <AudioControlModal
        visible={audioSettingsOpen}
        onClose={() => setAudioSettingsOpen(false)}
        masterVolume={sound.masterVolume}
        musicVolume={sound.musicVolume}
        voiceOverVolume={sound.voiceOverVolume}
        onMasterVolumeChange={sound.setMasterVolume}
        onMusicVolumeChange={sound.setMusicVolume}
        onVoiceOverVolumeChange={sound.setVoiceOverVolume}
      />

      <ScrollView
        ref={scrollBinding?.scrollRef}
        onScroll={handleScroll}
        onLayout={scrollBinding?.onLayout}
        onContentSizeChange={scrollBinding?.onContentSizeChange}
        scrollEventThrottle={16}
        style={isTablet ? [styles.scrollTablet, { marginBottom: footClearance }] : undefined}
        contentContainerStyle={[
          styles.content,
          isTablet && styles.contentTabletCenter,
          {
            paddingTop: heroContentTop(insets.top, sun.size) + heroContentDrop(width, height) + spread - lift,
            paddingBottom: (isTablet ? TABLET_FOOT_PADDING : footClearance) + lift + (scrollBinding?.reserve ?? 0),
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <VoyageRow row="greeting" testID="home-welcome-block" style={[styles.greeting, gaps && { marginBottom: HOME_CARDS.gap + subtitleGap }]}>
          <ArchedGreeting
            title={t(welcome.titleKey, welcome.params)}
            subtitle={t(welcome.subtitleKey, welcome.params)}
            width={width}
            titleSize={portraitTablet ? Math.round(HOME_CARD_TYPE.welcome * 1.3) : HOME_CARD_TYPE.welcome}
            subtitleSize={portraitTablet ? Math.round(HOME_CARD_TYPE.welcomeSubtitle * 1.3) : HOME_CARD_TYPE.welcomeSubtitle}
            titleColor={theme.title}
            subtitleColor={theme.subtitle}
            glowColor={HERO_SKY.welcomeGlow}
          />
        </VoyageRow>

        <VoyageRow row="story">
          <View style={[styles.cardSlot, gaps && { marginBottom: HOME_CARDS.gap + gaps.card }]} ref={guideTargets?.stories} collapsable={false}>
            <ContinueCard story={data.currentStory} width={contentWidth} animated={animated} onPress={onContinue} />
          </View>
        </VoyageRow>

        <VoyageRow row="journey">
        <View style={[styles.cardSlot, gaps && { marginBottom: HOME_CARDS.gap + gaps.card }]} ref={guideTargets?.achievement} collapsable={false}>
          <AchievementCard
            next={data.nextAchievement}
            steps={journeySteps}
            width={contentWidth}
            animated={animated}
            celebrate={celebrateAchievement}
            onPress={onOpenJourney}
          />
        </View>
        </VoyageRow>

        <VoyageRow row="stats" testID="home-stats-row" style={[styles.statsBlock, gaps && { marginTop: gaps.stats, marginBottom: 4 + gaps.stats }]}>
          <View testID="home-stats-first-line" style={styles.statsLine}>
            <StreakChip days={data.readingStreakDays} animated={animated} />
            <View testID="home-stats-divider" style={styles.statsDivider} />
            <WeeklyReadingChip minutes={data.weeklyReadingMinutes} animated={animated} />
            {tallyChip && isTablet ? (
              <>
                <View testID="home-stats-divider" style={styles.statsDivider} />
                {tallyChip}
              </>
            ) : null}
          </View>
          {tallyChip && !isTablet ? (
            <View testID="home-stats-second-line" style={[styles.statsLine, styles.statsSecondLine]}>
              {tallyChip}
            </View>
          ) : null}
        </VoyageRow>

        {onOpenPlans ? (
          <VoyageRow row="plan" testID="home-plan-slot" style={[styles.planSlot, gaps && { marginTop: PLAN_BASE_GAP + gaps.plan }]}>
            <UnlockPlanButton onPress={onOpenPlans} />
          </VoyageRow>
        ) : null}
      </ScrollView>

      <ChildBottomNavigation
        selected={null}
        onSelect={handleSelect}
        screenTime={screenTime}
        collapsed={screenTimeHidden}
        itemRefs={navItemRefs}
        slotKey="main"
      />

      <LanguagePicker visible={languageOpen} onClose={closeLanguage} />
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  chrome: {
    position: 'absolute',
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
  // The greeting stands well clear of the first card: at the old 8 the
  // subtitle sat on the card's glow.
  greeting: {
    marginBottom: GREETING_CARD_GAP,
  },
  cardSlot: {
    marginBottom: HOME_CARDS.gap,
  },
  // The achievement and continue-learning cards, side by side on a tablet
  // instead of stacked -- see `pairedCardWidth`.
  // No `flex: 1` here -- each card already gets its exact pixel width from
  // `pairedCardWidth`, and flexing this wrapper on top of that fights it:
  // with no width of its own to hand out, `pairedRow` collapsed and the two
  // tiles drifted apart instead of sitting flush against the gap between
  // them.
  // The streak and the week's reading, together under the cards rather than
  // above them -- an answer to "how am I doing", read after the "here's what
  // to do next" the cards themselves are.
  statsBlock: {
    alignItems: 'center',
    marginBottom: STATS_BASE_GAP,
  },
  statsLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsSecondLine: {
    marginTop: -STATS_LINE_TUCK,
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
  planSlot: {
    alignItems: 'center',
    marginTop: PLAN_BASE_GAP,
  },
});
