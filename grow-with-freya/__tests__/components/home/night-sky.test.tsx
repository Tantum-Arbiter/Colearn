/**
 * Tests for the home page's sky: the app's own colours for the time of day,
 * the stars that twinkle, and the painted planet at its foot.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, type RenderResult } from '@testing-library/react-native';
import { NightSky } from '@/components/home/night-sky';
import { planetHorizonLayout } from '@/constants/earth';
import { HOME_THEMES } from '@/constants/home-scene';

jest.mock('@/hooks/use-ambient-animation', () => ({ useSettledAfterTransition: (active: boolean) => active }));
jest.mock('@/hooks/use-reduced-motion', () => ({ useReducedMotion: () => true }));

const WIDTH = 402;
const HEIGHT = 874;
const LAYERS = ['night-sky-colour', 'star-field', 'home-horizon'];

function byTestId(view: RenderResult, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID }).filter((node) => node.props.style !== undefined);
}

describe('NightSky', () => {
  it('should lay the twinkling stars over the sky`s own colour, and the planet over both', () => {
    const view = render(<NightSky width={WIDTH} height={HEIGHT} timeOfDay="night" />);

    const order = view.UNSAFE_root
      .findAll((node) => LAYERS.includes(node.props.testID as string))
      .map((node) => node.props.testID as string)
      .filter((name, index, all) => all.indexOf(name) === index);

    expect(order).toEqual(LAYERS);
  });

  it.each(['night', 'day'] as const)('should keep the colours the %s sky had before the painting', (timeOfDay) => {
    const view = render(<NightSky width={WIDTH} height={HEIGHT} timeOfDay={timeOfDay} />);
    const theme = HOME_THEMES[timeOfDay];

    expect(byTestId(view, 'night-sky-colour')[0].props.colors).toEqual([theme.skyTop, theme.skyMid, theme.skyBottom]);
  });

  // the painting's stars and galaxy were laid over the sky and taken out the same day: too much
  it('should take nothing of the painting`s sky: no galaxy, no painted stars', () => {
    const view = render(<NightSky width={WIDTH} height={HEIGHT} timeOfDay="night" />);

    expect(view.UNSAFE_queryAllByProps({ testID: 'home-galaxy' })).toHaveLength(0);
    expect(view.UNSAFE_root.findAll((node) => /galaxy/.test(String(node.props.testID)))).toHaveLength(0);
  });

  // cloud lay along the foot of the home page for an hour and was taken off again
  it('should lay no cloud along its foot', () => {
    const view = render(<NightSky width={WIDTH} height={HEIGHT} timeOfDay="night" />);

    expect(view.UNSAFE_queryAllByProps({ testID: 'home-horizon-clouds' })).toHaveLength(0);
  });

  it('should draw the painted planet at its foot, for the screen it is given', () => {
    const view = render(<NightSky width={WIDTH} height={HEIGHT} timeOfDay="night" />);

    const planet = StyleSheet.flatten(byTestId(view, 'home-horizon-planet')[0].props.style);

    expect(planet.width).toBe(planetHorizonLayout(WIDTH, HEIGHT).width);
  });

  it('should keep its hands off the page', () => {
    const view = render(<NightSky width={WIDTH} height={HEIGHT} timeOfDay="night" />);

    expect(byTestId(view, 'night-sky')[0].props.pointerEvents).toBe('none');
  });
});
