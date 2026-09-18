import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { MainMenu } from '../../components/main-menu';
import { useAppStore, type AppState } from '../../store/app-store';

// Mock the store
jest.mock('../../store/app-store');
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

// Reanimated is mocked globally in jest.setup.js

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

describe('MainMenu', () => {
  const mockOnNavigate = jest.fn();

  let state: Partial<AppState>;

  // the menu reads the store both bare and via selectors, so the mock has to
  // honour a selector argument the way zustand does
  const applyState = (next: Partial<AppState>) => {
    state = next;
    mockUseAppStore.mockImplementation(((selector?: (s: AppState) => unknown) =>
      typeof selector === 'function' ? selector(state as AppState) : state
    ) as unknown as typeof useAppStore);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    applyState({
      backgroundAnimationState: {
        cloudFloat1: -200,
        cloudFloat2: -400,
        rocketFloat1: 1000, // Static - rockets removed
        rocketFloat2: -200, // Static - rockets removed
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
      setCurrentChild: jest.fn(),
      setCurrentScreen: jest.fn(),
      setLoading: jest.fn(),
      setShowLoginAfterOnboarding: jest.fn(),
      requestReturnToMainMenu: jest.fn(),
      clearReturnToMainMenu: jest.fn(),
      subscriptionTier: 'free',
      _devSubscriptionOverride: null,
      getEffectiveTier: () => 'free',
      useHomeScene: false,
      storyProgress: {},
      getContinueReadingStoryId: jest.fn(() => null),
    });
  });

  // testID lands as data-testid under react-native-web, so query the tree directly
  const byTestId = (tree: ReturnType<typeof render>, testID: string) =>
    tree.UNSAFE_root.findAll(
      (n: { props: Record<string, unknown> }) => n.props.testID === testID
    );

  const MENU_ITEMS = [
    { id: 'stories', destination: 'stories' },
    { id: 'learning', destination: 'learning' },
    { id: 'instruments', destination: 'instruments' },
  ];

  it('renders the menu carousel', () => {
    const result = render(<MainMenu onNavigate={mockOnNavigate} />);

    expect(byTestId(result, 'menu-carousel').length).toBeGreaterThan(0);
  });

  it('renders every menu item in the carousel', () => {
    const result = render(<MainMenu onNavigate={mockOnNavigate} />);

    for (const item of MENU_ITEMS) {
      expect(byTestId(result, `menu-icon-${item.id}`).length).toBeGreaterThan(0);
    }
  });

  // every carousel item is intercepted by guardedOnNavigate and opens a
  // sub-menu instead of navigating, so navigation is a two-step flow
  it.each(MENU_ITEMS)('opens the $id sub-menu rather than navigating', ({ id }) => {
    const result = render(<MainMenu onNavigate={mockOnNavigate} />);

    fireEvent.press(byTestId(result, `menu-icon-${id}`)[0]);

    expect(mockOnNavigate).not.toHaveBeenCalled();
  });

  it('navigates once a story mode card is chosen from the sub-menu', () => {
    const result = render(<MainMenu onNavigate={mockOnNavigate} />);

    fireEvent.press(byTestId(result, 'menu-icon-stories')[0]);
    fireEvent.press(byTestId(result, 'main-mode-card-interactive')[0]);

    expect(mockOnNavigate).toHaveBeenCalledWith('stories-interactive');
  });

  it('does not navigate until a menu item is pressed', () => {
    render(<MainMenu onNavigate={mockOnNavigate} />);

    expect(mockOnNavigate).not.toHaveBeenCalled();
  });

  it('renders background elements', () => {
    const result = render(<MainMenu onNavigate={mockOnNavigate} />);

    expect(byTestId(result, 'main-menu-container').length).toBeGreaterThan(0);
  });

  it('renders animated elements without crashing', () => {
    expect(() => render(<MainMenu onNavigate={mockOnNavigate} />)).not.toThrow();
  });

  it('renders a single stories button', () => {
    const result = render(<MainMenu onNavigate={mockOnNavigate} />);

    // findAll matches the composite and its host node, so compare against
    // another single-instance item rather than asserting an exact count
    expect(byTestId(result, 'menu-icon-stories').length).toBe(
      byTestId(result, 'menu-icon-learning').length
    );
  });

  it('persists static rocket values, so no rocket is animated', () => {
    const update = jest.fn();
    applyState({ ...state, updateBackgroundAnimationState: update });

    render(<MainMenu onNavigate={mockOnNavigate} />).unmount();

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ rocketFloat1: 1000, rocketFloat2: -200 })
    );
  });

  it('saves finite cloud positions on unmount', () => {
    const update = jest.fn();
    applyState({ ...state, updateBackgroundAnimationState: update });

    render(<MainMenu onNavigate={mockOnNavigate} />).unmount();

    const saved = update.mock.calls[0][0] as Record<string, number>;
    expect(Number.isFinite(saved.cloudFloat1)).toBe(true);
    expect(Number.isFinite(saved.cloudFloat2)).toBe(true);
  });
});
