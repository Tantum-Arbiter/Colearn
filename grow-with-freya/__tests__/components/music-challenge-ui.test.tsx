import React from 'react';
import { render, fireEvent, type RenderResult } from '@testing-library/react-native';
import { MusicChallengeUI, instrumentLowerBlockHeight, ARTWORK_TOP_MARGIN, LOWER_BLOCK_BUTTON_GAP } from '@/components/stories/music-challenge-ui';
import { layoutInstrumentSurface, layoutInstrumentStage } from '@/services/instrument-surface-layout';

let mockIsTablet = false;
jest.mock('@/hooks/use-accessibility', () => ({
  useAccessibility: () => ({
    textSizeScale: 1.0,
    scaledFontSize: (size: number) => size,
    scaledButtonSize: (size: number) => size,
    scaledPadding: (padding: number) => padding,
    isTablet: mockIsTablet,
    contentMaxWidth: 375,
    fontSizes: { tiny: 12, small: 14, body: 16, subtitle: 18, title: 24, largeTitle: 34 },
    buttonSizes: { small: 36, medium: 44, large: 56 },
  }),
}));

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
  playbackPosition: null,
  noteEvents: { subscribe: jest.fn(() => jest.fn()), emit: jest.fn() },
} as any;

const noteLayout = [
  { note: 'C', label: 'C', color: '#4FC3F7', icon: 'star' },
  { note: 'D', label: 'D', color: '#FFD54F', icon: 'moon' },
  { note: 'E', label: 'E', color: '#81C784', icon: 'leaf' },
] as any;

const artwork = { image: { uri: 'test://body.webp' } as unknown as number, aspectRatio: 4, holeDiameter: 0.02 };

const bell = {
  image: { uri: 'test://bell.webp' } as unknown as number,
  frame: { x: 0.75, y: 0, width: 0.25, height: 1 },
  origin: { x: 0.76, y: 0.5 },
  scale: { x: 1.04, y: 1.07 },
};

const holeLayout = [
  { note: 'C', label: 'C', color: '#4FC3F7', icon: 'star', hole: { x: 0.25, y: 0.5 } },
  { note: 'D', label: 'D', color: '#FFD54F', icon: 'moon', hole: { x: 0.5, y: 0.5 } },
  { note: 'E', label: 'E', color: '#81C784', icon: 'leaf', hole: { x: 0.75, y: 0.5 } },
] as any;

const surfaceBox = { width: 800, height: 400 };
const identity = (size: number) => size;
const lowerBlockHeight = instrumentLowerBlockHeight(identity, identity, true);
const stageOptions = { maxButtonSize: 60, lowerBlockHeight, topMargin: ARTWORK_TOP_MARGIN, buttonGap: LOWER_BLOCK_BUTTON_GAP };
const stageFor = (art: typeof artwork & Record<string, unknown>, layout = holeLayout, reserveRight = 8) => layoutInstrumentStage(art, layout, { ...surfaceBox, reserveRight }, stageOptions)!;
const artworkBox = { width: 800, height: stageFor(artwork).layout.height, reserveRight: 8 };

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
  fireEvent(byTestId(utils, 'instrument-region'), 'layout', { nativeEvent: { layout: surfaceBox } });
  return utils;
}

function flatStyle(style: unknown): Record<string, unknown> {
  return Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
}

