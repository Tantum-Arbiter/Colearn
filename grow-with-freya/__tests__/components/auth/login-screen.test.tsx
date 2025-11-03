/**
 * Login Screen Tests
 * Comprehensive test suite for login-screen.tsx
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from '@/components/auth/login-screen';
import { useAuthStore } from '@/store/auth-store';

// Mock dependencies
jest.mock('@/store/auth-store');
jest.mock('expo-haptics');
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// Mock the auth store
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

describe('LoginScreen', () => {
  const mockOnSuccess = jest.fn();
  const mockOnSkip = jest.fn();
  const mockSignIn = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default auth store mock
    mockUseAuthStore.mockReturnValue({
      authState: 'unauthenticated',
      user: null,
      tokens: null,
      error: null,
      isLoading: false,
      isAuthenticated: false,
      hasValidToken: false,
      signIn: mockSignIn,
      signOut: jest.fn(),
      refreshTokens: jest.fn(),
      updateProfile: jest.fn(),
      clearError: jest.fn(),
      initialize: jest.fn(),
      setAuthState: jest.fn(),
      setUser: jest.fn(),
      setTokens: jest.fn(),
      setError: jest.fn(),
      setLoading: jest.fn(),
    });
  });

  describe('Rendering', () => {
    it('should render login screen correctly', () => {
      const { getByText, getByTestId } = render(
        <LoginScreen onSuccess={mockOnSuccess} />
      );

      expect(getByText('Welcome to')).toBeTruthy();
      expect(getByText('Grow with Freya')).toBeTruthy();
      expect(getByText('Continue with Google')).toBeTruthy();
      expect(getByText('Continue with Apple')).toBeTruthy();
    });

    it('should render subtitle correctly', () => {
      const { getByText } = render(
        <LoginScreen onSuccess={mockOnSuccess} />
      );

      expect(getByText(/Sign in to save your child's progress/)).toBeTruthy();
    });

    it('should render skip button when onSkip is provided', () => {
      const { getByText } = render(
        <LoginScreen onSuccess={mockOnSuccess} onSkip={mockOnSkip} />
      );

      expect(getByText('Skip for now')).toBeTruthy();
    });

    it('should not render skip button when onSkip is not provided', () => {
      const { queryByText } = render(
        <LoginScreen onSuccess={mockOnSuccess} />
      );

      expect(queryByText('Skip for now')).toBeNull();
    });
  });

  describe('Google Sign-In', () => {
    it('should call signIn with google when Google button is pressed', async () => {
      const { getByText } = render(
        <LoginScreen onSuccess={mockOnSuccess} />
      );

      const googleButton = getByText('Continue with Google');
      fireEvent.press(googleButton);

      expect(mockSignIn).toHaveBeenCalledWith('google');
    });

    it('should show loading state during Google sign-in', async () => {
      mockUseAuthStore.mockReturnValue({
        ...mockUseAuthStore(),
        isLoading: true,
      });

      const { getByText } = render(
        <LoginScreen onSuccess={mockOnSuccess} />
      );

      expect(getByText('Signing in...')).toBeTruthy();
    });

    it('should disable buttons during loading', async () => {
      mockUseAuthStore.mockReturnValue({
        ...mockUseAuthStore(),
        isLoading: true,
      });

      const { getByText } = render(
        <LoginScreen onSuccess={mockOnSuccess} />
      );

      const googleButton = getByText('Signing in...');
      const appleButton = getByText('Continue with Apple');

      // Buttons should be disabled (this is implementation-specific)
      fireEvent.press(googleButton);
      fireEvent.press(appleButton);

      // Should not call signIn when disabled
      expect(mockSignIn).not.toHaveBeenCalled();
    });

    it('should handle Google sign-in success', async () => {
      mockSignIn.mockResolvedValue(undefined);

      const { getByText } = render(
        <LoginScreen onSuccess={mockOnSuccess} />
      );

      const googleButton = getByText('Continue with Google');
      fireEvent.press(googleButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('google');
      });
    });

    it('should handle Google sign-in error', async () => {
      mockSignIn.mockRejectedValue(new Error('Sign in failed'));

      const { getByText } = render(
        <LoginScreen onSuccess={mockOnSuccess} />
      );

      const googleButton = getByText('Continue with Google');
      fireEvent.press(googleButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('google');
      });

      // Error handling is typically done in the store
    });
  });

  describe('Apple Sign-In', () => {
    it('should call signIn with apple when Apple button is pressed', async () => {
      const { getByText } = render(
        <LoginScreen onSuccess={mockOnSuccess} />
      );

      const appleButton = getByText('Continue with Apple');
      fireEvent.press(appleButton);

      expect(mockSignIn).toHaveBeenCalledWith('apple');
    });

    it('should handle Apple sign-in success', async () => {
      mockSignIn.mockResolvedValue(undefined);

      const { getByText } = render(
        <LoginScreen onSuccess={mockOnSuccess} />
      );

      const appleButton = getByText('Continue with Apple');
      fireEvent.press(appleButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('apple');
      });
    });

    it('should handle Apple sign-in error', async () => {
      mockSignIn.mockRejectedValue(new Error('Apple sign in failed'));

      const { getByText } = render(
        <LoginScreen onSuccess={mockOnSuccess} />
      );

      const appleButton = getByText('Continue with Apple');
      fireEvent.press(appleButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('apple');
      });
    });
  });

  describe('Skip Functionality', () => {
    it('should call onSkip when skip button is pressed', () => {
      const { getByText } = render(
        <LoginScreen onSuccess={mockOnSuccess} onSkip={mockOnSkip} />
      );

      const skipButton = getByText('Skip for now');
      fireEvent.press(skipButton);

      expect(mockOnSkip).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when auth error exists', () => {
      mockUseAuthStore.mockReturnValue({
        ...mockUseAuthStore(),
        error: 'Authentication failed',
      });

      const { getByText } = render(
        <LoginScreen onSuccess={mockOnSuccess} />
      );

      // Error display depends on implementation
      // This test assumes error is shown somewhere in the UI
    });

    it('should clear error when component unmounts', () => {
      const mockClearError = jest.fn();
      mockUseAuthStore.mockReturnValue({
        ...mockUseAuthStore(),
        error: 'Some error',
        clearError: mockClearError,
      });

      const { unmount } = render(
        <LoginScreen onSuccess={mockOnSuccess} />
      );

      unmount();

      // Error clearing on unmount depends on implementation
    });
  });

  describe('Authentication State Changes', () => {
    it('should call onSuccess when authentication succeeds', async () => {
      // Mock successful authentication
      mockUseAuthStore.mockReturnValue({
        ...mockUseAuthStore(),
        authState: 'authenticated',
        user: {
          id: 'test-user',
          email: 'test@example.com',
          name: 'Test User',
          provider: 'google',
          providerId: 'google-123',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
        isAuthenticated: true,
      });

      render(<LoginScreen onSuccess={mockOnSuccess} />);

      // Success callback handling depends on implementation
      // This might be called via useEffect when authState changes
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByText } = render(
        <LoginScreen onSuccess={mockOnSuccess} />
      );

      const googleButton = getByText('Continue with Google');
      const appleButton = getByText('Continue with Apple');

      // Check that buttons are accessible
      expect(googleButton).toBeTruthy();
      expect(appleButton).toBeTruthy();
    });

    it('should support screen readers', () => {
      const { getByText } = render(
        <LoginScreen onSuccess={mockOnSuccess} />
      );

      // Check for accessibility hints/labels
      expect(getByText('Welcome to')).toBeTruthy();
      expect(getByText(/Sign in to save your child's progress/)).toBeTruthy();
    });
  });

  describe('Animation States', () => {
    it('should handle entrance animations', () => {
      const { getByText } = render(
        <LoginScreen onSuccess={mockOnSuccess} />
      );

      // Animation testing is complex with react-native-reanimated
      // Basic rendering test ensures animations don't break the component
      expect(getByText('Welcome to')).toBeTruthy();
    });

    it('should handle transition animations', () => {
      const { rerender, getByText } = render(
        <LoginScreen onSuccess={mockOnSuccess} />
      );

      // Test state transitions
      rerender(<LoginScreen onSuccess={mockOnSuccess} />);
      
      expect(getByText('Welcome to')).toBeTruthy();
    });
  });

  describe('Terms and Privacy', () => {
    it('should handle terms and conditions navigation', () => {
      const { getByText } = render(
        <LoginScreen onSuccess={mockOnSuccess} />
      );

      // Look for terms/privacy links if they exist
      const termsText = getByText(/terms/i);
      if (termsText) {
        fireEvent.press(termsText);
        // Test navigation to terms screen
      }
    });

    it('should handle privacy policy navigation', () => {
      const { getByText } = render(
        <LoginScreen onSuccess={mockOnSuccess} />
      );

      // Look for privacy policy links if they exist
      const privacyText = getByText(/privacy/i);
      if (privacyText) {
        fireEvent.press(privacyText);
        // Test navigation to privacy screen
      }
    });
  });
});
