import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EmotionCard } from '@/components/emotions/emotion-card';
import { Emotion } from '@/types/emotion';

// Mock dependencies
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Medium: 'medium',
  },
}));

const mockEmotion: Emotion = {
  id: 'happy',
  name: 'Happy',
  emoji: '😊',
  color: '#FFD700',
  description: 'Feeling joyful and cheerful',
  difficulty: 'easy',
  category: 'basic'
};

describe('EmotionCard', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders emotion card without crashing', () => {
    const { root } = render(
      <EmotionCard
        emotion={mockEmotion}
        onPress={mockOnPress}
      />
    );

    // Check that the component renders without crashing
    expect(root).toBeTruthy();
  });

  it('renders with different sizes', () => {
    const { rerender, root } = render(
      <EmotionCard
        emotion={mockEmotion}
        onPress={mockOnPress}
        size="small"
      />
    );

    expect(root).toBeTruthy();

    rerender(
      <EmotionCard
        emotion={mockEmotion}
        onPress={mockOnPress}
        size="large"
      />
    );

    expect(root).toBeTruthy();
  });

  it('renders with selection state', () => {
    const { root } = render(
      <EmotionCard
        emotion={mockEmotion}
        onPress={mockOnPress}
        isSelected={true}
      />
    );

    expect(root).toBeTruthy();
  });

  it('renders with different difficulties', () => {
    const mediumEmotion: Emotion = {
      ...mockEmotion,
      difficulty: 'medium'
    };

    const hardEmotion: Emotion = {
      ...mockEmotion,
      difficulty: 'hard'
    };

    const { rerender, root } = render(
      <EmotionCard
        emotion={mockEmotion}
        onPress={mockOnPress}
      />
    );

    expect(root).toBeTruthy();

    rerender(
      <EmotionCard
        emotion={mediumEmotion}
        onPress={mockOnPress}
      />
    );

    expect(root).toBeTruthy();

    rerender(
      <EmotionCard
        emotion={hardEmotion}
        onPress={mockOnPress}
      />
    );

    expect(root).toBeTruthy();
  });
});
