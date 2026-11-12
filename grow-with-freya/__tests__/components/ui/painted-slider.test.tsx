import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { PaintedSlider } from '@/components/ui/painted-slider';
import { PANEL_COLOURS } from '@/components/stories/language-panel';

const WIDTH = 300;
const KNOB = { width: 44, height: 26 };

function renderSlider(value = 0.5, onValueChange = jest.fn()) {
  const view = render(<PaintedSlider testID="slider" accessibilityLabel="Music" value={value} onValueChange={onValueChange} width={WIDTH} height={40} track={8} knob={KNOB} />);
  const root = view.UNSAFE_root;
  const find = (id: string) => root.findAll((node: ReactTestInstance) => node.props.testID === id && node.props.style !== undefined)[0];
  const touch = root.findAll((node: ReactTestInstance) => node.props.testID === 'slider' && typeof node.props.onResponderGrant === 'function')[0];
  return { ...view, root, find, touch, onValueChange };
}

const at = (x: number) => ({ nativeEvent: { locationX: x, pageX: x, touches: [], changedTouches: [] }, touchHistory: { touchBank: [] } });

describe('PaintedSlider', () => {
  it.each([0, 0.5, 1])('fills the track up to its level (%p)', (value) => {
    const { find } = renderSlider(value);

    expect(StyleSheet.flatten(find('slider-fill').props.style).width).toBeCloseTo(KNOB.width / 2 + value * (WIDTH - KNOB.width));
  });

  it.each([0, 0.5, 1])('puts the knob at its level, inside the track at both ends (%p)', (value) => {
    const { find } = renderSlider(value);

    expect(StyleSheet.flatten(find('slider-knob').props.style).left).toBeCloseTo(value * (WIDTH - KNOB.width));
  });

  it('draws the knob in the close coin`s gold, the size it is given', () => {
    const { find } = renderSlider();
    const knob = StyleSheet.flatten(find('slider-knob').props.style);

    expect(knob).toEqual(expect.objectContaining({ width: KNOB.width, height: KNOB.height }));
    expect(knob.backgroundColor).toBe(PANEL_COLOURS.close.rim);
  });

  it('draws the filled track in the Done button`s purple', () => {
    const { find } = renderSlider();

    expect(StyleSheet.flatten(find('slider-fill').props.style).backgroundColor).toBe(PANEL_COLOURS.done.fill[0]);
  });

  it('jumps to where it is touched', () => {
    const { touch, onValueChange } = renderSlider(0.5);

    touch.props.onResponderGrant(at(KNOB.width / 2 + (WIDTH - KNOB.width) * 0.25));

    expect(onValueChange).toHaveBeenLastCalledWith(0.25);
  });

  it('follows a drag from where it was touched', () => {
    const { touch, onValueChange } = renderSlider(0.5);
    const start = KNOB.width / 2 + (WIDTH - KNOB.width) * 0.25;
    touch.props.onResponderGrant(at(start));

    touch.props.onResponderMove({ nativeEvent: { locationX: 0, pageX: start + (WIDTH - KNOB.width) * 0.5, touches: [], changedTouches: [] }, touchHistory: { touchBank: [] } });

    expect(onValueChange).toHaveBeenLastCalledWith(0.75);
  });

  it.each([
    ['before the start', -50, 0],
    ['past the end', WIDTH + 50, 1],
  ])('stops at the end when dragged %s', (_name, x, expected) => {
    const { touch, onValueChange } = renderSlider(0.5);

    touch.props.onResponderGrant(at(x));

    expect(onValueChange).toHaveBeenLastCalledWith(expected);
  });

  it('can be set from VoiceOver a step at a time, and says its level', () => {
    const { touch, onValueChange } = renderSlider(0.5);

    touch.props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } });
    touch.props.onAccessibilityAction({ nativeEvent: { actionName: 'decrement' } });

    expect(touch.props.accessibilityRole).toBe('adjustable');
    expect(touch.props.accessibilityLabel).toBe('Music');
    expect(touch.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 50 });
    expect(onValueChange).toHaveBeenNthCalledWith(1, 0.6);
    expect(onValueChange).toHaveBeenNthCalledWith(2, 0.4);
  });

  it('never steps past either end', () => {
    const top = renderSlider(1);
    top.touch.props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } });
    const bottom = renderSlider(0);
    bottom.touch.props.onAccessibilityAction({ nativeEvent: { actionName: 'decrement' } });

    expect(top.onValueChange).toHaveBeenLastCalledWith(1);
    expect(bottom.onValueChange).toHaveBeenLastCalledWith(0);
  });
});
