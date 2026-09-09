import React, { useCallback, useMemo, useState, type RefObject } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { StoryFilterTag } from '@/types/story';
import { Fonts } from '@/constants/theme';
import { TEXT_SECONDARY } from '@/constants/night-palette';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useGlobalSound } from '@/contexts/global-sound-context';
import { CelestialBackground } from '@/components/child-ui/celestial-background';
import { ContentSwap } from '@/components/child-ui/content-swap';
import { PlanetHeaderArtwork } from '@/components/child-ui/planet-header-artwork';
import { CircleActionButton } from '@/components/child-ui/circle-action-button';
import { PageTitle } from '@/components/child-ui/page-title';
import { PageTagline } from '@/components/child-ui/page-tagline';
import { SectionHeading } from '@/components/child-ui/section-heading';
import type { GuideScrollerBinding } from '@/components/owl-guide/use-guide-scroller';
import { navClearance } from '@/components/child-ui/child-bottom-navigation';
import {
  COVER_GRID_GAP,
  SPACE_2,
  SPACE_3,
  SPACE_4,
  SPACE_5,
  contentMargin,
} from '@/components/child-ui/tokens';
import { Badge, BadgeFilter, filterBadges, sortBadgesForDiscovery } from './progress-model';
import { useProgressData } from './use-progress-data';
import { ProgressHeroCard } from './progress-hero-card';
import { MilestoneCard } from './milestone-card';
import { ChallengeCard } from './challenge-card';
import { BadgeCategoryBar } from './badge-category-bar';
import { BadgeCard } from './badge-card';
import { BadgeDetailSheet } from './badge-detail-sheet';

const MILESTONE_COLUMNS = 3;
const BADGE_COLUMNS_PHONE = 2;
const BADGE_COLUMNS_TABLET = 4;
const CONTENT_MAX_WIDTH = 720;

export interface ProgressGuideTargets {
  hero?: RefObject<View | null>;
  challenges?: RefObject<View | null>;
  milestones?: RefObject<View | null>;
  badges?: RefObject<View | null>;
}

interface ProgressScreenProps {
  onBack: () => void;
  onRecommend?: (tag: StoryFilterTag | null) => void;
  onDetailVisibleChange?: (visible: boolean) => void;
  embedded?: boolean;
  /** So the progress tour can point the owl at each part of the page. */
  guideTargets?: ProgressGuideTargets;
  /** Hands the page's scroll to the tour, which moves it to bring a step's
   *  subject clear of the owl rather than taking the bubble off him. */
  scrollBinding?: Pick<GuideScrollerBinding, 'scrollRef' | 'onScroll' | 'onLayout' | 'onContentSizeChange' | 'reserve'>;
}

