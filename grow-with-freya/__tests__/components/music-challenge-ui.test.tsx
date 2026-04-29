import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MusicChallengeUI } from '@/components/stories/music-challenge-ui';

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
} as any;

const noteLayout = [
  { note: 'C', label: 'C', color: '#4FC3F7', icon: 'star' },
  { note: 'D', label: 'D', color: '#FFD54F', icon: 'moon' },
  { note: 'E', label: 'E', color: '#81C784', icon: 'leaf' },
] as any;

describe('MusicChallengeUI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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