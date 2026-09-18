/**
 * The picture under the home tour's ring step: the real ring, twice, so a
 * parent sees both what it looks like with time left and the red orb it
 * becomes when the time is up.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ScreenTimeRingLegend } from '@/components/owl-guide/screen-time-ring-legend';

function byTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

describe('ScreenTimeRingLegend', () => {
  it('draws the ring with time left and the ring once time is up', () => {
    const underTest = render(<ScreenTimeRingLegend />);

    expect(byTestId(underTest, 'screen-time-ring-legend-remaining').length).toBeGreaterThan(0);
    expect(byTestId(underTest, 'screen-time-ring-legend-spent').length).toBeGreaterThan(0);
  });

  it('shows the spent ring as the filled red orb, and the other as a dial', () => {
    const underTest = render(<ScreenTimeRingLegend />);

    expect(byTestId(underTest, 'screen-time-ring-fill')).toHaveLength(1);
  });

  it('captions each state', () => {
    const underTest = render(<ScreenTimeRingLegend />);

    const texts = underTest.UNSAFE_root
      .findAll((n: any) => typeof n.props.children === 'string')
      .map((n: any) => n.props.children);

    expect(texts).toContain('tutorial.mainMenu.screenTime.remainingCaption');
    expect(texts).toContain('tutorial.mainMenu.screenTime.spentCaption');
  });
});
