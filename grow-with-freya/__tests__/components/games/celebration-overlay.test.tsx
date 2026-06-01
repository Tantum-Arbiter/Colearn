/**
 * CelebrationOverlay — Tests (TDD)
 *
 * Verifies:
 * - Renders when visible=true, null when false
 * - Shows celebration message
 * - Continue button fires onContinue
 * - Close button fires onClose
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CelebrationOverlay } from '@/components/games/celebration-overlay';

// Reanimated is mocked globally in jest.setup.js

// Mock useAccessibility
jest.mock('@/hooks/use-accessibility', () => ({
  useAccessibility: () => ({
    scaledFontSize: (s: number) => s,
    scaledPadding: (p: number) => p,
    isTablet: false,
    textSizeScale: 1,
  }),
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success' },
}));

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// Tree traversal helpers
function treeContainsText(node: any, text: string): boolean {
  if (!node) return false;
  if (typeof node === 'string') return node.includes(text);
  if (Array.isArray(node)) return node.some(child => treeContainsText(child, text));
  if (node.children) return treeContainsText(node.children, text);
  return false;
}

describe('CelebrationOverlay', () => {
  const defaultProps = {
    visible: true,
    onContinue: jest.fn(),
    onClose: jest.fn(),
  };

  it('renders content when visible is true', () => {
    const json = render(<CelebrationOverlay {...defaultProps} />).toJSON();
    expect(json).not.toBeNull();
  });

  it('returns null when visible is false', () => {
    const json = render(<CelebrationOverlay {...defaultProps} visible={false} />).toJSON();
    expect(json).toBeNull();
  });

  it('shows celebration message', () => {
    const json = render(<CelebrationOverlay {...defaultProps} />).toJSON();
    // Should contain the i18n key for the celebration message
    expect(treeContainsText(json, 'games.wellDone')).toBe(true);
  });

  it('does not show star emoji (removed)', () => {
    const json = render(<CelebrationOverlay {...defaultProps} />).toJSON();
    expect(treeContainsText(json, '⭐')).toBe(false);
  });

  it('continue button fires onContinue', () => {
    const onContinue = jest.fn();
    const { getByLabelText } = render(
      <CelebrationOverlay {...defaultProps} onContinue={onContinue} />
    );
    fireEvent.press(getByLabelText('games.continue'));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('back button fires onClose', () => {
    const onClose = jest.fn();
    const { getByLabelText } = render(
      <CelebrationOverlay {...defaultProps} onClose={onClose} />
    );
    fireEvent.press(getByLabelText('common.close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
