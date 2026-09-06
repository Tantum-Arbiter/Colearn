/**
 * Tests for the glowing storybook-glass frame and the pieces inside it.
 *
 * The frame is layers, not a border: a blurred bloom outside, a gradient
 * stroke, a glossy inner rim, corners that catch the light. The progress bar
 * and the arrow button are the two things a child's eye lands on inside it.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { act, fireEvent, render, type RenderResult } from '@testing-library/react-native';
import { HeroCardFrame } from '@/components/home/hero-card-frame';
import { CardProgressBar } from '@/components/home/card-progress-bar';
import { CardArrowButton } from '@/components/home/card-arrow-button';
import { HERO_CARD } from '@/constants/home-sky';

interface RenderedNode {
  type: unknown;
  props: Record<string, unknown>;
}

function byTestId(view: RenderResult, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID });
}

function viewsByTestId(view: RenderResult, testID: string) {
  return byTestId(view, testID).filter((node) => node.type === View);
}

function pressableByTestId(view: RenderResult, testID: string) {
  const matches = byTestId(view, testID);

  return matches[matches.length - 1];
}

describe('HeroCardFrame', () => {
  function renderFrame(props: Partial<React.ComponentProps<typeof HeroCardFrame>> = {}) {
    const onPress = jest.fn();
    const view = render(
      <HeroCardFrame width={358} onPress={onPress} accessibilityLabel="Carry on" testID="frame" {...props}>
        <></>
      </HeroCardFrame>
    );

    return { view, onPress, ...view };
  }

  it('should bloom outside its edge rather than draw a hard line once it knows its size', () => {
    const { view } = renderFrame();

    act(() => {
      fireEvent(pressableByTestId(view, 'frame'), 'layout', { nativeEvent: { layout: { width: 358, height: 104 } } });
    });
    const glow = byTestId(view, 'frame-glow');
    const blur = view.UNSAFE_root.findAll((node: RenderedNode) => node.props.testID === 'svg-FeGaussianBlur');

    expect(glow.length).toBeGreaterThan(0);
    expect(blur.length).toBeGreaterThan(0);
  });

  it('should stroke its edge with a gradient that is brightest at the top', () => {
    const { view } = renderFrame();

    const border = byTestId(view, 'frame-border')[0];
    const colours = border.props.colors as string[];

    expect(colours).toEqual([HERO_CARD.strokeTop, HERO_CARD.strokeSide, HERO_CARD.strokeBottom]);
  });

  it('should fill with a gradient that darkens toward the bottom', () => {
    const { view } = renderFrame();

    const surface = byTestId(view, 'frame-surface')[0];

    expect(surface.props.colors).toEqual([HERO_CARD.fillTop, HERO_CARD.fillBottom]);
  });

  it('should carry a sheen, an inner rim and four lit corners', () => {
    const { view } = renderFrame();

    expect(byTestId(view, 'frame-sheen').length).toBeGreaterThan(0);
    expect(byTestId(view, 'frame-inner-highlight').length).toBeGreaterThan(0);
    expect(viewsByTestId(view, 'frame-corner-bloom').length).toBe(4);
  });

  it('should round every layer to the same corner', () => {
    const { view } = renderFrame();

    const radius = StyleSheet.flatten(byTestId(view, 'frame-border')[0].props.style).borderRadius;
    const rim = StyleSheet.flatten(byTestId(view, 'frame-inner-highlight')[0].props.style).borderRadius;

    expect(radius).toBe(HERO_CARD.radius);
    expect(rim).toBe(HERO_CARD.radius - HERO_CARD.strokeWidth);
  });

  it('should be one tappable surface that reports press state for what is inside', () => {
    const onPressStateChange = jest.fn();
    const { view, onPress } = renderFrame({ onPressStateChange });

    const pressable = pressableByTestId(view, 'frame');

    act(() => {
      fireEvent(pressable, 'pressIn');
    });
    act(() => {
      fireEvent(pressable, 'pressOut');
    });
    fireEvent.press(pressable);

    expect(onPressStateChange.mock.calls).toEqual([[true], [false]]);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(pressable.props.accessibilityRole).toBe('button');
    expect(pressable.props.accessibilityLabel).toBe('Carry on');
  });
});

describe('CardProgressBar', () => {
  it.each([
    [0.57, '57%'],
    [0, '0%'],
    [1.4, '100%'],
    [-0.2, '0%'],
  ])('should fill %s of the track as %s', (fraction, width) => {
    const view = render(<CardProgressBar fraction={fraction} testID="bar" />);

    const fill = byTestId(view, 'bar-fill')[0];

    expect(StyleSheet.flatten(fill.props.style).width).toBe(width);
  });

  it('should be a capsule with a mint-to-aqua fill and a sheen along the top of it', () => {
    const view = render(<CardProgressBar fraction={0.5} testID="bar" />);

    const track = StyleSheet.flatten(byTestId(view, 'bar-track')[0].props.style);
    const fill = byTestId(view, 'bar-fill')[0];

    expect(track.borderRadius).toBe(track.height / 2);
    expect(fill.props.colors).toEqual([HERO_CARD.progressFrom, HERO_CARD.progressTo]);
    expect(byTestId(view, 'bar-sheen').length).toBeGreaterThan(0);
  });
});

describe('CardArrowButton', () => {
  it('should be a golden disc with a highlight, a glow and a dark arrow', () => {
    const view = render(<CardArrowButton size={52} pressed={false} testID="arrow" />);

    const disc = byTestId(view, 'arrow-disc')[0];

    expect(disc.props.colors).toEqual([HERO_CARD.arrowTop, HERO_CARD.arrowBottom]);
    expect(byTestId(view, 'arrow-highlight').length).toBeGreaterThan(0);
    expect(byTestId(view, 'arrow-glow').length).toBeGreaterThan(0);
    expect(byTestId(view, 'arrow-glyph').length).toBeGreaterThan(0);
    expect(view.UNSAFE_root.findAll((node: RenderedNode) => node.props.testID === 'svg-Path' && node.props.stroke === HERO_CARD.arrowInk).length).toBe(1);
  });

  it('should size the disc to what it is asked', () => {
    const view = render(<CardArrowButton size={52} pressed={false} testID="arrow" />);

    const disc = StyleSheet.flatten(byTestId(view, 'arrow-disc')[0].props.style);

    expect(disc.width).toBe(52);
    expect(disc.borderRadius).toBe(26);
  });
});
