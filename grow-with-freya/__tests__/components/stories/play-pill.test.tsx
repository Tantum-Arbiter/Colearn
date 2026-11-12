import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { PLAY_PILL_ART, PLAY_SLIDE_MS, PlayPill, playPillFrame } from '@/components/stories/play-pill';

type Node = { children: (string | Node)[] };
const text = (node: Node): string => node.children.map((child) => (typeof child === 'string' ? child : text(child))).join('');
const BODY_W = PLAY_PILL_ART.right - PLAY_PILL_ART.left;
const BODY_H = PLAY_PILL_ART.bottom - PLAY_PILL_ART.top;

describe('playPillFrame', () => {
  it.each([[48], [55], [64]])('a pill %p tall keeps the picture`s shape: the button is its body, the drops hang below', (height) => {
    const frame = playPillFrame(height);
    const scale = height / BODY_H;

    expect(frame.width).toBeCloseTo(BODY_W * scale, 5);
    expect(frame.art).toEqual({ left: expect.closeTo(-PLAY_PILL_ART.left * scale, 5), top: expect.closeTo(-PLAY_PILL_ART.top * scale, 5), width: expect.closeTo(PLAY_PILL_ART.width * scale, 5), height: expect.closeTo(PLAY_PILL_ART.height * scale, 5) });
    expect(frame.art.top + frame.art.height).toBeGreaterThan(height);
  });
});

describe('PlayPill', () => {
  const reanimated = jest.requireMock('react-native-reanimated');
  const setup = (props: Partial<React.ComponentProps<typeof PlayPill>> = {}) => {
    const onPress = jest.fn();
    const view = render(<PlayPill testID="begin" label="Play" height={48} slideFrom={70} reduceMotion={false} onPress={onPress} {...props} />);
    const button = view.UNSAFE_root.findAll((node: ReactTestInstance) => node.props.testID === 'begin' && typeof node.props.onPress === 'function' && node.props.label === undefined)[0];
    return { view, button, onPress };
  };

  it('shows a play triangle and then the word it is given', () => {
    const { button } = setup();
    const ids = button.findAll((node: ReactTestInstance) => typeof node.props.testID === 'string').map((node: ReactTestInstance) => node.props.testID);

    expect(text(button as unknown as Node)).toBe('Play');
    expect(ids.indexOf('play-pill-icon')).toBeGreaterThanOrEqual(0);
    expect(ids.indexOf('play-pill-icon')).toBeLessThan(ids.indexOf('play-pill-label'));
  });

  it('presses through to the same start as before', () => {
    const { button, onPress } = setup();

    fireEvent.press(button);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is a button named by its word for the screen reader, its picture hidden', () => {
    const { view, button } = setup();
    const art = view.UNSAFE_root.findAll((node: ReactTestInstance) => node.props.testID === 'play-pill-art')[0];

    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityLabel).toBe('Play');
    expect(art.props.accessible).toBe(false);
  });

  it('is the size of the picture`s body, with the picture drawn round it', () => {
    const { view, button } = setup({ height: 55 });
    const frame = playPillFrame(55);
    const art = view.UNSAFE_root.findAll((node: ReactTestInstance) => node.props.testID === 'play-pill-art')[0];

    expect(StyleSheet.flatten(button.props.style)).toEqual(expect.objectContaining({ width: frame.width, height: 55 }));
    expect(StyleSheet.flatten(art.props.style)).toEqual(expect.objectContaining({ position: 'absolute', ...frame.art }));
  });

  it('slides down from just above its place as it appears, over the whole slide, fading in', () => {
    const { view } = setup({ slideFrom: 90 });
    const holder = view.UNSAFE_root.findAll((node: ReactTestInstance) => node.props.testID === 'play-pill' && node.props.entering !== undefined)[0];
    reanimated.withTiming.mockClear();

    const animation = holder.props.entering();

    expect(animation.initialValues).toEqual({ opacity: 0, transform: [{ translateY: -90 }] });
    expect(animation.animations).toEqual({ opacity: 1, transform: [{ translateY: 0 }] });
    expect(reanimated.withTiming.mock.calls.every((call: unknown[]) => (call[1] as { duration: number }).duration === PLAY_SLIDE_MS)).toBe(true);
    expect(PLAY_SLIDE_MS).toBeGreaterThanOrEqual(250);
  });

  it('slides back up the same way as it goes', () => {
    const { view } = setup({ slideFrom: 90 });
    const holder = view.UNSAFE_root.findAll((node: ReactTestInstance) => node.props.testID === 'play-pill' && node.props.exiting !== undefined)[0];

    const animation = holder.props.exiting();

    expect(animation.initialValues).toEqual({ opacity: 1, transform: [{ translateY: 0 }] });
    expect(animation.animations).toEqual({ opacity: 0, transform: [{ translateY: -90 }] });
  });

  it('under Reduce Motion simply appears and goes', () => {
    const { view } = setup({ reduceMotion: true });
    const holder = view.UNSAFE_root.findAll((node: ReactTestInstance) => node.props.testID === 'play-pill')[0];

    expect(holder.props.entering).toBeUndefined();
    expect(holder.props.exiting).toBeUndefined();
  });
});
