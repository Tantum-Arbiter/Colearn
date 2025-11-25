import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const GATEWAY_URL = process.env.EXPO_PUBLIC_GATEWAY_URL || 'http://localhost:8080';

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
  private static googleConfig = {
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  };

  /**
   * Sign in with Google
   * Note: This method should be called from a component that uses the useAuthRequest hook
   */
  static async signInWithGoogle(promptAsync: () => Promise<any>): Promise<AuthResponse> {
    try {
      const result = await promptAsync();

      if (result.type === 'success') {
        const { authentication } = result;

        // Send ID token to your backend
        const authResponse = await fetch(`${GATEWAY_URL}/auth/google`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Client-Platform': Platform.OS,
            'X-Client-Version': '1.0.0',
            'X-Device-ID': 'device-id-here', // TODO: Get from device
          },
          body: JSON.stringify({
            idToken: authentication?.idToken,
          }),
        });

        if (!authResponse.ok) {
          const errorText = await authResponse.text();
          throw new Error(`Authentication failed: ${errorText}`);
        }

        return await authResponse.json();
      }

      throw new Error('Google sign-in was cancelled');
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  }

  /**
   * Get Google OAuth configuration for useAuthRequest hook
   */
  static getGoogleConfig() {
    return {
      iosClientId: this.googleConfig.iosClientId,
      androidClientId: this.googleConfig.androidClientId,
      webClientId: this.googleConfig.webClientId,
    };
  }

  /**
   * Sign in with Apple
   */
  static async signInWithApple(): Promise<AuthResponse> {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Send credential to your backend
      const authResponse = await fetch(`${GATEWAY_URL}/auth/apple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Platform': Platform.OS,
          'X-Client-Version': '1.0.0',
          'X-Device-ID': 'device-id-here', // TODO: Get from device
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
    } catch (error) {
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

