export { MenuIcon } from './menu-icon';
export {
  Cloud1,
  Cloud2,
  BearImage,
  BearTopImage,
  MoonImage,
  MoonBottomImage,
} from './animated-components';

export {
  CloudSvg,
  StoriesSvg,
  EmotionsSvg,
  BedtimeSvg,
} from './svg-components';

export {
  ANIMATION_TIMINGS,
  LAYOUT,
  VISUAL_EFFECTS,
  DEFAULT_MENU_ITEMS,
  getScreenDimensions,
  Easing,
} from './constants';
export type { MenuItemData, IconStatus } from './constants';

export { WEBP_ASSETS, getIconSvgType, getSvgPath, ASSET_DIMENSIONS } from './assets';

export {
  createCloudAnimation,
  createIconPulseAnimation,
  createGlowAnimation,
  createShimmerAnimation,
  createSelectionAnimation,
  createPressAnimation,
  createGlowBurstAnimation,
} from './animations';

export {
  generateStarPositions,
  swapArrayItems,
  findMenuItemIndex,
  isValidMenuItem,
  getResponsiveSize,
  debounce,
  throttle,
  calculateSafePadding,
  logPerformance,
} from './utils';

export { mainMenuStyles, menuIconStyles, animatedElementStyles } from './styles';
