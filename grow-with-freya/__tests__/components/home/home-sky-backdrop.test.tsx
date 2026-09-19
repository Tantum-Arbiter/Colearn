/**
 * The home page's sky without its sun and earth, for pages that should feel
 * like the same night: the same time-of-day gradient, the same twinkling field
 * and the same gold stars, placed where the home page places them.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { HomeSkyBackdrop } from '@/components/home/home-sky-backdrop';
import { HOME_THEMES } from '@/constants/home-scene';

const mockTimeOfDay = jest.fn(() => 'night');

jest.mock('@/hooks/use-time-of-day', () => ({
  useTimeOfDay: () => mockTimeOfDay(),
}));

function byTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((node: any) => node.props.testID === testID);
}

describe('HomeSkyBackdrop', () => {
  it.each(['night', 'day'] as const)('paints the home page\'s %s sky', (timeOfDay) => {
    mockTimeOfDay.mockReturnValue(timeOfDay);
    const theme = HOME_THEMES[timeOfDay];

    const tree = render(<HomeSkyBackdrop />);

    const gradient = tree.UNSAFE_root.findAll((node: any) => Array.isArray(node.props.colors))[0];
    expect(gradient.props.colors).toEqual([theme.skyTop, theme.skyMid, theme.skyBottom]);
    expect(gradient.props.locations).toEqual([0, 0.5, 1]);
  });

  it.each(['night', 'day'] as const)(
    'turns the %s sky over for a page that sits above home, so its foot meets home\'s top',
    (timeOfDay) => {
      mockTimeOfDay.mockReturnValue(timeOfDay);
      const theme = HOME_THEMES[timeOfDay];

      const tree = render(<HomeSkyBackdrop above />);

      const gradient = tree.UNSAFE_root.findAll((node: any) => Array.isArray(node.props.colors))[0];
      expect(gradient.props.colors).toEqual([theme.skyBottom, theme.skyMid, theme.skyTop]);
      expect(gradient.props.colors[gradient.props.colors.length - 1]).toBe(theme.skyTop);
    }
  );

  it('carries the same twinkling star field and gold stars as the home page', () => {
    const tree = render(<HomeSkyBackdrop />);

    expect(byTestId(tree, 'star-field').length).toBeGreaterThan(0);
    expect(tree.UNSAFE_root.findAll((node: any) => typeof node.props.testID === 'string' && node.props.testID.startsWith('hero-star-')).length).toBeGreaterThan(0);
  });

  it('leaves out the sun, its halo and the earth', () => {
    const tree = render(<HomeSkyBackdrop />);

    expect(byTestId(tree, 'hero-sky-halo')).toHaveLength(0);
    expect(tree.UNSAFE_root.findAll((node: any) => typeof node.props.testID === 'string' && /sun|horizon|earth/i.test(node.props.testID))).toHaveLength(0);
  });

  it('never takes a touch', () => {
    const tree = render(<HomeSkyBackdrop />);

    expect(byTestId(tree, 'home-sky-backdrop')[0].props.pointerEvents).toBe('none');
  });
});
