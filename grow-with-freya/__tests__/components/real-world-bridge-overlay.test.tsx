/**
 * Real World Bridge Overlay — Component Tests (TDD)
 *
 * Tests written BEFORE implementation to define the component contract:
 * - Renders nothing when not visible
 * - Renders narration text from bridge data
 * - Renders 3 adventure cards with correct categories
 * - Dismiss button fires onDismiss callback
 * - Falls back gracefully for unknown activity IDs
 * - Renders skill pills for each adventure
 * - Renders closing encouragement text
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RealWorldBridgeOverlay } from '@/components/learning/real-world-bridge-overlay';

// Helper to search rendered JSON tree for text content
function treeContainsText(node: any, text: string): boolean {
  if (!node) return false;
  if (typeof node === 'string') return node.includes(text);
  if (Array.isArray(node)) return node.some(child => treeContainsText(child, text));
  if (node.children) return treeContainsText(node.children, text);
  return false;
}

// Helper to count nodes with a specific testID prefix
function countTestIds(node: any, prefix: string): number {
  if (!node) return 0;
  if (Array.isArray(node)) return node.reduce((sum, child) => sum + countTestIds(child, prefix), 0);
  let count = 0;
  if (node.props?.testID?.startsWith(prefix)) count++;
  if (node.children) count += countTestIds(node.children, prefix);
  return count;
}

const defaultProps = {
  visible: true,
  activityId: 'abc-animals',
  gameSection: 'spelling' as 'spelling' | 'numbers' | 'feelings',
  onDismiss: jest.fn(),
};

function renderOverlay(props: Partial<typeof defaultProps> = {}) {
  const merged = { ...defaultProps, ...props, onDismiss: props.onDismiss || jest.fn() };
  const result = render(<RealWorldBridgeOverlay {...merged} />);
  return { ...result, json: result.toJSON() };
}

describe('RealWorldBridgeOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('visibility', () => {
    it('should render content when visible is true', () => {
      const { json } = renderOverlay();
      expect(json).not.toBeNull();
    });

    it('should not render when visible is false', () => {
      const { toJSON } = render(
        <RealWorldBridgeOverlay {...defaultProps} visible={false} onDismiss={jest.fn()} />
      );
      expect(toJSON()).toBeNull();
    });
  });

  describe('narration', () => {
    it('should render the narration i18n key', () => {
      const { json } = renderOverlay();
      // The i18n mock returns the key as-is
      expect(treeContainsText(json, 'bridge.spelling.abcAnimals.narration')).toBe(true);
    });

    it('should render the closing encouragement', () => {
      const { json } = renderOverlay();
      expect(treeContainsText(json, 'bridge.spelling.abcAnimals.closing')).toBe(true);
    });
  });

  describe('adventure cards', () => {
    it('should render all 3 adventure descriptions', () => {
      const { json } = renderOverlay();
      // All three adventure description keys must appear
      expect(treeContainsText(json, 'bridge.spelling.abcAnimals.home')).toBe(true);
      expect(treeContainsText(json, 'bridge.spelling.abcAnimals.outdoors')).toBe(true);
      expect(treeContainsText(json, 'bridge.spelling.abcAnimals.creative')).toBe(true);
    });

    it('should render category labels', () => {
      const { json } = renderOverlay();
      // Category i18n keys
      expect(treeContainsText(json, 'bridge.atHome')).toBe(true);
      expect(treeContainsText(json, 'bridge.outdoors')).toBe(true);
      expect(treeContainsText(json, 'bridge.creative')).toBe(true);
    });
  });

  describe('dismiss', () => {
    it('should render back arrow icon', () => {
      const { json } = renderOverlay();
      // Back button uses Ionicons "chevron-back" icon — mock renders the name as text
      expect(treeContainsText(json, 'chevron-back')).toBe(true);
    });

    it('should call onDismiss when back button is pressed', () => {
      const onDismiss = jest.fn();
      const { getByLabelText } = renderOverlay({ onDismiss });
      // Back button has accessibilityLabel="common.back" (mocked t() returns key)
      fireEvent.press(getByLabelText('common.back'));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('fallback for unknown activity', () => {
    it('should render nothing for an unknown activity ID', () => {
      const { toJSON } = render(
        <RealWorldBridgeOverlay
          visible={true}
          activityId="nonexistent"
          gameSection="spelling"
          onDismiss={jest.fn()}
        />
      );
      expect(toJSON()).toBeNull();
    });
  });

  describe('works across game sections', () => {
    it('should render bridge for a numbers activity', () => {
      const { json } = renderOverlay({ activityId: 'counting-fun', gameSection: 'numbers' });
      expect(json).not.toBeNull();
      expect(treeContainsText(json, 'bridge.numbers.countingFun.narration')).toBe(true);
    });

    it('should render bridge for a feelings activity', () => {
      const { json } = renderOverlay({ activityId: 'happy-faces', gameSection: 'feelings' });
      expect(json).not.toBeNull();
      expect(treeContainsText(json, 'bridge.feelings.happyFaces.narration')).toBe(true);
    });
  });
});
