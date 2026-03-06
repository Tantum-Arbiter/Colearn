const React = require('react');

// Mock View component
const MockView = React.forwardRef((props, ref) => {
  return React.createElement('View', { ...props, ref });
});

// Mock GestureDetector - renders children directly
const GestureDetector = ({ children }) => {
  return children;
};

// Mock Gesture factory
const Gesture = {
  Pan: () => ({
    onStart: () => Gesture.Pan(),
    onUpdate: () => Gesture.Pan(),
    onEnd: () => Gesture.Pan(),
    onFinalize: () => Gesture.Pan(),
    enabled: () => Gesture.Pan(),
    withTestId: () => Gesture.Pan(),
    activateAfterLongPress: () => Gesture.Pan(),
    minDistance: () => Gesture.Pan(),
    minPointers: () => Gesture.Pan(),
    maxPointers: () => Gesture.Pan(),
  }),
  Tap: () => ({
    onStart: () => Gesture.Tap(),
    onEnd: () => Gesture.Tap(),
    onFinalize: () => Gesture.Tap(),
    enabled: () => Gesture.Tap(),
    numberOfTaps: () => Gesture.Tap(),
    maxDuration: () => Gesture.Tap(),
  }),
  LongPress: () => ({
    onStart: () => Gesture.LongPress(),
    onEnd: () => Gesture.LongPress(),
    onFinalize: () => Gesture.LongPress(),
    enabled: () => Gesture.LongPress(),
    minDuration: () => Gesture.LongPress(),
  }),
  Pinch: () => ({
    onStart: () => Gesture.Pinch(),
    onUpdate: () => Gesture.Pinch(),
    onEnd: () => Gesture.Pinch(),
    enabled: () => Gesture.Pinch(),
  }),
  Rotation: () => ({
    onStart: () => Gesture.Rotation(),
    onUpdate: () => Gesture.Rotation(),
    onEnd: () => Gesture.Rotation(),
    enabled: () => Gesture.Rotation(),
  }),
  Fling: () => ({
    onStart: () => Gesture.Fling(),
    onEnd: () => Gesture.Fling(),
    enabled: () => Gesture.Fling(),
    direction: () => Gesture.Fling(),
  }),
  Simultaneous: (...gestures) => ({
    gestures,
  }),
  Exclusive: (...gestures) => ({
    gestures,
  }),
  Race: (...gestures) => ({
    gestures,
  }),
};

// Mock GestureHandlerRootView
const GestureHandlerRootView = React.forwardRef((props, ref) => {
  return React.createElement('View', { ...props, ref });
});

// Mock other commonly used components
const PanGestureHandler = MockView;
const TapGestureHandler = MockView;
const LongPressGestureHandler = MockView;
const PinchGestureHandler = MockView;
const RotationGestureHandler = MockView;
const FlingGestureHandler = MockView;
const ScrollView = MockView;
const FlatList = MockView;

// State constants
const State = {
  UNDETERMINED: 0,
  FAILED: 1,
  BEGAN: 2,
  CANCELLED: 3,
  ACTIVE: 4,
  END: 5,
};

// Direction constants
const Directions = {
  RIGHT: 1,
  LEFT: 2,
  UP: 4,
  DOWN: 8,
};

module.exports = {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
  PanGestureHandler,
  TapGestureHandler,
  LongPressGestureHandler,
  PinchGestureHandler,
  RotationGestureHandler,
  FlingGestureHandler,
  ScrollView,
  FlatList,
  State,
  Directions,
  // Gesture type enums
  gestureHandlerRootHOC: (Component) => Component,
  createNativeWrapper: (Component) => Component,
};

