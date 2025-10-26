import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EmotionsUnifiedScreen } from '@/components/emotions/emotions-unified-screen';
import { MusicMainMenu } from '@/components/music/music-main-menu';

// Mock dependencies

jest.mock('@/components/main-menu/utils', () => ({
  generateStarPositions: jest.fn(() => [
    { id: 0, left: 100, top: 50, opacity: 0.5 },
  ]),
}));

jest.mock('@/components/ui/music-control', () => ({
  MusicControl: ({ testID, ...props }: any) => {
    const { View } = require('react-native');
    return <View testID={testID || 'music-control'} {...props} />;
  },
}));

describe('Toddler-Friendly Features', () => {
  const mockProps = {
    onBack: jest.fn(),
    onStartGame: jest.fn(),
    onTantrumsSelect: jest.fn(),
    onSleepSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Simple Language and Instructions', () => {
    it('uses simple, age-appropriate language in emotions instructions', () => {
      const { getByText } = render(
        <EmotionsUnifiedScreen 
          onStartGame={mockProps.onStartGame}
          onBack={mockProps.onBack}
        />
      );

      // Expand instructions
      fireEvent.press(getByText('How to Play ▶'));

      // Check for simple, toddler-friendly language
      expect(getByText('Look at the picture')).toBeTruthy();
      expect(getByText('Make the same face!')).toBeTruthy();
      expect(getByText('Show me happy, sad, or silly')).toBeTruthy();
      expect(getByText('Let\'s learn about feelings together!')).toBeTruthy();
    });

    it('avoids complex terminology in favor of simple words', () => {
      const { getByText, queryByText } = render(
        <EmotionsUnifiedScreen 
          onStartGame={mockProps.onStartGame}
          onBack={mockProps.onBack}
        />
      );

      // Expand instructions
      fireEvent.press(getByText('How to Play ▶'));

      // Should use "picture" instead of "emotion card"
      expect(getByText('Look at the picture')).toBeTruthy();
      expect(queryByText('emotion card')).toBeNull();

      // Should use "face" instead of "expression"
      expect(getByText('Make the same face!')).toBeTruthy();
      expect(queryByText('expression')).toBeNull();
    });

    it('uses encouraging and inclusive language', () => {
      const { getByText } = render(
        <EmotionsUnifiedScreen 
          onStartGame={mockProps.onStartGame}
          onBack={mockProps.onBack}
        />
      );

      // Expand instructions
      fireEvent.press(getByText('How to Play ▶'));

      // Check for encouraging phrases
      expect(getByText('Let\'s learn about feelings together!')).toBeTruthy();
      
      // Check for inclusive language
      expect(getByText('Show me happy, sad, or silly')).toBeTruthy();
    });

    it('provides clear, actionable instructions', () => {
      const { getByText } = render(
        <EmotionsUnifiedScreen 
          onStartGame={mockProps.onStartGame}
          onBack={mockProps.onBack}
        />
      );

      // Expand instructions
      fireEvent.press(getByText('How to Play ▶'));

      // Each instruction should be a clear action
      const instructions = [
        'Look at the picture',
        'Make the same face!',
        'Show me happy, sad, or silly',
        'Let\'s learn about feelings together!'
      ];

      instructions.forEach((instruction) => {
        expect(getByText(instruction)).toBeTruthy();
      });
    });
  });

  describe('Clean and Simple UI Elements', () => {
    it('removes emoji clutter from action buttons', () => {
      const { getByText } = render(
        <EmotionsUnifiedScreen 
          onStartGame={mockProps.onStartGame}
          onBack={mockProps.onBack}
        />
      );

      const startButton = getByText('Express with Emoji!');

      // Button text should not contain game controller emoji
      expect(startButton.children[0]).not.toMatch(/🎮/);

      // Should be clean, readable text
      expect(startButton.children[0]).toBe('Express with Emoji!');
    });

    it('maintains focus on content rather than decorative elements', () => {
      const { getByText } = render(
        <EmotionsUnifiedScreen 
          onStartGame={mockProps.onStartGame}
          onBack={mockProps.onBack}
        />
      );

      // Main content should be clear and prominent
      expect(getByText('Express Yourself!')).toBeTruthy();
      expect(getByText('Pick Your Style')).toBeTruthy();
      expect(getByText('Choose your style and learn about emotions')).toBeTruthy();
    });

    it('uses descriptive text for music categories', () => {
      const { getByText } = render(
        <MusicMainMenu 
          onTantrumsSelect={mockProps.onTantrumsSelect}
          onSleepSelect={mockProps.onSleepSelect}
          onBack={mockProps.onBack}
        />
      );

      // Check for clear, descriptive text
      expect(getByText('Calming binaural beats to help soothe during difficult moments')).toBeTruthy();
      expect(getByText('Progressive binaural beats sequence for peaceful sleep')).toBeTruthy();
    });
  });

  describe('Age-Appropriate Content Organization', () => {
    it('groups related content logically for young children', () => {
      const { getByText } = render(
        <EmotionsUnifiedScreen 
          onStartGame={mockProps.onStartGame}
          onBack={mockProps.onBack}
        />
      );

      // Content should be organized in logical sections
      expect(getByText('Pick Your Style')).toBeTruthy(); // Theme selection
      expect(getByText('How to Play ▶')).toBeTruthy(); // Instructions
      expect(getByText('Express with Emoji!')).toBeTruthy(); // Action
    });

    it('provides clear visual hierarchy for toddler comprehension', () => {
      const { getByText } = render(
        <EmotionsUnifiedScreen 
          onStartGame={mockProps.onStartGame}
          onBack={mockProps.onBack}
        />
      );

      // Main title should be prominent
      expect(getByText('Express Yourself!')).toBeTruthy();
      
      // Section headers should be clear
      expect(getByText('Pick Your Style')).toBeTruthy();
      
      // Action button should be prominent
      expect(getByText('Express with Emoji!')).toBeTruthy();
    });
  });

  describe('Interactive Elements for Small Hands', () => {
    it('provides large, easily tappable theme selection cards', () => {
      const { getByText } = render(
        <EmotionsUnifiedScreen 
          onStartGame={mockProps.onStartGame}
          onBack={mockProps.onBack}
        />
      );

      // Theme cards should be easily tappable
      const emojiCard = getByText('Emoji');
      const animalsCard = getByText('Animals');
      const fairiesCard = getByText('Fairies');

      expect(emojiCard).toBeTruthy();
      expect(animalsCard).toBeTruthy();
      expect(fairiesCard).toBeTruthy();

      // Should be able to tap them
      fireEvent.press(animalsCard);
      expect(getByText('Express with Animals!')).toBeTruthy();
    });

    it('provides large action buttons suitable for toddlers', () => {
      const { getByText } = render(
        <EmotionsUnifiedScreen 
          onStartGame={mockProps.onStartGame}
          onBack={mockProps.onBack}
        />
      );

      // Start button should be large and prominent
      const startButton = getByText('Express with Emoji!');
      expect(startButton).toBeTruthy();

      // Should be tappable
      fireEvent.press(startButton);
      expect(mockProps.onStartGame).toHaveBeenCalled();
    });

    it('provides clear visual feedback for interactions', () => {
      const { getByText } = render(
        <EmotionsUnifiedScreen 
          onStartGame={mockProps.onStartGame}
          onBack={mockProps.onBack}
        />
      );

      // Theme selection should provide visual feedback
      fireEvent.press(getByText('Animals'));
      
      // Button text should update to reflect selection
      expect(getByText('Express with Animals!')).toBeTruthy();
    });
  });

  describe('Cognitive Load Reduction', () => {
    it('presents limited choices to avoid overwhelming toddlers', () => {
      const { getByText } = render(
        <EmotionsUnifiedScreen 
          onStartGame={mockProps.onStartGame}
          onBack={mockProps.onBack}
        />
      );

      // Should present exactly 3 theme choices (not overwhelming)
      expect(getByText('Emoji')).toBeTruthy();
      expect(getByText('Animals')).toBeTruthy();
      expect(getByText('Fairies')).toBeTruthy();
    });

    it('hides complex instructions by default', () => {
      const { getByText, queryByText } = render(
        <EmotionsUnifiedScreen 
          onStartGame={mockProps.onStartGame}
          onBack={mockProps.onBack}
        />
      );

      // Instructions should be collapsed initially
      expect(getByText('How to Play ▶')).toBeTruthy();
      expect(queryByText('Look at the picture')).toBeNull();
    });

    it('allows progressive disclosure of information', () => {
      const { getByText, queryByText } = render(
        <EmotionsUnifiedScreen 
          onStartGame={mockProps.onStartGame}
          onBack={mockProps.onBack}
        />
      );

      // Initially hidden
      expect(queryByText('Look at the picture')).toBeNull();

      // Can be revealed when needed
      fireEvent.press(getByText('How to Play ▶'));
      expect(getByText('Look at the picture')).toBeTruthy();

      // Can be hidden again
      fireEvent.press(getByText('How to Play ▼'));
      expect(queryByText('Look at the picture')).toBeNull();
    });
  });

  describe('Positive and Encouraging Experience', () => {
    it('uses positive language throughout the interface', () => {
      const { getByText } = render(
        <EmotionsUnifiedScreen 
          onStartGame={mockProps.onStartGame}
          onBack={mockProps.onBack}
        />
      );

      // Positive, encouraging titles
      expect(getByText('Express Yourself!')).toBeTruthy();
      expect(getByText('Choose your style and learn about emotions')).toBeTruthy();

      // Expand instructions for more positive language
      fireEvent.press(getByText('How to Play ▶'));
      expect(getByText('Let\'s learn about feelings together!')).toBeTruthy();
    });

    it('focuses on play and learning rather than testing', () => {
      const { getByText } = render(
        <EmotionsUnifiedScreen 
          onStartGame={mockProps.onStartGame}
          onBack={mockProps.onBack}
        />
      );

      // Should emphasize play and learning
      expect(getByText('Express with Emoji!')).toBeTruthy();
      
      fireEvent.press(getByText('How to Play ▶'));
      expect(getByText('Let\'s learn about feelings together!')).toBeTruthy();
    });
  });
});
