import React from 'react';
import { render } from '@testing-library/react-native';
import {
  CloudSvg,
  FreyaRocketSvg,
  FreyaRocketRightSvg,
  Cloud1Svg,
  Cloud2Svg,
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
  describe('Individual SVG Components', () => {
    it('should render CloudSvg component', () => {
      const { toJSON } = render(<CloudSvg />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render FreyaRocketSvg component', () => {
      const { toJSON } = render(<FreyaRocketSvg />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render FreyaRocketRightSvg component', () => {
      const { toJSON } = render(<FreyaRocketRightSvg />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render Cloud1Svg component', () => {
      const { toJSON } = render(<Cloud1Svg />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render Cloud2Svg component', () => {
      const { toJSON } = render(<Cloud2Svg />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('SVG Component Props', () => {
    it('should accept custom width and height for CloudSvg', () => {
      const { toJSON } = render(
        <CloudSvg width={100} height={100} opacity={0.5} />
      );

      expect(toJSON()).toBeTruthy();
      const rendered = JSON.stringify(toJSON());
      expect(rendered).toContain('100');
      expect(rendered).toContain('0.5');
    });

    it('should accept custom width and height for FreyaRocketSvg', () => {
      const { toJSON } = render(
        <FreyaRocketSvg width={120} height={120} opacity={0.9} />
      );

      expect(toJSON()).toBeTruthy();
      const rendered = JSON.stringify(toJSON());
      expect(rendered).toContain('120');
      expect(rendered).toContain('0.9');
    });

    it('should use default props when not provided', () => {
      const { toJSON } = render(<CloudSvg />);

      expect(toJSON()).toBeTruthy();
      const rendered = JSON.stringify(toJSON());
      expect(rendered).toContain('120'); // Default cloud width
      expect(rendered).toContain('60');  // Default cloud height
      expect(rendered).toContain('0.8'); // Default cloud opacity
    });
  });

  describe('Component Memory Optimization', () => {
    it('should use React.memo for performance optimization', () => {
      expect(typeof CloudSvg).toBe('object');
      expect(typeof FreyaRocketSvg).toBe('object');
      expect(typeof FreyaRocketRightSvg).toBe('object');
      expect(typeof Cloud1Svg).toBe('object');
      expect(typeof Cloud2Svg).toBe('object');
    });

    it('should render consistently with same props', () => {
      const props = { width: 58, height: 58, opacity: 1 };

      const render1 = render(<CloudSvg {...props} />);
      const render2 = render(<CloudSvg {...props} />);

      expect(render1.toJSON()).toEqual(render2.toJSON());
    });
  });
});
