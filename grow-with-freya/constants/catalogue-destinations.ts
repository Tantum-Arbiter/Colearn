import type { ChildNavItemId } from '@/components/child-ui/child-bottom-navigation';
import type { StoryFilterTag } from '@/types/story';

export interface DestinationFocus {
  badgeId?: string;
  recommend?: { tag: StoryFilterTag | null };
}

const SECTION_BY_DESTINATION: Record<string, ChildNavItemId> = {
  stories: 'home',
  progress: 'progress',
  search: 'search',
  profile: 'profile',
};

export function catalogueSectionFor(destination: string): ChildNavItemId | null {
  return SECTION_BY_DESTINATION[destination] ?? null;
}

export function destinationForSection(section: ChildNavItemId): string | null {
  const found = Object.entries(SECTION_BY_DESTINATION).find(([, id]) => id === section);
  return found ? found[0] : null;
}

export function isCatalogueDestination(destination: string): boolean {
  return catalogueSectionFor(destination) !== null;
}
