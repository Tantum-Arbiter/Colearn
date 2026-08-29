/**
 * The weekly card answers "what have we enjoyed this week?" (§1): time
 * together plus the three activity metrics, all through translation keys.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ProgressHeroCard } from '@/components/progress/progress-hero-card';
import { EMPTY_COUNTERS } from '@/components/progress/progress-model';

const counters = {
  ...EMPTY_COUNTERS,
  minutesThisWeek: 84,
  storiesRead: 6,
  musicSessions: 4,
  calmMoments: 3,
};

function byTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

describe('ProgressHeroCard', () => {
  it('shows the weekly minutes in the ring and the time-together line', () => {
    const tree = render(<ProgressHeroCard counters={counters} />);

    expect(byTestId(tree, 'progress-ring-value')[0].props.children).toBe(84);
    expect(byTestId(tree, 'progress-minutes')[0].props.children).toBe(84);
  });

  it('shows the three activity metrics with their values', () => {
    const tree = render(<ProgressHeroCard counters={counters} />);

    expect(byTestId(tree, 'metric-stories-value')[0].props.children).toBe(6);
    expect(byTestId(tree, 'metric-music-value')[0].props.children).toBe(4);
    expect(byTestId(tree, 'metric-calm-value')[0].props.children).toBe(3);
  });

  it('labels everything through translation keys', () => {
    const tree = render(<ProgressHeroCard counters={counters} />);

    ['progress.weeklyHeading', 'progress.timeTogether', 'progress.storiesRead', 'progress.musicSessions', 'progress.calmMoments']
      .forEach((key) => {
        expect(tree.UNSAFE_root.findAll((n: any) => n.props.children === key).length).toBeGreaterThan(0);
      });
  });
});
