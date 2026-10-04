import { cloudGap } from '@/constants/earth';

export const ISLAND_ACTIVITY_PAGES = ['feelings', 'practise', 'spelling-game'] as const;

export function pageOffset(page: string, current: string, height: number): number {
  if (page === current) return 0;
  if (page === 'main') return -height;
  if ((page === 'spelling' || page === 'numbers') && current === 'spelling-game') return -height;
  if (page === 'stories' && current === 'account') return -height;
  if (page === 'island' && (ISLAND_ACTIVITY_PAGES as readonly string[]).includes(current)) return -height;
  return height;
}

export function crossesView(from: number, to: number): boolean {
  return from * to < 0;
}

export function accountReturnPage<Page extends string>(openedFrom: Page): Page | 'main' {
  return openedFrom === 'account' ? 'main' : openedFrom;
}

export function voyageStaysOut(page: string, fromIsland: boolean): boolean {
  if (page === 'island') return true;
  return fromIsland && (ISLAND_ACTIVITY_PAGES as readonly string[]).includes(page);
}

export function slideTravel(width: number, height: number): number {
  return height + cloudGap(width, height);
}

export function snapToPixel(value: number, scale: number): number {
  'worklet';
  return Math.round(value * scale) / scale + 0;
}
