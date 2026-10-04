/**
 * The stat orbs: the operator's three glass orbs under the Learning Journey
 * card -- days in a row, the story to carry on with, badges unlocked. Each
 * opens out into its own pill when tapped; the middle one holds a bookmark and
 * opens only while a story is part-read. While a pill is open the row hides
 * under it.
 */

import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { render, fireEvent, type RenderResult } from '@testing-library/react-native';
import { useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { StatOrbs } from '@/components/home/stat-orbs';
import { STAT_ORB_ART, STAT_ORB_FRONT } from '@/components/home/stat-orb-art';
import {
  STAT_ORB,
  STAT_ORB_ORDER,
  STAT_ORB_TINTS,
  statOrbDiameter,
  statOrbFloatDelay,
  statOrbRowHeight,
  statOrbRowWidth,
} from '@/constants/stat-orbs';
import { STAT_PILL } from '@/constants/stat-pill';
import type { ChildHomeStory } from '@/types/child-home';

const TALLY = { unlocked: 3, remaining: 13 };
const STORY: ChildHomeStory = { id: 'juni', title: 'Hold On, Juni', currentPage: 4, totalPages: 11 };
const CONTENT = 370;
const DIAMETER = statOrbDiameter(CONTENT);

function host(view: RenderResult, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID }).filter((node) => node.props.style !== undefined)[0];
}

function orbsShown(view: RenderResult): string[] {
  return view.UNSAFE_root
    .findAll(
      (node) =>
        ['text', 'button'].includes(node.props.accessibilityRole as string) &&
        /^stat-orb-[a-z]+$/.test(String(node.props.testID)) &&
        node.props.style !== undefined
    )
    .map((node) => node.props.testID as string)
    .filter((id, index, all) => all.indexOf(id) === index);
}

function wordsIn(view: RenderResult, testID: string): string[] {
  return host(view, testID)
    .findAll((node: any) => node.type === Text)
    .map((node: any) => node.props.children)
    .filter((child: unknown): child is string => typeof child === 'string');
}

function orbOf(view: RenderResult, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID }).find((node) => node.props.accessibilityLabel !== undefined);
}

function renderOrbs(props: Partial<React.ComponentProps<typeof StatOrbs>> = {}) {
  const onOpen = jest.fn();
  const onExplore = jest.fn();
  const view = render(
    <StatOrbs
      streakDays={2}
      story={STORY}
      tally={TALLY}
      contentWidth={CONTENT}
      animated={false}
      onOpen={onOpen}
      onExplore={onExplore}
      {...props}
    />
  );

  return Object.assign(view, { onOpen, onExplore });
}

