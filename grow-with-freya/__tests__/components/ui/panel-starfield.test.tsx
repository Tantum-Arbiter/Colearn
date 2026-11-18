/**
 * The stars behind a night-sky panel are laid into whatever the cloud bank
 * leaves, so a star can never come to rest on a cloud however the panel is
 * shaped. These pin that promise, and the geometry the two share.
 */

import React from 'react';
import { act, render, type RenderResult } from '@testing-library/react-native';
import { PanelStarfield } from '@/components/ui/panel-starfield';
import { CLOUD_SCALE, cloudBandHeight } from '@/components/ui/panel-clouds';

const WIDTH = 320;
const HEIGHT = 400;

function byTestId(view: RenderResult, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID });
}

interface Speck {
  top: number;
  left: number;
  size: number;
}

/** Every absolutely-placed speck the field has drawn. */
function specks(view: RenderResult): Speck[] {
  return view.UNSAFE_root
    .findAll((node: any) => {
      const style = [node.props.style]
        .flat(Infinity)
        .filter(Boolean)
        .reduce((merged: any, part: any) => ({ ...merged, ...part }), {});
      // The field's own container fills its parent, so it pins bottom too;
      // a speck only ever sets left and top.
      return style.position === 'absolute'
        && typeof style.top === 'number'
        && style.bottom === undefined;
    })
    .map((node: any) => {
      const style = [node.props.style]
        .flat(Infinity)
        .filter(Boolean)
        .reduce((merged: any, part: any) => ({ ...merged, ...part }), {});
      return { top: style.top as number, left: style.left as number, size: style.fontSize ?? style.height ?? 0 };
    });
}

function measured(props: Partial<React.ComponentProps<typeof PanelStarfield>> = {}) {
  const view = render(<PanelStarfield {...props} />);

  // Passing testID explicitly makes the component element match it as well as
  // the view inside, so measure whichever node actually carries onLayout.
  const box = byTestId(view, props.testID ?? 'panel-starfield')
    .find((node: any) => typeof node.props.onLayout === 'function');

  act(() => {
    box!.props.onLayout({ nativeEvent: { layout: { width: WIDTH, height: HEIGHT, x: 0, y: 0 } } });
  });

  return view;
}

describe('PanelStarfield', () => {
  it('draws nothing until the panel has been measured', () => {
    const view = render(<PanelStarfield />);

    expect(specks(view)).toHaveLength(0);
  });

  it('keeps every star clear of the cloud bank', () => {
    const view = measured();

    const clear = HEIGHT - cloudBandHeight(WIDTH, CLOUD_SCALE);
    const drawn = specks(view);

    expect(drawn.length).toBeGreaterThan(0);
    for (const speck of drawn) {
      expect(speck.top + speck.size).toBeLessThanOrEqual(clear);
    }
  });

  it('reserves more room when the clouds are drawn larger', () => {
    const small = specks(measured({ cloudScale: 0.2, testID: 'small' }));
    const large = specks(measured({ cloudScale: 0.5, testID: 'large' }));

    // The same star sits higher once the bank below it grows.
    const lowestSmall = Math.max(...small.map((speck) => speck.top));
    const lowestLarge = Math.max(...large.map((speck) => speck.top));

    expect(lowestLarge).toBeLessThan(lowestSmall);
  });

  it('uses the whole panel height when it carries no clouds', () => {
    const withClouds = specks(measured({ testID: 'with' }));
    const without = specks(measured({ withoutClouds: true, testID: 'without' }));

    const lowestWith = Math.max(...withClouds.map((speck) => speck.top));
    const lowestWithout = Math.max(...without.map((speck) => speck.top));

    expect(lowestWithout).toBeGreaterThan(lowestWith);
    expect(lowestWithout).toBeLessThanOrEqual(HEIGHT);
  });
});
