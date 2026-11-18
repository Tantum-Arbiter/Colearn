import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { DeviceInfoService } from './device-info-service';
import { Logger } from '@/utils/logger';

const log = Logger.create('AuthService');

// Debug logging - set to false for production performance
const DEBUG_LOGS = false;

// Only import native Google Sign-In on Android
let GoogleSignin: any = null;
let statusCodes: any = null;
if (Platform.OS === 'android') {
  try {
    const googleSignIn = require('@react-native-google-signin/google-signin');
    GoogleSignin = googleSignIn.GoogleSignin;
    statusCodes = googleSignIn.statusCodes;
  } catch {
    log.debug('Native Google Sign-In not available');
  }
}

WebBrowser.maybeCompleteAuthSession();

const extra = Constants.expoConfig?.extra || {};
const GATEWAY_URL = extra.gatewayUrl || process.env.EXPO_PUBLIC_GATEWAY_URL || 'http://localhost:8080';
const AUTH_TIMEOUT_MS = 3000; // 3 second timeout for sign-in

log.info(`Gateway URL configured: ${GATEWAY_URL}`);

const GOOGLE_IOS_CLIENT_ID = extra.googleIosClientId || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = extra.googleAndroidClientId || process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_WEB_CLIENT_ID = extra.googleWebClientId || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

// Google.useAuthRequest throws at render time when the platform client id is
// undefined -substitute a placeholder so the login screen can mount, and gate
// the actual sign-in flow behind isGoogleAuthConfigured()
const MISSING_GOOGLE_CLIENT_ID = 'missing-client-id.apps.googleusercontent.com';

if (!GOOGLE_IOS_CLIENT_ID || !GOOGLE_ANDROID_CLIENT_ID || !GOOGLE_WEB_CLIENT_ID) {
  log.warn('Google client id(s) missing -Google Sign-In disabled. Check EXPO_PUBLIC_GOOGLE_*_CLIENT_ID env vars (.env for local builds, eas.json for EAS builds).');
}

const fetchWithTimeout = async (url: string, options: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Login timed out. Please try again.');
    }
    throw error;
  }
};

interface AuthResponse {
  success: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    provider: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  message: string;
}

export class AuthService {
  private static getIosRedirectUri(): string | undefined {
    if (!GOOGLE_IOS_CLIENT_ID) return undefined;
    const clientIdPrefix = GOOGLE_IOS_CLIENT_ID.replace('.apps.googleusercontent.com', '');
    return `com.googleusercontent.apps.${clientIdPrefix}:/oauthredirect`;
  }

  private static googleConfig = {
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    expoClientId: GOOGLE_WEB_CLIENT_ID,
  };

  static async completeGoogleSignIn(idToken: string): Promise<AuthResponse> {
    const url = `${GATEWAY_URL}/auth/google`;

    try {
      const authResponse = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...DeviceInfoService.getDeviceHeaders(),
        },
        body: JSON.stringify({ idToken }),
      });

      if (!authResponse.ok) {
        const errorText = await authResponse.text();
        log.error(`Google auth failed: ${errorText}`);
        throw new Error(`Authentication failed: ${errorText}`);
      }

      return await authResponse.json();
    } catch (error) {
      log.error('Google sign-in error:', error);
      throw error;
    }
  }

  static isGoogleAuthConfigured(): boolean {
    if (Platform.OS === 'ios') return Boolean(GOOGLE_IOS_CLIENT_ID);
    if (Platform.OS === 'android') return Boolean(GOOGLE_ANDROID_CLIENT_ID);
    return Boolean(GOOGLE_WEB_CLIENT_ID);
  }

  static getGoogleConfig() {
    const config: Record<string, string | undefined> = {
      iosClientId: this.googleConfig.iosClientId || MISSING_GOOGLE_CLIENT_ID,
      androidClientId: this.googleConfig.androidClientId || MISSING_GOOGLE_CLIENT_ID,
      webClientId: this.googleConfig.webClientId || MISSING_GOOGLE_CLIENT_ID,
      expoClientId: this.googleConfig.expoClientId || MISSING_GOOGLE_CLIENT_ID,
    };

    if (Platform.OS === 'ios') {
      config.redirectUri = this.getIosRedirectUri();
    }

    DEBUG_LOGS && log.debug(`Google config: ${JSON.stringify(config, null, 2)}`);
    return config;
  }

  static isNativeGoogleSignInAvailable(): boolean {
    return Platform.OS === 'android' && GoogleSignin !== null;
  }

  static configureNativeGoogleSignIn(): void {
    if (!this.isNativeGoogleSignInAvailable()) return;

    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });
    DEBUG_LOGS && log.debug('Native Google Sign-In configured');
  }

  static async signInWithGoogleNative(): Promise<AuthResponse> {
    if (!this.isNativeGoogleSignInAvailable()) {
      throw new Error('Native Google Sign-In is not available');
    }

    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      if (!idToken) {
        throw new Error('No ID token received from Google Sign-In');
      }

      DEBUG_LOGS && log.debug('Native Google Sign-In successful, completing with backend...');
      return await this.completeGoogleSignIn(idToken);
    } catch (error: any) {
      if (statusCodes) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
          throw new Error('Google sign-in was cancelled');
        } else if (error.code === statusCodes.IN_PROGRESS) {
          throw new Error('Google sign-in is already in progress');
        } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          throw new Error('Google Play Services is not available');
        }
      }
      log.error('Native Google Sign-In error:', error);
      throw error;
    }
  }

  static async signInWithApple(): Promise<AuthResponse> {
    const url = `${GATEWAY_URL}/auth/apple`;

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const authResponse = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...DeviceInfoService.getDeviceHeaders(),
        },
        body: JSON.stringify({
          idToken: credential.identityToken,
          authorizationCode: credential.authorizationCode,
          userInfo: credential.fullName ? {
            name: `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim(),
          } : undefined,
        }),
      });

      if (!authResponse.ok) {
        const errorText = await authResponse.text();
        log.error(`Apple auth failed: ${errorText}`);
        throw new Error(`Authentication failed: ${errorText}`);
      }

      return await authResponse.json();
    } catch (error: any) {
      if (error.code === 'ERR_CANCELED') {
        throw new Error('Apple sign-in was cancelled');
      }
      log.error('Apple sign-in error:', error);
      throw error;
    }
  }

  static async isAppleSignInAvailable(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      return false;
    }
    return await AppleAuthentication.isAvailableAsync();
  }

}

