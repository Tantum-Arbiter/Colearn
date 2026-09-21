/**
 * Every journey page, and the main menu's speaker, hang their header row from
 * the same line under the status bar.
 */

import { SPACE_2, journeyHeaderTop } from '@/components/child-ui/tokens';

describe('journeyHeaderTop', () => {
  it('sits right on the safe area on a phone', () => {
    expect(journeyHeaderTop(47, false)).toBe(47);
  });

  it('drops a small step below it on a tablet', () => {
    expect(journeyHeaderTop(24, true)).toBe(24 + SPACE_2);
  });
});
