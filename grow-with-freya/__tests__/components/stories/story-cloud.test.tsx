import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { CLOUD_ART, CLOUD_TEXT_INSET, CLOUD_THEMES, StoryCloud, cloudFrame, cloudInset, type CloudTheme } from '@/components/stories/story-cloud';

const BODY = CLOUD_ART.bottom - CLOUD_ART.top;
const THEMES: CloudTheme[] = ['stories', 'music'];
const named = (frame: ReturnType<typeof cloudFrame>, name: string) => frame.pieces.find((piece) => piece.name === name)!;
const sizes: [string, number, number][] = [
  ['a phone`s two-line box', 592, 78],
  ['a tablet`s two-line box', 900, 108],
  ['a record-mode box', 592, 126],
];
const cases = THEMES.flatMap((theme) => sizes.map(([name, width, height]) => [theme, name, width, height] as [CloudTheme, string, number, number]));

describe('cloudFrame', () => {
  it.each(cases)('%s cloud, %s: the ends and the sun keep their drawn shape', (theme, _name, width, height) => {
    const frame = cloudFrame(width, height, theme);
    const scale = height / BODY;
    const [leftCut, crownStart, crownEnd, rightCut] = CLOUD_THEMES[theme].cuts;

    expect(frame.scale).toBeCloseTo(scale, 6);
    expect(named(frame, 'left').width).toBeCloseTo(leftCut * scale, 4);
    expect(named(frame, 'crown').width).toBeCloseTo((crownEnd - crownStart) * scale, 4);
    expect(named(frame, 'right').width).toBeCloseTo((CLOUD_ART.width - rightCut) * scale, 4);
  });

  it.each(cases)('%s cloud, %s: the plain stretches share the rest, so the body spans the box exactly', (theme, _name, width, height) => {
    const frame = cloudFrame(width, height, theme);
    const left = named(frame, 'left');
    const right = named(frame, 'right');

    expect(named(frame, 'stretch-left').width).toBeCloseTo(named(frame, 'stretch-right').width, 4);
    expect(left.x).toBeCloseTo(-CLOUD_ART.left * frame.scale, 4);
    expect(right.x + right.width - (CLOUD_ART.width - CLOUD_ART.right) * frame.scale).toBeCloseTo(width, 4);
  });

  it.each(cases)('%s cloud, %s: the pieces overlap a little where they meet, so no hairline of the page shows', (theme, _name, width, height) => {
    const { pieces } = cloudFrame(width, height, theme);

    expect(pieces.map((piece) => piece.name)).toEqual(['left', 'stretch-left', 'crown', 'stretch-right', 'right']);
    for (let i = 1; i < pieces.length; i += 1) {
      expect(pieces[i].x).toBeLessThan(pieces[i - 1].x + pieces[i - 1].width);
      expect(pieces[i].x).toBeGreaterThan(pieces[i - 1].x + pieces[i - 1].width - 2);
    }
  });

  it('the music cloud cuts its right end wider, so the trumpet is never stretched', () => {
    expect(CLOUD_THEMES.music.cuts[3]).toBeLessThan(CLOUD_THEMES.stories.cuts[3]);
    expect(named(cloudFrame(592, 78, 'music'), 'right').width).toBeGreaterThan(named(cloudFrame(592, 78, 'stories'), 'right').width);
  });

  it('a book with no theme given gets the stories cloud', () => {
    expect(cloudFrame(592, 78)).toEqual(cloudFrame(592, 78, 'stories'));
  });

  it('draws the whole picture tall enough that the body fills the box and the sun rises above it', () => {
    const frame = cloudFrame(592, 78);

    expect(frame.top).toBeCloseTo(-CLOUD_ART.top * frame.scale, 4);
    expect(frame.height).toBeCloseTo(CLOUD_ART.height * frame.scale, 4);
    expect(frame.top).toBeLessThan(0);
  });

  it.each(THEMES)('a box too narrow for the %s cloud`s ends and sun shrinks the cloud to fit and centres it, rather than squashing it', (theme) => {
    const [leftCut, crownStart, crownEnd, rightCut] = CLOUD_THEMES[theme].cuts;
    const fixed = leftCut - CLOUD_ART.left + (crownEnd - crownStart) + (CLOUD_ART.right - rightCut);
    const frame = cloudFrame(100, 78, theme);

    expect(frame.scale).toBeCloseTo(100 / fixed, 6);
    expect(named(frame, 'stretch-left').width).toBeLessThanOrEqual(1);
    expect(frame.top + CLOUD_ART.top * frame.scale).toBeCloseTo((78 - BODY * frame.scale) / 2, 4);
  });

  it('draws nothing until the box has a size', () => {
    expect(cloudFrame(0, 78).pieces).toHaveLength(0);
    expect(cloudFrame(592, 0).pieces).toHaveLength(0);
  });
});

