/**
 * Tests for the splash's sky. It is the home page's sky a moment early: the
 * splash lifts away over the home page, so anything one has and the other
 * lacks would pop in as it goes.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, type RenderResult } from '@testing-library/react-native';
import { SplashSky } from '@/components/splash/splash-sky';
import { NightSky } from '@/components/home/night-sky';

jest.mock('@/hooks/use-ambient-animation', () => ({ useSettledAfterTransition: (active: boolean) => active }));
jest.mock('@/hooks/use-reduced-motion', () => ({ useReducedMotion: () => true }));

const WIDTH = 402;
const HEIGHT = 874;

function byTestId(view: RenderResult, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID }).filter((node) => node.props.style !== undefined);
}

function flat(view: RenderResult, testID: string) {
  return StyleSheet.flatten(byTestId(view, testID)[0].props.style);
}

function renderSplash(timeOfDay: 'night' | 'day' = 'night') {
  return render(<SplashSky width={WIDTH} height={HEIGHT} timeOfDay={timeOfDay} playing={false} reduceMotion />);
}

describe('SplashSky', () => {
  it.each(['night', 'day'] as const)('should stand the same painted planet at its foot as the home page`s %s sky does', (timeOfDay) => {
    const splash = renderSplash(timeOfDay);
    const home = render(<NightSky width={WIDTH} height={HEIGHT} timeOfDay={timeOfDay} />);

    expect(flat(splash, 'splash-horizon')).toEqual(flat(home, 'home-horizon'));
    expect(flat(splash, 'splash-horizon-planet')).toEqual(flat(home, 'home-horizon-planet'));
    expect(byTestId(splash, 'splash-horizon-planet')[0].props.source).toBe(byTestId(home, 'home-horizon-planet')[0].props.source);
  });

  it('should stand the planet over its drifting stars', () => {
    const view = renderSplash();
    const names = ['star-field', 'splash-horizon'];

    const order = view.UNSAFE_root
      .findAll((node) => names.includes(node.props.testID as string))
      .map((node) => node.props.testID as string)
      .filter((name, index, all) => all.indexOf(name) === index);

    expect(order).toEqual(names);
  });
});
