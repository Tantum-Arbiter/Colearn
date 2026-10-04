import React, { memo, useCallback, useState } from 'react';
import { useAppStore } from '@/store/app-store';
import { SubscriptionOverlay } from '@/components/ui/subscription-overlay';
import { TrialEndUpgradeOverlay } from '@/components/ui/trial-end-upgrade-overlay';
import { shouldOfferPlan } from '@/constants/unlock-plan';
import { useIslandVoyage } from '@/contexts/island-voyage-context';
import { useStoryTransition } from '@/contexts/story-transition-context';
import { ALL_STORIES } from '@/data/stories';
import { useScreenTimeAllowance } from '@/hooks/use-screen-time-allowance';
import { useTrialEndPrompt } from '@/hooks/use-trial-end-prompt';
import { useTimeOfDay } from '@/hooks/use-time-of-day';
import { isScreenTimeExceeded } from '@/constants/screen-time-ring';
import type { DestinationFocus } from '@/constants/catalogue-destinations';
import { ScreenTimeGlance } from './screen-time-glance';
import type { HomeSceneProps } from './home-scene';
import { HomeScene, type HomeSection, type HomeGuideTargets } from './home-scene';
import { useChildHomeData } from './use-child-home-data';
import { useJourneySteps } from './use-journey-steps';

export const HOME_DESTINATIONS = {
  stories: 'stories',
  progress: 'progress',
  search: 'search',
  profile: 'profile',
} as const;

export interface HomeSceneContainerProps {
  onNavigate: (destination: string, focus?: DestinationFocus) => void;
  onOpenStoryCard?: HomeSceneProps['onOpenStoryCard'];
  guideTargets?: HomeGuideTargets;
  /** Passed to the scene's scroll view, for the tour that runs over it. */
  scrollBinding?: HomeSceneProps['scrollBinding'];
  isActive?: boolean;
}

export const HomeSceneContainer = memo(function HomeSceneContainer({
  onNavigate,
  onOpenStoryCard,
  guideTargets,
  scrollBinding,
  isActive = true,
}: HomeSceneContainerProps) {
  const { data, welcome, celebrateAchievement } = useChildHomeData();
  const journeySteps = useJourneySteps(isActive);
  const { requestStoryOpen } = useStoryTransition();
  const { depart, phase } = useIslandVoyage();
  const landing = phase === 'recrossing' || phase === 'landing';
  const screenTime = useScreenTimeAllowance();
  const timeOfDay = useTimeOfDay();
  const trialEnd = useTrialEndPrompt();
  const [showScreenTime, setShowScreenTime] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const getEffectiveTier = useAppStore((state) => state.getEffectiveTier);

  const currentStoryId = data.currentStory?.id;

  const handleContinue = useCallback(() => {
    const story = currentStoryId ? ALL_STORIES.find((candidate) => candidate.id === currentStoryId) : undefined;

    if (story) {
      requestStoryOpen(story, 'read', null);
      return;
    }

    onNavigate(HOME_DESTINATIONS.stories);
  }, [currentStoryId, onNavigate, requestStoryOpen]);

  const handleSelectSection = useCallback(
    (id: HomeSection) => onNavigate(id === 'home' ? HOME_DESTINATIONS.stories : HOME_DESTINATIONS[id]),
    [onNavigate]
  );
  const openBadge = useCallback(
    (badgeId: string) => onNavigate(HOME_DESTINATIONS.progress, { badgeId }),
    [onNavigate]
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
        data={data}
        welcome={welcome}
        celebrateAchievement={celebrateAchievement}
        journeySteps={journeySteps}
        onContinue={handleContinue}
        onOpenJourney={depart}
        onSelectSection={handleSelectSection}
        onOpenBadge={openBadge}
        onOpenStoryCard={onOpenStoryCard}
        screenTime={screenTime}
        timeOfDay={timeOfDay}
        onOpenScreenTime={openScreenTime}
        screenTimeHidden={showScreenTime}
        onOpenPlans={offerPlan ? openPlans : undefined}
        isActive={isActive && !landing}
        guideTargets={guideTargets}
        scrollBinding={scrollBinding}
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

      <TrialEndUpgradeOverlay
        visible={trialEnd.visible && !showPlans}
        onClose={trialEnd.dismiss}
        status={trialEnd.status}
      />
    </>
  );
});
