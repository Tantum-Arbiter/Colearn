/**
 * The featured card is the most important element on the screen (§6.7): the
 * book's title, a line or two about it and a Read Now button beside its
 * cover, shown whole so its hero is never cut away. The whole card is
 * tappable as well as the button.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import {
  FeaturedStoryCard,
  INSIGHT_BLUR,
  INSIGHT_FEATHER,
  INSIGHT_FEATHER_STEPS,
  DESCRIPTION_SPAN,
  INSIGHT_INSET,
  PROGRESS_SPAN,
  TEXT_WIDTH,
  READABILITY_WASH_LOCATIONS,
} from '@/components/stories/catalogue/featured-story-card';
import { FEATURED_ASPECT_RATIO, FEATURED_ASPECT_RATIO_TABLET } from '@/components/child-ui/tokens';
import { BOOK_PROGRESS } from '@/components/child-ui/book-progress';
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
    const place = { pageIndex: 4, totalPages: 11 };

    it('should show how far the child has read on the book bar, the page they are on inside it, counted as the reader counts', () => {
      const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} place={place} />);

      const bar = byTestId(tree, 'featured-story-progress').find((n: any) => n.props.accessibilityRole === 'progressbar')!;
      const fill = byTestId(tree, 'featured-story-progress-fill').filter((n: any) => n.props.style)[0];

      expect(StyleSheet.flatten(fill.props.style).width).toBe(`${Math.round((4 / 10) * 100)}%`);
      expect(byTestId(tree, 'featured-story-progress-label')[0].props.children).toBe('home.pagePosition (page:4, total:10)');
      expect(bar.props.accessibilityLabel).toBe('home.pagePosition (page:4, total:10)');
      expect(byTestId(tree, 'featured-story-progress-medal').filter((n: any) => n.props.style).length).toBeGreaterThan(0);
    });

    it('should use the small book bar, so the words keep their room', () => {
      const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} place={place} />);

      const capsule = StyleSheet.flatten(byTestId(tree, 'featured-story-progress').filter((n: any) => n.props.style)[0].props.style);

      expect(capsule.height).toBe(BOOK_PROGRESS.small.height);
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

    it('should give the pill a little under three quarters of the text column, a set width since the column hugs its children', () => {
      const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} place={place} />);

      const block = StyleSheet.flatten(byTestId(tree, 'featured-story-progress-block').find((n: any) => n.props.style !== undefined)!.props.style);

      expect(PROGRESS_SPAN).toBe(0.72);
      expect(block.width).toBe(`${PROGRESS_SPAN * 100}%`);
      expect(block.alignSelf).toBe('flex-start');
    });

    it('should show no progress for a book that is only being featured', () => {
      const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} />);

      expect(byTestId(tree, 'featured-story-progress-track')).toHaveLength(0);
    });
  });

  it('shows the whole title, never cut short with dots', () => {
    const tree = render(<FeaturedStoryCard story={fromStory(story({ title: 'The Very Long Tale of the Little Wombat Who Would Not Sleep' }))} width={340} language="en" onOpen={jest.fn()} />);

    const title = byTestId(tree, 'featured-story-title')[0];

    expect(title.props.children).toBe('The Very Long Tale of the Little Wombat Who Would Not Sleep');
    expect(title.props.numberOfLines).toBeUndefined();
    expect(title.props.ellipsizeMode).toBeUndefined();
  });

  it('shows the localised title for the active language', () => {
    const model = fromStory(story({ localizedTitle: { en: 'Snuggle Little Wombat', fr: 'Petit wombat câlin' } }));
    const tree = render(<FeaturedStoryCard story={model} width={340} language="fr" onOpen={jest.fn()} />);

    expect(byTestId(tree, 'featured-story-title')[0].props.children).toBe('Petit wombat câlin');
  });

  it('should say what the story is about in full, never cut short with dots', () => {
    const words = 'Finn the fox really wants to play with a shy new friend! But when running up fast does not work, Finn learns how to give space and wait. A sweet, interactive story about gentle greetings and making friends at their own pace.';
    const model = fromStory(story({ description: words }));

    const tree = render(<FeaturedStoryCard story={model} width={340} language="en" onOpen={jest.fn()} />);

    const underTest = byTestId(tree, 'featured-story-description')[0];
    expect(underTest.props.children).toBe(words);
    expect(underTest.props.numberOfLines).toBeUndefined();
    expect(underTest.props.ellipsizeMode).toBeUndefined();
  });

  it('should set those words bold, bright and shadowed, so they read over the picture behind them', () => {
    const model = fromStory(story({ description: 'A gentle story about finding the perfect place to rest.' }));

    const tree = render(<FeaturedStoryCard story={model} width={340} language="en" onOpen={jest.fn()} />);

    const style = StyleSheet.flatten(byTestId(tree, 'featured-story-description')[0].props.style);
    expect(Number(style.fontWeight)).toBeGreaterThanOrEqual(600);
    expect(style.color).toBe('#FFFFFF');
    expect(style.textShadowColor).toBe('rgba(9, 20, 56, 0.85)');
    expect(style.textShadowRadius).toBeGreaterThanOrEqual(3);
    expect(style.lineHeight).toBeGreaterThanOrEqual(Math.round(style.fontSize * 1.3));
  });

  it('should wrap those words at about where a title ends, short of the picture, not out to the column edge', () => {
    const model = fromStory(story({ description: 'A gentle story about finding the perfect place to rest.' }));

    const tree = render(<FeaturedStoryCard story={model} width={340} language="en" onOpen={jest.fn()} />);

    const style = StyleSheet.flatten(byTestId(tree, 'featured-story-description')[0].props.style);
    expect(DESCRIPTION_SPAN).toBe(0.75);
    expect(style.width).toBe(`${DESCRIPTION_SPAN * 100}%`);
  });

  it('should shadow the title the same way', () => {
    const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} />);

    const style = StyleSheet.flatten(byTestId(tree, 'featured-story-title')[0].props.style);
    expect(style.textShadowColor).toBe('rgba(9, 20, 56, 0.85)');
  });

  it('should offer Read Now as a button of its own, not only the whole card', () => {
    const onOpen = jest.fn();
    const model = fromStory(story());
    const tree = render(<FeaturedStoryCard story={model} width={340} language="en" onOpen={onOpen} />);

    fireEvent.press(byTestId(tree, 'featured-story-read-now')[0]);

    expect(onOpen).toHaveBeenCalledWith(model, expect.anything());
  });

  it('should show the page a child is part-way through, as Continue reading', () => {
    const model = fromStory(story({
      pages: [0, 1, 2, 3].map((n) => ({ id: `p${n}`, pageNumber: n, text: '', backgroundImage: n === 0 ? 'file://cover.webp' : `file://page-${n}.webp` })),
    }));

    const tree = render(<FeaturedStoryCard story={model} width={340} language="en" onOpen={jest.fn()} place={{ pageIndex: 2, totalPages: 4 }} />);

    expect(byTestId(tree, 'featured-story-insight')[0].props.source).toEqual({ uri: 'file://page-2.webp' });
    expect(byTestId(tree, 'featured-story-insight-backdrop')[0].props.source).toEqual({ uri: 'file://page-2.webp' });
  });

  it('should show the book\'s full-size cover, not one of its pages', () => {
    const model = fromStory(story({
      pages: [0, 1, 2, 3].map((n) => ({ id: `p${n}`, pageNumber: n, text: '', backgroundImage: n === 0 ? 'file://cover.webp' : `file://page-${n}.webp` })),
    }));

    const tree = render(<FeaturedStoryCard story={model} width={340} language="en" onOpen={jest.fn()} />);

    expect(byTestId(tree, 'featured-story-insight')[0].props.source).toEqual({ uri: 'file://cover.webp' });
  });

  it('should never zoom or slide the picture, so nothing in it is carried off the panel', () => {
    const pages = Array.from({ length: 4 }, (_, i) => ({ id: `p${i}`, pageNumber: i, text: 'words', backgroundImage: `file://page-${i}.webp` }));
    const tree = render(<FeaturedStoryCard story={fromStory(story({ pages }))} width={340} language="en" onOpen={jest.fn()} />);

    const underTest = StyleSheet.flatten(byTestId(tree, 'featured-story-insight')[0].props.style);

    expect(underTest.transform).toBeUndefined();
  });

  const flat = (node: any) => StyleSheet.flatten(node.props.style);
  const imageIn = (node: any) => node.findAll((n: any) => n.props.contentFit !== undefined)[0];

  it('should give the sharp cover the panel\'s right part, centred in it, so a cover stands nearly whole beside the words', () => {
    const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} />);

    const frame = flat(byTestId(tree, 'featured-story-insight-frame')[0]);
    const insight = byTestId(tree, 'featured-story-insight')[0];

    expect(INSIGHT_INSET).toBeGreaterThanOrEqual(0.25);
    expect(INSIGHT_INSET).toBeLessThanOrEqual(0.4);
    expect(frame).toEqual(expect.objectContaining({ position: 'absolute', top: 0, bottom: 0, left: `${INSIGHT_INSET * 100}%`, right: 0 }));
    expect(flat(insight)).toEqual(expect.objectContaining({ left: -340 * INSIGHT_FEATHER, width: 340 * (1 - INSIGHT_INSET) }));
    expect(insight.props.contentFit).toBe('cover');
    expect(insight.props.contentPosition).toBe('center');
  });

  it('should fill the whole panel with a blurred copy of the cover, so the shadow, not a bare strip, sets how dark it is', () => {
    const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} />);

    const backdrop = byTestId(tree, 'featured-story-insight-backdrop')[0];

    expect(backdrop.props.source).toEqual(byTestId(tree, 'featured-story-insight')[0].props.source);
    expect(flat(backdrop)).toEqual(expect.objectContaining({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }));
    expect(backdrop.props.contentFit).toBe('cover');
    expect(INSIGHT_BLUR).toBeGreaterThanOrEqual(12);
    expect(backdrop.props.blurRadius).toBe(INSIGHT_BLUR);
  });

  it('should fade the sharp cover\'s left edge into the blur in steps, each slice lined up with the cover beside it', () => {
    const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} />);
    const edge = 340 * INSIGHT_FEATHER;
    const step = edge / INSIGHT_FEATHER_STEPS;
    const clip = flat(byTestId(tree, 'featured-story-insight-clip')[0]);

    const slices = Array.from({ length: INSIGHT_FEATHER_STEPS }, (_, i) => byTestId(tree, `featured-story-insight-feather-${i}`)[0]);

    expect(INSIGHT_FEATHER).toBeGreaterThanOrEqual(0.05);
    expect(INSIGHT_FEATHER).toBeLessThanOrEqual(0.15);
    expect(INSIGHT_FEATHER_STEPS).toBeGreaterThanOrEqual(6);
    expect(clip).toEqual(expect.objectContaining({ position: 'absolute', top: 0, bottom: 0, left: edge, right: 0, overflow: 'hidden' }));
    slices.forEach((slice, i) => {
      const style = flat(slice);
      const image = imageIn(slice);
      expect(style).toEqual(expect.objectContaining({ position: 'absolute', top: 0, bottom: 0, left: i * step, width: step, overflow: 'hidden' }));
      expect(style.opacity).toBeCloseTo((i + 1) / (INSIGHT_FEATHER_STEPS + 1));
      expect(style.left + flat(image).left).toBeCloseTo(0);
      expect(flat(image).width).toBe(340 * (1 - INSIGHT_INSET));
      expect(image.props.source).toEqual(byTestId(tree, 'featured-story-insight')[0].props.source);
      expect(image.props.contentPosition).toBe('center');
    });
    expect(flat(slices[INSIGHT_FEATHER_STEPS - 1]).left + step).toBeCloseTo(clip.left);
    expect(byTestId(tree, `featured-story-insight-feather-${INSIGHT_FEATHER_STEPS}`)).toHaveLength(0);
  });

  it('should tint the whole panel, so the blur and the cover sit in one night light', () => {
    const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} />);

    expect(flat(byTestId(tree, 'featured-story-tint')[0])).toEqual(
      expect.objectContaining({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(9, 20, 56, 0.18)' }),
    );
  });

  it('should draw no blur and no edge when there is no picture', () => {
    const tree = render(<FeaturedStoryCard story={fromStory(story({ coverImage: undefined }))} width={340} language="en" onOpen={jest.fn()} />);

    expect(byTestId(tree, 'featured-story-insight-backdrop')).toHaveLength(0);
    expect(byTestId(tree, 'featured-story-insight-feather-0')).toHaveLength(0);
  });

  it('should fall back to the shelf cover for a book with no cover page', () => {
    const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} />);

    const underTest = byTestId(tree, 'featured-story-insight')[0];

    expect(underTest.props.source).toEqual({ uri: 'file://wombat.webp' });
  });

  it('should say nothing rather than leave an empty gap when the story has no description', () => {
    const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} />);

    expect(byTestId(tree, 'featured-story-description')).toHaveLength(0);
  });

  it('should rest Read Now at the bottom left of the panel, however much is written above it', () => {
    const tree = render(<FeaturedStoryCard story={fromStory(story({ description: 'A short line.' }))} width={340} language="en" onOpen={jest.fn()} />);
    const body = byTestId(tree, 'featured-story-body')[0];
    const order = body
      .findAll((n: any) => ['featured-story-description', 'featured-story-spring', 'featured-story-read-now'].includes(n.props.testID))
      .map((n: any) => n.props.testID);
    const spring = StyleSheet.flatten(byTestId(tree, 'featured-story-spring')[0].props.style);
    const bodyStyle = StyleSheet.flatten(body.props.style);

    expect(order.indexOf('featured-story-spring')).toBeGreaterThan(order.indexOf('featured-story-description'));
    expect(order.indexOf('featured-story-spring')).toBeLessThan(order.indexOf('featured-story-read-now'));
    expect(spring.flexGrow).toBe(1);
    expect(spring.minHeight).toBeGreaterThanOrEqual(8);
    expect(bodyStyle.flex).toBe(1);
    expect(bodyStyle.alignItems).toBe('flex-start');
    expect(StyleSheet.flatten(byTestId(tree, 'featured-story-read-now').filter((n: any) => n.props.style)[0].props.style).marginTop).toBeUndefined();
  });

  it('should sit the words at the top of the box, the way the design does', () => {
    const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} />);

    const body = StyleSheet.flatten(byTestId(tree, 'featured-story-body')[0].props.style);

    expect(body.justifyContent).toBe('flex-start');
  });

  it('should carry no border and clip the picture to its rounded corners', () => {
    const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} />);

    const underTest = StyleSheet.flatten(byTestId(tree, 'featured-story-card')[0].props.style);

    expect(underTest.borderWidth).toBeUndefined();
    expect(underTest.overflow).toBe('hidden');
  });

  it('should cast the shadow from the top-left corner: solid for the first tenth, clearing by halfway, then the picture plain', () => {
    const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} />);

    const wash = byTestId(tree, 'featured-story-shadow')[0];

    expect(wash.props.start).toEqual({ x: 0, y: 0 });
    expect(wash.props.end).toEqual({ x: 1, y: 1 });
    expect(READABILITY_WASH_LOCATIONS).toEqual([0, 0.1, 0.5]);
    expect(wash.props.locations).toEqual(READABILITY_WASH_LOCATIONS);
    expect(wash.props.colors).toEqual(['rgba(9, 20, 56, 1)', 'rgba(9, 20, 56, 1)', 'rgba(9, 20, 56, 0)']);
    expect(wash.props.pointerEvents).toBe('none');
  });

  it('should keep the words in the left three fifths', () => {
    const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} />);

    expect(StyleSheet.flatten(byTestId(tree, 'featured-story-body')[0].props.style).width).toBe(`${TEXT_WIDTH * 100}%`);
  });

  it('should stand at least at the phone aspect ratio for its width, and run wider on a tablet', () => {
    const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} />);

    const underTest = StyleSheet.flatten(byTestId(tree, 'featured-story-card')[0].props.style);

    expect(underTest.width).toBe(340);
    expect(underTest.minHeight).toBe(Math.round(340 / FEATURED_ASPECT_RATIO));
    expect(FEATURED_ASPECT_RATIO_TABLET).toBeGreaterThan(FEATURED_ASPECT_RATIO);
  });

  it('should grow with what it holds rather than clip Read Now when a progress block joins the words', () => {
    const tree = render(<FeaturedStoryCard story={fromStory(story())} width={340} language="en" onOpen={jest.fn()} place={{ pageIndex: 4, totalPages: 11 }} />);

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
