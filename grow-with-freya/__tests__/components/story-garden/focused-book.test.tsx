/**
 * Tests for the focused-book state.
 *
 * This replaces the mode-selection modal. The child sees the book they picked
 * up, large and centred, and exactly two big choices. A familiar recorded voice
 * turns the second choice into "Listen to Mum" — the feature becomes part of
 * the ritual instead of a settings option.
 */

import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, waitFor, type RenderResult } from '@testing-library/react-native';
import type { Story } from '@/types/story';
import type { VoiceOver } from '@/services/voice-recording-service';

const mockGetVoiceOversForStory = jest.fn();

jest.mock('@/services/voice-recording-service', () => ({
  voiceRecordingService: {
    getVoiceOversForStory: (...args: unknown[]) => mockGetVoiceOversForStory(...args),
  },
}));

import { FocusedBook } from '@/components/stories/story-garden/focused-book';

const story = {
  id: 'wombat',
  title: 'Snuggle Little Wombat',
  description: 'A gentle story about settling down.',
  category: 'bedtime',
  isAvailable: true,
  coverImage: 'file:///cover.webp',
} as Story;

const mumVoice = { id: 'v1', storyId: 'wombat', name: 'Mum', createdAt: 0, pageRecordings: {} } as VoiceOver;

function textContents(view: RenderResult): string[] {
  return view
    .UNSAFE_queryAllByType(Text)
    .map((node) => node.props.children)
    .filter((child): child is string => typeof child === 'string');
}

function renderFocused(overrides: Partial<React.ComponentProps<typeof FocusedBook>> = {}) {
  const onChoose = jest.fn();
  const onRecordVoice = jest.fn();
  const onPutBack = jest.fn();

  const view = render(
    <FocusedBook
      story={story}
      language="en"
      reduceMotion={false}
      onChoose={onChoose}
      onRecordVoice={onRecordVoice}
      onPutBack={onPutBack}
      {...overrides}
    />
  );

  return { view, onChoose, onRecordVoice, onPutBack, ...view };
}

describe('FocusedBook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetVoiceOversForStory.mockResolvedValue([]);
  });

  describe('what the child sees', () => {
    it('should show the title of the book they picked up', () => {
      const { view } = renderFocused();

      expect(textContents(view)).toContain('Snuggle Little Wombat');
    });

    it('should show a one-sentence premise', () => {
      const { view } = renderFocused();

      expect(textContents(view)).toContain('A gentle story about settling down.');
    });

    it('should offer Read Together as a primary choice', () => {
      const { getByLabelText } = renderFocused();

      expect(getByLabelText('storyGarden.readTogether')).toBeTruthy();
    });

    it('should offer a way to put the book back', () => {
      const { getByLabelText } = renderFocused();

      expect(getByLabelText('storyGarden.putBack')).toBeTruthy();
    });
  });

  describe('with no recorded voice', () => {
    it('should offer a plain Listen choice', async () => {
      const { view } = renderFocused();

      await waitFor(() => expect(mockGetVoiceOversForStory).toHaveBeenCalled());
      expect(textContents(view)).toContain('storyGarden.listen');
    });

    it('should read together rather than narrate when Listen is chosen', async () => {
      const { getByLabelText, onChoose } = renderFocused();

      await waitFor(() => expect(mockGetVoiceOversForStory).toHaveBeenCalled());
      fireEvent.press(getByLabelText('storyGarden.listen'));

      expect(onChoose).toHaveBeenCalledWith('read', null);
    });
  });

  describe('with a familiar recorded voice', () => {
    beforeEach(() => {
      mockGetVoiceOversForStory.mockResolvedValue([mumVoice]);
    });

    it('should name the voice in the choice', async () => {
      const { view } = renderFocused();

      await waitFor(() =>
        expect(textContents(view)).toContain('storyGarden.listenTo (name:Mum)')
      );
    });

    it('should choose narration with that voice', async () => {
      const { getByLabelText, onChoose } = renderFocused();

      await waitFor(() => expect(mockGetVoiceOversForStory).toHaveBeenCalled());
      fireEvent.press(getByLabelText('storyGarden.listenTo (name:Mum)'));

      expect(onChoose).toHaveBeenCalledWith('narrate', mumVoice);
    });
  });

  describe('choices', () => {
    it('should read together when Read Together is pressed', () => {
      const { getByLabelText, onChoose } = renderFocused();

      fireEvent.press(getByLabelText('storyGarden.readTogether'));

      expect(onChoose).toHaveBeenCalledWith('read', null);
    });

    it('should put the book back when asked', () => {
      const { getByLabelText, onPutBack } = renderFocused();

      fireEvent.press(getByLabelText('storyGarden.putBack'));

      expect(onPutBack).toHaveBeenCalled();
    });

    it('should keep Record a Voice subordinate to the two main choices', () => {
      const { getByLabelText, onRecordVoice } = renderFocused();

      fireEvent.press(getByLabelText('storyGarden.recordAVoice'));

      expect(onRecordVoice).toHaveBeenCalled();
    });
  });

  describe('restraint', () => {
    it('should show no reward or celebration copy', () => {
      const { view } = renderFocused();

      const copy = textContents(view).join(' ');

      expect(copy).not.toMatch(/streak|trophy|points|reward/i);
    });
  });
});
