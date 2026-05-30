import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Story, StoryPage, getLocalizedText, resolveAgeGroup, AgeGroup } from '@/types/story';
import type { SupportedLanguage } from '@/services/i18n';
import { useAppStore } from '@/store/app-store';

/**
 * Hook to get localized story content based on current language
 */
export function useLocalizedStory(story: Story) {
  const { i18n } = useTranslation();
  const language = i18n.language as SupportedLanguage;

  return useMemo(() => ({
    title: getLocalizedText(story.localizedTitle, story.title, language),
    description: getLocalizedText(story.localizedDescription, story.description || '', language),
  }), [story, language]);
}

/**
 * Hook to get localized page text based on current language and child age group
 */
export function useLocalizedPage(page: StoryPage | undefined) {
  const { i18n } = useTranslation();
  const language = i18n.language as SupportedLanguage;
  const childAgeInMonths = useAppStore((state) => state.childAgeInMonths);
  const ageGroup = resolveAgeGroup(childAgeInMonths);

  return useMemo(() => {
    if (!page) return '';
    return getLocalizedText(undefined, page.text, language, page.localizedText, ageGroup);
  }, [page, language, ageGroup]);
}

/**
 * Get localized text for a story (non-hook version for use outside components)
 */
export function getLocalizedStoryTitle(
  story: Story,
  language: SupportedLanguage
): string {
  return getLocalizedText(story.localizedTitle, story.title, language);
}

/**
 * Get localized description for a story (non-hook version)
 */
export function getLocalizedStoryDescription(
  story: Story,
  language: SupportedLanguage
): string {
  return getLocalizedText(story.localizedDescription, story.description || '', language);
}

/**
 * Get localized page text (non-hook version)
 */
export function getLocalizedPageText(
  page: StoryPage | undefined,
  language: SupportedLanguage,
  ageGroup: AgeGroup = '4-6'
): string {
  if (!page) return '';
  return getLocalizedText(undefined, page.text, language, page.localizedText, ageGroup);
}

