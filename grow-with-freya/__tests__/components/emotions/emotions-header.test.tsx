/**
 * The Feelings screen lends its header to the views it covers: they are drawn
 * inside it with `skipBackground`, and it draws the one header at the top
 * z-level. When the relax view kept drawing its own as well, both titles sat on
 * top of each other and there were two back arrows in the same corner.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';

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
jest.mock('@/components/main-menu/animated-components', () => ({ MoonBottomImage: 'MoonBottomImage' }));
jest.mock('@/components/ui/music-control', () => ({ MusicControl: 'MusicControl' }));
jest.mock('@/components/learning/real-world-bridge-overlay', () => ({ RealWorldBridgeOverlay: () => null }));
jest.mock('@/hooks/use-back-button-text', () => ({ useBackButtonText: () => 'Back' }));

// the header renders its props so the test can read what it was told to say
jest.mock('@/components/ui/page-header', () => {
  const { View } = require('react-native');
  return {
    PageHeader: (props: { title: string; onBack: () => void }) => (
      <View testID="page-header" title={props.title} onBack={props.onBack} />
    ),
  };
});

/** Stands in for the menu, and gives the test the way through to relax. */
let goToParents: () => void = () => {};
jest.mock('@/components/emotions/emotions-unified-screen', () => {
  const { View } = require('react-native');
  return {
    EmotionsUnifiedScreen: (props: { onNavigateToParents: () => void }) => {
      goToParents = props.onNavigateToParents;
      return <View testID="emotions-menu" />;
    },
  };
});

/** A relax view that behaves as it does in the app: given skipBackground it
 *  draws no header of its own. */
jest.mock('@/components/music/sleep-selection-screen', () => {
  const { View } = require('react-native');
  const { PageHeader } = require('@/components/ui/page-header');
  return {
    SleepSelectionScreen: ({ skipBackground, onBack }: { skipBackground?: boolean; onBack: () => void }) => (
      <View testID="relax">
        {!skipBackground ? <PageHeader title="relaxMusic.screenTitle" onBack={onBack} /> : null}
      </View>
    ),
  };
});

import { EmotionsScreen } from '@/components/emotions/emotions-screen';

function headers(tree: ReturnType<typeof render>) {
  return tree.UNSAFE_root.findAll((node: { props: Record<string, unknown> }) => node.props.testID === 'page-header');
}

describe('the Feelings screen header', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('draws one header, which speaks for the menu', () => {
    const underTest = render(<EmotionsScreen onBack={jest.fn()} />);

    expect(headers(underTest)).toHaveLength(1);
    expect(headers(underTest)[0].props.title).toBe('emotions.title');
  });

  it('still draws only one when the relax view is showing', () => {
    const underTest = render(<EmotionsScreen onBack={jest.fn()} />);

    act(() => goToParents());

    expect(headers(underTest)).toHaveLength(1);
  });

  it('speaks for the relax view while that is the one showing', () => {
    const underTest = render(<EmotionsScreen onBack={jest.fn()} />);

    act(() => goToParents());

    expect(headers(underTest)[0].props.title).toBe('relaxMusic.screenTitle');
  });

  /** Its back arrow returns to the menu rather than leaving Feelings entirely. */
  it('goes back to the menu from relax, not out of the screen', () => {
    const onBack = jest.fn();
    const underTest = render(<EmotionsScreen onBack={onBack} />);
    act(() => goToParents());

    act(() => headers(underTest)[0].props.onBack());
    act(() => {
      jest.advanceTimersByTime(600);
    });

    expect(onBack).not.toHaveBeenCalled();
    expect(headers(underTest)[0].props.title).toBe('emotions.title');
  });
});
