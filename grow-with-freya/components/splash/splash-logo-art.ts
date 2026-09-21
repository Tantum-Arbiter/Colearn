import type { ImageSourcePropType } from 'react-native';
import type { SplashLogoLayer } from '@/constants/splash-logo';

export const SPLASH_LOGO_ART: Record<SplashLogoLayer, ImageSourcePropType> = {
  bookLeft: require('../../assets/images/splash-logo/book-left.png'),
  bookRight: require('../../assets/images/splash-logo/book-right.png'),
  roots: require('../../assets/images/splash-logo/roots.png'),
  stem: require('../../assets/images/splash-logo/stem.png'),
  leafLeft: require('../../assets/images/splash-logo/leaf-left.png'),
  leafRight: require('../../assets/images/splash-logo/leaf-right.png'),
  leafTop: require('../../assets/images/splash-logo/leaf-top.png'),
  wordmark: require('../../assets/images/splash-logo/wordmark.png'),
};
