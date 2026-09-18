// Mock for expo-screen-orientation
const OrientationLock = {
  DEFAULT: 'DEFAULT',
  ALL: 'ALL',
  PORTRAIT: 'PORTRAIT',
  PORTRAIT_UP: 'PORTRAIT_UP',
  PORTRAIT_DOWN: 'PORTRAIT_DOWN',
  LANDSCAPE: 'LANDSCAPE',
  LANDSCAPE_LEFT: 'LANDSCAPE_LEFT',
  LANDSCAPE_RIGHT: 'LANDSCAPE_RIGHT',
};

const Orientation = {
  UNKNOWN: 'UNKNOWN',
  PORTRAIT_UP: 'PORTRAIT_UP',
  PORTRAIT_DOWN: 'PORTRAIT_DOWN',
  LANDSCAPE_LEFT: 'LANDSCAPE_LEFT',
  LANDSCAPE_RIGHT: 'LANDSCAPE_RIGHT',
};

const lockAsync = jest.fn(() => Promise.resolve());
const unlockAsync = jest.fn(() => Promise.resolve());
const getOrientationAsync = jest.fn(() => Promise.resolve(Orientation.PORTRAIT_UP));
const getOrientationLockAsync = jest.fn(() => Promise.resolve(OrientationLock.DEFAULT));

// Registered listeners, so tests can drive a real orientation change instead of
// waiting on a timer. Used by the story-garden book-opening bridge tests.
let listeners = [];

const addOrientationChangeListener = jest.fn((handler) => {
  listeners.push(handler);
  return {
    remove: jest.fn(() => {
      listeners = listeners.filter((registered) => registered !== handler);
    }),
  };
});

const removeOrientationChangeListener = jest.fn((handler) => {
  listeners = listeners.filter((registered) => registered !== handler);
});

// Test helper: emit an orientation change to every registered listener.
const __emitOrientationChange = (orientation) => {
  const event = {
    orientationInfo: { orientation, verticalSizeClass: undefined, horizontalSizeClass: undefined },
    orientationLock: OrientationLock.DEFAULT,
  };
  listeners.forEach((handler) => handler(event));
};

// Test helper: drop every registered listener between tests.
const __resetListeners = () => {
  listeners = [];
};

module.exports = {
  OrientationLock,
  Orientation,
  lockAsync,
  unlockAsync,
  getOrientationAsync,
  getOrientationLockAsync,
  addOrientationChangeListener,
  removeOrientationChangeListener,
  __emitOrientationChange,
  __resetListeners,
};
