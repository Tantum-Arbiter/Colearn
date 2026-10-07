/**
 * The feelings game is the only place that knows a level has been finished.
 * It already tells the screen-time provider; now it tells the learning plan too,
 * naming the activity for the theme that was played, so the island's day is
 * ticked off whichever theme the child chose.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { EmotionsGameScreen } from '@/components/emotions/emotions-game-screen';
import { EMOTION_GAME_CONFIG } from '@/data/emotions';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: ({ children, style }: { children?: React.ReactNode; style?: unknown }) => <View style={style}>{children}</View> };
});
jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { Ionicons: (props: { name: string }) => <Text>{props.name}</Text> };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/components/ui/earth-horizon', () => ({ EarthHorizon: () => null }));
jest.mock('@/components/learning/real-world-bridge-overlay', () => ({ RealWorldBridgeOverlay: () => null }));
jest.mock('@/components/ui/page-header', () => {
  const { View } = require('react-native');
  return { PageHeader: () => <View testID="page-header" /> };
});
jest.mock('@/components/emotions/emotion-card', () => {
  const { View } = require('react-native');
  return { EmotionCard: () => <View testID="emotion-card" /> };
});

const mockSetLastCompletedActivityId = jest.fn();
jest.mock('@/components/screen-time', () => ({
  useScreenTime: () => ({ setLastCompletedActivityId: mockSetLastCompletedActivityId }),
}));

const mockRecordActivityFinished = jest.fn();
jest.mock('@/store/app-store', () => ({
  useAppStore: jest.fn((selector?: (state: Record<string, unknown>) => unknown) => {
    const state = { recordActivityFinished: mockRecordActivityFinished };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

const SETTLE_MS = 1000;

function expressButton(root: ReturnType<typeof render>['UNSAFE_root']) {
  return root.findAll((node) => typeof node.props.onPress === 'function' && 'disabled' in node.props)[0];
}

function playOneEmotion(view: ReturnType<typeof render>) {
  act(() => {
    jest.advanceTimersByTime(SETTLE_MS);
  });
  act(() => {
    expressButton(view.UNSAFE_root).props.onPress();
  });
  act(() => {
    jest.advanceTimersByTime(SETTLE_MS);
  });
}

describe('EmotionsGameScreen, when a level is finished', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockRecordActivityFinished.mockClear();
    mockSetLastCompletedActivityId.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('tells the plan the activity for the theme played, beside the screen-time report', () => {
    const view = render(<EmotionsGameScreen onBack={jest.fn()} onGameComplete={jest.fn()} selectedTheme="animals" />);

    for (let round = 0; round < EMOTION_GAME_CONFIG.emotionsPerLevel; round += 1) playOneEmotion(view);

    expect(mockRecordActivityFinished).toHaveBeenCalledTimes(1);
    expect(mockRecordActivityFinished).toHaveBeenCalledWith('animal-feelings');
    expect(mockSetLastCompletedActivityId).toHaveBeenCalledWith('animal-feelings');
  });

  it.each([
    ['emoji', 'emotion-faces'],
    ['bear', 'my-feelings'],
  ] as const)('names the %s theme as %s', (theme, activityId) => {
    const view = render(<EmotionsGameScreen onBack={jest.fn()} onGameComplete={jest.fn()} selectedTheme={theme} />);

    for (let round = 0; round < EMOTION_GAME_CONFIG.emotionsPerLevel; round += 1) playOneEmotion(view);

    expect(mockRecordActivityFinished).toHaveBeenCalledWith(activityId);
  });

  it('says nothing while the level is still being played', () => {
    const view = render(<EmotionsGameScreen onBack={jest.fn()} onGameComplete={jest.fn()} />);

    for (let round = 0; round < EMOTION_GAME_CONFIG.emotionsPerLevel - 1; round += 1) playOneEmotion(view);

    expect(mockRecordActivityFinished).not.toHaveBeenCalled();
  });
});
