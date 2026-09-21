/**
 * The meadow is 4:3 and no music screen is, so these are mostly about how the
 * crop is asked for: `cover` keeps the whole width in view on anything wider
 * than the art, and the bottom is what stays when there is not room for it all.
 *
 * The fitting is deliberately the platform's. Computed here from the window
 * size it was a render behind the view's own bounds, and a tablet turned on its
 * side showed a band of flat colour for a third of a second.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, type RenderResult } from '@testing-library/react-native';
import { MEADOW_GRADIENT, MEADOW_GRADIENT_STOPS, MusicBackdrop } from '@/components/music/music-backdrop';

function nodes(view: RenderResult, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID });
}

function art(view: RenderResult) {
  return nodes(view, 'music-backdrop-image').filter(node => node.props.source)[0];
}

function flatStyle(style: unknown): Record<string, unknown> {
  return StyleSheet.flatten(style as never) as Record<string, unknown>;
}

describe('MusicBackdrop', () => {
  it('covers whatever it is put on, rather than being sized to a screen', () => {
    const view = render(<MusicBackdrop />);

    expect(art(view).props.contentFit).toBe('cover');
  });

  it('keeps the bottom of the meadow when there is not room for all of it', () => {
    const view = render(<MusicBackdrop />);

    expect(art(view).props.contentPosition).toBe('bottom');
  });

  it('asks for no size of its own, so the view it fills decides', () => {
    // Anything computed here is a render behind the view during a rotation.
    const view = render(<MusicBackdrop />);

    const style = flatStyle(art(view).props.style);
    expect(style).toMatchObject({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 });
    expect(style.width).toBeUndefined();
    expect(style.height).toBeUndefined();
  });

  it('lays nothing over the art, so two of them stack to the same picture', () => {
    const view = render(<MusicBackdrop />);

    expect(nodes(view, 'blur-view').length).toBe(0);
    expect(nodes(view, 'music-backdrop-scrim').length).toBe(0);
  });

  it('keeps the meadow own tones behind the art, not a flat panel', () => {
    // A picture cannot be re-sampled in the frame a rotation resizes it; a
    // gradient is redrawn with its layer, so this is what shows through.
    const view = render(<MusicBackdrop />);

    const tones = nodes(view, 'music-backdrop-tones')[0];
    expect(tones.props.colors).toEqual([...MEADOW_GRADIENT]);
    expect(tones.props.locations).toEqual([...MEADOW_GRADIENT_STOPS]);
  });

  it('runs those tones from the sky down to the grass, as the art does', () => {
    expect(MEADOW_GRADIENT_STOPS[0]).toBe(0);
    expect(MEADOW_GRADIENT_STOPS[MEADOW_GRADIENT_STOPS.length - 1]).toBe(1);
    expect(MEADOW_GRADIENT.length).toBe(MEADOW_GRADIENT_STOPS.length);
    // Sampled off the artwork: every stop is one of its dark, desaturated tones.
    for (const stop of MEADOW_GRADIENT) {
      const [r, g, b] = [1, 3, 5].map(i => parseInt(stop.slice(i, i + 2), 16));
      expect(Math.max(r, g, b)).toBeLessThan(0x45);
    }
  });

  it('lays the tones under the art rather than over it', () => {
    const view = render(<MusicBackdrop />);

    const children = nodes(view, 'music-backdrop')[0].props.children;
    const order = React.Children.toArray(children).map((child: any) => child.props.testID);
    expect(order.indexOf('music-backdrop-tones')).toBeLessThan(order.indexOf('music-backdrop-image'));
  });

  it('keeps a colour behind everything so nothing flashes white before it loads', () => {
    const view = render(<MusicBackdrop />);

    expect(flatStyle(nodes(view, 'music-backdrop')[0].props.style).backgroundColor)
      .toBe(MEADOW_GRADIENT[0]);
  });

  it('takes no touches, so the instrument under it stays playable', () => {
    const view = render(<MusicBackdrop />);

    expect(nodes(view, 'music-backdrop')[0].props.pointerEvents).toBe('none');
  });
});
