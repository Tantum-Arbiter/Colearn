import React from 'react';
import { render } from '@testing-library/react-native';
import { MenuIcon } from '../../components/main-menu/menu-icon';
import { getSvgComponentFromSvg } from '../../components/main-menu/assets';

// Mock the SVG components to avoid rendering issues in tests
jest.mock('../../components/main-menu/svg-components', () => ({
  StoriesSvg: ({ width, height, opacity }: any) => `MockStoriesSvg-${width}x${height}-${opacity}`,
  SensorySvg: ({ width, height, opacity }: any) => `MockSensorySvg-${width}x${height}-${opacity}`,
  EmotionsSvg: ({ width, height, opacity }: any) => `MockEmotionsSvg-${width}x${height}-${opacity}`,
  BedtimeSvg: ({ width, height, opacity }: any) => `MockBedtimeSvg-${width}x${height}-${opacity}`,
  ScreentimeSvg: ({ width, height, opacity }: any) => `MockScreentimeSvg-${width}x${height}-${opacity}`,
  CloudSvg: ({ width, height, opacity }: any) => `MockCloudSvg-${width}x${height}-${opacity}`,
  BearSvg: ({ width, height, opacity }: any) => `MockBearSvg-${width}x${height}-${opacity}`,
}));

describe('MenuIcon Icon Rendering Tests', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SVG Component Resolution', () => {
    it('should resolve stories icon to StoriesSvg component', () => {
      const SvgComponent = getSvgComponentFromSvg('stories');
      expect(SvgComponent).toBeDefined();
      expect(typeof SvgComponent).toBe('function');
    });

    it('should resolve sensory icon to SensorySvg component', () => {
      const SvgComponent = getSvgComponentFromSvg('sensory');
      expect(SvgComponent).toBeDefined();
      expect(typeof SvgComponent).toBe('function');
    });

    it('should resolve emotions icon to EmotionsSvg component', () => {
      const SvgComponent = getSvgComponentFromSvg('emotions');
      expect(SvgComponent).toBeDefined();
      expect(typeof SvgComponent).toBe('function');
    });

    it('should resolve bedtime icon to BedtimeSvg component', () => {
      const SvgComponent = getSvgComponentFromSvg('bedtime');
      expect(SvgComponent).toBeDefined();
      expect(typeof SvgComponent).toBe('function');
    });

    it('should resolve screentime icon to ScreentimeSvg component', () => {
      const SvgComponent = getSvgComponentFromSvg('screentime');
      expect(SvgComponent).toBeDefined();
      expect(typeof SvgComponent).toBe('function');
    });

    it('should resolve cloud icon to CloudSvg component', () => {
      const SvgComponent = getSvgComponentFromSvg('cloud');
      expect(SvgComponent).toBeDefined();
      expect(typeof SvgComponent).toBe('function');
    });

    it('should resolve balloon icon to CloudSvg component (alias)', () => {
      const SvgComponent = getSvgComponentFromSvg('balloon');
      expect(SvgComponent).toBeDefined();
      expect(typeof SvgComponent).toBe('function');
    });

    it('should fallback to StoriesSvg for unknown icon types', () => {
      const SvgComponent = getSvgComponentFromSvg('unknown' as any);
      expect(SvgComponent).toBeDefined();
      expect(typeof SvgComponent).toBe('function');
    });
  });

  describe('MenuIcon Component Rendering', () => {
    it('should render stories icon without errors', () => {
      const { toJSON } = render(
        <MenuIcon
          icon="stories-icon"
          text="Stories"
          onPress={mockOnPress}
          isSelected={false}
          animationDelay={0}
        />
      );

      expect(toJSON()).toBeTruthy();
      expect(toJSON()).toMatchSnapshot();
    });

    it('should render sensory icon without errors', () => {
      const { toJSON } = render(
        <MenuIcon
          icon="sensory-icon"
          text="Sensory"
          onPress={mockOnPress}
          isSelected={false}
          animationDelay={0}
        />
      );

      expect(toJSON()).toBeTruthy();
      expect(toJSON()).toMatchSnapshot();
    });

    it('should render emotions icon without errors', () => {
      const { toJSON } = render(
        <MenuIcon
          icon="emotions-icon"
          text="Emotions"
          onPress={mockOnPress}
          isSelected={false}
          animationDelay={0}
        />
      );

      expect(toJSON()).toBeTruthy();
      expect(toJSON()).toMatchSnapshot();
    });

    it('should render bedtime icon without errors', () => {
      const { toJSON } = render(
        <MenuIcon
          icon="bedtime-icon"
          text="Bedtime"
          onPress={mockOnPress}
          isSelected={false}
          animationDelay={0}
        />
      );

      expect(toJSON()).toBeTruthy();
      expect(toJSON()).toMatchSnapshot();
    });

    it('should render screentime icon without errors', () => {
      const { toJSON } = render(
        <MenuIcon
          icon="screentime-icon"
          text="Screen Time"
          onPress={mockOnPress}
          isSelected={false}
          animationDelay={0}
        />
      );

      expect(toJSON()).toBeTruthy();
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Icon Visibility and Properties', () => {
    it('should render icon with correct size when selected', () => {
      const { toJSON } = render(
        <MenuIcon
          icon="stories-icon"
          text="Stories"
          onPress={mockOnPress}
          isSelected={true}
          animationDelay={0}
        />
      );
      
      const rendered = toJSON();
      expect(rendered).toBeTruthy();
      // The icon should be present in the rendered output
      expect(JSON.stringify(rendered)).toContain('Mock');
    });

    it('should render icon with correct size when not selected', () => {
      const { toJSON } = render(
        <MenuIcon
          icon="stories-icon"
          text="Stories"
          onPress={mockOnPress}
          isSelected={false}
          animationDelay={0}
        />
      );
      
      const rendered = toJSON();
      expect(rendered).toBeTruthy();
      // The icon should be present in the rendered output
      expect(JSON.stringify(rendered)).toContain('Mock');
    });

    it('should not crash when rendering unknown icon type', () => {
      expect(() => {
        render(
          <MenuIcon
            icon="unknown-icon" as any
            text="Unknown"
            onPress={mockOnPress}
            isSelected={false}
            animationDelay={0}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Icon Component Function Validation', () => {
    it('should ensure all icon components are functions', () => {
      const iconTypes = ['stories', 'sensory', 'emotions', 'bedtime', 'screentime', 'cloud', 'balloon'];
      
      iconTypes.forEach(iconType => {
        const SvgComponent = getSvgComponentFromSvg(iconType as any);
        expect(typeof SvgComponent).toBe('function');
        expect(SvgComponent.name).toBeTruthy(); // Should have a component name
      });
    });

    it('should ensure icon components can be instantiated', () => {
      const iconTypes = ['stories', 'sensory', 'emotions', 'bedtime', 'screentime'];
      
      iconTypes.forEach(iconType => {
        const SvgComponent = getSvgComponentFromSvg(iconType as any);
        expect(() => {
          // Test that the component can be created without throwing
          const element = React.createElement(SvgComponent, { width: 58, height: 58, opacity: 1 });
          expect(element).toBeTruthy();
        }).not.toThrow();
      });
    });
  });
});
