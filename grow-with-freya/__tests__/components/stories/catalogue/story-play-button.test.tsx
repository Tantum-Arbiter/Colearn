/**
 * The play button reads as an invitation to open a book (§6.8): the
 * featured variant carries the localised "Read" label, the card variant
 * is icon-only, and both stay accessible buttons.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StoryPlayButton } from '@/components/stories/catalogue/story-play-button';

function byTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

describe('StoryPlayButton', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the Read label on the featured variant via its translation key', () => {
    const tree = render(
      <StoryPlayButton variant="featured" onPress={jest.fn()} accessibilityLabel="story" />
    );

    expect(byTestId(tree, 'story-play-label')[0].props.children).toBe('catalogue.read');
  });

  it('renders no label on the card variant', () => {
    const tree = render(
      <StoryPlayButton variant="card" onPress={jest.fn()} accessibilityLabel="story" />
    );

    expect(byTestId(tree, 'story-play-label')).toHaveLength(0);
  });

  it.each(['featured', 'card'] as const)('the %s variant is a labelled button that reports presses', (variant) => {
    const onPress = jest.fn();
    const tree = render(
      <StoryPlayButton variant={variant} onPress={onPress} accessibilityLabel="Snuggle Little Wombat" />
    );

    const button = byTestId(tree, `story-play-${variant}`)[0];
    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityLabel).toBe('Snuggle Little Wombat');

    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('keeps the card variant at the 44dp touch minimum', () => {
    const tree = render(
      <StoryPlayButton variant="card" onPress={jest.fn()} accessibilityLabel="story" />
    );

    const button = byTestId(tree, 'story-play-card')[0];
    const style = [button.props.style].flat(Infinity).reduce((acc: any, s: any) => ({ ...acc, ...s }), {});
    expect(style.width).toBeGreaterThanOrEqual(44);
    expect(style.height).toBeGreaterThanOrEqual(44);
  });
});
