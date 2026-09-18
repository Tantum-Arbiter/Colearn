import { COVER_GRID_GAP } from '@/components/child-ui/tokens';

export const CATALOGUE_COLUMNS = {
  phone: 2,
  tabletMin: 3,
  tabletMax: 5,
  minTabletCoverWidth: 176,
} as const;

export function coverWidthFor(gridWidth: number, columns: number): number {
  return Math.floor((gridWidth - COVER_GRID_GAP * (columns - 1)) / columns);
}

export function coverColumns(isTablet: boolean, gridWidth: number): number {
  if (!isTablet) {
    return CATALOGUE_COLUMNS.phone;
  }
  const { tabletMin, tabletMax, minTabletCoverWidth } = CATALOGUE_COLUMNS;
  const fit = Math.floor((gridWidth + COVER_GRID_GAP) / (minTabletCoverWidth + COVER_GRID_GAP));
  return Math.min(tabletMax, Math.max(tabletMin, fit));
}
