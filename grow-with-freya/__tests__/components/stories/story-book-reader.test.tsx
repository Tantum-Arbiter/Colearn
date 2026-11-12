import React from 'react';
import { Image } from 'expo-image';
import type { ReactTestInstance } from 'react-test-renderer';
import { LANGUAGE_PILL } from '@/components/stories/language-panel';
import { SUPPORTED_LANGUAGES } from '@/services/i18n';

beforeAll(() => {
  Object.defineProperty(globalThis, '__DEV__', { value: false, configurable: true });
  Image.prefetch = jest.fn().mockResolvedValue(true);
});
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { StoryBookReader } from '@/components/stories/story-book-reader';
import { Story } from '@/types/story';
import {
  createMockSharedValue,
  testAnimationTiming,
  waitForAnimations,
  resetAnimationMocks,
  mockAnimationFunctions
} from '@/__tests__/utils/animation-test-utils';

// Mock the story transition context
jest.mock('@/contexts/story-transition-context', () => ({
  useStoryTransition: jest.fn(() => ({
    isTransitioning: false,
    transitionStory: null,
    transitionLayout: null,
    completeTransition: jest.fn(),
  })),
}));

jest.mock('@/hooks/use-breath-detector', () => ({
  useBreathDetector: () => ({
    isListening: false,
    useFallback: true,
    micPermissionGranted: false,
    isPreparing: false,
    startListening: jest.fn(),
    stopListening: jest.fn(),
    ensurePlaybackMode: jest.fn(() => Promise.resolve()),
    isInPlaybackMode: jest.fn(() => true),
    setUseFallback: jest.fn(),
  }),
}));

jest.mock('@/store/app-store', () => {
  const state = {
    textSizeScale: 1,
    childAgeInMonths: 36,
    storyProgress: {},
    setTextSizeScale: jest.fn(),
    setStoryProgress: jest.fn(),
    markStoryCompleted: jest.fn(),
    recordChallengeCompleted: jest.fn(),
    grantAchievements: jest.fn(),
    markStoryAsRead: jest.fn(),
    recordReadingSession: jest.fn(),
  };
  return {
    useAppStore: jest.fn((selector?: (value: typeof state) => unknown) => selector ? selector(state) : state),
    BASIC_TIER_INSTRUMENTS: ['flute', 'recorder', 'ocarina'],
  };
});

// Reanimated is mocked globally in jest.setup.js

const mockStory: Story = {
  id: 'test-story',
  title: 'Test Story',
  category: 'adventure',
  coverImage: 'test-cover.jpg',
  isAvailable: true,
  ageRange: '3-6',
  duration: 5,
  tags: ['adventure', 'imagination-games'],
  pages: [
    {
      id: 'cover',
      pageNumber: 0,
      type: 'cover',
      text: 'Test Story',
      backgroundImage: 'test-bg.jpg',
    },
    {
      id: 'page1',
      pageNumber: 1,
      type: 'story',
      text: 'Once upon a time...',
      backgroundImage: 'test-page1.jpg',
    },
    {
      id: 'page2',
      pageNumber: 2,
      type: 'story',
      text: 'The end.',
      backgroundImage: 'test-page2.jpg',
    },
  ],
};

describe('StoryBookReader', () => {
  const mockOnExit = jest.fn();
  const mockOnReadAnother = jest.fn();
  const mockOnBedtimeMusic = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    resetAnimationMocks();
    // Force real timers in CI environments
    const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true' || process.env.NODE_ENV === 'test';
    if (isCI) {
      jest.useRealTimers();
    } else {
      jest.useFakeTimers();
    }
  });

  afterEach(() => {
    const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true' || process.env.NODE_ENV === 'test';
    if (!isCI) {
      jest.useRealTimers();
    }
    jest.clearAllTimers();
  });

  it('renders without crashing', () => {
    const result = render(<StoryBookReader story={mockStory} onExit={mockOnExit} />);
    expect(result).toBeTruthy();
    expect(() => result.toJSON()).not.toThrow();
  });

  it('handles story without pages gracefully', () => {
    const storyWithoutPages: Story = {
      ...mockStory,
      pages: undefined,
    };
    const result = render(<StoryBookReader story={storyWithoutPages} onExit={mockOnExit} />);
    expect(result).toBeTruthy();
    expect(() => result.toJSON()).not.toThrow();
  });

  it('handles empty pages array gracefully', () => {
    const storyWithEmptyPages: Story = {
      ...mockStory,
      pages: [],
    };
    const result = render(<StoryBookReader story={storyWithEmptyPages} onExit={mockOnExit} />);
    expect(result).toBeTruthy();
    expect(() => result.toJSON()).not.toThrow();
  });
});

it('mounts landscape narration along the bottom edge, between the page-turn arrows', () => {
  const { Dimensions, StyleSheet } = require('react-native');
  const { NAV_BUTTON } = require('@/components/stories/narration-layout');
  const dimensions = jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 844, height: 390, scale: 1, fontScale: 1 });
  const underTest = render(<StoryBookReader story={mockStory} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
  const narration = underTest.UNSAFE_root.findByProps({ testID: 'story-narration' });
  const layout = StyleSheet.flatten(narration.props.style);
  expect(layout.position).toBe('absolute');
  expect(layout.left).toBe(layout.right);
  expect(layout.left).toBeGreaterThan(NAV_BUTTON);
  expect(layout.bottom).toBeLessThan(60);
  underTest.unmount();
  dimensions.mockRestore();
});