export function ProgressScreen({
  onBack,
  onRecommend,
  onDetailVisibleChange,
  embedded = false,
  guideTargets,
  scrollBinding,
}: ProgressScreenProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { isTablet, scaledFontSize } = useAccessibility();
  const { isMuted, toggleMute } = useGlobalSound();
  const { t } = useTranslation();
  const { counters, badges, summary, challenges, milestones } = useProgressData();
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [badgeFilter, setBadgeFilter] = useState<BadgeFilter>('all');

  const margin = contentMargin(isTablet);
  const contentWidth = Math.min(windowWidth - margin * 2, CONTENT_MAX_WIDTH);
  const milestoneWidth = Math.floor((contentWidth - COVER_GRID_GAP * (MILESTONE_COLUMNS - 1)) / MILESTONE_COLUMNS);
  const badgeColumns = isTablet ? BADGE_COLUMNS_TABLET : BADGE_COLUMNS_PHONE;
  const badgeWidth = Math.floor((contentWidth - COVER_GRID_GAP * (badgeColumns - 1)) / badgeColumns);

  const visibleBadges = useMemo(
    () => sortBadgesForDiscovery(filterBadges(badges, badgeFilter)),
    [badges, badgeFilter],
  );
  // The owl points at the first row rather than the whole shelf: a ring drawn
  // around every badge is most of the page, and large enough to reach the owl's
  // own corner. One row says "here are the badges" just as well.
  const badgeRow = visibleBadges.slice(0, badgeColumns);
  const badgesBelow = visibleBadges.slice(badgeColumns);

  const handleBadgePress = useCallback((badge: Badge) => {
    setSelectedBadge(badge);
    onDetailVisibleChange?.(true);
  }, [onDetailVisibleChange]);

  const handleCloseSheet = useCallback(() => {
    setSelectedBadge(null);
    onDetailVisibleChange?.(false);
  }, [onDetailVisibleChange]);

  const handleRecommend = useCallback((badge: Badge) => {
    setSelectedBadge(null);
    onDetailVisibleChange?.(false);
    onRecommend?.(badge.recommendation?.tag ?? null);
  }, [onRecommend, onDetailVisibleChange]);

  const body = (
    <>

      <View
        style={[
          styles.headerRow,
          {
            marginTop: insets.top + (isTablet ? SPACE_2 : 0),
            marginHorizontal: margin,
          },
        ]}
      >
        <CircleActionButton type="back" onPress={onBack} accessibilityLabel={t('common.back')} />
        <View style={styles.titleWrapper}>
          <PageTitle title={t('progress.title')} testID="progress-title" />
        </View>
        <CircleActionButton
          type="audio"
          muted={isMuted}
          onPress={() => { void toggleMute(); }}
          accessibilityLabel={t('catalogue.sound')}
        />
      </View>

      <View style={[styles.tagline, { marginHorizontal: margin }]}>
        <PageTagline
          testID="progress-tagline"
          lines={[t('progress.tagline.one'), t('progress.tagline.two')]}
          width={contentWidth}
        />
      </View>

      <ScrollView
        ref={scrollBinding?.scrollRef}
        onScroll={scrollBinding?.onScroll}
        onLayout={scrollBinding?.onLayout}
        onContentSizeChange={scrollBinding?.onContentSizeChange}
        scrollEventThrottle={16}
        style={[styles.scroll, { marginBottom: navClearance(insets.bottom) }]}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: margin, paddingBottom: scrollBinding?.reserve ?? 0 },
        ]}
      >
        <View style={[styles.column, { maxWidth: CONTENT_MAX_WIDTH }]}>
          <View ref={guideTargets?.hero} collapsable={false}>
            <ProgressHeroCard counters={counters} />
          </View>

          <View style={styles.sectionHeadingSpacing}>
            <SectionHeading label={t('progress.adventuresHeading')} testID="adventures-heading" />
          </View>
          <View style={styles.challengeList} testID="challenge-list" ref={guideTargets?.challenges} collapsable={false}>
            {challenges.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} onPress={handleBadgePress} />
            ))}
          </View>

          <View style={styles.sectionHeadingSpacing}>
            <SectionHeading label={t('progress.milestonesHeading')} testID="milestones-heading" />
          </View>
          <View style={styles.milestoneRow} testID="milestone-row" ref={guideTargets?.milestones} collapsable={false}>
            {milestones.map((milestone) => (
              <MilestoneCard key={milestone.id} milestone={milestone} width={milestoneWidth} />
            ))}
          </View>

          <View style={styles.sectionHeadingSpacing}>
            <SectionHeading label={t('progress.badgesHeading')} testID="badges-heading" />
            <Text style={[styles.summary, { fontSize: scaledFontSize(13) }]} testID="badges-summary">
              {t('progress.badgesSummary', { earned: summary.earned, total: summary.total })}
            </Text>
          </View>
          <View style={styles.categoryBarSpacing}>
            <BadgeCategoryBar selected={badgeFilter} onSelect={setBadgeFilter} />
          </View>
          {/* picking a category replaces every badge on the shelf, so the
              grid fades between the two rather than swapping under the hand */}
          <ContentSwap contentKey={badgeFilter} testID="badge-collection">
            <View style={styles.badgeGrid} testID="badge-grid">
              <View style={styles.badgeRow} testID="badge-row" ref={guideTargets?.badges} collapsable={false}>
                {badgeRow.map((badge) => (
                  <BadgeCard key={badge.id} badge={badge} width={badgeWidth} onPress={handleBadgePress} />
                ))}
              </View>
              {badgesBelow.map((badge) => (
                <BadgeCard key={badge.id} badge={badge} width={badgeWidth} onPress={handleBadgePress} />
              ))}
            </View>
          </ContentSwap>
        </View>
      </ScrollView>

      <BadgeDetailSheet badge={selectedBadge} onClose={handleCloseSheet} onRecommend={handleRecommend} />
    </>
  );

  if (embedded) {
    return <View style={styles.fill}>{body}</View>;
  }

  return (
    <CelestialBackground>
      <PlanetHeaderArtwork />
      {body}
    </CelestialBackground>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  // matches the catalogue's header exactly: the same top margin, the same
  // centred controls and the same absence of padding beneath, so the title and
  // its tagline sit at one height across every journey area
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  titleWrapper: {
    flex: 1,
  },
  tagline: {
    zIndex: 10,
  },
  scroll: {
    flex: 1,
    zIndex: 5,
  },
  scrollContent: {
    paddingTop: SPACE_4,
    paddingBottom: SPACE_4,
    alignItems: 'center',
  },
  column: {
    width: '100%',
  },
  sectionHeadingSpacing: {
    marginTop: SPACE_5,
    marginBottom: SPACE_3,
    gap: SPACE_2,
  },
  summary: {
    color: TEXT_SECONDARY,
    fontFamily: Fonts.primary,
    fontWeight: '600',
    marginLeft: 30,
  },
  categoryBarSpacing: {
    marginBottom: SPACE_3,
  },
  challengeList: {
    gap: COVER_GRID_GAP,
  },
  milestoneRow: {
    flexDirection: 'row',
    gap: COVER_GRID_GAP,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: COVER_GRID_GAP,
  },
  // full width so the badges after it wrap onto their own lines, leaving the
  // shelf looking exactly as it did when it was one flat grid
  badgeRow: {
    flexDirection: 'row',
    gap: COVER_GRID_GAP,
    width: '100%',
  },
});
