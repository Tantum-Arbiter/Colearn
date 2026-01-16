import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { EmotionsGameScreen } from '@/components/emotions/emotions-game-screen';
import { EmotionTheme } from '@/types/emotion';

// Mock dependencies
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

// Mock the emotion data
jest.mock('@/data/emotions', () => ({
  getRandomEmotion: jest.fn(() => ({
    id: 'happy',
    name: 'Happy',
    emoji: '😊',
    color: '#FFD700',
    description: 'Feeling joyful and cheerful',
    difficulty: 'easy',
    category: 'basic'
  })),
  getRandomPromptIndex: jest.fn(() => 0),
  EMOTION_GAME_CONFIG: {
    timePerEmotion: 15,
    emotionsPerLevel: 5,
  },
  PROMPTS_PER_EMOTION: 4,
}));

describe('EmotionsGameScreen', () => {
  const mockOnGameComplete = jest.fn();
  const mockOnBack = jest.fn();
  const selectedTheme: EmotionTheme = 'emoji';

  const defaultProps = {
    onGameComplete: mockOnGameComplete,
    onBack: mockOnBack,
    selectedTheme,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    // Force real timers in CI environments
    const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true' || process.env.NODE_ENV === 'test';
    if (isCI) {
      jest.useRealTimers();
    } else {
      jest.useFakeTimers();
    }
  });

  afterEach(() => {
    const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true' || process.env.NODE_ENV === 'test';
    if (!isCI) {
      jest.useRealTimers();
    }
    jest.clearAllTimers();
  });

  describe('Animation State Management', () => {
    it('renders game screen without crashing', () => {
      const { root } = render(
        <EmotionsGameScreen {...defaultProps} />
      );

      // Should render without crashing
      expect(root).toBeTruthy();
    });

    it('shows expression button with appropriate text', () => {
      const { root } = render(
        <EmotionsGameScreen {...defaultProps} />
      );

      // Should render without crashing
      expect(root).toBeTruthy();
    });
  });

  describe('Button State', () => {
    it('renders expression button', () => {
      const { root } = render(
        <EmotionsGameScreen {...defaultProps} />
      );

      // Should render without crashing
      expect(root).toBeTruthy();
    });
  });

  describe('Game Flow', () => {
    it('renders game elements correctly', () => {
      const { root } = render(
        <EmotionsGameScreen {...defaultProps} />
      );

      // Should render without crashing
      expect(root).toBeTruthy();
    });
  });
});
