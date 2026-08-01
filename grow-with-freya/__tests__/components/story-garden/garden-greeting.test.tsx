/**
 * Tests for the Story Garden greeting.
 *
 * The greeting sets the tone for the whole screen, so it has to match the time
 * of day and use the child's name when the app knows it.
 *
 * Note: jest.config maps `react-native` to `react-native-web`, so host nodes are
 * DOM elements and getByTestId does not resolve. Queries here use text and
 * UNSAFE_*ByType, matching the pattern in the rest of this suite.
 */

import React from 'react';
import { Text } from 'react-native';
import { render, type RenderResult } from '@testing-library/react-native';
import { GardenGreeting, getTimeOfDay } from '@/components/stories/story-garden/garden-greeting';

function textContents(view: RenderResult): string[] {
  return view
    .UNSAFE_queryAllByType(Text)
    .map((node) => node.props.children)
    .filter((child): child is string => typeof child === 'string');
}

describe('getTimeOfDay', () => {
  it.each([
    [0, 'morning'],
    [6, 'morning'],
    [11, 'morning'],
    [12, 'afternoon'],
    [15, 'afternoon'],
    [17, 'afternoon'],
    [18, 'evening'],
    [23, 'evening'],
  ])('should treat hour %p as %p', (hour, expected) => {
    const date = new Date(2026, 6, 28, hour, 0, 0);

    const underTest = getTimeOfDay(date);

    expect(underTest).toBe(expected);
  });
});

describe('GardenGreeting', () => {
  describe('with a known child', () => {
    it('should greet them by name', () => {
      const view = render(
        <GardenGreeting nickname="Freya" now={new Date(2026, 6, 28, 19, 0, 0)} />
      );

      expect(textContents(view)).toContain('storyGarden.greeting.eveningNamed (name:Freya)');
    });
  });

  describe('without a name', () => {
    it('should still greet the time of day', () => {
      const view = render(
        <GardenGreeting nickname={null} now={new Date(2026, 6, 28, 9, 0, 0)} />
      );

      expect(textContents(view)).toContain('storyGarden.greeting.morning');
    });

    it('should not leak an interpolation placeholder', () => {
      const view = render(
        <GardenGreeting nickname={null} now={new Date(2026, 6, 28, 9, 0, 0)} />
      );

      expect(textContents(view).some((text) => text.includes('name:'))).toBe(false);
    });
  });

  describe('the invitation', () => {
    it('should ask which story to share rather than label a catalogue', () => {
      const view = render(<GardenGreeting nickname={null} />);

      expect(textContents(view)).toContain('storyGarden.invitation');
    });
  });
});
