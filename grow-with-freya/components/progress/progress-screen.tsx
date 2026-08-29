import React, { useCallback, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { StoryFilterTag } from '@/types/story';
import { Fonts } from '@/constants/theme';
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
  SPACE_2,
  SPACE_3,
  SPACE_4,
  SPACE_5,
  contentMargin,
} from '@/components/child-ui/tokens';
import { Badge } from './progress-model';
import { useProgressData } from './use-progress-data';
import { ProgressHeroCard } from './progress-hero-card';
import { MilestoneCard } from './milestone-card';
import { BadgeCard } from './badge-card';
import { BadgeDetailSheet } from './badge-detail-sheet';

const LAVENDER_TEXT = 'rgba(199, 186, 255, 0.95)';
const MILESTONE_COLUMNS = 3;
const BADGES_VISIBLE_PHONE = 2.6;
const BADGES_VISIBLE_TABLET = 4.2;

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
  const { counters, badges, milestones } = useProgressData();
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  const margin = contentMargin(isTablet);
  const contentWidth = windowWidth - margin * 2;
  const milestoneWidth = Math.floor((contentWidth - COVER_GRID_GAP * (MILESTONE_COLUMNS - 1)) / MILESTONE_COLUMNS);
  const badgesVisible = isTablet ? BADGES_VISIBLE_TABLET : BADGES_VISIBLE_PHONE;
  const badgeWidth = Math.floor((contentWidth - COVER_GRID_GAP * Math.floor(badgesVisible)) / badgesVisible);

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

  const renderBadge = useCallback(({ item }: { item: Badge }) => (
    <BadgeCard badge={item} width={badgeWidth} onPress={handleBadgePress} />
  ), [badgeWidth, handleBadgePress]);

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
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: margin, paddingBottom: navClearance(insets.bottom) },
        ]}
      >
        <ProgressHeroCard counters={counters} />

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
        </View>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          data={badges}
          keyExtractor={(badge) => badge.id}
          renderItem={renderBadge}
          contentContainerStyle={styles.badgeRow}
          testID="badge-row"
        />
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
  },
  titleWrapper: {
    flex: 1,
    gap: SPACE_2,
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
  },
  sectionHeadingSpacing: {
    marginTop: SPACE_5,
    marginBottom: SPACE_3,
  },
  milestoneRow: {
    flexDirection: 'row',
    gap: COVER_GRID_GAP,
  },
  badgeRow: {
    gap: COVER_GRID_GAP,
  },
});
