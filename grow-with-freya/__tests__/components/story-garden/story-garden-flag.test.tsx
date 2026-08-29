/**
 * Tests for the Story Garden feature flag.
 *
 * SimpleStoryScreen is the single mount point for the catalogue, so it is the
 * one place that decides between the story catalogue and the Story Garden. The
 * flag must default off so the shipped experience is unchanged.
 */

import React from 'react';
import { render, type RenderResult } from '@testing-library/react-native';

let mockUseStoryGarden = false;

jest.mock('@/store/app-store', () => ({
  useAppStore: (selector?: (state: unknown) => unknown) => {
    const state = { useStoryGarden: mockUseStoryGarden };
    return selector ? selector(state) : state;
  },
}));

jest.mock('@/components/stories/catalogue/story-catalogue-screen', () => {
  const { View } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  return {
    StoryCatalogueScreen: () => ReactActual.createElement(View, { testID: 'story-catalogue' }),
  };
});

jest.mock('@/components/stories/story-garden/story-garden-screen', () => {
  const { View } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  return {
    StoryGardenScreen: () => ReactActual.createElement(View, { testID: 'story-garden' }),
  };
});

import { SimpleStoryScreen } from '@/components/stories/simple-story-screen';

function byTestId(view: RenderResult, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID });
}

function renderScreen() {
  return render(<SimpleStoryScreen onBack={jest.fn()} />);
}

describe('SimpleStoryScreen', () => {
  describe('with the flag off', () => {
    beforeEach(() => {
      mockUseStoryGarden = false;
    });

    it('should keep showing the story catalogue', () => {
      const view = renderScreen();

      expect(byTestId(view, 'story-catalogue').length).toBeGreaterThan(0);
    });

    it('should not mount the Story Garden', () => {
      const view = renderScreen();

      expect(byTestId(view, 'story-garden')).toHaveLength(0);
    });
  });

  describe('with the flag on', () => {
    beforeEach(() => {
      mockUseStoryGarden = true;
    });

    it('should show the Story Garden', () => {
      const view = renderScreen();

      expect(byTestId(view, 'story-garden').length).toBeGreaterThan(0);
    });

    it('should not mount the story catalogue at the same time', () => {
      const view = renderScreen();

      expect(byTestId(view, 'story-catalogue')).toHaveLength(0);
    });
  });
});
