const isDevice = true;

const brand = 'Apple';
const manufacturer = 'Apple';
const modelName = 'iPhone';
const modelId = 'iPhone14,2';
const designName = 'iPhone 13 Pro';
const productName = 'iPhone13,2';
const deviceYearClass = 2021;
const totalMemory = 6442450944;
const supportedCpuArchitectures = ['arm64'];
const osName = 'iOS';
const osVersion = '15.0';
const osBuildId = '19A346';
const osInternalBuildId = '19A346';
const deviceName = 'Test Device';

const DeviceType = {
  UNKNOWN: 0,
  PHONE: 1,
  TABLET: 2,
  DESKTOP: 3,
  TV: 4,
};

const deviceType = DeviceType.PHONE;

module.exports = {
  isDevice,
  brand,
  manufacturer,
  modelName,
  modelId,
  designName,
  productName,
  deviceYearClass,
  totalMemory,
  supportedCpuArchitectures,
  osName,
  osVersion,
  osBuildId,
  osInternalBuildId,
  deviceName,
  DeviceType,
  deviceType,
};