describe('MusicChallengeUI', () => {
  beforeEach(() => {
    mockIsTablet = false;
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
      expect(style).toMatchObject({ width: 792, height: 198 });
    });

    it.each(['C', 'D', 'E'])('pins the %s button over its hole', (note) => {
      const expected = layoutInstrumentSurface(artwork, holeLayout, artworkBox, 60)!;

      const view = renderWithArtwork();

      const style = flatStyle(byTestId(view, `note-hole-${note}`).props.style);
      expect(style).toMatchObject({ position: 'absolute', ...expected.positions[note] });
    });

    it('sizes every hole button from the surface layout', () => {
      const expected = layoutInstrumentSurface(artwork, holeLayout, artworkBox, 60)!;

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
describe('MusicChallengeUI instrument bell', () => {
  it('draws the bell over the artwork when the instrument has one', () => {
    const view = renderWithArtwork({ artwork: { ...artwork, bell } });

    const bellImage = view.UNSAFE_queryAllByProps({ testID: 'instrument-bell' })[0];
    expect(bellImage).toBeDefined();
    expect(bellImage.props.source).toEqual(bell.image);
  });

  it('draws no bell for artwork without one', () => {
    const view = renderWithArtwork();

    expect(byTestId(view, 'instrument-bell')).toBeUndefined();
  });

  it('places the bell where the surface layout puts it', () => {
    const view = renderWithArtwork({ artwork: { ...artwork, bell } });
    const expected = stageFor({ ...artwork, bell }).layout.bell!;

    expect(flatStyle(byTestId(view, 'instrument-bell').props.style)).toMatchObject({
      left: expected.left,
      width: expected.width,
      height: expected.height,
    });
  });

  it('listens to the challenge note events so the bell moves with the sound', () => {
    const subscribe = jest.fn(() => jest.fn());
    renderWithArtwork({ artwork: { ...artwork, bell }, challenge: { ...baseChallenge, noteEvents: { subscribe, emit: jest.fn() } } });

    expect(subscribe).toHaveBeenCalled();
  });
});

describe('MusicChallengeUI melody playback highlight', () => {
  it('lights the note the hook reports as sounding and no other', () => {
    const view = renderWithArtwork({
      requiredSequence: ['C', 'D', 'E'],
      challenge: { ...baseChallenge, state: 'playing_success_song', playbackPosition: { index: 1, tick: 2 } },
    });

    const lit = view.UNSAFE_queryAllByProps({ playbackActive: true });
    expect(lit.map(node => node.props.note)).toEqual(['D']);
    expect(lit[0].props.playbackTick).toBe(2);
  });

  it('lights nothing once the melody has finished', () => {
    const view = renderWithArtwork({
      requiredSequence: ['C', 'D', 'E'],
      challenge: { ...baseChallenge, state: 'completed', isComplete: true, playbackPosition: null },
    });

    expect(view.UNSAFE_queryAllByProps({ playbackActive: true })).toHaveLength(0);
  });
});

describe('MusicChallengeUI note letters', () => {
  it('shadows the letters so they read on light buttons too', () => {
    const view = renderWithArtwork();

    const letter = view.UNSAFE_queryAllByProps({ children: 'C' }).find(node => flatStyle(node.props.style).fontWeight === '800')!;
    expect(flatStyle(letter.props.style)).toMatchObject({ color: '#FFFFFF', textShadowRadius: 2 });
  });
});

describe('MusicChallengeUI artwork placement', () => {
  it('anchors the artwork to the left edge of the surface', () => {
    const view = renderWithArtwork();

    expect(flatStyle(byTestId(view, 'instrument-surface').props.style)).toMatchObject({ alignItems: 'flex-start' });
  });

  it('keeps the artwork clear of the right safe-area inset', () => {
    const insets = { top: 0, bottom: 0, left: 0, right: 60 };
    const view = renderWithArtwork({ insetsOverride: insets });
    const expected = stageFor(artwork, holeLayout, 68).layout;

    expect(flatStyle(byTestId(view, 'instrument-artwork').props.style)).toMatchObject({ width: expected.width, height: expected.height });
  });

  it('holds the top and bottom sections at the same height before and after completion', () => {
    const before = renderWithArtwork();
    const topBefore = flatStyle(byTestId(before, 'top-section').props.style).height;
    const bottomBefore = flatStyle(byTestId(before, 'bottom-section').props.style).height;
    before.unmount();

    const after = renderWithArtwork({ challenge: { ...baseChallenge, state: 'completed', isComplete: true } });

    expect(typeof topBefore).toBe('number');
    expect(typeof bottomBefore).toBe('number');
    expect(flatStyle(byTestId(after, 'top-section').props.style).height).toBe(topBefore);
    expect(flatStyle(byTestId(after, 'bottom-section').props.style).height).toBe(bottomBefore);
  });
});

describe('MusicChallengeUI sequence row', () => {
  it('sits on a dark backdrop so the dots read over bright artwork', () => {
    const view = renderWithArtwork();

    expect(flatStyle(byTestId(view, 'sequence-container').props.style)).toMatchObject({ backgroundColor: 'rgba(0, 0, 0, 0.35)' });
  });
});

describe('MusicChallengeUI stage', () => {
  it('places the artwork so its note row sits on the middle line of the region', () => {
    const view = renderWithArtwork();
    const stage = stageFor(artwork);

    expect(flatStyle(byTestId(view, 'instrument-surface').props.style)).toMatchObject({ position: 'absolute', top: stage.surfaceTop, height: stage.layout.height });
    expect(stage.surfaceTop + 0.5 * stage.layout.height).toBeCloseTo(200, 5);
    expect(flatStyle(byTestId(view, 'top-section').props.style)).toMatchObject({ position: 'absolute', top: 0 });
  });

  it('puts the dots and controls where the stage leaves room under the buttons', () => {
    const view = renderWithArtwork();
    const stage = stageFor(artwork);

    const style = flatStyle(byTestId(view, 'lower-block').props.style);
    expect(style).toMatchObject({ position: 'absolute', left: 0, right: 0, top: stage.lowerBlockTop, height: lowerBlockHeight, alignItems: 'center', justifyContent: 'center' });
    expect(byTestId(view, 'lower-block').findAll((node: { props: { testID?: string } }) => node.props.testID === 'sequence-container').length).toBeGreaterThan(0);
  });
});
