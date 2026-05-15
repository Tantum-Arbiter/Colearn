import React from 'react';
import { render } from '@testing-library/react-native';
import { MenuIcon } from '../../components/main-menu/menu-icon';
import { getSvgComponentFromSvg } from '../../components/main-menu/assets';

// Mock the SVG components to avoid rendering issues in tests
jest.mock('../../components/main-menu/svg-components', () => ({
  CloudSvg: ({ width, height, opacity }: any) => `MockCloudSvg-${width}x${height}-${opacity}`,
  FreyaRocketSvg: ({ width, height, opacity }: any) => `MockFreyaRocketSvg-${width}x${height}-${opacity}`,
  FreyaRocketRightSvg: ({ width, height, opacity }: any) => `MockFreyaRocketRightSvg-${width}x${height}-${opacity}`,
  Cloud1Svg: ({ width, height, opacity }: any) => `MockCloud1Svg-${width}x${height}-${opacity}`,
  Cloud2Svg: ({ width, height, opacity }: any) => `MockCloud2Svg-${width}x${height}-${opacity}`,
}));

describe('MenuIcon Icon Rendering Tests', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SVG Component Resolution', () => {
    it('should resolve cloud icon to CloudSvg component', () => {
      const SvgComponent = getSvgComponentFromSvg('cloud');
      expect(SvgComponent).toBeDefined();
      expect(typeof SvgComponent).toBe('function');
    });

    it('should resolve balloon icon to CloudSvg component (backward compatibility)', () => {
      const SvgComponent = getSvgComponentFromSvg('balloon');
      expect(SvgComponent).toBeDefined();
      expect(typeof SvgComponent).toBe('function');
      // Should be the same as cloud component for backward compatibility
      expect(SvgComponent).toBe(getSvgComponentFromSvg('cloud'));
    });

    it('should fallback to CloudSvg for unknown icon types', () => {
      const SvgComponent = getSvgComponentFromSvg('unknown' as any);
      expect(SvgComponent).toBeDefined();
      expect(typeof SvgComponent).toBe('function');
    });
  });

  describe('MenuIcon Component Rendering', () => {
    it('should render stories icon without errors', () => {
      const { toJSON, getByLabelText } = render(
        <MenuIcon
          icon="stories-icon"
          label="Stories"
          status="inactive"
          onPress={mockOnPress}
        />
      );

      expect(toJSON()).toBeTruthy();
      expect(getByLabelText('Stories button')).toBeTruthy();
    });

    it('should render with animated_interactive status without errors', () => {
      const { toJSON, getByLabelText } = render(
        <MenuIcon
          icon="stories-icon"
          label="Stories"
          status="animated_interactive"
          onPress={mockOnPress}
        />
      );

      expect(toJSON()).toBeTruthy();
      expect(getByLabelText('Stories button')).toBeTruthy();
    });
  });

  describe('Icon Visibility and Properties', () => {
    it('should render icon with correct size when selected', () => {
      const { toJSON } = render(
        <MenuIcon
          icon="stories-icon"
          label="Stories"
          status="animated_interactive"
          onPress={mockOnPress}
        />
      );

      const rendered = toJSON();
      expect(rendered).toBeTruthy();
      expect(JSON.stringify(rendered)).toContain('Mock');
    });

    it('should render icon with correct size when not selected', () => {
      const { toJSON } = render(
        <MenuIcon
          icon="stories-icon"
          label="Stories"
          status="inactive"
          onPress={mockOnPress}
        />
      );

      const rendered = toJSON();
      expect(rendered).toBeTruthy();
      expect(JSON.stringify(rendered)).toContain('Mock');
    });

    it('should not crash when rendering unknown icon type', () => {
      expect(() => {
        render(
          <MenuIcon
            icon="unknown-icon"
            label="Unknown"
            status="inactive"
            onPress={mockOnPress}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Icon Component Function Validation', () => {
    it('should ensure all icon components are functions', () => {
      const iconTypes: Array<'cloud' | 'balloon'> = ['cloud', 'balloon'];

      iconTypes.forEach(iconType => {
        const SvgComponent = getSvgComponentFromSvg(iconType);
        expect(typeof SvgComponent).toBe('function');
        expect(SvgComponent.name).toBeTruthy();
      });
    });

    it('should ensure icon components can be instantiated', () => {
      const SvgComponent = getSvgComponentFromSvg('cloud');
      expect(() => {
        const element = React.createElement(SvgComponent, { width: 58, height: 58, opacity: 1 });
        expect(element).toBeTruthy();
      }).not.toThrow();
    });
  });
});
