import React, { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/app-store';
import { SubscriptionOverlay } from '@/components/ui/subscription-overlay';
import { shouldOfferPlan } from '@/constants/unlock-plan';
import { useStoryTransition } from '@/contexts/story-transition-context';
import { ALL_STORIES } from '@/data/stories';
import { getLocalizedText } from '@/types/story';
import type { SupportedLanguage } from '@/services/i18n';
import { useScreenTimeAllowance } from '@/hooks/use-screen-time-allowance';
import { useTimeOfDay } from '@/hooks/use-time-of-day';
import { isScreenTimeExceeded } from '@/constants/screen-time-ring';
import { ScreenTimeGlance } from './screen-time-glance';
import { HomeScene, type ContinueReadingSummary } from './home-scene';

export interface HomeSceneContainerProps {
  onNavigate: (destination: string) => void;
  onOpenGrownUps: () => void;
}

export const HomeSceneContainer = memo(function HomeSceneContainer({
  onNavigate,
  onOpenGrownUps,
}: HomeSceneContainerProps) {
  const { i18n } = useTranslation();
  const storyProgress = useAppStore((state) => state.storyProgress);
  const getContinueReadingStoryId = useAppStore((state) => state.getContinueReadingStoryId);
  const { requestGardenOpen } = useStoryTransition();
  const screenTime = useScreenTimeAllowance();
  const timeOfDay = useTimeOfDay();
  const [showScreenTime, setShowScreenTime] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const getEffectiveTier = useAppStore((state) => state.getEffectiveTier);

  const language = (i18n.language ?? 'en') as SupportedLanguage;

  const continueReading = useMemo((): ContinueReadingSummary | null => {
    const storyId = getContinueReadingStoryId();

    if (!storyId) {
      return null;
    }

    const story = ALL_STORIES.find((candidate) => candidate.id === storyId);
    const progress = storyProgress[storyId];

    if (!story || !progress || typeof story.coverImage !== 'string') {
      return null;
    }

    return {
      storyId,
      title: getLocalizedText(story.localizedTitle, story.title, language),
      coverImage: story.coverImage,
      pageIndex: progress.pageIndex,
      totalPages: progress.totalPages,
    };
  }, [getContinueReadingStoryId, storyProgress, language]);

  const handleContinueReading = useCallback(
    (storyId: string) => {
      const story = ALL_STORIES.find((candidate) => candidate.id === storyId);

      if (story) {
        requestGardenOpen(story, 'read', null);
      }
    },
    [requestGardenOpen]
  );

  // the ring reports its own centre, so the glance opens out of the control
  // the parent actually pressed
  const [screenTimeOrigin, setScreenTimeOrigin] = useState<{ x: number; y: number } | undefined>();
  const openScreenTime = useCallback((origin: { x: number; y: number }) => {
    setScreenTimeOrigin(origin);
    setShowScreenTime(true);
  }, []);
  const closeScreenTime = useCallback(() => setShowScreenTime(false), []);
  const openPlans = useCallback(() => setShowPlans(true), []);
  const closePlans = useCallback(() => setShowPlans(false), []);

  const offerPlan = shouldOfferPlan(getEffectiveTier());

  return (
    <>
      <HomeScene
        onNavigate={onNavigate}
        onOpenGrownUps={onOpenGrownUps}
        onContinueReading={handleContinueReading}
        continueReading={continueReading}
        screenTime={screenTime}
        timeOfDay={timeOfDay}
        onOpenScreenTime={openScreenTime}
        screenTimeHidden={showScreenTime}
        onOpenPlans={offerPlan ? openPlans : undefined}
      />

      <ScreenTimeGlance
        visible={showScreenTime}
        timeOfDay={timeOfDay}
        onClose={closeScreenTime}
        origin={screenTimeOrigin}
        exceeded={
          screenTime
            ? isScreenTimeExceeded(screenTime.usageSeconds, screenTime.limitSeconds)
            : false
        }
        usageSeconds={screenTime?.usageSeconds ?? 0}
        limitSeconds={screenTime?.limitSeconds ?? 0}
      />

      <SubscriptionOverlay visible={showPlans} onClose={closePlans} />
    </>
  );
});
