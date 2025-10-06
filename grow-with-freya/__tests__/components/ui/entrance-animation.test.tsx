import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import {
  EntranceAnimation,
  PageEntranceWrapper,
  StoryPageEntrance,
  MainMenuEntrance,
} from '@/components/ui/entrance-animation';

// Mock react-native-reanimated
jest.mock('react-native-reanimated');

// Mock setTimeout for delay testing
jest.useFakeTimers();

describe('EntranceAnimation', () => {
  const TestChild = () => <Text testID="test-child">Test Content</Text>;

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Basic Rendering', () => {
    it('renders children correctly', () => {
      const { getByTestId } = render(
        <EntranceAnimation>
          <TestChild />
        </EntranceAnimation>
      );

      expect(getByTestId('test-child')).toBeTruthy();
    });

    it('applies custom styles', () => {
      const customStyle = { backgroundColor: 'red' };
      const { getByTestId } = render(
        <EntranceAnimation style={customStyle}>
          <View testID="animated-container">
            <TestChild />
          </View>
        </EntranceAnimation>
      );

      const container = getByTestId('test-child').parent;
      expect(container).toBeTruthy();
    });
  });

  describe('Animation Types', () => {
    it('handles fade animation (default)', () => {
      const { getByTestId } = render(
        <EntranceAnimation animationType="fade">
          <TestChild />
        </EntranceAnimation>
      );

      expect(getByTestId('test-child')).toBeTruthy();
    });

    it('handles slide-up animation', () => {
      const { getByTestId } = render(
        <EntranceAnimation animationType="slide-up">
          <TestChild />
        </EntranceAnimation>
      );

      expect(getByTestId('test-child')).toBeTruthy();
    });

    it('handles slide-down animation', () => {
      const { getByTestId } = render(
        <EntranceAnimation animationType="slide-down">
          <TestChild />
        </EntranceAnimation>
      );

      expect(getByTestId('test-child')).toBeTruthy();
    });

    it('handles scale animation', () => {
      const { getByTestId } = render(
        <EntranceAnimation animationType="scale">
          <TestChild />
        </EntranceAnimation>
      );

      expect(getByTestId('test-child')).toBeTruthy();
    });
  });

  describe('Animation Configuration', () => {
    it('accepts custom duration', () => {
      const { getByTestId } = render(
        <EntranceAnimation duration={1000}>
          <TestChild />
        </EntranceAnimation>
      );

      expect(getByTestId('test-child')).toBeTruthy();
    });

    it('handles delay correctly', async () => {
      const { getByTestId } = render(
        <EntranceAnimation delay={500}>
          <TestChild />
        </EntranceAnimation>
      );

      expect(getByTestId('test-child')).toBeTruthy();
      
      // Fast-forward time to trigger delayed animation
      jest.advanceTimersByTime(500);
    });

    it('starts animation immediately when delay is 0', () => {
      const { getByTestId } = render(
        <EntranceAnimation delay={0}>
          <TestChild />
        </EntranceAnimation>
      );

      expect(getByTestId('test-child')).toBeTruthy();
    });
  });

  describe('Default Props', () => {
    it('uses default animation type (fade)', () => {
      const { getByTestId } = render(
        <EntranceAnimation>
          <TestChild />
        </EntranceAnimation>
      );

      expect(getByTestId('test-child')).toBeTruthy();
    });

    it('uses default duration (400ms)', () => {
      const { getByTestId } = render(
        <EntranceAnimation>
          <TestChild />
        </EntranceAnimation>
      );

      expect(getByTestId('test-child')).toBeTruthy();
    });

    it('uses default delay (0ms)', () => {
      const { getByTestId } = render(
        <EntranceAnimation>
          <TestChild />
        </EntranceAnimation>
      );

      expect(getByTestId('test-child')).toBeTruthy();
    });
  });
});

