import React from 'react';
import { render, fireEvent, type RenderResult } from '@testing-library/react-native';
import { MusicChallengeUI } from '@/components/stories/music-challenge-ui';
import { layoutInstrumentSurface } from '@/services/instrument-surface-layout';

const baseChallenge = {
  state: 'awaiting_input',
  instrument: null,
  sequenceProgress: 0,
  currentNoteIndex: 0,
  totalNotes: 3,
  nextExpectedNote: 'C',
  isBreathActive: false,
  lastInputCorrect: null,
  failedAttempts: 0,
  isComplete: false,
  hasError: false,
  missingAssets: [],
  start: jest.fn(),
  playNote: jest.fn(),
  previewNote: jest.fn(),
  stopNote: jest.fn(),
  setBreathActive: jest.fn(),
  retry: jest.fn(),
  skip: jest.fn(),
  cleanup: jest.fn(),
  goHarder: jest.fn(),
  difficultyLevel: 1,
  currentSequence: [],
  resolvedBpm: 120,
} as any;

const noteLayout = [
  { note: 'C', label: 'C', color: '#4FC3F7', icon: 'star' },
  { note: 'D', label: 'D', color: '#FFD54F', icon: 'moon' },
  { note: 'E', label: 'E', color: '#81C784', icon: 'leaf' },
] as any;

const artwork = { image: { uri: 'test://body.webp' } as unknown as number, aspectRatio: 4, holeDiameter: 0.02 };

const holeLayout = [
  { note: 'C', label: 'C', color: '#4FC3F7', icon: 'star', hole: { x: 0.25, y: 0.5 } },
  { note: 'D', label: 'D', color: '#FFD54F', icon: 'moon', hole: { x: 0.5, y: 0.5 } },
  { note: 'E', label: 'E', color: '#81C784', icon: 'leaf', hole: { x: 0.75, y: 0.5 } },
] as any;

const surfaceBox = { width: 800, height: 400 };

function byTestId(view: RenderResult, testID: string) {
  const matches = view.UNSAFE_queryAllByProps({ testID });
  return matches[matches.length - 1];
}

function renderWithArtwork(overrides: Record<string, unknown> = {}) {
  const utils = render(
    <MusicChallengeUI
      challenge={baseChallenge}
      promptText="Play"
      requiredSequence={['C', 'D']}
      noteLayout={holeLayout}
      artwork={artwork}
      showBreathButton={false}
      {...overrides}
    />
  );
  fireEvent(byTestId(utils, 'instrument-surface'), 'layout', { nativeEvent: { layout: surfaceBox } });
  return utils;
}

function flatStyle(style: unknown): Record<string, unknown> {
  return Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
}

describe('MusicChallengeUI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('instrument artwork', () => {
    it('draws the instrument artwork once the surface has been measured', () => {
      const view = renderWithArtwork();

      expect(byTestId(view, 'instrument-artwork')).toBeTruthy();
    });

    it('draws the generic tube when the instrument has no artwork', () => {
      const view = render(
        <MusicChallengeUI
          challenge={baseChallenge}
          promptText="Play"
          requiredSequence={['C']}
          noteLayout={noteLayout}
          showBreathButton={false}
        />
      );

      expect(byTestId(view, 'instrument-tube')).toBeTruthy();
      expect(byTestId(view, 'instrument-artwork')).toBeUndefined();
    });

    it('sizes the artwork to fit the measured surface', () => {
      const view = renderWithArtwork();

      const style = flatStyle(byTestId(view, 'instrument-artwork').props.style);
      expect(style).toMatchObject({ width: 800, height: 200 });
    });

    it.each(['C', 'D', 'E'])('pins the %s button over its hole', (note) => {
      const expected = layoutInstrumentSurface(artwork, holeLayout, surfaceBox, 60)!;

      const view = renderWithArtwork();

      const style = flatStyle(byTestId(view, `note-hole-${note}`).props.style);
      expect(style).toMatchObject({ position: 'absolute', ...expected.positions[note] });
    });

    it('sizes every hole button from the surface layout', () => {
      const expected = layoutInstrumentSurface(artwork, holeLayout, surfaceBox, 60)!;

      const view = renderWithArtwork();

      const style = flatStyle(byTestId(view, 'note-disc-C').props.style);
      expect(style).toMatchObject({ width: expected.buttonSize, height: expected.buttonSize });
    });

    it('plays and stops the note from a hole button with the shared touch handlers', () => {
      const view = renderWithArtwork();

      fireEvent(byTestId(view, 'note-button-D'), 'touchStart');
      fireEvent(byTestId(view, 'note-button-D'), 'touchEnd');

      expect(baseChallenge.playNote).toHaveBeenCalledWith('D');
      expect(baseChallenge.stopNote).toHaveBeenCalledWith('D');
    });

    it('leaves out a note whose layout has no hole', () => {
      const partial = [...holeLayout, { note: 'F', label: 'F', color: '#FFFFFF' }] as any;

      const view = renderWithArtwork({ noteLayout: partial });

      expect(byTestId(view, 'note-button-F')).toBeUndefined();
    });
  });

  it('renders the music sheet floating button when onMusicSheet is provided', () => {
    const { getByLabelText } = render(
      <MusicChallengeUI
        challenge={baseChallenge}
        promptText="Play the flute!"
        requiredSequence={['C', 'D', 'E']}
        noteLayout={noteLayout}
        showBreathButton={false}
        onMusicSheet={jest.fn()}
      />
    );

    expect(getByLabelText('music.openMusicSheet')).toBeTruthy();
  });

  it('calls onMusicSheet when the music sheet button is pressed', () => {
    const onMusicSheet = jest.fn();
    const { getByLabelText } = render(
      <MusicChallengeUI
        challenge={baseChallenge}
        promptText="Play the flute!"
        requiredSequence={['C', 'D', 'E']}
        noteLayout={noteLayout}
        showBreathButton={false}
        onMusicSheet={onMusicSheet}
      />
    );

    fireEvent.press(getByLabelText('music.openMusicSheet'));
    expect(onMusicSheet).toHaveBeenCalledTimes(1);
  });
});