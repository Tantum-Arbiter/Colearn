/**
 * Tests for the closing ritual.
 *
 * Closing reverses the opening metaphor: a comfortable breath, the book closes,
 * the cover shrinks toward the centre, and exactly two choices appear. "Put It
 * Back" replaces "Exit" — and there are no points, streaks or trophies.
 */

import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, act, type RenderResult } from '@testing-library/react-native';
import { BookClosing } from '@/components/stories/story-garden/book-closing';
import { STORY_GARDEN_MOTION } from '@/constants/story-garden-motion';
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

function renderClosing(reduceMotion = false) {
  const onReadAgain = jest.fn();
  const onPutItBack = jest.fn();

  const view = render(
    <BookClosing
      story={story}
      reduceMotion={reduceMotion}
      onReadAgain={onReadAgain}
      onPutItBack={onPutItBack}
    />
  );

  return { view, onReadAgain, onPutItBack, ...view };
}

function advance(ms: number): void {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

const FULL_CLOSE =
  STORY_GARDEN_MOTION.closingBreath.duration + STORY_GARDEN_MOTION.bookClose.duration;

describe('BookClosing', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('the quiet beat', () => {
    it('should hold the scene still before offering anything', () => {
      const { view } = renderClosing();

      expect(byTestId(view, 'book-closing-choices')).toHaveLength(0);
    });

    it('should still be quiet part-way through the breath', () => {
      const { view } = renderClosing();

      advance(STORY_GARDEN_MOTION.closingBreath.duration - 1);

      expect(byTestId(view, 'book-closing-choices')).toHaveLength(0);
    });
  });

  describe('after the book closes', () => {
    it('should offer exactly two choices', () => {
      const { view } = renderClosing();

      advance(FULL_CLOSE);

      expect(textContents(view)).toContain('storyGarden.readAgain');
      expect(textContents(view)).toContain('storyGarden.putItBack');
    });

    it('should call back when the child wants to read again', () => {
      const { getByLabelText, onReadAgain } = renderClosing();

      advance(FULL_CLOSE);
      fireEvent.press(getByLabelText('storyGarden.readAgain'));

      expect(onReadAgain).toHaveBeenCalled();
    });

    it('should call back when the child puts the book back', () => {
      const { getByLabelText, onPutItBack } = renderClosing();

      advance(FULL_CLOSE);
      fireEvent.press(getByLabelText('storyGarden.putItBack'));

      expect(onPutItBack).toHaveBeenCalled();
    });
  });

  describe('the completion mark', () => {
    it('should be a single restrained ribbon', () => {
      const { view } = renderClosing();

      expect(byTestId(view, 'book-closing-ribbon')).toHaveLength(1);
    });

    it('should never mention points, streaks or trophies', () => {
      const { view } = renderClosing();

      advance(FULL_CLOSE);
      const copy = textContents(view).join(' ');

      expect(copy).not.toMatch(/point|streak|trophy|badge|reward/i);
    });

    it('should not say Exit', () => {
      const { view } = renderClosing();

      advance(FULL_CLOSE);

      expect(textContents(view)).not.toContain('common.exit');
    });
  });

  describe('with reduced motion', () => {
    it('should reach the choices sooner', () => {
      const { view } = renderClosing(true);

      advance(
        STORY_GARDEN_MOTION.closingBreath.reducedDuration
          + STORY_GARDEN_MOTION.bookClose.reducedDuration
      );

      expect(byTestId(view, 'book-closing-choices').length).toBeGreaterThan(0);
    });
  });
});
