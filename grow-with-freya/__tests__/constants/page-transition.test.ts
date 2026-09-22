/**
 * Pages a child can slide onto from a settled page are mounted ahead of time,
 * so the slide never waits on their first render.
 */

import { PREWARMED_PAGES } from '@/constants/page-transition';

describe('PREWARMED_PAGES', () => {
  // built from cold, Grown-ups dropped a frame mid-slide however the slide was
  // started; built ahead of time it slides in on every frame
  it.each(['stories', 'account'])('keeps %s mounted off screen, ready to slide in', (page) => {
    expect(PREWARMED_PAGES).toContain(page);
  });

  it('never lists the always-mounted main menu', () => {
    expect(PREWARMED_PAGES).not.toContain('main');
  });
});
