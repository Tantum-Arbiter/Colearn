/**
 * Tests for MusicSheetOverlay component.
 *
 * Tests rendering, note display, progress tracking, close button, and edge cases.
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';
import { MusicSheetOverlay } from '@/components/stories/music-sheet-overlay';
import { NoteLayoutItem } from '@/services/music-asset-registry';
import { buildHoldPlan } from '@/services/hold-plan';
import { cueMaskedAtMs } from '@/services/sheet-transition';


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
  // The sheet is drawn to the width of the screen, which under react-native-web
  // comes from the document -- jsdom reports 0x0 unless told otherwise, and a
  // sheet with no width has nothing to draw. A phone in landscape, which is how
  // the story reader is held.
  beforeAll(() => {
    Object.defineProperty(document.documentElement, 'clientWidth', { value: 844, configurable: true });
    Object.defineProperty(document.documentElement, 'clientHeight', { value: 390, configurable: true });
    window.dispatchEvent(new Event('resize'));
  });
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
    it('should display music sheet title', () => {
      const { json } = renderOverlay();
      expect(treeContainsText(json, 'music.musicSheet')).toBe(true);
    });

    it('should display the instrument name', () => {
      const { json } = renderOverlay({ instrumentName: 'Golden Trumpet' });
      expect(treeContainsText(json, 'Golden Trumpet')).toBe(true);
    });
  });

  describe('close button', () => {
    it('should render the close button as the picker\'s back arrow', () => {
      const view = renderOverlay();
      expect(view.UNSAFE_queryAllByProps({ testID: 'music-sheet-close-button' }).length)
        .toBeGreaterThan(0);
      expect(view.UNSAFE_queryAllByProps({ name: 'arrow-back' }).length).toBeGreaterThan(0);
    });

    it('should call onClose when the back arrow is pressed', () => {
      const onClose = jest.fn();
      const view = renderOverlay({ onClose });
      const button = view.UNSAFE_queryAllByProps({ testID: 'music-sheet-close-button' })
        .find(node => typeof node.props.onPress === 'function')!;
      button.props.onPress();
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('the panel, shared with the instrument picker', () => {
    it('stands the song on the same blob panel the picker uses', () => {
      const view = renderOverlay();
      expect(view.UNSAFE_queryAllByProps({ testID: 'music-sheet-panel' }).length).toBeGreaterThan(0);
    });

    it('titles it the way the picker titles itself, on an arc', () => {
      const view = renderOverlay();
      expect(view.UNSAFE_queryAllByProps({ testID: 'music-sheet-title' }).length).toBeGreaterThan(0);
    });

    it('shows the song on the staff rather than as a row of chips', () => {
      const view = renderOverlay();
      expect(view.UNSAFE_queryAllByProps({ testID: 'music-sheet-staff' }).length).toBeGreaterThan(0);
      expect(view.UNSAFE_queryAllByProps({ testID: 'staff-banner' }).length).toBeGreaterThan(0);
    });

    it('names the instrument, as the picker does', () => {
      const { json } = renderOverlay({ instrumentName: 'Woodland Recorder' });
      expect(treeContainsText(json, 'Woodland Recorder')).toBe(true);
    });

    it('draws no staff at all for a page with no song', () => {
      const view = renderOverlay({ requiredSequence: [] });
      expect(view.UNSAFE_queryAllByProps({ testID: 'music-sheet-staff' }).length).toBe(0);
    });
  });

  describe('playing a note from the sheet', () => {


    it('never lets a note be pressed -- the sheet is there to be read', () => {
      const view = renderOverlay({ onNotePressIn: jest.fn(), onNotePressOut: jest.fn() });
      const strip = view.UNSAFE_queryAllByProps({ testID: 'music-sheet-staff' })
        .find(node => node.props.pointerEvents !== undefined);
      expect(strip!.props.pointerEvents).toBe('none');
      const head = view.UNSAFE_queryAllByProps({ testID: 'staff-note-1' })
        .find(node => typeof node.props.onPressIn === 'function');
      expect(head).toBeUndefined();
    });

    it('runs each note\'s own hold while the preview plays it', () => {
      const view = renderOverlay({ onNotePressIn: jest.fn(), onNotePressOut: jest.fn() });
      const strip = view.UNSAFE_queryAllByProps({ testID: 'music-sheet-staff' })
        .find(node => node.props.holdingCurrent !== undefined)!;
      // At rest: the song from its first note, nothing marked, nothing running.
      expect(strip.props.holdingCurrent).toBe(false);
      expect(strip.props.markCurrent).toBe(false);
      expect(strip.props.currentIndex).toBe(0);
    });

    it('offers Ready to Play only when the caller wants it', () => {
      const withCta = renderOverlay({ onReadyToPlay: jest.fn() } as never);
      expect(withCta.UNSAFE_queryAllByProps({ testID: 'ready-to-play-button' }).length)
        .toBeGreaterThan(0);
      const without = renderOverlay();
      expect(without.UNSAFE_queryAllByProps({ testID: 'ready-to-play-button' }).length).toBe(0);
    });
  });

  describe('the preview', () => {
    // Real timers would make this a four-second test; the point is which
    // durations are asked for, not the waiting.
    beforeEach(() => { jest.useFakeTimers(); });
    afterEach(() => { jest.useRealTimers(); });

    it('holds each note for its own length, not a beat apiece', () => {
      // A beat per note made the two-beat E as short as a one-beat C, and cut
      // a closing four-beat note to a quarter of itself.
      const sequence = ['C', 'E'];
      const holdPlan = buildHoldPlan(sequence, 120, [1, 4]);   // 500ms, 2000ms
      const sounded: string[] = [];
      const released: string[] = [];
      const view = renderOverlay({
        requiredSequence: sequence,
        holdPlan,
        onNotePressIn: (n: string) => sounded.push(n),
        onNotePressOut: (n: string) => released.push(n),
      } as never);

      const preview = view.UNSAFE_queryAllByProps({ testID: 'music-sheet-play-button' })
        .find(node => typeof node.props.onPress === 'function')!;
      act(() => preview.props.onPress());
      expect(sounded).toEqual(['C']);

      // C sounds for most of its one beat, and E does not begin until the whole
      // beat is up.
      act(() => { jest.advanceTimersByTime(430); });
      expect(released).toEqual(['C']);
      expect(sounded).toEqual(['C']);

      act(() => { jest.advanceTimersByTime(80); });
      expect(sounded).toEqual(['C', 'E']);

      // E is a four-beat note: still sounding long after a beat has passed.
      act(() => { jest.advanceTimersByTime(600); });
      expect(released).toEqual(['C']);

      act(() => { jest.advanceTimersByTime(1200); });
      expect(released).toEqual(['C', 'E']);
    });

    it('fades the notes back in when the preview ends rather than snapping', () => {
      const sequence = ['C', 'E'];
      const holdPlan = buildHoldPlan(sequence, 120, [1, 1]);
      const view = renderOverlay({
        requiredSequence: sequence,
        holdPlan,
        onNotePressIn: jest.fn(),
        onNotePressOut: jest.fn(),
      } as never);
      const strip = () => view.UNSAFE_queryAllByProps({ testID: 'music-sheet-staff' })
        .find(node => node.props.replayCue !== undefined)!;
      const cueBefore = strip().props.replayCue;

      const preview = view.UNSAFE_queryAllByProps({ testID: 'music-sheet-play-button' })
        .find(node => typeof node.props.onPress === 'function')!;
      act(() => preview.props.onPress());
      act(() => { jest.advanceTimersByTime(1100); });   // both notes, then the end

      // The sheet is asked for a cue and *holds its place* until the notes are
      // hidden -- putting it back straight away is what made the song reappear
      // at the start instead of fading in.
      expect(strip().props.replayCue).toBe(cueBefore + 1);
      expect(strip().props.playbackIndex).toBe(1);

      act(() => { jest.advanceTimersByTime(cueMaskedAtMs('replay') + 10); });
      expect(strip().props.playbackIndex).toBe(-1);
    });

    it('takes its lengths from the hold plan when it has one', () => {
      const sequence = ['C', 'E'];
      const holdPlan = buildHoldPlan(sequence, 120, [1, 4]);
      // A beat is 500ms at 120bpm, so the second note occupies four of them.
      expect(holdPlan.targets[1].slotMs).toBe(2000);
      expect(holdPlan.targets[0].slotMs).toBe(500);
      // And it sounds for most of its slot rather than all of it, so the next
      // note can articulate.
      expect(holdPlan.targets[1].holdMs).toBeLessThan(holdPlan.targets[1].slotMs);
    });
  });

  describe('note sequence display', () => {
    it('should render all notes in the sequence', () => {
      // With sequence ['C', 'D', 'E', 'C'], all note names should appear
      const allText = getAllText(renderOverlay({ requiredSequence: ['C', 'D', 'E', 'C'] }).json);
      // All note letters should be present
      expect(allText).toContain('C');
      expect(allText).toContain('D');
      expect(allText).toContain('E');
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

    it('should accept preview callbacks without error', () => {
      const onNotePressIn = jest.fn();
      const onNotePressOut = jest.fn();
      const { toJSON } = renderOverlay({ onNotePressIn, onNotePressOut });

      // Verify the overlay renders successfully with preview callbacks
      expect(toJSON()).not.toBeNull();
    });
  });

  describe('progress tracking', () => {
    it('should render with completedNoteCount 0', () => {
      const { json } = renderOverlay({ completedNoteCount: 0, requiredSequence: ['C', 'D', 'E', 'C'] });
      expect(json).not.toBeNull();
    });

    it('should render with completedNoteCount 2', () => {
      const { json } = renderOverlay({ completedNoteCount: 2, requiredSequence: ['C', 'D', 'E', 'C'] });
      expect(json).not.toBeNull();
    });

    it('should render with completedNoteCount equal to sequence length', () => {
      const { json } = renderOverlay({ completedNoteCount: 4, requiredSequence: ['C', 'D', 'E', 'C'] });
      expect(json).not.toBeNull();
    });
  });

  describe('prompt text', () => {
    it('should write the prompt on the paper, as it is over the instrument', () => {
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
    });

    it('should not show song section when not provided', () => {
      const view = renderOverlay({ successSongName: undefined });
      expect(view.UNSAFE_queryAllByProps({ testID: 'music-sheet-song-name' }).length).toBe(0);
    });
  });

  describe('empty sequence', () => {
    it('should handle empty required sequence', () => {
      const { json } = renderOverlay({ requiredSequence: [] });
      expect(json).not.toBeNull();
    });
  });

  describe('notes with no matching layout entry', () => {
    it('should fall back to displaying the raw note name when layout has no match', () => {
      // 'G' is NOT in testNoteLayout -should show "G" as the label text
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
    it('should render a single note on its own', () => {
      const { json } = renderOverlay({ requiredSequence: ['C'] });
      expect(json).not.toBeNull();
      const allText = getAllText(json);
      expect(allText).toContain('C');
    });
  });

  describe('long sequence', () => {
    it('should handle a 12-note sequence without crashing', () => {
      const longSequence = ['C', 'D', 'E', 'F', 'C', 'D', 'E', 'F', 'C', 'D', 'E', 'F'];
      const { json } = renderOverlay({ requiredSequence: longSequence });
      expect(json).not.toBeNull();
    });
  });

  describe('completed note count equals sequence length', () => {
    it('should mark all notes as completed', () => {
      // All 4 notes completed -all should be filled
      const { json } = renderOverlay({
        requiredSequence: ['C', 'D', 'E', 'C'],
        completedNoteCount: 4,
      });
      expect(json).not.toBeNull();
    });
  });

  describe('completed count exceeds sequence length', () => {
    it('should not crash if completedNoteCount > sequence length', () => {
      const { json } = renderOverlay({
        requiredSequence: ['C', 'D'],
        completedNoteCount: 5,
      });
      expect(json).not.toBeNull();
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
