import { useCallback } from 'react';
import { useAppStore, type ChallengeKind } from '@/store/app-store';
import type { Story } from '@/types/story';
import { awardsFor } from './achievements';

export function useAchievementEvents(story: Story) {
  const markStoryCompleted = useAppStore((state) => state.markStoryCompleted);
  const recordChallengeCompleted = useAppStore((state) => state.recordChallengeCompleted);
  const grantAchievements = useAppStore((state) => state.grantAchievements);

  const challengeDone = useCallback((pageId: string, kind: ChallengeKind) => {
    recordChallengeCompleted(kind);
    grantAchievements(awardsFor(story, { challengePageId: pageId }));
  }, [story, recordChallengeCompleted, grantAchievements]);

  const storyFinished = useCallback(() => {
    markStoryCompleted(story.id);
    grantAchievements(awardsFor(story, { finished: true }));
  }, [story, markStoryCompleted, grantAchievements]);

  return { challengeDone, storyFinished };
}
