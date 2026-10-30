/**
 * Pages a child can slide onto from a settled page are mounted ahead of time,
 * so the slide never waits on their first render.
 */

import { PREWARMED_PAGES, prewarmedDuring } from '@/constants/page-transition';
import type { VoyagePhase } from '@/constants/island-voyage';

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

describe('prewarmedDuring', () => {
  // mounted half a second into the dive, the island stopped the zoom for 170-240 ms; mounted
  // under the shut cloud, the same work cannot be seen
  it.each(['home', 'leaving'] as VoyagePhase[])('keeps the island unmounted while %s, so the dive never waits on it', (phase) => {
    expect(prewarmedDuring(phase)).toEqual(PREWARMED_PAGES);
    expect(prewarmedDuring(phase)).not.toContain('island');
  });

  it.each(['crossing', 'arriving', 'island', 'returning', 'recrossing', 'landing'] as VoyagePhase[])(
    'keeps the island mounted from the shut cloud on, while %s, beside the usual pages',
    (phase) => {
      expect(prewarmedDuring(phase)).toEqual([...PREWARMED_PAGES, 'island']);
    }
  );
});

