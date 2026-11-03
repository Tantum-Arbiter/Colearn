/**
 * The detail sheet is where recommendations live (§22): gentle progress
 * dots and one activity-driven suggestion — never on the Progress page
 * itself, and never once the badge is earned.
 */

import React from 'react';
import { act, render, fireEvent } from '@testing-library/react-native';
import { BadgeDetailSheet, BADGE_SHEET_MOTION } from '@/components/progress/badge-detail-sheet';
import { withTiming } from 'react-native-reanimated';
import { Badge, badgeStatus } from '@/components/progress/progress-model';
import {
  JourneyBarCoverProvider,
  useJourneyBarCovered,
} from '@/components/child-ui/journey-bar-cover';
import { Text } from 'react-native';

const badge = (current: number, target: number): Badge => ({
  id: 'calm-champion',
  titleKey: 'progress.badges.calmChampion.title',
  descriptionKey: 'progress.badges.calmChampion.description',
  artwork: { uri: 'test://artwork' },
  category: 'calm',
  currentProgress: current,
  targetProgress: target,
  status: badgeStatus(current, target),
  recommendation: { labelKey: 'progress.recommendations.calming', tag: 'calming' },
});

function byTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

/** Reports whether the journey bar has been taken away. */
function BarState() {
  return <Text testID="bar-covered">{String(useJourneyBarCovered())}</Text>;
}

