/**
 * Mock for DeviceInfoService for Jest tests
 */

const mockDeviceId = 'test-device-id-12345';
const mockDeviceType = 'phone';
const mockPlatform = 'ios';
const mockAppVersion = '1.0.0';

module.exports = {
  DeviceInfoService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    
    getDeviceId: jest.fn().mockReturnValue(mockDeviceId),
    
    getDeviceType: jest.fn().mockReturnValue(mockDeviceType),
    
    getPlatform: jest.fn().mockReturnValue(mockPlatform),
    
    getAppVersion: jest.fn().mockReturnValue(mockAppVersion),
    
    getModelName: jest.fn().mockReturnValue('iPhone 13 Pro'),
    
    getOsVersion: jest.fn().mockReturnValue('15.0'),
    
    getDeviceHeaders: jest.fn().mockReturnValue({
      'X-Device-ID': mockDeviceId,
      'X-Device-Type': mockDeviceType,
      'X-Client-Platform': mockPlatform,
      'X-App-Version': mockAppVersion,
    }),
    
    getDeviceMetadata: jest.fn().mockReturnValue({
      deviceId: mockDeviceId,
      deviceType: mockDeviceType,
      platform: mockPlatform,
      appVersion: mockAppVersion,
      modelName: 'iPhone 13 Pro',
      osVersion: '15.0',
      brand: 'Apple',
      manufacturer: 'Apple',
    }),
  },
};

