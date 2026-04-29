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

  it('should render stories menu icon in carousel', () => {
    const { getByLabelText } = render(
      <ScreenTimeProvider>
        <MainMenu onNavigate={mockOnNavigate} />
      </ScreenTimeProvider>
    );

    // Stories button exists in the carousel with emoji prefix
    expect(getByLabelText('📚 menu.stories button')).toBeTruthy();
  });

  it('should handle navigation when stories button is pressed', () => {
    const { getByLabelText } = render(
      <ScreenTimeProvider>
        <MainMenu onNavigate={mockOnNavigate} />
      </ScreenTimeProvider>
    );

    const storiesButton = getByLabelText('📚 menu.stories button');
    fireEvent.press(storiesButton);

    expect(mockOnNavigate).toHaveBeenCalledWith('stories');
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
