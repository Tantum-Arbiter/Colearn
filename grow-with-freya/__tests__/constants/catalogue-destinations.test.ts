/**
 * Tests for where the home's bottom bar sends the child.
 *
 * The bar on the home page is the same one the library carries. Home is
 * where they already are; the other items open the library on that section,
 * and Screensafe is a window rather than a place.
 */

import { catalogueSectionFor, destinationForSection, isCatalogueDestination } from '@/constants/catalogue-destinations';

describe('catalogueSectionFor', () => {
  it.each([
    ['stories', 'home'],
    ['progress', 'progress'],
    ['search', 'search'],
    ['profile', 'profile'],
  ])('should open the library on the right section for %s', (destination, section) => {
    expect(catalogueSectionFor(destination)).toBe(section);
  });

  it.each(['account', 'practise', 'stories-read', 'screensafe', 'home', ''])('should name no section for %s', (destination) => {
    expect(catalogueSectionFor(destination)).toBeNull();
  });
});

describe('isCatalogueDestination', () => {
  it('should be true exactly for the destinations the library can open on', () => {
    expect(['stories', 'progress', 'search', 'profile'].every(isCatalogueDestination)).toBe(true);
    expect(['account', 'stories-read', 'home'].some(isCatalogueDestination)).toBe(false);
  });
});

describe('destinationForSection', () => {
  it.each([
    ['home', 'stories'],
    ['progress', 'progress'],
    ['search', 'search'],
    ['profile', 'profile'],
  ] as const)('names the page the %s item opens, the way the main menu sends it', (section, destination) => {
    expect(destinationForSection(section)).toBe(destination);
    expect(catalogueSectionFor(destination)).toBe(section);
  });

  it('has no page for Screensafe, which is a window rather than a place', () => {
    expect(destinationForSection('screensafe')).toBeNull();
  });
});
