/**
 * Tests for StoryCardSheet -- the compact card that floats over the shelf when
 * a tile is tapped, with the cover on top, the ways to read beneath, and a
 * carousel of the other books to swipe between.
 *
 * Key behaviours tested:
 * 1. The tapped story's title, meta and theme chips render
 * 2. Every book on the shelf gets a card, in order
 * 3. Choosing a way to read opens the book with that mode
 * 4. Swiping to a neighbour reports the new story; settling on the same card does not
 * 5. Close and favourite callbacks fire
 * 6. Record is offered as a button like the other ways to read
 * 7. A book the child is part-way through shows how far, and offers to carry on
 * 8. The card holds everything it shows: the ways to read sit at its foot and nothing scrolls
 * 9. The cover of the card in front turns through the book's pages; its neighbours wait on their covers
 */

import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { StyleSheet } from 'react-native';
import { StoryCardSheet } from '@/components/stories/story-card-sheet';
import { StoryDownloadService } from '@/services/story-download-service';
import { storyCardLayout } from '@/constants/story-card';
import { Story } from '@/types/story';
import { PROGRESS_GRADIENT } from '@/components/onboarding/onboarding-theme';

jest.mock('@/services/story-download-service', () => ({
  StoryDownloadService: {
    isDownloaded: jest.fn(),
  },
}));

const mockIsDownloaded = StoryDownloadService.isDownloaded as jest.Mock;

function findByText(root: any, text: string) {
  return root.findAll((node: any) =>
    Array.isArray(node.children) &&
    node.children.some((child: unknown) => typeof child === 'string' && (child as string).includes(text))
  );
}

function pressByTestId(root: any, testID: string) {
  const matches = root.findAll((node: any) => node.props?.testID === testID && typeof node.props?.onPress === 'function');
  expect(matches.length).toBeGreaterThan(0);
  act(() => {
    matches[0].props.onPress();
  });
}

function pressByLabel(root: any, label: string) {
  const matches = root.findAll(
    (node: any) => node.props?.accessibilityLabel === label && typeof node.props?.onPress === 'function'
  );
  expect(matches.length).toBeGreaterThan(0);
  act(() => {
    matches[0].props.onPress();
  });
}

function settleCarouselAt(root: any, offsetX: number) {
  const carousel = root.findAll((node: any) => node.props?.testID === 'story-card-carousel' && typeof node.props?.onMomentumScrollEnd === 'function');
  expect(carousel.length).toBeGreaterThan(0);
  act(() => {
    carousel[0].props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: offsetX, y: 0 } } });
  });
}

const makeStory = (id: string, title: string): Story => ({
  id,
  title,
  category: 'bedtime',
  isAvailable: true,
  ageRange: '2-5',
  pageCount: 8,
  description: `${title} is a gentle story.`,
  tags: ['bedtime', 'emotions'],
  pages: [
    { id: `${id}-p0`, pageNumber: 0, text: 'cover', type: 'cover' },
    { id: `${id}-p1`, pageNumber: 1, text: 'page', interactionType: 'music_challenge' },
  ],
});

const stories = [makeStory('wombat', 'Snuggle Little Wombat'), makeStory('owl', 'Little Owl Listens'), makeStory('fox', 'Fox and the Moon')];
const layout = storyCardLayout({ width: 402, height: 874 }, false);

const defaultProps = {
  stories,
  initialIndex: 0,
  layout,
  isFavorite: false,
  onStoryChange: jest.fn(),
  onChooseMode: jest.fn(),
  onClose: jest.fn(),
  onToggleFavorite: jest.fn(),
};

