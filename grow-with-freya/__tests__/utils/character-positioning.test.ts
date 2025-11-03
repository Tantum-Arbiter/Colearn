import {
  getDeviceInfo,
  convertToPixels,
  getCharacterPositionStyle,
  createResponsivePosition,
  validateCharacterPosition,
  adjustPositionForSafeArea,
  PRESET_POSITIONS,
} from '@/utils/character-positioning';
import { CharacterPosition } from '@/types/story';

// Mock Dimensions
jest.mock('react-native', () => ({
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })), // iPhone X dimensions
  },
}));

describe('Character Positioning Utils', () => {
  beforeEach(() => {
    // Reset to default iPhone X dimensions
    const { Dimensions } = require('react-native');
    Dimensions.get.mockReturnValue({ width: 375, height: 812 });
  });

  describe('getDeviceInfo', () => {
    it('identifies phone correctly', () => {
      const deviceInfo = getDeviceInfo();
      expect(deviceInfo.isTablet).toBe(false);
      expect(deviceInfo.category).toBe('phone');
      expect(deviceInfo.width).toBe(812); // Landscape width
      expect(deviceInfo.height).toBe(375); // Landscape height
    });

    it('identifies tablet correctly', () => {
      const { Dimensions } = require('react-native');
      Dimensions.get.mockReturnValue({ width: 768, height: 1024 }); // iPad dimensions

      const deviceInfo = getDeviceInfo();
      expect(deviceInfo.isTablet).toBe(true);
      expect(deviceInfo.category).toBe('tablet');
      expect(deviceInfo.width).toBe(1024); // Landscape width
      expect(deviceInfo.height).toBe(768); // Landscape height
    });

    it('identifies large tablet correctly', () => {
      const { Dimensions } = require('react-native');
      Dimensions.get.mockReturnValue({ width: 1024, height: 1366 }); // iPad Pro dimensions

      const deviceInfo = getDeviceInfo();
      expect(deviceInfo.isTablet).toBe(true);
      expect(deviceInfo.category).toBe('large-tablet');
    });

    it('identifies large phone correctly', () => {
      const { Dimensions } = require('react-native');
      Dimensions.get.mockReturnValue({ width: 414, height: 896 }); // iPhone 11 dimensions

      const deviceInfo = getDeviceInfo();
      expect(deviceInfo.isTablet).toBe(false);
      expect(deviceInfo.category).toBe('large-phone');
    });
  });

  describe('convertToPixels', () => {
    it('converts percentage values correctly', () => {
      const deviceInfo = getDeviceInfo();
      const result = convertToPixels('50%', 'width', deviceInfo);
      expect(result).toBe(406); // 50% of 812
    });

    it('converts pixel string values correctly', () => {
      const result = convertToPixels('100px', 'width');
      expect(result).toBe(100);
    });

    it('handles numeric values correctly', () => {
      const result = convertToPixels(150, 'width');
      expect(result).toBe(150);
    });

    it('handles string numeric values correctly', () => {
      const result = convertToPixels('200', 'width');
      expect(result).toBe(200);
    });
  });

  describe('getCharacterPositionStyle', () => {
    it('creates correct style object', () => {
      const position: CharacterPosition = {
        x: '50%',
        y: '30%',
        width: '25%',
        height: '40%',
        zIndex: 3,
      };

      const style = getCharacterPositionStyle(position);
      
      expect(style.position).toBe('absolute');
      expect(style.left).toBe(406); // 50% of 812
      expect(style.top).toBe(112.5); // 30% of 375
      expect(style.width).toBe(203); // 25% of 812
      expect(style.height).toBe(150); // 40% of 375
      expect(style.zIndex).toBe(3);
    });

    it('uses default zIndex when not specified', () => {
      const position: CharacterPosition = {
        x: 100,
        y: 100,
        width: 200,
        height: 200,
      };

      const style = getCharacterPositionStyle(position);
      expect(style.zIndex).toBe(2);
    });
  });

  describe('createResponsivePosition', () => {
    it('uses base position for phone', () => {
      const basePosition = {
        x: '50%',
        y: '30%',
        width: '25%',
        height: '40%',
      };

      const position = createResponsivePosition(basePosition);
      
      expect(position.x).toBe('50%');
      expect(position.y).toBe('30%');
      expect(position.width).toBe('25%');
      expect(position.height).toBe('40%');
    });

    it('applies tablet overrides for tablet', () => {
      const { Dimensions } = require('react-native');
      Dimensions.get.mockReturnValue({ width: 768, height: 1024 });

      const basePosition = {
        x: '50%',
        y: '30%',
        width: '25%',
        height: '40%',
      };

      const deviceOverrides = {
        tablet: {
          x: '60%',
          width: '20%',
        },
      };

      const position = createResponsivePosition(basePosition, deviceOverrides);
      
      expect(position.x).toBe('60%');
      expect(position.y).toBe('30%'); // Unchanged
      expect(position.width).toBe('20%');
      expect(position.height).toBe('40%'); // Unchanged
    });
  });

  describe('validateCharacterPosition', () => {
    it('validates correct position', () => {
      const position: CharacterPosition = {
        x: '25%',
        y: '25%',
        width: '50%',
        height: '50%',
      };

      const isValid = validateCharacterPosition(position);
      expect(isValid).toBe(true);
    });

    it('rejects position outside screen bounds', () => {
      const position: CharacterPosition = {
        x: '90%',
        y: '25%',
        width: '50%', // This would extend beyond screen width
        height: '50%',
      };

      const isValid = validateCharacterPosition(position);
      expect(isValid).toBe(false);
    });

    it('rejects negative positions', () => {
      const position: CharacterPosition = {
        x: -10,
        y: 25,
        width: 100,
        height: 100,
      };

      const isValid = validateCharacterPosition(position);
      expect(isValid).toBe(false);
    });

    it('rejects too small dimensions', () => {
      const position: CharacterPosition = {
        x: 100,
        y: 100,
        width: 5, // Too small
        height: 100,
      };

      const isValid = validateCharacterPosition(position);
      expect(isValid).toBe(false);
    });
  });

  describe('adjustPositionForSafeArea', () => {
    it('does not adjust position for tablets', () => {
      const { Dimensions } = require('react-native');
      Dimensions.get.mockReturnValue({ width: 768, height: 1024 });

      const position: CharacterPosition = {
        x: 10,
        y: 10,
        width: 100,
        height: 100,
      };

      const adjustedPosition = adjustPositionForSafeArea(position);
      expect(adjustedPosition).toEqual(position);
    });

    it('adjusts position for phones when overlapping safe areas', () => {
      const position: CharacterPosition = {
        x: 10, // Would overlap with left safe area (44px)
        y: 10, // Would overlap with top safe area (44px)
        width: 100,
        height: 100,
      };

      const adjustedPosition = adjustPositionForSafeArea(position);
      expect(adjustedPosition.x).toBe(44); // Adjusted to safe area
      expect(adjustedPosition.y).toBe(44); // Adjusted to safe area
    });
  });

  describe('PRESET_POSITIONS', () => {
    it('provides rightSide preset', () => {
      const position = PRESET_POSITIONS.rightSide;
      expect(position.x).toBe('60%');
      expect(position.y).toBe('20%');
      expect(position.width).toBe('35%');
      expect(position.height).toBe('60%');
    });

    it('provides leftSide preset', () => {
      const position = PRESET_POSITIONS.leftSide;
      expect(position.x).toBe('5%');
      expect(position.y).toBe('20%');
      expect(position.width).toBe('35%');
      expect(position.height).toBe('60%');
    });

    it('provides center preset', () => {
      const position = PRESET_POSITIONS.center;
      expect(position.x).toBe('32.5%');
      expect(position.y).toBe('25%');
      expect(position.width).toBe('35%');
      expect(position.height).toBe('50%');
    });

    it('provides all required presets', () => {
      expect(PRESET_POSITIONS.rightSide).toBeDefined();
      expect(PRESET_POSITIONS.leftSide).toBeDefined();
      expect(PRESET_POSITIONS.center).toBeDefined();
      expect(PRESET_POSITIONS.topRightCorner).toBeDefined();
      expect(PRESET_POSITIONS.bottomCenter).toBeDefined();
    });
  });
});
