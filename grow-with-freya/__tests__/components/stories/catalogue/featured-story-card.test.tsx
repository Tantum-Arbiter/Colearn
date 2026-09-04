/**
 * The featured card is the most important element on the screen (§6.7):
 * artwork-filled, whole card tappable in addition to the Read button,
 * title capped at two lines.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FeaturedStoryCard } from '@/components/stories/catalogue/featured-story-card';
import { fromStory } from '@/components/stories/catalogue/catalogue-story';
import { Story } from '@/types/story';

const story = (overrides: Partial<Story> = {}): Story => ({
  id: 'featured-1',
  title: 'Snuggle Little Wombat',
  category: 'bedtime',
  isAvailable: true,
  coverImage: 'file://wombat.webp',
  ...overrides,
});

function byTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

describe('FeaturedStoryCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('opens the story when the card itself is tapped', () => {
    const onOpen = jest.fn();
    const model = fromStory(story());
    const tree = render(<FeaturedStoryCard story={model} width={340} language="en" onOpen={onOpen} />);

    fireEvent.press(byTestId(tree, 'featured-story-card')[0]);

    expect(onOpen).toHaveBeenCalledWith(model, expect.anything());
  });

  it('opens the story from the Read button too', () => {
    const onOpen = jest.fn();
    const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={onOpen} />);

    fireEvent.press(byTestId(tree, 'story-play-featured')[0]);

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('caps the title at two lines', () => {
    const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} />);

    expect(byTestId(tree, 'featured-story-title')[0].props.numberOfLines).toBe(2);
  });

  it('shows the localised title for the active language', () => {
    const model = fromStory(story({ localizedTitle: { en: 'Snuggle Little Wombat', fr: 'Petit wombat câlin' } }));
    const tree = render(<FeaturedStoryCard story={model} width={340} language="fr" onOpen={jest.fn()} />);

    expect(byTestId(tree, 'featured-story-title')[0].props.children).toBe('Petit wombat câlin');
  });
});
