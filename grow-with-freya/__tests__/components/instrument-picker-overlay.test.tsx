/**
 * Tests for InstrumentPickerOverlay component.
 *
 * Tests rendering, instrument display, selection callback, visibility, and
 * default instrument pre-selection. Uses the globally mocked expo-blur and
 * reanimated (from jest.setup.js).
 */

jest.mock('@/services/music-asset-registry', () => {
  const instruments = [
    {
      id: 'flute', family: 'flute', displayName: 'Magic Flute',
      description: 'A gentle flute', medallion: { uri: 'test://flute-disc.webp' },
      notes: {}, noteCount: 6,
      noteLayout: [{ note: 'C', label: '⭐', color: '#4FC3F7', icon: 'star' }],
    },
    {
      id: 'recorder', family: 'recorder', displayName: 'Woodland Recorder',
      description: 'A warm recorder', medallion: { uri: 'test://recorder-disc.webp' },
      notes: {}, noteCount: 5,
      noteLayout: [{ note: 'C', label: '🌲', color: '#66BB6A', icon: 'tree' }],
    },
    {
      id: 'trumpet', family: 'trumpet', displayName: 'Golden Trumpet',
      description: 'A bright trumpet', medallion: { uri: 'test://trumpet-disc.webp' },
      notes: {}, noteCount: 4,
      noteLayout: [{ note: 'C', label: '🛡️', color: '#FFA000', icon: 'shield' }],
    },
  ];
  return {
    getAvailableInstrumentIds: jest.fn(() => instruments.map(i => i.id)),
    getInstrument: jest.fn((id: string) => instruments.find(i => i.id === id)),
  };
});

jest.mock('@/store/app-store', () => {
  const state = {
    getEffectiveTier: () => 'premium' as const,
    subscriptionTier: 'premium' as const,
    devTierOverride: null,
  };
  const useAppStore = (selector?: (s: any) => any) => selector ? selector(state) : state;
  useAppStore.getState = () => state;
  return { useAppStore };
});

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  InstrumentPickerOverlay,
  computePickerLayout,
  rotateInsets,
} from '@/components/stories/instrument-picker-overlay';

/**
 * Helper to search the rendered JSON tree for text content.
 * Handles arrays (reanimated mock can return array of nodes from toJSON).
 */
function treeContainsText(node: any, text: string): boolean {
  if (!node) return false;
  if (typeof node === 'string') return node.includes(text);
  if (Array.isArray(node)) return node.some(child => treeContainsText(child, text));
  if (node.children) return treeContainsText(node.children, text);
  return false;
}

/** Collect all text from the tree as a single string */
function getAllText(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(getAllText).join('');
  if (node.children) return getAllText(node.children);
  return '';
}

function renderVisible(props: Partial<React.ComponentProps<typeof InstrumentPickerOverlay>> = {}) {
  const result = render(
    <InstrumentPickerOverlay visible={true} onSelect={jest.fn()} {...props} />
  );
  return { ...result, json: result.toJSON() };
}

