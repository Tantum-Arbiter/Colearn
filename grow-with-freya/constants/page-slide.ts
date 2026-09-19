export function pageOffset(page: string, current: string, height: number): number {
  if (page === current) return 0;
  if (page === 'main') return -height;
  if ((page === 'spelling' || page === 'numbers') && current === 'spelling-game') return -height;
  if (page === 'stories' && current === 'account') return -height;
  return height;
}

export function crossesView(from: number, to: number): boolean {
  return from * to < 0;
}

export function accountReturnPage<Page extends string>(openedFrom: Page): Page | 'main' {
  return openedFrom === 'account' ? 'main' : openedFrom;
}
