// Mock for expo-store-review
const isAvailableAsync = jest.fn(() => Promise.resolve(true));
const requestReview = jest.fn(() => Promise.resolve());
const hasAction = jest.fn(() => Promise.resolve(false));

module.exports = {
  isAvailableAsync,
  requestReview,
  hasAction,
};
