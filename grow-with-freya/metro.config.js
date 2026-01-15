const { getDefaultConfig } = require('expo/metro-config');
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

// Use Sentry config which wraps the default Expo config
const config = getSentryExpoConfig(__dirname);

// SVG transformer configuration
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

config.resolver = {
  ...config.resolver,
  assetExts: config.resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...config.resolver.sourceExts, 'svg'],
};

module.exports = config;