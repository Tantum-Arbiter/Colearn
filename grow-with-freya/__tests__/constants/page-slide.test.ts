/**
 * Where every page rests while another is showing. Grown-ups lies below the
 * Profile page: it rises into view from beneath, and the page it came from
 * lifts away above.
 */

import { accountReturnPage, crossesView, pageOffset } from '@/constants/page-slide';

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
