const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

config.resolver = {
  ...config.resolver,
  assetExts: config.resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...config.resolver.sourceExts, 'svg'],
  // Block files that cause issues during hot reload on Android
  // These files use expo-av which has ExoPlayer threading requirements
  blockList: [
    // Uncomment to block specific files from hot reload
    // /services\/background-music\.ts$/,
  ],
};

module.exports = config;