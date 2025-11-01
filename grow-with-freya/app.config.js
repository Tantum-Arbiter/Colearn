const IS_DEV = process.env.NODE_ENV === 'development';
const IS_PREVIEW = process.env.NODE_ENV === 'staging';

export default {
  expo: {
    name: IS_DEV ? 'Grow with Freya (Dev)' : IS_PREVIEW ? 'Grow with Freya (Preview)' : 'Grow with Freya',
    slug: 'grow-with-freya',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'growwithfreya',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    schemes: ['growwithfreya'],
    extra: {
      eas: {
        projectId: '439b6b2f-be5f-4d59-98eb-73befbd1973e'
      },

    },
    updates: {
      url: 'https://u.expo.dev/439b6b2f-be5f-4d59-98eb-73befbd1973e'
    },
    runtimeVersion: {
      policy: 'appVersion'
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: IS_DEV
        ? 'com.growwithfreya.app.dev'
        : IS_PREVIEW
        ? 'com.growwithfreya.app.preview'
        : 'com.growwithfreya.app',
      associatedDomains: ['applinks:growwithfreya.com'],

    },
    android: {
      package: IS_DEV
        ? 'com.growwithfreya.app.dev'
        : IS_PREVIEW
        ? 'com.growwithfreya.app.preview'
        : 'com.growwithfreya.app',
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png'
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: [
        'MODIFY_AUDIO_SETTINGS',
        'WAKE_LOCK'
      ]
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png'
    },
    plugins: [
      'expo-router',

      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#4ECDC4',
          dark: {
            backgroundColor: '#2E8B8B'
          }
        }
      ]
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    }
  }
};
