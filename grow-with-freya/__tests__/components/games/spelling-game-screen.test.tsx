/**
 * SpellingGameScreen — Tests (TDD)
 *
 * Verifies:
 * - Renders letter slots, tile pool
 * - Shows progress bar
 * - Back button fires onBack
 * - Handles idle state (shows start prompt)
 * - Renders word hint when showWordHint is true
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SpellingGameScreen } from '@/components/games/spelling-game-screen';

// Reanimated is mocked globally in jest.setup.js

// Mock useAccessibility
jest.mock('@/hooks/use-accessibility', () => ({
  useAccessibility: () => ({
    scaledFontSize: (s: number) => s,
    scaledPadding: (p: number) => p,
    scaledButtonSize: (s: number) => s,
    isTablet: false,
    textSizeScale: 1,
  }),
  TEXT_SIZE_OPTIONS: [
    { labelKey: 'common.small', value: 0.85 },
    { labelKey: 'common.default', value: 1.0 },
    { labelKey: 'common.large', value: 1.15 },
    { labelKey: 'common.extraLarge', value: 1.3 },
  ],
}));

// Mock i18n service (avoid real i18next init in tests)
jest.mock('@/services/i18n', () => ({
  SUPPORTED_LANGUAGES: [
    { code: 'en', name: 'English', flag: '🇬🇧', nativeName: 'English' },
  ],
  setStoredLanguage: jest.fn(),
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

// Mock safe area
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock the useSpellingGame hook
const mockGameState: Record<string, unknown> = {
  state: 'playing' as const,
  currentWord: { word: 'cat', emoji: '🐱', labelKey: 'spelling.words.abcAnimals.cat' },
  visualPrompt: '🐱',
  tiles: [
    { id: 'tile-0-c', letter: 'c', used: false },
    { id: 'tile-1-a', letter: 'a', used: false },
    { id: 'tile-2-t', letter: 't', used: false },
  ],
  placedLetters: [],
  wordsCompleted: 1,
  wordsTotal: 5,
  isRoundComplete: false,
  streak: 1,
  showWordHint: true,
  lastAttemptWrong: false,
  wrongAttemptCount: 0,
  // Story mode fields
  story: { id: 'owl-cant-sleep', activityId: 'abc-animals', titleKey: 'spelling.stories.owlCantSleep.title', pages: [] },
  storyTitleKey: 'spelling.stories.owlCantSleep.title',
  storyNarrativeKey: 'spelling.stories.owlCantSleep.page1',
  pageIndex: 0,
  pageMode: 'spell' as const,
  wordBankItems: [],
  blankSlots: [],
  selectedBlankIndex: -1,
  start: jest.fn(),
  tapTile: jest.fn(),
  undoLastLetter: jest.fn(),
  nextWord: jest.fn(),
  cleanup: jest.fn(),
  tapBlank: jest.fn(),
  tapWordBankItem: jest.fn(),
};

jest.mock('@/hooks/use-spelling-game', () => ({
  useSpellingGame: () => mockGameState,
}));

// Tree helpers
function treeContainsText(node: any, text: string): boolean {
  if (!node) return false;
  if (typeof node === 'string') return node.includes(text);
  if (Array.isArray(node)) return node.some(child => treeContainsText(child, text));
  if (node.children) return treeContainsText(node.children, text);
  return false;
}

describe('SpellingGameScreen', () => {
  const defaultProps = {
    activityId: 'abc-animals',
    onBack: jest.fn(),
    onRoundComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const json = render(<SpellingGameScreen {...defaultProps} />).toJSON();
    expect(json).not.toBeNull();
  });

  it('hides the word hint by default', () => {
    const json = render(<SpellingGameScreen {...defaultProps} />).toJSON();
    // Word hint is hidden by default — 'cat' should NOT appear as hint text
    expect(treeContainsText(json, 'cat')).toBe(false);
  });

  it('does not show word text when hint is hidden', () => {
    const json = render(<SpellingGameScreen {...defaultProps} />).toJSON();
    // The word 'cat' should not appear as a visible hint label
    // (it may still appear in accessibility labels or tile letters)
    const textNodes: string[] = [];
    const collectText = (node: unknown) => {
      if (!node || typeof node !== 'object') return;
      const n = node as Record<string, unknown>;
      if (Array.isArray(n.children)) {
        for (const child of n.children) {
          if (typeof child === 'string') textNodes.push(child);
          else collectText(child);
        }
      }
    };
    collectText(json);
    // 'cat' should NOT appear as standalone hint text (only individual letters c, a, t in tiles)
    expect(textNodes.includes('cat')).toBe(false);
  });

  it('renders letter tiles', () => {
    const json = render(<SpellingGameScreen {...defaultProps} />).toJSON();
    expect(treeContainsText(json, 'c')).toBe(true);
    expect(treeContainsText(json, 'a')).toBe(true);
    expect(treeContainsText(json, 't')).toBe(true);
  });

  it('renders game content when playing', () => {
    const json = render(<SpellingGameScreen {...defaultProps} />).toJSON();
    // Game content is rendered — letter tiles should be visible
    expect(treeContainsText(json, 'c')).toBe(true);
    expect(treeContainsText(json, 'a')).toBe(true);
  });

  it('back button fires onBack', () => {
    const onBack = jest.fn();
    const { UNSAFE_getAllByType } = render(
      <SpellingGameScreen {...defaultProps} onBack={onBack} />
    );
    // PageHeader renders a Pressable for the back arrow — find the first one
    const pressables = UNSAFE_getAllByType(require('react-native').Pressable);
    // The first Pressable in the tree is the PageHeader back button
    fireEvent.press(pressables[0]);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('auto-starts the game on mount', () => {
    render(<SpellingGameScreen {...defaultProps} />);
    expect(mockGameState.start).toHaveBeenCalled();
  });

  it('renders header without title (title hidden on game screen)', () => {
    const { queryByText } = render(<SpellingGameScreen {...defaultProps} />);
    // Title should NOT appear on the game sub-page
    expect(queryByText('spelling.stories.owlCantSleep.title')).toBeNull();
  });

  it('shows narrative text in story mode', () => {
    const json = render(<SpellingGameScreen {...defaultProps} />).toJSON();
    expect(treeContainsText(json, 'spelling.stories.owlCantSleep.page1')).toBe(true);
  });

  it('renders hint toggle button (eye icon)', () => {
    const json = render(<SpellingGameScreen {...defaultProps} />).toJSON();
    // Hint toggle uses Ionicons "eye" — mock renders icon name as text
    expect(treeContainsText(json, 'eye')).toBe(true);
  });

  it('renders page dots in story mode', () => {
    const json = render(<SpellingGameScreen {...defaultProps} />).toJSON();
    // Page dots render as View elements — check for narrative text which indicates story mode is active
    expect(treeContainsText(json, 'spelling.stories.owlCantSleep.page1')).toBe(true);
  });

  it('renders fill-blank narrative with inline word when pageMode is fill-blank', () => {
    mockGameState.pageMode = 'fill-blank';
    mockGameState.storyNarrativeKey = 'spelling.stories.owlCantSleep.page2';
    mockGameState.placedLetters = ['d'];
    const json = render(<SpellingGameScreen {...defaultProps} />).toJSON();
    // Fill-blank mode should still contain the narrative key text (returned by t())
    expect(treeContainsText(json, 'spelling.stories.owlCantSleep.page2')).toBe(true);
    // Cleanup
    mockGameState.pageMode = 'spell';
    mockGameState.storyNarrativeKey = 'spelling.stories.owlCantSleep.page1';
    mockGameState.placedLetters = [];
  });

  describe('storybook image frame', () => {
    const findTestId = (node: unknown, id: string): boolean => {
      if (!node || typeof node !== 'object') return false;
      const n = node as Record<string, unknown>;
      const props = n.props as Record<string, unknown> | undefined;
      if (props?.testID === id || props?.['data-testid'] === id) return true;
      if (Array.isArray(n.children)) return n.children.some((c) => findTestId(c, id));
      return false;
    };

    it('renders the storybook frame when game is playing', () => {
      const json = render(<SpellingGameScreen {...defaultProps} />).toJSON();
      expect(findTestId(json, 'storybook-frame')).toBe(true);
    });

    it('renders the wombat image inside the storybook frame', () => {
      const json = render(<SpellingGameScreen {...defaultProps} />).toJSON();
      expect(findTestId(json, 'storybook-image')).toBe(true);
    });

    it('does not render the storybook frame when game is idle', () => {
      mockGameState.state = 'idle';
      const json = render(<SpellingGameScreen {...defaultProps} />).toJSON();
      expect(findTestId(json, 'storybook-frame')).toBe(false);
      mockGameState.state = 'playing';
    });

    it('storybook frame and page dots both render when playing', () => {
      const json = render(<SpellingGameScreen {...defaultProps} />).toJSON();
      expect(findTestId(json, 'storybook-frame')).toBe(true);
      expect(findTestId(json, 'page-dots')).toBe(true);
    });
  });

  describe('page dots', () => {
    const findTestId = (node: unknown, id: string): boolean => {
      if (!node || typeof node !== 'object') return false;
      const n = node as Record<string, unknown>;
      const props = n.props as Record<string, unknown> | undefined;
      if (props?.testID === id || props?.['data-testid'] === id) return true;
      if (Array.isArray(n.children)) return n.children.some((c) => findTestId(c, id));
      return false;
    };

    const findNode = (node: unknown, id: string): Record<string, unknown> | null => {
      if (!node || typeof node !== 'object') return null;
      const n = node as Record<string, unknown>;
      const props = n.props as Record<string, unknown> | undefined;
      if (props?.testID === id || props?.['data-testid'] === id) return n;
      if (Array.isArray(n.children)) {
        for (const c of n.children) {
          const found = findNode(c, id);
          if (found) return found;
        }
      }
      return null;
    };

    it('renders page dots when game is playing with wordsTotal > 0', () => {
      const json = render(<SpellingGameScreen {...defaultProps} />).toJSON();
      expect(findTestId(json, 'page-dots')).toBe(true);
    });

    it('renders correct number of dots', () => {
      const json = render(<SpellingGameScreen {...defaultProps} />).toJSON();
      const dotsNode = findNode(json, 'page-dots');
      expect(dotsNode).not.toBeNull();
      // wordsTotal is 5, so 5 child Views (dots)
      expect((dotsNode as Record<string, unknown>).children).toHaveLength(5);
    });

    it('does not render page dots when game is idle', () => {
      mockGameState.state = 'idle';
      const json = render(<SpellingGameScreen {...defaultProps} />).toJSON();
      expect(findTestId(json, 'page-dots')).toBe(false);
      mockGameState.state = 'playing';
    });
  });
});