describe('StoryBookReader: sound words', () => {
  const { Fonts } = require('@/constants/theme');
  const { StyleSheet, Text } = require('react-native');
  const { SOUND_WORD_COLOR, SOUND_WORD_SCALE } = require('@/components/stories/sound-words');
  const noisy: Story = { ...mockStory, pages: mockStory.pages!.map((page, i) => (i === 1 ? { ...page, text: 'The lanterns went *pop*!\n*Whoosh!* went the wind.' } : page)) };
  const texts = (view: ReturnType<typeof render>) => view.UNSAFE_root.findAll((node) => node.props.testID === 'story-narration-box')[0].findAllByType(Text);
  const leaf = (view: ReturnType<typeof render>, word: string) => texts(view).filter((node) => node.props.children === word);
  const storyStyle = (view: ReturnType<typeof render>) => StyleSheet.flatten(leaf(view, 'The')[0].props.style);

  it('prints sound words in the sound-word style, without the marks', () => {
    const view = render(<StoryBookReader story={noisy} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    const printed = texts(view).map((node) => node.props.children).filter((child) => typeof child === 'string').join(' ');

    expect(printed).toContain('lanterns');
    expect(printed).not.toContain('*');
    ['pop', 'Whoosh!'].forEach((word) => {
      const style = StyleSheet.flatten(leaf(view, word)[0].props.style);
      expect(style).toEqual(expect.objectContaining({ fontFamily: Fonts.rounded, fontWeight: '800', color: SOUND_WORD_COLOR }));
      expect(style.fontSize).toBeCloseTo(storyStyle(view).fontSize * SOUND_WORD_SCALE);
    });
    expect(StyleSheet.flatten(leaf(view, 'went')[0].props.style).color).not.toBe(SOUND_WORD_COLOR);
    view.unmount();
  });

  it('keeps the punctuation outside the marks in the story style, beside its sound word', () => {
    const view = render(<StoryBookReader story={noisy} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    const word = texts(view).find((node) => Array.isArray(node.props.children) && node.findAll((inner) => inner.props.children === 'pop').length > 0)!;

    expect(word.props.children).toEqual([expect.anything(), '!']);
    view.unmount();
  });

  it('a sound word tapped is highlighted like any other word', () => {
    const view = render(<StoryBookReader story={noisy} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    const pressable = view.UNSAFE_root.findAll((node) => typeof node.props.onPress === 'function' && node.findAll((inner) => inner.props.children === 'Whoosh!').length > 0)[0];

    act(() => fireEvent.press(pressable));

    expect(StyleSheet.flatten(leaf(view, 'Whoosh!')[0].props.style).color).toBe('#ffffff');
    view.unmount();
  });
});

describe('StoryBookReader: two lines at a time', () => {
  const { FADE_OUT_MS } = require('@/components/stories/text-pages');
  const { SOUND_WORD_SCALE } = require('@/components/stories/sound-words');
  const stones: Story = {
    ...mockStory,
    id: 'stones',
    pages: [
      mockStory.pages![0],
      { ...mockStory.pages![1], text: 'Finn found a line of stepping stones.\nHe tapped his boots on mossy cones.\n*Tap!* *Tippy-tap!* *Plonk!*\nHe did a quiet, happy honk.' },
      { ...mockStory.pages![2], text: 'The end.' },
    ],
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const all = (view: ReturnType<typeof render>, test: (node: ReactTestInstance) => boolean) => view.UNSAFE_root.findAll(test);
  const has = (view: ReturnType<typeof render>, testID: string) => all(view, (node) => node.props.testID === testID).length > 0;
  const press = (view: ReturnType<typeof render>, testID: string) => fireEvent.press(all(view, (node) => node.props.testID === testID && typeof node.props.onPress === 'function')[0]);
  const shown = (node: ReactTestInstance): string[] => (node.props.testID === 'story-text-measure' ? [] : node.children.flatMap((child) => (typeof child === 'string' ? [child] : shown(child))));
  const words = (view: ReturnType<typeof render>) => all(view, (node) => node.props.testID === 'story-narration')[0] ? shown(all(view, (node) => node.props.testID === 'story-narration')[0]).join('') : '';
  const coinIn = (view: ReturnType<typeof render>, testID: string) => all(view, (node) => node.props.testID === testID && typeof node.props.onPress === 'function')[0].findAll((node) => String(node.props.testID).startsWith('reader-coin-') && node.props.testID !== 'reader-coin-slash')[0]?.props.testID;
  const ring = (view: ReturnType<typeof render>) => all(view, (node) => typeof node.props.progress === 'number' && typeof node.props.size === 'number')[0]?.props.progress;
  const fontSizeOf = (view: ReturnType<typeof render>, text: string) => {
    const node = all(view, (each) => each.props.children === text && Array.isArray(each.props.style))[0];
    return Object.assign({}, ...[node.props.style].flat(Infinity).filter(Boolean)).fontSize as number;
  };
  const next = (view: ReturnType<typeof render>) => {
    act(() => {
      press(view, 'right-touch-area');
    });
    act(() => jest.advanceTimersByTime(FADE_OUT_MS));
  };

  it('shows the first two lines only, with no scrolling', () => {
    const view = render(<StoryBookReader story={stones} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);

    expect(words(view)).toContain('Finn found a line of stepping stones.');
    expect(words(view)).toContain('He tapped his boots on mossy cones.');
    expect(words(view)).not.toContain('Tippy-tap!');
    expect(words(view)).not.toContain('happy honk');
    expect(has(view, 'story-text-scroll')).toBe(false);
    view.unmount();
  });

  it('next fades on to the next lines before it turns the page', async () => {
    const view = render(<StoryBookReader story={stones} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);

    next(view);
    expect(words(view)).toContain('Tippy-tap!');
    expect(words(view)).toContain('He did a quiet, happy honk.');
    expect(words(view)).not.toContain('stepping stones');
    next(view);
    await act(async () => { jest.advanceTimersByTime(3000); });

    expect(words(view)).toContain('The end.');
    view.unmount();
  });

  it('a line of sound words shares the box with the next line, its sound words written as sounds', () => {
    const view = render(<StoryBookReader story={stones} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    const plain = fontSizeOf(view, 'Finn');

    next(view);

    expect(words(view).replace(/\s+/g, ' ').trim()).toBe('Tap! Tippy-tap! Plonk!He did a quiet, happy honk.');
    expect(fontSizeOf(view, 'Tap!')).toBeCloseTo(plain * SOUND_WORD_SCALE, 5);
    view.unmount();
  });

  it('the ring on the next button starts empty and moves a step with each press', () => {
    const view = render(<StoryBookReader story={stones} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    const seen = [ring(view)];

    next(view);
    seen.push(ring(view));

    expect(seen).toEqual([0, 1 / 2]);
    view.unmount();
  });

  it('back steps back through the page`s lines before it turns back', () => {
    const view = render(<StoryBookReader story={stones} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    const back = () => all(view, (node) => node.props.testID === 'left-touch-area' && typeof node.props.onPress === 'function')[0].props.disabled;
    expect(back()).toBe(true);
    next(view);
    expect(back()).toBe(false);

    act(() => {
      press(view, 'left-touch-area');
    });
    act(() => jest.advanceTimersByTime(FADE_OUT_MS));

    expect(words(view)).toContain('stepping stones');
    expect(ring(view)).toBe(0);
    view.unmount();
  });

  it('the lines are measured across the box`s full width, whatever line is on show', () => {
    const view = render(<StoryBookReader story={stones} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    let holder = all(view, (node) => node.props.testID === 'story-text-measure')[0].parent;
    while (holder && (holder.props.testID === 'story-text-measure' || !holder.props.style)) holder = holder.parent;
    const style = Object.assign({}, ...[holder?.props.style].flat(Infinity).filter(Boolean));

    expect(style.alignSelf).toBe('stretch');
    view.unmount();
  });

  it('the press that leaves the last lines completes the ring, and a next page that fits in one go has none', async () => {
    const view = render(<StoryBookReader story={stones} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    next(view);

    act(() => {
      press(view, 'right-touch-area');
    });
    expect(ring(view)).toBe(1);
    await act(async () => { jest.advanceTimersByTime(3000); });

    expect(words(view)).toContain('The end.');
    expect(ring(view)).toBeUndefined();
    view.unmount();
  });

  it.each([['Next', 'right-touch-area'], ['Back', 'left-touch-area']])('turning the page with %s fades the picture and the words together, from the same frame to the same end', async (_name, button) => {
    const { PAGE_TEXT_FADE_MS, PAGE_IMAGE_FADE_MS } = require('@/components/stories/story-book-reader');
    const { FADE_IN_MS } = require('@/components/stories/text-pages');
    const reanimated = jest.requireMock('react-native-reanimated');
    const view = render(<StoryBookReader story={stones} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    if (button === 'left-touch-area') {
      next(view);
      act(() => {
        press(view, 'right-touch-area');
      });
      await act(async () => { jest.advanceTimersByTime(3000); });
    } else {
      next(view);
    }
    reanimated.withTiming.mockClear();
    const fades = () => reanimated.withTiming.mock.calls.map((call: [number, { duration?: number }]) => `${call[0]}@${call[1]?.duration}`);

    act(() => {
      press(view, button);
    });
    if (button === 'left-touch-area') {
      act(() => {
        press(view, button);
      });
    }
    act(() => jest.advanceTimersByTime(20));

    expect(PAGE_IMAGE_FADE_MS).toBe(PAGE_TEXT_FADE_MS + FADE_IN_MS);
    expect(fades()).toEqual(expect.arrayContaining([`0@${PAGE_TEXT_FADE_MS}`, `1@${PAGE_IMAGE_FADE_MS}`]));
    view.unmount();
  });

  it('the next page`s words, page number and finish button wait until the old words have faded', async () => {
    const { PAGE_TEXT_FADE_MS } = require('@/components/stories/story-book-reader');
    const view = render(<StoryBookReader story={stones} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    const counter = () => shown(all(view, (node) => node.props.testID === 'page-indicator')[0]).join('');
    const nextIcon = () => coinIn(view, 'right-touch-area');
    next(view);

    act(() => {
      press(view, 'right-touch-area');
    });
    act(() => jest.advanceTimersByTime(PAGE_TEXT_FADE_MS - 50));

    expect(words(view)).toContain('He did a quiet, happy honk.');
    expect(words(view)).not.toContain('The end.');
    expect(counter()).toBe('1 / 2');
    expect(nextIcon()).toBe('reader-coin-next');
    await act(async () => { jest.advanceTimersByTime(3000); });
    expect(words(view)).toContain('The end.');
    expect(counter()).toBe('2 / 2');
    expect(nextIcon()).toBe('reader-coin-done');
    view.unmount();
  });

  it('the press that leaves the last lines turns the page at once: the words start to fade as the ring resets, with no wait for it', async () => {
    const { PAGE_TEXT_FADE_MS } = require('@/components/stories/story-book-reader');
    const reanimated = jest.requireMock('react-native-reanimated');
    const motion = jest.spyOn(require('@/hooks/use-reduced-motion'), 'useReducedMotion').mockReturnValue(false);
    const view = render(<StoryBookReader story={stones} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    next(view);
    reanimated.withTiming.mockImplementation((value: number) => value);
    try {
      expect(words(view)).toContain('He did a quiet, happy honk.');
      expect(words(view)).not.toContain('The end.');
      reanimated.withTiming.mockClear();

      act(() => {
        press(view, 'right-touch-area');
      });
      act(() => jest.advanceTimersByTime(20));

      expect(ring(view)).toBe(1);
      expect(reanimated.withTiming.mock.calls.some((call: [number, { duration?: number }]) => call[0] === 0 && call[1]?.duration === PAGE_TEXT_FADE_MS)).toBe(true);
      await act(async () => { jest.advanceTimersByTime(3000); });
      expect(words(view)).toContain('The end.');
    } finally {
      reanimated.withTiming.mockImplementation((value: number, _config: unknown, callback?: (finished: boolean) => void) => {
        if (typeof callback === 'function') callback(true);
        return value;
      });
      motion.mockRestore();
      view.unmount();
    }
  });

  it('the tick coin appears only on the book`s final lines', () => {
    const ending: Story = { ...stones, pages: [stones.pages![0], { ...stones.pages![2], text: 'They ate the berries.\nThey laughed and played.\nThe sun went down.\nThe end.' }] };
    const view = render(<StoryBookReader story={ending} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    const nextIcon = () => coinIn(view, 'right-touch-area');
    expect(nextIcon()).toBe('reader-coin-next');

    next(view);

    expect(words(view)).toContain('The end.');
    expect(nextIcon()).toBe('reader-coin-done');
    view.unmount();
  });

  it('a page whose text fits in one go has no ring, and Next turns the page at once', async () => {
    const reanimated = jest.requireMock('react-native-reanimated');
    const motion = jest.spyOn(require('@/hooks/use-reduced-motion'), 'useReducedMotion').mockReturnValue(false);
    reanimated.withTiming.mockImplementation((value: number) => value);
    const view = render(<StoryBookReader story={mockStory} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    try {
      expect(words(view)).toContain('Once upon a time...');
      expect(ring(view)).toBeUndefined();

      act(() => {
        press(view, 'right-touch-area');
      });
      await act(async () => { jest.advanceTimersByTime(3000); });

      expect(words(view)).toContain('The end.');
    } finally {
      reanimated.withTiming.mockImplementation((value: number, _config: unknown, callback?: (finished: boolean) => void) => {
        if (typeof callback === 'function') callback(true);
        return value;
      });
      motion.mockRestore();
      view.unmount();
    }
  });

  it('the corner buttons sit at the reader`s edge margin, the text box keeping its own', () => {
    const { StyleSheet } = require('react-native');
    const { readerEdge, narrationLayout } = require('@/components/stories/narration-layout');
    const sideways = { top: 0, left: 59, right: 59, bottom: 21 };
    const insets = jest.spyOn(require('react-native-safe-area-context'), 'useSafeAreaInsets').mockReturnValue(sideways);
    const dimensions = jest.spyOn(require('react-native').Dimensions, 'get').mockReturnValue({ width: 874, height: 402, scale: 1, fontScale: 1 });
    const view = render(<StoryBookReader story={stones} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    try {
      const panel = StyleSheet.flatten(all(view, (node) => node.props.testID === 'story-nav-panel')[0].props.style);
      const narration = StyleSheet.flatten(all(view, (node) => node.props.testID === 'story-narration' && typeof node.props.onLayout === 'function')[0].props.style);

      expect(panel.paddingLeft).toBe(readerEdge(59));
      expect(panel.paddingRight).toBe(readerEdge(59));
      expect(panel.paddingLeft).toBeLessThan(59 + 20);
      expect(narration.left).toBeCloseTo(narrationLayout(874, 402, sideways).left);
      expect(narration.width).toBeCloseTo(narrationLayout(874, 402, sideways).width);
    } finally {
      dimensions.mockRestore();
      insets.mockRestore();
      view.unmount();
    }
  });

  it('the menu panel stays clear of the camera island on a phone on its side', () => {
    const sideways = { top: 0, left: 59, right: 59, bottom: 21 };
    const insets = jest.spyOn(require('react-native-safe-area-context'), 'useSafeAreaInsets').mockReturnValue(sideways);
    const dimensions = jest.spyOn(require('react-native').Dimensions, 'get').mockReturnValue({ width: 874, height: 402, scale: 1, fontScale: 1 });
    const view = render(<StoryBookReader story={stones} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    try {
      const panels = all(view, (node) => typeof node.props.right === 'number' && typeof node.props.top === 'number' && typeof node.props.visible === 'boolean' && typeof node.props.width === 'number');
      expect(panels.length).toBeGreaterThanOrEqual(2);
      for (const panel of panels) expect(panel.props.right).toBeGreaterThanOrEqual(59);
    } finally {
      dimensions.mockRestore();
      insets.mockRestore();
      view.unmount();
    }
  });

  it('closing the book slides the buttons and words away first, and only then starts the book closing', async () => {
    const { CHROME_EXIT_MS } = require('@/components/stories/story-book-reader');
    const transition = jest.requireMock('@/contexts/story-transition-context');
    const startExitAnimation = jest.fn(() => new Promise(() => {}));
    transition.useStoryTransition.mockReturnValue({ isTransitioning: false, transitionStory: null, transitionLayout: null, completeTransition: jest.fn(), startExitAnimation });
    const reanimated = jest.requireMock('react-native-reanimated');
    const motion = jest.spyOn(require('@/hooks/use-reduced-motion'), 'useReducedMotion').mockReturnValue(false);
    const view = render(<StoryBookReader story={stones} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    try {
      reanimated.withTiming.mockClear();
      await act(async () => {
        press(view, 'story-exit-button');
      });

      expect(reanimated.withTiming).toHaveBeenCalledWith(1, expect.objectContaining({ duration: CHROME_EXIT_MS }));
      expect(startExitAnimation).not.toHaveBeenCalled();
      await act(async () => { jest.advanceTimersByTime(CHROME_EXIT_MS); });
      expect(startExitAnimation).toHaveBeenCalledTimes(1);
    } finally {
      motion.mockRestore();
      transition.useStoryTransition.mockReturnValue({ isTransitioning: false, transitionStory: null, transitionLayout: null, completeTransition: jest.fn() });
      view.unmount();
    }
  });

  it('record mode keeps the whole page text, scrollable, with no ring', () => {
    const view = render(<StoryBookReader story={stones} initialMode="record" onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);

    expect(words(view)).toContain('stepping stones');
    expect(words(view)).toContain('happy honk');
    expect(has(view, 'story-text-scroll')).toBe(true);
    expect(ring(view)).toBeUndefined();
    view.unmount();
  });

  it('an older book, drawn without cover fit, puts its words along the bottom edge too', () => {
    const { StyleSheet } = require('react-native');
    const view = render(<StoryBookReader story={stones} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    const layout = StyleSheet.flatten(all(view, (node) => node.props.testID === 'story-narration')[0].props.style);

    expect(stones.displayFit).toBeUndefined();
    expect(layout.position).toBe('absolute');
    expect(layout.top).toBeUndefined();
    expect(layout.bottom).toBeGreaterThanOrEqual(12);
    expect(layout.left).toBe(layout.right);
    view.unmount();
  });

  it('a page turn fades the words out and in at the same pace as the lines within a page', async () => {
    const { PAGE_TEXT_FADE_MS } = require('@/components/stories/story-book-reader');
    const { FADE_IN_MS } = require('@/components/stories/text-pages');
    const reanimated = jest.requireMock('react-native-reanimated');
    const view = render(<StoryBookReader story={stones} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    const timings = () => reanimated.withTiming.mock.calls.map((call: unknown[]) => [call[0], (call[1] as { duration?: number } | undefined)?.duration]);
    next(view);
    await act(async () => { jest.advanceTimersByTime(3000); });
    reanimated.withTiming.mockClear();

    await act(async () => {
      press(view, 'right-touch-area');
    });
    await act(async () => { jest.advanceTimersByTime(150); });
    expect(PAGE_TEXT_FADE_MS).toBe(FADE_OUT_MS);
    expect(timings()).toContainEqual([0, FADE_OUT_MS]);
    reanimated.withTiming.mockClear();
    await act(async () => { jest.advanceTimersByTime(PAGE_TEXT_FADE_MS); });

    expect(timings()).toContainEqual([1, FADE_IN_MS]);
    expect(timings()).not.toContainEqual([1, PAGE_TEXT_FADE_MS]);
    view.unmount();
  });

  it.each([
    ['a phone on its side', 844, 390],
    ['a tablet on its side', 1194, 834],
    ['a tablet upright', 834, 1194],
  ])('on %s the back and next arrows sit level with the middle of the words` box', (_name, width, height) => {
    const { Dimensions, StyleSheet } = require('react-native');
    const dimensions = jest.spyOn(Dimensions, 'get').mockReturnValue({ width, height, scale: 1, fontScale: 1 });
    const view = render(<StoryBookReader story={stones} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    try {
      const narration = all(view, (node) => node.props.testID === 'story-narration' && typeof node.props.onLayout === 'function')[0];
      act(() => fireEvent(narration, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 500, height: 78 } } }));

      const panel = StyleSheet.flatten(all(view, (node) => node.props.testID === 'story-nav-panel')[0].props.style);
      const box = StyleSheet.flatten(narration.props.style);
      expect(box.bottom).toBeGreaterThan(0);
      expect(panel.bottom).toBe(box.bottom);
      expect(panel.height).toBe(78);
      expect(panel.paddingTop ?? 0).toBe(0);
      expect(panel.paddingBottom ?? 0).toBe(0);
      expect(panel.alignItems).toBe('center');
      expect(all(view, (node) => node.props.testID === 'story-nav-panel')[0].findAll((inner) => inner.props.testID === 'story-narration')).toHaveLength(0);
    } finally {
      view.unmount();
      dimensions.mockRestore();
    }
  });

  describe('the cloud behind the words', () => {
    const { StyleSheet } = require('react-native');
    const { cloudInset } = require('@/components/stories/story-cloud');
    const box = (view: ReturnType<typeof render>) => all(view, (node) => node.props.testID === 'story-narration-box')[0];

    it('draws the cloud behind the words in place of the white box, at the box`s own size', () => {
      const view = render(<StoryBookReader story={stones} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
      const style = StyleSheet.flatten(box(view).props.style);

      expect(box(view).findAll((node) => node.props.testID === 'story-cloud')).not.toHaveLength(0);
      expect(style.backgroundColor).toBe('transparent');
      expect(style.borderWidth).toBe(0);
      expect(style.shadowOpacity).toBe(0);
      expect(style.height).toBeGreaterThan(0);
      view.unmount();
    });

    it('keeps the words clear of the cloud`s faces, and measures them at that width', () => {
      const view = render(<StoryBookReader story={stones} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
      const style = StyleSheet.flatten(box(view).props.style);

      expect(style.paddingHorizontal).toBeCloseTo(cloudInset(style.height), 5);
      expect(box(view).findAll((node) => node.props.testID === 'story-text-measure')).not.toHaveLength(0);
      view.unmount();
    });

    const withSong = (story: Story): Story => ({ ...story, pages: story.pages!.map((page, i) => (i === 2 ? { ...page, interactionType: 'music_challenge' } : page)) });

    it.each([
      ['a book tagged music', { ...stones, tags: ['music', 'animals'] }, 'music'],
      ['a book with a song to play on one of its pages', withSong({ ...stones, tags: ['bedtime', 'animals'] }), 'music'],
      ['a story book', { ...stones, tags: ['bedtime', 'animals'] }, 'stories'],
      ['a book with no tags', { ...stones, tags: undefined }, 'stories'],
    ])('%s gets its theme`s cloud, with the words clear of that cloud`s end pictures', (_name, book, theme) => {
      const view = render(<StoryBookReader story={book as Story} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
      const style = StyleSheet.flatten(box(view).props.style);

      expect(box(view).findAll((node) => node.props.testID === 'story-cloud' && node.props.nativeID === `story-cloud-${theme}`)).not.toHaveLength(0);
      expect(style.paddingHorizontal).toBeCloseTo(cloudInset(style.height, theme), 5);
      view.unmount();
    });

    it('record mode keeps the cloud too, with the words clear of faces as large as its tallest box', () => {
      const view = render(<StoryBookReader story={stones} initialMode="record" onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
      const style = StyleSheet.flatten(box(view).props.style);

      expect(box(view).findAll((node) => node.props.testID === 'story-cloud')).not.toHaveLength(0);
      expect(style.paddingHorizontal).toBeCloseTo(cloudInset(style.maxHeight), 5);
      view.unmount();
    });
  });

  it('the reading ring lies on the next coin`s gold rim, the same size and centre as the coin', () => {
    const { StyleSheet } = require('react-native');
    const { COIN_RIM } = require('@/components/child-ui/reader-coin');
    const view = render(<StoryBookReader story={stones} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    const ringNode = all(view, (node) => typeof node.props.progress === 'number' && typeof node.props.size === 'number')[0];
    const coin = StyleSheet.flatten(all(view, (node) => node.props.testID === 'reader-coin-next')[0].props.style);
    const place = StyleSheet.flatten(ringNode.props.style) ?? {};

    expect(ringNode.props.size).toBe(coin.width);
    expect(ringNode.props.stroke).toBeCloseTo(coin.width * COIN_RIM, 5);
    expect(place.top ?? 0).toBe(0);
    expect(place.left ?? 0).toBe(0);
    view.unmount();
  });

  describe('the painted coins', () => {
    const { StyleSheet } = require('react-native');
    const { COIN_DIM_OPACITY } = require('@/components/child-ui/reader-coin');
    const artOpacity = (view: ReturnType<typeof render>, testID: string) => {
      const coin = all(view, (node) => node.props.testID === testID && typeof node.props.onPress === 'function')[0].findAll((node) => String(node.props.testID).startsWith('reader-coin-'))[0].findAll((node) => node.props.source !== undefined && typeof node.type !== 'string')[0];
      return StyleSheet.flatten(coin.props.style).opacity ?? 1;
    };

    it('a long press on the sound coin opens the audio settings in the painted panel', () => {
      const { Dimensions } = require('react-native');
      const dimensions = jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 874, height: 402, scale: 3, fontScale: 1 });
      const view = render(<StoryBookReader story={stones} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
      const sound = all(view, (node) => node.props.testID === 'music-control-button' && typeof node.props.onLongPress === 'function')[0];

      act(() => { sound.props.onLongPress(); });

      expect(all(view, (node) => node.props.testID === 'audio-panel')).not.toHaveLength(0);
      expect(all(view, (node) => node.props.testID === 'audio-panel-art')).not.toHaveLength(0);
      expect(all(view, (node) => node.props.testID === 'audio-panel-button-master' && typeof node.props.onPress === 'function')[0].props.accessibilityLabel).toBe('audioSettings.mute audioSettings.masterVolume');
      view.unmount();
      dimensions.mockRestore();
    });

    it('Done on the audio settings puts them away', () => {
      const { Dimensions } = require('react-native');
      const dimensions = jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 874, height: 402, scale: 3, fontScale: 1 });
      const view = render(<StoryBookReader story={stones} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
      const sound = all(view, (node) => node.props.testID === 'music-control-button' && typeof node.props.onLongPress === 'function')[0];
      act(() => { sound.props.onLongPress(); });

      act(() => { fireEvent.press(all(view, (node) => node.props.testID === 'audio-panel-done' && typeof node.props.onPress === 'function')[0]); });

      expect(all(view, (node) => node.props.testID === 'audio-panel')).toHaveLength(0);
      view.unmount();
      dimensions.mockRestore();
    });

    it('menu, sound, back and next are the painted coins, each the size of the old button', () => {
      const view = render(<StoryBookReader story={stones} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
      const size = (testID: string) => StyleSheet.flatten(all(view, (node) => node.props.testID === testID)[0].props.style);

      expect(coinIn(view, 'story-menu-button')).toBe('reader-coin-menu');
      expect(coinIn(view, 'left-touch-area')).toBe('reader-coin-back');
      expect(coinIn(view, 'right-touch-area')).toBe('reader-coin-next');
      expect(coinIn(view, 'music-control-button')).toBe('reader-coin-sound');
      for (const testID of ['reader-coin-menu', 'reader-coin-back', 'reader-coin-next', 'reader-coin-sound']) {
        expect(size(testID)).toEqual(expect.objectContaining({ width: 50, height: 50 }));
      }
      view.unmount();
    });

    it('the back coin is dimmed while there is nothing to go back to, and clear once there is', () => {
      const view = render(<StoryBookReader story={stones} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
      expect(artOpacity(view, 'left-touch-area')).toBe(COIN_DIM_OPACITY);

      next(view);

      expect(artOpacity(view, 'left-touch-area')).toBe(1);
      expect(artOpacity(view, 'right-touch-area')).toBe(1);
      view.unmount();
    });

    it('the exit coin sits top-left and is dimmed once the book is closing', async () => {
      const onExit = jest.fn();
      const view = render(<StoryBookReader story={stones} onExit={onExit} skipCoverPage skipInitialFadeIn />);
      expect(coinIn(view, 'story-exit-button')).toBe('reader-coin-exit');
      expect(artOpacity(view, 'story-exit-button')).toBe(1);

      await act(async () => {
        press(view, 'story-exit-button');
      });

      expect(artOpacity(view, 'story-exit-button')).toBe(COIN_DIM_OPACITY);
      view.unmount();
    });

    it('in record mode, next is dimmed until the page has a recording', () => {
      const view = render(<StoryBookReader story={stones} initialMode="record" onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);

      expect(artOpacity(view, 'right-touch-area')).toBe(COIN_DIM_OPACITY);
      view.unmount();
    });

    it.each([
      ['read', ['reader.pagePreview', 'reader.fontButtonSize', 'reader.changeLanguage', 'reader.compareLanguage', 'reader.readingTips']],
      ['narrate', ['reader.pagePreview', 'reader.fontButtonSize', 'reader.changeLanguage', 'reader.compareLanguage', 'reader.autoPlayOn', 'reader.narrationTips']],
    ])('in %s mode the menu coin opens the painted menu with that mode`s rows, in order', (mode, labels) => {
      const view = render(<StoryBookReader story={stones} initialMode={mode as 'read' | 'narrate'} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);

      act(() => {
        press(view, 'story-menu-button');
      });

      const menu = all(view, (node) => node.props.testID === 'reader-menu' && typeof node.props.onLayout === 'function')[0];
      const rows = menu.findAll((node) => typeof node.props.onPress === 'function' && node.props.accessibilityRole === 'button' && typeof node.props.accessibilityLabel === 'string');
      const seen = rows.map((node) => node.props.accessibilityLabel).filter((label: string, i: number, list: string[]) => list.indexOf(label) === i);
      expect(seen).toEqual(labels);
      view.unmount();
    });

    it('the size choices sit two to a line, so all four fit inside the panel', () => {
      const view = render(<StoryBookReader story={stones} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
      const sizes = all(view, (node) => node.props.testID === 'reader-menu-size-options')[0];
      const choices = sizes.findAll((node) => String(node.props.testID).startsWith('reader-menu-size-') && typeof node.props.onPress === 'function');
      const unique = choices.filter((node, i) => choices.findIndex((other) => other.props.testID === node.props.testID) === i);

      expect(StyleSheet.flatten(sizes.props.style)).toEqual(expect.objectContaining({ flexDirection: 'row', flexWrap: 'wrap' }));
      expect(unique).toHaveLength(4);
      for (const choice of unique) {
        const style = StyleSheet.flatten(choice.props.style);
        expect(parseFloat(style.flexBasis)).toBeLessThanOrEqual(48);
        expect(style.flexGrow).toBe(1);
      }
      const labels = sizes.findAll((node) => node.props.numberOfLines === 1 && node.props.adjustsFontSizeToFit === true);
      expect(labels.length).toBeGreaterThanOrEqual(4);
      view.unmount();
    });

    it('the menu is built with the book and kept ready; the menu coin shows it and hides it again', () => {
      const view = render(<StoryBookReader story={stones} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
      const menu = () => all(view, (node) => node.props.testID === 'reader-menu' && typeof node.props.onLayout === 'function')[0];
      act(() => fireEvent(menu(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 276, height: 300 } } }));
      const shown = () => menu().props.pointerEvents === 'auto' && StyleSheet.flatten(menu().props.style).opacity === 1;

      expect(menu()).toBeDefined();
      expect(shown()).toBe(false);
      act(() => {
        press(view, 'story-menu-button');
      });
      expect(shown()).toBe(true);
      act(() => {
        press(view, 'story-menu-button');
      });
      expect(shown()).toBe(false);
      view.unmount();
    });

    it('the page pill shows the page the words are on, in the app`s own numbers, and says it in words', () => {
      const view = render(<StoryBookReader story={stones} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
      const pill = all(view, (node) => node.props.testID === 'page-indicator')[0];

      expect(shown(pill).join('')).toBe('1 / 2');
      expect(pill.props.accessibilityLabel).toBe('reader.page (current:1, total:2)');
      expect(all(view, (node) => node.props.testID === 'page-pill-book')).not.toHaveLength(0);
      view.unmount();
    });

    describe('its Compare Languages panel', () => {
      type View = ReturnType<typeof render>;
      const { Dimensions } = require('react-native');
      let dimensions: jest.SpyInstance;
      beforeEach(() => {
        dimensions = jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 874, height: 402, scale: 1, fontScale: 1 });
      });
      afterEach(() => {
        dimensions.mockRestore();
      });
      const open = (view: View) => {
        act(() => {
          press(view, 'story-menu-button');
        });
        const row = all(view, (node) => node.props.accessibilityLabel === 'reader.compareLanguage' && typeof node.props.onPress === 'function')[0];
        act(() => {
          fireEvent.press(row);
        });
      };
      const there = (view: View, id: string) => all(view, (node) => node.props.testID === id).length > 0;
      const tap = (view: View, id: string) =>
        act(() => {
          all(view, (node) => node.props.testID === id && typeof node.props.onPress === 'function')[0].props.onPress();
        });
      const rim = (view: View, code: string) => {
        const found = all(view, (node) => node.props.testID === `language-pill-face-${code}` && node.props.style !== undefined);
        return StyleSheet.flatten(found[found.length - 1].props.style).borderColor;
      };
      const said = (view: View, id: string) => shown(all(view, (node) => node.props.testID === id)[0]).join('');
      const toggle = (view: View) => all(view, (node) => node.props.testID === 'language-panel-toggle' && typeof node.props.onPress === 'function')[0];
      const reader = () => render(<StoryBookReader story={stones} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);

      it('is not on the page until it is asked for', () => {
        const view = reader();

        expect(there(view, 'language-panel')).toBe(false);
        view.unmount();
      });

      it('opens from the menu`s Compare row as the painted panel, with every language the app has', () => {
        const view = reader();

        open(view);

        expect(there(view, 'language-panel')).toBe(true);
        expect(said(view, 'language-panel-title')).toBe('reader.compareLanguage');
        expect(said(view, 'language-panel-hint')).toBe('reader.selectCompareLanguage');
        expect(said(view, 'language-panel-done-label')).toBe('reader.done');
        for (const language of SUPPORTED_LANGUAGES) {
          expect(said(view, `language-pill-flag-${language.code}`)).toBe(language.flag);
          expect(said(view, `language-pill-name-${language.code}`)).toBe(language.nativeName);
        }
        view.unmount();
      });

      it('starts with the app`s own language ticked and every other one plain', () => {
        const view = reader();

        open(view);

        expect(rim(view, 'en')).toBe(LANGUAGE_PILL.comparing.rim);
        for (const language of SUPPORTED_LANGUAGES.filter((each) => each.code !== 'en')) {
          expect(rim(view, language.code)).toBe(LANGUAGE_PILL.plain.rim);
        }
        view.unmount();
      });

      it('a first press on a language reads the book in it, a second puts it beside the app`s language, a third reads in it again', () => {
        const view = reader();
        open(view);

        tap(view, 'language-pill-tr');
        const first = [rim(view, 'tr'), rim(view, 'en')];
        tap(view, 'language-pill-tr');
        const second = [rim(view, 'tr'), rim(view, 'en')];
        tap(view, 'language-pill-tr');
        const third = [rim(view, 'tr'), rim(view, 'en')];

        expect(first).toEqual([LANGUAGE_PILL.reading.rim, LANGUAGE_PILL.comparing.rim]);
        expect(second).toEqual([LANGUAGE_PILL.comparing.rim, LANGUAGE_PILL.reading.rim]);
        expect(third).toEqual([LANGUAGE_PILL.reading.rim, LANGUAGE_PILL.comparing.rim]);
        view.unmount();
      });

      it('a press on another language moves the reading tick to it and leaves the compared one alone', () => {
        const view = reader();
        open(view);
        tap(view, 'language-pill-tr');

        tap(view, 'language-pill-fr');

        expect([rim(view, 'fr'), rim(view, 'tr'), rim(view, 'en')]).toEqual([LANGUAGE_PILL.reading.rim, LANGUAGE_PILL.plain.rim, LANGUAGE_PILL.comparing.rim]);
        view.unmount();
      });

      it('its switch starts off and turns comparing on and off again', () => {
        const view = reader();
        open(view);
        const before = [said(view, 'language-panel-toggle-label'), toggle(view).props.accessibilityState.checked];

        tap(view, 'language-panel-toggle');
        const on = [said(view, 'language-panel-toggle-label'), toggle(view).props.accessibilityState.checked];
        tap(view, 'language-panel-toggle');
        const off = [said(view, 'language-panel-toggle-label'), toggle(view).props.accessibilityState.checked];

        expect(before).toEqual(['common.off', false]);
        expect(on).toEqual(['common.on', true]);
        expect(off).toEqual(['common.off', false]);
        view.unmount();
      });

      it.each([['language-panel-done'], ['language-panel-close'], ['language-panel-backdrop']])('a press on %s puts it away', (id) => {
        const view = reader();
        open(view);

        tap(view, id);

        expect(there(view, 'language-panel')).toBe(false);
        view.unmount();
      });

      it('remembers what was chosen when it is opened again', () => {
        const view = reader();
        open(view);
        tap(view, 'language-pill-tr');
        tap(view, 'language-panel-toggle');
        tap(view, 'language-panel-done');

        open(view);

        expect(rim(view, 'tr')).toBe(LANGUAGE_PILL.reading.rim);
        expect(toggle(view).props.accessibilityState.checked).toBe(true);
        view.unmount();
      });

      it('answers a pick and the switch with a light tap of the phone, and Done with a firmer one', () => {
        const Haptics = require('expo-haptics');
        const view = reader();
        open(view);
        Haptics.impactAsync.mockClear();

        tap(view, 'language-pill-tr');
        tap(view, 'language-panel-toggle');
        tap(view, 'language-panel-done');

        expect(Haptics.impactAsync.mock.calls.map((call: unknown[]) => call[0])).toEqual([
          Haptics.ImpactFeedbackStyle.Light,
          Haptics.ImpactFeedbackStyle.Light,
          Haptics.ImpactFeedbackStyle.Medium,
        ]);
        view.unmount();
      });

      it('names its close coin in the app`s words', () => {
        const view = reader();

        open(view);

        expect(all(view, (node) => node.props.testID === 'language-panel-close' && typeof node.props.onPress === 'function')[0].props.accessibilityLabel).toBe('common.close');
        view.unmount();
      });
    });

    describe('the Android back button with a language panel open', () => {
      type View = ReturnType<typeof render>;
      const { BackHandler, Dimensions, Platform } = require('react-native');
      const realOS = Platform.OS;
      let dimensions: jest.SpyInstance;
      let listen: jest.SpyInstance;
      beforeEach(() => {
        Platform.OS = 'android';
        dimensions = jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 874, height: 402, scale: 1, fontScale: 1 });
        listen = jest.spyOn(BackHandler, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
      });
      afterEach(() => {
        Platform.OS = realOS;
        dimensions.mockRestore();
        listen.mockRestore();
      });
      const back = () => {
        let handled = false;
        act(() => {
          const calls = listen.mock.calls.filter((call) => call[0] === 'hardwareBackPress');
          handled = calls[calls.length - 1][1]();
        });
        return handled;
      };
      const open = (view: View, row: string) => {
        act(() => {
          press(view, 'story-menu-button');
        });
        const found = all(view, (node) => node.props.accessibilityLabel === row && typeof node.props.onPress === 'function')[0];
        act(() => {
          fireEvent.press(found);
        });
      };
      const there = (view: View, id: string) => all(view, (node) => node.props.testID === id).length > 0;

      it.each([['reader.compareLanguage'], ['reader.changeLanguage']])('puts the %s panel away and leaves the book open on its page', (row) => {
        const onExit = jest.fn();
        const view = render(<StoryBookReader story={stones} onExit={onExit} skipCoverPage skipInitialFadeIn />);
        const page = () => shown(all(view, (node) => node.props.testID === 'page-indicator')[0]).join('');
        const before = page();
        open(view, row);

        const handled = back();

        expect(handled).toBe(true);
        expect(there(view, 'language-panel')).toBe(false);
        expect(page()).toBe(before);
        expect(onExit).not.toHaveBeenCalled();
        view.unmount();
      });

      it.each([['reader.compareLanguage'], ['reader.changeLanguage']])('once the %s panel has been put away, goes back to its own work and starts closing the book', async (row) => {
        const view = render(<StoryBookReader story={stones} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
        const closing = () => all(view, (node) => node.props.testID === 'story-exit-button' && typeof node.props.onPress === 'function')[0].props.disabled === true;
        open(view, row);
        act(() => {
          all(view, (node) => node.props.testID === 'language-panel-close' && typeof node.props.onPress === 'function')[0].props.onPress();
        });
        const before = closing();

        await act(async () => {
          const calls = listen.mock.calls.filter((call) => call[0] === 'hardwareBackPress');
          calls[calls.length - 1][1]();
        });

        expect(before).toBe(false);
        expect(closing()).toBe(true);
        view.unmount();
      });
    });

    describe('its Change Language panel', () => {
      type View = ReturnType<typeof render>;
      const { Dimensions } = require('react-native');
      const i18nService = require('@/services/i18n');
      let dimensions: jest.SpyInstance;
      let store: jest.SpyInstance;
      beforeEach(() => {
        dimensions = jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 874, height: 402, scale: 1, fontScale: 1 });
        store = jest.spyOn(i18nService, 'setStoredLanguage').mockResolvedValue(undefined);
      });
      afterEach(() => {
        dimensions.mockRestore();
        store.mockRestore();
      });
      const open = (view: View, row = 'reader.changeLanguage') => {
        act(() => {
          press(view, 'story-menu-button');
        });
        const found = all(view, (node) => node.props.accessibilityLabel === row && typeof node.props.onPress === 'function')[0];
        act(() => {
          fireEvent.press(found);
        });
      };
      const there = (view: View, id: string) => all(view, (node) => node.props.testID === id).length > 0;
      const tap = (view: View, id: string) =>
        act(async () => {
          await all(view, (node) => node.props.testID === id && typeof node.props.onPress === 'function')[0].props.onPress();
        });
      const rim = (view: View, code: string) => {
        const found = all(view, (node) => node.props.testID === `language-pill-face-${code}` && node.props.style !== undefined);
        return StyleSheet.flatten(found[found.length - 1].props.style).borderColor;
      };
      const said = (view: View, id: string) => shown(all(view, (node) => node.props.testID === id)[0]).join('');
      const reader = () => render(<StoryBookReader story={stones} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);

      it('opens from the menu`s Change Language row as the same painted panel, under its own title', () => {
        const view = reader();

        open(view);

        expect(there(view, 'language-panel')).toBe(true);
        expect(said(view, 'language-panel-title')).toBe('reader.changeLanguage');
        expect(said(view, 'language-panel-done-label')).toBe('reader.done');
        for (const language of SUPPORTED_LANGUAGES) {
          expect(said(view, `language-pill-name-${language.code}`)).toBe(language.nativeName);
        }
        view.unmount();
      });

      it('has no on-off switch and no hint about comparing', () => {
        const view = reader();

        open(view);

        expect(there(view, 'language-panel-toggle')).toBe(false);
        expect(there(view, 'language-panel-hint')).toBe(false);
        view.unmount();
      });

      it('ticks only the language the app is in', () => {
        const view = reader();

        open(view);

        expect(rim(view, 'en')).toBe(LANGUAGE_PILL.reading.rim);
        for (const language of SUPPORTED_LANGUAGES.filter((each) => each.code !== 'en')) {
          expect(rim(view, language.code)).toBe(LANGUAGE_PILL.plain.rim);
        }
        view.unmount();
      });

      it.each([['tr'], ['ja'], ['en']])('a press on %s puts the app into that language and puts the panel away', async (code) => {
        const view = reader();
        open(view);

        await tap(view, `language-pill-${code}`);

        expect(store).toHaveBeenCalledTimes(1);
        expect(store).toHaveBeenCalledWith(code);
        expect(there(view, 'language-panel')).toBe(false);
        view.unmount();
      });

      it.each([['language-panel-done'], ['language-panel-close'], ['language-panel-backdrop']])('a press on %s puts it away and leaves the language alone', async (id) => {
        const view = reader();
        open(view);

        await tap(view, id);

        expect(there(view, 'language-panel')).toBe(false);
        expect(store).not.toHaveBeenCalled();
        view.unmount();
      });

      it('answers a pick and Done with a firm tap of the phone', async () => {
        const Haptics = require('expo-haptics');
        const view = reader();
        open(view);
        Haptics.impactAsync.mockClear();

        await tap(view, 'language-pill-tr');
        const afterPick = Haptics.impactAsync.mock.calls.map((call: unknown[]) => call[0]);
        open(view);
        Haptics.impactAsync.mockClear();
        await tap(view, 'language-panel-done');
        const afterDone = Haptics.impactAsync.mock.calls.map((call: unknown[]) => call[0]);

        expect(afterPick).toEqual([Haptics.ImpactFeedbackStyle.Medium]);
        expect(afterDone).toEqual([Haptics.ImpactFeedbackStyle.Medium]);
        view.unmount();
      });

      it('is a different panel from Compare Languages: that one still has its switch and hint', () => {
        const view = reader();

        open(view, 'reader.compareLanguage');

        expect(said(view, 'language-panel-title')).toBe('reader.compareLanguage');
        expect(there(view, 'language-panel-toggle')).toBe(true);
        expect(there(view, 'language-panel-hint')).toBe(true);
        view.unmount();
      });
    });
  });
});

describe('StoryBookReader: a learning challenge page', () => {
  const fox = JSON.parse(JSON.stringify(require('../../../../contract-fixtures/stories/little-fox-meets-a-friend.json')));
  const challengePage = fox.pages[3];
  const storyWithChallenge: Story = {
    ...mockStory,
    id: 'fox-slice',
    pages: [
      mockStory.pages![0],
      { ...challengePage, id: 'fox-4', pageNumber: 1, backgroundImage: 'test-page1.jpg' },
      { ...mockStory.pages![2], text: 'The end.' },
    ],
  };
  const { ENTRANCE_MS, LEAVE_MS } = require('@/components/experience/engines/choose/choose-engine');
  const { CELEBRATION } = require('@/components/experience/experience-shell');
  const { motionDuration } = require('@/constants/child-ui-motion');
  const store = jest.requireMock('@/store/app-store').useAppStore();

  const has = (view: ReturnType<typeof render>, testID: string) => view.UNSAFE_root.findAll((node) => node.props.testID === testID).length > 0;
  const press = (view: ReturnType<typeof render>, testID: string) => {
    const found = view.UNSAFE_root.findAll((node) => node.props.testID === testID && typeof node.props.onPress === 'function');
    fireEvent.press(found[0]);
  };
  type Node = { props?: { testID?: string }; children: (string | Node)[] };
  const words = (node: Node): string[] => (node.props?.testID === 'story-text-measure' ? [] : node.children.flatMap((child) => (typeof child === 'string' ? [child] : words(child))));
  const narration = (view: ReturnType<typeof render>) => view.UNSAFE_root.findAll((node) => node.props.testID === 'story-narration').flatMap((node) => words(node as unknown as Node)).join('');
  const { FADE_OUT_MS } = require('@/components/stories/text-pages');
  const readOn = (view: ReturnType<typeof render>) => {
    act(() => {
      press(view, 'right-touch-area');
    });
    act(() => jest.advanceTimersByTime(FADE_OUT_MS));
  };
  const narrationBox = (view: ReturnType<typeof render>) => view.UNSAFE_root.findAll((node) => node.props.testID === 'story-narration')[0];
  const panel = (view: ReturnType<typeof render>) => view.UNSAFE_root.findAll((node) => node.props.testID === 'learning-challenge-tips')[0];
  const choose = (view: ReturnType<typeof render>, card: string) => {
    readOn(view);
    act(() => press(view, 'right-touch-area'));
    act(() => jest.advanceTimersByTime(ENTRANCE_MS));
    act(() => press(view, card));
    act(() => jest.advanceTimersByTime(LEAVE_MS));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());

  it.each(['read', 'narrate'] as const)('shows no Have a go in %s mode: the next-page button is the way in', (mode) => {
    const view = render(<StoryBookReader story={storyWithChallenge} initialMode={mode} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);

    expect(has(view, 'begin-learning-challenge-button')).toBe(false);
    expect(has(view, 'begin-learning-challenge-button-narrate')).toBe(false);
    expect(has(view, 'right-touch-area')).toBe(true);
    view.unmount();
  });

  it('a page whose family has no engine yet reads as a plain page', async () => {
    const later = { ...storyWithChallenge, pages: storyWithChallenge.pages!.map((page, i) => (i === 1 ? { ...page, learningChallenge: { ...page.learningChallenge!, family: 'trace_draw' as const } } : page)) };

    const view = render(<StoryBookReader story={later} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);

    readOn(view);
    act(() => press(view, 'right-touch-area'));
    await act(async () => { jest.advanceTimersByTime(3000); });

    expect(has(view, 'learning-challenge-host')).toBe(false);
    expect(narration(view)).toContain('The end.');
    view.unmount();
  });

  it('the challenge opens over the page and the text box slides away, out of reach and out of the screen reader', () => {
    const view = render(<StoryBookReader story={storyWithChallenge} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    expect(narrationBox(view).props.pointerEvents).toBe('auto');

    readOn(view);
    act(() => press(view, 'right-touch-area'));

    expect(has(view, 'learning-challenge-host')).toBe(true);
    expect(narrationBox(view).props.pointerEvents).toBe('none');
    expect(narrationBox(view).props.accessibilityElementsHidden).toBe(true);
    expect(narrationBox(view).props.importantForAccessibility).toBe('no-hide-descendants');
    view.unmount();
  });

  it('a choice that teaches records one learning challenge, slides the text box back and puts the tips on its corner', async () => {
    const view = render(<StoryBookReader story={storyWithChallenge} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);

    choose(view, 'choose-card-finn-talks-softly');
    await act(async () => { jest.advanceTimersByTime(3000); });

    expect(store.recordChallengeCompleted).toHaveBeenCalledTimes(1);
    expect(store.recordChallengeCompleted).toHaveBeenCalledWith('learning');
    expect(has(view, 'learning-challenge-host')).toBe(false);
    expect(narration(view)).toContain('"It\'s only me," Finn whispered low');
    expect(narration(view)).not.toContain('She curled into a prickly ball');
    expect(narrationBox(view).props.pointerEvents).toBe('auto');
    expect(narrationBox(view).findAll((node) => node.props.testID === 'learning-tips-badge').length).toBeGreaterThan(0);
    expect(panel(view).props.pointerEvents).toBe('none');
    view.unmount();
  });

  it('on a tablet, the tips are the phone`s panel at the tablet`s scale', async () => {
    const { Dimensions, StyleSheet } = require('react-native');
    const { tipsPanelLayout } = require('@/components/stories/learning-tips');
    const { useSafeAreaInsets } = require('react-native-safe-area-context');
    const dimensions = jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 1210, height: 834, scale: 2, fontScale: 1 });
    const view = render(<StoryBookReader story={storyWithChallenge} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    choose(view, 'choose-card-finn-talks-softly');
    await act(async () => { jest.advanceTimersByTime(3000); });

    act(() => press(view, 'learning-tips-badge'));

    const expected = tipsPanelLayout({ width: 1210, height: 834 }, useSafeAreaInsets(), 50, true);
    const tip = panel(view).findAll((node) => node.props.testID === 'learning-challenge-tip-0')[0];
    expect(panel(view).props.style).toEqual(expect.arrayContaining([expect.objectContaining(expected.frame)]));
    expect(StyleSheet.flatten(tip.props.style).fontSize).toBeCloseTo(16 * expected.scale);
    view.unmount();
    dimensions.mockRestore();
  });

  it('the i on the text box opens the tips and slides the text away; Close brings the text back', async () => {
    const view = render(<StoryBookReader story={storyWithChallenge} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    choose(view, 'choose-card-finn-talks-softly');
    await act(async () => { jest.advanceTimersByTime(3000); });

    act(() => press(view, 'learning-tips-badge'));

    expect(panel(view).props.pointerEvents).toBe('auto');
    expect(words(panel(view)).join(' ')).toContain('Use your quiet voice.');
    expect(narrationBox(view).props.pointerEvents).toBe('none');

    act(() => press(view, 'learning-tips-close'));

    expect(panel(view).props.pointerEvents).toBe('none');
    expect(narrationBox(view).props.pointerEvents).toBe('auto');
    expect(narration(view)).toContain('"It\'s only me," Finn whispered low');
    view.unmount();
  });

  it('while the tips are open nothing but their Close can be pressed', async () => {
    const { StyleSheet } = require('react-native');
    const view = render(<StoryBookReader story={storyWithChallenge} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    choose(view, 'choose-card-finn-talks-softly');
    await act(async () => { jest.advanceTimersByTime(3000); });
    const find = (testID: string) => view.UNSAFE_root.findAll((node) => node.props.testID === testID)[0];
    const shield = () => find('learning-tips-shield');
    const zIndex = (node: ReactTestInstance) => StyleSheet.flatten(node.props.style)?.zIndex ?? 0;
    const stackedBeside = (testID: string) => {
      let node = find(testID);
      while (node.parent && node.parent !== shield().parent) node = node.parent;
      return node;
    };

    expect(shield().props.pointerEvents).toBe('none');

    act(() => press(view, 'learning-tips-badge'));

    expect(shield().props.pointerEvents).toBe('auto');
    expect(shield().props.accessibilityViewIsModal).toBe(true);
    expect(shield().findAll((node) => node.props.testID === 'learning-challenge-tips').length).toBeGreaterThan(0);
    expect(shield().findAll((node) => node.props.testID === 'learning-tips-badge')).toHaveLength(0);
    for (const testID of ['story-exit-button', 'story-menu-button', 'right-touch-area', 'left-touch-area', 'learning-tips-badge']) {
      const beside = stackedBeside(testID);
      expect(beside.parent).toBe(shield().parent);
      expect(zIndex(shield())).toBeGreaterThan(zIndex(beside));
    }

    act(() => press(view, 'learning-tips-close'));

    expect(shield().props.pointerEvents).toBe('none');
    expect(shield().props.accessibilityViewIsModal).toBe(false);
    view.unmount();
  });

  it('with the tips put away the next arrow carries on with the story, and the tips stay with their page', async () => {
    const view = render(<StoryBookReader story={storyWithChallenge} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    choose(view, 'choose-card-finn-talks-softly');
    await act(async () => { jest.advanceTimersByTime(3000); });

    readOn(view);
    act(() => press(view, 'right-touch-area'));
    await act(async () => { jest.advanceTimersByTime(3000); });

    expect(narration(view)).toContain('The end.');
    expect(has(view, 'learning-tips-badge')).toBe(false);
    expect(has(view, 'learning-challenge-tips')).toBe(false);
    view.unmount();
  });

  it('the story text box tells the chosen choice`s own story, in the child`s band', async () => {
    const view = render(<StoryBookReader story={storyWithChallenge} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);

    choose(view, 'choose-card-finn-stays-still');
    await act(async () => { jest.advanceTimersByTime(3000); });

    expect(narration(view)).toContain('Finn stayed so still, he did not shout.');
    expect(narration(view)).not.toContain('She curled into a prickly ball');
    view.unmount();
  });

  it('the page`s own text comes back when the child returns to the page', async () => {
    const view = render(<StoryBookReader story={storyWithChallenge} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    choose(view, 'choose-card-finn-talks-softly');
    await act(async () => { jest.advanceTimersByTime(3000); });

    readOn(view);
    act(() => press(view, 'right-touch-area'));
    await act(async () => { jest.advanceTimersByTime(3000); });
    act(() => press(view, 'left-touch-area'));
    await act(async () => { jest.advanceTimersByTime(3000); });

    expect(narration(view)).toContain('She curled into a prickly ball');
    expect(narration(view)).not.toContain('Finn whispered low');
    view.unmount();
  });

  it('a choice with no tips or story of its own leaves no i, and the box comes back on the page`s last lines, read in full', async () => {
    const noTips: Story = { ...storyWithChallenge, pages: storyWithChallenge.pages!.map((page, i) => (i === 1 ? { ...page, learningChallenge: { ...page.learningChallenge!, items: page.learningChallenge!.items.map(({ outcome: _own, ...item }) => item) } } : page)) };
    const view = render(<StoryBookReader story={noTips} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);

    choose(view, 'choose-card-finn-talks-softly');
    act(() => jest.advanceTimersByTime(motionDuration(CELEBRATION, false)));
    await act(async () => { jest.advanceTimersByTime(3000); });

    expect(has(view, 'learning-challenge-host')).toBe(false);
    expect(has(view, 'learning-tips-badge')).toBe(false);
    expect(narration(view)).toContain('He did not want a game like that.');
    expect(view.UNSAFE_root.findAll((node) => typeof node.props.progress === 'number' && typeof node.props.size === 'number')[0].props.progress).toBe(1);
    view.unmount();
  });
  const ownPages: Story = {
    ...storyWithChallenge,
    pages: storyWithChallenge.pages!.map((page, i) => (i === 1 ? {
      ...page,
      learningChallenge: {
        ...page.learningChallenge!,
        items: page.learningChallenge!.items.map((item) => ({ ...item, outcome: { ...item.outcome, stateAfter: { image: `file:///outcomes/${item.id}.webp`, position: { x: 0, y: 0 }, size: { width: 1, height: 1 } } } })),
      },
    } : page)),
  };
  const outcomePictures = (view: ReturnType<typeof render>) => view.UNSAFE_root.findAll((node) => node.props.testID === 'learning-outcome-picture' && node.props.source !== undefined && node.parent?.props.testID !== 'learning-outcome-picture');

  it('once the game ends, the chosen choice`s own page takes the place of the painting', async () => {
    const { Dimensions, StyleSheet } = require('react-native');
    const view = render(<StoryBookReader story={ownPages} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    expect(outcomePictures(view)).toHaveLength(0);

    choose(view, 'choose-card-finn-talks-softly');
    await act(async () => { jest.advanceTimersByTime(3000); });

    const [picture] = outcomePictures(view);
    expect(picture.props.source).toEqual({ uri: 'file:///outcomes/finn-talks-softly.webp' });
    const { width, height } = Dimensions.get('window');
    expect(StyleSheet.flatten(picture.props.style)).toMatchObject({ position: 'absolute', left: 0, top: 0, width, height });
    view.unmount();
  });

  it('the chosen page stays while the page turns, then the next page has the screen', async () => {
    const view = render(<StoryBookReader story={ownPages} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    choose(view, 'choose-card-finn-stays-still');
    await act(async () => { jest.advanceTimersByTime(3000); });

    readOn(view);
    act(() => press(view, 'right-touch-area'));
    act(() => jest.advanceTimersByTime(50));
    expect(outcomePictures(view).map((node) => node.props.source)).toEqual([{ uri: 'file:///outcomes/finn-stays-still.webp' }]);
    await act(async () => { jest.advanceTimersByTime(3000); });

    expect(narration(view)).toContain('The end.');
    expect(outcomePictures(view)).toHaveLength(0);
    view.unmount();
  });

  it('coming back to the page shows its own painting again, ready for another go', async () => {
    const view = render(<StoryBookReader story={ownPages} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    choose(view, 'choose-card-finn-stays-still');
    await act(async () => { jest.advanceTimersByTime(3000); });
    readOn(view);
    act(() => press(view, 'right-touch-area'));
    await act(async () => { jest.advanceTimersByTime(3000); });

    act(() => press(view, 'left-touch-area'));
    act(() => jest.advanceTimersByTime(50));
    expect(outcomePictures(view)).toHaveLength(0);
    await act(async () => { jest.advanceTimersByTime(3000); });

    expect(narration(view)).toContain('She curled into a prickly ball');
    expect(outcomePictures(view)).toHaveLength(0);
    view.unmount();
  });

  it('going back from the chosen page holds it while the earlier page fades in', async () => {
    const twoBefore: Story = { ...ownPages, pages: [ownPages.pages![0], { ...mockStory.pages![1], id: 'before', pageNumber: 1 }, { ...ownPages.pages![1], pageNumber: 2 }, ownPages.pages![2]] };
    const view = render(<StoryBookReader story={twoBefore} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    for (let presses = 0; presses < 6 && !has(view, 'learning-challenge-host'); presses += 1) {
      act(() => press(view, 'right-touch-area'));
      await act(async () => { jest.advanceTimersByTime(3000); });
    }
    act(() => jest.advanceTimersByTime(ENTRANCE_MS));
    act(() => press(view, 'choose-card-finn-talks-softly'));
    act(() => jest.advanceTimersByTime(LEAVE_MS));
    await act(async () => { jest.advanceTimersByTime(3000); });
    expect(outcomePictures(view)).toHaveLength(1);

    act(() => press(view, 'left-touch-area'));
    act(() => jest.advanceTimersByTime(50));
    expect(outcomePictures(view)).toHaveLength(1);
    await act(async () => { jest.advanceTimersByTime(3000); });

    expect(outcomePictures(view)).toHaveLength(0);
    view.unmount();
  });

  it('a choice with no page of its own leaves the painting as it is', async () => {
    const plain: Story = { ...storyWithChallenge, pages: storyWithChallenge.pages!.map((page, i) => (i === 1 ? { ...page, learningChallenge: { ...page.learningChallenge!, items: page.learningChallenge!.items.map(({ outcome: _own, ...item }) => item) } } : page)) };
    const view = render(<StoryBookReader story={plain} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);

    choose(view, 'choose-card-finn-talks-softly');
    act(() => jest.advanceTimersByTime(motionDuration(CELEBRATION, false)));
    await act(async () => { jest.advanceTimersByTime(3000); });

    expect(has(view, 'learning-challenge-host')).toBe(false);
    expect(outcomePictures(view)).toHaveLength(0);
    view.unmount();
  });

  const pickUntilDone = (view: ReturnType<typeof render>, card: string) => {
    readOn(view);
    act(() => press(view, 'right-touch-area'));
    act(() => jest.advanceTimersByTime(ENTRANCE_MS));
    act(() => press(view, `choose-card-${card}`));
    act(() => jest.advanceTimersByTime(LEAVE_MS - 1));
  };
  const endGame = () => act(() => jest.advanceTimersByTime(1));
  const firstFrame = () => act(() => jest.advanceTimersByTime(20));
  const paintings = (view: ReturnType<typeof render>) => view.UNSAFE_root.findAll((node) => node.props.source?.uri === 'test-page1.jpg' && node.parent?.props.source?.uri !== 'test-page1.jpg');
  const nextDisabled = (view: ReturnType<typeof render>) => view.UNSAFE_root.findAll((node) => node.props.testID === 'right-touch-area' && typeof node.props.onPress === 'function')[0].props.disabled;

  it.each(['finn-says-sorry', 'finn-talks-softly', 'finn-stays-still'])('picking %s turns to its own page the way Next turns a page: the picture and the words fade together', (card) => {
    const { PAGE_TEXT_FADE_MS, PAGE_IMAGE_FADE_MS } = require('@/components/stories/story-book-reader');
    const reanimated = jest.requireMock('react-native-reanimated');
    const view = render(<StoryBookReader story={ownPages} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    pickUntilDone(view, card);
    reanimated.withTiming.mockClear();

    endGame();
    firstFrame();

    const fades = reanimated.withTiming.mock.calls.map((call: [number, { duration?: number }]) => `${call[0]}@${call[1]?.duration}`);
    expect(fades).toEqual(expect.arrayContaining([`0@${PAGE_TEXT_FADE_MS}`, `1@${PAGE_IMAGE_FADE_MS}`]));
    view.unmount();
  });

  it('while the chosen page fades in, the painting lies beneath it and the page`s own words fade out before the choice`s words come', () => {
    const { PAGE_TEXT_FADE_MS, PAGE_IMAGE_FADE_MS } = require('@/components/stories/story-book-reader');
    const view = render(<StoryBookReader story={ownPages} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    pickUntilDone(view, 'finn-talks-softly');
    expect(paintings(view)).toHaveLength(1);

    endGame();

    expect(outcomePictures(view)).toHaveLength(0);
    expect(narration(view)).toContain('He did not want a game like that.');

    firstFrame();

    expect(outcomePictures(view).map((node) => node.props.source)).toEqual([{ uri: 'file:///outcomes/finn-talks-softly.webp' }]);
    expect(paintings(view)).toHaveLength(2);
    expect(narration(view)).toContain('He did not want a game like that.');
    expect(narration(view)).not.toContain('Finn whispered low');

    act(() => jest.advanceTimersByTime(PAGE_TEXT_FADE_MS));

    expect(narration(view)).toContain('Finn whispered low');
    expect(paintings(view)).toHaveLength(2);

    act(() => jest.advanceTimersByTime(PAGE_IMAGE_FADE_MS - PAGE_TEXT_FADE_MS));

    expect(paintings(view)).toHaveLength(1);
    expect(outcomePictures(view)).toHaveLength(1);
    view.unmount();
  });

  it('Next waits while the chosen page turns in, as it does for any page turn', () => {
    const { PAGE_IMAGE_FADE_MS } = require('@/components/stories/story-book-reader');
    const view = render(<StoryBookReader story={ownPages} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    pickUntilDone(view, 'finn-stays-still');

    endGame();
    firstFrame();
    expect(nextDisabled(view)).toBe(true);

    act(() => jest.advanceTimersByTime(PAGE_IMAGE_FADE_MS));
    expect(nextDisabled(view)).toBe(false);
    view.unmount();
  });

  it('a choice with words but no page of its own still fades its words in', () => {
    const { PAGE_TEXT_FADE_MS } = require('@/components/stories/story-book-reader');
    const wordsOnly: Story = { ...storyWithChallenge, pages: storyWithChallenge.pages!.map((page, i) => (i === 1 ? { ...page, learningChallenge: { ...page.learningChallenge!, items: page.learningChallenge!.items.map((item) => ({ ...item, outcome: { ...item.outcome, stateAfter: undefined } })) } } : page)) };
    const view = render(<StoryBookReader story={wordsOnly} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    pickUntilDone(view, 'finn-talks-softly');
    endGame();
    firstFrame();

    expect(narration(view)).toContain('He did not want a game like that.');
    expect(outcomePictures(view)).toHaveLength(0);

    act(() => jest.advanceTimersByTime(PAGE_TEXT_FADE_MS));

    expect(narration(view)).toContain('Finn whispered low');
    view.unmount();
  });

  it('a choice with a page but no words of its own still turns to its page, keeping the page`s words', () => {
    const { PAGE_IMAGE_FADE_MS } = require('@/components/stories/story-book-reader');
    const pageOnly: Story = { ...ownPages, pages: ownPages.pages!.map((page, i) => (i === 1 ? { ...page, learningChallenge: { ...page.learningChallenge!, items: page.learningChallenge!.items.map((item) => ({ ...item, outcome: { ...item.outcome, storyText: undefined } })) } } : page)) };
    const view = render(<StoryBookReader story={pageOnly} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    pickUntilDone(view, 'finn-talks-softly');
    endGame();
    firstFrame();

    expect(paintings(view)).toHaveLength(2);
    expect(outcomePictures(view).map((node) => node.props.source)).toEqual([{ uri: 'file:///outcomes/finn-talks-softly.webp' }]);

    act(() => jest.advanceTimersByTime(PAGE_IMAGE_FADE_MS));

    expect(paintings(view)).toHaveLength(1);
    expect(narration(view)).toContain('He did not want a game like that.');
    view.unmount();
  });

  it('on a later page the turn starts from that page, holding its own words', async () => {
    const twoBefore: Story = { ...ownPages, pages: [ownPages.pages![0], { ...mockStory.pages![1], id: 'before', pageNumber: 1, text: 'A page before the game.' }, { ...ownPages.pages![1], pageNumber: 2 }, ownPages.pages![2]] };
    const view = render(<StoryBookReader story={twoBefore} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    for (let presses = 0; presses < 6 && !has(view, 'learning-challenge-host'); presses += 1) {
      act(() => press(view, 'right-touch-area'));
      await act(async () => { jest.advanceTimersByTime(3000); });
    }
    act(() => jest.advanceTimersByTime(ENTRANCE_MS));
    act(() => press(view, 'choose-card-finn-talks-softly'));
    act(() => jest.advanceTimersByTime(LEAVE_MS));
    firstFrame();

    expect(narration(view)).toContain('He did not want a game like that.');
    expect(narration(view)).not.toContain('A page before the game.');
    expect(outcomePictures(view)).toHaveLength(1);
    view.unmount();
  });

  it('a choice with neither a page nor words of its own turns nothing', () => {
    const { PAGE_TEXT_FADE_MS } = require('@/components/stories/story-book-reader');
    const reanimated = jest.requireMock('react-native-reanimated');
    const plain: Story = { ...storyWithChallenge, pages: storyWithChallenge.pages!.map((page, i) => (i === 1 ? { ...page, learningChallenge: { ...page.learningChallenge!, items: page.learningChallenge!.items.map(({ outcome: _own, ...item }) => item) } } : page)) };
    const view = render(<StoryBookReader story={plain} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    pickUntilDone(view, 'finn-talks-softly');
    act(() => jest.advanceTimersByTime(motionDuration(CELEBRATION, false) - LEAVE_MS));
    reanimated.withTiming.mockClear();

    act(() => jest.advanceTimersByTime(LEAVE_MS));
    firstFrame();

    expect(has(view, 'learning-challenge-host')).toBe(false);
    expect(reanimated.withTiming.mock.calls.some((call: [number, { duration?: number }]) => call[0] === 0 && call[1]?.duration === PAGE_TEXT_FADE_MS)).toBe(false);
    expect(paintings(view)).toHaveLength(1);
    expect(nextDisabled(view)).toBe(false);
    view.unmount();
  });

  it.each([['Next', 'right-touch-area'], ['Back', 'left-touch-area']])('leaving the chosen page with %s fades it out like any page', async (_name, button) => {
    const { PAGE_TEXT_FADE_MS, PAGE_IMAGE_FADE_MS } = require('@/components/stories/story-book-reader');
    const reanimated = jest.requireMock('react-native-reanimated');
    const twoBefore: Story = { ...ownPages, pages: [ownPages.pages![0], { ...mockStory.pages![1], id: 'before', pageNumber: 1 }, { ...ownPages.pages![1], pageNumber: 2 }, ownPages.pages![2]] };
    const view = render(<StoryBookReader story={twoBefore} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    for (let presses = 0; presses < 6 && !has(view, 'learning-challenge-host'); presses += 1) {
      act(() => press(view, 'right-touch-area'));
      await act(async () => { jest.advanceTimersByTime(3000); });
    }
    act(() => jest.advanceTimersByTime(ENTRANCE_MS));
    act(() => press(view, 'choose-card-finn-talks-softly'));
    act(() => jest.advanceTimersByTime(LEAVE_MS));
    await act(async () => { jest.advanceTimersByTime(3000); });
    if (button === 'right-touch-area') readOn(view);
    reanimated.withTiming.mockClear();

    act(() => press(view, button));
    act(() => jest.advanceTimersByTime(21));

    const fades = reanimated.withTiming.mock.calls.map((call: [number, { duration?: number }]) => `${call[0]}@${call[1]?.duration}`);
    expect(fades).toEqual(expect.arrayContaining([`0@${PAGE_TEXT_FADE_MS}`, `1@${PAGE_IMAGE_FADE_MS}`]));
    expect(outcomePictures(view)).toHaveLength(1);
    view.unmount();
  });

  it('the next-page button opens the challenge once the page has been read, instead of turning the page', async () => {
    const view = render(<StoryBookReader story={storyWithChallenge} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);

    readOn(view);
    expect(has(view, 'learning-challenge-host')).toBe(false);
    act(() => press(view, 'right-touch-area'));
    await act(async () => { jest.advanceTimersByTime(3000); });

    expect(has(view, 'learning-challenge-host')).toBe(true);
    expect(narration(view)).not.toContain('The end.');
    view.unmount();
  });

  it('once the challenge is played, the next-page button turns the page', async () => {
    const view = render(<StoryBookReader story={storyWithChallenge} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    choose(view, 'choose-card-finn-talks-softly');
    await act(async () => { jest.advanceTimersByTime(3000); });
    expect(narration(view)).toContain('Finn whispered low');

    readOn(view);
    act(() => press(view, 'right-touch-area'));
    await act(async () => { jest.advanceTimersByTime(3000); });

    expect(has(view, 'learning-challenge-host')).toBe(false);
    expect(narration(view)).toContain('The end.');
    view.unmount();
  });

  it('coming back to a played challenge page, back still goes back and next offers the game again', async () => {
    const view = render(<StoryBookReader story={storyWithChallenge} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    choose(view, 'choose-card-finn-talks-softly');
    await act(async () => { jest.advanceTimersByTime(3000); });
    readOn(view);
    act(() => press(view, 'right-touch-area'));
    await act(async () => { jest.advanceTimersByTime(3000); });
    expect(narration(view)).toContain('The end.');

    act(() => press(view, 'left-touch-area'));
    await act(async () => { jest.advanceTimersByTime(3000); });
    expect(narration(view)).toContain('She curled into a prickly ball');
    expect(has(view, 'learning-challenge-host')).toBe(false);

    readOn(view);
    act(() => press(view, 'right-touch-area'));
    await act(async () => { jest.advanceTimersByTime(3000); });

    expect(has(view, 'learning-challenge-host')).toBe(true);
    view.unmount();
  });

  it('in record mode, where there is no Have a go, the next-page button turns the page as before', async () => {
    const recorded = { id: 'v', storyId: 'fox-slice', name: 'Mum', createdAt: 0, pageRecordings: { 1: { uri: 'file:///p1.m4a', duration: 3 } } } as never;
    const view = render(<StoryBookReader story={storyWithChallenge} initialMode="record" initialVoiceOver={recorded} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    expect(has(view, 'begin-learning-challenge-button')).toBe(false);

    act(() => press(view, 'right-touch-area'));
    await act(async () => { jest.advanceTimersByTime(3000); });

    expect(has(view, 'learning-challenge-host')).toBe(false);
    expect(narration(view)).toContain('The end.');
    view.unmount();
  });
});

describe('StoryBookReader: a book drawn for cover fit', () => {
  const { coverFrame } = require('@/components/stories/page-frame');
  const fox = JSON.parse(JSON.stringify(require('../../../../contract-fixtures/stories/little-fox-meets-a-friend.json')));
  const flat = (node: { props: Record<string, unknown> }) => Object.assign({}, ...([node.props.style] as unknown[]).flat(Infinity).filter(Boolean));
  const pageImage = (view: ReturnType<typeof render>, uri: string) => view.UNSAFE_root.findAll((node) => node.props.contentFit !== undefined && node.props.source?.uri === uri)[0];
  const { FADE_OUT_MS } = require('@/components/stories/text-pages');
  const openChallenge = (view: ReturnType<typeof render>) => {
    const host = () => view.UNSAFE_root.findAll((node) => node.props.challenge && node.props.screen)[0];
    for (let presses = 0; presses < 8 && !host(); presses += 1) {
      const begin = view.UNSAFE_root.findAll((node) => node.props.testID === 'right-touch-area' && typeof node.props.onPress === 'function')[0];
      act(() => { void begin.props.onPress(); });
      act(() => jest.advanceTimersByTime(FADE_OUT_MS));
    }
    return host();
  };
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  describe('on a tablet', () => {
    const { Dimensions, StyleSheet, Text } = require('react-native');
    const { captionScale } = require('@/components/stories/narration-layout');
    const bands = (view: ReturnType<typeof render>) => view.UNSAFE_root.findAll((node) => node.props.testID === 'story-page-scene-bands');
    const picture = (view: ReturnType<typeof render>) => view.UNSAFE_root.findAll((node) => node.props.contentFit === 'cover' && node.props.blurRadius === undefined && node.props.source?.uri === 'test-page1.jpg')[0];
    const wordSize = (view: ReturnType<typeof render>) => StyleSheet.flatten(view.UNSAFE_root.findAll((node) => node.props.testID === 'story-narration-box')[0].findAllByType(Text).find((node: ReactTestInstance) => StyleSheet.flatten(node.props.style)?.fontSize)!.props.style).fontSize;

    function onScreen(width: number, height: number, story: Story = { ...mockStory, displayFit: 'cover' }) {
      const dimensions = jest.spyOn(Dimensions, 'get').mockReturnValue({ width, height, scale: 2, fontScale: 1 });
      const view = render(<StoryBookReader story={story} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
      return { view, done: () => { view.unmount(); dimensions.mockRestore(); } };
    }

    it('upright, shows the whole scene across the middle of the screen', () => {
      const { view, done } = onScreen(834, 1210);

      const frame = flat(picture(view));
      expect(frame.left).toBeCloseTo(0);
      expect(frame.width).toBeCloseTo(834);
      expect(frame.height).toBeCloseTo(834 * 0.75);
      expect(frame.top).toBeCloseTo((1210 - 834 * 0.75) / 2);
      done();
    });

    it('upright, fills the space above and below the scene with the same picture, softened', () => {
      const { view, done } = onScreen(834, 1210);

      const [band] = bands(view);
      expect(band.props.source).toEqual({ uri: 'test-page1.jpg' });
      expect(band.props.blurRadius).toBeGreaterThan(0);
      expect(band.props.contentFit).toBe('cover');
      done();
    });

    it('on its side, still fills the screen, with nothing behind the picture', () => {
      const { view, done } = onScreen(1210, 834);

      expect(bands(view)).toHaveLength(0);
      expect(flat(picture(view)).width).toBeCloseTo(1210);
      done();
    });

    it.each([
      ['on its side', 1210, 834],
      ['upright', 834, 1210],
    ])('%s, the words` box is the phone`s box scaled for the tablet', (_name, width, height) => {
      const { narrationLayout } = require('@/components/stories/narration-layout');
      const { useSafeAreaInsets } = require('react-native-safe-area-context');
      const { view, done } = onScreen(width, height);

      const box = StyleSheet.flatten(view.UNSAFE_root.findAll((node) => node.props.testID === 'story-narration' && typeof node.props.onLayout === 'function')[0].props.style);
      expect(box.width).toBeCloseTo(narrationLayout(width, height, useSafeAreaInsets(), true).width);
      done();
    });

    it('upright, gives an older book the same softened bands, behind its own picture', () => {
      const { view, done } = onScreen(834, 1210, mockStory);

      const [band] = bands(view);
      expect(band.props.source).toEqual({ uri: 'test-page1.jpg' });
      expect(band.props.blurRadius).toBeGreaterThan(0);
      done();
    });

    it('upright, leaves an older book`s own picture contained and zoomed as before', () => {
      const { view, done } = onScreen(834, 1210, mockStory);

      const own = view.UNSAFE_root.findAll((node) => node.props.contentFit === 'contain' && node.props.source?.uri === 'test-page1.jpg')[0];
      expect(flat(own).transform).toEqual([{ scale: 1.35 }]);
      done();
    });

    it('on its side, gives an older book no bands', () => {
      const { view, done } = onScreen(1210, 834, mockStory);

      expect(bands(view)).toHaveLength(0);
      done();
    });

    it.each([
      ['on its side', 1210, 834],
      ['upright', 834, 1210],
    ])('%s, draws the words at the phone`s size scaled with the box', (_name, width, height) => {
      const { view, done } = onScreen(width, height);

      expect(wordSize(view)).toBeCloseTo(16 * captionScale(width, height, { left: 0, right: 0, bottom: 0 }, true), 1);
      done();
    });
  });

  it('fills the screen from the centre with no extra zoom, where an older book is zoomed and contained', () => {
    const covered = render(<StoryBookReader story={{ ...mockStory, displayFit: 'cover' }} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    const older = render(<StoryBookReader story={mockStory} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);

    expect(pageImage(covered, 'test-page1.jpg').props.contentFit).toBe('cover');
    expect(flat(pageImage(covered, 'test-page1.jpg')).transform).toBeUndefined();
    expect(pageImage(older, 'test-page1.jpg').props.contentFit).toBe('contain');
    expect(flat(pageImage(older, 'test-page1.jpg')).transform).toEqual([{ scale: 1.8 }]);
    covered.unmount();
    older.unmount();
  });

  it('puts the narration along the bottom edge, and an older book does the same', () => {
    const covered = render(<StoryBookReader story={{ ...mockStory, displayFit: 'cover' }} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    const older = render(<StoryBookReader story={mockStory} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    const narrationBox = (view: ReturnType<typeof render>) => flat(view.UNSAFE_root.findAll((node) => node.props.testID === 'story-narration')[0]);

    expect(narrationBox(covered).justifyContent).toBe('flex-end');
    expect(narrationBox(covered).left).toBe(narrationBox(covered).right);
    expect(narrationBox(covered).bottom).toBeGreaterThanOrEqual(12);
    expect(narrationBox(older)).toEqual(narrationBox(covered));
    covered.unmount();
    older.unmount();
  });

  it('while reading, the box is two lines tall in every book; in record mode the bottom box hugs its words under a cap', () => {
    const covered = render(<StoryBookReader story={{ ...mockStory, displayFit: 'cover' }} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    const older = render(<StoryBookReader story={mockStory} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    const recording = render(<StoryBookReader story={{ ...mockStory, displayFit: 'cover' }} initialMode="record" onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    const box = (view: ReturnType<typeof render>) => flat(view.UNSAFE_root.findAll((node) => node.props.testID === 'story-narration-box')[0]);

    expect(box(covered).height).toBeGreaterThan(0);
    expect(box(covered).maxHeight).toBe(box(covered).height);
    expect(box(older).height).toBe(box(covered).height);
    expect(box(recording).height).toBeUndefined();
    expect(box(recording).maxHeight).toBeGreaterThan(0);
    expect(box(recording).maxHeight).toBeLessThanOrEqual(Math.max(812, 375) * 0.34);
    const lineHeight = (box(covered).height - 30) / 2;
    expect(box(recording).maxHeight).toBeCloseTo(lineHeight * 4 + 30, 5);
    covered.unmount();
    older.unmount();
    recording.unmount();
  });

  it('hands the challenge host the art`s frame, so cards and patches land on the painting', () => {
    const story: Story = { ...mockStory, displayFit: 'cover', pages: [mockStory.pages![0], { ...fox.pages[3], id: 'fox-4', pageNumber: 1, backgroundImage: 'test-page1.jpg' }, mockStory.pages![2]] };
    const view = render(<StoryBookReader story={story} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    const host = openChallenge(view);
    expect(host.props.art).toEqual(coverFrame(host.props.screen));
    view.unmount();
  });

  describe('once a choice with its own page is made', () => {
    const { ENTRANCE_MS, LEAVE_MS } = require('@/components/experience/engines/choose/choose-engine');
    const { Dimensions, StyleSheet } = require('react-native');
    const chosenPage = { image: 'file:///outcomes/finn-talks-softly.webp', position: { x: 0, y: 0 }, size: { width: 1, height: 1 } };
    const page = {
      ...fox.pages[3],
      id: 'fox-4',
      pageNumber: 1,
      backgroundImage: 'test-page1.jpg',
      learningChallenge: { ...fox.pages[3].learningChallenge, items: fox.pages[3].learningChallenge.items.map((item: { id: string; outcome?: object }) => ({ ...item, outcome: { ...item.outcome, stateAfter: { ...chosenPage, image: `file:///outcomes/${item.id}.webp` } } })) },
    };
    const story: Story = { ...mockStory, displayFit: 'cover', pages: [mockStory.pages![0], page, mockStory.pages![2]] };
    const play = (view: ReturnType<typeof render>) => {
      const host = openChallenge(view);
      const art = host.props.art;
      act(() => jest.advanceTimersByTime(ENTRANCE_MS));
      act(() => { fireEvent.press(view.UNSAFE_root.findAll((node) => node.props.testID === 'choose-card-finn-talks-softly' && typeof node.props.onPress === 'function')[0]); });
      act(() => jest.advanceTimersByTime(LEAVE_MS));
      act(() => jest.advanceTimersByTime(3000));
      return art;
    };
    const chosen = (view: ReturnType<typeof render>) => view.UNSAFE_root.findAll((node) => node.props.testID === 'learning-outcome-picture' && node.props.source !== undefined && node.parent?.props.testID !== 'learning-outcome-picture');

    it('lies exactly where the painting lies', () => {
      const view = render(<StoryBookReader story={story} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);

      const art = play(view);

      expect(chosen(view)).toHaveLength(1);
      expect(chosen(view)[0].props.contentFit).toBe('contain');
      expect(StyleSheet.flatten(chosen(view)[0].props.style)).toMatchObject({ left: art.left, top: art.top, width: art.width, height: art.height });
      view.unmount();
    });

    it('a choice whose after picture is a patch lays it on its own part of the painting, and leaves the bands alone', () => {
      const { patchFrame } = require('@/components/stories/page-frame');
      const patch = { image: 'file:///outcomes/patch.webp', position: { x: 0.25, y: 0.5 }, size: { width: 0.5, height: 0.25 } };
      const patched: Story = { ...story, pages: story.pages!.map((each, i) => (i === 1 ? { ...each, learningChallenge: { ...each.learningChallenge!, items: each.learningChallenge!.items.map((item) => ({ ...item, outcome: { ...item.outcome, stateAfter: patch } })) } } : each)) };
      const dimensions = jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 834, height: 1210, scale: 2, fontScale: 1 });
      const view = render(<StoryBookReader story={patched} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);

      const art = play(view);

      expect(StyleSheet.flatten(chosen(view)[0].props.style)).toMatchObject(patchFrame(patch, art));
      const sources = view.UNSAFE_root.findAll((node) => node.props.testID === 'story-page-scene-bands').map((node) => node.props.source?.uri);
      expect(sources).not.toContain('file:///outcomes/patch.webp');
      expect(sources).toContain('test-page1.jpg');
      view.unmount();
      dimensions.mockRestore();
    });

    it('on an upright tablet, softens the chosen page into the bands above and below too', () => {
      const dimensions = jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 834, height: 1210, scale: 2, fontScale: 1 });
      const view = render(<StoryBookReader story={story} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);

      play(view);

      const sources = view.UNSAFE_root.findAll((node) => node.props.testID === 'story-page-scene-bands').map((node) => node.props.source?.uri);
      expect(sources).toContain('file:///outcomes/finn-talks-softly.webp');
      view.unmount();
      dimensions.mockRestore();
    });
  });

  it('on an upright tablet, shows the challenge on the whole scene but sizes its cards from the cover fit, as before', () => {
    const { Dimensions } = require('react-native');
    const { containFrame, focusFrame, challengeFocus } = require('@/components/stories/page-frame');
    const dimensions = jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 834, height: 1210, scale: 2, fontScale: 1 });
    const page = { ...fox.pages[3], id: 'fox-4', pageNumber: 1, backgroundImage: 'test-page1.jpg' };
    const story: Story = { ...mockStory, displayFit: 'cover', pages: [mockStory.pages![0], page, mockStory.pages![2]] };
    const view = render(<StoryBookReader story={story} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);

    const host = openChallenge(view);

    expect(host.props.art).toEqual(containFrame(host.props.screen));
    expect(host.props.trayArt).toEqual(focusFrame(host.props.screen, challengeFocus(page.learningChallenge)));
    view.unmount();
    dimensions.mockRestore();
  });

  it('on a tablet on its side, the challenge needs no separate frame for its cards', () => {
    const { Dimensions } = require('react-native');
    const dimensions = jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 1210, height: 834, scale: 2, fontScale: 1 });
    const story: Story = { ...mockStory, displayFit: 'cover', pages: [mockStory.pages![0], { ...fox.pages[3], id: 'fox-4', pageNumber: 1, backgroundImage: 'test-page1.jpg' }, mockStory.pages![2]] };
    const view = render(<StoryBookReader story={story} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);

    const host = openChallenge(view);

    expect(host.props.trayArt).toBeUndefined();
    view.unmount();
    dimensions.mockRestore();
  });

  it('a scene challenge near the bottom of the art moves the page and the host together, so its spots stay on screen', () => {
    const { challengeFocus, focusFrame, FOCUS_MARGIN } = require('@/components/stories/page-frame');
    const { Dimensions } = require('react-native');
    const dimensions = jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 874, height: 402, scale: 1, fontScale: 1 });
    const lantern = JSON.parse(JSON.stringify(require('../../../../contract-fixtures/stories/the-lantern-bridge.json')));
    const scene = lantern.pages.find((page: { pageNumber: number }) => page.pageNumber === 4);
    const story: Story = { ...mockStory, displayFit: 'cover', pages: [mockStory.pages![0], { ...scene, id: 'lantern-4', pageNumber: 1, backgroundImage: 'test-page1.jpg' }, mockStory.pages![2]] };
    const view = render(<StoryBookReader story={story} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    const host = openChallenge(view);
    const focus = challengeFocus(scene.learningChallenge);
    const art = host.props.art;
    expect(art).toEqual(focusFrame(host.props.screen, focus));
    const { width, height } = host.props.screen;
    expect(art).not.toEqual(coverFrame(host.props.screen));
    expect(art.left + focus.left * art.width).toBeGreaterThanOrEqual(FOCUS_MARGIN - 1e-6);
    expect(art.left + focus.right * art.width).toBeLessThanOrEqual(width - FOCUS_MARGIN + 1e-6);
    expect(art.top + focus.top * art.height).toBeGreaterThanOrEqual(FOCUS_MARGIN - 1e-6);
    expect(art.top + focus.bottom * art.height).toBeLessThanOrEqual(height - FOCUS_MARGIN + 1e-6);
    expect(flat(pageImage(view, 'test-page1.jpg'))).toEqual(expect.objectContaining({ position: 'absolute', left: art.left, top: art.top, width: art.width, height: art.height }));
    view.unmount();
    dimensions.mockRestore();
  });

  it('an older book gives the host no art frame', () => {
    const story: Story = { ...mockStory, pages: [mockStory.pages![0], { ...fox.pages[3], id: 'fox-4', pageNumber: 1, backgroundImage: 'test-page1.jpg' }, mockStory.pages![2]] };
    const view = render(<StoryBookReader story={story} onExit={jest.fn()} skipCoverPage skipInitialFadeIn />);
    const host = openChallenge(view);
    expect(host.props.art).toBeUndefined();
    view.unmount();
  });
});
