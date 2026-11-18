/**
 * Continue from the home: the book the child left part-way through slides
 * from the Continue pill to the middle of the screen and opens straight into
 * the page they were on. No story card rises to ask how to read it.
 */

import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { StoryTransitionProvider, useStoryTransition } from '@/contexts/story-transition-context';
import { STORY_STRAIGHT_IN, seatTransform } from '@/constants/story-opening';
import { allowTurnForPrompt, applyDefaultOrientation, endTurnForPrompt } from '@/hooks/use-story-orientation';
import { bookPagesGeometry, bookSpineWidth } from '@/components/stories/catalogue/book-frame';
import { COVER_TITLE } from '@/components/stories/catalogue/cover-title';
import type { Story } from '@/types/story';
import * as reanimated from 'react-native-reanimated';

jest.unmock('@/contexts/story-transition-context');

const mockAccessibility = { isTablet: false };
const mockProgress: Record<string, { pageIndex: number; totalPages: number; updatedAt: string; completedCount: number }> = {};

jest.mock('@/hooks/use-accessibility', () => ({
  useAccessibility: () => ({ scaledFontSize: (n: number) => n, scaledButtonSize: (n: number) => n, isTablet: mockAccessibility.isTablet }),
}));
jest.mock('@/hooks/use-reduced-motion', () => ({ useReducedMotion: () => false }));
jest.mock('@/store/app-store', () => ({
  useAppStore: (selector: (state: any) => any) =>
    selector({ toggleFavoriteStory: jest.fn(), favoriteStoryIds: [], storyProgress: mockProgress }),
}));
jest.mock('@/contexts/owl-guide-context', () => ({
  useOwlGuide: () => ({ shouldShowGuide: () => false, activeGuide: null }),
}));
jest.mock('@/components/owl-guide', () => ({ OwlGuide: () => null }));
jest.mock('@/components/owl-guide/use-guide-lift', () => ({ useGuideLift: () => ({ style: {} }) }));
jest.mock('@/hooks/use-parents-only-challenge', () => ({
  useParentsOnlyChallenge: () => ({ showChallenge: jest.fn(), isVisible: false, challenge: null, inputValue: '', setInputValue: jest.fn(), handleSubmit: jest.fn(), handleClose: jest.fn() }),
}));
jest.mock('@/components/ui/parents-only-modal', () => ({ ParentsOnlyModal: () => null }));
jest.mock('@/services/voice-recording-service', () => ({
  voiceRecordingService: { getVoiceOversForStory: jest.fn(() => Promise.resolve([])), deleteVoiceOver: jest.fn() },
}));
jest.mock('@/hooks/use-story-orientation', () => ({
  allowTurnForPrompt: jest.fn(() => Promise.resolve()),
  applyDefaultOrientation: jest.fn(() => Promise.resolve()),
  endTurnForPrompt: jest.fn(),
}));
jest.mock('@/hooks/use-turn-to-landscape', () => ({ waitForWindowToSettle: jest.fn(() => Promise.resolve()) }));
jest.mock('@/components/stories/story-card-sheet', () => {
  const { View: MockView } = require('react-native');
  return { MODE_OPTIONS: [], StoryCardSheet: (props: any) => <MockView testID="story-card-sheet" {...props} /> };
});
jest.mock('@/components/stories/rotate-prompt-overlay', () => {
  const { View: MockView } = require('react-native');
  return { RotatePromptOverlay: (props: any) => <MockView testID="rotate-prompt" {...props} /> };
});

const STORY: Story = {
  id: 'little-fox',
  title: 'Little Fox',
  category: 'friendship',
  isAvailable: true,
  coverImage: 'file://thumbnail.webp',
  pages: [0, 1, 2, 3, 4].map((n) => ({ id: `p${n}`, pageNumber: n, text: '', backgroundImage: n === 0 ? 'file://cover.webp' : `file://page-${n}.webp` })),
};
const FROM = { x: 120, y: 600, width: 90, height: 120 };

let ctx: ReturnType<typeof useStoryTransition>;
const keep = (value: ReturnType<typeof useStoryTransition>) => { ctx = value; };
function Grab() {
  const value = useStoryTransition();
  React.useEffect(() => keep(value));
  return <View />;
}
const byTestId = (tree: ReturnType<typeof render>, id: string) => tree.UNSAFE_root.findAll((n: any) => n.props.testID === id);
const shows = (tree: ReturnType<typeof render>, uri: string) =>
  tree.UNSAFE_root.findAll((n: any) => n.props.source?.uri === uri).length > 0;

