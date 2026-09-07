/**
 * Tests for the three home cards on their own.
 *
 * Each is one tappable surface whose words and pictures all come from the
 * data it is handed; none of them hard-codes a number.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { act, render, fireEvent, type RenderResult } from '@testing-library/react-native';
import { ContinueCard } from '@/components/home/continue-card';
import { AchievementCard } from '@/components/home/achievement-card';
import { StreakChip } from '@/components/home/streak-chip';
import { Ionicons } from '@expo/vector-icons';
import { MILESTONE_STARS } from '@/constants/home-journey';

interface RenderedNode {
  type: unknown;
  props: Record<string, unknown>;
}

function textContents(view: RenderResult): string[] {
  return view
    .UNSAFE_queryAllByType(Text)
    .flatMap((node) => (Array.isArray(node.props.children) ? node.props.children : [node.props.children]))
    .filter((child): child is string => typeof child === 'string');
}

function byTestId(view: RenderResult, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID });
}

function pressTestId(view: RenderResult, testID: string): void {
  const matches = byTestId(view, testID);

  fireEvent.press(matches[matches.length - 1]);
}

const STORY = { id: 'moonlight', title: 'The Moonlight Garden', currentPage: 8, totalPages: 14, coverImage: { uri: 'file:///cover.webp' } };

describe('ContinueCard', () => {
  it('should introduce itself as something shared and name the story', () => {
    const view = render(<ContinueCard story={STORY} width={358} animated={false} onPress={jest.fn()} />);

    const underTest = textContents(view);

    expect(underTest).toContain('home.continueTogether');
    expect(underTest).toContain('The Moonlight Garden');
    expect(underTest).toContain('home.continueBody');
    expect(underTest).toContain('home.pagePosition (page:8, total:14)');
  });

  it('should show the cover and a subtle measure of how far in the book is', () => {
    const view = render(<ContinueCard story={STORY} width={358} animated={false} onPress={jest.fn()} />);

    const fill = byTestId(view, 'continue-progress-fill')[0];

    expect(byTestId(view, 'continue-cover').length).toBeGreaterThan(0);
    expect(StyleSheet.flatten(fill.props.style).width).toBe('57%');
  });

  it('should invite a first story when there is nothing to continue', () => {
    const view = render(<ContinueCard width={358} animated={false} onPress={jest.fn()} />);

    const underTest = textContents(view);

    expect(underTest).toContain('home.continueStart.title');
    expect(byTestId(view, 'continue-cover-placeholder').length).toBeGreaterThan(0);
    expect(byTestId(view, 'continue-progress-fill').length).toBe(0);
  });

  it('should be one tappable surface with a forward arrow', () => {
    const onPress = jest.fn();
    const view = render(<ContinueCard story={STORY} width={358} animated={false} onPress={onPress} />);

    pressTestId(view, 'continue-card');

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(byTestId(view, 'continue-arrow').length).toBeGreaterThan(0);
  });

  it('should stand out as the primary call to action', () => {
    const view = render(<ContinueCard story={STORY} width={358} animated={false} onPress={jest.fn()} />);

    expect(byTestId(view, 'continue-card-glow').length).toBeGreaterThan(0);
  });

  it('should wear the storybook-glass frame: bloom, gradient stroke, inner rim and lit corners', () => {
    const view = render(<ContinueCard story={STORY} width={358} animated={false} onPress={jest.fn()} />);

    const layers = ['continue-card-glow', 'continue-card-border', 'continue-card-inner-highlight', 'continue-card-sheen'].map(
      (testID) => byTestId(view, testID).length > 0
    );

    expect(layers).toEqual([true, true, true, true]);
    expect(byTestId(view, 'continue-card-corner-bloom').filter((node) => node.type === View)).toHaveLength(0);
  });

  it('should end in a golden arrow button that answers the press', () => {
    const view = render(<ContinueCard story={STORY} width={358} animated={false} onPress={jest.fn()} />);

    expect(byTestId(view, 'continue-arrow-disc').length).toBeGreaterThan(0);
    expect(byTestId(view, 'continue-arrow-glyph').length).toBeGreaterThan(0);
    expect(byTestId(view, 'continue-progress-sheen').length).toBeGreaterThan(0);
  });

  it('should let the arrow dip while the card is held and spring back when it is let go', () => {
    const view = render(<ContinueCard story={STORY} width={358} animated={false} onPress={jest.fn()} />);
    const matches = byTestId(view, 'continue-card');
    const pressable = matches[matches.length - 1];
    const arrowPressed = () =>
      view.UNSAFE_root.findAll((node: RenderedNode) => node.props.testID === 'continue-arrow' && typeof node.props.pressed === 'boolean')[0].props.pressed;

    act(() => {
      fireEvent(pressable, 'pressIn');
    });
    const held = arrowPressed();
    act(() => {
      fireEvent(pressable, 'pressOut');
    });

    expect(held).toBe(true);
    expect(arrowPressed()).toBe(false);
  });
});

describe('AchievementCard', () => {
  beforeAll(() => {
    (Ionicons as unknown as { glyphMap: Record<string, number> }).glyphMap = { rocket: 1, star: 3 };
  });

  const NEXT = { title: 'Moon Explorer', current: 3, required: 5, unit: 'stories' as const };

  const renderCard = (props: Partial<React.ComponentProps<typeof AchievementCard>> = {}) =>
    render(
      <AchievementCard next={NEXT} width={358} animated={false} celebrate={false} onPress={jest.fn()} {...props} />
    );

  it('should show the next badge to reach, with the badge artwork when there is some', () => {
    const view = renderCard({ next: { ...NEXT, artwork: { uri: 'file:///badge.webp' } } });

    const underTest = textContents(view);

    expect(underTest).toContain('home.milestone.eyebrow');
    expect(underTest).toContain('Moon Explorer');
    expect(byTestId(view, 'next-medallion-artwork').length).toBeGreaterThan(0);
    expect(byTestId(view, 'next-medallion-icon').length).toBe(0);
  });

  it('should fall back to a rocket in the medallion without artwork', () => {
    const view = renderCard();

    expect(byTestId(view, 'next-medallion-icon')[0].props.name).toBe('rocket');
  });

  it('should light the milestone stars in proportion', () => {
    const view = renderCard();

    const lit = byTestId(view, 'milestone-star-lit').length;
    const unlit = byTestId(view, 'milestone-star-unlit').length;

    expect(lit).toBe(3);
    expect(lit + unlit).toBe(MILESTONE_STARS);
    expect(textContents(view)).toContain('home.milestone.remaining.stories (count:2)');
  });

  it('should use the unit of the badge it is counting towards', () => {
    const view = renderCard({ next: { ...NEXT, unit: 'tunes' } });

    expect(textContents(view)).toContain('home.milestone.remaining.tunes (count:2)');
  });

  it('should celebrate a full set without stars to light', () => {
    const view = renderCard({ next: undefined });

    expect(textContents(view)).toContain('home.milestone.allDone');
    expect(byTestId(view, 'milestone-stars').length).toBe(0);
  });

  /**
   * The medallion once sat inside four orbiting gold stars. They were the
   * card's loudest thing and always on, which is what made a panel about
   * something not yet earned shout louder than the story to carry on with.
   * The glint stays: it plays once, on a badge actually won.
   */
  it('should keep a glint ready for a new badge, without ringing itself in stars', () => {
    const view = renderCard();

    expect(byTestId(view, 'medallion-orbit-star')).toHaveLength(0);
    expect(byTestId(view, 'next-medallion-glint').length).toBeGreaterThan(0);
    expect(textContents(view)).toContain('home.achievements.cta');
  });

  it('should open the achievements when tapped', () => {
    const onPress = jest.fn();
    const view = renderCard({ onPress });

    pressTestId(view, 'achievement-card');

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

/**
 * Encouragement, not a statistic. The stats card that once carried a streak
 * tile is gone; what a child gets now is the flame and how many days it has
 * been burning, and an invitation rather than a zero when it has not started.
 */
describe('StreakChip', () => {
  const renderChip = (props: Partial<React.ComponentProps<typeof StreakChip>> = {}) =>
    render(<StreakChip days={4} animated={false} {...props} />);

  it('should count the days in a row beside a flame', () => {
    const view = renderChip();

    expect(textContents(view)).toContain('home.streak.days (count:4)');
    expect(byTestId(view, 'streak-chip-flame').length).toBeGreaterThan(0);
  });

  it('should invite a first streak rather than show a zero', () => {
    const view = renderChip({ days: 0 });

    const underTest = textContents(view);

    expect(underTest).toContain('home.streak.start');
    expect(underTest.some((text: string) => text.includes('0'))).toBe(false);
  });

  /** The flame is still there when unlit, banked down rather than swapped. */
  it('should keep the flame when there is no streak yet', () => {
    const view = renderChip({ days: 0 });

    expect(byTestId(view, 'streak-chip-flame').length).toBeGreaterThan(0);
  });

  it('should read as text rather than something to press', () => {
    const view = renderChip();

    expect(byTestId(view, 'streak-chip')[0].props.accessibilityRole).toBe('text');
  });
});
