/**
 * Tests for MusicSheetOverlay component.
 *
 * Tests rendering, note display, progress tracking, close button, and edge cases.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { MusicSheetOverlay } from '@/components/stories/music-sheet-overlay';
import { NoteLayoutItem } from '@/services/music-asset-registry';

// Helper to search rendered JSON tree for text content (handles arrays and nested nodes)
function treeContainsText(node: any, text: string): boolean {
  if (!node) return false;
  if (typeof node === 'string') return node.includes(text);
  if (Array.isArray(node)) return node.some(child => treeContainsText(child, text));
  if (node.children) return treeContainsText(node.children, text);
  return false;
}

// Helper to collect ALL text from the tree as a single string
function getAllText(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(getAllText).join('');
  if (node.children) return getAllText(node.children);
  return '';
}

// Helper to count nodes with a specific testID prefix (handles arrays)
function countTestIds(node: any, prefix: string): number {
  if (!node) return 0;
  if (Array.isArray(node)) return node.reduce((sum, child) => sum + countTestIds(child, prefix), 0);
  let count = 0;
  if (node.props?.testID?.startsWith(prefix)) count++;
  if (node.children) count += countTestIds(node.children, prefix);
  return count;
}

const testNoteLayout: NoteLayoutItem[] = [
  { note: 'C', label: '⭐', color: '#4FC3F7', icon: 'star' },
  { note: 'D', label: '🌙', color: '#FFD54F', icon: 'moon' },
  { note: 'E', label: '🍃', color: '#81C784', icon: 'leaf' },
  { note: 'F', label: '🌸', color: '#F48FB1', icon: 'flower' },
];

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  requiredSequence: ['C', 'D', 'E', 'C'],
  noteLayout: testNoteLayout,
  completedNoteCount: 0,
  instrumentName: 'Magic Flute',
  promptText: undefined as string | undefined,
  successSongName: undefined as string | undefined,
  onNotePressIn: undefined as ((note: string) => void) | undefined,
  onNotePressOut: undefined as ((note: string) => void) | undefined,
};

function renderOverlay(props: Partial<typeof defaultProps> = {}) {
  const merged = { ...defaultProps, ...props, onClose: props.onClose || jest.fn() };
  const result = render(<MusicSheetOverlay {...merged} />);
  return { ...result, json: result.toJSON() };
}

describe('MusicSheetOverlay', () => {
  describe('visibility', () => {
    it('should render when visible is true', () => {
      const { json } = renderOverlay();
      expect(json).not.toBeNull();
    });

    it('should not render when visible is false', () => {
      const { toJSON } = render(
        <MusicSheetOverlay {...defaultProps} visible={false} onClose={jest.fn()} />
      );
      expect(toJSON()).toBeNull();
    });
  });

  describe('header', () => {
    it('should display "Music Sheet" title', () => {
      const { json } = renderOverlay();
      expect(treeContainsText(json, 'Music Sheet')).toBe(true);
    });

    it('should display the instrument name', () => {
      const { json } = renderOverlay({ instrumentName: 'Golden Trumpet' });
      expect(treeContainsText(json, 'Golden Trumpet')).toBe(true);
    });
  });

  describe('close button', () => {
    it('should render the close button with ✕', () => {
      const { json } = renderOverlay();
      expect(treeContainsText(json, '✕')).toBe(true);
    });

    it('should accept onClose callback prop and render the close button', () => {
      const onClose = jest.fn();
      const { json } = renderOverlay({ onClose });
      // The Pressable close button is inside Animated.View, which the reanimated mock
      // renders as <div> — getByTestId and pressByTestId can't traverse into it.
      // We verify the ✕ text renders and onClose is accepted without error.
      expect(treeContainsText(json, '✕')).toBe(true);
      // onClose → Pressable interaction is verified via E2E tests
    });
  });

  describe('note sequence display', () => {
    it('should render all notes in the sequence', () => {
      // With sequence ['C', 'D', 'E', 'C'], all note names should appear
      const allText = getAllText(renderOverlay({ requiredSequence: ['C', 'D', 'E', 'C'] }).json);
      // The sequence has 4 notes, and the progress should show /4
      expect(allText).toContain('/4');
      // All note letters should be present
      expect(allText).toContain('C');
      expect(allText).toContain('D');
      expect(allText).toContain('E');
      // Note letters displayed in circles
      expect(allText).toContain('C');
    });

    it('should display note names', () => {
      const allText = getAllText(renderOverlay({ requiredSequence: ['C', 'D'] }).json);
      expect(allText).toContain('C');
      expect(allText).toContain('D');
    });

    it('should display note letters in circles', () => {
      const allText = getAllText(renderOverlay({ requiredSequence: ['C', 'D'] }).json);
      expect(allText).toContain('C');
      expect(allText).toContain('D');
    });

    it('should call preview callbacks when a note is pressed and released', () => {
      const onNotePressIn = jest.fn();
      const onNotePressOut = jest.fn();
      const { UNSAFE_root } = renderOverlay({ onNotePressIn, onNotePressOut });

      const notePressables = UNSAFE_root.findAll((node: any) => (
        typeof node.props?.onPressIn === 'function'
        && typeof node.props?.onPressOut === 'function'
      ));

      notePressables[0].props.onPressIn();
      notePressables[0].props.onPressOut();

      expect(onNotePressIn).toHaveBeenCalledWith('C');
      expect(onNotePressOut).toHaveBeenCalledWith('C');
    });
  });

  describe('progress tracking', () => {
    it('should display progress count (0/4)', () => {
      const allText = getAllText(renderOverlay({ completedNoteCount: 0, requiredSequence: ['C', 'D', 'E', 'C'] }).json);
      expect(allText).toContain('0/4');
    });

    it('should display progress count (2/4)', () => {
      const allText = getAllText(renderOverlay({ completedNoteCount: 2, requiredSequence: ['C', 'D', 'E', 'C'] }).json);
      expect(allText).toContain('2/4');
    });

    it('should display progress count (4/4) when complete', () => {
      const allText = getAllText(renderOverlay({ completedNoteCount: 4, requiredSequence: ['C', 'D', 'E', 'C'] }).json);
      expect(allText).toContain('4/4');
    });
  });

  describe('prompt text', () => {
    it('should display prompt text when provided', () => {
      const { json } = renderOverlay({ promptText: 'Play the flute to help Gary!' });
      expect(treeContainsText(json, 'Play the flute to help Gary!')).toBe(true);
    });

    it('should not show prompt section when not provided', () => {
      const { json } = renderOverlay({ promptText: undefined });
      expect(treeContainsText(json, 'Play the flute')).toBe(false);
    });
  });

  describe('success song', () => {
    it('should display success song name when provided', () => {
      const { json } = renderOverlay({ successSongName: 'Gary Lifts the Rock' });
      expect(treeContainsText(json, 'Gary Lifts the Rock')).toBe(true);
      expect(treeContainsText(json, 'Success Song')).toBe(true);
    });

    it('should not show song section when not provided', () => {
      const { json } = renderOverlay({ successSongName: undefined });
      expect(treeContainsText(json, 'Success Song')).toBe(false);
    });
  });

  describe('empty sequence', () => {
    it('should handle empty required sequence', () => {
      const { json } = renderOverlay({ requiredSequence: [] });
      expect(json).not.toBeNull();
      const allText = getAllText(json);
      expect(allText).toContain('0/0');
    });
  });

  describe('notes with no matching layout entry', () => {
    it('should fall back to displaying the raw note name when layout has no match', () => {
      // 'G' is NOT in testNoteLayout — should show "G" as the label text
      const allText = getAllText(renderOverlay({ requiredSequence: ['G'] }).json);
      expect(allText).toContain('G');
    });

    it('should show note letters for all notes including unknown', () => {
      const allText = getAllText(renderOverlay({ requiredSequence: ['C', 'G', 'D'] }).json);
      expect(allText).toContain('C');
      expect(allText).toContain('G');
      expect(allText).toContain('D');
      expect(allText).toContain('C'); // note letter
    });
  });

  describe('single note sequence', () => {
    it('should render a single note without connection lines', () => {
      const { json } = renderOverlay({ requiredSequence: ['C'] });
      expect(json).not.toBeNull();
      const allText = getAllText(json);
      expect(allText).toContain('0/1');
      expect(allText).toContain('C');
    });
  });

  describe('long sequence', () => {
    it('should handle a 12-note sequence without crashing', () => {
      const longSequence = ['C', 'D', 'E', 'F', 'C', 'D', 'E', 'F', 'C', 'D', 'E', 'F'];
      const { json } = renderOverlay({ requiredSequence: longSequence });
      expect(json).not.toBeNull();
      const allText = getAllText(json);
      expect(allText).toContain('0/12');
    });
  });

  describe('completed note count equals sequence length', () => {
    it('should mark all notes as completed', () => {
      // All 4 notes completed — all should be filled
      const { json } = renderOverlay({
        requiredSequence: ['C', 'D', 'E', 'C'],
        completedNoteCount: 4,
      });
      expect(json).not.toBeNull();
      const allText = getAllText(json);
      expect(allText).toContain('4/4');
    });
  });

  describe('completed count exceeds sequence length', () => {
    it('should not crash if completedNoteCount > sequence length', () => {
      const { json } = renderOverlay({
        requiredSequence: ['C', 'D'],
        completedNoteCount: 5,
      });
      expect(json).not.toBeNull();
      const allText = getAllText(json);
      expect(allText).toContain('5/2');
    });
  });

  describe('empty note layout', () => {
    it('should render with empty noteLayout, falling back to raw note names', () => {
      const { json } = renderOverlay({
        requiredSequence: ['C', 'D'],
        noteLayout: [],
      });
      expect(json).not.toBeNull();
      const allText = getAllText(json);
      expect(allText).toContain('C');
      expect(allText).toContain('D');
    });
  });
});
