/**
 * Tests for how many books sit across a catalogue row.
 *
 * A phone always shows two. A tablet fits as many as keep each book at least
 * a readable width, three to five of them, so a small tablet in portrait shows
 * four, a large one five, and either turned sideways -- where the featured
 * book takes its own column and the grid is narrower -- shows three.
 */

import { CATALOGUE_COLUMNS, coverColumns, coverWidthFor } from '@/constants/catalogue-columns';
import { COVER_GRID_GAP, CONTENT_MARGIN_PHONE, CONTENT_MARGIN_TABLET, SPACE_5 } from '@/components/child-ui/tokens';

const portraitGrid = (windowWidth: number) => windowWidth - CONTENT_MARGIN_TABLET * 2;
const landscapeGrid = (windowWidth: number) => (windowWidth - CONTENT_MARGIN_TABLET * 2 - SPACE_5) * 0.55;

describe('coverColumns', () => {
  it.each([320, 402, 430])('should always show two books across on a phone %i wide', (width) => {
    expect(coverColumns(false, width - CONTENT_MARGIN_PHONE * 2)).toBe(CATALOGUE_COLUMNS.phone);
  });

  it.each([
    ['11-inch iPad portrait', portraitGrid(834), 4],
    ['13-inch iPad portrait', portraitGrid(1024), 5],
    ['11-inch iPad landscape, grid beside the featured book', landscapeGrid(1194), 3],
    ['13-inch iPad landscape, grid beside the featured book', landscapeGrid(1366), 3],
    ['iPad mini portrait', portraitGrid(744), 3],
  ])('should fit as many books as stay readable on a tablet: %s shows %i', (_name, gridWidth, expected) => {
    expect(coverColumns(true, gridWidth)).toBe(expected);
  });

  it('should never show fewer than three on a tablet, however narrow the grid', () => {
    expect(coverColumns(true, 300)).toBe(CATALOGUE_COLUMNS.tabletMin);
  });

  it('should never show more than five on a tablet, however wide the grid', () => {
    expect(coverColumns(true, 4000)).toBe(CATALOGUE_COLUMNS.tabletMax);
  });

  it('should keep every tablet book at least as wide as the readable minimum whenever the cap is not binding', () => {
    const widths = Array.from({ length: 60 }, (_, i) => 500 + i * 20);

    const underTest = widths.every((gridWidth) => {
      const columns = coverColumns(true, gridWidth);
      return columns === CATALOGUE_COLUMNS.tabletMin || coverWidthFor(gridWidth, columns) >= CATALOGUE_COLUMNS.minTabletCoverWidth;
    });

    expect(underTest).toBe(true);
  });

  it('should add a column as soon as one more book would still be readable', () => {
    const fourFit = CATALOGUE_COLUMNS.minTabletCoverWidth * 4 + COVER_GRID_GAP * 3;

    expect(coverColumns(true, fourFit - 1)).toBe(3);
    expect(coverColumns(true, fourFit)).toBe(4);
  });
});

describe('coverWidthFor', () => {
  it('should split the grid into whole-point columns with the gaps taken out', () => {
    expect(coverWidthFor(770, 4)).toBe(Math.floor((770 - COVER_GRID_GAP * 3) / 4));
    expect(coverWidthFor(358, 2)).toBe(173);
  });
});
