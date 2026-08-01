/**
 * Tests for the reader's controls layer.
 *
 * When the controls are away they must be away completely: no stray touch
 * targets over the artwork, and nothing for a screen reader to announce.
 */

import React from 'react';
import { View } from 'react-native';
import { render, type RenderResult } from '@testing-library/react-native';
import { ReaderControlsLayer } from '@/components/stories/reader/reader-controls-layer';

function byTestId(view: RenderResult, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID });
}

function renderLayer(visible: boolean) {
  return render(
    <ReaderControlsLayer visible={visible}>
      <View testID="close-book" />
    </ReaderControlsLayer>
  );
}

function renderPassthrough() {
  return render(
    <ReaderControlsLayer visible passthrough>
      <View testID="close-book" />
    </ReaderControlsLayer>
  );
}

describe('ReaderControlsLayer', () => {
  describe('with the Story Garden off', () => {
    it('should add no wrapper at all, leaving the legacy reader tree untouched', () => {
      const view = renderPassthrough();

      expect(byTestId(view, 'reader-controls-layer')).toHaveLength(0);
    });

    it('should still render the controls it was given', () => {
      const view = renderPassthrough();

      expect(byTestId(view, 'close-book').length).toBeGreaterThan(0);
    });
  });

  describe('when the controls are hidden', () => {
    it('should take no touches over the illustration', () => {
      const view = renderLayer(false);

      expect(byTestId(view, 'reader-controls-layer')[0].props.pointerEvents).toBe('none');
    });

    it('should be hidden from assistive technology', () => {
      const view = renderLayer(false);

      const layer = byTestId(view, 'reader-controls-layer')[0];

      expect(layer.props.accessibilityElementsHidden).toBe(true);
      expect(layer.props.importantForAccessibility).toBe('no-hide-descendants');
    });
  });

  describe('when the controls are showing', () => {
    it('should let taps reach the controls but not the empty space around them', () => {
      const view = renderLayer(true);

      expect(byTestId(view, 'reader-controls-layer')[0].props.pointerEvents).toBe('box-none');
    });

    it('should be available to assistive technology', () => {
      const view = renderLayer(true);

      expect(byTestId(view, 'reader-controls-layer')[0].props.accessibilityElementsHidden).toBe(false);
    });

    it('should render whatever controls it was given', () => {
      const view = renderLayer(true);

      expect(byTestId(view, 'close-book').length).toBeGreaterThan(0);
    });
  });
});
