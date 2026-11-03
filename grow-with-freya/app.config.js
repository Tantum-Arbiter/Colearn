const IS_DEV = process.env.EXPO_PUBLIC_APP_ENV === 'development';
const IS_PREVIEW = process.env.EXPO_PUBLIC_APP_ENV === 'staging';
const IS_PROD = process.env.EXPO_PUBLIC_APP_ENV === 'production';
const IS_E2E = process.env.EXPO_PUBLIC_E2E === '1';
const LOCAL_GATEWAY = /^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?\/?$/;

if (IS_E2E && process.env.EXPO_PUBLIC_GATEWAY_URL && !LOCAL_GATEWAY.test(process.env.EXPO_PUBLIC_GATEWAY_URL)) {
  throw new Error(
    `An E2E build must use a local gateway, not ${process.env.EXPO_PUBLIC_GATEWAY_URL}. Set EXPO_PUBLIC_GATEWAY_URL=http://localhost:8080.`
  );
}

export default {
  expo: {
    name: IS_DEV ? 'Early Roots (Dev)' : IS_PREVIEW ? 'Early Roots (Preview)' : 'Early Roots',
    slug: 'grow-with-freya',
    version: require('./package.json').version,
    orientation: 'default',
    icon: './assets/images/icon.png',
    scheme: 'growwithfreya',
    userInterfaceStyle: 'automatic',
    backgroundColor: '#0A0F2C',
    extra: {
      eas: {
        projectId: '439b6b2f-be5f-4d59-98eb-73befbd1973e'
      },
      gatewayUrl: process.env.EXPO_PUBLIC_GATEWAY_URL,
      googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      appleClientId: process.env.EXPO_PUBLIC_APPLE_CLIENT_ID,
      revenueCatAppleKey: process.env.EXPO_PUBLIC_RC_APPLE_KEY ?? '',
      revenueCatGoogleKey: process.env.EXPO_PUBLIC_RC_GOOGLE_KEY ?? '',
      e2e: IS_E2E,
    },
    updates: {
      enabled: !IS_E2E,
      url: 'https://u.expo.dev/439b6b2f-be5f-4d59-98eb-73befbd1973e'
    },
    runtimeVersion: {
      policy: 'appVersion'
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.growwithfreya.app',
      associatedDomains: ['applinks:colearnwithfreya.co.uk'],
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSMicrophoneUsageDescription: 'This app needs access to your microphone to record your voice for story narration.',
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [
              'com.growwithfreya.app',
              'com.googleusercontent.apps.1086096096900-377j71ktgif6t78evg63218cj9de2cjs'
            ]
          }
        ]
      }
    },
    android: {
      package: 'com.growwithfreya.app',
      allowBackup: false,
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png'
      },
      predictiveBackGestureEnabled: false,
      permissions: [
        'RECORD_AUDIO',
        'MODIFY_AUDIO_SETTINGS',
        'WAKE_LOCK',
        'POST_NOTIFICATIONS',
        'SCHEDULE_EXACT_ALARM'
      ]
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png'
    },
    plugins: [
      'expo-router',
      [
        'expo-notifications',
        {
          color: '#4ECDC4',
          mode: 'production'
        }
      ],
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 280,
          resizeMode: 'contain',
          backgroundColor: '#071D54',
          dark: {
            backgroundColor: '#071D54'
          }
        }
      ],
      [
        'expo-audio',
        {
          microphonePermission: 'Allow $(PRODUCT_NAME) to access your microphone to record story narrations.'
        }
      ],
      [
        'expo-sensors',
        {
          motionPermission: 'Allow $(PRODUCT_NAME) to detect when you turn the screen so the story can begin.'
        }
      ],
      [
        'expo-build-properties',
        {
          ios: {
            enableSceneSupport: true,
            // GoogleSignIn's Swift pods (AppCheckCore) need these ObjC pods to expose module maps
            extraPods: [
              { name: 'GoogleUtilities', modular_headers: true },
              { name: 'RecaptchaInterop', modular_headers: true }
            ]
          },
          ...(IS_E2E ? { android: { usesCleartextTraffic: true } } : {})
        }
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    }
  }
};
