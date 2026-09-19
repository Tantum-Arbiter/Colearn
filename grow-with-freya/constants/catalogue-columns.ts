import { COVER_GRID_GAP, SPACE_5 } from '@/components/child-ui/tokens';

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

export interface CatalogueLayoutInput {
  isTablet: boolean;
  landscape: boolean;
  contentWidth: number;
  hasPick: boolean;
}

export interface CatalogueLayout {
  pickBesideFeatured: boolean;
  featuredWidth: number;
  pickWidth: number;
  shelfWidth: number;
}

export function catalogueLayout({ isTablet, landscape, contentWidth, hasPick }: CatalogueLayoutInput): CatalogueLayout {
  const pickBesideFeatured = isTablet && landscape && hasPick;
  const halfWidth = Math.floor((contentWidth - SPACE_5) / 2);

  return {
    pickBesideFeatured,
    featuredWidth: pickBesideFeatured ? halfWidth : contentWidth,
    pickWidth: pickBesideFeatured ? halfWidth : contentWidth,
    shelfWidth: contentWidth,
  };
}
