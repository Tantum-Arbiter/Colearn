/**
 * The journey shell mounts the navigation with the journey content (§6.11);
 * the reader hides it via navigationHidden without unmounting the journey.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { JourneyShell } from '@/components/child-ui/journey-shell';

function byTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

describe('JourneyShell', () => {
  it('renders journey content alongside the navigation', () => {
    const tree = render(
      <JourneyShell selected="progress" onSelect={jest.fn()}>
        <Text testID="journey-content">content</Text>
      </JourneyShell>
    );

    expect(byTestId(tree, 'journey-content').length).toBeGreaterThan(0);
    expect(byTestId(tree, 'child-bottom-navigation').length).toBeGreaterThan(0);
  });

  it('hides the navigation when navigationHidden is set', () => {
    const tree = render(
      <JourneyShell selected="progress" onSelect={jest.fn()} navigationHidden>
        <Text testID="journey-content">content</Text>
      </JourneyShell>
    );

    expect(byTestId(tree, 'journey-content').length).toBeGreaterThan(0);
    expect(byTestId(tree, 'child-bottom-navigation')).toHaveLength(0);
  });
});
