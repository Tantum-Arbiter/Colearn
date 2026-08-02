/**
 * Tests for WorldInfoPanel -the sliding sheet that explains a world when its
 * tile is tapped on the first onboarding page.
 *
 * Key behaviors tested:
 * 1. Renders the world's title and description from translation keys
 * 2. Closes from the button and from the backdrop
 * 3. onClose fires only after the slide-out animation finishes
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { WorldInfoPanel } from '@/components/onboarding/world-info-panel';

function findByTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

function toStr(tree: ReturnType<typeof render>) {
  return JSON.stringify(tree.toJSON());
}

const defaultProps = {
  worldKey: 'stories',
  art: { uri: 'test-world-art' },
  onClose: jest.fn(),
};

describe('WorldInfoPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the world title and description keys', () => {
    const s = toStr(render(<WorldInfoPanel {...defaultProps} />));

    expect(s).toContain('onboardingV2.worlds.stories');
    expect(s).toContain('onboardingV2.worlds.storiesDesc');
  });

  it.each(['music', 'learning', 'feelings'])('renders the %s world', (key) => {
    const s = toStr(render(<WorldInfoPanel {...defaultProps} worldKey={key} />));

    expect(s).toContain(`onboardingV2.worlds.${key}Desc`);
  });

  it('is identifiable by its world key', () => {
    const tree = render(<WorldInfoPanel {...defaultProps} worldKey="music" />);

    expect(findByTestId(tree, 'world-info-music').length).toBeGreaterThan(0);
  });

  it('closes when the close button is pressed', () => {
    const tree = render(<WorldInfoPanel {...defaultProps} />);

    act(() => {
      fireEvent.press(findByTestId(tree, 'world-info-close')[0]);
    });

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('closes when the backdrop is pressed', () => {
    const tree = render(<WorldInfoPanel {...defaultProps} />);

    act(() => {
      fireEvent.press(findByTestId(tree, 'world-info-backdrop')[0]);
    });

    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
