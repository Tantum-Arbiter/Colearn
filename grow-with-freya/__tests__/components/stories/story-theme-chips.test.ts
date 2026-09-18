/**
 * Tests for the themes shown under a story's title.
 *
 * A theme wears the same icon wherever a child meets it, so the chips borrow
 * the catalogue filter pills' icon set rather than carrying emoji of their own.
 */

import { FILTER_PILL_ICONS } from '@/components/stories/catalogue/story-filter-pill';
import { storyThemeChips } from '@/components/stories/story-theme-chips';
import { STORY_FILTER_TAGS, STORY_TAGS, type StoryFilterTag } from '@/types/story';

describe('storyThemeChips', () => {
  it('should draw a theme with the icon the catalogue filter pill uses', () => {
    const underTest = storyThemeChips({ category: 'bedtime', tags: ['bedtime'] })[0];

    expect(underTest.icon).toBe(FILTER_PILL_ICONS.bedtime.icon);
    expect(underTest.color).toBe(FILTER_PILL_ICONS.bedtime.color);
  });

  it('should label a theme from the same translation key as the filter pill', () => {
    const underTest = storyThemeChips({ category: 'bedtime', tags: ['calming'] })[0];

    expect(underTest.labelKey).toBe(STORY_FILTER_TAGS.calming.labelKey);
  });

  it('should carry no emoji of its own', () => {
    const underTest = storyThemeChips({ category: 'bedtime', tags: ['bedtime', 'calming'] });

    expect(underTest.every((chip) => !('emoji' in chip))).toBe(true);
  });

  it('should show every theme the story carries, in the order it carries them', () => {
    const underTest = storyThemeChips({ category: 'bedtime', tags: ['adventure', 'bedtime', 'calming'] });

    expect(underTest.map((chip) => chip.id)).toEqual(['adventure', 'bedtime', 'calming']);
  });

  it('should say a repeated theme only once', () => {
    const underTest = storyThemeChips({ category: 'bedtime', tags: ['bedtime', 'bedtime'] });

    expect(underTest.map((chip) => chip.id)).toEqual(['bedtime']);
  });

  it('should fall back to the story category so the row is never empty', () => {
    const underTest = storyThemeChips({ category: 'friendship', tags: [] });

    expect(underTest.map((chip) => chip.id)).toEqual(['friendship']);
    expect(underTest[0].labelKey).toBe(STORY_TAGS.friendship.labelKey);
  });

  it.each(['activities', 'growing'] as const)(
    'should still find an icon for the %s category, which is not a filter tag',
    (category) => {
      const underTest = storyThemeChips({ category, tags: [] })[0];

      expect(underTest.icon).toBeTruthy();
      expect(underTest.color).toBeTruthy();
    }
  );

  it.each(Object.keys(STORY_FILTER_TAGS) as StoryFilterTag[])(
    'should have an icon ready for the %s theme',
    (tag) => {
      const underTest = storyThemeChips({ category: 'bedtime', tags: [tag] })[0];

      expect(underTest.id).toBe(tag);
      expect(underTest.icon).toBe(FILTER_PILL_ICONS[tag].icon);
    }
  );
});
