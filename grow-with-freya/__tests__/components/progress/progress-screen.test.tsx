/**
 * The Progress screen composes the §2 hierarchy: planet artwork, floating
 * controls, title and subtitle, weekly card, milestones, badges — and a
 * badge tap opens the detail sheet where the recommendation lives.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ProgressScreen } from '@/components/progress/progress-screen';

jest.mock('@/data/stories', () => ({
  ALL_STORIES: [],
}));

const mockAppState = {
  readStoryIds: ['a', 'b'],
  favoriteStoryIds: [] as string[],
  childAgeInMonths: 36,
};
jest.mock('@/store/app-store', () => ({
  useAppStore: (selector?: (state: any) => any) =>
    selector ? selector(mockAppState) : mockAppState,
}));

jest.mock('@/services/story-loader', () => ({
  StoryLoader: {
    getCachedStories: jest.fn(() => null),
  },
}));

jest.mock('@/services/screen-time-service', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      getRecentUsage: jest.fn().mockResolvedValue([]),
    }),
  },
}));

function byTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

function textByTestId(tree: ReturnType<typeof render>, testID: string) {
  return byTestId(tree, testID).find((n: any) => typeof n.props.children === 'string');
}

describe('ProgressScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('composes planet, controls, heading, weekly card, adventures, milestones and badges', async () => {
    const tree = render(<ProgressScreen onBack={jest.fn()} />);

    await waitFor(() => {
      expect(byTestId(tree, 'planet-header-artwork').length).toBeGreaterThan(0);
      expect(byTestId(tree, 'circle-action-back').length).toBeGreaterThan(0);
      expect(byTestId(tree, 'circle-action-audio').length).toBeGreaterThan(0);
      expect(textByTestId(tree, 'progress-title').props.children).toBe('progress.title');
      expect(textByTestId(tree, 'progress-subtitle').props.children).toBe('progress.subtitle');
      expect(byTestId(tree, 'progress-hero-card').length).toBeGreaterThan(0);
      expect(byTestId(tree, 'challenge-list').length).toBeGreaterThan(0);
      expect(byTestId(tree, 'milestone-row').length).toBeGreaterThan(0);
      expect(byTestId(tree, 'badge-category-bar').length).toBeGreaterThan(0);
      expect(byTestId(tree, 'badge-grid').length).toBeGreaterThan(0);
    });
  });

  it('shows one weekly and one monthly adventure', async () => {
    const tree = render(<ProgressScreen onBack={jest.fn()} />);

    await waitFor(() => {
      expect(byTestId(tree, 'challenge-card-weekly').length).toBeGreaterThan(0);
      expect(byTestId(tree, 'challenge-card-monthly').length).toBeGreaterThan(0);
    });
  });

  it('lays the whole badge library out in a grid with a discovered summary', async () => {
    const tree = render(<ProgressScreen onBack={jest.fn()} />);

    await waitFor(() => {
      expect(byTestId(tree, 'milestone-row')[0].props.children).toHaveLength(3);
      expect(byTestId(tree, 'badge-grid')[0].props.children.length).toBeGreaterThanOrEqual(12);
      expect(textByTestId(tree, 'badges-summary').props.children).toContain('progress.badgesSummary');
    });
  });

  it('narrows the grid to a category from the filter bar', async () => {
    const tree = render(<ProgressScreen onBack={jest.fn()} />);

    await waitFor(() => expect(byTestId(tree, 'badge-category-calm').length).toBeGreaterThan(0));
    const total = byTestId(tree, 'badge-grid')[0].props.children.length;

    fireEvent.press(byTestId(tree, 'badge-category-calm')[0]);

    await waitFor(() => {
      const shown = byTestId(tree, 'badge-grid')[0].props.children;
      expect(shown.length).toBeLessThan(total);
      expect(byTestId(tree, 'badge-card-calm-champion').length).toBeGreaterThan(0);
      expect(byTestId(tree, 'badge-card-story-adventurer')).toHaveLength(0);
    });
  });

  it('heads every section through translation keys', async () => {
    const tree = render(<ProgressScreen onBack={jest.fn()} />);

    await waitFor(() => {
      ['progress.adventuresHeading', 'progress.milestonesHeading', 'progress.badgesHeading'].forEach((key) => {
        expect(tree.UNSAFE_root.findAll((n: any) => n.props.children === key).length).toBeGreaterThan(0);
      });
    });
  });

  it('reports the back control', async () => {
    const onBack = jest.fn();
    const tree = render(<ProgressScreen onBack={onBack} />);

    await waitFor(() => expect(byTestId(tree, 'circle-action-back').length).toBeGreaterThan(0));
    fireEvent.press(byTestId(tree, 'circle-action-back')[0]);

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('opens the detail sheet from a badge tap and routes its recommendation', async () => {
    const onRecommend = jest.fn();
    const tree = render(<ProgressScreen onBack={jest.fn()} onRecommend={onRecommend} />);

    await waitFor(() => expect(byTestId(tree, 'badge-card-calm-champion').length).toBeGreaterThan(0));

    fireEvent.press(byTestId(tree, 'badge-card-calm-champion')[0]);

    await waitFor(() => expect(byTestId(tree, 'badge-detail-sheet').length).toBeGreaterThan(0));

    fireEvent.press(byTestId(tree, 'badge-detail-recommendation')[0]);

    expect(onRecommend).toHaveBeenCalledWith('calming');
  });
});
