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
import { ContinueLearningCard } from '@/components/home/continue-learning-card';
import { StreakChip } from '@/components/home/streak-chip';
import { WeeklyReadingChip } from '@/components/home/weekly-reading-chip';
import { AchievementTallyChip } from '@/components/home/achievement-tally-chip';
import { Ionicons } from '@expo/vector-icons';
import {
  JOURNEY_CARD,
  JOURNEY_CARD_TINTS,
  JOURNEY_CARD_TYPE,
  MILESTONE_STARS,
  STAT_TEXT_SHADE,
  journeyArtWidth,
  journeyWordsWidth,
} from '@/constants/home-journey';
import { HERO_CARD } from '@/constants/home-sky';
import { PLAN_STEP_ICON } from '@/constants/learning-plan';
import { CHECKPOINT_TINTS } from '@/components/island/plan-checkpoint';
import type { PlanStepKind } from '@/types/learning-plan';

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
    (Ionicons as unknown as { glyphMap: Record<string, number> }).glyphMap = { rocket: 1, star: 3, 'arrow-forward': 5 };
  });

  const NEXT = { title: 'Moon Explorer', current: 3, required: 5, unit: 'stories' as const };
  const INNER_HEIGHT = JOURNEY_CARD.height - HERO_CARD.strokeWidth * 2;
  const flat = (node: { props: Record<string, unknown> }) => StyleSheet.flatten(node.props.style as object) as Record<string, number | string>;

  const renderCard = (props: Partial<React.ComponentProps<typeof AchievementCard>> = {}) =>
    render(
      <AchievementCard next={NEXT} width={370} animated={false} celebrate={false} onPress={jest.fn()} {...props} />
    );

  it('should name the journey, the next badge to reach and how far off it is', () => {
    const view = renderCard();

    const underTest = textContents(view);

    expect(underTest).toContain('home.milestone.eyebrow');
    expect(underTest).toContain('Moon Explorer');
    expect(underTest).toContain('home.milestone.remaining.stories (count:2)');
  });

  /**
   * The card was redrawn to the operator's mock (2026-10-03): the island of the
   * learning journey fills its right half, and the badge medallion that stood
   * on its left is gone.
   */
  it('should show the island on its right, from the top of the card to its foot, and no badge medallion', () => {
    const view = renderCard({ next: { ...NEXT, artwork: { uri: 'file:///badge.webp' } } });

    const island = byTestId(view, 'journey-island')[0];

    expect(island.props.source).toBeDefined();
    expect(flat(island)).toEqual(expect.objectContaining({ position: 'absolute', right: 0, top: 0, height: INNER_HEIGHT }));
    expect(flat(island).width).toBeCloseTo(journeyArtWidth(INNER_HEIGHT), 6);
    expect(byTestId(view, 'next-medallion')).toHaveLength(0);
    expect(byTestId(view, 'next-medallion-artwork')).toHaveLength(0);
  });

  it('should be the journey`s deep blue rather than the other cards` violet, with the island under the card`s glass', () => {
    const view = renderCard();
    const names = ['achievement-card-surface', 'journey-island', 'achievement-card-sheen'];

    const order = view.UNSAFE_root
      .findAll((node: RenderedNode) => names.includes(node.props.testID as string))
      .map((node: RenderedNode) => node.props.testID)
      .filter((name: unknown, index: number, all: unknown[]) => all.indexOf(name) === index);

    expect(byTestId(view, 'achievement-card-surface')[0].props.colors).toEqual([...JOURNEY_CARD.fill]);
    expect(order).toEqual(names);
  });

  it.each(['left', 'top', 'bottom'])('should glow blue just inside its %s edge, under the island', (edge) => {
    const view = renderCard();
    const names = [`journey-edge-glow-${edge}`, 'journey-island'];

    const glow = byTestId(view, `journey-edge-glow-${edge}`)[0];
    const order = view.UNSAFE_root
      .findAll((node: RenderedNode) => names.includes(node.props.testID as string))
      .map((node: RenderedNode) => node.props.testID)
      .filter((name: unknown, index: number, all: unknown[]) => all.indexOf(name) === index);

    expect(glow.props.colors).toEqual([...JOURNEY_CARD.edgeGlow]);
    expect(glow.props.locations).toEqual([...JOURNEY_CARD.edgeGlowStops]);
    expect(flat(glow)[edge]).toBe(0);
    expect(flat(glow)[edge === 'left' ? 'width' : 'height']).toBe(JOURNEY_CARD.edgeGlowReach);
    expect(order).toEqual(names);
  });

  it('should catch the light in its top left corner, as the mock`s card does', () => {
    const view = renderCard();

    const gleam = byTestId(view, 'journey-corner-gleam')[0];

    expect(gleam.props.colors).toEqual([...JOURNEY_CARD.cornerGleam]);
    expect(flat(gleam)).toEqual(
      expect.objectContaining({ left: 0, top: 0, width: JOURNEY_CARD.cornerGleamSize, height: JOURNEY_CARD.cornerGleamSize })
    );
    expect(gleam.props.start).toEqual({ x: 0, y: 0 });
    expect((gleam.props.end as { x: number; y: number }).x).toBe((gleam.props.end as { x: number; y: number }).y);
  });

  it('should stand as tall as the mock`s card whatever it has to say', () => {
    const next = renderCard();
    const allDone = renderCard({ next: undefined });

    expect(flat(byTestId(next, 'journey-words')[0]).height).toBe(INNER_HEIGHT);
    expect(flat(byTestId(allDone, 'journey-words')[0]).height).toBe(INNER_HEIGHT);
  });

  it('should keep the title and the line under it off the island, and let the eyebrow run on over its sky', () => {
    const view = renderCard();
    const styleOfText = (words: string) =>
      StyleSheet.flatten(view.UNSAFE_queryAllByType(Text).find((node) => node.props.children === words)?.props.style) as Record<string, number>;

    expect(styleOfText('Moon Explorer').maxWidth).toBeCloseTo(journeyWordsWidth(370, INNER_HEIGHT, JOURNEY_CARD.wordsReach), 6);
    expect(styleOfText('home.milestone.remaining.stories (count:2)').maxWidth).toBeCloseTo(journeyWordsWidth(370, INNER_HEIGHT, JOURNEY_CARD.wordsReach), 6);
    expect(styleOfText('home.milestone.eyebrow').maxWidth).toBeCloseTo(journeyWordsWidth(370, INNER_HEIGHT, JOURNEY_CARD.eyebrowReach), 6);
  });

  it('should let a long badge name or a long line shrink to fit rather than run over the island', () => {
    const view = renderCard();
    const propsOfText = (words: string) => view.UNSAFE_queryAllByType(Text).find((node) => node.props.children === words)?.props;

    ['Moon Explorer', 'home.milestone.remaining.stories (count:2)'].forEach((words) => {
      expect(propsOfText(words)?.numberOfLines).toBe(1);
      expect(propsOfText(words)?.adjustsFontSizeToFit).toBe(true);
      expect(propsOfText(words)?.minimumFontScale).toBeLessThan(1);
    });
  });

  // with a line height fixed on it, iOS shrank the line under the title to a third of its size
  // the moment it was a hair too wide, and far below the smallest scale it was allowed
  it('should fix no line height on words that may shrink, which iOS then shrinks to almost nothing', () => {
    const view = renderCard();
    const styleOfText = (words: string) =>
      StyleSheet.flatten(view.UNSAFE_queryAllByType(Text).find((node) => node.props.children === words)?.props.style) as Record<string, number>;

    ['home.milestone.eyebrow', 'Moon Explorer', 'home.milestone.remaining.stories (count:2)'].forEach((words) => {
      expect(styleOfText(words).fontSize).toBeGreaterThan(0);
      expect(styleOfText(words).lineHeight).toBeUndefined();
    });
  });

  it('should set its words as in the mock: a small spaced eyebrow, a heavy white title, a lighter line under it', () => {
    const view = renderCard();
    const styleOfText = (words: string) =>
      StyleSheet.flatten(view.UNSAFE_queryAllByType(Text).find((node) => node.props.children === words)?.props.style) as Record<string, number | string>;

    expect(styleOfText('home.milestone.eyebrow')).toEqual(
      expect.objectContaining({ fontSize: JOURNEY_CARD_TYPE.eyebrow, letterSpacing: JOURNEY_CARD_TYPE.eyebrowTracking, color: JOURNEY_CARD_TINTS.eyebrow, textTransform: 'uppercase' })
    );
    expect(styleOfText('Moon Explorer')).toEqual(expect.objectContaining({ fontSize: JOURNEY_CARD_TYPE.title, fontWeight: '800', color: JOURNEY_CARD_TINTS.title }));
    expect(styleOfText('home.milestone.remaining.stories (count:2)')).toEqual(
      expect.objectContaining({ fontSize: JOURNEY_CARD_TYPE.body, color: JOURNEY_CARD_TINTS.body })
    );
    expect(JOURNEY_CARD_TYPE.title).toBeGreaterThan(JOURNEY_CARD_TYPE.body);
  });

  /**
   * The row of stars became the journey itself (operator's second mock,
   * 2026-10-03): one token for each step of the island week, wearing what its
   * checkpoint wears on the island.
   */
  describe('the journey`s steps', () => {
    const STEPS = [
      { id: 'day-1', day: 1, kind: 'story', state: 'done' },
      { id: 'day-2', day: 2, kind: 'words', state: 'open' },
      { id: 'day-3', day: 3, kind: 'numbers', state: 'locked' },
      { id: 'day-4', day: 4, kind: 'feelings', state: 'locked' },
      { id: 'day-5', day: 5, kind: 'music', state: 'locked' },
    ] as const;
    const iconOf = (view: RenderResult, day: number) => byTestId(view, `journey-step-${day}-icon`)[0].props;
    const faceOf = (view: RenderResult, day: number) => byTestId(view, `journey-step-${day}-face`)[0].props;

    it('should show a token for every step it is handed, in order, and no stars', () => {
      const view = renderCard({ steps: STEPS });

      const shown = view.UNSAFE_root
        .findAll((node: RenderedNode) => /^journey-step-\d+$/.test(String(node.props.testID)))
        .map((node: RenderedNode) => node.props.testID)
        .filter((name: unknown, index: number, all: unknown[]) => all.indexOf(name) === index);

      expect(shown).toEqual(['journey-step-1', 'journey-step-2', 'journey-step-3', 'journey-step-4', 'journey-step-5']);
      expect(byTestId(view, 'milestone-stars')).toHaveLength(0);
      expect(byTestId(view, 'milestone-star-lit')).toHaveLength(0);
      expect(byTestId(view, 'milestone-star-unlit')).toHaveLength(0);
    });

    it('should show the step in hand in gold and larger than the rest, with the picture of what it is', () => {
      const view = renderCard({ steps: STEPS });

      expect(faceOf(view, 2).colors).toEqual([...JOURNEY_CARD_TINTS.stepOpen]);
      expect(iconOf(view, 2).name).toBe(PLAN_STEP_ICON.words);
      expect(iconOf(view, 2).color).toBe(JOURNEY_CARD_TINTS.stepOpenInk);
      expect(flat(byTestId(view, 'journey-step-2')[0])).toEqual(
        expect.objectContaining({ width: JOURNEY_CARD.step.open, height: JOURNEY_CARD.step.open })
      );
    });

    it.each(Object.entries(PLAN_STEP_ICON))('should show an open %s step with the island`s own picture for it', (kind, icon) => {
      const view = renderCard({ steps: [{ id: 'day-1', day: 1, kind: kind as PlanStepKind, state: 'open' }] });

      expect(iconOf(view, 1).name).toBe(icon);
    });

    it('should show an open book for a story, as the mock does', () => {
      expect(PLAN_STEP_ICON.story).toBe('book');
    });

    it.each(['locked', 'tomorrow'] as const)('should show a %s step behind a padlock, in the card`s blue', (state) => {
      const view = renderCard({ steps: [{ id: 'day-3', day: 3, kind: 'numbers', state }] });

      expect(faceOf(view, 3).colors).toEqual([...JOURNEY_CARD_TINTS.stepLocked]);
      expect(iconOf(view, 3).name).toBe('lock-closed');
      expect(iconOf(view, 3).color).toBe(JOURNEY_CARD_TINTS.stepLockedInk);
      expect(flat(byTestId(view, 'journey-step-3')[0])).toEqual(
        expect.objectContaining({ width: JOURNEY_CARD.step.rest, height: JOURNEY_CARD.step.rest })
      );
    });

    it('should show a finished step ticked, in the island`s own colours for one', () => {
      const view = renderCard({ steps: STEPS });

      expect(faceOf(view, 1).colors).toEqual([CHECKPOINT_TINTS.done[0], CHECKPOINT_TINTS.done[2]]);
      expect(faceOf(view, 1).colors).toEqual([...JOURNEY_CARD_TINTS.stepDone]);
      expect(iconOf(view, 1).name).toBe('checkmark');
      expect(flat(byTestId(view, 'journey-step-1')[0]).width).toBe(JOURNEY_CARD.step.rest);
    });

    it('should glow gold round the step in hand and round no other', () => {
      const view = renderCard({ steps: STEPS });

      expect(byTestId(view, 'journey-step-2-glow').length).toBeGreaterThan(0);
      [1, 3, 4, 5].forEach((day) => expect(byTestId(view, `journey-step-${day}-glow`)).toHaveLength(0));
    });

    it('should join each step to the next with a dash, a dot and a dash, and leave nothing trailing after the last', () => {
      const view = renderCard({ steps: STEPS });

      [1, 2, 3, 4].forEach((day) => {
        const link = byTestId(view, `journey-step-link-${day}`)[0];
        const widths = link
          .findAll((node: RenderedNode) => node.props.testID === 'journey-step-dash' && node.type === View)
          .map((node: { props: Record<string, unknown> }) => flat(node).width);

        expect(flat(link).width).toBe(JOURNEY_CARD.step.gap);
        expect(widths).toEqual([...JOURNEY_CARD.step.link]);
      });
      expect(byTestId(view, 'journey-step-link-5')).toHaveLength(0);
    });

    it('should colour the line gold where the child has been or is, and blue where the way is still locked', () => {
      const view = renderCard({ steps: STEPS });
      const dotColour = (day: number) =>
        flat(byTestId(view, `journey-step-link-${day}`)[0].findAll((node: RenderedNode) => node.props.testID === 'journey-step-dash')[0])
          .backgroundColor;

      expect(dotColour(1)).toBe(JOURNEY_CARD_TINTS.stepLinkWarm);
      expect(dotColour(2)).toBe(JOURNEY_CARD_TINTS.stepLinkWarm);
      expect(dotColour(3)).toBe(JOURNEY_CARD_TINTS.stepLinkCool);
      expect(dotColour(4)).toBe(JOURNEY_CARD_TINTS.stepLinkCool);
    });

    it('should keep the row on one line, each token centred on it', () => {
      const view = renderCard({ steps: STEPS });

      expect(flat(byTestId(view, 'journey-steps')[0])).toEqual(
        expect.objectContaining({ flexDirection: 'row', alignItems: 'center', height: JOURNEY_CARD.step.open })
      );
    });

    it.each([
      ['no steps at all', undefined],
      ['an empty journey', []],
    ])('should leave the row out, and still stand as tall, with %s', (_, steps) => {
      const view = renderCard({ steps });

      expect(byTestId(view, 'journey-steps')).toHaveLength(0);
      expect(flat(byTestId(view, 'journey-words')[0]).height).toBe(INNER_HEIGHT);
    });

    it('should show the steps even when every badge is won, for the journey goes on', () => {
      const view = renderCard({ next: undefined, steps: STEPS });

      expect(byTestId(view, 'journey-steps').length).toBeGreaterThan(0);
      expect(textContents(view)).toContain('home.milestone.allDone');
    });

    it('should hide the tokens from a screen reader, which hears the card as one button', () => {
      const view = renderCard({ steps: STEPS });

      const row = byTestId(view, 'journey-steps')[0];

      expect(row.props.accessibilityElementsHidden).toBe(true);
      expect(row.props.importantForAccessibility).toBe('no-hide-descendants');
    });
  });

  /**
   * On a phone narrower than the mock's the card is the same card, smaller:
   * were only its width to shrink, the step tokens and the line under the
   * title would run on into the island.
   */
  describe('on a card narrower than the mock`s', () => {
    const WIDTH = 333;
    const SCALE = WIDTH / 370;
    const INNER = JOURNEY_CARD.height * SCALE - HERO_CARD.strokeWidth * 2;
    const STEPS = [
      { id: 'day-1', day: 1, kind: 'story', state: 'open' },
      { id: 'day-2', day: 2, kind: 'words', state: 'locked' },
    ] as const;
    const renderNarrow = (props: Partial<React.ComponentProps<typeof AchievementCard>> = {}) => renderCard({ width: WIDTH, steps: STEPS, ...props });
    const styleOfText = (view: RenderResult, words: string) =>
      StyleSheet.flatten(view.UNSAFE_queryAllByType(Text).find((node) => node.props.children === words)?.props.style) as Record<string, number>;

    it('should stand shorter, with its island smaller to match', () => {
      const view = renderNarrow();

      expect(flat(byTestId(view, 'journey-words')[0]).height).toBeCloseTo(INNER, 6);
      expect(flat(byTestId(view, 'journey-island')[0]).height).toBeCloseTo(INNER, 6);
      expect(flat(byTestId(view, 'journey-island')[0]).width).toBeCloseTo(journeyArtWidth(INNER), 6);
    });

    it('should set its words smaller, and as far in from the edge in proportion', () => {
      const view = renderNarrow();

      expect(styleOfText(view, 'home.milestone.eyebrow').fontSize).toBeCloseTo(JOURNEY_CARD_TYPE.eyebrow * SCALE, 6);
      expect(styleOfText(view, 'home.milestone.eyebrow').letterSpacing).toBeCloseTo(JOURNEY_CARD_TYPE.eyebrowTracking * SCALE, 6);
      expect(styleOfText(view, 'Moon Explorer').fontSize).toBeCloseTo(JOURNEY_CARD_TYPE.title * SCALE, 6);
      expect(styleOfText(view, 'home.milestone.remaining.stories (count:2)').fontSize).toBeCloseTo(JOURNEY_CARD_TYPE.body * SCALE, 6);
      expect(styleOfText(view, 'Moon Explorer').maxWidth).toBeCloseTo(journeyWordsWidth(WIDTH, INNER, JOURNEY_CARD.wordsReach, SCALE), 6);
      expect(flat(byTestId(view, 'journey-words')[0]).paddingLeft).toBeCloseTo(JOURNEY_CARD.inset * SCALE, 6);
      expect(flat(byTestId(view, 'journey-words')[0]).paddingTop).toBeCloseTo(JOURNEY_CARD.top * SCALE, 6);
    });

    it('should keep the small nudges that line its words up with the mock`s, in proportion', () => {
      const view = renderNarrow();
      const eyebrow = styleOfText(view, 'home.milestone.eyebrow');
      const title = styleOfText(view, 'Moon Explorer');
      const body = styleOfText(view, 'home.milestone.remaining.stories (count:2)');

      expect(eyebrow.marginLeft).toBeCloseTo(JOURNEY_CARD_TYPE.eyebrowIndent * SCALE, 6);
      expect(eyebrow.maxWidth).toBeCloseTo(journeyWordsWidth(WIDTH, INNER, JOURNEY_CARD.eyebrowReach, SCALE), 6);
      expect(title.letterSpacing).toBeCloseTo(JOURNEY_CARD_TYPE.titleTracking * SCALE, 6);
      expect(title.marginTop).toBeCloseTo(JOURNEY_CARD_TYPE.titleTop * SCALE, 6);
      expect(title.marginLeft).toBeCloseTo(JOURNEY_CARD_TYPE.titleIndent * SCALE, 6);
      expect(body.marginTop).toBeCloseTo(JOURNEY_CARD_TYPE.bodyTop * SCALE, 6);
      expect(body.marginLeft).toBeCloseTo(JOURNEY_CARD_TYPE.bodyIndent * SCALE, 6);
      expect(body.maxWidth).toBeCloseTo(journeyWordsWidth(WIDTH, INNER, JOURNEY_CARD.wordsReach, SCALE), 6);
    });

    it('should set the line that says every badge is won as it sets the line under a title, on two lines if it needs them', () => {
      const view = renderNarrow({ next: undefined });
      const line = byTestId(view, 'achievement-all-done')[0];

      expect(line.props.numberOfLines).toBe(2);
      expect(line.props.adjustsFontSizeToFit).toBe(true);
      expect(flat(line)).toEqual(expect.objectContaining({ color: JOURNEY_CARD_TINTS.body, fontWeight: '500' }));
      expect(flat(line).fontSize).toBeCloseTo(JOURNEY_CARD_TYPE.body * SCALE, 6);
      expect(flat(line).marginTop).toBeCloseTo(JOURNEY_CARD_TYPE.titleTop * SCALE, 6);
      expect(flat(line).marginLeft).toBeCloseTo(JOURNEY_CARD_TYPE.bodyIndent * SCALE, 6);
      expect(flat(line).maxWidth).toBeCloseTo(journeyWordsWidth(WIDTH, INNER, JOURNEY_CARD.wordsReach, SCALE), 6);
      expect(flat(line).lineHeight).toBeUndefined();
    });

    it('should draw its step tokens and the lines between them smaller', () => {
      const view = renderNarrow();

      expect(flat(byTestId(view, 'journey-step-1')[0]).width).toBeCloseTo(JOURNEY_CARD.step.open * SCALE, 6);
      expect(flat(byTestId(view, 'journey-step-2')[0]).width).toBeCloseTo(JOURNEY_CARD.step.rest * SCALE, 6);
      expect(flat(byTestId(view, 'journey-step-link-1')[0]).width).toBeCloseTo(JOURNEY_CARD.step.gap * SCALE, 6);
      expect(flat(byTestId(view, 'journey-steps')[0]).height).toBeCloseTo(JOURNEY_CARD.step.open * SCALE, 6);
      expect(flat(byTestId(view, 'journey-steps')[0]).marginTop).toBeCloseTo(JOURNEY_CARD.step.top * SCALE, 6);
      expect(byTestId(view, 'journey-step-1-icon')[0].props.size).toBeCloseTo(JOURNEY_CARD.step.openIcon * SCALE, 6);
      expect(byTestId(view, 'journey-step-2-icon')[0].props.size).toBeCloseTo(JOURNEY_CARD.step.restIcon * SCALE, 6);

      const dashes = byTestId(view, 'journey-step-link-1')[0]
        .findAll((node: RenderedNode) => node.props.testID === 'journey-step-dash' && node.type === View)
        .map((node: { props: Record<string, unknown> }) => flat(node));
      dashes.forEach((dash: Record<string, number | string>, index: number) => {
        expect(dash.width).toBeCloseTo(JOURNEY_CARD.step.link[index] * SCALE, 6);
        expect(dash.height).toBeCloseTo(JOURNEY_CARD.step.linkThick * SCALE, 6);
      });
      expect(flat(byTestId(view, 'journey-step-1-glow')[0]).shadowRadius).toBeCloseTo(JOURNEY_CARD.step.glow.radius * SCALE, 6);
      expect(flat(byTestId(view, 'journey-step-1-glow')[0]).shadowOpacity).toBe(JOURNEY_CARD.step.glow.opacity);
    });

    it('should draw its gold button smaller, in the same place in proportion', () => {
      const view = renderNarrow();

      const button = byTestId(view, 'journey-explore')[0].props;
      const place = flat(byTestId(view, 'achievement-cta')[0]);

      expect(button.height).toBeCloseTo(JOURNEY_CARD.button.height * SCALE, 6);
      expect(button.fontSize).toBeCloseTo(JOURNEY_CARD.button.fontSize * SCALE, 6);
      expect(button.iconSize).toBeCloseTo(JOURNEY_CARD.button.iconSize * SCALE, 6);
      expect(button.paddingHorizontal).toBeCloseTo(JOURNEY_CARD.button.paddingHorizontal * SCALE, 6);
      expect(button.gap).toBeCloseTo(JOURNEY_CARD.button.gap * SCALE, 6);
      expect(button.glow).toEqual({ opacity: JOURNEY_CARD.button.glow.opacity, radius: JOURNEY_CARD.button.glow.radius * SCALE });
      expect(place.left).toBeCloseTo((JOURNEY_CARD.inset - JOURNEY_CARD.button.outdent) * SCALE, 6);
      expect(place.bottom).toBeCloseTo(JOURNEY_CARD.buttonFoot * SCALE, 6);
    });

    it('should keep its glint on the island`s star, and as small as the island now is', () => {
      const view = renderNarrow();
      const size = JOURNEY_CARD.glint.size * SCALE;

      const glint = flat(byTestId(view, 'journey-glint')[0]);

      expect((glint.right as number) + size / 2).toBeCloseTo(journeyArtWidth(INNER) * (1 - JOURNEY_CARD.glint.across), 6);
      expect((glint.top as number) + size / 2).toBeCloseTo(INNER * JOURNEY_CARD.glint.down, 6);
      expect(byTestId(view, 'journey-glint-sparkle')[0].props.size).toBeCloseTo(size, 6);
    });

    it('should glow as far in from its edges in proportion', () => {
      const view = renderNarrow();

      expect(flat(byTestId(view, 'journey-edge-glow-left')[0]).width).toBeCloseTo(JOURNEY_CARD.edgeGlowReach * SCALE, 6);
      expect(flat(byTestId(view, 'journey-edge-glow-top')[0]).height).toBeCloseTo(JOURNEY_CARD.edgeGlowReach * SCALE, 6);
      expect(flat(byTestId(view, 'journey-edge-glow-bottom')[0]).height).toBeCloseTo(JOURNEY_CARD.edgeGlowReach * SCALE, 6);
      expect(flat(byTestId(view, 'journey-corner-gleam')[0]).width).toBeCloseTo(JOURNEY_CARD.cornerGleamSize * SCALE, 6);
      expect(flat(byTestId(view, 'journey-corner-gleam')[0]).height).toBeCloseTo(JOURNEY_CARD.cornerGleamSize * SCALE, 6);
    });

    it('should be no larger than the mock`s on a card wider than it', () => {
      const view = renderCard({ width: 500, steps: STEPS });

      expect(flat(byTestId(view, 'journey-words')[0]).height).toBe(INNER_HEIGHT);
      expect(styleOfText(view, 'Moon Explorer').fontSize).toBe(JOURNEY_CARD_TYPE.title);
      expect(styleOfText(view, 'Moon Explorer').maxWidth).toBeCloseTo(journeyWordsWidth(500, INNER_HEIGHT, JOURNEY_CARD.wordsReach), 6);
    });
  });

  it('should use the unit of the badge it is counting towards', () => {
    const view = renderCard({ next: { ...NEXT, unit: 'tunes' } });

    expect(textContents(view)).toContain('home.milestone.remaining.tunes (count:2)');
  });

  it('should celebrate a full set, and still offer the way in', () => {
    const view = renderCard({ next: undefined });

    expect(textContents(view)).toContain('home.milestone.allDone');
    expect(byTestId(view, 'journey-explore').length).toBeGreaterThan(0);
  });

  it('should end in the app`s gold button, Explore with an arrow after it, as in the mock', () => {
    const view = renderCard();

    const button = byTestId(view, 'journey-explore')[0];

    expect(button.props.label).toBe('home.achievements.cta');
    expect(button.props.icon).toBe('arrow-forward');
    expect(button.props.iconPosition).toBe('trailing');
    expect(button.props.balanced).toBe(false);
    expect(button.props.height).toBe(JOURNEY_CARD.button.height);
    expect(button.props.fontSize).toBe(JOURNEY_CARD.button.fontSize);
    expect(button.props.iconSize).toBe(JOURNEY_CARD.button.iconSize);
    expect(button.props.paddingHorizontal).toBe(JOURNEY_CARD.button.paddingHorizontal);
    expect(button.props.gap).toBe(JOURNEY_CARD.button.gap);
    expect(button.props.glow).toEqual(JOURNEY_CARD.button.glow);
    expect(byTestId(view, 'journey-explore-icon-twin')).toHaveLength(0);
  });

  it('should leave the press to the card, so the button and the card are one thing to tap', () => {
    const onPress = jest.fn();
    const view = renderCard({ onPress });

    expect(byTestId(view, 'achievement-cta')[0].props.pointerEvents).toBe('none');
    pressTestId(view, 'achievement-card');

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  /**
   * The medallion once carried a glint that plays once, on a badge actually
   * won. The medallion is gone; the glint now plays on the gold star that
   * stands over the island's trees, whether or not a badge is still to come.
   */
  it.each([
    ['a badge still to reach', NEXT],
    ['every badge won', undefined],
  ])('should keep a glint ready for a new badge, on the star over the island`s trees (%s)', (_, next) => {
    const view = renderCard({ next });
    const artWidth = journeyArtWidth(INNER_HEIGHT);

    const glint = flat(byTestId(view, 'journey-glint')[0]);

    expect(byTestId(view, 'medallion-orbit-star')).toHaveLength(0);
    expect((glint.right as number) + JOURNEY_CARD.glint.size / 2).toBeCloseTo(artWidth * (1 - JOURNEY_CARD.glint.across), 6);
    expect((glint.top as number) + JOURNEY_CARD.glint.size / 2).toBeCloseTo(INNER_HEIGHT * JOURNEY_CARD.glint.down, 6);
  });

  it('should keep the Explore button in the same place whether a badge is still to come or all are won', () => {
    const next = renderCard();
    const allDone = renderCard({ next: undefined });

    expect(flat(byTestId(next, 'achievement-cta')[0])).toEqual(
      expect.objectContaining({ position: 'absolute', left: JOURNEY_CARD.inset - JOURNEY_CARD.button.outdent, bottom: JOURNEY_CARD.buttonFoot })
    );
    expect(flat(byTestId(allDone, 'achievement-cta')[0]).bottom).toBe(JOURNEY_CARD.buttonFoot);
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

/**
 * The streak's neighbour: how many minutes of stories this week, beside a
 * book rather than a flame. Livelier than the lifetime total the progress
 * screen keeps, and -- like the streak -- an invitation rather than a zero
 * when the week hasn't started yet.
 */
describe('WeeklyReadingChip', () => {
  const renderChip = (props: Partial<React.ComponentProps<typeof WeeklyReadingChip>> = {}) =>
    render(<WeeklyReadingChip minutes={22} animated={false} {...props} />);

  it('should count the minutes read this week beside a book', () => {
    const view = renderChip();

    expect(textContents(view)).toContain('home.weeklyReading.minutes (count:22)');
    expect(byTestId(view, 'weekly-reading-chip-book').length).toBeGreaterThan(0);
  });

  it('should invite reading rather than show a zero', () => {
    const view = renderChip({ minutes: 0 });

    const underTest = textContents(view);

    expect(underTest).toContain('home.weeklyReading.none');
    expect(underTest.some((text: string) => text.includes('0'))).toBe(false);
  });

  /** The book is still there with nothing read yet, banked down rather than swapped. */
  it('should keep the book when nothing has been read this week', () => {
    const view = renderChip({ minutes: 0 });

    expect(byTestId(view, 'weekly-reading-chip-book').length).toBeGreaterThan(0);
  });

  it('should read as text rather than something to press', () => {
    const view = renderChip();

    expect(byTestId(view, 'weekly-reading-chip')[0].props.accessibilityRole).toBe('text');
  });
});

describe('AchievementTallyChip', () => {
  const renderChip = (props: Partial<React.ComponentProps<typeof AchievementTallyChip>> = {}) =>
    render(<AchievementTallyChip unlocked={2} remaining={19} animated={false} {...props} />);

  const trophy = (view: RenderResult) =>
    view.UNSAFE_root.findAll((node: RenderedNode) => node.props.kind === 'trophy')[0];

  it('should count the badges unlocked and those still to go, beside a trophy', () => {
    const view = renderChip();

    expect(textContents(view)).toContain('home.achievementTally.label (unlocked:2, remaining:19)');
    expect(byTestId(view, 'achievement-tally-chip-trophy').length).toBeGreaterThan(0);
  });

  it.each([
    [0, 21, true],
    [1, 20, false],
    [21, 0, false],
  ])('with %i unlocked and %i to go, banks the trophy down: %p', (unlocked, remaining, banked) => {
    const view = renderChip({ unlocked, remaining });

    const slot = StyleSheet.flatten(byTestId(view, 'achievement-tally-chip-trophy-slot')[0].props.style) ?? {};

    expect(textContents(view)).toContain(`home.achievementTally.label (unlocked:${unlocked}, remaining:${remaining})`);
    expect(byTestId(view, 'achievement-tally-chip-trophy').length).toBeGreaterThan(0);
    expect((slot.opacity ?? 1) < 1).toBe(banked);
  });

  it.each([
    [true, 2, true],
    [true, 0, false],
    [false, 2, false],
  ])('moves the trophy only when motion is on (%p) and something is unlocked (%i): %p', (animated, unlocked, moving) => {
    const view = renderChip({ animated, unlocked });

    expect(trophy(view).props.animated).toBe(moving);
  });

  it('should say the same to a screen reader, as text rather than something to press', () => {
    const view = renderChip();

    const underTest = byTestId(view, 'achievement-tally-chip')[0].props;

    expect(underTest.accessibilityRole).toBe('text');
    expect(underTest.accessibilityLabel).toBe('home.achievementTally.label (unlocked:2, remaining:19)');
    expect(underTest.onPress).toBeUndefined();
  });
});

describe('AchievementCard label', () => {
  const NEXT = { title: 'Moon Explorer', current: 3, required: 5, unit: 'stories' as const };

  it.each([
    ['full width', false, 370],
    ['paired', true, 170],
  ])('lets a long name for the card shrink to fit rather than be cut off (%s)', (_name, compact, width) => {
    const view = render(
      <AchievementCard next={NEXT} width={width} compact={compact} animated={false} celebrate={false} onPress={jest.fn()} />
    );

    const underTest = view
      .UNSAFE_queryAllByType(Text)
      .find((node) => node.props.children === 'home.milestone.eyebrow');

    expect(underTest?.props.numberOfLines).toBe(1);
    expect(underTest?.props.adjustsFontSizeToFit).toBe(true);
    expect(underTest?.props.minimumFontScale).toBeLessThan(1);
    expect(underTest?.props.minimumFontScale).toBeGreaterThanOrEqual(0.7);
  });
});

/**
 * The achievement and continue-learning cards can pair up side by side on a
 * tablet instead of stacking full width. Compact mode has to keep every
 * fact the full card shows -- it is just laid out to fit half the room.
 */
describe('AchievementCard in compact (paired) mode', () => {
  const NEXT = { title: 'Moon Explorer', current: 3, required: 5, unit: 'stories' as const };

  it('should still show the badge, the title and the stars, without the standalone CTA row', () => {
    const view = render(
      <AchievementCard next={NEXT} width={170} compact animated={false} celebrate={false} onPress={jest.fn()} />
    );

    const underTest = textContents(view);
    expect(underTest).toContain('home.milestone.eyebrow');
    expect(underTest).toContain('Moon Explorer');
    expect(underTest).toContain('home.milestone.remaining.stories (count:2)');
    expect(byTestId(view, 'milestone-stars').length).toBeGreaterThan(0);
    expect(byTestId(view, 'achievement-cta').length).toBe(0);
  });

  it('should still open the achievements when tapped', () => {
    const onPress = jest.fn();
    const view = render(
      <AchievementCard next={NEXT} width={170} compact animated={false} celebrate={false} onPress={onPress} />
    );

    pressTestId(view, 'achievement-card');

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should still celebrate a full set, without the standalone CTA row', () => {
    const view = render(
      <AchievementCard next={undefined} width={170} compact animated={false} celebrate={false} onPress={jest.fn()} />
    );

    expect(textContents(view)).toContain('home.milestone.allDone');
    expect(byTestId(view, 'achievement-cta').length).toBe(0);
  });

  it('should stay the small violet tile it was: no island, no deep blue, no step tokens, and its medallion kept', () => {
    const steps = [{ id: 'day-1', day: 1, kind: 'story', state: 'open' }] as const;
    const view = render(
      <AchievementCard next={NEXT} steps={steps} width={170} compact animated={false} celebrate={false} onPress={jest.fn()} />
    );

    expect(byTestId(view, 'achievement-card-surface')[0].props.colors).toEqual([HERO_CARD.fillTop, HERO_CARD.fillBottom]);
    expect(byTestId(view, 'journey-island')).toHaveLength(0);
    expect(byTestId(view, 'journey-steps')).toHaveLength(0);
    expect(byTestId(view, 'next-medallion').length).toBeGreaterThan(0);
  });
});

describe('ContinueLearningCard', () => {
  const renderCard = (props: Partial<React.ComponentProps<typeof ContinueLearningCard>> = {}) =>
    render(<ContinueLearningCard width={358} animated={false} onPress={jest.fn()} {...props} />);

  it('should name the way into the library, with its book and its arrow', () => {
    const view = renderCard();

    const underTest = textContents(view);
    expect(underTest).toContain('home.continueLearning.title');
    expect(underTest).toContain('home.continueLearning.body');
    expect(byTestId(view, 'continue-learning-glyph').length).toBeGreaterThan(0);
    expect(byTestId(view, 'continue-learning-arrow').length).toBeGreaterThan(0);
  });

  it('should open the library when tapped', () => {
    const onPress = jest.fn();
    const view = renderCard({ onPress });

    pressTestId(view, 'continue-learning-card');

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should keep the same book, title and arrow in compact (paired) mode', () => {
    const view = renderCard({ compact: true, width: 170 });

    const underTest = textContents(view);
    expect(underTest).toContain('home.continueLearning.title');
    expect(underTest).toContain('home.continueLearning.body');
    expect(byTestId(view, 'continue-learning-glyph').length).toBeGreaterThan(0);
    expect(byTestId(view, 'continue-learning-arrow').length).toBeGreaterThan(0);
  });
});

/**
 * On a short phone the page scrolls, and these three lines pass over the
 * painted planet's white ice and bright cloud. A soft dark shade behind each
 * word keeps it readable there, and is unseen over the dark sky.
 */
describe('the stat lines over the planet', () => {
  const shaded = (view: RenderResult) =>
    view.UNSAFE_queryAllByType(Text).map((node) => StyleSheet.flatten(node.props.style) as Record<string, unknown>);

  it.each([
    ['the streak', () => render(<StreakChip days={3} animated={false} />)],
    ['the streak not yet begun', () => render(<StreakChip days={0} animated={false} />)],
    ['the week`s reading', () => render(<WeeklyReadingChip minutes={22} animated={false} />)],
    ['a week with no reading yet', () => render(<WeeklyReadingChip minutes={0} animated={false} />)],
    ['the badge tally', () => render(<AchievementTallyChip unlocked={2} remaining={14} animated={false} />)],
  ])('should shade every word of %s', (_, draw) => {
    const words = shaded(draw());

    expect(words.length).toBeGreaterThan(0);
    words.forEach((style) => {
      expect(style.textShadowColor).toBe(STAT_TEXT_SHADE.textShadowColor);
      expect(style.textShadowRadius).toBe(STAT_TEXT_SHADE.textShadowRadius);
      expect(style.textShadowOffset).toEqual(STAT_TEXT_SHADE.textShadowOffset);
    });
  });

  it('should be a dark, soft shade and not a hard outline', () => {
    expect(STAT_TEXT_SHADE.textShadowColor).toMatch(/^rgba\(\d+,\d+,\d+,0\.\d+\)$/);
    expect(STAT_TEXT_SHADE.textShadowRadius).toBeGreaterThanOrEqual(4);
  });
});
