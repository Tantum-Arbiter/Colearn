/**
 * Tests for the recommended-times card that lives inside the schedule window.
 *
 * Static content, moved here from the dashboard: three research-informed time
 * slots the parent can build reminders around. Fixed copy per slot rather than
 * derived, so what matters is that all three actually render together.
 */

import React from 'react';
import { render } from '@testing-library/react-native';

import { RecommendedTimes } from '@/components/screen-time/recommended-times';

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { Ionicons: (props: any) => <Text>{props.name}</Text> };
});

function findByTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

function toStr(tree: ReturnType<typeof render>) {
  return JSON.stringify(tree.toJSON());
}

describe('RecommendedTimes', () => {
  it('takes its title and intro from translation keys', () => {
    const body = toStr(render(<RecommendedTimes />));

    expect(body).toContain('screenTime.recommendedTimes');
    expect(body).toContain('screenTime.recommendedTimesIntro');
  });

  it('lists all three slots, each with its time and its activity key', () => {
    const body = toStr(render(<RecommendedTimes />));

    expect(body).toContain('9:00 AM - 10:00 AM');
    expect(body).toContain('screenTime.morningStoriesEmotions');

    expect(body).toContain('2:00 PM - 3:00 PM');
    expect(body).toContain('screenTime.afternoonLearning');

    expect(body).toContain('5:00 PM - 6:00 PM');
    expect(body).toContain('screenTime.preDinnerMusic');
  });

  it('exposes a testID so a host can find it', () => {
    const tree = render(<RecommendedTimes />);

    expect(findByTestId(tree, 'recommended-times').length).toBeGreaterThan(0);
  });
});
