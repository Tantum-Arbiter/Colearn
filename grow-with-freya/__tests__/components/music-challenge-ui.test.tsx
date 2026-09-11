import React from 'react';
import { render, fireEvent, act, type RenderResult } from '@testing-library/react-native';
import { MusicChallengeUI, instrumentLowerBlockHeight, ARTWORK_TOP_MARGIN, LOWER_BLOCK_BUTTON_GAP, STAFF_SHEET_OVERLAP } from '@/components/stories/music-challenge-ui';
import { layoutStaffStrip } from '@/services/staff-notation';
import { buildHoldPlan } from '@/services/hold-plan';
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
  skip: jest.fn(),
  cleanup: jest.fn(),
  currentSequence: [],
  resolvedBpm: 120,
  playbackPosition: null,
  noteEvents: { subscribe: jest.fn(() => jest.fn()), emit: jest.fn() },
  holdPlan: buildHoldPlan(['C', 'D'], 120, [1, 2]),
  holdingIndex: null,
  hasCompleted: false,
  wrongCue: 0,
  replayCue: 0,
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
  it('sits on a dark backdrop so the progress line reads over bright artwork', () => {
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

  it('puts the progress line and controls where the stage leaves room under the buttons', () => {
    const view = renderWithArtwork();
    const stage = stageFor(artwork);

    const style = flatStyle(byTestId(view, 'lower-block').props.style);
    expect(style).toMatchObject({ position: 'absolute', left: 0, right: 0, top: stage.lowerBlockTop, height: lowerBlockHeight, alignItems: 'center', justifyContent: 'center' });
    expect(byTestId(view, 'lower-block').findAll((node: { props: { testID?: string } }) => node.props.testID === 'sequence-container').length).toBeGreaterThan(0);
  });
});

describe('MusicChallengeUI mouthpiece orientation', () => {
  it('hangs the whole body off one node, so blow mode can turn it end for end', () => {
    const view = renderWithArtwork();
    const layout = stageFor(artwork).layout;
    expect(flatStyle(byTestId(view, 'instrument-body-flip').props.style)).toMatchObject({
      width: layout.width,
      marginLeft: layout.left,
    });
  });

  it('leaves the fallback tube alone -- its mouthpiece is drawn at that end already', () => {
    const view = render(
      <MusicChallengeUI
        challenge={baseChallenge}
        promptText="Play"
        requiredSequence={['C', 'D']}
        noteLayout={noteLayout}
        showBreathButton={false}
      />
    );
    expect(view.UNSAFE_queryAllByProps({ testID: 'instrument-body-flip' }).length).toBe(0);
  });
});

