/**
 * The Progress screen composes the §2 hierarchy: planet artwork, floating
 * controls, title and subtitle, weekly card, milestones, badges — and a
 * badge tap opens the detail sheet where the recommendation lives.
 */

import React from 'react';
import { StyleSheet, type View } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ProgressScreen } from '@/components/progress/progress-screen';
import { PLANET_HEADER_ESTIMATE } from '@/components/child-ui/planet-cover';

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

/** Every badge on the shelf, wherever it sits in the grid's rows. */
function badgeCards(tree: ReturnType<typeof render>) {
  return tree.UNSAFE_root.findAll(
    (n: any) => typeof n.props.testID === 'string' && n.props.testID.startsWith('badge-card-'),
  );
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
      expect(byTestId(tree, 'circle-action-home').length).toBeGreaterThan(0);
      expect(byTestId(tree, 'circle-action-audio').length).toBeGreaterThan(0);
      expect(textByTestId(tree, 'progress-title').props.children).toBe('progress.title');
      // the flat line became the arched two-line tagline the other pages carry
      expect(byTestId(tree, 'progress-tagline').length).toBeGreaterThan(0);
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
      expect(badgeCards(tree).length).toBeGreaterThanOrEqual(12);
      expect(textByTestId(tree, 'badges-summary').props.children).toContain('progress.badgesSummary');
    });
  });

  /**
   * A ring drawn around every badge is most of the page, and large enough to
   * reach the owl's own corner in the bottom left -- which then had to fade
   * back out of the way of a highlight that was covering it. One row says
   * "here are the badges" just as well, and the owl can stay where it is.
   */
  it('gives the owl one row of badges to point at, not the whole shelf', async () => {
    const badges = React.createRef<View>();

    const tree = render(<ProgressScreen onBack={jest.fn()} guideTargets={{ badges }} />);

    await waitFor(() => {
      const row = byTestId(tree, 'badge-row');
      expect(row).toHaveLength(1);
      expect(row[0].props.children.length).toBeLessThan(badgeCards(tree).length);
    });
  });

  it('keeps every badge on the shelf, in the rows below that one', async () => {
    const tree = render(<ProgressScreen onBack={jest.fn()} />);

    await waitFor(() => {
      const inTheRow = byTestId(tree, 'badge-row')[0].props.children.length;

      expect(badgeCards(tree).length).toBeGreaterThan(inTheRow);
    });
  });

  it('narrows the grid to a category from the filter bar', async () => {
    const tree = render(<ProgressScreen onBack={jest.fn()} />);

    await waitFor(() => expect(byTestId(tree, 'badge-category-calm').length).toBeGreaterThan(0));
    const total = badgeCards(tree).length;

    fireEvent.press(byTestId(tree, 'badge-category-calm')[0]);

    await waitFor(() => {
      expect(badgeCards(tree).length).toBeLessThan(total);
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

  it('goes home from the home control', async () => {
    const onBack = jest.fn();
    const tree = render(<ProgressScreen onBack={onBack} />);

    await waitFor(() => expect(byTestId(tree, 'circle-action-home').length).toBeGreaterThan(0));
    const home = byTestId(tree, 'circle-action-home')[0];
    fireEvent.press(home);

    expect(home.props.accessibilityLabel).toBe('common.home');
    expect(home.findAll((n: any) => n.props.children === 'common.home').length).toBeGreaterThan(0);
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

/**
 * Like the library, Progress starts below the planet and scrolls away behind
 * it: the scroll area runs to the top of the screen, the planet is drawn over
 * it, and the title and buttons over the planet -- embedded in the library's
 * sections or standing on its own.
 */
describe('Progress and the planet', () => {
  beforeEach(() => jest.clearAllMocks());

  function firstIndex(tree: ReturnType<typeof render>, testID: string): number {
    const all = tree.UNSAFE_root.findAll((n: any) => typeof n.props.testID === 'string');

    return all.findIndex((n: any) => n.props.testID === testID);
  }

  function scrollOf(tree: ReturnType<typeof render>) {
    return byTestId(tree, 'progress-scroll').find((n: any) => n.props.contentContainerStyle);
  }

  it.each([
    ['on its own', false],
    ['inside the library', true],
  ])('runs the scroll area to the top of the screen %s', async (_case, embedded) => {
    const tree = render(<ProgressScreen onBack={jest.fn()} embedded={embedded} />);
    await waitFor(() => expect(byTestId(tree, 'progress-hero-card').length).toBeGreaterThan(0));

    const frame = StyleSheet.flatten(scrollOf(tree).props.style);

    expect(frame.position).toBe('absolute');
    expect(frame.top).toBe(0);
  });

  it('starts the weekly card below the planet and the header', async () => {
    const tree = render(<ProgressScreen onBack={jest.fn()} embedded />);
    await waitFor(() => expect(byTestId(tree, 'progress-hero-card').length).toBeGreaterThan(0));

    const content = StyleSheet.flatten(scrollOf(tree).props.contentContainerStyle);

    expect(content.paddingTop).toBeGreaterThanOrEqual(PLANET_HEADER_ESTIMATE.phone);
  });

  it('draws the planet over the cards and the title over the planet', async () => {
    const tree = render(<ProgressScreen onBack={jest.fn()} embedded />);
    await waitFor(() => expect(byTestId(tree, 'progress-hero-card').length).toBeGreaterThan(0));

    const scroll = firstIndex(tree, 'progress-scroll');
    const cover = firstIndex(tree, 'progress-planet-over-cards');
    const title = firstIndex(tree, 'progress-title');

    expect(scroll).toBeGreaterThanOrEqual(0);
    expect(cover).toBeGreaterThan(scroll);
    expect(title).toBeGreaterThan(cover);
  });

  it('lets a drag that starts on the header reach the cards beneath it', async () => {
    const tree = render(<ProgressScreen onBack={jest.fn()} embedded />);
    await waitFor(() => expect(byTestId(tree, 'progress-hero-card').length).toBeGreaterThan(0));

    const header = byTestId(tree, 'progress-header').find((n: any) => n.props.onLayout);

    expect(header.props.pointerEvents).toBe('box-none');
  });
});
