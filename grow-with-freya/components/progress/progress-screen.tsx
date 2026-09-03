import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { StoryFilterTag } from '@/types/story';
import { Fonts } from '@/constants/theme';
import { TEXT_SECONDARY } from '@/constants/night-palette';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useGlobalSound } from '@/contexts/global-sound-context';
import { CelestialBackground } from '@/components/child-ui/celestial-background';
import { PlanetHeaderArtwork } from '@/components/child-ui/planet-header-artwork';
import { CircleActionButton } from '@/components/child-ui/circle-action-button';
import { PageTitle } from '@/components/child-ui/page-title';
import { SectionHeading } from '@/components/child-ui/section-heading';
import { navClearance } from '@/components/child-ui/child-bottom-navigation';
import {
  COVER_GRID_GAP,
  SPACE_1,
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

const LAVENDER_TEXT = 'rgba(199, 186, 255, 0.95)';
const MILESTONE_COLUMNS = 3;
const BADGE_COLUMNS_PHONE = 2;
const BADGE_COLUMNS_TABLET = 4;
const CONTENT_MAX_WIDTH = 720;

interface ProgressScreenProps {
  onBack: () => void;
  onRecommend?: (tag: StoryFilterTag | null) => void;
  onDetailVisibleChange?: (visible: boolean) => void;
}

export function ProgressScreen({ onBack, onRecommend, onDetailVisibleChange }: ProgressScreenProps) {
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

  return (
    <CelestialBackground>
      <PlanetHeaderArtwork />

      <View style={[styles.headerRow, { marginTop: insets.top + SPACE_2, marginHorizontal: margin }]}>
        <CircleActionButton type="back" onPress={onBack} accessibilityLabel={t('common.back')} />
        <View style={styles.titleWrapper}>
          <PageTitle title={t('progress.title')} testID="progress-title" />
          <Text style={[styles.subtitle, { fontSize: scaledFontSize(17) }]} testID="progress-subtitle">
            {t('progress.subtitle')}
          </Text>
        </View>
        <CircleActionButton
          type="audio"
          muted={isMuted}
          onPress={() => { void toggleMute(); }}
          accessibilityLabel={t('catalogue.sound')}
        />
      </View>

      <ScrollView
        style={[styles.scroll, { marginBottom: navClearance(insets.bottom) }]}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: margin }]}
      >
        <View style={[styles.column, { maxWidth: CONTENT_MAX_WIDTH }]}>
          <ProgressHeroCard counters={counters} />

          <View style={styles.sectionHeadingSpacing}>
            <SectionHeading label={t('progress.adventuresHeading')} testID="adventures-heading" />
          </View>
          <View style={styles.challengeList} testID="challenge-list">
            {challenges.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} onPress={handleBadgePress} />
            ))}
          </View>

          <View style={styles.sectionHeadingSpacing}>
            <SectionHeading label={t('progress.milestonesHeading')} testID="milestones-heading" />
          </View>
          <View style={styles.milestoneRow} testID="milestone-row">
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
          <View style={styles.badgeGrid} testID="badge-grid">
            {visibleBadges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} width={badgeWidth} onPress={handleBadgePress} />
            ))}
          </View>
        </View>
      </ScrollView>

      <BadgeDetailSheet badge={selectedBadge} onClose={handleCloseSheet} onRecommend={handleRecommend} />
    </CelestialBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    zIndex: 10,
    paddingBottom: SPACE_3,
  },
  titleWrapper: {
    flex: 1,
    gap: SPACE_1,
  },
  subtitle: {
    color: LAVENDER_TEXT,
    fontFamily: Fonts.primary,
    fontWeight: '600',
    textAlign: 'center',
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
});
