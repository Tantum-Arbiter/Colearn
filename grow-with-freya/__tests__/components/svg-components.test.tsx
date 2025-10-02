import React from 'react';
import { render } from '@testing-library/react-native';
import {
  StoriesSvg,
  SensorySvg,
  EmotionsSvg,
  BedtimeSvg,
  ScreentimeSvg,
  CloudSvg,
  ActualSvgComponent
} from '../../components/main-menu/svg-components';


jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Image: ({ source, style, resizeMode, ...props }: any) => {
      return `MockImage-${JSON.stringify({ source, style, resizeMode })}`;
    },
  };
});

describe('SVG Components Tests', () => {
  describe('ActualSvgComponent', () => {
    it('should render with valid SVG path', () => {
      const { toJSON } = render(
        <ActualSvgComponent 
          svgPath="menu-icons/stories-icon.svg"
          width={58}
          height={58}
          opacity={1}
        />
      );
      
      expect(toJSON()).toBeTruthy();
      expect(toJSON()).toMatchSnapshot();
    });

    it('should render with custom dimensions', () => {
      const { toJSON } = render(
        <ActualSvgComponent 
          svgPath="menu-icons/stories-icon.svg"
          width={100}
          height={100}
          opacity={0.8}
        />
      );
      
      expect(toJSON()).toBeTruthy();
      const rendered = JSON.stringify(toJSON());
      expect(rendered).toContain('100');
      expect(rendered).toContain('0.8');
    });

    it('should return null for invalid SVG path', () => {
      // Mock console.warn to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const { toJSON } = render(
        <ActualSvgComponent 
          svgPath="invalid/path.svg"
          width={58}
          height={58}
          opacity={1}
        />
      );
      
      expect(toJSON()).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('SVG asset not found: invalid/path.svg');
      
      consoleSpy.mockRestore();
    });

    it('should use default dimensions when not provided', () => {
      const { toJSON } = render(
        <ActualSvgComponent svgPath="menu-icons/stories-icon.svg" />
      );
      
      expect(toJSON()).toBeTruthy();
      const rendered = JSON.stringify(toJSON());
      expect(rendered).toContain('58'); // Default medium width/height
    });
  });

  describe('Individual SVG Components', () => {
    it('should render StoriesSvg component', () => {
      const { toJSON } = render(<StoriesSvg />);
      expect(toJSON()).toBeTruthy();
      expect(toJSON()).toMatchSnapshot();
    });

    it('should render SensorySvg component', () => {
      const { toJSON } = render(<SensorySvg />);
      expect(toJSON()).toBeTruthy();
      expect(toJSON()).toMatchSnapshot();
    });

    it('should render EmotionsSvg component', () => {
      const { toJSON } = render(<EmotionsSvg />);
      expect(toJSON()).toBeTruthy();
      expect(toJSON()).toMatchSnapshot();
    });

    it('should render BedtimeSvg component', () => {
      const { toJSON } = render(<BedtimeSvg />);
      expect(toJSON()).toBeTruthy();
      expect(toJSON()).toMatchSnapshot();
    });

    it('should render ScreentimeSvg component', () => {
      const { toJSON } = render(<ScreentimeSvg />);
      expect(toJSON()).toBeTruthy();
      expect(toJSON()).toMatchSnapshot();
    });

    it('should render CloudSvg component', () => {
      const { toJSON } = render(<CloudSvg />);
      expect(toJSON()).toBeTruthy();
      expect(toJSON()).toMatchSnapshot();
    });

    // BearSvg component removed - now using PNG format
  });

  describe('SVG Component Props', () => {
    it('should accept custom width and height for StoriesSvg', () => {
      const { toJSON } = render(
        <StoriesSvg width={100} height={100} opacity={0.5} />
      );
      
      expect(toJSON()).toBeTruthy();
      const rendered = JSON.stringify(toJSON());
      expect(rendered).toContain('100');
      expect(rendered).toContain('0.5');
    });

    // BearSvg props test removed - now using PNG format

    it('should use default props when not provided', () => {
      const { toJSON } = render(<CloudSvg />);
      
      expect(toJSON()).toBeTruthy();
      const rendered = JSON.stringify(toJSON());
      expect(rendered).toContain('120'); // Default cloud width
      expect(rendered).toContain('60');  // Default cloud height
      expect(rendered).toContain('0.8'); // Default cloud opacity
    });
  });

  describe('SVG Asset Mapping', () => {
    it('should have all required menu icon assets', () => {
      const requiredAssets = [
        'menu-icons/stories-icon.svg',
        'menu-icons/sensory-icon.svg',
        'menu-icons/emotions-icon.svg',
        'menu-icons/bedtime-icon.svg',
        'menu-icons/screentime-icon.svg'
      ];

      requiredAssets.forEach(assetPath => {
        expect(() => {
          render(<ActualSvgComponent svgPath={assetPath} />);
        }).not.toThrow();
      });
    });

    it('should have all required UI element assets', () => {
      const requiredAssets = [
        'ui-elements/background-cloud-1.svg'

      ];

      requiredAssets.forEach(assetPath => {
        expect(() => {
          render(<ActualSvgComponent svgPath={assetPath} />);
        }).not.toThrow();
      });
    });
  });

  describe('Component Memory Optimization', () => {
    it('should use React.memo for performance optimization', () => {
      expect(typeof StoriesSvg).toBe('object');
      expect(typeof SensorySvg).toBe('object');
      expect(typeof EmotionsSvg).toBe('object');
      expect(typeof BedtimeSvg).toBe('object');
      expect(typeof ScreentimeSvg).toBe('object');
      expect(typeof CloudSvg).toBe('object');
      expect(typeof ActualSvgComponent).toBe('object');
    });

    it('should render consistently with same props', () => {
      const props = { width: 58, height: 58, opacity: 1 };
      
      const render1 = render(<StoriesSvg {...props} />);
      const render2 = render(<StoriesSvg {...props} />);
      
      expect(render1.toJSON()).toEqual(render2.toJSON());
    });
  });
});
