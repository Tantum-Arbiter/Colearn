// Import getScreenDimensions for responsive sizing
import { getScreenDimensions } from './constants';
import {
  CloudSvg,
} from './svg-components';

export const WEBP_ASSETS = {
  bear: require('../../assets/images/ui-elements/bear-bottom-screen.webp'),
  bearTop: require('../../assets/images/ui-elements/bear-top-screen.webp'),
  moon: require('../../assets/images/ui-elements/moon-top-screen.webp'),
  moonBottom: require('../../assets/images/ui-elements/moon-bottom-screen.webp'),
  freyaRocket: require('../../assets/images/ui-elements/freya-rocket.svg'),
  freyaRocketRight: require('../../assets/images/ui-elements/freya-rocket-right.svg'),
} as const;

export const SVG_PATHS = {
  cloud: 'ui-elements/background-cloud-1.svg',
} as const;

export const getIconSvgType = (iconType: string): keyof typeof SVG_PATHS => {
  return 'cloud';
};

export const getSvgPath = (svgType: keyof typeof SVG_PATHS) => {
  return SVG_PATHS[svgType];
};

// Helper function to get responsive size for iPad (20% bigger)
const getResponsiveAssetSize = (baseSize: number): number => {
  const { width: screenWidth } = getScreenDimensions();
  const isTablet = screenWidth >= 768;
  return isTablet ? Math.round(baseSize * 1.2) : baseSize;
};

export const ASSET_DIMENSIONS = {
  get cloud1() {
    return {
      width: getResponsiveAssetSize(140),
      height: getResponsiveAssetSize(170)
    };
  },
  get cloud2() {
    return {
      width: getResponsiveAssetSize(160),
      height: getResponsiveAssetSize(190)
    };
  },
  get balloon1() {
    return {
      width: getResponsiveAssetSize(140),
      height: getResponsiveAssetSize(170)
    };
  },
  get balloon2() {
    return {
      width: getResponsiveAssetSize(160),
      height: getResponsiveAssetSize(190)
    };
  },
  get rocket() {
    return {
      width: getResponsiveAssetSize(80),
      height: getResponsiveAssetSize(60)
    };
  },
  get bear() {
    return {
      width: getResponsiveAssetSize(286),
      height: getResponsiveAssetSize(286)
    };
  },
  get bearTop() {
    return {
      width: getResponsiveAssetSize(286),
      height: getResponsiveAssetSize(286)
    };
  },
  get moon() {
    return {
      width: getResponsiveAssetSize(286),
      height: getResponsiveAssetSize(286)
    };
  },
  get moonBottom() {
    return {
      width: getResponsiveAssetSize(286),
      height: getResponsiveAssetSize(286)
    };
  },
  icon: {
    get small() {
      return {
        width: getResponsiveAssetSize(48),
        height: getResponsiveAssetSize(48)
      };
    },
    get medium() {
      return {
        width: getResponsiveAssetSize(58),
        height: getResponsiveAssetSize(58)
      };
    },
    get large() {
      return {
        width: getResponsiveAssetSize(70),
        height: getResponsiveAssetSize(70)
      };
    },
  },
} as const;

export const getSvgAsset = (svgType: string) => {
  return SVG_PATHS.cloud;
};

export const getSvgAssetFromPath = (svgType: keyof typeof SVG_PATHS) => {
  return getSvgAsset(svgType);
};

export const getSvgComponentFromSvg = (svgType: keyof typeof SVG_PATHS | 'balloon') => {
  return CloudSvg;
};

export const getSvgComponent = getSvgComponentFromSvg;
