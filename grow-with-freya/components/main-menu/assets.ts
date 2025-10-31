export const PNG_ASSETS = {
  bear: require('../../assets/images/ui-elements/bear-bottom-screen.png'),
  bearTop: require('../../assets/images/ui-elements/bear-top-screen.png'),
  moon: require('../../assets/images/ui-elements/moon-top-screen.png'),
  freyaRocket: require('../../assets/images/ui-elements/freya-rocket.svg'),
  freyaRocketRight: require('../../assets/images/ui-elements/freya-rocket-right.svg'),
} as const;

export const SVG_PATHS = {
  cloud: 'ui-elements/background-cloud-1.svg',
  stories: 'menu-icons/stories-icon.svg',
  sensory: 'menu-icons/sensory-icon.svg',
  emotions: 'menu-icons/emotions-icon.svg',
  bedtime: 'menu-icons/bedtime-icon.svg',
  screentime: 'menu-icons/screentime-icon.svg',
} as const;

const ICON_SVG_MAP = {
  'stories-icon': 'stories',
  'sensory-icon': 'sensory',
  'emotions-icon': 'emotions',
  'bedtime-icon': 'bedtime',
  'screentime-icon': 'screentime',
  'storybook': 'stories',
  'sparkle_hand': 'sensory',
  'smiley_face': 'emotions',
  'music_note': 'bedtime',
  'clock': 'screentime',
} as const;

export const getIconSvgType = (iconType: string): keyof typeof SVG_PATHS => {
  return ICON_SVG_MAP[iconType as keyof typeof ICON_SVG_MAP] || 'stories';
};

export const getSvgPath = (svgType: keyof typeof SVG_PATHS) => {
  return SVG_PATHS[svgType];
};

// Import getScreenDimensions for responsive sizing
import { getScreenDimensions } from './constants';

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
  switch (svgType) {
    case 'cloud': return SVG_PATHS.cloud;
    case 'balloon': return SVG_PATHS.cloud; // Backward compatibility - balloon maps to cloud
    case 'stories': return SVG_PATHS.stories;
    case 'sensory': return SVG_PATHS.sensory;
    case 'emotions': return SVG_PATHS.emotions;
    case 'bedtime': return SVG_PATHS.bedtime;
    case 'screentime': return SVG_PATHS.screentime;
    default: return SVG_PATHS.stories;
  }
};

export const getSvgAssetFromPath = (svgType: keyof typeof SVG_PATHS) => {
  return getSvgAsset(svgType);
};

export const getSvgComponentFromSvg = (svgType: keyof typeof SVG_PATHS | 'balloon') => {
  const {
    CloudSvg,
    StoriesSvg,
    SensorySvg,
    EmotionsSvg,
    BedtimeSvg,
    ScreentimeSvg,
  } = require('./svg-components');

  switch (svgType) {
    case 'cloud':
    case 'balloon': // Backward compatibility - balloon maps to cloud
      return CloudSvg;
    case 'stories':
      return StoriesSvg;
    case 'sensory':
      return SensorySvg;
    case 'emotions':
      return EmotionsSvg;
    case 'bedtime':
      return BedtimeSvg;
    case 'screentime':
      return ScreentimeSvg;
    default:
      return StoriesSvg;
  }
};


export const getSvgComponent = getSvgComponentFromSvg;
