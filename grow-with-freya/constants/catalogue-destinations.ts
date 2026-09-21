import type { ChildNavItemId } from '@/components/child-ui/child-bottom-navigation';

const SECTION_BY_DESTINATION: Record<string, ChildNavItemId> = {
  stories: 'home',
  progress: 'progress',
  search: 'search',
  profile: 'profile',
};

export function catalogueSectionFor(destination: string): ChildNavItemId | null {
  return SECTION_BY_DESTINATION[destination] ?? null;
}

export function isCatalogueDestination(destination: string): boolean {
  return catalogueSectionFor(destination) !== null;
}