describe('BadgeDetailSheet', () => {
  beforeEach(() => jest.clearAllMocks());

  it('takes the journey bar away as soon as a badge is opened', () => {
    // The sheet slides up over the bar's corner, so the bar has to go with the
    // same tap rather than a frame later.
    const tree = render(
      <JourneyBarCoverProvider>
        <BarState />
        <BadgeDetailSheet badge={null} onClose={jest.fn()} onRecommend={jest.fn()} />
      </JourneyBarCoverProvider>
    );

    expect(byTestId(tree, 'bar-covered')[0].props.children).toBe('false');

    tree.rerender(
      <JourneyBarCoverProvider>
        <BarState />
        <BadgeDetailSheet badge={badge(1, 3)} onClose={jest.fn()} onRecommend={jest.fn()} />
      </JourneyBarCoverProvider>
    );

    expect(byTestId(tree, 'bar-covered')[0].props.children).toBe('true');
  });

  it('parts the badge\'s promise from its progress with the star rule', () => {
    const tree = render(
      <BadgeDetailSheet badge={badge(1, 3)} onClose={jest.fn()} onRecommend={jest.fn()} />
    );

    expect(byTestId(tree, 'badge-detail-divider').length).toBeGreaterThan(0);
    expect(byTestId(tree, 'badge-detail-clouds').length).toBeGreaterThan(0);
  });

  it('shows a CMS badge by its own copy', () => {
    const cms = { ...badge(2, 5), titleKey: '', descriptionKey: '', title: 'Calm Collector', description: 'Finish two calming books' };
    const tree = render(<BadgeDetailSheet badge={cms} onClose={jest.fn()} onRecommend={jest.fn()} />);

    expect(tree.UNSAFE_root.findAll((n: any) => n.props.children === 'Calm Collector').length).toBeGreaterThan(0);
    expect(tree.UNSAFE_root.findAll((n: any) => n.props.children === 'Finish two calming books').length).toBeGreaterThan(0);
  });

  it('renders nothing when no badge is selected', () => {
    const tree = render(<BadgeDetailSheet badge={null} onClose={jest.fn()} onRecommend={jest.fn()} />);

    expect(byTestId(tree, 'badge-detail-sheet')).toHaveLength(0);
  });

  it('shows one dot per target with the current progress filled', () => {
    const tree = render(<BadgeDetailSheet badge={badge(2, 5)} onClose={jest.fn()} onRecommend={jest.fn()} />);

    expect(byTestId(tree, 'badge-dot-filled')).toHaveLength(2);
    expect(byTestId(tree, 'badge-dot-empty')).toHaveLength(3);
  });

  it('falls back to the progress pill for large targets', () => {
    const large = { ...badge(6, 10), id: 'story-adventurer' };
    const tree = render(<BadgeDetailSheet badge={large} onClose={jest.fn()} onRecommend={jest.fn()} />);

    expect(byTestId(tree, 'badge-detail-dots')).toHaveLength(0);
    expect(byTestId(tree, 'badge-detail-progress').length).toBeGreaterThan(0);
  });

  it('routes the recommendation through onRecommend', () => {
    const onRecommend = jest.fn();
    const underTest = badge(2, 5);
    const tree = render(<BadgeDetailSheet badge={underTest} onClose={jest.fn()} onRecommend={onRecommend} />);

    fireEvent.press(byTestId(tree, 'badge-detail-recommendation')[0]);

    expect(onRecommend).toHaveBeenCalledWith(underTest);
  });

  it('offers no recommendation once the badge is earned', () => {
    const tree = render(<BadgeDetailSheet badge={badge(5, 5)} onClose={jest.fn()} onRecommend={jest.fn()} />);

    expect(byTestId(tree, 'badge-detail-recommendation')).toHaveLength(0);
  });

  it('closes through the close control', () => {
    const onClose = jest.fn();
    const tree = render(<BadgeDetailSheet badge={badge(2, 5)} onClose={onClose} onRecommend={jest.fn()} />);

    fireEvent.press(byTestId(tree, 'badge-detail-close')[0]);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // operator, 2026-10-05: "it should slide into view and out of view"
  describe('sliding', () => {
    const timing = withTiming as unknown as jest.Mock;
    const realTiming = timing.getMockImplementation();
    const slides = (to: (value: number) => boolean) =>
      timing.mock.calls.filter(([value, config]) => to(value) && config?.duration !== undefined);
    let finishes: ((finished: boolean) => void)[] = [];

    function holdTheSlide() {
      finishes = [];
      timing.mockImplementation((value: number, _config: unknown, callback?: (finished: boolean) => void) => {
        if (callback) finishes.push(callback);
        return value;
      });
    }

    beforeEach(() => {
      Object.defineProperty(document.documentElement, 'clientWidth', { value: 402, configurable: true });
      Object.defineProperty(document.documentElement, 'clientHeight', { value: 874, configurable: true });
      window.dispatchEvent(new Event('resize'));
    });

    afterEach(() => {
      timing.mockImplementation(realTiming);
    });

    it('slides up from the foot of the screen as a badge is opened', () => {
      const tree = render(<BadgeDetailSheet badge={null} onClose={jest.fn()} onRecommend={jest.fn()} />);
      timing.mockClear();

      tree.rerender(<BadgeDetailSheet badge={badge(1, 3)} onClose={jest.fn()} onRecommend={jest.fn()} />);

      expect(slides((value) => value === 0)).toEqual(
        expect.arrayContaining([[0, expect.objectContaining({ duration: BADGE_SHEET_MOTION.inMs })]])
      );
      expect(byTestId(tree, 'badge-detail-sheet').length).toBeGreaterThan(0);
    });

    it('slides back down, still showing its badge, and only then goes', () => {
      holdTheSlide();
      const tree = render(<BadgeDetailSheet badge={badge(1, 3)} onClose={jest.fn()} onRecommend={jest.fn()} />);
      finishes = [];
      timing.mockClear();

      tree.rerender(<BadgeDetailSheet badge={null} onClose={jest.fn()} onRecommend={jest.fn()} />);
      const leaving = timing.mock.calls.find(([, config, callback]) => config?.duration === BADGE_SHEET_MOTION.outMs && typeof callback === 'function');
      const stillThere = byTestId(tree, 'badge-detail-sheet').length;
      act(() => finishes.forEach((finish) => finish(true)));

      expect(leaving?.[0]).toBe(874);
      expect(stillThere).toBeGreaterThan(0);
      expect(byTestId(tree, 'badge-detail-sheet')).toHaveLength(0);
      expect(byTestId(tree, 'badge-detail-overlay')).toHaveLength(0);
    });

    it('lets touches through while it slides away', () => {
      holdTheSlide();
      const tree = render(<BadgeDetailSheet badge={badge(1, 3)} onClose={jest.fn()} onRecommend={jest.fn()} />);

      tree.rerender(<BadgeDetailSheet badge={null} onClose={jest.fn()} onRecommend={jest.fn()} />);

      expect(byTestId(tree, 'badge-detail-overlay')[0].props.pointerEvents).toBe('none');
    });

    it('gives the journey bar back only once the sheet has gone', () => {
      holdTheSlide();
      const tree = render(
        <JourneyBarCoverProvider>
          <BarState />
          <BadgeDetailSheet badge={badge(1, 3)} onClose={jest.fn()} onRecommend={jest.fn()} />
        </JourneyBarCoverProvider>
      );
      finishes = [];

      tree.rerender(
        <JourneyBarCoverProvider>
          <BarState />
          <BadgeDetailSheet badge={null} onClose={jest.fn()} onRecommend={jest.fn()} />
        </JourneyBarCoverProvider>
      );
      const whileLeaving = byTestId(tree, 'bar-covered')[0].props.children;
      act(() => finishes.forEach((finish) => finish(true)));

      expect(whileLeaving).toBe('true');
      expect(byTestId(tree, 'bar-covered')[0].props.children).toBe('false');
    });

    it('comes straight back up if a badge is opened again while it slides away', () => {
      holdTheSlide();
      const tree = render(<BadgeDetailSheet badge={badge(1, 3)} onClose={jest.fn()} onRecommend={jest.fn()} />);
      tree.rerender(<BadgeDetailSheet badge={null} onClose={jest.fn()} onRecommend={jest.fn()} />);
      const stale = [...finishes];
      timing.mockClear();

      tree.rerender(<BadgeDetailSheet badge={badge(2, 3)} onClose={jest.fn()} onRecommend={jest.fn()} />);
      act(() => stale.forEach((finish) => finish(false)));

      expect(slides((value) => value === 0).length).toBeGreaterThan(0);
      expect(byTestId(tree, 'badge-detail-sheet').length).toBeGreaterThan(0);
      expect(byTestId(tree, 'badge-detail-overlay')[0].props.pointerEvents).not.toBe('none');
    });
  });
});
