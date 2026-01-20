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

  /**
   * Complete Google sign-in by sending the ID token to the backend
   */
  static async completeGoogleSignIn(idToken: string): Promise<AuthResponse> {
    const url = `${GATEWAY_URL}/auth/google`;
    log.info('[User Journey Flow 1: Google Sign-In] Step 1/4: Google ID token received, sending to backend...');

    try {
      log.info('[User Journey Flow 1: Google Sign-In] Step 2/4: Calling backend /auth/google');
      const authResponse = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...DeviceInfoService.getDeviceHeaders(),
        },
        body: JSON.stringify({ idToken }),
      });

      log.info(`[User Journey Flow 1: Google Sign-In] Step 3/4: Backend response status: ${authResponse.status}`);

      if (!authResponse.ok) {
        const errorText = await authResponse.text();
        log.error(`[User Journey Flow 1: Google Sign-In] Step 3/4 FAILED: Backend auth failed: ${errorText}`);
        throw new Error(`Authentication failed: ${errorText}`);
      }

      const result = await authResponse.json();
      log.info('[User Journey Flow 1: Google Sign-In] Step 4/4: Backend auth successful, tokens received');
      return result;
    } catch (error) {
      log.error('[User Journey Flow 1: Google Sign-In] FAILED: Google sign-in error:', error);
      throw error;
    }
  }

  /**
   * Get Google OAuth configuration for useAuthRequest hook
   */
  static getGoogleConfig() {
    const config: Record<string, string | undefined> = {
      iosClientId: this.googleConfig.iosClientId,
      androidClientId: this.googleConfig.androidClientId,
      webClientId: this.googleConfig.webClientId,
      expoClientId: this.googleConfig.expoClientId,
    };

    if (Platform.OS === 'ios') {
      config.redirectUri = this.getIosRedirectUri();
    }
    // Android will use native Google Sign-In (no redirect URI needed)

    DEBUG_LOGS && log.debug(`Google config: ${JSON.stringify(config, null, 2)}`);
    return config;
  }

  /**
   * Check if native Google Sign-In is available (Android only)
   */
  static isNativeGoogleSignInAvailable(): boolean {
    return Platform.OS === 'android' && GoogleSignin !== null;
  }

  /**
   * Initialize native Google Sign-In for Android
   */
  static configureNativeGoogleSignIn(): void {
    if (!this.isNativeGoogleSignInAvailable()) return;

    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });
    DEBUG_LOGS && log.debug('Native Google Sign-In configured');
  }

  /**
   * Sign in with Google using native SDK (Android only)
   * Returns the auth response from the backend
   */
  static async signInWithGoogleNative(): Promise<AuthResponse> {
    if (!this.isNativeGoogleSignInAvailable()) {
      throw new Error('Native Google Sign-In is not available');
    }

    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      // Get the ID token
      const idToken = response.data?.idToken;
      if (!idToken) {
        throw new Error('No ID token received from Google Sign-In');
      }

      DEBUG_LOGS && log.debug('Native Google Sign-In successful, completing with backend...');

      // Complete sign-in with backend
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

      log.info('[User Journey Flow 1: Apple Sign-In] Step 1/4: Apple credential received, sending to backend...');
      log.info('[User Journey Flow 1: Apple Sign-In] Step 2/4: Calling backend /auth/apple');

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

      log.info(`[User Journey Flow 1: Apple Sign-In] Step 3/4: Backend response status: ${authResponse.status}`);

      if (!authResponse.ok) {
        const errorText = await authResponse.text();
        log.error(`[User Journey Flow 1: Apple Sign-In] Step 3/4 FAILED: Backend auth failed: ${errorText}`);
        throw new Error(`Authentication failed: ${errorText}`);
      }

      log.info('[User Journey Flow 1: Apple Sign-In] Step 4/4: Backend auth successful, tokens received');
      return await authResponse.json();
    } catch (error: any) {
      if (error.code === 'ERR_CANCELED') {
        throw new Error('Apple sign-in was cancelled');
      }
      log.error('[User Journey Flow 1: Apple Sign-In] FAILED: Apple sign-in error:', error);
      throw error;
    }
  }

  /**
   * Check if Apple Sign-In is available
   */
  static async isAppleSignInAvailable(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      return false;
    }
    return await AppleAuthentication.isAvailableAsync();
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(refreshToken: string): Promise<AuthResponse> {
    log.info('[User Journey Flow 2: Token Refresh] Step 1/4: User returning after inactivity, refreshing token...');
    log.info('[User Journey Flow 2: Token Refresh] Step 2/4: Calling backend /auth/refresh');

    const response = await fetch(`${GATEWAY_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    log.info(`[User Journey Flow 2: Token Refresh] Step 3/4: Backend response status: ${response.status}`);

    if (!response.ok) {
      log.error('[User Journey Flow 2: Token Refresh] Step 3/4 FAILED: Token refresh failed, user needs to re-authenticate');
      throw new Error('Token refresh failed');
    }

    const result = await response.json();
    log.info('[User Journey Flow 2: Token Refresh] Step 4/4: Token refresh successful, new tokens received');
    return result;
  }

  /**
   * Sign out
   */
  static async signOut(refreshToken: string): Promise<void> {
    await fetch(`${GATEWAY_URL}/auth/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });
  }
}