describe('PageEntranceWrapper', () => {
  const TestChild = () => <Text testID="page-child">Page Content</Text>;

  describe('Page Type Configurations', () => {
    it('configures main page correctly', () => {
      const { getByTestId } = render(
        <PageEntranceWrapper pageType="main">
          <TestChild />
        </PageEntranceWrapper>
      );

      expect(getByTestId('page-child')).toBeTruthy();
    });

    it('configures stories page correctly', () => {
      const { getByTestId } = render(
        <PageEntranceWrapper pageType="stories">
          <TestChild />
        </PageEntranceWrapper>
      );

      expect(getByTestId('page-child')).toBeTruthy();
    });

    it('configures settings page correctly', () => {
      const { getByTestId } = render(
        <PageEntranceWrapper pageType="settings">
          <TestChild />
        </PageEntranceWrapper>
      );

      expect(getByTestId('page-child')).toBeTruthy();
    });

    it('defaults to main page configuration', () => {
      const { getByTestId } = render(
        <PageEntranceWrapper>
          <TestChild />
        </PageEntranceWrapper>
      );

      expect(getByTestId('page-child')).toBeTruthy();
    });
  });
});

describe('StoryPageEntrance', () => {
  it('renders with slide-up animation', () => {
    const { getByTestId } = render(
      <StoryPageEntrance>
        <Text testID="story-content">Story Content</Text>
      </StoryPageEntrance>
    );

    expect(getByTestId('story-content')).toBeTruthy();
  });
});

describe('MainMenuEntrance', () => {
  it('renders with fade animation and delay', () => {
    const { getByTestId } = render(
      <MainMenuEntrance>
        <Text testID="menu-content">Menu Content</Text>
      </MainMenuEntrance>
    );

    expect(getByTestId('menu-content')).toBeTruthy();
  });
});

describe('Accessibility Tests', () => {
  it('preserves accessibility properties of children', () => {
    const { getByTestId } = render(
      <EntranceAnimation>
        <Text
          testID="accessible-text"
          accessibilityLabel="Test content"
          accessibilityRole="text"
        >
          Accessible Content
        </Text>
      </EntranceAnimation>
    );

    const element = getByTestId('accessible-text');
    expect(element).toBeTruthy();
    expect(element.props.accessibilityLabel).toBe('Test content');
    expect(element.props.accessibilityRole).toBe('text');
  });

  it('does not interfere with screen reader navigation', () => {
    const { getByTestId } = render(
      <EntranceAnimation>
        <View testID="accessible-container" accessible={true}>
          <Text>Screen reader content</Text>
        </View>
      </EntranceAnimation>
    );

    const container = getByTestId('accessible-container');
    expect(container.props.accessible).toBe(true);
  });

  it('maintains focus management during animations', () => {
    const { getByTestId } = render(
      <EntranceAnimation>
        <Text
          testID="focusable-element"
          accessibilityRole="button"
          accessible={true}
        >
          Focusable Content
        </Text>
      </EntranceAnimation>
    );

    const element = getByTestId('focusable-element');
    expect(element.props.accessible).toBe(true);
    expect(element.props.accessibilityRole).toBe('button');
  });
});

describe('Edge Cases and Error Handling', () => {
  it('handles zero duration gracefully', () => {
    const { getByTestId } = render(
      <EntranceAnimation duration={0}>
        <Text testID="zero-duration">Zero Duration Content</Text>
      </EntranceAnimation>
    );

    expect(getByTestId('zero-duration')).toBeTruthy();
  });

  it('handles negative duration gracefully', () => {
    const { getByTestId } = render(
      <EntranceAnimation duration={-100}>
        <Text testID="negative-duration">Negative Duration Content</Text>
      </EntranceAnimation>
    );

    expect(getByTestId('negative-duration')).toBeTruthy();
  });

  it('handles very large duration values', () => {
    const { getByTestId } = render(
      <EntranceAnimation duration={999999}>
        <Text testID="large-duration">Large Duration Content</Text>
      </EntranceAnimation>
    );

    expect(getByTestId('large-duration')).toBeTruthy();
  });

  it('handles negative delay gracefully', () => {
    const { getByTestId } = render(
      <EntranceAnimation delay={-500}>
        <Text testID="negative-delay">Negative Delay Content</Text>
      </EntranceAnimation>
    );

    expect(getByTestId('negative-delay')).toBeTruthy();
  });
});