describe('StatOrbs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show the streak, the story to carry on with and the badges, in that order', () => {
    const view = renderOrbs();

    expect(orbsShown(view)).toEqual(['stat-orb-streak', 'stat-orb-continue', 'stat-orb-badges']);
  });

  it('should have art for every orb', () => {
    expect(Object.keys(STAT_ORB_ART).sort()).toEqual([...STAT_ORB_ORDER].sort());
  });

  it('should write the days in a row as a number over its words', () => {
    const view = renderOrbs();

    expect(wordsIn(view, 'stat-orb-streak')).toEqual(['2', 'home.streak.unit (count:2)']);
    expect(orbOf(view, 'stat-orb-streak')?.props.accessibilityLabel).toBe('home.streak.days (count:2)');
  });

  it('should write the number of badges unlocked over "Achieved", and still say the rest to a screen reader', () => {
    const view = renderOrbs();

    expect(wordsIn(view, 'stat-orb-badges')).toEqual(['3', 'home.statOrb.achieved']);
    expect(orbOf(view, 'stat-orb-badges')?.props.accessibilityLabel).toBe('home.achievementTally.label (unlocked:3, remaining:13)');
  });

  it('should show no badge orb when there are no badges to count', () => {
    const view = renderOrbs({ tally: undefined });

    expect(orbsShown(view)).toEqual(['stat-orb-streak', 'stat-orb-continue']);
  });

  describe('the middle orb', () => {
    describe('with a book to continue that has a cover', () => {
      const WITH_COVER: ChildHomeStory = { ...STORY, coverImage: { uri: 'file:///juni.webp' } };

      it("should show the book's cover as the orb's background, with the bookmark and Continue over it", () => {
        const view = renderOrbs({ story: WITH_COVER });
        const orb = host(view, 'stat-orb-continue');

        expect(orb.findAll((node: any) => node.props.testID === 'stat-orb-continue-cover')[0].props.source).toEqual(WITH_COVER.coverImage);
        expect(orb.findAll((node: any) => node.props.testID === 'stat-orb-continue-bookmark').length).toBeGreaterThan(0);
        expect(wordsIn(view, 'stat-orb-continue')).toEqual(['home.statOrb.continue']);
      });

      it('should stand the bookmark where it stands on a book with no cover, drawn over the cover and its rim', () => {
        const view = renderOrbs({ story: WITH_COVER });
        const bookmark = StyleSheet.flatten(host(view, 'stat-orb-continue-bookmark').props.style);
        const width = DIAMETER * STAT_ORB.bookmark.width;
        const drawn = [
          ...new Set(
            host(view, 'stat-orb-continue')
              .findAll((node: any) => typeof node.props.testID === 'string')
              .map((node: any) => node.props.testID as string)
          ),
        ];
        const order = ['stat-orb-continue-cover-frame', 'stat-orb-continue-cover-front', 'stat-orb-continue-bookmark'].map((id) => drawn.indexOf(id));

        expect(bookmark).toEqual(
          expect.objectContaining({ width, height: width * STAT_ORB.bookmark.aspect, top: DIAMETER * STAT_ORB.bookmark.top, left: (DIAMETER - width) / 2 })
        );
        expect(order.every((at) => at >= 0)).toBe(true);
        expect([...order].sort((a, b) => a - b)).toEqual(order);
      });

      it('should fill the glass with the cover, the rim and the clouds in front of it', () => {
        const view = renderOrbs({ story: WITH_COVER });
        const frame = StyleSheet.flatten(host(view, 'stat-orb-continue-cover-frame').props.style);
        const size = DIAMETER * STAT_ORB.cover.size;
        const front = view.UNSAFE_queryAllByProps({ testID: 'stat-orb-continue-cover-front' })[0];

        expect(frame).toEqual(
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
        expect(front.props.source).toBe(STAT_ORB_FRONT);
      });

      it('should shade the foot of the cover, so Continue reads clearly over any picture', () => {
        const view = renderOrbs({ story: WITH_COVER });

        const shade = view.UNSAFE_queryAllByProps({ testID: 'stat-orb-continue-cover-shade' })[0];

        expect(shade.props.colors).toEqual(STAT_ORB_TINTS.coverShade);
      });
    });

    it('should hold a bookmark over the word Continue for a book with no cover', () => {
      const view = renderOrbs();

      expect(view.UNSAFE_queryAllByProps({ testID: 'stat-orb-continue-bookmark' }).length).toBeGreaterThan(0);
      expect(wordsIn(view, 'stat-orb-continue')).toEqual(['home.statOrb.continue']);
    });

    it("should write the invitation as the streak writes its own: two lines at the labels' size", () => {
      const view = renderOrbs({ story: undefined });

      const [invitation] = host(view, 'stat-orb-continue').findAll((node: any) => node.type === Text);
      const block = host(view, 'stat-orb-continue').findAll(
        (node: any) => node.props.style !== undefined && StyleSheet.flatten(node.props.style).top === DIAMETER * STAT_ORB.invite.top
      );

      expect(invitation.props.numberOfLines).toBe(2);
      expect(StyleSheet.flatten(invitation.props.style).fontSize).toBe(DIAMETER * STAT_ORB.invite.size);
      expect(block.length).toBeGreaterThan(0);
    });

    it('should lift the bookmark and draw it a little smaller over the invitation, so the two lines fit under it', () => {
      const view = renderOrbs({ story: undefined });

      const bookmark = StyleSheet.flatten(host(view, 'stat-orb-continue-bookmark').props.style);
      const width = DIAMETER * STAT_ORB.bookmark.inviting.width;

      expect(bookmark).toEqual(
        expect.objectContaining({
          width,
          height: width * STAT_ORB.bookmark.aspect,
          top: DIAMETER * STAT_ORB.bookmark.inviting.top,
          left: (DIAMETER - width) / 2,
        })
      );
    });

    it('should set its word under the bookmark at the size of every other word', () => {
      const view = renderOrbs();

      const [word] = host(view, 'stat-orb-continue').findAll((node: any) => node.type === Text);
      const block = host(view, 'stat-orb-continue').findAll(
        (node: any) => node.props.style !== undefined && StyleSheet.flatten(node.props.style).top === DIAMETER * STAT_ORB.caption.top
      );

      expect(StyleSheet.flatten(word.props.style).fontSize).toBe(DIAMETER * STAT_ORB.label.size);
      expect(block.length).toBeGreaterThan(0);
    });

    it('should open the story to carry on with when tapped', () => {
      const view = renderOrbs();

      fireEvent.press(orbOf(view, 'stat-orb-continue')!);

      expect(view.onOpen).toHaveBeenCalledTimes(1);
      expect(view.onOpen).toHaveBeenCalledWith('continue');
    });

    it.each([false, true])('should tell a screen reader which story it opens, and whether it is open (%s)', (open) => {
      const view = renderOrbs({ covered: open, coverKind: 'continue' });

      const orb = orbOf(view, 'stat-orb-continue');

      expect(orb?.props.accessibilityRole).toBe('button');
      expect(orb?.props.accessibilityLabel).toBe('home.resumeStory (title:Hold On, Juni)');
      expect(orb?.props.accessibilityHint).toBe('home.continueMore');
      expect(orb?.props.accessibilityState).toEqual(expect.objectContaining({ expanded: open }));
    });

    it("should stand the bookmark in the middle of the glass, the size of the other orbs' pictures", () => {
      const view = renderOrbs();

      const bookmark = StyleSheet.flatten(host(view, 'stat-orb-continue-bookmark').props.style);
      const width = DIAMETER * STAT_ORB.bookmark.width;

      expect(bookmark).toEqual(
        expect.objectContaining({
          position: 'absolute',
          width,
          height: width * STAT_ORB.bookmark.aspect,
          top: DIAMETER * STAT_ORB.bookmark.top,
          left: (DIAMETER - width) / 2,
        })
      );
    });

    it('should be a banked-down bookmark inviting the family to read to bookmark when nothing is part-read', () => {
      const view = renderOrbs({ story: undefined });

      const orb = orbOf(view, 'stat-orb-continue');
      fireEvent.press(orb!);

      expect(wordsIn(view, 'stat-orb-continue')).toEqual(['home.statOrb.readToBookmark']);
      expect(orb?.props.accessibilityRole).toBe('button');
      expect(orb?.props.accessibilityLabel).toBe('home.statOrb.readToBookmark');
      expect(StyleSheet.flatten(host(view, 'stat-orb-continue-art').props.style).opacity).toBe(STAT_ORB.restingOpacity);
      expect(view.onExplore).toHaveBeenCalledTimes(1);
      expect(view.onOpen).not.toHaveBeenCalled();
    });
  });

  it('should invite a family with no streak yet rather than show a zero, with the orb banked down', () => {
    const view = renderOrbs({ streakDays: 0 });

    expect(wordsIn(view, 'stat-orb-streak')).toEqual(['home.streak.start']);
    expect(orbOf(view, 'stat-orb-streak')?.props.accessibilityLabel).toBe('home.streak.start');
    expect(StyleSheet.flatten(host(view, 'stat-orb-streak-art').props.style).opacity).toBe(STAT_ORB.restingOpacity);
  });

  it('should bank the badge orb down while nothing is unlocked, and still count from nought', () => {
    const view = renderOrbs({ tally: { unlocked: 0, remaining: 16 } });

    expect(wordsIn(view, 'stat-orb-badges')).toEqual(['0']);
    expect(wordsIn(view, 'stat-orb-badges')).not.toContain('home.statOrb.achieved');
    expect(StyleSheet.flatten(host(view, 'stat-orb-badges-art').props.style).opacity).toBe(STAT_ORB.restingOpacity);
  });

  it('should show a lit orb at full strength', () => {
    const view = renderOrbs();

    expect(StyleSheet.flatten(host(view, 'stat-orb-streak-art').props.style).opacity).toBe(1);
    expect(StyleSheet.flatten(host(view, 'stat-orb-continue-art').props.style).opacity).toBe(1);
  });

  it('should size each orb for the screen and stand them a little apart in one row', () => {
    const view = renderOrbs();

    const row = StyleSheet.flatten(host(view, 'stat-orbs').props.style);
    const orb = StyleSheet.flatten(host(view, 'stat-orb-continue').props.style);

    expect(row).toEqual(
      expect.objectContaining({
        flexDirection: 'row',
        width: statOrbRowWidth(DIAMETER, 3),
        height: statOrbRowHeight(DIAMETER),
        paddingTop: DIAMETER * STAT_ORB.headroom,
      })
    );
    expect(orb).toEqual(expect.objectContaining({ width: DIAMETER, height: DIAMETER }));
  });

  it('should narrow the row when there are only two orbs, so they stay centred', () => {
    const view = renderOrbs({ tally: undefined });

    expect(StyleSheet.flatten(host(view, 'stat-orbs').props.style).width).toBe(statOrbRowWidth(DIAMETER, 2));
  });

  it('should draw the art larger than the glass, centred on it, so its clouds and stars spill out', () => {
    const view = renderOrbs();

    const art = StyleSheet.flatten(host(view, 'stat-orb-streak-art').props.style);
    const spill = (DIAMETER * (STAT_ORB.artScale - 1)) / 2;

    expect(art.position).toBe('absolute');
    expect(art.width).toBeCloseTo(DIAMETER * STAT_ORB.artScale, 5);
    expect(art.height).toBeCloseTo(DIAMETER * STAT_ORB.artScale, 5);
    expect(art.left).toBeCloseTo(-spill, 5);
    expect(art.top).toBeCloseTo(-spill, 5);
  });

  it('should keep every number to one line, shrinking only a number too long for the glass', () => {
    const view = renderOrbs();

    ['stat-orb-streak', 'stat-orb-badges'].forEach((testID) => {
      const [number] = host(view, testID).findAll((node: any) => node.type === Text);

      expect(number.props.numberOfLines).toBe(1);
      expect(number.props.adjustsFontSizeToFit).toBe(true);
      expect(StyleSheet.flatten(number.props.style).lineHeight).toBeUndefined();
    });
  });

  // operator, 2026-10-04: "lower the text" -- set this low, a second line would hang out of the glass
  it('should keep a long label to one line inside the glass, shrinking only a label too long for it', () => {
    const view = renderOrbs();

    const [, label] = host(view, 'stat-orb-streak').findAll((node: any) => node.type === Text);

    expect(label.props.numberOfLines).toBe(1);
    expect(label.props.adjustsFontSizeToFit).toBe(true);
    expect(StyleSheet.flatten(label.props.style).lineHeight).toBeUndefined();
  });

  it('should write every number at one size and height', () => {
    const view = renderOrbs();

    ['stat-orb-streak', 'stat-orb-badges'].forEach((testID) => {
      const [number] = host(view, testID).findAll((node: any) => node.type === Text);
      const block = host(view, testID).findAll(
        (node: any) => node.props.style !== undefined && StyleSheet.flatten(node.props.style).top === DIAMETER * STAT_ORB.words.top
      );

      expect(StyleSheet.flatten(number.props.style).fontSize).toBe(DIAMETER * STAT_ORB.number.size);
      expect(block.length).toBeGreaterThan(0);
    });
  });

  it('should size the label from the orb, tucked up under its number', () => {
    const view = renderOrbs();

    const [, label] = host(view, 'stat-orb-streak').findAll((node: any) => node.type === Text);

    expect(StyleSheet.flatten(label.props.style)).toEqual(
      expect.objectContaining({
        fontSize: DIAMETER * STAT_ORB.label.size,
        maxWidth: DIAMETER * STAT_ORB.label.width,
        marginTop: -DIAMETER * STAT_ORB.label.tuck,
        color: '#FFFFFF',
      })
    );
  });

  it("should let an invitation take two lines at the labels' size", () => {
    const view = renderOrbs({ streakDays: 0 });

    const [invitation] = host(view, 'stat-orb-streak').findAll((node: any) => node.type === Text);

    expect(invitation.props.numberOfLines).toBe(2);
    expect(invitation.props.adjustsFontSizeToFit).toBeFalsy();
    expect(StyleSheet.flatten(invitation.props.style)).toEqual(
      expect.objectContaining({ fontSize: DIAMETER * STAT_ORB.invite.size, maxWidth: DIAMETER * STAT_ORB.invite.width })
    );
  });

  it("should not let the system's larger text settings push words off the glass", () => {
    const view = renderOrbs();

    host(view, 'stat-orbs')
      .findAll((node: any) => node.type === Text)
      .forEach((text: any) => expect(text.props.maxFontSizeMultiplier).toBe(1));
  });

  it.each(['streak', 'badges'])('should open the %s pill when its orb is tapped', (kind) => {
    const view = renderOrbs();

    fireEvent.press(orbOf(view, `stat-orb-${kind}`)!);

    expect(view.onOpen).toHaveBeenCalledTimes(1);
    expect(view.onOpen).toHaveBeenCalledWith(kind);
  });

  it('should open the streak pill even before a streak is running, to show the best there has been', () => {
    const view = renderOrbs({ streakDays: 0 });

    fireEvent.press(orbOf(view, 'stat-orb-streak')!);

    expect(view.onOpen).toHaveBeenCalledWith('streak');
  });

  it.each(['streak', 'badges'])('should tell a screen reader the %s orb shows more, and whether it is open', (kind) => {
    const shut = orbOf(renderOrbs(), `stat-orb-${kind}`);
    const open = orbOf(renderOrbs({ covered: true, coverKind: kind as 'streak' | 'badges' }), `stat-orb-${kind}`);

    expect(shut?.props.accessibilityRole).toBe('button');
    expect(shut?.props.accessibilityHint).toBe('home.continueMore');
    expect(shut?.props.accessibilityState).toEqual(expect.objectContaining({ expanded: false }));
    expect(open?.props.accessibilityState).toEqual(expect.objectContaining({ expanded: true }));
  });

  it("should not say an orb is open while another orb's pill is", () => {
    const view = renderOrbs({ covered: true, coverKind: 'streak' });

    expect(orbOf(view, 'stat-orb-badges')?.props.accessibilityState).toEqual(expect.objectContaining({ expanded: false }));
    expect(orbOf(view, 'stat-orb-continue')?.props.accessibilityState).toEqual(expect.objectContaining({ expanded: false }));
  });

  it.each([
    ['streak', 'streakRef'],
    ['continue', 'storyRef'],
    ['badges', 'badgesRef'],
  ])('should hand the tour the %s orb itself, in a host that can be measured', (kind, prop) => {
    const ref = React.createRef<any>();
    const view = renderOrbs({ [prop]: ref });

    const orb = orbOf(view, `stat-orb-${kind}`);

    expect(orb?.props.collapsable).toBe(false);
    expect(view.UNSAFE_root.findAll((node: any) => node.props.orbRef === ref).length).toBe(1);
  });

  it('should let the page beside the orbs take its own touches', () => {
    const view = renderOrbs();

    expect(host(view, 'stat-orbs').props.pointerEvents).toBe('box-none');
  });

  describe('under an open pill', () => {
    beforeEach(() => {
      const { useRef } = jest.requireActual('react');
      (useSharedValue as jest.Mock).mockImplementation((initial = 0) => useRef({ value: initial }).current);
    });

    afterEach(() => {
      (useSharedValue as jest.Mock).mockImplementation((initial = 0) => ({ value: initial }));
    });

    it('should take no touches and keep out of a screen reader\'s way', () => {
      const view = renderOrbs({ covered: true, coverKind: 'streak' });

      const row = host(view, 'stat-orbs');

      expect(row.props.pointerEvents).toBe('none');
      expect(row.props.accessibilityElementsHidden).toBe(true);
      expect(row.props.importantForAccessibility).toBe('no-hide-descendants');
    });

    it('should keep the orb the pill came out of in place until the pill has drawn its own', () => {
      const view = renderOrbs({ covered: true, coverKind: 'badges' });

      expect(StyleSheet.flatten(orbOf(view, 'stat-orb-badges')!.props.style).opacity).toBe(1);
    });

    it('should hide that orb at once when the pill carries it, leaving the others to fade', () => {
      const view = renderOrbs({ covered: true, coverKind: 'badges', carried: true });

      expect(StyleSheet.flatten(orbOf(view, 'stat-orb-badges')!.props.style).opacity).toBe(0);
      expect(StyleSheet.flatten(orbOf(view, 'stat-orb-streak')!.props.style).opacity).toBe(1);
    });

    it('should fade the other orbs away as the pill sweeps over them', () => {
      renderOrbs({ covered: true, coverKind: 'badges' });

      const fades = (withTiming as jest.Mock).mock.calls.filter(([value, config]) => value === 0 && config?.duration === STAT_PILL.coverMs);

      expect(fades).toHaveLength(2);
    });

    it('should show the orb again the moment the pill has folded back into it, and fade the others back in', () => {
      const view = renderOrbs({ covered: true, coverKind: 'badges', carried: true });
      (withTiming as jest.Mock).mockClear();

      view.rerender(
        <StatOrbs streakDays={2} story={STORY} tally={TALLY} contentWidth={CONTENT} animated={false} onOpen={view.onOpen} coverKind="badges" />
      );

      const returns = (withTiming as jest.Mock).mock.calls.filter(([value, config]) => value === 1 && config?.duration === STAT_PILL.coverMs);

      expect(StyleSheet.flatten(orbOf(view, 'stat-orb-badges')!.props.style).opacity).toBe(1);
      expect(returns).toHaveLength(2);
      expect(host(view, 'stat-orbs').props.pointerEvents).toBe('box-none');
    });
  });

  it('should float each lit orb gently, one setting off after another', () => {
    renderOrbs({ animated: true });

    const delays = (withDelay as jest.Mock).mock.calls.map(([ms]) => ms as number);

    expect(withRepeat).toHaveBeenCalledTimes(3);
    expect(delays).toEqual([statOrbFloatDelay(0), statOrbFloatDelay(1), statOrbFloatDelay(2)]);
  });

  it('should hold still when the page is not settled or motion is reduced', () => {
    renderOrbs({ animated: false });

    expect(withRepeat).not.toHaveBeenCalled();
  });

  it('should not float an orb that is banked down', () => {
    renderOrbs({ animated: true, story: undefined });

    expect(withRepeat).toHaveBeenCalledTimes(2);
  });
});
