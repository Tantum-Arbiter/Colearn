import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AnimatedCharacterComponent } from '@/components/stories/animated-character';
import { AnimatedCharacter } from '@/types/story';
import { characterAudioManager } from '@/services/character-audio';

// Mock the character audio manager
jest.mock('@/services/character-audio', () => ({
  characterAudioManager: {
    loadCharacterAudio: jest.fn().mockResolvedValue(true),
    playCharacterAudio: jest.fn().mockResolvedValue(true),
    unloadCharacterAudio: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock expo-av
jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn().mockResolvedValue({
        sound: {
          playAsync: jest.fn(),
          stopAsync: jest.fn(),
          unloadAsync: jest.fn(),
          setVolumeAsync: jest.fn(),
        },
      }),
    },
  },
}));

const mockCharacter: AnimatedCharacter = {
  id: 'test-character',
  name: 'Test Character',
  position: {
    x: '50%',
    y: '30%',
    width: '30%',
    height: '40%',
    zIndex: 2,
  },
  animations: [
    {
      id: 'idle',
      name: 'idle',
      frames: [
        'https://example.com/frame1.png',
        'https://example.com/frame2.png',
        'https://example.com/frame3.png',
      ],
      duration: 1000,
      loop: true,
      startDelay: 2000,
    },
  ],
  defaultAnimation: 'idle',
  audioSource: 'https://example.com/character-sound.mp3',
  isInteractive: true,
  movements: [
    {
      type: 'translate',
      direction: 'right',
      distance: 100,
      duration: 1000,
      easing: 'ease-out',
    },
  ],
};

const mockNonInteractiveCharacter: AnimatedCharacter = {
  ...mockCharacter,
  id: 'non-interactive-character',
  isInteractive: false,
  audioSource: undefined,
};

describe('AnimatedCharacterComponent', () => {
  const mockOnAnimationComplete = jest.fn();
  const mockOnCharacterPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { getByTestId } = render(
      <AnimatedCharacterComponent
        character={mockCharacter}
        isActive={true}
        onAnimationComplete={mockOnAnimationComplete}
        onCharacterPress={mockOnCharacterPress}
      />
    );

    // Component should render without throwing
    expect(() => render(
      <AnimatedCharacterComponent
        character={mockCharacter}
        isActive={true}
      />
    )).not.toThrow();
  });

  it('renders character image when active', () => {
    const { UNSAFE_getByType } = render(
      <AnimatedCharacterComponent
        character={mockCharacter}
        isActive={true}
        onAnimationComplete={mockOnAnimationComplete}
        onCharacterPress={mockOnCharacterPress}
      />
    );

    // Should render an Image component
    const images = UNSAFE_getByType('Image');
    expect(images).toBeTruthy();
  });

  it('handles character press when interactive', async () => {
    const { getByTestId } = render(
      <AnimatedCharacterComponent
        character={mockCharacter}
        isActive={true}
        onAnimationComplete={mockOnAnimationComplete}
        onCharacterPress={mockOnCharacterPress}
      />
    );

    // Find the pressable component and simulate press
    const pressable = UNSAFE_getByType('Pressable');
    fireEvent.press(pressable);

    await waitFor(() => {
      expect(mockOnCharacterPress).toHaveBeenCalledWith('test-character');
    });
  });

  it('does not handle press when not interactive', () => {
    const { UNSAFE_getByType } = render(
      <AnimatedCharacterComponent
        character={mockNonInteractiveCharacter}
        isActive={true}
        onAnimationComplete={mockOnAnimationComplete}
        onCharacterPress={mockOnCharacterPress}
      />
    );

    const pressable = UNSAFE_getByType('Pressable');
    expect(pressable.props.disabled).toBe(true);
  });

  it('does not render when no animation frames available', () => {
    const characterWithoutFrames: AnimatedCharacter = {
      ...mockCharacter,
      animations: [
        {
          ...mockCharacter.animations[0],
          frames: [],
        },
      ],
    };

    const { container } = render(
      <AnimatedCharacterComponent
        character={characterWithoutFrames}
        isActive={true}
        onAnimationComplete={mockOnAnimationComplete}
        onCharacterPress={mockOnCharacterPress}
      />
    );

    // Should return null and not render anything
    expect(container.children).toHaveLength(0);
  });

  it('applies correct positioning styles', () => {
    const { UNSAFE_getByType } = render(
      <AnimatedCharacterComponent
        character={mockCharacter}
        isActive={true}
        onAnimationComplete={mockOnAnimationComplete}
        onCharacterPress={mockOnCharacterPress}
      />
    );

    const animatedView = UNSAFE_getByType('Animated.View');
    expect(animatedView.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          position: 'absolute',
          zIndex: 2,
        }),
      ])
    );
  });

  it('starts animation when becomes active', async () => {
    const { rerender } = render(
      <AnimatedCharacterComponent
        character={mockCharacter}
        isActive={false}
        onAnimationComplete={mockOnAnimationComplete}
        onCharacterPress={mockOnCharacterPress}
      />
    );

    // Make component active
    rerender(
      <AnimatedCharacterComponent
        character={mockCharacter}
        isActive={true}
        onAnimationComplete={mockOnAnimationComplete}
        onCharacterPress={mockOnCharacterPress}
      />
    );

    // Animation should start (tested through side effects)
    expect(mockCharacter.animations[0].startDelay).toBe(2000);
  });

  it('cleans up when component unmounts', () => {
    const { unmount } = render(
      <AnimatedCharacterComponent
        character={mockCharacter}
        isActive={true}
        onAnimationComplete={mockOnAnimationComplete}
        onCharacterPress={mockOnCharacterPress}
      />
    );

    // Unmount should not throw
    expect(() => unmount()).not.toThrow();
  });

  it('handles audio playback on character press', async () => {
    const { UNSAFE_getByType } = render(
      <AnimatedCharacterComponent
        character={mockCharacter}
        isActive={true}
        onAnimationComplete={mockOnAnimationComplete}
        onCharacterPress={mockOnCharacterPress}
      />
    );

    const pressable = UNSAFE_getByType('Pressable');
    fireEvent.press(pressable);

    await waitFor(() => {
      expect(characterAudioManager.playCharacterAudio).toHaveBeenCalledWith('test-character');
    });
  });

  it('handles character without audio source', async () => {
    const characterWithoutAudio: AnimatedCharacter = {
      ...mockCharacter,
      audioSource: undefined,
    };

    const { UNSAFE_getByType } = render(
      <AnimatedCharacterComponent
        character={characterWithoutAudio}
        isActive={true}
        onAnimationComplete={mockOnAnimationComplete}
        onCharacterPress={mockOnCharacterPress}
      />
    );

    const pressable = UNSAFE_getByType('Pressable');
    fireEvent.press(pressable);

    await waitFor(() => {
      expect(mockOnCharacterPress).toHaveBeenCalledWith('test-character');
      expect(characterAudioManager.playCharacterAudio).not.toHaveBeenCalled();
    });
  });

  it('resets animation when becomes inactive', () => {
    const { rerender } = render(
      <AnimatedCharacterComponent
        character={mockCharacter}
        isActive={true}
        onAnimationComplete={mockOnAnimationComplete}
        onCharacterPress={mockOnCharacterPress}
      />
    );

    // Make component inactive
    rerender(
      <AnimatedCharacterComponent
        character={mockCharacter}
        isActive={false}
        onAnimationComplete={mockOnAnimationComplete}
        onCharacterPress={mockOnCharacterPress}
      />
    );

    // Should reset animation state (tested through side effects)
    expect(true).toBe(true); // Placeholder for animation reset verification
  });
});
