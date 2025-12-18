import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

const extra = Constants.expoConfig?.extra || {};
const GATEWAY_URL = extra.gatewayUrl || process.env.EXPO_PUBLIC_GATEWAY_URL || 'http://localhost:8080';
const AUTH_TIMEOUT_MS = 20000;

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
    try {
      const authResponse = await fetchWithTimeout(`${GATEWAY_URL}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Platform': Platform.OS,
          'X-Client-Version': '1.0.0',
          'X-Device-ID': 'device-id-here',
        },
        body: JSON.stringify({ idToken }),
      });

      if (!authResponse.ok) {
        const errorText = await authResponse.text();
        throw new Error(`Authentication failed: ${errorText}`);
      }

      return await authResponse.json();
    } catch (error) {
      console.error('Google sign-in error:', error);
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

    return config;
  }

  static async signInWithApple(): Promise<AuthResponse> {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const authResponse = await fetchWithTimeout(`${GATEWAY_URL}/auth/apple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Platform': Platform.OS,
          'X-Client-Version': '1.0.0',
          'X-Device-ID': 'device-id-here',
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
        throw new Error(`Authentication failed: ${errorText}`);
      }

      return await authResponse.json();
    } catch (error: any) {
      if (error.code === 'ERR_CANCELED') {
        throw new Error('Apple sign-in was cancelled');
      }
      console.error('Apple sign-in error:', error);
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
    const response = await fetch(`${GATEWAY_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    return await response.json();
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

