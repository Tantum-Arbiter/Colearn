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

module.exports = {
  OrientationLock,
  Orientation,
  lockAsync,
  unlockAsync,
  getOrientationAsync,
  getOrientationLockAsync,
};
