const createSensorMock = () => {
  const listeners = new Set();
  return {
    listeners,
    setUpdateInterval: jest.fn(),
    addListener: jest.fn((listener) => {
      listeners.add(listener);
      return {
        remove: jest.fn(() => listeners.delete(listener)),
      };
    }),
    removeAllListeners: jest.fn(() => listeners.clear()),
    isAvailableAsync: jest.fn(() => Promise.resolve(true)),
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
    getPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
    __emit: (measurement) => {
      listeners.forEach((listener) => listener(measurement));
    },
  };
};

const Accelerometer = createSensorMock();
const Gyroscope = createSensorMock();
const DeviceMotion = createSensorMock();

module.exports = {
  Accelerometer,
  Gyroscope,
  DeviceMotion,
};
