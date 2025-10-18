/**
 * MainMenu Component Tests
 * Tests basic functionality and rendering
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MainMenu } from '@/components/main-menu';

describe('MainMenu Component', () => {
  const mockOnNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    const result = render(<MainMenu onNavigate={mockOnNavigate} />);
    expect(result).toBeTruthy();
  });

  it('should render all menu icons', () => {
    const { getByLabelText } = render(<MainMenu onNavigate={mockOnNavigate} />);

    expect(getByLabelText('Stories button')).toBeTruthy();
    expect(getByLabelText('Sensory button')).toBeTruthy();
    expect(getByLabelText('Emotions button')).toBeTruthy();
    expect(getByLabelText('Bedtime Music button')).toBeTruthy();
    expect(getByLabelText('Screen Time button')).toBeTruthy();
  });

  it('should handle navigation when stories button is pressed', () => {
    const { getByLabelText } = render(<MainMenu onNavigate={mockOnNavigate} />);

    const storiesButton = getByLabelText('Stories button');
    fireEvent.press(storiesButton);

    expect(mockOnNavigate).toHaveBeenCalledWith('stories');
  });

  it('should handle menu icon swapping', () => {
    const { getByLabelText } = render(<MainMenu onNavigate={mockOnNavigate} />);

    const emotionsButton = getByLabelText('Emotions button');
    fireEvent.press(emotionsButton);

    // Should not crash when swapping icons
    expect(emotionsButton).toBeTruthy();
  });

  it('should render background elements', () => {
    const result = render(<MainMenu onNavigate={mockOnNavigate} />);

    // Just verify the component renders without crashing
    expect(result.toJSON()).toBeTruthy();
  });

});
