import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { useAnimatedStyle } from 'react-native-reanimated';
import { InteractiveElementComponent } from '@/components/stories/interactive-element';
import type { InteractiveElement } from '@/types/story';

const scene: InteractiveElement = {
  id: 'flower', type: 'reveal', image: 'file:///fixture/open.webp',
  position: { x: 0, y: 0 }, size: { width: 1, height: 1 },
  hitArea: { x: .25, y: .35, width: .2, height: .2 },
};

beforeEach(() => {
  (useAnimatedStyle as jest.Mock).mockImplementation((callback: () => object) => callback());
});

it('keeps a protected full-scene overlay aligned while toggling', () => {
  const underTest = render(<InteractiveElementComponent element={scene} containerWidth={800} containerHeight={600} storyId="fixture" isTablet />);
  const overlay = () => StyleSheet.flatten(underTest.UNSAFE_root.findByProps({ testID: 'prop-overlay-flower' }).props.style);
  expect(overlay().transform).toEqual([]);
  fireEvent.press(underTest.UNSAFE_root.findByProps({ testID: 'prop-hit-flower' }));
  expect(overlay().transform).toEqual([]);
  expect(underTest.UNSAFE_root.findByProps({ testID: 'prop-hit-flower' }).props.accessibilityState.expanded).toBe(true);
  fireEvent.press(underTest.UNSAFE_root.findByProps({ testID: 'prop-hit-flower' }));
  expect(underTest.UNSAFE_root.findByProps({ testID: 'prop-hit-flower' }).props.accessibilityState.expanded).toBe(false);
});

it('uses the independently positioned hit area', () => {
  const underTest = render(<InteractiveElementComponent element={scene} containerWidth={800} containerHeight={600} storyId="fixture" isTablet />);
  const hit = StyleSheet.flatten(underTest.UNSAFE_root.findByProps({ testID: 'prop-hit-flower' }).props.style);
  expect(hit.left).toBeCloseTo(130);
  expect(hit.top).toBeCloseTo(178.5);
  expect(hit.width).toBeCloseTo(216);
});

it('keeps cropped reveal patches at exact scene scale', () => {
  const crop = { ...scene, position: { x: .25, y: .3 }, size: { width: .2, height: .25 } };
  const underTest = render(<InteractiveElementComponent element={crop} containerWidth={800} containerHeight={600} storyId="fixture" isTablet />);
  const overlay = () => StyleSheet.flatten(underTest.UNSAFE_root.findByProps({ testID: 'prop-overlay-flower' }).props.style);
  expect(overlay().transform).toEqual([]);
  fireEvent.press(underTest.UNSAFE_root.findByProps({ testID: 'prop-hit-flower' }));
  expect(overlay().transform).toEqual([]);
});
