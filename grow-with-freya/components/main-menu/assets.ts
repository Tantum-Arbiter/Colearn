export const PNG_ASSETS = {
  bear: require('../../assets/images/ui-elements/bear-bottom-screen.png'),
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

export const ASSET_DIMENSIONS = {
  cloud1: { width: 140, height: 170 },
  cloud2: { width: 160, height: 190 },
  balloon1: { width: 140, height: 170 },
  balloon2: { width: 160, height: 190 },
  rocket: { width: 80, height: 60 },
  bear: { width: 286, height: 286 },
  icon: {
    small: { width: 48, height: 48 },
    medium: { width: 58, height: 58 },
    large: { width: 70, height: 70 },
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

export const getSvgComponentFromSvg = (svgType: keyof typeof SVG_PATHS) => {
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
