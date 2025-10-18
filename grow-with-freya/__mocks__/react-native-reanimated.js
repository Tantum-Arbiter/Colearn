/**
 * Mock for react-native-reanimated
 * Provides simplified implementations for testing entrance animations
 */

const React = require('react');

// Mock shared value implementation
const mockUseSharedValue = (initialValue) => {
  const ref = React.useRef({ value: initialValue });
  return ref.current;
};

// Mock animated style implementation
const mockUseAnimatedStyle = (styleFunction) => {
  try {
    return styleFunction();
  } catch (error) {
    return {};
  }
};

// Mock timing function
const mockWithTiming = (value, config) => {
  if (config && config.callback) {
    setTimeout(config.callback, config.duration || 0);
  }
  return value;
};

// Mock delay function
const mockWithDelay = (delay, animation) => {
  return animation;
};

// Mock easing functions
const mockEasing = {
  out: (easing) => easing,
  in: (easing) => easing,
  inOut: (easing) => easing,
  cubic: () => {},
  bezier: () => {},
  linear: () => {},
};

// Mock Animated.View component
const MockAnimatedView = React.forwardRef((props, ref) => {
  const { style, children, ...otherProps } = props;
  const View = require('react-native').View;
  
  return React.createElement(View, {
    ...otherProps,
    ref,
    style: Array.isArray(style) ? style : [style],
  }, children);
});

// Mock Animated.Text component
const MockAnimatedText = React.forwardRef((props, ref) => {
  const { style, children, ...otherProps } = props;
  const Text = require('react-native').Text;
  
  return React.createElement(Text, {
    ...otherProps,
    ref,
    style: Array.isArray(style) ? style : [style],
  }, children);
});

// Mock Animated.ScrollView component
const MockAnimatedScrollView = React.forwardRef((props, ref) => {
  const { style, children, ...otherProps } = props;
  const ScrollView = require('react-native').ScrollView;
  
  return React.createElement(ScrollView, {
    ...otherProps,
    ref,
    style: Array.isArray(style) ? style : [style],
  }, children);
});

// Mock entrance animations
const mockFadeIn = {
  duration: jest.fn().mockReturnThis(),
  delay: jest.fn().mockReturnThis(),
  easing: jest.fn().mockReturnThis(),
};

const mockFadeInUp = {
  duration: jest.fn().mockReturnThis(),
  delay: jest.fn().mockReturnThis(),
  easing: jest.fn().mockReturnThis(),
};

const mockFadeInDown = {
  duration: jest.fn().mockReturnThis(),
  delay: jest.fn().mockReturnThis(),
  easing: jest.fn().mockReturnThis(),
};

const mockSlideInUp = {
  duration: jest.fn().mockReturnThis(),
  delay: jest.fn().mockReturnThis(),
  easing: jest.fn().mockReturnThis(),
};

const mockSlideInDown = {
  duration: jest.fn().mockReturnThis(),
  delay: jest.fn().mockReturnThis(),
  easing: jest.fn().mockReturnThis(),
};

// Mock layout animations
const mockLayout = {
  duration: jest.fn().mockReturnThis(),
  delay: jest.fn().mockReturnThis(),
  easing: jest.fn().mockReturnThis(),
};

// Mock gesture handler
const mockGestureHandlerRootView = React.forwardRef((props, ref) => {
  const View = require('react-native').View;
  return React.createElement(View, { ...props, ref });
});

// Main mock export
module.exports = {
  // Hooks
  useSharedValue: mockUseSharedValue,
  useAnimatedStyle: mockUseAnimatedStyle,
  useDerivedValue: jest.fn((fn) => ({ value: fn() })),
  useAnimatedGestureHandler: jest.fn(() => ({})),
  useAnimatedScrollHandler: jest.fn(() => ({})),
  useAnimatedRef: jest.fn(() => ({ current: null })),
  useAnimatedProps: jest.fn(() => ({})),

  // Animation functions
  withTiming: mockWithTiming,
  withSpring: jest.fn((value, config) => {
    if (config && config.callback) {
      setTimeout(config.callback, 300);
    }
    return value;
  }),
  withDelay: mockWithDelay,
  withRepeat: jest.fn((animation, numberOfReps) => animation),
  withSequence: jest.fn((...animations) => animations[animations.length - 1]),
  withDecay: jest.fn((config) => 0),

  // Easing
  Easing: mockEasing,

  // Animated components
  default: {
    View: MockAnimatedView,
    Text: MockAnimatedText,
    ScrollView: MockAnimatedScrollView,
    Image: React.forwardRef((props, ref) => {
      const Image = require('react-native').Image;
      return React.createElement(Image, { ...props, ref });
    }),
    FlatList: React.forwardRef((props, ref) => {
      const FlatList = require('react-native').FlatList;
      return React.createElement(FlatList, { ...props, ref });
    }),
  },

  // Entrance animations
  FadeIn: mockFadeIn,
  FadeInUp: mockFadeInUp,
  FadeInDown: mockFadeInDown,
  FadeOut: mockFadeIn,
  FadeOutUp: mockFadeInUp,
  FadeOutDown: mockFadeInDown,
  SlideInUp: mockSlideInUp,
  SlideInDown: mockSlideInDown,
  SlideInLeft: mockSlideInUp,
  SlideInRight: mockSlideInUp,
  SlideOutUp: mockSlideInUp,
  SlideOutDown: mockSlideInDown,
  SlideOutLeft: mockSlideInUp,
  SlideOutRight: mockSlideInUp,
  ZoomIn: mockFadeIn,
  ZoomOut: mockFadeIn,

  // Layout animations
  Layout: mockLayout,
  LinearTransition: mockLayout,
  FadingTransition: mockLayout,
  SequencedTransition: mockLayout,
  JumpingTransition: mockLayout,
  CurvedTransition: mockLayout,
  EntryExitTransition: mockLayout,

  // Gesture handler components (if needed)
  GestureHandlerRootView: mockGestureHandlerRootView,

  // Utilities
  runOnJS: jest.fn((fn) => fn),
  runOnUI: jest.fn((fn) => fn),
  interpolate: jest.fn((value, inputRange, outputRange) => outputRange[0]),
  interpolateColor: jest.fn(() => '#000000'),
  makeMutable: jest.fn((value) => ({ value })),
  cancelAnimation: jest.fn(),

  // Test utilities
  __TEST_UTILS__: {
    clearMocks: jest.fn(),
    getMockCalls: jest.fn(() => ({})),
  },
};
