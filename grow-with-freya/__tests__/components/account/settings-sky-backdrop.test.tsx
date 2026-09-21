/**
 * Grown-ups lies below the journey pages and rises into view from beneath
 * them, so its sky carries on from where theirs ends: the deep blue at the
 * foot of every journey page at its top, falling to the darkest night below.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { SettingsSkyBackdrop } from '@/components/account/settings-sky-backdrop';
import { NIGHT_DEEP, NIGHT_VOID, SETTINGS_SKY, SKY_GRADIENT_WORLD } from '@/constants/night-palette';

const mockTimeOfDay = jest.fn(() => 'night');

jest.mock('@/hooks/use-time-of-day', () => ({
  useTimeOfDay: () => mockTimeOfDay(),
}));

function byTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((node: any) => node.props.testID === testID);
}

function gradientOf(tree: ReturnType<typeof render>) {
  return tree.UNSAFE_root.findAll((node: any) => Array.isArray(node.props.colors))[0];
}

describe('SettingsSkyBackdrop', () => {
  it('begins in the colour the journey pages end in, so the seam cannot be seen as it rises', () => {
    const tree = render(<SettingsSkyBackdrop />);

    const colours = gradientOf(tree).props.colors;

    expect(colours[0]).toBe(SKY_GRADIENT_WORLD[SKY_GRADIENT_WORLD.length - 1]);
    expect(colours[0]).toBe(NIGHT_DEEP);
  });

  it('falls to the darkest night at its foot', () => {
    const tree = render(<SettingsSkyBackdrop />);

    const colours = gradientOf(tree).props.colors;

    expect(colours).toEqual([...SETTINGS_SKY]);
    expect(colours[colours.length - 1]).toBe(NIGHT_VOID);
  });

  it.each(['night', 'day'] as const)('is the same night whatever the time of day (%s)', (timeOfDay) => {
    mockTimeOfDay.mockReturnValue(timeOfDay);

    const tree = render(<SettingsSkyBackdrop />);

    expect(gradientOf(tree).props.colors).toEqual([...SETTINGS_SKY]);
  });

  it('carries the same twinkling star field and gold stars as the home page', () => {
    const tree = render(<SettingsSkyBackdrop />);

    expect(byTestId(tree, 'star-field').length).toBeGreaterThan(0);
    expect(tree.UNSAFE_root.findAll((node: any) => typeof node.props.testID === 'string' && node.props.testID.startsWith('hero-star-')).length).toBeGreaterThan(0);
  });

  it('leaves out the sun, its halo and the earth', () => {
    const tree = render(<SettingsSkyBackdrop />);

    expect(byTestId(tree, 'hero-sky-halo')).toHaveLength(0);
    expect(tree.UNSAFE_root.findAll((node: any) => typeof node.props.testID === 'string' && /sun|horizon|earth/i.test(node.props.testID))).toHaveLength(0);
  });

  it('never takes a touch', () => {
    const tree = render(<SettingsSkyBackdrop />);

    expect(byTestId(tree, 'settings-sky-backdrop')[0].props.pointerEvents).toBe('none');
  });
});
