/**
 * How far through a book the child is, and where the reader opens it. A book
 * they are part-way through opens where they left off; anything else opens at
 * the first page of the story, past the cover.
 */

import { readingFraction, resumePageIndex } from '@/components/stories/reading-progress';

describe('resumePageIndex', () => {
  it('should open where the child left off', () => {
    const underTest = resumePageIndex({ skipCoverPage: true, savedPlace: { pageIndex: 3, totalPages: 9 }, totalPages: 9 });

    expect(underTest).toBe(3);
  });

  it('should open at the first page past the cover when nothing is saved', () => {
    const underTest = resumePageIndex({ skipCoverPage: true, totalPages: 9 });

    expect(underTest).toBe(1);
  });

  it.each([
    ['a book still on its cover', 0],
    ['a book whose place was cleared', 0],
  ])('should open at the first page for %s', (_case, pageIndex) => {
    const underTest = resumePageIndex({ skipCoverPage: true, savedPlace: { pageIndex, totalPages: 9 }, totalPages: 9 });

    expect(underTest).toBe(1);
  });

  it.each([
    ['a page picked on the story card, over the saved place', 6, 6],
    ['the first page when picked', 1, 1],
    ['no further than the last page', 20, 8],
    ['no earlier than the first page past the cover', 0, 1],
  ])('should open at %s', (_case, startPage, expected) => {
    const underTest = resumePageIndex({ skipCoverPage: true, savedPlace: { pageIndex: 3, totalPages: 9 }, totalPages: 9, startPage });

    expect(underTest).toBe(expected);
  });

  it('should open at the cover when the cover is not being skipped', () => {
    const underTest = resumePageIndex({ skipCoverPage: false, savedPlace: { pageIndex: 3, totalPages: 9 }, totalPages: 9 });

    expect(underTest).toBe(0);
  });

  it('should never open past the last page, however stale the saved place', () => {
    const underTest = resumePageIndex({ skipCoverPage: true, savedPlace: { pageIndex: 12, totalPages: 13 }, totalPages: 9 });

    expect(underTest).toBe(8);
  });

  it('should open at the cover of a book with no pages at all', () => {
    const underTest = resumePageIndex({ skipCoverPage: true, savedPlace: { pageIndex: 3, totalPages: 9 }, totalPages: 0 });

    expect(underTest).toBe(0);
  });
});

describe('readingFraction', () => {
  it.each([
    ['a book just begun', { pageIndex: 1, totalPages: 9 }, 0.125],
    ['a book halfway through', { pageIndex: 4, totalPages: 9 }, 0.5],
    ['a book on its last page', { pageIndex: 8, totalPages: 9 }, 1],
  ])('should measure %s against the pages there are to read, not counting the cover', (_case, place, expected) => {
    const underTest = readingFraction(place);

    expect(underTest).toBeCloseTo(expected, 5);
  });

  it('should never run past the end, however stale the saved place', () => {
    const underTest = readingFraction({ pageIndex: 20, totalPages: 9 });

    expect(underTest).toBe(1);
  });

  it.each([
    ['a book of one page', { pageIndex: 0, totalPages: 1 }],
    ['a book of none', { pageIndex: 0, totalPages: 0 }],
  ])('should measure nothing for %s', (_case, place) => {
    const underTest = readingFraction(place);

    expect(underTest).toBe(0);
  });
});