describe('openStoryStraight', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    Object.keys(mockProgress).forEach((key) => delete mockProgress[key]);
    mockProgress['little-fox'] = { pageIndex: 3, totalPages: 5, updatedAt: '2026-11-12T09:00:00Z', completedCount: 0 };
  });
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const screen = (width: number, height: number, isTablet: boolean) => {
    mockAccessibility.isTablet = isTablet;
    jest.spyOn(Dimensions, 'get').mockReturnValue({ width, height, scale: 2, fontScale: 1 });
    jest.spyOn(reanimated, 'useSharedValue').mockImplementation(((initial: unknown) => React.useRef({ value: initial }).current) as any);
  };
  const open = (begin?: () => void) => {
    const tree = render(<StoryTransitionProvider><Grab /></StoryTransitionProvider>);
    if (begin) act(() => { ctx.setOnBeginCallback(() => begin); });
    act(() => { ctx.openStoryStraight(STORY, FROM); });
    return tree;
  };

  it('opens no story card: it reads, from the page the child was on', () => {
    screen(834, 1194, true);
    const tree = open();

    expect(byTestId(tree, 'story-card-sheet')).toHaveLength(0);
    expect(ctx.isTransitioning).toBe(true);
    expect(ctx.showModeSelection).toBe(false);
    expect(ctx.selectedMode).toBe('read');
    expect(ctx.selectedStartPage).toEqual({ storyId: 'little-fox', pageIndex: 3 });
  });

  it('starts at page one of a book with no saved place', () => {
    screen(834, 1194, true);
    delete mockProgress['little-fox'];
    open();

    expect(ctx.selectedStartPage).toEqual({ storyId: 'little-fox', pageIndex: 1 });
  });

  it('slides the book from the pill to the middle of the screen, the shelf going dark behind it', () => {
    screen(834, 1194, true);
    open();

    const seat = seatTransform({ width: 834, height: 1194 }, FROM);
    expect(ctx.transitionX.value).toBeCloseTo(seat.moveX);
    expect(ctx.transitionY.value).toBeCloseTo(seat.moveY);
    expect(ctx.transitionScale.value).toBeCloseTo(seat.scale);
    expect(ctx.transitionOpacity.value).toBe(1);
    expect(ctx.overlayOpacity.value).toBe(1);
    expect(STORY_STRAIGHT_IN.glideMs).toBeGreaterThanOrEqual(300);
    expect(STORY_STRAIGHT_IN.glideMs).toBeLessThanOrEqual(800);
  });

  it('keeps the title on the sliding book clear of its spine', () => {
    screen(834, 1194, true);
    const tree = open();

    const [title] = byTestId(tree, 'transition-book-title').filter((node: any) => node.props.children === 'Little Fox');
    const underTest = StyleSheet.flatten(title.props.style);

    expect(underTest.left).toBe(bookSpineWidth(FROM.width) + COVER_TITLE.clearOfSpine);
  });

  it("shapes the sliding book's pages to the book and its corner, at the size it comes to rest", () => {
    screen(834, 1194, true);
    const tree = open();
    const { scale } = seatTransform({ width: 834, height: 1194 }, FROM);
    const expected = bookPagesGeometry(FROM.width * scale, 15);

    const underTest = StyleSheet.flatten(byTestId(tree, 'transition-book-pages-block')[0].props.style);

    expect(underTest.borderRightWidth).toBe(expected.block);
    expect(underTest.top).toBe(expected.rim);
    expect(underTest.borderTopRightRadius).toBe(expected.corner);
    const [frame] = byTestId(tree, 'transition-book-pages').filter((node: any) => node.props.style !== undefined);
    expect(StyleSheet.flatten(frame.props.style).transform).toEqual([{ scale: 1 / scale }]);
  });

  it("rounds the sliding book's spine to the corner the book is seen with, so no cover shows past it", () => {
    screen(834, 1194, true);
    const tree = open();
    const { scale } = seatTransform({ width: 834, height: 1194 }, FROM);

    const underTest = StyleSheet.flatten(byTestId(tree, 'transition-book-spine')[0].props.style);

    expect(underTest.borderTopLeftRadius).toBeCloseTo(15 / scale, 5);
    expect(underTest.borderBottomLeftRadius).toBeCloseTo(15 / scale, 5);
  });

  it('opens on the page the child was on, inside the cover', () => {
    screen(834, 1194, true);
    const tree = open();

    expect(shows(tree, 'file://page-3.webp')).toBe(true);
    expect(shows(tree, 'file://page-1.webp')).toBe(false);
  });

  it('opens straight into the reader on a tablet once the book has arrived', async () => {
    screen(834, 1194, true);
    const begin = jest.fn();
    const tree = open(begin);

    act(() => { jest.advanceTimersByTime(STORY_STRAIGHT_IN.glideMs - 10); });
    expect(begin).not.toHaveBeenCalled();
    await act(async () => { await jest.advanceTimersByTimeAsync(10_000); });

    expect(begin).toHaveBeenCalledTimes(1);
    expect(byTestId(tree, 'rotate-prompt')).toHaveLength(0);
    expect(byTestId(tree, 'story-card-sheet')).toHaveLength(0);
  });

  it('hands the reader the book it slid in, though the app only learns which book once the slide has begun', async () => {
    screen(834, 1194, true);
    const opened = jest.fn();
    function Layout() {
      const value = useStoryTransition();
      const { selectedStory, setOnBeginCallback } = value;
      React.useEffect(() => keep(value));
      React.useEffect(() => {
        setOnBeginCallback(() => () => { if (selectedStory) opened(selectedStory.id); });
        return () => setOnBeginCallback(null);
      }, [selectedStory, setOnBeginCallback]);
      return <View />;
    }
    render(<StoryTransitionProvider><Layout /></StoryTransitionProvider>);

    act(() => { ctx.openStoryStraight(STORY, FROM); });
    await act(async () => { await jest.advanceTimersByTimeAsync(10_000); });

    expect(opened).toHaveBeenCalledTimes(1);
    expect(opened).toHaveBeenCalledWith('little-fox');
  });

  it('asks a phone held upright to turn, and Back from there puts the book away rather than raising a card', () => {
    screen(402, 874, false);
    const begin = jest.fn();
    const tree = open(begin);

    act(() => { jest.advanceTimersByTime(STORY_STRAIGHT_IN.glideMs + 50); });
    const prompt = byTestId(tree, 'rotate-prompt')[0];
    expect(prompt).toBeDefined();

    act(() => { prompt.props.onBack(); });
    act(() => { jest.advanceTimersByTime(10_000); });

    expect(byTestId(tree, 'rotate-prompt')).toHaveLength(0);
    expect(byTestId(tree, 'story-card-sheet')).toHaveLength(0);
    expect(ctx.isTransitioning).toBe(false);
    expect(begin).not.toHaveBeenCalled();
  });

  describe('the freedom to turn while the prompt is up', () => {
    const allow = allowTurnForPrompt as jest.Mock;
    const restore = applyDefaultOrientation as jest.Mock;
    const end = endTurnForPrompt as jest.Mock;
    const toPrompt = () => {
      screen(402, 874, false);
      const tree = open(jest.fn());
      act(() => { jest.advanceTimersByTime(STORY_STRAIGHT_IN.glideMs + 50); });
      return tree;
    };
    beforeEach(() => {
      allow.mockClear();
      restore.mockClear();
      end.mockClear();
    });

    it('frees the phone as the prompt comes up and keeps hold of it while the prompt waits', () => {
      toPrompt();
      act(() => { jest.advanceTimersByTime(20_000); });

      expect(allow).toHaveBeenCalledTimes(1);
      expect(end).not.toHaveBeenCalled();
    });

    it('gives the turn up before the portrait lock is asked back, when the child goes Back', () => {
      const tree = toPrompt();

      act(() => { byTestId(tree, 'rotate-prompt')[0].props.onBack(); });

      expect(end).toHaveBeenCalledTimes(1);
      expect(restore).toHaveBeenCalledTimes(1);
      expect(end.mock.invocationCallOrder[0]).toBeLessThan(restore.mock.invocationCallOrder[0]);
    });

    it.each([
      ['the phone is turned', 'onTurned'],
      ['the book is opened for them', 'onOpenAnyway'],
    ])('gives the turn up once %s, so the reader can have the screen', async (_how, answer) => {
      const tree = toPrompt();

      act(() => { byTestId(tree, 'rotate-prompt')[0].props[answer](); });

      expect(end).toHaveBeenCalledTimes(1);
      await act(async () => { await jest.advanceTimersByTimeAsync(10_000); });
    });

    it('never takes hold of a tablet, which is not asked to turn', () => {
      screen(834, 1194, true);
      open(jest.fn());
      act(() => { jest.advanceTimersByTime(STORY_STRAIGHT_IN.glideMs + 50); });

      expect(allow).not.toHaveBeenCalled();
    });
  });

  it('lets a book opened the ordinary way afterwards go back to its card from the prompt', async () => {
    screen(402, 874, false);
    const tree = open(jest.fn());
    act(() => { jest.advanceTimersByTime(STORY_STRAIGHT_IN.glideMs + 50); });
    act(() => { byTestId(tree, 'rotate-prompt')[0].props.onOpenAnyway(); });
    await act(async () => { await jest.advanceTimersByTimeAsync(10_000); });
    expect(ctx.isTransitioning).toBe(false);

    act(() => { void ctx.startTransition(STORY.id, FROM, STORY, [STORY]); });
    act(() => { byTestId(tree, 'story-card-sheet')[0].props.onChooseMode('read'); });
    await act(async () => { await jest.advanceTimersByTimeAsync(5_000); });
    act(() => { byTestId(tree, 'rotate-prompt')[0].props.onBack(); });
    await act(async () => { await jest.advanceTimersByTimeAsync(1_000); });

    expect(byTestId(tree, 'story-card-sheet').length).toBeGreaterThan(0);
    expect(ctx.isTransitioning).toBe(true);
  });

  it('still raises the story card when a book is opened the ordinary way', () => {
    screen(834, 1194, true);
    const tree = render(<StoryTransitionProvider><Grab /></StoryTransitionProvider>);

    act(() => { void ctx.startTransition(STORY.id, FROM, STORY, [STORY]); });

    expect(byTestId(tree, 'story-card-sheet').length).toBeGreaterThan(0);
  });
});
