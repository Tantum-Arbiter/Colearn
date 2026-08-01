/**
 * Tests that story titles come from METADATA, not from the cover artwork.
 *
 * Cover images will no longer carry a baked-in title, so the UI is the only
 * thing that names a story. That makes these assertions load-bearing: if the
 * localised title stops rendering, a Polish or Japanese child sees an unnamed
 * book rather than an English one.
 */

import React from 'react';
import { Text } from 'react-native';
import { render, type RenderResult } from '@testing-library/react-native';
import { ShelfBook } from '@/components/stories/story-garden/shelf-book';
import { ContinueReadingBook } from '@/components/stories/story-garden/continue-reading-book';
import { FocusedBook } from '@/components/stories/story-garden/focused-book';
import type { Story } from '@/types/story';
import type { SupportedLanguage } from '@/services/i18n';

jest.mock('@/services/voice-recording-service', () => ({
  voiceRecordingService: { getVoiceOversForStory: () => Promise.resolve([]) },
}));

const WOMBAT = {
  id: 'wombat',
  title: 'Snuggle Little Wombat',
  description: 'A gentle bedtime story.',
  category: 'bedtime',
  isAvailable: true,
  coverImage: 'file:///cover.webp',
  localizedTitle: {
    en: 'Snuggle Little Wombat',
    pl: 'Przytulanka Mały Wombat',
    ja: 'ウォンバットを抱きしめる',
    ar: 'احتضن الومبت الصغير',
  },
  localizedDescription: {
    en: 'A gentle bedtime story.',
    pl: 'Łagodna opowieść na dobranoc.',
  },
} as unknown as Story;

function textContents(view: RenderResult): string[] {
  return view
    .UNSAFE_queryAllByType(Text)
    .map((node) => node.props.children)
    .filter((child): child is string => typeof child === 'string');
}

const LANGUAGES: [SupportedLanguage, string][] = [
  ['en', 'Snuggle Little Wombat'],
  ['pl', 'Przytulanka Mały Wombat'],
  ['ja', 'ウォンバットを抱きしめる'],
  ['ar', 'احتضن الومبت الصغير'],
];

describe('story titles come from metadata', () => {
  describe('on a shelf book', () => {
    it.each(LANGUAGES)('should render the %s title', (language, expected) => {
      const view = render(
        <ShelfBook
          story={WOMBAT} width={200} isCentred isBookmarked={false}
          language={language} onPress={jest.fn()}
        />
      );

      expect(textContents(view)).toContain(expected);
    });

    it('should fall back to English for a language with no translation', () => {
      const view = render(
        <ShelfBook
          story={WOMBAT} width={200} isCentred isBookmarked={false}
          language={'da' as SupportedLanguage} onPress={jest.fn()}
        />
      );

      expect(textContents(view)).toContain('Snuggle Little Wombat');
    });

    it('should name the book for assistive technology in the same language', () => {
      const { getByLabelText } = render(
        <ShelfBook
          story={WOMBAT} width={200} isCentred isBookmarked={false}
          language="pl" onPress={jest.fn()}
        />
      );

      expect(getByLabelText('Przytulanka Mały Wombat')).toBeTruthy();
    });
  });

  describe('on the continue-reading book', () => {
    it.each(LANGUAGES)('should render the %s title', (language, expected) => {
      const view = render(
        <ContinueReadingBook
          story={WOMBAT} width={260} pageIndex={3} totalPages={9}
          language={language} onPress={jest.fn()}
        />
      );

      expect(textContents(view)).toContain(expected);
    });
  });

  describe('on the focused book', () => {
    it.each(LANGUAGES)('should render the %s title', (language, expected) => {
      const view = render(
        <FocusedBook
          story={WOMBAT} language={language} reduceMotion
          onChoose={jest.fn()} onRecordVoice={jest.fn()} onPutBack={jest.fn()}
        />
      );

      expect(textContents(view)).toContain(expected);
    });

    it('should render the localised premise too', () => {
      const view = render(
        <FocusedBook
          story={WOMBAT} language="pl" reduceMotion
          onChoose={jest.fn()} onRecordVoice={jest.fn()} onPutBack={jest.fn()}
        />
      );

      expect(textContents(view)).toContain('Łagodna opowieść na dobranoc.');
    });
  });

  describe('a story with no translations at all', () => {
    it('should still name the book from its base title', () => {
      const plain = { ...WOMBAT, localizedTitle: undefined } as Story;

      const view = render(
        <ShelfBook
          story={plain} width={200} isCentred isBookmarked={false}
          language="ja" onPress={jest.fn()}
        />
      );

      expect(textContents(view)).toContain('Snuggle Little Wombat');
    });
  });
});
