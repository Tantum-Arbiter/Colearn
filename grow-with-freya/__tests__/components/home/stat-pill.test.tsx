/**
 * The stat pill: a stat orb, tapped, opens out into a row from where it
 * stands, across the other orbs -- the streak and its best, the story to carry
 * on with and how far in, or the badges and the next to earn. A tap on the row
 * goes on; a tap on its orb, or anywhere off it, folds it back into the orb.
 */

import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { render, fireEvent, act, type RenderResult } from '@testing-library/react-native';
import { withDelay, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { StatPill, measureStatPillRow } from '@/components/home/stat-pill';
import { STAT_ORB_FRONT } from '@/components/home/stat-orb-art';
import { COVER_ASPECT_RATIO } from '@/components/child-ui/tokens';
import { STAT_PILL, STAT_PILL_TINTS, statPillFrame } from '@/constants/stat-pill';
import { STAT_ORB, STAT_ORB_ORDER, type StatOrbKind } from '@/constants/stat-orbs';
import type { ChildHomeNextAchievement, ChildHomeStory } from '@/types/child-home';

const DIAMETER = 84;
const WIDTH = 370;
const ROW = { x: 53, y: 600, width: 296 };
const BAR = DIAMETER * STAT_PILL.barHeight;
const STORY: ChildHomeStory = {
  id: 'juni',
  title: 'Hold On, Juni',
  currentPage: 4,
  totalPages: 11,
  coverImage: { uri: 'file:///juni.webp' },
};
const NEXT: ChildHomeNextAchievement = {
  id: 'story-explorer',
  title: 'Story Explorer',
  current: 3,
  required: 5,
  unit: 'stories',
  artwork: { uri: 'file:///explorer.webp' },
};
const TALLY = { unlocked: 3, remaining: 13 };

type PillProps = React.ComponentProps<typeof StatPill>;

function byTestId(view: RenderResult, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID });
}

function host(view: RenderResult, testID: string) {
  return byTestId(view, testID).filter((node) => node.props.style !== undefined)[0];
}

function textsIn(node: { findAll: (test: (n: any) => boolean) => any[] }): string[] {
  return node
    .findAll((n) => n.type === Text)
    .map((n) => n.props.children)
    .filter((child): child is string => typeof child === 'string');
}

function press(view: RenderResult, testID: string): void {
  const matches = byTestId(view, testID);

  fireEvent.press(matches[matches.length - 1]);
}

function button(view: RenderResult, testID: string) {
  return byTestId(view, testID).find((node) => node.props.accessibilityRole === 'button');
}

function pillProps(props: Partial<PillProps> = {}): PillProps {
  return {
    kind: 'streak',
    row: ROW,
    open: true,
    diameter: DIAMETER,
    width: WIDTH,
    streakDays: 2,
    bestStreakDays: 5,
    story: STORY,
    tally: TALLY,
    next: NEXT,
    onPress: jest.fn(),
    onClose: jest.fn(),
    onFolded: jest.fn(),
    onDrawn: jest.fn(),
    onOpenBook: jest.fn(),
    ...props,
  };
}

function renderPill(props: Partial<PillProps> = {}) {
  const all = pillProps(props);
  const view = render(<StatPill {...all} />);

  return { view, ...all };
}

