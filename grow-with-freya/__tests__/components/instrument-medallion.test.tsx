/**
 * Tests for InstrumentMedallion -the night-sky disc with its instrument, the gold
 * focus ring and the subscription lock badge.
 *
 * react-native maps to react-native-web here, so testID never reaches the DOM;
 * elements are queried by prop instead.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

import { InstrumentMedallion } from '@/components/stories/instrument-medallion';
import type { InstrumentDefinition } from '@/services/music-asset-registry';

/**
 * require() yields an opaque asset id at runtime, and react-native-web rejects a
 * bare integer source, so the fixture uses a uri object.
 */
const DISC_SOURCE = { uri: 'medallion.webp' } as unknown as number;
const THUMBNAIL_SOURCE = { uri: 'instrument.webp' } as unknown as number;

const INSTRUMENT: InstrumentDefinition = {
  id: 'recorder',
  family: 'recorder',
  displayName: 'Woodland Recorder',
  description: 'A warm recorder with a soft, woody tone',
  image: THUMBNAIL_SOURCE,
  medallion: DISC_SOURCE,
  notes: {},
  noteCount: 1,
  noteLayout: [{ note: 'C', label: '🌲', color: '#66BB6A', icon: 'tree' }],
};

type MedallionView = ReturnType<typeof render>;

function renderMedallion(props: Partial<React.ComponentProps<typeof InstrumentMedallion>> = {}) {
  return render(<InstrumentMedallion instrument={INSTRUMENT} size={120} {...props} />);
}

function byTestId(view: MedallionView, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID });
}

/** Pressable renders nested nodes that all carry the prop, so count is not 1:1. */
function hasTestId(view: MedallionView, testID: string): boolean {
  return byTestId(view, testID).length > 0;
}

function requireByTestId(view: MedallionView, testID: string) {
  const [element] = byTestId(view, testID);
  if (!element) throw new Error(`no element with testID "${testID}"`);
  return element;
}

function flatStyle(view: MedallionView, testID: string): Record<string, number> {
  return StyleSheet.flatten(requireByTestId(view, testID).props.style) as Record<string, number>;
}

describe('InstrumentMedallion', () => {
  describe('composition', () => {
    it('should draw the medallion disc from the instrument definition', () => {
      const view = renderMedallion();

      expect(requireByTestId(view, 'instrument-medallion-disc').props.source)
        .toBe(INSTRUMENT.medallion);
    });

    // No borderRadius: the artwork is already round and clipping it to a circle
    // would cut off its outer glow.
    it('should size the medallion to the requested diameter without clipping it', () => {
      const style = flatStyle(renderMedallion({ size: 160 }), 'instrument-medallion-disc');

      expect(style.width).toBe(160);
      expect(style.height).toBe(160);
      expect(style.borderRadius).toBeUndefined();
    });

    it('should fall back to a placeholder when an instrument has no medallion', () => {
      const view = render(
        <InstrumentMedallion instrument={{ ...INSTRUMENT, medallion: 0 }} size={120} />);

      expect(hasTestId(view, 'instrument-medallion-placeholder')).toBe(true);
      expect(hasTestId(view, 'instrument-medallion-disc')).toBe(false);
    });

    it('should expose the instrument id for the carousel to target', () => {
      const view = renderMedallion();

      expect(hasTestId(view, `instrument-${INSTRUMENT.id}`)).toBe(true);
    });
  });

  describe('focus glow', () => {
    // The artwork's own gold rim sits at 0.90 of its frame. The glow is a filled
    // circle that must stay under that rim so only its shadow escapes -any wider
    // and the fill shows as a hard gold edge outside the medallion.
    it('should keep the glow fill under the artwork rim', () => {
      const disc = flatStyle(renderMedallion({ size: 120 }), 'instrument-medallion-disc');
      const glow = flatStyle(renderMedallion({ size: 120 }), 'instrument-medallion-ring');

      expect(glow.width).toBeLessThan(disc.width * 0.9);
    });

    it('should centre the glow on the medallion', () => {
      const glow = flatStyle(renderMedallion({ size: 120 }), 'instrument-medallion-ring');

      expect(glow.top).toBeCloseTo((120 - glow.width) / 2, 5);
      expect(glow.left).toBeCloseTo((120 - glow.width) / 2, 5);
    });

    it('should not render a glow when the medallion is not focusable', () => {
      const view = renderMedallion({ showRing: false });

      expect(hasTestId(view, 'instrument-medallion-ring')).toBe(false);
    });
  });

  describe('locked instruments', () => {
    it('should not show a lock badge when unlocked', () => {
      const view = renderMedallion({ isLocked: false });

      expect(hasTestId(view, 'instrument-medallion-lock')).toBe(false);
    });

    it('should show a lock badge when locked', () => {
      const view = renderMedallion({ isLocked: true });

      expect(hasTestId(view, 'instrument-medallion-lock')).toBe(true);
    });

    it('should call onLockedPress when the lock badge is pressed', () => {
      const onLockedPress = jest.fn();
      const view = renderMedallion({ isLocked: true, onLockedPress });

      fireEvent.press(requireByTestId(view, 'instrument-medallion-lock'));

      expect(onLockedPress).toHaveBeenCalledTimes(1);
    });

    it('should dim the medallion when locked', () => {
      const unlocked = flatStyle(renderMedallion({ isLocked: false }), 'instrument-medallion-disc');
      const locked = flatStyle(renderMedallion({ isLocked: true }), 'instrument-medallion-disc');

      expect(locked.opacity).toBeLessThan(unlocked.opacity ?? 1);
    });
  });
});
