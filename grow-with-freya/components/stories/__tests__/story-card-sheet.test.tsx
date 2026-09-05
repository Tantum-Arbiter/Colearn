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
 */

import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { StoryCardSheet } from '@/components/stories/story-card-sheet';
import { StoryDownloadService } from '@/services/story-download-service';
import { storyCardLayout } from '@/constants/story-card';
import { Story } from '@/types/story';

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
  duration: 8,
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
    expect(findByText(UNSAFE_root, 'storyDetail.minutes').length).toBeGreaterThan(0);
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

  it('should hold everything it shows, so the card never scrolls under the child', () => {
    const { UNSAFE_root } = render(<StoryCardSheet {...defaultProps} progress={{ wombat: { pageIndex: 3, totalPages: 9 } }} />);

    const underTest = UNSAFE_root
      .findAll((node: any) => typeof node.props?.onMomentumScrollEnd === 'function' || typeof node.props?.scrollEnabled === 'boolean')
      .map((node: any) => node.props.testID);

    expect(Array.from(new Set(underTest))).toEqual(['story-card-carousel']);
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
});
