/**
 * Tests for the instrument carousel's pulsing rings.
 *
 * The practise page stays mounted behind every other page, so the rings may
 * only pulse while that page is the one showing, and only once the slide
 * onto it has settled.
 */

import React from 'react';
import { act, render } from '@testing-library/react-native';
import { InstrumentCarousel } from '@/components/music/instrument-carousel';
import { PAGE_TRANSITION_DURATION_MS } from '@/constants/page-transition';

jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  const chain: Record<string, unknown> = new Proxy({}, { get: () => () => chain });
  return {
    Gesture: { Pan: () => chain, Tap: () => chain },
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    GestureHandlerRootView: View,
  };
});
jest.mock('@/services/story-access-service', () => ({
  StoryAccessService: { isInstrumentUnlocked: jest.fn(() => true) },
}));

const { withRepeat } = jest.requireMock('react-native-reanimated') as { withRepeat: jest.Mock };

describe('InstrumentCarousel', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    withRepeat.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should keep the rings still while its page is off screen', () => {
    render(<InstrumentCarousel selectedInstrumentId="piano" onSelect={jest.fn()} active={false} />);

    act(() => {
      jest.advanceTimersByTime(PAGE_TRANSITION_DURATION_MS * 2);
    });

    const underTest = withRepeat.mock.calls.length;

    expect(underTest).toBe(0);
  });

  it('should start pulsing once its page is showing and the slide has settled', () => {
    render(<InstrumentCarousel selectedInstrumentId="piano" onSelect={jest.fn()} active />);

    expect(withRepeat).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(PAGE_TRANSITION_DURATION_MS);
    });

    const underTest = withRepeat.mock.calls.length;

    expect(underTest).toBeGreaterThan(0);
  });
});