describe('InstrumentPickerOverlay', () => {
  describe('visibility', () => {
    it('should render content when visible is true', () => {
      const { json } = renderVisible();
      expect(json).not.toBeNull();
      expect(treeContainsText(json, 'music.chooseInstrument')).toBe(true);
    });

    it('should not render when visible is false', () => {
      const { toJSON } = render(
        <InstrumentPickerOverlay visible={false} onSelect={jest.fn()} />
      );
      expect(toJSON()).toBeNull();
    });
  });

  describe('instrument display', () => {
    it('should render all available instrument names', () => {
      const { json } = renderVisible();
      expect(treeContainsText(json, 'Magic Flute')).toBe(true);
      expect(treeContainsText(json, 'Woodland Recorder')).toBe(true);
      expect(treeContainsText(json, 'Golden Trumpet')).toBe(true);
    });

    // The panel shows one description at a time -the centred instrument's.
    it('should render the centred instrument description', () => {
      const { json } = renderVisible();
      expect(treeContainsText(json, 'A gentle flute')).toBe(true);
    });

    it('should not render the descriptions of the instruments either side', () => {
      const { json } = renderVisible();
      expect(treeContainsText(json, 'A warm recorder')).toBe(false);
      expect(treeContainsText(json, 'A bright trumpet')).toBe(false);
    });

    it('should follow the default instrument with the description', () => {
      const { json } = renderVisible({ defaultInstrumentId: 'trumpet' });
      expect(treeContainsText(json, 'A bright trumpet')).toBe(true);
      expect(treeContainsText(json, 'A gentle flute')).toBe(false);
    });
  });

  describe('title and subtitle', () => {
    it('should show chooseInstrument title', () => {
      const { json } = renderVisible();
      expect(treeContainsText(json, 'music.chooseInstrument')).toBe(true);
    });

    it('should show subtitle text', () => {
      const { json } = renderVisible();
      expect(treeContainsText(json, 'music.swipeToExplore')).toBe(true);
    });
  });

  describe('close and rotation support', () => {
    it('should render a close button', () => {
      const { getByLabelText } = renderVisible();
      expect(getByLabelText('music.closeInstrumentPicker')).toBeTruthy();
    });

    it('should accept onClose and isRotated props without error', () => {
      expect(() => renderVisible({ onClose: jest.fn(), isRotated: true })).not.toThrow();
    });
  });

  describe('subtitle text', () => {
    it('should render the tap-to-select subtitle', () => {
      const { json } = renderVisible();
      expect(treeContainsText(json, 'music.swipeToExplore')).toBe(true);
    });
  });

  describe('placeholder rendering', () => {
    it('should not render a placeholder when every instrument has a medallion', () => {
      const { json } = renderVisible();
      expect(treeContainsText(json, 'musical-note')).toBe(false);
    });

    it('should render an Ionicons musical-note placeholder when a medallion is 0', () => {
      const { getAvailableInstrumentIds, getInstrument } = require('@/services/music-asset-registry');
      getAvailableInstrumentIds.mockReturnValueOnce(['flute']);
      getInstrument.mockImplementationOnce(() => ({
        id: 'flute', family: 'flute', displayName: 'Magic Flute',
        description: 'A gentle flute', medallion: 0, notes: {}, noteCount: 6,
        noteLayout: [{ note: 'C', label: '⭐', color: '#4FC3F7', icon: 'star' }],
      }));

      const result = render(
        <InstrumentPickerOverlay visible={true} onSelect={jest.fn()} />
      );
      expect(treeContainsText(result.toJSON(), 'musical-note')).toBe(true);
    });
  });

  describe('defaultInstrumentId', () => {
    it('should accept a defaultInstrumentId prop without error', () => {
      expect(() => renderVisible({ defaultInstrumentId: 'trumpet' })).not.toThrow();
    });

    it('should accept an unknown defaultInstrumentId gracefully', () => {
      expect(() => renderVisible({ defaultInstrumentId: 'nonexistent' })).not.toThrow();
    });
  });

  describe('tap to select', () => {
    it('should accept onSelect callback prop without error', () => {
      const onSelect = jest.fn();
      expect(() => renderVisible({ onSelect })).not.toThrow();
    });

    it('should select the current instrument from the confirm button', () => {
      const onSelect = jest.fn();
      const { getByLabelText } = renderVisible({ onSelect });

      fireEvent.press(getByLabelText('music.useThisInstrument'));

      expect(onSelect).toHaveBeenCalledWith('flute');
    });

    it('should confirm the default instrument when one is provided', () => {
      const onSelect = jest.fn();
      const { getByLabelText } = renderVisible({ defaultInstrumentId: 'trumpet', onSelect });

      fireEvent.press(getByLabelText('music.useThisInstrument'));

      expect(onSelect).toHaveBeenCalledWith('trumpet');
    });
  });

  describe('no instruments available', () => {
    it('should return null when no instruments are registered', () => {
      const { getAvailableInstrumentIds } = require('@/services/music-asset-registry');
      getAvailableInstrumentIds.mockReturnValueOnce([]);

      const { toJSON } = render(
        <InstrumentPickerOverlay visible={true} onSelect={jest.fn()} />
      );
      expect(toJSON()).toBeNull();
    });
  });

  describe('single instrument', () => {
    it('should render correctly with only one instrument', () => {
      const { getAvailableInstrumentIds } = require('@/services/music-asset-registry');
      getAvailableInstrumentIds.mockReturnValueOnce(['flute']);

      const result = render(
        <InstrumentPickerOverlay visible={true} onSelect={jest.fn()} />
      );
      const json = result.toJSON();
      expect(treeContainsText(json, 'Magic Flute')).toBe(true);
      // Should not show the other instruments
      expect(treeContainsText(json, 'Woodland Recorder')).toBe(false);
      expect(treeContainsText(json, 'Golden Trumpet')).toBe(false);
    });

    it('should render instrument name with a single instrument', () => {
      const { getAvailableInstrumentIds } = require('@/services/music-asset-registry');
      getAvailableInstrumentIds.mockReturnValueOnce(['flute']);

      const result = render(
        <InstrumentPickerOverlay visible={true} onSelect={jest.fn()} />
      );
      expect(treeContainsText(result.toJSON(), 'Magic Flute')).toBe(true);
    });
  });

  describe('instrument with a real medallion source', () => {
    it('should not render the note-layout emoji when a medallion is provided', () => {
      // A uri object rather than a raw number: react-native-web's Image resolver
      // throws on bare integers.
      const { getAvailableInstrumentIds, getInstrument } = require('@/services/music-asset-registry');
      getAvailableInstrumentIds.mockReturnValueOnce(['flute']);
      getInstrument.mockImplementationOnce(() => ({
        id: 'flute', family: 'flute', displayName: 'Magic Flute',
        description: 'A gentle flute',
        medallion: { uri: 'test://flute-disc.webp' }, notes: {}, noteCount: 6,
        noteLayout: [{ note: 'C', label: '⭐', color: '#4FC3F7', icon: 'star' }],
      }));

      const result = render(
        <InstrumentPickerOverlay visible={true} onSelect={jest.fn()} />
      );
      const json = result.toJSON();
      expect(treeContainsText(json, 'Magic Flute')).toBe(true);
      expect(treeContainsText(json, '⭐')).toBe(false);
    });
  });

  describe('instrument with empty noteLayout', () => {
    it('should use fallback emoji when noteLayout is empty', () => {
      const { getAvailableInstrumentIds, getInstrument } = require('@/services/music-asset-registry');
      getAvailableInstrumentIds.mockReturnValueOnce(['flute']);
      getInstrument.mockImplementationOnce(() => ({
        id: 'flute', family: 'flute', displayName: 'Magic Flute',
        description: 'A gentle flute', medallion: 0,
        notes: {}, noteCount: 6,
        noteLayout: [],
      }));

      const result = render(
        <InstrumentPickerOverlay visible={true} onSelect={jest.fn()} />
      );
      const json = result.toJSON();
      // With empty noteLayout, fallback renders <Ionicons name="musical-note">
      expect(treeContainsText(json, 'musical-note')).toBe(true);
    });
  });

  // =============================================
  // Panel redesign -card, page dots, backdrop mode
  // react-native maps to react-native-web here, so testID never reaches the DOM;
  // elements are queried by prop instead.
  // =============================================

  describe('panel', () => {
    function byTestId(view: ReturnType<typeof renderVisible>, testID: string) {
      return view.UNSAFE_queryAllByProps({ testID });
    }

    function hasTestId(view: ReturnType<typeof renderVisible>, testID: string): boolean {
      return byTestId(view, testID).length > 0;
    }

    it('should wrap the picker content in a panel', () => {
      expect(hasTestId(renderVisible(), 'instrument-picker-panel')).toBe(true);
    });

    it('should render a medallion disc for every instrument', () => {
      const view = renderVisible();

      const discs = byTestId(view, 'instrument-medallion-disc')
        .map(element => element.props.source?.uri)
        .filter(Boolean);

      expect(new Set(discs)).toEqual(new Set([
        'test://flute-disc.webp',
        'test://recorder-disc.webp',
        'test://trumpet-disc.webp',
      ]));
    });

    it('should render one page dot per instrument', () => {
      const view = renderVisible();

      const dots = [
        ...byTestId(view, 'instrument-picker-dot'),
        ...byTestId(view, 'instrument-picker-dot-active'),
      ];

      expect(dots).toHaveLength(3);
    });

    it('should mark exactly one dot active', () => {
      const view = renderVisible();

      expect(byTestId(view, 'instrument-picker-dot-active')).toHaveLength(1);
    });

    it('should track the default instrument with the active dot', () => {
      const view = renderVisible({ defaultInstrumentId: 'trumpet' });

      expect(byTestId(view, 'instrument-picker-dot-active')[0].props.accessibilityLabel)
        .toBe('Golden Trumpet');
    });

    it('should drop the dots when only one instrument is offered', () => {
      const { getAvailableInstrumentIds } = require('@/services/music-asset-registry');
      getAvailableInstrumentIds.mockReturnValueOnce(['flute']);

      const view = render(<InstrumentPickerOverlay visible={true} onSelect={jest.fn()} />);

      expect(view.UNSAFE_queryAllByProps({ testID: 'instrument-picker-dot' })).toHaveLength(0);
    });
  });

  describe('backdrop', () => {
    function hasTestId(view: ReturnType<typeof renderVisible>, testID: string): boolean {
      return view.UNSAFE_queryAllByProps({ testID }).length > 0;
    }

    it('should blur behind the panel by default', () => {
      const view = renderVisible();

      expect(hasTestId(view, 'blur-view')).toBe(true);
      expect(hasTestId(view, 'scene-background')).toBe(false);
    });

    it('should draw a night scene when asked for one', () => {
      const view = renderVisible({ backdrop: 'scene' });

      expect(hasTestId(view, 'scene-background')).toBe(true);
    });

    it('should draw nothing behind the panel when the backdrop is none', () => {
      const view = renderVisible({ backdrop: 'none' });

      expect(hasTestId(view, 'blur-view')).toBe(false);
      expect(hasTestId(view, 'scene-background')).toBe(false);
    });

    it('should treat the legacy hideBackdrop flag as backdrop none', () => {
      const view = renderVisible({ hideBackdrop: true });

      expect(hasTestId(view, 'blur-view')).toBe(false);
      expect(hasTestId(view, 'scene-background')).toBe(false);
    });
  });

  // =============================================
  // Panel and carousel geometry
  //
  // The carousel shows the centred medallion and its two neighbours. Everything on
  // that row has to stay inside the panel, which is easy to break by nudging a size
  // constant, and impossible to see in a single rendered viewport.
  // =============================================

  describe('computePickerLayout', () => {
    const PANEL_PADDING = 20;
    const SIDE_SCALE = 0.78;

    const VIEWPORTS = [
      { name: 'unmeasured', viewportWidth: 0, viewportHeight: 0 },
      { name: 'iPhone portrait', viewportWidth: 402, viewportHeight: 874 },
      { name: 'iPhone landscape', viewportWidth: 874, viewportHeight: 402 },
      { name: 'small phone portrait', viewportWidth: 320, viewportHeight: 568 },
      { name: 'iPad portrait', viewportWidth: 834, viewportHeight: 1194 },
      { name: 'iPad landscape', viewportWidth: 1194, viewportHeight: 834 },
      { name: 'large tablet landscape', viewportWidth: 1366, viewportHeight: 1024 },
    ];

    it.each(VIEWPORTS)(
      'should keep a neighbouring medallion inside the panel on $name',
      ({ viewportWidth, viewportHeight }) => {
        const { panelWidth, medallionSize, neighbourPitch } =
          computePickerLayout({ viewportWidth, viewportHeight, itemCount: 6 });

        const neighbourOuterEdge = neighbourPitch + (medallionSize * SIDE_SCALE) / 2;

        expect(neighbourOuterEdge).toBeLessThanOrEqual(panelWidth / 2 - PANEL_PADDING);
      },
    );

    it.each(VIEWPORTS)(
      'should keep a neighbour label inside the panel on $name',
      ({ viewportWidth, viewportHeight }) => {
        const { panelWidth, neighbourPitch, labelWidth } =
          computePickerLayout({ viewportWidth, viewportHeight, itemCount: 6 });

        expect(neighbourPitch + labelWidth / 2).toBeLessThanOrEqual(panelWidth / 2 - PANEL_PADDING);
      },
    );

    it.each([2, 3, 4, 5, 6, 8])(
      'should keep a neighbouring medallion inside the panel with %i instruments',
      (itemCount) => {
        const { panelWidth, medallionSize, neighbourPitch } =
          computePickerLayout({ viewportWidth: 402, viewportHeight: 874, itemCount });

        expect(neighbourPitch + (medallionSize * SIDE_SCALE) / 2)
          .toBeLessThanOrEqual(panelWidth / 2 - PANEL_PADDING);
      },
    );

    it('should never let the panel outgrow the viewport', () => {
      VIEWPORTS.filter(v => v.viewportWidth > 0).forEach(({ viewportWidth, viewportHeight }) => {
        const { panelWidth } = computePickerLayout({ viewportWidth, viewportHeight, itemCount: 6 });

        expect(panelWidth).toBeLessThanOrEqual(viewportWidth);
      });
    });

    it('should switch to the compact rhythm only on a short viewport', () => {
      expect(computePickerLayout({ viewportWidth: 874, viewportHeight: 402, itemCount: 6 })
        .compactLayout).toBe(true);
      expect(computePickerLayout({ viewportWidth: 402, viewportHeight: 874, itemCount: 6 })
        .compactLayout).toBe(false);
    });

    it('should give a tablet a larger medallion than a landscape phone', () => {
      const tablet = computePickerLayout(
        { viewportWidth: 834, viewportHeight: 1194, itemCount: 6 });
      const phone = computePickerLayout(
        { viewportWidth: 874, viewportHeight: 402, itemCount: 6 });

      expect(tablet.medallionSize).toBeGreaterThan(phone.medallionSize);
    });
  });

  // =============================================
  // Safe-area insets in the rotated frame
  //
  // The rotated presentation draws its content turned -90 degrees inside a window
  // that is still portrait. Reading the window's insets straight through puts the
  // back button and the left arrow against the notch instead of clear of it.
  // =============================================

  describe('rotateInsets', () => {
    const PHONE = { top: 59, right: 0, bottom: 34, left: 0 };

    it('should pass insets through untouched when not rotated', () => {
      expect(rotateInsets(PHONE, false)).toEqual(PHONE);
    });

    it('should move the notch inset onto the edge it actually lies against', () => {
      expect(rotateInsets(PHONE, true).left).toBe(PHONE.top);
    });

    it('should leave the rotated top clear when the window has no right inset', () => {
      expect(rotateInsets(PHONE, true).top).toBe(PHONE.right);
    });

    it('should cycle every edge exactly one step', () => {
      const insets = { top: 1, right: 2, bottom: 3, left: 4 };

      expect(rotateInsets(insets, true)).toEqual({ top: 2, right: 3, bottom: 4, left: 1 });
    });

    it('should return to the original after four rotations', () => {
      const insets = { top: 1, right: 2, bottom: 3, left: 4 };
      const fourTimes = [1, 2, 3, 4].reduce(current => rotateInsets(current, true), insets);

      expect(fourTimes).toEqual(insets);
    });

    it('should preserve the total inset', () => {
      const total = (i: typeof PHONE) => i.top + i.right + i.bottom + i.left;

      expect(total(rotateInsets(PHONE, true))).toBe(total(PHONE));
    });
  });
});
