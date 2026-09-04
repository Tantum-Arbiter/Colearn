/**
 * Tests for StoryDetailOverlay -the Screen 6 story detail view shown after
 * tapping a book tile.
 *
 * Key behaviors tested:
 * 1. Story metadata renders from the selected story (title, meta pills, theme chips)
 * 2. Mode buttons call onSelectMode with the mapped ReadingMode
 * 3. Read now CTA, back, favourite, and preview callbacks fire
 * 4. Offline row appears only when the story is downloaded
 */

import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { StoryDetailOverlay } from '@/components/stories/story-detail-overlay';
import { StoryDownloadService } from '@/services/story-download-service';
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

function pressByLabel(root: any, label: string) {
  const matches = root.findAll(
    (node: any) => node.props?.accessibilityLabel === label && typeof node.props?.onPress === 'function'
  );
  expect(matches.length).toBeGreaterThan(0);
  act(() => {
    matches[0].props.onPress();
  });
}

function pressByText(root: any, text: string) {
  const pressables = root.findAll(
    (node: any) =>
      typeof node.props?.onPress === 'function' && findByText(node, text).length > 0
  );
  expect(pressables.length).toBeGreaterThan(0);
  act(() => {
    pressables[pressables.length - 1].props.onPress();
  });
}

const baseStory: Story = {
  id: 'wombat-1',
  title: 'Snuggle Little Wombat',
  category: 'bedtime',
  isAvailable: true,
  ageRange: '2-5',
  duration: 8,
  description: 'A gentle story about getting ready for bed.',
  tags: ['bedtime', 'emotions'],
  pages: [
    { id: 'p0', pageNumber: 0, text: 'cover', type: 'cover' },
    { id: 'p1', pageNumber: 1, text: 'page', interactionType: 'music_challenge' },
  ],
};

const defaultProps = {
  story: baseStory,
  heroHeight: 350,
  isFavorite: false,
  selectedMode: 'read' as const,
  onSelectMode: jest.fn(),
  onReadNow: jest.fn(),
  onPreview: jest.fn(),
  onClose: jest.fn(),
  onToggleFavorite: jest.fn(),
};

describe('StoryDetailOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsDownloaded.mockResolvedValue(false);
  });

  it('should render the story title and metadata', () => {
    const { UNSAFE_root } = render(<StoryDetailOverlay {...defaultProps} />);

    expect(findByText(UNSAFE_root, 'Snuggle Little Wombat').length).toBeGreaterThan(0);
    expect(findByText(UNSAFE_root, 'storyDetail.minutes').length).toBeGreaterThan(0);
    expect(findByText(UNSAFE_root, 'storyDetail.ages').length).toBeGreaterThan(0);
    expect(findByText(UNSAFE_root, 'storyDetail.interactive').length).toBeGreaterThan(0);
    expect(findByText(UNSAFE_root, 'A gentle story about getting ready for bed.').length).toBeGreaterThan(0);
  });

  it('should render the story themes as chips under the title', () => {
    const { UNSAFE_root } = render(<StoryDetailOverlay {...defaultProps} />);

    expect(findByText(UNSAFE_root, 'stories.filterTags.bedtime').length).toBeGreaterThan(0);
    expect(findByText(UNSAFE_root, 'stories.filterTags.emotions').length).toBeGreaterThan(0);
  });

  it('should no longer carry a separate Supports section, now the themes sit under the title', () => {
    const { UNSAFE_root } = render(<StoryDetailOverlay {...defaultProps} />);

    const underTest = findByText(UNSAFE_root, 'storyDetail.supports');

    expect(underTest).toHaveLength(0);
  });

  it('should draw each theme chip with an icon rather than an emoji', () => {
    const { UNSAFE_root } = render(<StoryDetailOverlay {...defaultProps} />);

    const chips = UNSAFE_root.findAll((node: any) => typeof node.props.testID === 'string' && node.props.testID.startsWith('story-theme-chip-'));

    expect(chips.length).toBeGreaterThan(0);
    chips.forEach((chip: any) => {
      const text = findByText(chip, 'stories.filterTags.bedtime').concat(findByText(chip, 'stories.filterTags.emotions'));
      text.forEach((node: any) => expect(String(node.props.children)).not.toMatch(/\p{Extended_Pictographic}/u));
    });
  });

  it.each([
    ['storyDetail.readTogether', 'read'],
    ['storyDetail.playAlong', 'narrate'],
    ['storyDetail.record', 'record'],
  ])('should map the %s button to mode %s', (labelKey, expectedMode) => {
    const { UNSAFE_root } = render(<StoryDetailOverlay {...defaultProps} />);

    pressByText(UNSAFE_root, labelKey);

    expect(defaultProps.onSelectMode).toHaveBeenCalledWith(expectedMode);
  });

  it('should call onReadNow when the CTA is pressed', () => {
    const { UNSAFE_root } = render(<StoryDetailOverlay {...defaultProps} />);

    pressByText(UNSAFE_root, 'storyDetail.readNow');

    expect(defaultProps.onReadNow).toHaveBeenCalledTimes(1);
  });

  it('should call onClose from the back button', () => {
    const { UNSAFE_root } = render(<StoryDetailOverlay {...defaultProps} />);

    pressByLabel(UNSAFE_root, 'common.back');

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onToggleFavorite from the heart button', () => {
    const { UNSAFE_root } = render(<StoryDetailOverlay {...defaultProps} />);

    pressByLabel(UNSAFE_root, 'storyDetail.favourite');

    expect(defaultProps.onToggleFavorite).toHaveBeenCalledTimes(1);
  });

  it('should call onPreview from the preview button', () => {
    const { UNSAFE_root } = render(<StoryDetailOverlay {...defaultProps} />);

    pressByLabel(UNSAFE_root, 'storyMode.preview');

    expect(defaultProps.onPreview).toHaveBeenCalledTimes(1);
  });

  it('should show the offline row when the story is downloaded', async () => {
    mockIsDownloaded.mockResolvedValue(true);

    const { UNSAFE_root } = render(<StoryDetailOverlay {...defaultProps} />);

    await waitFor(() => {
      expect(findByText(UNSAFE_root, 'storyDetail.savedOffline').length).toBeGreaterThan(0);
    });
  });

  it('should hide the offline row when the story is not downloaded', async () => {
    const { UNSAFE_root } = render(<StoryDetailOverlay {...defaultProps} />);

    await waitFor(() => {
      expect(mockIsDownloaded).toHaveBeenCalledWith('wombat-1');
    });
    expect(findByText(UNSAFE_root, 'storyDetail.savedOffline').length).toBe(0);
  });

  it('should hide the interactive pill for stories without interactions', () => {
    const plainStory: Story = {
      ...baseStory,
      pages: [{ id: 'p0', pageNumber: 0, text: 'cover' }],
    };

    const { UNSAFE_root } = render(<StoryDetailOverlay {...defaultProps} story={plainStory} />);

    expect(findByText(UNSAFE_root, 'storyDetail.interactive').length).toBe(0);
  });
});
