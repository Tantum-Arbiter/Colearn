import { Ionicons } from '@expo/vector-icons';
import { FILTER_PILL_ICONS } from '@/components/stories/catalogue/story-filter-pill';
import { ACCENT_GOLD, ACCENT_GREEN } from '@/constants/night-palette';
import {
  STORY_FILTER_TAGS,
  STORY_TAGS,
  type Story,
  type StoryCategory,
  type StoryFilterTag,
} from '@/types/story';

export interface StoryThemeChip {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  labelKey: string;
}

const CATEGORY_ONLY_ICONS: Record<'activities' | 'growing', { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  activities: { icon: 'color-wand', color: ACCENT_GOLD },
  growing: { icon: 'leaf', color: ACCENT_GREEN },
};

function categoryChip(category: StoryCategory): StoryThemeChip {
  const shared = FILTER_PILL_ICONS[category as StoryFilterTag];
  const spec = shared ?? CATEGORY_ONLY_ICONS[category as 'activities' | 'growing'];

  return {
    id: category,
    icon: spec.icon,
    color: spec.color,
    labelKey: STORY_TAGS[category].labelKey,
  };
}

/**
 * The themes shown under a story's title, drawn with the same icons the
 * catalogue filter pills use so a child sees one visual language for a theme
 * wherever it appears. Falls back to the story's category when it carries no
 * filter tags, so the row is never empty.
 */
export function storyThemeChips(story: Pick<Story, 'category' | 'tags'>): StoryThemeChip[] {
  const seen = new Set<string>();
  const chips: StoryThemeChip[] = [];

  for (const tag of story.tags ?? []) {
    const spec = FILTER_PILL_ICONS[tag as StoryFilterTag];
    const info = STORY_FILTER_TAGS[tag as StoryFilterTag];

    if (!spec || !info || seen.has(tag)) {
      continue;
    }

    seen.add(tag);
    chips.push({ id: tag, icon: spec.icon, color: spec.color, labelKey: info.labelKey });
  }

  return chips.length > 0 ? chips : [categoryChip(story.category)];
}
