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
      description: 'A gentle flute', image: 0, notes: {}, noteCount: 6,
      noteLayout: [{ note: 'C', label: '⭐', color: '#4FC3F7', icon: 'star' }],
    },
    {
      id: 'recorder', family: 'recorder', displayName: 'Woodland Recorder',
      description: 'A warm recorder', image: 0, notes: {}, noteCount: 5,
      noteLayout: [{ note: 'C', label: '🌲', color: '#66BB6A', icon: 'tree' }],
    },
    {
      id: 'trumpet', family: 'trumpet', displayName: 'Golden Trumpet',
      description: 'A bright trumpet', image: 0, notes: {}, noteCount: 4,
      noteLayout: [{ note: 'C', label: '🛡️', color: '#FFA000', icon: 'shield' }],
    },
  ];
  return {
    getAvailableInstrumentIds: jest.fn(() => instruments.map(i => i.id)),
    getInstrument: jest.fn((id: string) => instruments.find(i => i.id === id)),
  };
});

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { InstrumentPickerOverlay } from '@/components/stories/instrument-picker-overlay';

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

    it('should render instrument descriptions', () => {
      const { json } = renderVisible();
      expect(treeContainsText(json, 'A gentle flute')).toBe(true);
      expect(treeContainsText(json, 'A warm recorder')).toBe(true);
      expect(treeContainsText(json, 'A bright trumpet')).toBe(true);
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
    it('should render emoji placeholders when instrument image is 0', () => {
      const { json } = renderVisible();
      // All test instruments have image: 0, so placeholders should show
      expect(treeContainsText(json, '⭐')).toBe(true); // flute
      expect(treeContainsText(json, '🌲')).toBe(true); // recorder
      expect(treeContainsText(json, '🛡️')).toBe(true); // trumpet
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

  describe('instrument with real image source', () => {
    it('should not render placeholder emoji when instrument has a valid image', () => {
      // Use a require()-style source object instead of a raw number to avoid
      // react-native-web Image resolver throwing on bare integers
      const { getAvailableInstrumentIds, getInstrument } = require('@/services/music-asset-registry');
      getAvailableInstrumentIds.mockReturnValueOnce(['flute']);
      getInstrument.mockImplementationOnce(() => ({
        id: 'flute', family: 'flute', displayName: 'Magic Flute',
        description: 'A gentle flute', image: { uri: 'test://flute.png' }, notes: {}, noteCount: 6,
        noteLayout: [{ note: 'C', label: '⭐', color: '#4FC3F7', icon: 'star' }],
      }));

      const result = render(
        <InstrumentPickerOverlay visible={true} onSelect={jest.fn()} />
      );
      const json = result.toJSON();
      expect(treeContainsText(json, 'Magic Flute')).toBe(true);
      // Placeholder emoji should NOT appear since image is provided (image !== 0)
      expect(treeContainsText(json, '⭐')).toBe(false);
    });
  });

  describe('instrument with empty noteLayout', () => {
    it('should use fallback emoji when noteLayout is empty', () => {
      const { getAvailableInstrumentIds, getInstrument } = require('@/services/music-asset-registry');
      getAvailableInstrumentIds.mockReturnValueOnce(['flute']);
      getInstrument.mockImplementationOnce(() => ({
        id: 'flute', family: 'flute', displayName: 'Magic Flute',
        description: 'A gentle flute', image: 0, notes: {}, noteCount: 6,
        noteLayout: [],
      }));

      const result = render(
        <InstrumentPickerOverlay visible={true} onSelect={jest.fn()} />
      );
      const json = result.toJSON();
      // With empty noteLayout, fallback should be '🎵'
      expect(treeContainsText(json, '🎵')).toBe(true);
    });
  });
});
