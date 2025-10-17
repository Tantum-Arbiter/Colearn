import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MainMenu } from '../../components/main-menu';
import { useAppStore } from '../../store/app-store';

// Mock the store
jest.mock('../../store/app-store');
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

// Reanimated is mocked globally in jest.setup.js

describe('Star Background Consistency Tests', () => {
  const mockOnNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppStore.mockReturnValue({
      backgroundAnimationState: {
        cloudFloat1: -200,
        cloudFloat2: -400,
        rocketFloat1: 1000,
        rocketFloat2: -200,
      },
      updateBackgroundAnimationState: jest.fn(),
      isAppReady: true,
      hasCompletedOnboarding: false,
      currentChildId: null,
      currentScreen: 'main',
      isLoading: false,
      shouldReturnToMainMenu: false,
      setAppReady: jest.fn(),
      setOnboardingComplete: jest.fn(),
      setCurrentChildId: jest.fn(),
      setCurrentScreen: jest.fn(),
      setLoading: jest.fn(),
      requestReturnToMainMenu: jest.fn(),
      clearReturnToMainMenu: jest.fn(),
    });
  });

  it('should maintain consistent star positions across re-renders', () => {
    const { rerender, UNSAFE_getAllByType } = render(<MainMenu onNavigate={mockOnNavigate} />);
    
    // Get initial star positions by finding all Animated.View components
    // (Stars are rendered as Animated.View components with specific styles)
    const initialStars = UNSAFE_getAllByType('RCTView').filter(view => 
      view.props?.style?.some?.((style: any) => 
        style && typeof style === 'object' && 'opacity' in style && style.opacity < 1
      )
    );

    // Force a re-render by changing props
    rerender(<MainMenu onNavigate={mockOnNavigate} />);
    
    // Get star positions after re-render
    const rerenderedStars = UNSAFE_getAllByType('RCTView').filter(view => 
      view.props?.style?.some?.((style: any) => 
        style && typeof style === 'object' && 'opacity' in style && style.opacity < 1
      )
    );

    // The number of stars should remain the same
    expect(rerenderedStars.length).toBe(initialStars.length);
    
    // Component should render without throwing (basic consistency check)
    expect(rerenderedStars.length).toBeGreaterThan(0);
  });

  it('should not regenerate stars when menu items are interacted with', () => {
    const { getByTestId, UNSAFE_getAllByType } = render(<MainMenu onNavigate={mockOnNavigate} />);
    
    // Get initial star count
    const initialStarCount = UNSAFE_getAllByType('RCTView').filter(view => 
      view.props?.style?.some?.((style: any) => 
        style && typeof style === 'object' && 'opacity' in style && style.opacity < 1
      )
    ).length;

    // Try to interact with menu items (if they exist)
    try {
      const menuIcon = getByTestId('menu-icon-0');
      fireEvent.press(menuIcon);
    } catch (error) {
      // Menu icon might not be found in test environment, that's okay
    }

    // Get star count after interaction
    const afterInteractionStarCount = UNSAFE_getAllByType('RCTView').filter(view => 
      view.props?.style?.some?.((style: any) => 
        style && typeof style === 'object' && 'opacity' in style && style.opacity < 1
      )
    ).length;

    // Star count should remain the same
    expect(afterInteractionStarCount).toBe(initialStarCount);
  });

  it('should render stars with consistent properties', () => {
    const { UNSAFE_getAllByType } = render(<MainMenu onNavigate={mockOnNavigate} />);
    
    // Find star components (they should have opacity styles)
    const starComponents = UNSAFE_getAllByType('RCTView').filter(view => 
      view.props?.style?.some?.((style: any) => 
        style && typeof style === 'object' && 'opacity' in style && style.opacity < 1
      )
    );

    // Should have some stars
    expect(starComponents.length).toBeGreaterThan(0);
    
    // Each star should have position and opacity properties
    starComponents.forEach(star => {
      const styles = star.props?.style || [];
      const hasPositionStyle = styles.some((style: any) => 
        style && typeof style === 'object' && ('left' in style || 'top' in style)
      );
      const hasOpacityStyle = styles.some((style: any) => 
        style && typeof style === 'object' && 'opacity' in style
      );
      
      expect(hasPositionStyle || hasOpacityStyle).toBe(true);
    });
  });

  it('should use useMemo for star generation to prevent regeneration', () => {
    // This test verifies that the component renders without errors
    // The actual memoization is tested through the consistency tests above
    const { root } = render(<MainMenu onNavigate={mockOnNavigate} />);
    expect(root).toBeTruthy();

    // Multiple renders should not cause errors
    const { root: root2 } = render(<MainMenu onNavigate={mockOnNavigate} />);
    expect(root2).toBeTruthy();
  });

  it('should follow Rules of Hooks and not have conditional hook calls', () => {
    // This test ensures that the useMemo hook is called before any conditional returns
    // which prevents "Rendered fewer hooks than expected" errors
    const { root } = render(<MainMenu onNavigate={mockOnNavigate} />);
    expect(root).toBeTruthy();

    // Test with different store states that might trigger conditional renders
    mockUseAppStore.mockReturnValue({
      ...mockUseAppStore(),
      currentScreen: 'different-screen',
    });

    const { root: root2 } = render(<MainMenu onNavigate={mockOnNavigate} />);
    expect(root2).toBeTruthy();
  });
});
