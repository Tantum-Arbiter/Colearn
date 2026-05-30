/**
 * MainMenu Component Tests
 * Tests basic functionality and rendering
 */

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { MainMenu } from '@/components/main-menu';
import { ScreenTimeProvider } from '@/components/screen-time/screen-time-provider';

// Override the global app-store mock to ensure getEffectiveTier is present
jest.mock('@/store/app-store', () => ({
  useAppStore: jest.fn(() => ({
    isAppReady: true,
    hasCompletedOnboarding: true,
    currentChildId: null,
    currentScreen: 'main-menu',
    isLoading: false,
    shouldReturnToMainMenu: false,
    subscriptionTier: 'free',
    _devSubscriptionOverride: null,
    getEffectiveTier: () => 'free',
    readStoryIds: [],
    userAvatarType: null,
    backgroundAnimationState: {
      cloudFloat1: 0,
      cloudFloat2: 0,
      rocketFloat1: 0,
      rocketFloat2: 0,
    },
    setAppReady: jest.fn(),
    setOnboardingComplete: jest.fn(),
    setCurrentChild: jest.fn(),
    setCurrentScreen: jest.fn(),
    setLoading: jest.fn(),
    setShowLoginAfterOnboarding: jest.fn(),
    requestReturnToMainMenu: jest.fn(),
    clearReturnToMainMenu: jest.fn(),
    updateBackgroundAnimationState: jest.fn(),
  })),
  BASIC_TIER_INSTRUMENTS: ['flute', 'recorder', 'ocarina'],
}));

describe('MainMenu Component', () => {
  const mockOnNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    const result = render(
      <ScreenTimeProvider>
        <MainMenu onNavigate={mockOnNavigate} />
      </ScreenTimeProvider>
    );
    expect(result).toBeTruthy();
  });

  it('should render stories, instruments and learning buttons in carousel', () => {
    const { getByLabelText } = render(
      <ScreenTimeProvider>
        <MainMenu onNavigate={mockOnNavigate} />
      </ScreenTimeProvider>
    );

    expect(getByLabelText('menu.stories button')).toBeTruthy();
    expect(getByLabelText('menu.instruments button')).toBeTruthy();
    expect(getByLabelText('menu.learning button')).toBeTruthy();
  });

  it('should intercept stories button and not navigate directly', async () => {
    const { getByLabelText } = render(
      <ScreenTimeProvider>
        <MainMenu onNavigate={mockOnNavigate} />
      </ScreenTimeProvider>
    );

    const storiesButton = getByLabelText('menu.stories button');
    await act(async () => {
      fireEvent.press(storiesButton);
    });

    // Stories button now shows sub-menu instead of navigating directly
    expect(mockOnNavigate).not.toHaveBeenCalledWith('stories');
  });

  it('should intercept instruments button and not navigate directly', async () => {
    const { getByLabelText } = render(
      <ScreenTimeProvider>
        <MainMenu onNavigate={mockOnNavigate} />
      </ScreenTimeProvider>
    );

    const instrumentsButton = getByLabelText('menu.instruments button');
    await act(async () => {
      fireEvent.press(instrumentsButton);
    });

    expect(mockOnNavigate).not.toHaveBeenCalledWith('instruments');
  });

  it('should intercept learning button and not navigate directly', async () => {
    const { getByLabelText } = render(
      <ScreenTimeProvider>
        <MainMenu onNavigate={mockOnNavigate} />
      </ScreenTimeProvider>
    );

    const learningButton = getByLabelText('menu.learning button');
    await act(async () => {
      fireEvent.press(learningButton);
    });

    expect(mockOnNavigate).not.toHaveBeenCalledWith('learning');
  });

  it('should render background elements', () => {
    const result = render(
      <ScreenTimeProvider>
        <MainMenu onNavigate={mockOnNavigate} />
      </ScreenTimeProvider>
    );

    // Just verify the component renders without crashing
    expect(result.toJSON()).toBeTruthy();
  });

});
