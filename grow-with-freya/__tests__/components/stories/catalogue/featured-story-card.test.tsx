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
  INSIGHT_SHIFT,
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


  describe('a book part-way through', () => {
    const place = { currentPage: 4, totalPages: 11 };

    it('should show how far the child has read, as the home card does: the bar and the page they are on', () => {
      const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} place={place} />);

      const fill = byTestId(tree, 'featured-story-progress-fill');
      const meta = tree.UNSAFE_root.findAll((n: any) => n.props.children === 'home.pagePosition (page:4, total:11)');

      expect(fill.length).toBeGreaterThan(0);
      expect(StyleSheet.flatten(fill[0].props.style).width).toBe(`${Math.round((4 / 11) * 100)}%`);
      expect(meta.length).toBeGreaterThan(0);
    });

    it('should sit that progress between the description and the Read Now button', () => {
      const tree = render(<FeaturedStoryCard story={fromStory(story({ description: 'A gentle bedtime story.' }))} width={340} language="en" onOpen={jest.fn()} place={place} />);

      const body = byTestId(tree, 'featured-story-body')[0];
      const order = body
        .findAll((n: any) => ['featured-story-description', 'featured-story-progress-track', 'featured-story-read-now'].includes(n.props.testID))
        .map((n: any) => n.props.testID);

      expect(order.indexOf('featured-story-progress-track')).toBeGreaterThan(order.indexOf('featured-story-description'));
      expect(order.indexOf('featured-story-progress-track')).toBeLessThan(order.lastIndexOf('featured-story-read-now'));
    });

    it('should stretch the bar across the text column, since the column hugs its children and a hugged track has no width', () => {
      const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} place={place} />);

      const block = byTestId(tree, 'featured-story-progress').find((n: any) => n.props.style !== undefined);

      expect(StyleSheet.flatten(block!.props.style).alignSelf).toBe('stretch');
    });

    it('should show no progress for a book that is only being featured', () => {
      const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} />);

      expect(byTestId(tree, 'featured-story-progress-track')).toHaveLength(0);
    });
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

  it('should scale a page crop about its centre, so the paper margin is carried off both edges rather than shown as a pale strip', () => {
    const pages = Array.from({ length: 4 }, (_, i) => ({ id: `p${i}`, pageNumber: i, text: 'words', backgroundImage: `file://page-${i}.webp` }));
    const tree = render(<FeaturedStoryCard story={fromStory(story({ pages }))} width={340} language="en" onOpen={jest.fn()} />);

    const underTest = StyleSheet.flatten(byTestId(tree, 'featured-story-insight')[0].props.style);

    expect(underTest.transform).toEqual([{ translateX: expect.any(Number) }, { scale: expect.any(Number) }]);
    expect(underTest.transformOrigin).toBeUndefined();
    expect(underTest.left).toBe('0%');
  });

  it('should slide the picture to the right by a share of the panel, so its subject sits in the clear rather than under the words', () => {
    const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} />);

    const underTest = StyleSheet.flatten(byTestId(tree, 'featured-story-insight')[0].props.style);

    expect(INSIGHT_SHIFT).toBeGreaterThan(0.1);
    expect(INSIGHT_SHIFT).toBeLessThanOrEqual(0.3);
    expect(underTest.transform).toEqual(expect.arrayContaining([{ translateX: Math.round(340 * INSIGHT_SHIFT) }]));
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

  it('should run the picture from the panel\'s left edge, under the wash, to the right edge, anchored right', () => {
    const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} />);

    const insight = byTestId(tree, 'featured-story-insight')[0];
    const underTest = StyleSheet.flatten(insight.props.style);

    expect(INSIGHT_INSET).toBe(0);
    expect(underTest.left).toBe('0%');
    expect(underTest.right).toBe(0);
    expect(underTest.width).toBeUndefined();
    expect(insight.props.contentPosition).toBe('right');
  });

  it('should lay the wash solid over the bare strip and let it spread well past the words before it clears', () => {
    const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} />);

    const wash = byTestId(tree, 'linear-gradient')[0];
    const body = StyleSheet.flatten(byTestId(tree, 'featured-story-body')[0].props.style);
    const stops = wash.props.locations as readonly number[];
    const colours = wash.props.colors as readonly string[];

    expect(stops).toEqual(READABILITY_WASH_LOCATIONS);
    expect(stops[0]).toBe(0);
    expect(stops[1]).toBeGreaterThanOrEqual(INSIGHT_INSET);
    expect(stops[1]).toBeLessThanOrEqual(0.25);
    expect(stops[stops.length - 1]).toBeGreaterThanOrEqual(TEXT_WIDTH + 0.15);
    expect(stops[stops.length - 1]).toBeLessThanOrEqual(0.85);
    expect(Number(colours[2].match(/[\d.]+\)$/)![0].slice(0, -1))).toBeGreaterThanOrEqual(0.7);
    expect(body.width).toBe(`${TEXT_WIDTH * 100}%`);
    expect(colours[0]).toBe('rgba(9, 20, 56, 1)');
    expect(colours[colours.length - 1]).toBe('rgba(9, 20, 56, 0)');
  });

  it('should stand at least at the phone aspect ratio for its width, and run wider on a tablet', () => {
    const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} />);

    const underTest = StyleSheet.flatten(byTestId(tree, 'featured-story-card')[0].props.style);

    expect(underTest.width).toBe(340);
    expect(underTest.minHeight).toBe(Math.round(340 / FEATURED_ASPECT_RATIO));
    expect(FEATURED_ASPECT_RATIO_TABLET).toBeGreaterThan(FEATURED_ASPECT_RATIO);
  });

  it('should grow with what it holds rather than clip Read Now when a progress block joins the words', () => {
    const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} place={{ currentPage: 4, totalPages: 11 }} />);

    const card = StyleSheet.flatten(byTestId(tree, 'featured-story-card')[0].props.style);
    const body = StyleSheet.flatten(byTestId(tree, 'featured-story-body')[0].props.style);

    expect(card.height).toBeUndefined();
    expect(card.minHeight).toBe(Math.round(340 / FEATURED_ASPECT_RATIO));
    expect(body.paddingBottom).toBeGreaterThanOrEqual(16);
  });

  it('should say what it is offering: Featured Story unless told otherwise', () => {
    const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} />);
    const pick = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} label="catalogue.todaysPick" testID="todays-pick-card" />);

    expect(byTestId(tree, 'featured-story-card-label').some((n: any) => n.props.children === 'catalogue.featuredStory')).toBe(true);
    expect(byTestId(pick, 'todays-pick-card-label').some((n: any) => n.props.children === 'catalogue.todaysPick')).toBe(true);
  });
});
