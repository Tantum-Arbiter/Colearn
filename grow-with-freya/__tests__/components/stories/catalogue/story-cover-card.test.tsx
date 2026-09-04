/**
 * The story cover IS the card (§6.9): title on the artwork above the play
 * button, never below the thumbnail. Remote entries keep the commercial
 * affordances carried over from the old catalog card (§7).
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StoryCoverCard } from '@/components/stories/catalogue/story-cover-card';
import { fromCatalogEntry, fromStory } from '@/components/stories/catalogue/catalogue-story';
import { CatalogEntry, Story } from '@/types/story';

jest.mock('@/services/story-download-service', () => ({
  StoryDownloadService: {
    downloadStory: jest.fn().mockResolvedValue({ success: true }),
    cancelDownload: jest.fn(),
  },
}));

jest.mock('@/services/story-access-service', () => ({
  StoryAccessService: {
    checkDownloadLimit: jest.fn().mockResolvedValue({ atLimit: false }),
  },
}));

jest.mock('@/services/api-client', () => ({
  ApiClient: { isAuthenticated: jest.fn().mockResolvedValue(true) },
}));

const story = (overrides: Partial<Story> = {}): Story => ({
  id: 'story-1',
  title: 'A Brave Little Bear',
  category: 'adventure',
  isAvailable: true,
  coverImage: 'file://cover.webp',
  ...overrides,
});

const entry = (overrides: Partial<CatalogEntry> = {}): CatalogEntry => ({
  storyId: 'entry-1',
  title: 'The Ocean Lullaby',
  category: 'bedtime',
  isFree: false,
  isReferralReward: false,
  isPremium: true,
  ...overrides,
});

const baseProps = {
  width: 110,
  language: 'en' as const,
  onOpen: jest.fn(),
};

function byTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

describe('StoryCoverCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the title on the artwork, with no play button now the book itself is the button', () => {
    const tree = render(<StoryCoverCard story={fromStory(story())} width={160} language="en" onOpen={jest.fn()} />);

    expect(tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'story-cover-title').length).toBeGreaterThan(0);
    expect(tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'story-cover-play')).toHaveLength(0);
  });

  it('caps the title at two lines', () => {
    const tree = render(<StoryCoverCard {...baseProps} story={fromStory(story())} />);

    expect(byTestId(tree, 'story-cover-title')[0].props.numberOfLines).toBe(2);
  });

  it('opens a downloaded story on tap', () => {
    const onOpen = jest.fn();
    const model = fromStory(story());
    const tree = render(<StoryCoverCard {...baseProps} story={model} onOpen={onOpen} />);

    fireEvent.press(byTestId(tree, 'story-cover-card-story-1')[0]);

    expect(onOpen).toHaveBeenCalledWith(model, expect.anything());
  });

  it('reports long presses for the preview flow', () => {
    const onLongPress = jest.fn();
    const model = fromStory(story());
    const tree = render(<StoryCoverCard {...baseProps} story={model} onLongPress={onLongPress} />);

    fireEvent(byTestId(tree, 'story-cover-card-story-1')[0], 'longPress');

    expect(onLongPress).toHaveBeenCalledWith(model);
  });

  it('shows a lock and routes locked taps to the subscription flow', () => {
    const onLockedPress = jest.fn();
    const model = fromCatalogEntry(entry(), { locked: true, shareToUnlock: false });
    const tree = render(
      <StoryCoverCard {...baseProps} story={model} onLockedPress={onLockedPress} />
    );

    expect(byTestId(tree, 'story-cover-lock').length).toBeGreaterThan(0);
    expect(byTestId(tree, 'story-cover-play')).toHaveLength(0);

    fireEvent.press(byTestId(tree, 'story-cover-card-entry-1')[0]);
    expect(onLockedPress).toHaveBeenCalledTimes(1);
  });

  it('shows the share affordance and routes taps to the share flow', () => {
    const onShareToUnlock = jest.fn();
    const model = fromCatalogEntry(entry({ isShareToUnlock: true }), { locked: false, shareToUnlock: true });
    const tree = render(
      <StoryCoverCard {...baseProps} story={model} onShareToUnlock={onShareToUnlock} />
    );

    expect(byTestId(tree, 'story-cover-share').length).toBeGreaterThan(0);

    fireEvent.press(byTestId(tree, 'story-cover-card-entry-1')[0]);
    expect(onShareToUnlock).toHaveBeenCalledWith(expect.objectContaining({ storyId: 'entry-1' }));
  });

  it('shows the download affordance for unlocked remote entries', () => {
    const model = fromCatalogEntry(entry({ isFree: true }), { locked: false, shareToUnlock: false });
    const tree = render(<StoryCoverCard {...baseProps} story={model} />);

    expect(byTestId(tree, 'story-cover-download').length).toBeGreaterThan(0);
  });
});
