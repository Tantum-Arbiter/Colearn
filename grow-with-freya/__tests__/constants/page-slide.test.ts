/**
 * Where every page rests while another is showing. Grown-ups lies below the
 * Profile page: it rises into view from beneath, and the page it came from
 * lifts away above.
 */

import { ISLAND_ACTIVITY_PAGES, accountReturnPage, crossesView, pageOffset, snapToPixel, voyageStaysOut } from '@/constants/page-slide';

const HEIGHT = 800;

describe('pageOffset', () => {
  it('puts the page showing in view', () => {
    ['main', 'stories', 'account', 'spelling-game'].forEach((page) => {
      expect(pageOffset(page, page, HEIGHT)).toBe(0);
    });
  });

  it('keeps home above whatever is showing, Grown-ups included', () => {
    expect(pageOffset('main', 'stories', HEIGHT)).toBe(-HEIGHT);
    expect(pageOffset('main', 'account', HEIGHT)).toBe(-HEIGHT);
  });

  it('rests Grown-ups below, so it rises into view from beneath', () => {
    expect(pageOffset('account', 'main', HEIGHT)).toBe(HEIGHT);
    expect(pageOffset('account', 'stories', HEIGHT)).toBe(HEIGHT);
  });

  it('lifts the library away above while Grown-ups is showing', () => {
    expect(pageOffset('stories', 'account', HEIGHT)).toBe(-HEIGHT);
  });

  it('otherwise rests the library below, as every page does', () => {
    expect(pageOffset('stories', 'main', HEIGHT)).toBe(HEIGHT);
    expect(pageOffset('stories', 'feelings', HEIGHT)).toBe(HEIGHT);
  });

  it('lifts spelling and numbers above while the spelling game is showing', () => {
    expect(pageOffset('spelling', 'spelling-game', HEIGHT)).toBe(-HEIGHT);
    expect(pageOffset('numbers', 'spelling-game', HEIGHT)).toBe(-HEIGHT);
    expect(pageOffset('spelling', 'main', HEIGHT)).toBe(HEIGHT);
  });

  it('rests every other page below', () => {
    ['sensory', 'screen_time', 'practise', 'freeplay', 'feelings', 'spelling-game'].forEach((page) => {
      expect(pageOffset(page, 'account', HEIGHT)).toBe(HEIGHT);
    });
  });

  it('lifts the island above while an activity it set the child off on is showing', () => {
    ISLAND_ACTIVITY_PAGES.forEach((page) => {
      expect(pageOffset('island', page, HEIGHT)).toBe(-HEIGHT);
    });
    expect(ISLAND_ACTIVITY_PAGES).toEqual(expect.arrayContaining(['feelings', 'practise', 'spelling-game']));
  });

  it('rests the island below everywhere else, and every activity below the island', () => {
    expect(pageOffset('island', 'main', HEIGHT)).toBe(HEIGHT);
    expect(pageOffset('island', 'stories', HEIGHT)).toBe(HEIGHT);
    ISLAND_ACTIVITY_PAGES.forEach((page) => {
      expect(pageOffset(page, 'island', HEIGHT)).toBe(HEIGHT);
    });
  });
});

describe('crossesView', () => {
  it('is true only for a move from one side of the screen to the other', () => {
    expect(crossesView(-HEIGHT, HEIGHT)).toBe(true);
    expect(crossesView(HEIGHT, -HEIGHT)).toBe(true);
  });

  it('is false for a slide into or out of view, or staying put', () => {
    expect(crossesView(-HEIGHT, 0)).toBe(false);
    expect(crossesView(0, HEIGHT)).toBe(false);
    expect(crossesView(HEIGHT, HEIGHT)).toBe(false);
    expect(crossesView(-HEIGHT, -HEIGHT)).toBe(false);
  });
});

describe('accountReturnPage', () => {
  it('goes back to the page Grown-ups was opened from', () => {
    expect(accountReturnPage('stories')).toBe('stories');
    expect(accountReturnPage('main')).toBe('main');
  });

  it('goes home if it somehow has nothing else to return to', () => {
    expect(accountReturnPage('account')).toBe('main');
  });
});

// a page resting between device pixels leaves the row where two pages meet
// only partly covered by each, and whatever lies behind them shows through as a
// pale line (operator 2026-09-22, "a weird line separating pages")
describe('snapToPixel', () => {
  it.each([
    [123.4, 3, 123 + 1 / 3],
    [-0.1, 3, 0],
    [10.26, 2, 10.5],
    [-597.1, 3, -597],
  ])('puts %p on the nearest device pixel at %px scale', (value, scale, snapped) => {
    expect(snapToPixel(value, scale)).toBeCloseTo(snapped, 9);
  });

  it('keeps two pages a screen apart flush, pixel for pixel', () => {
    const height = 1194;
    for (const shift of [0.1, 0.17, 0.5, 0.83, 123.45]) {
      expect(snapToPixel(shift, 3) - snapToPixel(shift - height, 3)).toBeCloseTo(height, 9);
    }
  });
});

describe('voyageStaysOut', () => {
  it('keeps the voyage out on the island and on an activity the island set the child off on', () => {
    expect(voyageStaysOut('island', false)).toBe(true);
    ISLAND_ACTIVITY_PAGES.forEach((page) => expect(voyageStaysOut(page, true)).toBe(true));
  });

  it('brings it home for every other page, and for an activity opened from the menu', () => {
    ['main', 'stories', 'account', 'spelling', 'numbers', 'freeplay'].forEach((page) => {
      expect(voyageStaysOut(page, true)).toBe(false);
      expect(voyageStaysOut(page, false)).toBe(false);
    });
    ISLAND_ACTIVITY_PAGES.forEach((page) => expect(voyageStaysOut(page, false)).toBe(false));
  });
});
