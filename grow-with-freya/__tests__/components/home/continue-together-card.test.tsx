/**
 * Tests for the "Continue together" card.
 *
 * It is the first thing under the greeting because a half-finished story is the
 * strongest invitation the app has. It never appears empty -no story in
 * progress means no card at all.
 */

import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, type RenderResult } from '@testing-library/react-native';
import { ContinueTogetherCard } from '@/components/home/continue-together-card';
import { progressFraction } from '@/constants/home-scene';

function textContents(view: RenderResult): string[] {
  return view
    .UNSAFE_queryAllByType(Text)
    .map((node) => node.props.children)
    .filter((child): child is string => typeof child === 'string');
}

function byTestId(view: RenderResult, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID });
}

function renderCard(props: Partial<React.ComponentProps<typeof ContinueTogetherCard>> = {}) {
  const onPress = jest.fn();

  const view = render(
    <ContinueTogetherCard
      title="The Gate Hears Two Taps"
      coverImage="file:///cover.webp"
      pageIndex={3}
      totalPages={10}
      width={312}
      timeOfDay="night"
      onPress={onPress}
      {...props}
    />
  );

  return { view, onPress, ...view };
}

describe('ContinueTogetherCard', () => {
  describe('what it says', () => {
    it('should name the story so the child recognises it', () => {
      const { view } = renderCard();

      const underTest = textContents(view);

      expect(underTest).toContain('The Gate Hears Two Taps');
    });

    it('should introduce itself as something shared, not something owed', () => {
      const { view } = renderCard();

      const underTest = textContents(view);

      expect(underTest).toContain('home.continueTogether');
    });

    it('should report the place in the book with interpolated numbers', () => {
      const { view } = renderCard();

      const underTest = textContents(view);

      expect(underTest).toContain('home.pagePosition (page:4, total:10)');
    });
  });

  describe('the surface', () => {
    it('should catch the light along its top edge', () => {
      const { view } = renderCard();

      const underTest = byTestId(view, 'continue-hairline');

      expect(underTest.length).toBeGreaterThan(0);
    });
  });

  describe('the progress bar', () => {
    it.each([
      [0, 10, 0.1],
      [3, 10, 0.4],
      [9, 10, 1],
    ])('should fill to page %i of %i', (pageIndex, totalPages, expected) => {
      const underTest = progressFraction(pageIndex, totalPages);

      expect(underTest).toBeCloseTo(expected);
    });

    it('should never divide by a missing page count', () => {
      const underTest = progressFraction(3, 0);

      expect(underTest).toBe(0);
    });

    it('should render a fill element', () => {
      const { view } = renderCard();

      const underTest = byTestId(view, 'continue-progress-fill');

      expect(underTest.length).toBeGreaterThan(0);
    });
  });

  describe('resuming', () => {
    it('should call back when the card is chosen', () => {
      const { onPress, view } = renderCard();

      fireEvent.press(byTestId(view, 'continue-together-card')[0]);

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should describe itself to a screen reader using the story title', () => {
      const { view } = renderCard();

      const underTest = view.UNSAFE_queryAllByProps({ accessibilityRole: 'button' })[0];

      expect(underTest.props.accessibilityLabel).toBe(
        'home.resumeStory (title:The Gate Hears Two Taps)'
      );
    });
  });
});
