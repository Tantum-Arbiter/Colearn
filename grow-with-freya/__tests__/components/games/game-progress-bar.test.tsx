/**
 * GameProgressBar — Tests (TDD)
 *
 * Verifies:
 * - Renders correct number of dots
 * - Renders progress label
 * - Handles 0 completed and all completed
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { GameProgressBar } from '@/components/games/game-progress-bar';

// Mock Reanimated
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// Mock useAccessibility
jest.mock('@/hooks/use-accessibility', () => ({
  useAccessibility: () => ({
    scaledFontSize: (s: number) => s,
    scaledPadding: (p: number) => p,
    isTablet: false,
    textSizeScale: 1,
  }),
}));

// Helper to check tree for text
function treeContainsText(node: any, text: string): boolean {
  if (!node) return false;
  if (typeof node === 'string') return node.includes(text);
  if (Array.isArray(node)) return node.some(child => treeContainsText(child, text));
  if (node.children) return treeContainsText(node.children, text);
  return false;
}

// Count leaf View nodes (dots) inside the dots row (first child of root)
function countDots(json: any): number {
  // Root is a row View containing [dotsRow View, label Text]
  if (!json || !json.children) return 0;
  const dotsRow = json.children[0]; // First child is dots row
  if (!dotsRow || !dotsRow.children) return 0;
  return dotsRow.children.length;
}

describe('GameProgressBar', () => {
  it('renders the correct total number of dot elements', () => {
    const json = render(<GameProgressBar completed={0} total={5} />).toJSON();
    expect(countDots(json)).toBe(5);
  });

  it('renders different counts correctly', () => {
    const json3 = render(<GameProgressBar completed={2} total={3} />).toJSON();
    expect(countDots(json3)).toBe(3);
    const json7 = render(<GameProgressBar completed={5} total={7} />).toJSON();
    expect(countDots(json7)).toBe(7);
  });

  it('renders progress label with completed and total', () => {
    const json = render(<GameProgressBar completed={2} total={5} />).toJSON();
    expect(treeContainsText(json, '2')).toBe(true);
    expect(treeContainsText(json, '5')).toBe(true);
  });

  it('handles zero completed', () => {
    const json = render(<GameProgressBar completed={0} total={4} />).toJSON();
    expect(countDots(json)).toBe(4);
    expect(treeContainsText(json, '0')).toBe(true);
  });

  it('handles all completed', () => {
    const json = render(<GameProgressBar completed={4} total={4} />).toJSON();
    expect(countDots(json)).toBe(4);
    expect(treeContainsText(json, '4')).toBe(true);
  });

  it('renders with no dots when total is 0', () => {
    const json = render(<GameProgressBar completed={0} total={0} />).toJSON();
    expect(countDots(json)).toBe(0);
  });
});