describe('StoryCardSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsDownloaded.mockResolvedValue(false);
  });

  it('should render the tapped story with its meta and theme chips', () => {
    const { UNSAFE_root } = render(<StoryCardSheet {...defaultProps} />);

    expect(findByText(UNSAFE_root, 'Snuggle Little Wombat').length).toBeGreaterThan(0);
    expect(findByText(UNSAFE_root, 'storyDetail.pages').length).toBeGreaterThan(0);
    expect(findByText(UNSAFE_root, 'storyDetail.minutes')).toHaveLength(0);
    expect(findByText(UNSAFE_root, 'storyDetail.ages').length).toBeGreaterThan(0);
    expect(findByText(UNSAFE_root, 'storyDetail.interactive').length).toBeGreaterThan(0);
    expect(findByText(UNSAFE_root, 'stories.filterTags.bedtime').length).toBeGreaterThan(0);
  });

  describe('a book the child is part-way through', () => {
    const underway = { wombat: { pageIndex: 3, totalPages: 9 } };

    it('should show how far they have read', () => {
      const { UNSAFE_root } = render(<StoryCardSheet {...defaultProps} progress={underway} />);

      const underTest = UNSAFE_root.findAll((node: any) => node.props?.testID === 'story-card-progress');

      expect(underTest.length).toBeGreaterThan(0);
      expect(findByText(UNSAFE_root, '38%').length).toBeGreaterThan(0);
    });

    it('should draw that progress with the onboarding bar: the same gradient, growing over the pages read', () => {
      const { UNSAFE_root } = render(<StoryCardSheet {...defaultProps} progress={underway} />);

      const bar = UNSAFE_root.findAll((node: any) => node.props?.testID === 'story-card-progress-bar' && node.props?.accessibilityRole === 'progressbar');
      const gradient = UNSAFE_root.findAll((node: any) => node.props?.testID === 'story-card-progress-gradient');

      expect(bar.length).toBeGreaterThan(0);
      expect(bar[0].props.accessibilityValue).toEqual({ min: 0, max: 8, now: 3 });
      expect(gradient.length).toBeGreaterThan(0);
      expect(gradient[0].props.colors).toEqual(PROGRESS_GRADIENT);
    });

    it('should keep the bar inside the same gutter as the title, chips and buttons, not out to the card edge', () => {
      const { UNSAFE_root } = render(<StoryCardSheet {...defaultProps} progress={underway} />);

      const row = UNSAFE_root.findAll((node: any) => node.props?.testID === 'story-card-progress')[0];
      const actions = UNSAFE_root.findAll((node: any) => node.props?.testID === 'story-card-actions')[0];
      const underTest = StyleSheet.flatten(row.props.style).paddingHorizontal;

      expect(underTest).toBeGreaterThan(0);
      expect(underTest).toBe(StyleSheet.flatten(actions.props.style).paddingHorizontal);
    });

    it('should let the bar run the width of the card rather than stopping at the footer cap', () => {
      const { UNSAFE_root } = render(<StoryCardSheet {...defaultProps} progress={underway} />);

      const bar = UNSAFE_root.findAll((node: any) => node.props?.testID === 'story-card-progress-bar' && node.props?.accessibilityRole === 'progressbar')[0];

      expect(StyleSheet.flatten(bar.props.style).maxWidth).toBe(layout.width);
    });

    it('should offer to carry on where they left off, rather than start again', () => {
      const { UNSAFE_root } = render(<StoryCardSheet {...defaultProps} progress={underway} />);

      const underTest = UNSAFE_root.findAll((node: any) => node.props?.testID === 'story-card-mode-read');

      expect(findByText(UNSAFE_root, 'storyDetail.continueReading').length).toBeGreaterThan(0);
      expect(underTest[0].props.accessibilityLabel).toBe('storyDetail.continueReading');
    });

    it('should still open the book the same way, so carrying on is the same act as reading', () => {
      const { UNSAFE_root } = render(<StoryCardSheet {...defaultProps} progress={underway} />);

      pressByTestId(UNSAFE_root, 'story-card-mode-read');

      expect(defaultProps.onChooseMode).toHaveBeenCalledWith('read');
    });

    it('should show nothing of the sort for a book not yet started', () => {
      const { UNSAFE_root } = render(<StoryCardSheet {...defaultProps} />);

      const underTest = UNSAFE_root.findAll((node: any) => node.props?.testID === 'story-card-progress');

      expect(underTest).toHaveLength(0);
      expect(findByText(UNSAFE_root, 'storyDetail.readTogether').length).toBeGreaterThan(0);
    });

    it('should measure only the book it belongs to, not its neighbours on the shelf', () => {
      const { UNSAFE_root } = render(<StoryCardSheet {...defaultProps} progress={underway} />);

      const owl = UNSAFE_root.findAll((node: any) => node.props?.testID === 'story-card-owl')[0];

      expect(owl.findAll((node: any) => node.props?.testID === 'story-card-progress')).toHaveLength(0);
    });
  });

  it('should slide sideways only along the shelf and a book\'s pages, and keep its body still and quiet', () => {
    const { UNSAFE_root } = render(<StoryCardSheet {...defaultProps} progress={{ wombat: { pageIndex: 3, totalPages: 9 } }} />);

    const sideways = UNSAFE_root
      .findAll((node: any) => node.props?.horizontal === true)
      .map((node: any) => node.props.testID);
    const body = UNSAFE_root.findAll((node: any) => node.props?.testID === 'story-card-body')[0];

    expect(Array.from(new Set(sideways))).toEqual(['story-card-carousel', 'story-card-page-strip']);
    expect(body.props.bounces).toBe(false);
    expect(body.props.showsVerticalScrollIndicator).toBe(false);
  });

  it('should sit the ways to read at the foot of the card, whatever the book above them holds', () => {
    const { UNSAFE_root } = render(<StoryCardSheet {...defaultProps} />);

    const underTest = StyleSheet.flatten(
      UNSAFE_root.findAll((node: any) => node.props?.testID === 'story-card-actions')[0].props.style
    );

    expect(underTest.marginTop).toBe('auto');
  });

  it('should lay out a card for every book on the shelf, in order', () => {
    const { UNSAFE_root } = render(<StoryCardSheet {...defaultProps} />);

    const cards = UNSAFE_root.findAll((node: any) => typeof node.props?.testID === 'string' && /^story-card-(wombat|owl|fox)$/.test(node.props.testID));
    const ids = Array.from(new Set(cards.map((node: any) => node.props.testID)));

    expect(ids).toEqual(['story-card-wombat', 'story-card-owl', 'story-card-fox']);
  });

  it.each([
    ['read'],
    ['narrate'],
    ['record'],
  ])('should open the book in %s when that way to read is chosen', (mode) => {
    const { UNSAFE_root } = render(<StoryCardSheet {...defaultProps} />);

    pressByTestId(UNSAFE_root, `story-card-mode-${mode}`);

    expect(defaultProps.onChooseMode).toHaveBeenCalledWith(mode);
  });

  it('should report the neighbour when the carousel settles on it', () => {
    const { UNSAFE_root } = render(<StoryCardSheet {...defaultProps} />);

    settleCarouselAt(UNSAFE_root, layout.step);

    expect(defaultProps.onStoryChange).toHaveBeenCalledWith(stories[1], 1);
  });

  it('should say nothing when the carousel settles back on the same card', () => {
    const { UNSAFE_root } = render(<StoryCardSheet {...defaultProps} />);

    settleCarouselAt(UNSAFE_root, 12);

    expect(defaultProps.onStoryChange).not.toHaveBeenCalled();
  });

  it('should start on the tapped book even when it is not the first on the shelf', () => {
    const { UNSAFE_root } = render(<StoryCardSheet {...defaultProps} initialIndex={2} />);

    settleCarouselAt(UNSAFE_root, layout.step);

    expect(defaultProps.onStoryChange).toHaveBeenCalledWith(stories[1], 1);
  });

  it('should call onClose from the close button', () => {
    const { UNSAFE_root } = render(<StoryCardSheet {...defaultProps} />);

    pressByLabel(UNSAFE_root, 'common.back');

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onToggleFavorite from the heart', () => {
    const { UNSAFE_root } = render(<StoryCardSheet {...defaultProps} />);

    pressByLabel(UNSAFE_root, 'storyDetail.favourite');

    expect(defaultProps.onToggleFavorite).toHaveBeenCalled();
  });

  it('should show the offline row when the story is saved', async () => {
    mockIsDownloaded.mockResolvedValue(true);

    const { UNSAFE_root } = render(<StoryCardSheet {...defaultProps} />);

    await waitFor(() => {
      expect(findByText(UNSAFE_root, 'storyDetail.savedOffline').length).toBeGreaterThan(0);
    });
  });

  it('should offer Record as a button like Play Along, not a bare line of text', async () => {
    // The defect this pins: Record was a borderless row beneath a divider,
    // which read as a footnote rather than a third way to read -- and on a
    // phone it sat low enough to be cut off by the card's bottom edge.
    const { UNSAFE_root } = render(<StoryCardSheet {...defaultProps} />);
    await waitFor(() => expect(mockIsDownloaded).toHaveBeenCalled());
    const button = (testID: string) =>
      StyleSheet.flatten(
        UNSAFE_root.findAll((node: any) => node.props?.testID === testID && typeof node.props?.onPress === 'function')[0].props.style
      );

    const underTest = button('story-card-mode-record');
    const playAlong = button('story-card-mode-narrate');

    expect(underTest.backgroundColor).toBe(playAlong.backgroundColor);
    expect(underTest.borderWidth).toBe(playAlong.borderWidth);
    expect(underTest.borderRadius).toBe(playAlong.borderRadius);
  });

  describe('the pages to start from', () => {
    const LONG: Story = {
      ...makeStory('long', 'The Long Night'),
      pages: Array.from({ length: 9 }, (_, index) => ({
        id: `long-p${index}`,
        pageNumber: index,
        text: index === 0 ? 'cover' : `page ${index}`,
        ...(index === 0 ? { type: 'cover' as const } : {}),
        backgroundImage: `file:///long-${index}.webp`,
      })),
    };

    function unique(ids: string[]): string[] {
      return ids.filter((id, index) => ids.indexOf(id) === index);
    }

    function pagesOf(root: any) {
      return root.findAll(
        (node: any) => /^story-card-page-\d+$/.test(String(node.props?.testID)) && typeof node.props?.onPress === 'function'
      );
    }

    function picked(root: any) {
      return unique(pagesOf(root).filter((node: any) => node.props.accessibilityState?.selected).map((node: any) => node.props.testID));
    }

    it("should lay out the book's pages past its cover, each with its picture", () => {
      const { UNSAFE_root } = render(<StoryCardSheet {...defaultProps} stories={[LONG]} />);

      const pages = pagesOf(UNSAFE_root);
      const pictures = UNSAFE_root.findAll((node: any) => node.props?.testID === 'story-card-page-image-3');

      expect(unique(pages.map((node: any) => node.props.testID))).toEqual(
        [1, 2, 3, 4, 5, 6, 7, 8].map((index) => `story-card-page-${index}`)
      );
      expect(pictures[0].props.source).toEqual({ uri: 'file:///long-3.webp' });
    });

    it('should start on the page the child left off at', () => {
      const { UNSAFE_root } = render(
        <StoryCardSheet {...defaultProps} stories={[LONG]} progress={{ long: { pageIndex: 4, totalPages: 9 } }} />
      );

      expect(picked(UNSAFE_root)).toEqual(['story-card-page-4']);
    });

    it('should start on the first page of a book not yet begun', () => {
      const { UNSAFE_root } = render(<StoryCardSheet {...defaultProps} stories={[LONG]} />);

      expect(picked(UNSAFE_root)).toEqual(['story-card-page-1']);
    });

    it('should pick a page when it is tapped, pass it on, and offer to read from there', () => {
      const onPickPage = jest.fn();
      const { UNSAFE_root } = render(<StoryCardSheet {...defaultProps} stories={[LONG]} onPickPage={onPickPage} />);

      pressByTestId(UNSAFE_root, 'story-card-page-6');

      expect(onPickPage).toHaveBeenCalledWith('long', 6);
      expect(Haptics.selectionAsync).toHaveBeenCalled();
      expect(picked(UNSAFE_root)).toEqual(['story-card-page-6']);
      expect(findByText(UNSAFE_root, 'storyDetail.readFromPage (page:6)').length).toBeGreaterThan(0);
    });

    it('should keep the usual way in while the page it started on is still the one picked', () => {
      const { UNSAFE_root } = render(
        <StoryCardSheet {...defaultProps} stories={[LONG]} progress={{ long: { pageIndex: 4, totalPages: 9 } }} />
      );

      expect(findByText(UNSAFE_root, 'storyDetail.continueReading').length).toBeGreaterThan(0);
      expect(findByText(UNSAFE_root, 'storyDetail.readFromPage')).toHaveLength(0);
    });

    it('should start on the last page when the saved place runs past the book', () => {
      const { UNSAFE_root } = render(
        <StoryCardSheet {...defaultProps} stories={[LONG]} progress={{ long: { pageIndex: 14, totalPages: 15 } }} />
      );

      expect(picked(UNSAFE_root)).toEqual(['story-card-page-8']);
    });

    it('should lay out the pages only on the book in front, not on its neighbours along the shelf', () => {
      const { UNSAFE_root } = render(<StoryCardSheet {...defaultProps} stories={[LONG, { ...LONG, id: 'other' }]} />);

      const strips = UNSAFE_root.findAll((node: any) => node.props?.testID === 'story-card-pages');
      const inFront = UNSAFE_root.findAll((node: any) => node.props?.testID === 'story-card-long')[0];

      expect(strips.length).toBeGreaterThan(0);
      expect(inFront.findAll((node: any) => node.props?.testID === 'story-card-pages').length).toBe(strips.length);
    });

    it('should hand the tour the strip of the book in front, in a host that can be measured', () => {
      const pagesRef = React.createRef<any>();
      const { UNSAFE_root } = render(<StoryCardSheet {...defaultProps} stories={[LONG, { ...LONG, id: 'other' }]} pagesRef={pagesRef} />);

      const cards = UNSAFE_root.findAll((node: any) => node.props?.pagesRef !== undefined && node.props?.story !== undefined);
      const strip = UNSAFE_root.findAll((node: any) => node.props?.testID === 'story-card-pages' && node.props?.style !== undefined)[0];

      expect(cards.filter((node: any) => node.props.pagesRef === pagesRef).map((node: any) => node.props.story.id)).toEqual(['long']);
      expect(strip.props.collapsable).toBe(false);
    });

    it('should show no pages for a book that has none to show', () => {
      const { UNSAFE_root } = render(<StoryCardSheet {...defaultProps} stories={[{ ...LONG, pages: undefined }]} />);

      expect(pagesOf(UNSAFE_root)).toHaveLength(0);
      expect(UNSAFE_root.findAll((node: any) => node.props?.testID === 'story-card-pages')).toHaveLength(0);
    });

    it('should listen for its body to fill, so it can bring the pages into view', () => {
      const { UNSAFE_root } = render(<StoryCardSheet {...defaultProps} stories={[LONG]} focusPages />);

      const body = UNSAFE_root.findAll((node: any) => node.props?.testID === 'story-card-body')[0];

      expect(typeof body.props.onContentSizeChange).toBe('function');
      expect(typeof body.props.onLayout).toBe('function');
    });
  });

  describe('the page preview on the cover', () => {
    const withPages = (id: string, title: string): Story => ({
      ...makeStory(id, title),
      coverImage: { uri: `test://${id}-cover` } as unknown as string,
      pages: [
        { id: `${id}-p1`, pageNumber: 1, text: 'page', backgroundImage: { uri: `test://${id}-p1` } as unknown as string },
        { id: `${id}-p2`, pageNumber: 2, text: 'page', backgroundImage: { uri: `test://${id}-p2` } as unknown as string },
      ],
    });
    const shelf = [withPages('wombat', 'Snuggle Little Wombat'), withPages('owl', 'Little Owl Listens')];
    const playingWithin = (root: any, storyId: string) => {
      const card = root.findAll((node: any) => node.props?.testID === `story-card-${storyId}`)[0];
      return card.findAll((node: any) => node.props?.testID === 'story-page-preview-playing');
    };

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should turn the pages of the book in front and leave its neighbour on the cover', () => {
      const { UNSAFE_root } = render(<StoryCardSheet {...defaultProps} stories={shelf} />);

      expect(playingWithin(UNSAFE_root, 'wombat').length).toBeGreaterThan(0);
      expect(playingWithin(UNSAFE_root, 'owl')).toHaveLength(0);
    });

    it('should hand the turning over to the book the carousel settles on', () => {
      const { UNSAFE_root } = render(<StoryCardSheet {...defaultProps} stories={shelf} />);

      settleCarouselAt(UNSAFE_root, layout.step);

      expect(playingWithin(UNSAFE_root, 'wombat')).toHaveLength(0);
      expect(playingWithin(UNSAFE_root, 'owl').length).toBeGreaterThan(0);
    });

    it('should size the preview to the cover it sits in', () => {
      const { UNSAFE_root } = render(<StoryCardSheet {...defaultProps} stories={shelf} />);

      const underTest = UNSAFE_root.findAll((node: any) => node.props?.testID === 'story-page-preview-playing')[0];
      const style = StyleSheet.flatten(underTest.props.style);

      expect(style.width).toBe(layout.width);
      expect(style.height).toBe(layout.coverHeight);
    });
  });
});
