/**
 * Tests for the orientation bridge.
 *
 * The principle: do not rotate the catalogue UI, rotate the world behind an
 * already-open book. The book is one continuously rendered object across the
 * whole sequence, and the family is never trapped on a "please rotate" screen.
 */

import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, type RenderResult } from '@testing-library/react-native';
import { BookOpeningBridge } from '@/components/stories/story-garden/book-opening-bridge';
import type { BookOpeningPhase } from '@/hooks/use-book-opening';
import type { Story } from '@/types/story';

const story = {
  id: 'wombat',
  title: 'Snuggle Little Wombat',
  category: 'bedtime',
  isAvailable: true,
  coverImage: 'file:///cover.webp',
} as Story;

function byTestId(view: RenderResult, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID });
}

function textContents(view: RenderResult): string[] {
  return view
    .UNSAFE_queryAllByType(Text)
    .map((node) => node.props.children)
    .filter((child): child is string => typeof child === 'string');
}

function renderBridge(overrides: Partial<React.ComponentProps<typeof BookOpeningBridge>> = {}) {
  const onTurnTheScreen = jest.fn();
  const onReadThisWay = jest.fn();

  const view = render(
    <BookOpeningBridge
      story={story}
      phase="preOpen"
      showRotationEscape={false}
      isLandscape={false}
      reduceMotion={false}
      onTurnTheScreen={onTurnTheScreen}
      onReadThisWay={onReadThisWay}
      {...overrides}
    />
  );

  return { view, onTurnTheScreen, onReadThisWay, ...view };
}

describe('BookOpeningBridge', () => {
  describe('the book as a stable object', () => {
    it.each<BookOpeningPhase>(['expanding', 'preOpen', 'bridging', 'settling'])(
      'should keep rendering the same book during %s',
      (phase) => {
        const { view } = renderBridge({ phase });

        expect(byTestId(view, 'book-opening-bridge-book').length).toBeGreaterThan(0);
      }
    );

    it('should never show a loading spinner in place of the book', () => {
      const { view } = renderBridge({ phase: 'bridging' });

      expect(view.UNSAFE_queryAllByProps({ testID: 'loading-spinner' })).toHaveLength(0);
    });
  });

  describe('the rotation cue', () => {
    it('should invite the family to turn the screen together', () => {
      const { view } = renderBridge({ phase: 'preOpen' });

      expect(textContents(view)).toContain('storyGarden.turnTheScreen');
    });

    it('should not appear on a device already in landscape', () => {
      const { view } = renderBridge({ phase: 'preOpen', isLandscape: true });

      expect(byTestId(view, 'book-opening-cue')).toHaveLength(0);
    });

    it('should give way to the escape choices once they are offered', () => {
      const { view } = renderBridge({ phase: 'bridging', showRotationEscape: true });

      expect(byTestId(view, 'book-opening-cue')).toHaveLength(0);
      expect(byTestId(view, 'book-opening-escape').length).toBeGreaterThan(0);
    });
  });

  describe('never trapping the family', () => {
    it('should offer both turning the screen and reading this way', () => {
      const { view } = renderBridge({ phase: 'bridging', showRotationEscape: true });

      expect(textContents(view)).toContain('storyGarden.turnTheScreenShort');
      expect(textContents(view)).toContain('storyGarden.readThisWay');
    });

    it('should open the portrait reader when the child chooses to read this way', () => {
      const { getByLabelText, onReadThisWay } = renderBridge({
        phase: 'bridging',
        showRotationEscape: true,
      });

      fireEvent.press(getByLabelText('storyGarden.readThisWay'));

      expect(onReadThisWay).toHaveBeenCalled();
    });

    it('should phrase the escape as a choice, not a correction', () => {
      const { view } = renderBridge({ phase: 'bridging', showRotationEscape: true });

      const copy = textContents(view).join(' ');

      expect(copy).not.toMatch(/please|must|required|wrong/i);
    });
  });
});
