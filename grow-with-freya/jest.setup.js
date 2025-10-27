// Mock react-native-worklets first (must be before reanimated)
jest.mock('react-native-worklets', () => ({
  __esModule: true,
  default: {},
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  const Text = require('react-native').Text;
  const ScrollView = require('react-native').ScrollView;

  return {
    __esModule: true,
    default: {
      View: View,
      Text: Text,
      ScrollView: ScrollView,
      createAnimatedComponent: (component) => component,
      call: () => {},
    },
    View: View,
    Text: Text,
    ScrollView: ScrollView,
    createAnimatedComponent: (component) => component,
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((value) => value),
    withSpring: jest.fn((value) => value),
    withDecay: jest.fn((value) => value),
    withDelay: jest.fn((delay, animation) => animation),
    withSequence: jest.fn((...values) => values[values.length - 1]),
    withRepeat: jest.fn((value) => value),
    cancelAnimation: jest.fn(),
    runOnJS: jest.fn((fn) => fn),
    runOnUI: jest.fn((fn) => fn),
    interpolate: jest.fn((value, inputRange, outputRange) => outputRange[0]),
    Extrapolate: { CLAMP: 'clamp' },
    Easing: {
      linear: jest.fn(),
      ease: jest.fn(),
      quad: jest.fn(),
      cubic: jest.fn(),
      poly: jest.fn(),
      sin: jest.fn(),
      circle: jest.fn(),
      exp: jest.fn(),
      elastic: jest.fn(),
      back: jest.fn(),
      bounce: jest.fn(),
      bezier: jest.fn(),
      in: jest.fn(),
      out: jest.fn(),
      inOut: jest.fn(),
    },
  };
});

// Mock expo modules
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, colors, ...props }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, {
      ...props,
      testID: props.testID || 'linear-gradient',
      colors: colors
    }, children);
  },
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));

jest.mock('expo-font', () => ({
  loadAsync: jest.fn(),
}));

// Mock expo-av
jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn(() => Promise.resolve({
        sound: {
          playAsync: jest.fn(),
          pauseAsync: jest.fn(),
          stopAsync: jest.fn(),
          unloadAsync: jest.fn(),
          setIsLoopingAsync: jest.fn(),
          setVolumeAsync: jest.fn(),
          getStatusAsync: jest.fn(() => Promise.resolve({
            isLoaded: true,
            isPlaying: false,
            positionMillis: 0,
            durationMillis: 30000,
          })),
        },
        status: {
          isLoaded: true,
          isPlaying: false,
          positionMillis: 0,
          durationMillis: 30000,
        },
      })),
    },
    setAudioModeAsync: jest.fn(),
  },
  AVPlaybackStatus: {},
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { View } = require('react-native');

  const createIconComponent = (name) => {
    const IconComponent = ({ name: iconName, size = 24, color = '#000', testID, ...props }) => {
      return React.createElement(View, {
        ...props,
        testID: testID || `icon-${name}-${iconName}`,
        children: iconName || name,
        style: { fontSize: size, color },
        size,
        color
      });
    };

    IconComponent.displayName = `${name}Icon`;
    return IconComponent;
  };

  return {
    Ionicons: createIconComponent('Ionicons'),
    AntDesign: createIconComponent('AntDesign'),
    MaterialIcons: createIconComponent('MaterialIcons'),
    FontAwesome: createIconComponent('FontAwesome'),
    Entypo: createIconComponent('Entypo'),
    Feather: createIconComponent('Feather'),
    MaterialCommunityIcons: createIconComponent('MaterialCommunityIcons'),
  };
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 375, height: 812 }),
}));

// Mock custom hooks
jest.mock('@/hooks/use-theme-color', () => ({
  useThemeColor: () => '#000000',
}));

// Mock story transition context
jest.mock('@/contexts/story-transition-context', () => ({
  useStoryTransition: jest.fn(() => ({
    isTransitioning: false,
    selectedStoryId: null,
    selectedStory: null,
    cardPosition: null,
    startTransition: jest.fn(),
    completeTransition: jest.fn(),
    transitionScale: { value: 1 },
    transitionX: { value: 0 },
    transitionY: { value: 0 },
    transitionOpacity: { value: 1 },
    transitionAnimatedStyle: {},
  })),
  StoryTransitionProvider: ({ children }) => children,
}));

// Mock SafeAreaProvider
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 44, left: 0, right: 0, bottom: 34 }),
  SafeAreaView: ({ children }) => children,
}));

// Mock app store
jest.mock('@/store/app-store', () => ({
  useAppStore: jest.fn(() => ({
    isAppReady: true,
    hasCompletedOnboarding: true,
    currentChildId: null,
    currentScreen: 'main-menu',
    isLoading: false,
    shouldReturnToMainMenu: false,
    backgroundAnimationState: {
      cloudFloat1: 0,
      cloudFloat2: 0,
      rocketFloat1: 0,
      rocketFloat2: 0,
    },
    setAppReady: jest.fn(),
    setOnboardingComplete: jest.fn(),
    setCurrentChild: jest.fn(),
    setCurrentScreen: jest.fn(),
    setLoading: jest.fn(),
    requestReturnToMainMenu: jest.fn(),
    clearReturnToMainMenu: jest.fn(),
    updateBackgroundAnimationState: jest.fn(),
  })),
}));

// Image imports are handled by moduleNameMapper in jest.config.js

// Mock ThemedText component - using correct path from root
jest.mock('./components/themed-text', () => ({
  ThemedText: ({ children, ...props }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, props, children);
  },
}));

// Mock react-native-svg
jest.mock('react-native-svg', () => ({
  SvgXml: 'SvgXml',
  Svg: 'Svg',
  Circle: 'Circle',
  Ellipse: 'Ellipse',
  G: 'G',
  Text: 'Text',
  TSpan: 'TSpan',
  TextPath: 'TextPath',
  Path: 'Path',
  Polygon: 'Polygon',
  Polyline: 'Polyline',
  Line: 'Line',
  Rect: 'Rect',
  Use: 'Use',
  Image: 'Image',
  Symbol: 'Symbol',
  Defs: 'Defs',
  LinearGradient: 'LinearGradient',
  RadialGradient: 'RadialGradient',
  Stop: 'Stop',
  ClipPath: 'ClipPath',
  Pattern: 'Pattern',
  Mask: 'Mask',
}));

// Mock React Native's Animated API
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native-web');

  RN.Animated = {
    ...RN.Animated,
    timing: jest.fn(() => ({
      start: jest.fn(),
      stop: jest.fn(),
      reset: jest.fn(),
    })),
    spring: jest.fn(() => ({
      start: jest.fn(),
      stop: jest.fn(),
      reset: jest.fn(),
    })),
    decay: jest.fn(() => ({
      start: jest.fn(),
      stop: jest.fn(),
      reset: jest.fn(),
    })),
    Value: jest.fn(() => ({
      setValue: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
      stopAnimation: jest.fn(),
      resetAnimation: jest.fn(),
      interpolate: jest.fn(() => ({
        setValue: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        removeAllListeners: jest.fn(),
        stopAnimation: jest.fn(),
        resetAnimation: jest.fn(),
      })),
    })),
  };

  return RN;
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to ignore specific console methods in tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};