describe('cloudInset', () => {
  const insets = THEMES.flatMap((theme) => [78, 108, 126].map((height) => [theme, height] as [CloudTheme, number]));

  it.each(insets)('keeps the words clear of the %s cloud`s end pictures in a box %p tall', (theme, height) => {
    expect(cloudInset(height, theme)).toBeGreaterThanOrEqual(CLOUD_THEMES[theme].decoration * (height / BODY) + 4);
  });

  it('the music cloud`s instruments reach further in than the faces, so its words sit further in', () => {
    expect(cloudInset(78, 'music')).toBeGreaterThan(cloudInset(78, 'stories'));
  });

  it('never closer to the edge than the box`s old padding', () => {
    expect(cloudInset(10)).toBe(CLOUD_TEXT_INSET);
    expect(cloudInset(10, 'music')).toBe(CLOUD_TEXT_INSET);
  });
});

describe('StoryCloud', () => {
  const pieces = (root: ReactTestInstance) => {
    const found = root.findAll((node) => String(node.props.testID).startsWith('story-cloud-') && node.props.source !== undefined);
    return found.filter((node, i) => found.findIndex((other) => other.props.testID === node.props.testID) === i);
  };
  const laidOut = (theme?: CloudTheme) => {
    const view = render(<StoryCloud theme={theme} />);
    const holder = view.UNSAFE_root.findAll((node) => node.props.testID === 'story-cloud')[0];
    act(() => fireEvent(holder, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 592, height: 78 } } }));
    return view;
  };

  it('measures its box, then lays the five pieces out to fill it', () => {
    const view = render(<StoryCloud />);
    expect(pieces(view.UNSAFE_root)).toHaveLength(0);
    view.unmount();

    const drawn = pieces(laidOut().UNSAFE_root);
    const frame = cloudFrame(592, 78);
    expect(drawn).toHaveLength(5);
    drawn.forEach((node, i) => {
      expect(StyleSheet.flatten(node.props.style)).toEqual(expect.objectContaining({ position: 'absolute', left: frame.pieces[i].x, width: frame.pieces[i].width, top: frame.top, height: frame.height }));
    });
  });

  it('the music cloud is laid out by its own cuts and says which cloud it is', () => {
    const view = laidOut('music');
    const drawn = pieces(view.UNSAFE_root);
    const frame = cloudFrame(592, 78, 'music');

    expect(view.UNSAFE_root.findAll((node) => node.props.testID === 'story-cloud' && node.props.nativeID === 'story-cloud-music')).not.toHaveLength(0);
    drawn.forEach((node, i) => {
      expect(StyleSheet.flatten(node.props.style)).toEqual(expect.objectContaining({ left: frame.pieces[i].x, width: frame.pieces[i].width }));
    });
  });

  it('is decoration only: no touches, nothing for the screen reader', () => {
    const view = render(<StoryCloud />);
    const holder = view.UNSAFE_root.findAll((node) => node.props.testID === 'story-cloud')[0];

    expect(holder.props.pointerEvents).toBe('none');
    expect(holder.props.accessibilityElementsHidden).toBe(true);
    expect(holder.props.importantForAccessibility).toBe('no-hide-descendants');
  });
});