describe('StatPill', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should draw nothing until it is opened', () => {
    const { view } = renderPill({ open: false });

    expect(byTestId(view, 'stat-pill')).toHaveLength(0);
    expect(byTestId(view, 'stat-pill-backdrop')).toHaveLength(0);
  });

  it('should draw nothing while it does not yet know where the row is', () => {
    const { view } = renderPill({ row: null });

    expect(byTestId(view, 'stat-pill')).toHaveLength(0);
  });

  it('should stand over the row, its middle on the middle of the orbs', () => {
    const { view } = renderPill();
    const frame = statPillFrame(ROW, 0, DIAMETER, WIDTH);

    const anchor = StyleSheet.flatten(host(view, 'stat-pill-anchor').props.style);

    expect(anchor).toEqual(expect.objectContaining({ position: 'absolute', left: frame.left, top: frame.centreY }));
  });

  it('should stretch out to the width it is given and settle a little shallower than the orb', () => {
    renderPill();

    expect(withSpring).toHaveBeenCalledWith(0, STAT_PILL.jelly.edges, expect.any(Function));
    expect(withSpring).toHaveBeenCalledWith(WIDTH, STAT_PILL.jelly.edges);
    expect(withSpring).toHaveBeenCalledWith(BAR, STAT_PILL.jelly.height);
  });

  it.each(STAT_ORB_ORDER.map((kind, index) => [kind, index] as [StatOrbKind, number]))(
    'should fold the %s pill back into its own orb in the row',
    (kind, index) => {
      const { view, ...props } = renderPill({ kind });
      const frame = statPillFrame(ROW, index, DIAMETER, WIDTH);
      (withSpring as jest.Mock).mockClear();

      view.rerender(<StatPill {...props} kind={kind} open={false} />);

      expect(withSpring).toHaveBeenCalledWith(frame.from - frame.left, STAT_PILL.jelly.fold);
      expect(withSpring).toHaveBeenCalledWith(frame.from - frame.left + DIAMETER, STAT_PILL.jelly.fold);
      expect(withSpring).toHaveBeenCalledWith(DIAMETER, STAT_PILL.jelly.fold);
    }
  );

  describe('the streak', () => {
    it('should name the streak, the days in a row and the best run there has been', () => {
      const { view } = renderPill();

      expect(textsIn(host(view, 'stat-pill-content'))).toEqual([
        'home.statPill.streak',
        'home.statPill.days (count:2)',
        'home.statPill.best (count:5)',
      ]);
    });

    it('should carry its orb at the end, with the number and without the words under it', () => {
      const { view } = renderPill();

      expect(textsIn(host(view, 'stat-pill-orb'))).toEqual(['2']);
    });

    it('should invite a family with no streak running, and still show their best', () => {
      const { view } = renderPill({ streakDays: 0 });

      expect(textsIn(host(view, 'stat-pill-content'))).toEqual([
        'home.statPill.streak',
        'home.streak.start',
        'home.statPill.best (count:5)',
      ]);
      expect(textsIn(host(view, 'stat-pill-orb'))).toEqual([]);
    });

    it('should show no best before there has been a streak at all', () => {
      const { view } = renderPill({ streakDays: 0, bestStreakDays: 0 });

      expect(textsIn(host(view, 'stat-pill-content'))).toEqual(['home.statPill.streak', 'home.streak.start']);
      expect(byTestId(view, 'stat-pill-tag')).toHaveLength(0);
    });
  });

  describe('the story', () => {
    it('should name the story to carry on with and how far in the family is', () => {
      const { view } = renderPill({ kind: 'continue' });

      expect(textsIn(host(view, 'stat-pill-content'))).toEqual([
        'home.continueReading',
        'Hold On, Juni',
        'home.statPill.pages (page:4, total:11)',
      ]);
    });

    it('should carry the same cover the row shows at the end, with its bookmark', () => {
      const { view } = renderPill({ kind: 'continue' });
      const orb = host(view, 'stat-pill-orb');

      expect(orb.findAll((n: any) => n.props.testID === 'stat-pill-cover')[0].props.source).toEqual(STORY.coverImage);
      expect(orb.findAll((n: any) => n.props.testID === 'stat-orb-continue-bookmark').length).toBeGreaterThan(0);
    });

    it('should open and fold without turning anything over, since the row already shows the cover', () => {
      const { view, ...props } = renderPill({ kind: 'continue' });
      (withDelay as jest.Mock).mockClear();

      view.rerender(<StatPill {...props} kind="continue" open={false} />);

      expect(withDelay).toHaveBeenCalledWith(STAT_PILL.foldSettleMs, expect.anything());
      expect(view.UNSAFE_root.findAll((n: any) => n.props.testID === 'stat-pill-cover-spin')).toHaveLength(0);
    });

    it("should draw the orb's rim and the clouds at its foot in front of the cover", () => {
      const { view } = renderPill({ kind: 'continue' });
      const order = host(view, 'stat-pill-orb').findAll((n: any) =>
        ['stat-pill-cover-frame', 'stat-pill-cover-front'].includes(n.props.testID) && n.props.style !== undefined
      );

      expect(order.map((n: any) => n.props.testID).filter((id: string, i: number, all: string[]) => all.indexOf(id) === i)).toEqual([
        'stat-pill-cover-frame',
        'stat-pill-cover-front',
      ]);
      expect(order[1].props.source).toBe(STAT_ORB_FRONT);
    });

    it('should open the story card from its cover, shaped like a book on the shelves, and leave the pill open', () => {
      const { view, onOpenBook, onClose, onPress } = renderPill({ kind: 'continue' });
      const frame = statPillFrame(ROW, 1, DIAMETER, WIDTH);
      const size = DIAMETER * STAT_ORB.cover.size;

      press(view, 'stat-pill-orb');

      expect(onOpenBook).toHaveBeenCalledWith({
        x: frame.left + (DIAMETER - size) / 2,
        y: frame.centreY - size / COVER_ASPECT_RATIO / 2,
        width: size,
        height: size / COVER_ASPECT_RATIO,
      });
      expect(onClose).not.toHaveBeenCalled();
      expect(onPress).not.toHaveBeenCalled();
    });

    it('should fold back from its orb when there is no story card to open', () => {
      const { view, onClose } = renderPill({ kind: 'continue', onOpenBook: undefined });

      press(view, 'stat-pill-orb');

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(button(view, 'stat-pill-orb')?.props.accessibilityLabel).toBe('common.close');
    });

    it('should name the book its cover opens', () => {
      const { view } = renderPill({ kind: 'continue' });

      expect(button(view, 'stat-pill-orb')?.props.accessibilityLabel).toBe('home.statPill.openBook (title:Hold On, Juni)');
    });

    it('should open the story card from the bookmark too, for a story with no cover', () => {
      const { view, onOpenBook } = renderPill({ kind: 'continue', story: { ...STORY, coverImage: undefined } });

      press(view, 'stat-pill-orb');

      expect(onOpenBook).toHaveBeenCalledTimes(1);
    });

    it('should round the cover into the middle of the glass, clear of the clouds', () => {
      const { view } = renderPill({ kind: 'continue' });

      const cover = StyleSheet.flatten(host(view, 'stat-pill-cover-frame').props.style);
      const size = DIAMETER * STAT_ORB.cover.size;

      expect(cover).toEqual(
        expect.objectContaining({
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          left: (DIAMETER - size) / 2,
          top: DIAMETER * STAT_ORB.cover.centre - size / 2,
          overflow: 'hidden',
        })
      );
    });

    it('should keep the bookmark for a story with no cover', () => {
      const { view } = renderPill({ kind: 'continue', story: { ...STORY, coverImage: undefined } });

      expect(byTestId(view, 'stat-pill-cover')).toHaveLength(0);
      expect(host(view, 'stat-pill-orb').findAll((n: any) => n.props.testID === 'stat-orb-continue-bookmark').length).toBeGreaterThan(0);
    });
  });

  describe('the badges', () => {
    it('should name the badges and the next to earn, with its picture', () => {
      const { view } = renderPill({ kind: 'badges' });

      expect(textsIn(host(view, 'stat-pill-content'))).toEqual([
        'home.statPill.achievements',
        'home.statPill.next (title:Story Explorer)',
      ]);
      expect(host(view, 'stat-pill-content').findAll((n: any) => n.props.artwork === NEXT.artwork).length).toBeGreaterThan(0);
    });

    it('should carry the trophy orb at the end, with the number unlocked', () => {
      const { view } = renderPill({ kind: 'badges' });

      expect(textsIn(host(view, 'stat-pill-orb'))).toEqual(['3']);
    });

    it('should leave the picture out when the next badge has none', () => {
      const { view } = renderPill({ kind: 'badges', next: { ...NEXT, artwork: undefined } });

      expect(byTestId(view, 'stat-pill-medallion')).toHaveLength(0);
    });

    it('should cheer a family with every badge, with nothing next to show', () => {
      const { view } = renderPill({ kind: 'badges', next: undefined });

      expect(textsIn(host(view, 'stat-pill-content'))).toEqual(['home.statPill.achievements', 'home.milestone.allDone']);
      expect(byTestId(view, 'stat-pill-medallion')).toHaveLength(0);
    });

    it('should draw nothing for a badge pill with no badges to count', () => {
      const { view } = renderPill({ kind: 'badges', tally: undefined });

      expect(byTestId(view, 'stat-pill')).toHaveLength(0);
    });
  });

  it.each(['streak', 'continue'] as const)("should keep the next badge's picture off the %s pill", (kind) => {
    const { view } = renderPill({ kind });

    expect(byTestId(view, 'stat-pill-medallion')).toHaveLength(0);
  });

  it('should give a light tap of feedback as it goes', () => {
    const { view } = renderPill({ kind: 'continue' });

    press(view, 'stat-pill');

    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });

  it('should go on when the badges pill is tapped', () => {
    const { view, onPress, onClose } = renderPill({ kind: 'badges' });

    press(view, 'stat-pill');

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('should bring up the story card from anywhere on the story pill, flying it from the cover', () => {
    const { view, onPress, onClose, onOpenBook } = renderPill({ kind: 'continue' });
    const frame = statPillFrame(ROW, 1, DIAMETER, WIDTH);
    const size = DIAMETER * STAT_ORB.cover.size;

    press(view, 'stat-pill');

    expect(onOpenBook).toHaveBeenCalledWith({
      x: frame.left + (DIAMETER - size) / 2,
      y: frame.centreY - size / COVER_ASPECT_RATIO / 2,
      width: size,
      height: size / COVER_ASPECT_RATIO,
    });
    expect(onPress).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('should say the story pill opens the book', () => {
    const { view } = renderPill({ kind: 'continue' });

    expect(button(view, 'stat-pill')?.props.accessibilityHint).toBe('home.statPill.openBook (title:Hold On, Juni)');
  });

  it('should read straight on from the story pill when there is no story card to open', () => {
    const { view, onPress, onOpenBook } = renderPill({ kind: 'continue', onOpenBook: undefined });

    press(view, 'stat-pill');

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onOpenBook).toBeUndefined();
  });

  it('should only fold the streak pill when it is tapped, since it goes nowhere', () => {
    const { view, onPress, onClose } = renderPill({ kind: 'streak' });

    press(view, 'stat-pill');

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });

  it.each([
    ['streak', true],
    ['continue', false],
    ['badges', false],
  ] as const)('should point the %s arrow back towards its orb: %p', (kind, back) => {
    const { view } = renderPill({ kind });

    const arrow = host(view, 'stat-pill-content').findAll((n: any) => typeof n.props.back === 'boolean')[0];
    const [tipStart, bend] = String(arrow.findAll((n: any) => typeof n.props.d === 'string')[0].props.d)
      .match(/[\d.]+ [\d.]+/g)!
      .map((point) => Number(point.split(' ')[0]));

    expect(arrow.props.back).toBe(back);
    expect(tipStart > bend).toBe(back);
  });

  it.each(['stat-pill-orb', 'stat-pill-backdrop'])('should ask to fold back into the orb from %s', (testID) => {
    const { view, onPress, onClose } = renderPill();

    press(view, testID);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('should read the whole streak row to a screen reader, and say a tap closes it', () => {
    const { view } = renderPill();

    expect(button(view, 'stat-pill')?.props.accessibilityLabel).toBe(
      'home.statPill.streak, home.statPill.days (count:2), home.statPill.best (count:5)'
    );
    expect(button(view, 'stat-pill')?.props.accessibilityHint).toBe('common.close');
  });

  it('should say the badges row opens the badge to earn next', () => {
    const { view } = renderPill({ kind: 'badges' });

    expect(button(view, 'stat-pill')?.props.accessibilityHint).toBe('home.statPill.toBadge');
  });

  it('should name the story it carries on with for a screen reader', () => {
    const { view } = renderPill({ kind: 'continue' });

    expect(button(view, 'stat-pill')?.props.accessibilityLabel).toBe(
      'home.continueReading, Hold On, Juni, home.statPill.pages (page:4, total:11)'
    );
  });

  it.each(STAT_ORB_ORDER)("should say once the %s orb's art is on screen, so the row can let go of its own", (kind) => {
    const { view, onDrawn } = renderPill({ kind });
    const art = host(view, 'stat-pill-orb').findAll((n: any) => n.props.testID === `stat-orb-${kind}-art`)[0];

    expect(onDrawn).not.toHaveBeenCalled();
    act(() => {
      art.props.onDisplay();
    });

    expect(onDrawn).toHaveBeenCalledTimes(1);
  });

  it('should hand the orb over once it has opened, even if its art never says it is shown', () => {
    (withSpring as jest.Mock).mockImplementation((value, _config, callback) => {
      if (typeof callback === 'function') callback(true);
      return value;
    });
    try {
      const { onDrawn } = renderPill();

      expect(onDrawn).toHaveBeenCalled();
    } finally {
      (withSpring as jest.Mock).mockImplementation((value) => value);
    }
  });

  it.each(['streak', 'badges'] as const)('should label the %s orb as the way to close it, and fold from it', (kind) => {
    const { view, onClose, onOpenBook } = renderPill({ kind });

    press(view, 'stat-pill-orb');

    expect(button(view, 'stat-pill-orb')?.props.accessibilityLabel).toBe('common.close');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onOpenBook).not.toHaveBeenCalled();
  });

  it.each(STAT_ORB_ORDER)('should edge the %s pill in the colour of its orb', (kind) => {
    const { view } = renderPill({ kind });

    const rim = StyleSheet.flatten(host(view, 'stat-pill-rim').props.style);
    const glow = StyleSheet.flatten(host(view, 'stat-pill-glow').props.style);
    const bands = [0, 1, 2].map((index) => StyleSheet.flatten(host(view, `stat-pill-inner-glow-${index}`).props.style));

    expect(rim.borderColor).toBe(STAT_PILL_TINTS.edges[kind].rim);
    expect(glow.shadowColor).toBe(STAT_PILL_TINTS.edges[kind].glow);
    bands.forEach((band) => expect(band.borderColor).toBe(STAT_PILL_TINTS.edges[kind].inner));
  });

  it('should draw its rim over the glass, so nothing dark shows through or round it', () => {
    const { view } = renderPill();

    const clip = StyleSheet.flatten(host(view, 'stat-pill-clip').props.style);
    const rim = StyleSheet.flatten(host(view, 'stat-pill-rim').props.style);

    expect(clip.borderWidth ?? 0).toBe(0);
    expect(rim.borderWidth).toBe(STAT_PILL.rim);
    expect(host(view, 'stat-pill-rim').props.pointerEvents).toBe('none');
  });

  it('should catch the light just inside its rim, fading inwards rather than ending in a hard ring', () => {
    const { view } = renderPill();

    const widths = [0, 1, 2].map(
      (index) => StyleSheet.flatten(host(view, `stat-pill-inner-glow-${index}`).props.style).borderWidth as number
    );

    expect(widths[0]).toBeGreaterThan(STAT_PILL.rim);
    expect(widths[1]).toBeGreaterThan(widths[0]);
    expect(widths[2]).toBeGreaterThan(widths[1]);
  });

  it('should keep the ground that casts its glow tucked inside the glass', () => {
    const { view } = renderPill();

    const glow = StyleSheet.flatten(host(view, 'stat-pill-glow').props.style);

    expect(glow.top).toBeGreaterThan(0);
    expect(glow.left).toBeGreaterThan(0);
    expect(glow.right).toBeGreaterThan(0);
    expect(glow.bottom).toBeGreaterThan(0);
  });

  describe('the words', () => {
    it('should size every line from the bar, the same on every pill', () => {
      STAT_ORB_ORDER.forEach((kind) => {
        const { view } = renderPill({ kind });
        const [eyebrow, title] = host(view, 'stat-pill-content').findAll((n: any) => n.type === Text);

        expect(StyleSheet.flatten(eyebrow.props.style).fontSize).toBeCloseTo(BAR * STAT_PILL.eyebrow, 5);
        expect(StyleSheet.flatten(title.props.style).fontSize).toBeCloseTo(BAR * STAT_PILL.title, 5);
        view.unmount();
      });
    });

    it('should keep a long title to one line, shrinking it only as far as it must', () => {
      const { view } = renderPill({ kind: 'continue' });

      const [, title] = host(view, 'stat-pill-content').findAll((n: any) => n.type === Text);

      expect(title.props.numberOfLines).toBe(1);
      expect(title.props.adjustsFontSizeToFit).toBe(true);
      expect(title.props.minimumFontScale).toBe(STAT_PILL.titleShrink);
      expect(StyleSheet.flatten(title.props.style).lineHeight).toBeUndefined();
    });

    it("should not let the system's larger text settings push words out of the bar", () => {
      const { view } = renderPill();

      host(view, 'stat-pill-anchor')
        .findAll((n: any) => n.type === Text)
        .forEach((text: any) => expect(text.props.maxFontSizeMultiplier).toBe(1));
    });

    it('should write the heading in gold over a white title', () => {
      const { view } = renderPill();

      const [eyebrow, title] = host(view, 'stat-pill-content').findAll((n: any) => n.type === Text);

      expect(StyleSheet.flatten(eyebrow.props.style).color).toBe(STAT_PILL_TINTS.eyebrow);
      expect(StyleSheet.flatten(title.props.style).color).toBe(STAT_PILL_TINTS.title);
    });
  });

  it('should leave the page beyond the pill to its backdrop alone', () => {
    const { view } = renderPill();

    expect(host(view, 'stat-pill-layer').props.pointerEvents).toBe('box-none');
  });

  it('should not report a fold it never made', () => {
    const { onFolded } = renderPill({ open: false });

    expect(onFolded).not.toHaveBeenCalled();
  });

  it('should say when it has folded away', () => {
    const { view, onFolded, ...props } = renderPill();

    view.rerender(<StatPill {...props} onFolded={onFolded} open={false} />);

    expect(onFolded).toHaveBeenCalledTimes(1);
    expect(byTestId(view, 'stat-pill')).toHaveLength(0);
  });

  describe('while its animations are still running', () => {
    beforeEach(() => {
      (withTiming as jest.Mock).mockImplementation((value) => value);
    });

    afterEach(() => {
      (withTiming as jest.Mock).mockImplementation((value, _config, callback) => {
        if (typeof callback === 'function') callback(true);
        return value;
      });
    });

    it('should not draw itself for a row it has not been opened from', () => {
      const { view } = renderPill({ open: false });

      expect(byTestId(view, 'stat-pill')).toHaveLength(0);
    });

    it('should stay drawn while it folds, but let the page take touches again at once', () => {
      const { view, onFolded, ...props } = renderPill();

      view.rerender(<StatPill {...props} onFolded={onFolded} open={false} />);

      expect(byTestId(view, 'stat-pill').length).toBeGreaterThan(0);
      expect(byTestId(view, 'stat-pill-backdrop')).toHaveLength(0);
      expect(host(view, 'stat-pill-anchor').props.pointerEvents).toBe('none');
      expect(onFolded).not.toHaveBeenCalled();
    });
  });
});

describe('measureStatPillRow', () => {
  const FALLBACK = { x: 1, y: 2, width: 3 };

  function measurable(x: number, y: number, width: number) {
    return { measureInWindow: (done: (x: number, y: number, width: number, height: number) => void) => done(x, y, width, 90) };
  }

  it('should place the row in the layer the pill is drawn in', () => {
    const done = jest.fn();

    measureStatPillRow(measurable(60, 640, 296), measurable(0, 40, 402), FALLBACK, done);

    expect(done).toHaveBeenCalledWith({ x: 60, y: 600, width: 296 });
  });

  it('should take the layer\'s own offset off across as well as down', () => {
    const done = jest.fn();

    measureStatPillRow(measurable(60, 640, 296), measurable(10, 0, 402), FALLBACK, done);

    expect(done).toHaveBeenCalledWith({ x: 50, y: 640, width: 296 });
  });

  it.each([
    ['the row', null, measurable(0, 0, 402)],
    ['the layer', measurable(60, 640, 296), null],
  ])('should fall back to where the row is drawn when %s cannot be measured', (_, row, layer) => {
    const done = jest.fn();

    measureStatPillRow(row, layer, FALLBACK, done);

    expect(done).toHaveBeenCalledWith(FALLBACK);
  });
});
