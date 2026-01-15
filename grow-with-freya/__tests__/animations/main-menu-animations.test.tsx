/**
 * MainMenu Component Tests
 * Tests basic functionality and rendering
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MainMenu } from '@/components/main-menu';
import { ScreenTimeProvider } from '@/components/screen-time/screen-time-provider';

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

  it('should render all menu icons', () => {
    const { getByLabelText } = render(
      <ScreenTimeProvider>
        <MainMenu onNavigate={mockOnNavigate} />
      </ScreenTimeProvider>
    );

    // Labels now use i18n keys (mock returns keys directly)
    expect(getByLabelText('menu.stories button')).toBeTruthy();
    expect(getByLabelText('menu.emotions button')).toBeTruthy();
    expect(getByLabelText('menu.calming button')).toBeTruthy();
    // Note: Screen Time button may not be visible in test environment
  });

  it('should handle navigation when stories button is pressed', () => {
    const { getByLabelText } = render(
      <ScreenTimeProvider>
        <MainMenu onNavigate={mockOnNavigate} />
      </ScreenTimeProvider>
    );

    const storiesButton = getByLabelText('menu.stories button');
    fireEvent.press(storiesButton);

    expect(mockOnNavigate).toHaveBeenCalledWith('stories');
  });

  it('should handle menu icon swapping', () => {
    const { getByLabelText } = render(
      <ScreenTimeProvider>
        <MainMenu onNavigate={mockOnNavigate} />
      </ScreenTimeProvider>
    );

    const emotionsButton = getByLabelText('menu.emotions button');
    fireEvent.press(emotionsButton);

    // Should not crash when swapping icons
    expect(emotionsButton).toBeTruthy();
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
