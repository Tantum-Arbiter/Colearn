// Mock for expo-screen-orientation
export const OrientationLock = {
  DEFAULT: 'DEFAULT',
  ALL: 'ALL',
  PORTRAIT: 'PORTRAIT',
  PORTRAIT_UP: 'PORTRAIT_UP',
  PORTRAIT_DOWN: 'PORTRAIT_DOWN',
  LANDSCAPE: 'LANDSCAPE',
  LANDSCAPE_LEFT: 'LANDSCAPE_LEFT',
  LANDSCAPE_RIGHT: 'LANDSCAPE_RIGHT',
};

export const Orientation = {
  UNKNOWN: 'UNKNOWN',
  PORTRAIT_UP: 'PORTRAIT_UP',
  PORTRAIT_DOWN: 'PORTRAIT_DOWN',
  LANDSCAPE_LEFT: 'LANDSCAPE_LEFT',
  LANDSCAPE_RIGHT: 'LANDSCAPE_RIGHT',
};

export const lockAsync = jest.fn(() => Promise.resolve());
export const unlockAsync = jest.fn(() => Promise.resolve());
export const getOrientationAsync = jest.fn(() => Promise.resolve(Orientation.PORTRAIT_UP));
export const getOrientationLockAsync = jest.fn(() => Promise.resolve(OrientationLock.DEFAULT));

export default {
  OrientationLock,
  Orientation,
  lockAsync,
  unlockAsync,
  getOrientationAsync,
  getOrientationLockAsync,
};
