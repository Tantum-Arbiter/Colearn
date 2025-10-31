const storage = new Map();

export const isAvailableAsync = jest.fn().mockResolvedValue(true);

export const setItemAsync = jest.fn().mockImplementation((key, value, options) => {
  storage.set(key, value);
  return Promise.resolve();
});

export const getItemAsync = jest.fn().mockImplementation((key, options) => {
  return Promise.resolve(storage.get(key) || null);
});

export const deleteItemAsync = jest.fn().mockImplementation((key, options) => {
  storage.delete(key);
  return Promise.resolve();
});

export const SecureStoreAccessibility = {
  WHEN_UNLOCKED: 'whenUnlocked',
  AFTER_FIRST_UNLOCK: 'afterFirstUnlock',
  ALWAYS: 'always',
  WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 'whenPasscodeSetThisDeviceOnly',
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'whenUnlockedThisDeviceOnly',
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'afterFirstUnlockThisDeviceOnly',
  ALWAYS_THIS_DEVICE_ONLY: 'alwaysThisDeviceOnly',
};

// Helper for tests to clear storage
export const __clearStorage = () => {
  storage.clear();
};

export default {
  isAvailableAsync,
  setItemAsync,
  getItemAsync,
  deleteItemAsync,
  SecureStoreAccessibility,
  __clearStorage,
};
