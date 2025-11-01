// OAuth configuration removed - authentication functionality disabled
// This file has been cleaned up to resolve CI/CD pipeline issues

import Constants from 'expo-constants';

// OAuth configuration types (inline since auth types removed)
interface OAuthConfig {
  google: {
    clientId: string;
    iosClientId: string;
    androidClientId: string;
    webClientId: string;
  };
  apple: {
    clientId: string;
  };
}

// OAuth configuration - these will be set via environment variables
// Using development-safe defaults until production OAuth is configured
const config: OAuthConfig = {
  google: {
    // Development placeholders - replace with real values when OAuth is set up
    clientId: Constants.expoConfig?.extra?.googleClientId || 'com.googleusercontent.apps.development-client-id',
    iosClientId: Constants.expoConfig?.extra?.googleIosClientId || 'com.googleusercontent.apps.development-ios-client-id',
    androidClientId: Constants.expoConfig?.extra?.googleAndroidClientId || 'com.googleusercontent.apps.development-android-client-id',
    webClientId: Constants.expoConfig?.extra?.googleWebClientId || 'com.googleusercontent.apps.development-web-client-id',
  },
  apple: {
    clientId: Constants.expoConfig?.extra?.appleClientId || 'com.growwithfreya.app.development',
  },
};

// OAuth scopes
export const OAUTH_SCOPES = {
  google: ['openid', 'profile', 'email'],
  apple: ['name', 'email'],
};

// OAuth endpoints
export const OAUTH_ENDPOINTS = {
  google: {
    authorization: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    userInfo: 'https://www.googleapis.com/oauth2/v2/userinfo',
    revoke: 'https://oauth2.googleapis.com/revoke',
  },
  apple: {
    authorization: 'https://appleid.apple.com/auth/authorize',
    token: 'https://appleid.apple.com/auth/token',
    revoke: 'https://appleid.apple.com/auth/revoke',
  },
};

// Redirect URIs for OAuth flows
export const getRedirectUri = () => {
  const scheme = Constants.expoConfig?.scheme || 'growwithfreya';
  return `${scheme}://oauth`;
};

export default config;
