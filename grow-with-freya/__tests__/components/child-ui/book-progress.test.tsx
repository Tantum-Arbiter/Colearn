/**
 * How far into a book the child is, drawn the way the operator's reference
 * has it: one capsule holding a glowing gold book, a purple bar that grows
 * in, shimmers and sparkles where it has filled, a bright star at its tip,
 * and the page they are on at the capsule's end.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { act, render } from '@testing-library/react-native';
import * as reanimated from 'react-native-reanimated';
import * as reducedMotionModule from '@/hooks/use-reduced-motion';
import { BOOK_PROGRESS, BookProgress, bookProgressSparkles } from '@/components/child-ui/book-progress';

const byTestId = (tree: ReturnType<typeof render>, id: string) => tree.UNSAFE_root.findAll((n: any) => n.props.testID === id);
const styled = (tree: ReturnType<typeof render>, id: string) =>
  StyleSheet.flatten(byTestId(tree, id).filter((n: any) => n.props.style !== undefined).slice(-1)[0].props.style);
const idsIn = (tree: ReturnType<typeof render>) =>
  tree.UNSAFE_root.findAll((n: any) => typeof n.props.testID === 'string').map((n: any) => n.props.testID as string);

describe('BookProgress', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each([
    [0.25, '25%'],
    [0, '0%'],
    [-0.3, '0%'],
    [1.4, '100%'],
    [0.067, '7%'],
  ])('fills the bar to how far they have read: %s', (fraction, width) => {
    const tree = render(<BookProgress fraction={fraction} />);

    expect(styled(tree, 'book-progress-fill').width).toBe(width);
  });

  it('reads as a progress bar, saying where they are', () => {
    const tree = render(<BookProgress fraction={0.4} label="Page 6 of 15" />);

    const bar = byTestId(tree, 'book-progress').find((n: any) => n.props.accessibilityRole === 'progressbar')!;

    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 40 });
    expect(bar.props.accessibilityLabel).toBe('Page 6 of 15');
  });

  it('is one capsule: the book, the bar and the page they are on, in that order, all inside it', () => {
    const tree = render(<BookProgress fraction={0.4} label="Page 6 of 15" size="small" />);
    const capsule = styled(tree, 'book-progress');
    const root = byTestId(tree, 'book-progress').find((n: any) => n.props.accessibilityRole === 'progressbar')!;
    const ids = idsIn(tree);

    expect(capsule).toEqual(expect.objectContaining({
      flexDirection: 'row',
      alignItems: 'center',
      height: BOOK_PROGRESS.small.height,
      borderRadius: BOOK_PROGRESS.small.height / 2,
      backgroundColor: BOOK_PROGRESS.colours.capsule,
      borderColor: BOOK_PROGRESS.colours.capsuleEdge,
    }));
    expect(ids.indexOf('book-progress-medal')).toBeLessThan(ids.indexOf('book-progress-track'));
    expect(ids.indexOf('book-progress-track')).toBeLessThan(ids.indexOf('book-progress-label'));
    expect(root.findAll((n: any) => n.props.testID === 'book-progress-label').length).toBeGreaterThan(0);
    expect(byTestId(tree, 'book-progress-label')[0].props.children).toBe('Page 6 of 15');
    expect(byTestId(tree, 'book-progress-label')[0].props.numberOfLines).toBe(1);
  });

  it('shows no words when it is given none, the bar running to the end of the capsule', () => {
    const tree = render(<BookProgress fraction={0.4} />);

    expect(byTestId(tree, 'book-progress-label')).toHaveLength(0);
    expect(styled(tree, 'book-progress-track').flex).toBe(1);
  });

  it('starts the capsule with a gold book as tall as the capsule itself', () => {
    const tree = render(<BookProgress fraction={0.4} size="small" />);
    const medal = styled(tree, 'book-progress-medal');

    expect(byTestId(tree, 'book-progress-medal')[0].findAll((n: any) => n.props.testID === 'icon-Ionicons-book').length).toBeGreaterThan(0);
    expect(medal).toEqual(expect.objectContaining({
      width: BOOK_PROGRESS.small.height,
      height: BOOK_PROGRESS.small.height,
      borderRadius: BOOK_PROGRESS.small.height / 2,
    }));
    expect(styled(tree, 'book-progress-track')).toEqual(
      expect.objectContaining({ flex: 1, height: BOOK_PROGRESS.small.bar, borderRadius: BOOK_PROGRESS.small.bar / 2 }),
    );
  });

  it('is smaller in its small size than its regular one', () => {
    expect(BOOK_PROGRESS.small.height).toBeLessThan(BOOK_PROGRESS.regular.height);
    expect(BOOK_PROGRESS.small.bar).toBeLessThan(BOOK_PROGRESS.regular.bar);
    const tree = render(<BookProgress fraction={0.4} />);

    expect(styled(tree, 'book-progress').height).toBe(BOOK_PROGRESS.regular.height);
  });

  it.each([
    [0, 0],
    [1, 1],
    [8, 1],
    [19, 1],
    [20, 2],
    [30, 2],
    [49, 2],
    [50, 3],
    [70, 3],
  ])('sparkles more the further they have read: %s%% gives %s', (percent, count) => {
    expect(bookProgressSparkles(percent)).toHaveLength(count);
    const tree = render(<BookProgress fraction={percent / 100} />);

    const sparkles = tree.UNSAFE_root.findAll((n: any) => typeof n.props.testID === 'string' && n.props.testID.startsWith('book-progress-sparkle-') && n.props.style);
    expect(sparkles).toHaveLength(count);
    sparkles.forEach((sparkle: any) => {
      const left = parseFloat(StyleSheet.flatten(sparkle.props.style).left);
      expect(left).toBeGreaterThan(0);
      expect(left).toBeLessThan(100);
    });
  });

  it('lights a star at the tip of the fill, and not on an empty bar', () => {
    expect(byTestId(render(<BookProgress fraction={0.4} />), 'book-progress-head').length).toBeGreaterThan(0);
    expect(byTestId(render(<BookProgress fraction={0} />), 'book-progress-head')).toHaveLength(0);
  });

  it('grows the fill in from nothing, over the width the fill is laid out at', () => {
    const timing = jest.spyOn(reanimated, 'withTiming');
    const tree = render(<BookProgress fraction={0.4} />);
    const fill = byTestId(tree, 'book-progress-fill').find((n: any) => typeof n.props.onLayout === 'function')!;

    act(() => { fill.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 80, height: 10 } } }); });

    expect(timing.mock.calls.some(([to, config]: any[]) => to === 1 && config?.duration === BOOK_PROGRESS.growMs)).toBe(true);
    expect(BOOK_PROGRESS.growMs).toBeGreaterThanOrEqual(500);
  });

  it('sweeps a shimmer along the fill, glows, pulses and twinkles, all on a loop', () => {
    const repeat = jest.spyOn(reanimated, 'withRepeat');

    const tree = render(<BookProgress fraction={0.7} />);

    expect(byTestId(tree, 'book-progress-shimmer').length).toBeGreaterThan(0);
    expect(repeat.mock.calls.length).toBeGreaterThanOrEqual(3 + bookProgressSparkles(70).length);
  });

  it('holds still when the device asks for less motion: the fill simply there, no shimmer, nothing looping', () => {
    jest.spyOn(reducedMotionModule, 'useReducedMotion').mockReturnValue(true);
    const repeat = jest.spyOn(reanimated, 'withRepeat');
    const timing = jest.spyOn(reanimated, 'withTiming');

    const tree = render(<BookProgress fraction={0.7} />);
    const fill = byTestId(tree, 'book-progress-fill').find((n: any) => typeof n.props.onLayout === 'function')!;
    act(() => { fill.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 80, height: 10 } } }); });

    expect(repeat).not.toHaveBeenCalled();
    expect(timing).not.toHaveBeenCalled();
    expect(byTestId(tree, 'book-progress-shimmer')).toHaveLength(0);
    expect(byTestId(tree, 'book-progress-glow').length).toBeGreaterThan(0);
    expect(byTestId(tree, 'book-progress-head').length).toBeGreaterThan(0);
  });
});