describe('MusicChallengeUI music sheet', () => {
  const stripFor = (region = surfaceBox) =>
    layoutStaffStrip({
      width: region.width,
      height: region.height,
      instrumentTop: stageFor(artwork).surfaceTop,
      overlap: STAFF_SHEET_OVERLAP,
    })!;

  it('hangs the sheet off the top of the instrument once the region is measured', () => {
    const view = renderWithArtwork();
    const placement = stripFor();
    expect(flatStyle(byTestId(view, 'staff-strip-wrapper').props.style)).toMatchObject({
      left: placement.left,
      top: placement.top,
    });
  });

  it('sizes the sheet to the space the stage left above the instrument', () => {
    const view = renderWithArtwork();
    const banner = view.UNSAFE_queryAllByProps({ testID: 'staff-banner' }).filter(node => node.props.source)[0];
    expect(flatStyle(banner.props.style).width).toBeCloseTo(stripFor().width, 1);
  });

  it('rests the paper on the instrument instead of floating clear of it', () => {
    const view = renderWithArtwork();
    const top = flatStyle(byTestId(view, 'staff-strip-wrapper').props.style).top as number;
    const banner = view.UNSAFE_queryAllByProps({ testID: 'staff-banner' }).filter(node => node.props.source)[0];
    // The paper runs to 0.78 of the banner; below that the artwork is clear.
    const paperBottom = top + (flatStyle(banner.props.style).height as number) * 0.78;
    const gap = paperBottom - stageFor(artwork).surfaceTop;
    expect(gap).toBeGreaterThan(0);
    expect(gap).toBeLessThan(20);
  });

  it('carries the song\'s hold lengths onto the sheet, so a long note shows a long shadow', () => {
    const view = renderWithArtwork({ requiredSequence: ['C', 'D'] });
    const first = flatStyle(byTestId(view, 'staff-note-shadow-0').props.style).width as number;
    const second = flatStyle(byTestId(view, 'staff-note-shadow-1').props.style).width as number;
    expect(second).toBeCloseTo(first * 2, 1);
  });

  it('writes the notes to play on the staff rather than as a row of chips', () => {
    const view = renderWithArtwork({ requiredSequence: ['C', 'E'] });
    expect(view.UNSAFE_queryAllByProps({ testID: 'staff-note-head-1' }).length).toBeGreaterThan(0);
    // Nothing under the instrument is tinted a note colour any more -- the only
    // thing left in that block is the "1/2" progress line.
    const noteColours = holeLayout.map((item: { color: string }) => item.color);
    const chips = byTestId(view, 'sequence-container').findAll(
      (node: { props: { style?: unknown } }) => noteColours.includes(flatStyle(node.props.style).backgroundColor as string),
    );
    expect(chips.length).toBe(0);
    expect(view.UNSAFE_queryAllByProps({ testID: 'sequence-progress' }).length).toBeGreaterThan(0);
  });

  it('heads the sheet with the prompt instead of floating a caption over it', () => {
    const view = renderWithArtwork({ promptText: 'Play a cozy tune' });
    const title = byTestId(view, 'staff-title');
    expect(title.props.children).toBe('Play a cozy tune');
    expect(view.UNSAFE_queryAllByProps({ testID: 'prompt-pill' }).length).toBe(0);
  });

  it('keeps the floating prompt when there is no sheet to write it on', () => {
    const view = renderWithArtwork({ requiredSequence: [] });
    expect(view.UNSAFE_queryAllByProps({ testID: 'prompt-pill' }).length).toBeGreaterThan(0);
  });

  it('leaves the instrument painting over the sheet while it lies across the screen', () => {
    const view = renderWithArtwork();
    // No zIndex on the sheet, so the surface that follows it paints on top.
    expect(flatStyle(byTestId(view, 'staff-strip-wrapper').props.style).zIndex).toBeUndefined();
  });

  const toBlowMode = (view: RenderResult) => {
    const toggle = view.UNSAFE_queryAllByProps({ testID: 'play-mode-toggle' })
      .find(node => typeof node.props.onPress === 'function')!;
    act(() => { toggle.props.onPress(); });
  };

  it('lifts the sheet over the instrument once it stands upright, so the bell cannot cover the notes', () => {
    const view = renderWithArtwork();
    toBlowMode(view);
    expect(flatStyle(byTestId(view, 'staff-strip-wrapper').props.style).zIndex).toBe(1);
  });

  it('takes the title off the sheet once it is zoomed past the screen, where it would be clipped', () => {
    const view = renderWithArtwork({ promptText: 'Play a cozy tune' });
    expect(view.UNSAFE_queryAllByProps({ testID: 'staff-title' }).length).toBeGreaterThan(0);
    toBlowMode(view);
    expect(view.UNSAFE_queryAllByProps({ testID: 'staff-title' }).length).toBe(0);
  });

  it('leaves the instrument in front in a portrait region, where nothing stands upright', () => {
    const view = render(
      <MusicChallengeUI
        challenge={baseChallenge}
        promptText="Play"
        requiredSequence={['C', 'D']}
        noteLayout={holeLayout}
        artwork={artwork}
        showBreathButton={false}
      />
    );
    fireEvent(byTestId(view, 'instrument-region'), 'layout', { nativeEvent: { layout: { width: 400, height: 800 } } });
    toBlowMode(view);
    expect(flatStyle(byTestId(view, 'staff-strip-wrapper').props.style).zIndex).toBeUndefined();
  });

  it('keeps the sheet clear of the notch on the edge it moves to in blow mode', () => {
    const view = renderWithArtwork({ insetsOverride: { top: 0, bottom: 21, left: 59, right: 0 } });
    const placement = layoutStaffStrip({
      width: surfaceBox.width,
      height: surfaceBox.height,
      instrumentTop: stageFor(artwork).surfaceTop,
      overlap: STAFF_SHEET_OVERLAP,
      edgeInset: 59,
    })!;
    const wrapper = flatStyle(byTestId(view, 'staff-strip-wrapper').props.style);
    const banner = view.UNSAFE_queryAllByProps({ testID: 'staff-banner' }).filter(node => node.props.source)[0];
    expect(flatStyle(banner.props.style).width).toBeCloseTo(placement.width, 1);
    expect(wrapper.top).toBeCloseTo(placement.top, 1);
  });

  /** Whether the sheet is running the current note's hold. */
  const sheetHolding = (view: RenderResult) =>
    view.UNSAFE_queryAllByProps({ testID: 'staff-strip' }).length > 0
    && view.UNSAFE_queryAllByProps({ holdingCurrent: true }).length > 0;

  it('runs the hold on the sheet for the note whose credit is counting down', () => {
    const view = renderWithArtwork({
      challenge: { ...baseChallenge, currentNoteIndex: 1, holdingIndex: 1 },
    });
    expect(sheetHolding(view)).toBe(true);
  });

  it('leaves the sheet still when no hold is counting, however the keys are held', () => {
    // A finger left down across a note boundary credits nothing further, so the
    // sheet must not run ahead of the score.
    const view = renderWithArtwork({
      challenge: { ...baseChallenge, currentNoteIndex: 1, holdingIndex: null },
    });
    expect(sheetHolding(view)).toBe(false);
  });

  it('leaves the sheet still while a hold is counting for a different note', () => {
    const view = renderWithArtwork({
      challenge: { ...baseChallenge, currentNoteIndex: 1, holdingIndex: 0 },
    });
    expect(sheetHolding(view)).toBe(false);
  });

  it('holds the notes down itself while the reward melody plays', () => {
    const view = renderWithArtwork({
      challenge: {
        ...baseChallenge,
        state: 'playing_success_song',
        holdingIndex: null,
        playbackPosition: { index: 1, tick: 1 },
      },
    });
    expect(sheetHolding(view)).toBe(true);
  });

  it('offers the story on once the song has been played, and keeps it playable', () => {
    // Retry and Increase Difficulty are gone: the sheet clears itself back to
    // the first note, so playing it again needs no button at all.
    const view = renderWithArtwork({
      challenge: { ...baseChallenge, hasCompleted: true },
    });
    expect(view.UNSAFE_queryAllByProps({ testID: 'continue-story-button' }).length).toBeGreaterThan(0);
    expect(view.UNSAFE_queryAllByProps({ testID: 'retry-button' }).length).toBe(0);
    expect(view.UNSAFE_queryAllByProps({ testID: 'go-harder-button' }).length).toBe(0);
    // Still playable -- the mode toggle has not been replaced by a wall of
    // end-of-song buttons.
    expect(view.UNSAFE_queryAllByProps({ testID: 'play-mode-toggle' }).length).toBeGreaterThan(0);
  });

  it('leaves the story button off until the song has been played through', () => {
    const view = renderWithArtwork();
    expect(view.UNSAFE_queryAllByProps({ testID: 'continue-story-button' }).length).toBe(0);
  });

  it('hands the sheet both cues so it can answer a wrong note and a replay', () => {
    const view = renderWithArtwork({
      challenge: { ...baseChallenge, wrongCue: 3, replayCue: 2 },
    });
    expect(view.UNSAFE_queryAllByProps({ wrongCue: 3, replayCue: 2 }).length).toBeGreaterThan(0);
  });

  it('keeps the sheet out of the way of touches meant for the instrument', () => {
    const view = renderWithArtwork();
    expect(byTestId(view, 'staff-strip-wrapper').props.pointerEvents).toBe('none');
  });

  it('leaves the sheet off freeplay, where there is no song to follow', () => {
    const view = renderWithArtwork({ requiredSequence: [] });
    expect(view.UNSAFE_queryAllByProps({ testID: 'staff-strip-wrapper' }).length).toBe(0);
  });

  it('draws no sheet before the region has been measured', () => {
    const view = render(
      <MusicChallengeUI
        challenge={baseChallenge}
        promptText="Play"
        requiredSequence={['C', 'D']}
        noteLayout={holeLayout}
        artwork={artwork}
        showBreathButton={false}
      />
    );
    expect(view.UNSAFE_queryAllByProps({ testID: 'staff-strip-wrapper' }).length).toBe(0);
  });

  it('reserves room under the instrument for the progress line, not a row of chips', () => {
    expect(instrumentLowerBlockHeight(identity, identity, true) - instrumentLowerBlockHeight(identity, identity, false))
      .toBe(22);
  });

  it('draws a sheet on the fallback tube too', () => {
    const view = render(
      <MusicChallengeUI
        challenge={baseChallenge}
        promptText="Play"
        requiredSequence={['C', 'D']}
        noteLayout={noteLayout}
        showBreathButton={false}
      />
    );
    fireEvent(byTestId(view, 'challenge-container'), 'layout', { nativeEvent: { layout: surfaceBox } });
    expect(view.UNSAFE_queryAllByProps({ testID: 'staff-note-head-1' }).length).toBeGreaterThan(0);
  });
});
