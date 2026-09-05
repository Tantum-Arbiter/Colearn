/**
 * The featured card is the most important element on the screen (§6.7): the
 * book's title, a line or two about it and a Read Now button beside a glimpse
 * inside the book -- its third page rather than the cover the child has
 * already seen on the shelf. The whole card is tappable as well as the button.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import {
  FeaturedStoryCard,
  INSIGHT_INSET,
  TEXT_WIDTH,
  READABILITY_WASH_LOCATIONS,
} from '@/components/stories/catalogue/featured-story-card';
import { FEATURED_ASPECT_RATIO, FEATURED_ASPECT_RATIO_TABLET } from '@/components/child-ui/tokens';
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


  it('caps the title at two lines', () => {
    const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} />);

    expect(byTestId(tree, 'featured-story-title')[0].props.numberOfLines).toBe(2);
  });

  it('shows the localised title for the active language', () => {
    const model = fromStory(story({ localizedTitle: { en: 'Snuggle Little Wombat', fr: 'Petit wombat câlin' } }));
    const tree = render(<FeaturedStoryCard story={model} width={340} language="fr" onOpen={jest.fn()} />);

    expect(byTestId(tree, 'featured-story-title')[0].props.children).toBe('Petit wombat câlin');
  });

  it('should show a line or two about the story, so the panel says what it is', () => {
    const model = fromStory(story({ description: 'A gentle story about finding the perfect place to rest.' }));

    const tree = render(<FeaturedStoryCard story={model} width={340} language="en" onOpen={jest.fn()} />);

    const underTest = byTestId(tree, 'featured-story-description')[0];
    expect(underTest.props.children).toBe('A gentle story about finding the perfect place to rest.');
    expect(underTest.props.numberOfLines).toBe(3);
  });

  it('should offer Read Now as a button of its own, not only the whole card', () => {
    const onOpen = jest.fn();
    const model = fromStory(story());
    const tree = render(<FeaturedStoryCard story={model} width={340} language="en" onOpen={onOpen} />);

    fireEvent.press(byTestId(tree, 'featured-story-read-now')[0]);

    expect(onOpen).toHaveBeenCalledWith(model, expect.anything());
  });

  it('should open the book to its third page, for a glimpse of what is inside', () => {
    // The cover is already on the shelf behind; showing it again says nothing
    // new about the story.
    const model = fromStory(story({
      pages: [1, 2, 3].map((n) => ({ id: `p${n}`, pageNumber: n, text: '', backgroundImage: `file://page-${n}.webp` })),
    }));

    const tree = render(<FeaturedStoryCard story={model} width={340} language="en" onOpen={jest.fn()} />);

    const underTest = byTestId(tree, 'featured-story-insight')[0];
    expect(underTest.props.source).toEqual({ uri: 'file://page-3.webp' });
  });

  it('should fall back to the cover for a book with no third page', () => {
    const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} />);

    const underTest = byTestId(tree, 'featured-story-insight')[0];

    expect(underTest.props.source).toEqual({ uri: 'file://wombat.webp' });
  });

  it('should say nothing rather than leave an empty gap when the story has no description', () => {
    const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} />);

    expect(byTestId(tree, 'featured-story-description')).toHaveLength(0);
  });

  it('should sit the words at the top of the box, the way the design does', () => {
    const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} />);

    const body = StyleSheet.flatten(byTestId(tree, 'featured-story-body')[0].props.style);

    expect(body.justifyContent).toBe('flex-start');
  });

  it('should carry no border, so the cropped artwork cannot light one up from behind', () => {
    // The defect this pins: the picture is scaled to crop its paper margin, so
    // it runs under the panel's edge; a translucent border over it read as a
    // white spine down the left side, where the page's paper showed through.
    const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} />);

    const underTest = StyleSheet.flatten(byTestId(tree, 'featured-story-card')[0].props.style);

    expect(underTest.borderWidth).toBeUndefined();
    expect(underTest.overflow).toBe('hidden');
  });

  it('should start the picture a tenth in and run it to the right edge, anchored right', () => {
    const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} />);

    const insight = byTestId(tree, 'featured-story-insight')[0];
    const underTest = StyleSheet.flatten(insight.props.style);

    expect(INSIGHT_INSET).toBe(0.1);
    expect(underTest.left).toBe('10%');
    expect(underTest.right).toBe(0);
    expect(underTest.width).toBeUndefined();
    expect(insight.props.contentPosition).toBe('right');
  });

  it('should lay the wash solid over the bare strip and clear it just past the words', () => {
    const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} />);

    const wash = byTestId(tree, 'linear-gradient')[0];
    const body = StyleSheet.flatten(byTestId(tree, 'featured-story-body')[0].props.style);
    const stops = wash.props.locations as readonly number[];
    const colours = wash.props.colors as readonly string[];

    expect(stops).toEqual(READABILITY_WASH_LOCATIONS);
    expect(stops[0]).toBe(0);
    expect(stops[1]).toBe(INSIGHT_INSET);
    expect(stops[stops.length - 1]).toBeGreaterThan(TEXT_WIDTH);
    expect(stops[stops.length - 1]).toBeLessThan(0.7);
    expect(body.width).toBe(`${TEXT_WIDTH * 100}%`);
    expect(colours[0]).toBe('rgba(9, 20, 56, 1)');
    expect(colours[colours.length - 1]).toBe('rgba(9, 20, 56, 0)');
  });

  it('should stand at the phone aspect ratio for its width, and run wider on a tablet', () => {
    const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} />);

    const underTest = StyleSheet.flatten(byTestId(tree, 'featured-story-card')[0].props.style);

    expect(underTest.width).toBe(340);
    expect(underTest.height).toBe(Math.round(340 / FEATURED_ASPECT_RATIO));
    expect(FEATURED_ASPECT_RATIO_TABLET).toBeGreaterThan(FEATURED_ASPECT_RATIO);
  });

  it('should say what it is offering: Featured Story unless told otherwise', () => {
    const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} />);
    const pick = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} label="catalogue.todaysPick" testID="todays-pick-card" />);

    expect(byTestId(tree, 'featured-story-card-label').some((n: any) => n.props.children === 'catalogue.featuredStory')).toBe(true);
    expect(byTestId(pick, 'todays-pick-card-label').some((n: any) => n.props.children === 'catalogue.todaysPick')).toBe(true);
  });
});
