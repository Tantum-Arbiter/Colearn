/**
 * Mock for DeviceInfoService for Jest tests
 *
 * COPPA-Compliant: Only includes minimal, non-PII device data
 */

const mockDeviceId = 'test-device-id-12345';
const mockDeviceType = 'phone';
const mockPlatform = 'ios';
const mockAppVersion = '1.0.0';
const mockOsVersion = '15.0';
const mockBrand = 'Apple';
const mockManufacturer = 'Apple';

module.exports = {
  DeviceInfoService: {
    initialize: jest.fn().mockResolvedValue(undefined),

    getDeviceId: jest.fn().mockReturnValue(mockDeviceId),

    getDeviceType: jest.fn().mockReturnValue(mockDeviceType),

    getPlatform: jest.fn().mockReturnValue(mockPlatform),

    getAppVersion: jest.fn().mockReturnValue(mockAppVersion),

    getOsVersion: jest.fn().mockReturnValue(mockOsVersion),

    getBrand: jest.fn().mockReturnValue(mockBrand),

    getManufacturer: jest.fn().mockReturnValue(mockManufacturer),

    getDeviceHeaders: jest.fn().mockReturnValue({
      'X-Device-ID': mockDeviceId,
      'X-Device-Type': mockDeviceType,
      'X-Client-Platform': mockPlatform,
      'X-App-Version': mockAppVersion,
      'X-OS-Version': mockOsVersion,
      'X-Device-Brand': mockBrand,
      'X-Device-Manufacturer': mockManufacturer,
    }),
  },
};

