/**
 * Tests for page navigation in the landscape reader.
 *
 * For this age range no single gesture can be the only way forward, and nothing
 * should demand precision: edge taps and the page corner both turn the page,
 * and every affordance carries a touch area well above the 56pt minimum.
 */

import React from 'react';
import { render, fireEvent, type RenderResult } from '@testing-library/react-native';
import {
  PageEdgeNavigation,
  EDGE_ZONE_WIDTH,
  PAGE_CORNER_SIZE,
} from '@/components/stories/reader/page-edge-navigation';
import { MIN_TOUCH_TARGET } from '@/constants/story-garden-motion';

function byTestId(view: RenderResult, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID });
}

function renderNav(overrides: Partial<React.ComponentProps<typeof PageEdgeNavigation>> = {}) {
  const onNext = jest.fn();
  const onPrevious = jest.fn();

  const view = render(
    <PageEdgeNavigation
      canGoNext
      canGoPrevious
      onNext={onNext}
      onPrevious={onPrevious}
      {...overrides}
    />
  );

  return { view, onNext, onPrevious, ...view };
}

describe('PageEdgeNavigation', () => {
  describe('touch targets', () => {
    it('should give the page edges a generous zone', () => {
      expect(EDGE_ZONE_WIDTH).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    });

    it('should give the page corner at least the 56-64pt invisible area', () => {
      expect(PAGE_CORNER_SIZE).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
      expect(PAGE_CORNER_SIZE).toBeLessThanOrEqual(64);
    });
  });

  describe('turning forward', () => {
    it('should turn the page on a right-edge tap', () => {
      const { getAllByLabelText, onNext } = renderNav();

      fireEvent.press(getAllByLabelText('storyGarden.nextPage')[0]);

      expect(onNext).toHaveBeenCalled();
    });

    it('should also turn the page from the visible corner', () => {
      const { view, onNext } = renderNav();

      fireEvent.press(byTestId(view, 'page-corner')[0]);

      expect(onNext).toHaveBeenCalled();
    });

    it('should not turn past the last page', () => {
      const { view, onNext } = renderNav({ canGoNext: false });

      fireEvent.press(byTestId(view, 'page-edge-next')[0]);

      expect(onNext).not.toHaveBeenCalled();
    });

    it('should hide the corner on the last page', () => {
      const { view } = renderNav({ canGoNext: false });

      expect(byTestId(view, 'page-corner')).toHaveLength(0);
    });
  });

  describe('turning back', () => {
    it('should turn back on a left-edge tap', () => {
      const { getByLabelText, onPrevious } = renderNav();

      fireEvent.press(getByLabelText('storyGarden.previousPage'));

      expect(onPrevious).toHaveBeenCalled();
    });

    it('should not turn back from the first page', () => {
      const { view, onPrevious } = renderNav({ canGoPrevious: false });

      fireEvent.press(byTestId(view, 'page-edge-previous')[0]);

      expect(onPrevious).not.toHaveBeenCalled();
    });
  });

  describe('sharing the page with interactive objects', () => {
    it('should drop the edge zones when the page has hotspots to touch', () => {
      const view = renderNav({ edgesEnabled: false });

      expect(byTestId(view, 'page-edge-previous')).toHaveLength(0);
      expect(byTestId(view, 'page-edge-next')).toHaveLength(0);
    });

    it('should keep the page corner, so there is always a way forward', () => {
      const view = renderNav({ edgesEnabled: false });

      expect(byTestId(view, 'page-corner').length).toBeGreaterThan(0);
    });

    it('should still turn the page from the corner with the edges dropped', () => {
      const { view, onNext } = renderNav({ edgesEnabled: false });

      fireEvent.press(byTestId(view, 'page-corner')[0]);

      expect(onNext).toHaveBeenCalled();
    });
  });

  describe('staying out of the way', () => {
    it('should let taps through to the illustration between the edges', () => {
      const { view } = renderNav();

      expect(byTestId(view, 'page-edge-navigation')[0].props.pointerEvents).toBe('box-none');
    });

    it('should keep the corner mark itself non-interactive', () => {
      const { view } = renderNav();

      expect(byTestId(view, 'page-corner-mark')[0].props.pointerEvents).toBe('none');
    });
  });
});
