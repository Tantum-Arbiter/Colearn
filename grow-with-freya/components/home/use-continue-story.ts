import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/app-store';
import { ALL_STORIES } from '@/data/stories';
import { getLocalizedText } from '@/types/story';
import { continuingStoryId } from '@/components/stories/catalogue/catalogue-story';
import type { SupportedLanguage } from '@/services/i18n';
import type { ChildHomeStory } from '@/types/child-home';

export function useContinueStory(): ChildHomeStory | undefined {
  const { i18n } = useTranslation();
  const storyProgress = useAppStore((state) => state.storyProgress);
  const lastStoryCompletedAt = useAppStore((state) => state.lastStoryCompletedAt);
  const language = (i18n.language ?? 'en') as SupportedLanguage;

  return useMemo((): ChildHomeStory | undefined => {
    const storyId = continuingStoryId(storyProgress);

    if (!storyId) {
      return undefined;
    }

    const story = ALL_STORIES.find((candidate) => candidate.id === storyId);
    const progress = storyProgress[storyId];

    if (!story || !progress) {
      return undefined;
    }

    if (lastStoryCompletedAt !== null && lastStoryCompletedAt > progress.updatedAt) {
      return undefined;
    }

    return {
      id: storyId,
      title: getLocalizedText(story.localizedTitle, story.title, language),
      currentPage: progress.pageIndex,
      totalPages: progress.totalPages - 1,
      coverImage: typeof story.coverImage === 'string' ? { uri: story.coverImage } : story.coverImage,
    };
  }, [storyProgress, lastStoryCompletedAt, language]);
}
