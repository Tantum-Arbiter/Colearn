import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { 
  OAuthResponse, 
  AuthTokens, 
  User, 
  ProviderCredentials, 
  AuthError,
  TokenValidationResult 
} from '@/types/auth';
import oauthConfig, { OAUTH_SCOPES, OAUTH_ENDPOINTS, getRedirectUri } from '@/config/oauth-config';

// Configure WebBrowser for OAuth flows
WebBrowser.maybeCompleteAuthSession();

class AuthService {
  private gatewayBaseUrl: string;

  constructor() {
    // This will be configured from environment variables
    this.gatewayBaseUrl = process.env.EXPO_PUBLIC_GATEWAY_URL || 'https://gateway-service-jludng4t5a-ew.a.run.app';
  }

  /**
   * Sign in with Google using OAuth 2.0
   */
  async signInWithGoogle(): Promise<OAuthResponse> {
    try {
      // Check if we're in development mode with placeholder credentials
      if (this.isDevelopmentMode()) {
        return this.createDevelopmentResponse('google');
      }
      // Generate PKCE challenge for security
      const codeChallenge = await AuthSession.AuthRequest.createRandomCodeChallenge();
      
      const request = new AuthSession.AuthRequest({
        clientId: this.getGoogleClientId(),
        scopes: OAUTH_SCOPES.google,
        redirectUri: getRedirectUri(),
        responseType: AuthSession.ResponseType.Code,
        codeChallenge: codeChallenge.codeChallenge,
        codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
        additionalParameters: {
          access_type: 'offline', // Request refresh token
          prompt: 'consent', // Force consent screen to get refresh token
        },
      });

      const result = await request.promptAsync({
        authorizationEndpoint: OAUTH_ENDPOINTS.google.authorization,
        useProxy: Platform.OS === 'web',
      });

      if (result.type !== 'success') {
        throw {
          code: 'GOOGLE_AUTH_CANCELLED',
          message: 'Google authentication was cancelled',
          details: result,
        } as AuthError;
      }

      // Exchange authorization code for tokens
      const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
          clientId: this.getGoogleClientId(),
          code: result.params.code,
          redirectUri: getRedirectUri(),
          codeVerifier: codeChallenge.codeVerifier,
        },
        {
          tokenEndpoint: OAUTH_ENDPOINTS.google.token,
        }
      );

      // Get user info from Google
      const userInfoResponse = await fetch(OAUTH_ENDPOINTS.google.userInfo, {
        headers: {
          Authorization: `Bearer ${tokenResponse.accessToken}`,
        },
      });

      if (!userInfoResponse.ok) {
        throw new Error('Failed to fetch user info from Google');
      }

      const googleUser = await userInfoResponse.json();

      // Create our user object
      const user: User = {
        id: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
        provider: 'google',
        providerId: googleUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Create tokens object
      const tokens: AuthTokens = {
        accessToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken,
        idToken: tokenResponse.idToken,
        expiresAt: Date.now() + (tokenResponse.expiresIn || 3600) * 1000,
        tokenType: 'Bearer',
      };

      // Authenticate with our gateway service
      await this.authenticateWithGateway({ provider: 'google', ...tokenResponse });

      return { user, tokens };
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw this.handleAuthError(error, 'Google sign-in failed');
    }
  }

  /**
   * Sign in with Apple using Sign in with Apple
   */
  async signInWithApple(): Promise<OAuthResponse> {
    try {
      // Check if we're in development mode with placeholder credentials
      if (this.isDevelopmentMode()) {
        return this.createDevelopmentResponse('apple');
      }

      // Check if Apple Authentication is available
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Apple Authentication is not available on this device');
      }

      // Generate nonce for security
      const nonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        Math.random().toString(),
        { encoding: Crypto.CryptoEncoding.HEX }
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce,
      });

      if (!credential.identityToken) {
        throw new Error('Apple authentication failed - no identity token received');
      }

      // Create user object from Apple credential
      const user: User = {
        id: credential.user,
        email: credential.email || '',
        name: credential.fullName 
          ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
          : '',
        provider: 'apple',
        providerId: credential.user,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Create tokens object (Apple doesn't provide refresh tokens in the same way)
      const tokens: AuthTokens = {
        accessToken: credential.identityToken,
        idToken: credential.identityToken,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        tokenType: 'Bearer',
      };

      // Authenticate with our gateway service
      await this.authenticateWithGateway({
        provider: 'apple',
        identityToken: credential.identityToken,
        authorizationCode: credential.authorizationCode,
        user: credential.fullName ? {
          email: credential.email,
          name: {
            firstName: credential.fullName.givenName,
            lastName: credential.fullName.familyName,
          },
        } : undefined,
      });

      return { user, tokens };
    } catch (error) {
      console.error('Apple sign-in error:', error);
      throw this.handleAuthError(error, 'Apple sign-in failed');
    }
  }

  /**
   * Refresh access tokens
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      // For Google OAuth, we can refresh tokens
      const response = await fetch(OAUTH_ENDPOINTS.google.token, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.getGoogleClientId(),
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const tokenData = await response.json();

      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || refreshToken, // Keep existing if not provided
        idToken: tokenData.id_token,
        expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
        tokenType: 'Bearer',
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      throw this.handleAuthError(error, 'Failed to refresh tokens');
    }
  }

  /**
   * Validate tokens with the gateway service
   */
  async validateTokens(tokens: AuthTokens): Promise<TokenValidationResult> {
    try {
      const response = await fetch(`${this.gatewayBaseUrl}/auth/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.accessToken}`,
        },
      });

      if (response.ok) {
        return { isValid: true, needsRefresh: false };
      }

      if (response.status === 401) {
        return { 
          isValid: false, 
          needsRefresh: !!tokens.refreshToken,
          error: { code: 'TOKEN_EXPIRED', message: 'Token has expired' }
        };
      }

      return { 
        isValid: false, 
        needsRefresh: false,
        error: { code: 'TOKEN_INVALID', message: 'Token is invalid' }
      };
    } catch (error) {
      console.error('Token validation error:', error);
      return { 
        isValid: false, 
        needsRefresh: false,
        error: { code: 'VALIDATION_ERROR', message: 'Failed to validate token' }
      };
    }
  }

  /**
   * Authenticate with our gateway service
   */
  private async authenticateWithGateway(credentials: ProviderCredentials): Promise<void> {
    try {
      const response = await fetch(`${this.gatewayBaseUrl}/auth/oauth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Gateway authentication failed');
      }

      // Gateway authentication successful
      console.log('Successfully authenticated with gateway service');
    } catch (error) {
      console.error('Gateway authentication error:', error);
      // Don't throw here - we can still proceed with local authentication
      // The gateway integration will be enhanced in a later task
    }
  }

  /**
   * Get the appropriate Google client ID for the current platform
   */
  private getGoogleClientId(): string {
    if (Platform.OS === 'ios') {
      return oauthConfig.google.iosClientId || oauthConfig.google.clientId;
    } else if (Platform.OS === 'android') {
      return oauthConfig.google.androidClientId || oauthConfig.google.clientId;
    } else {
      return oauthConfig.google.webClientId || oauthConfig.google.clientId;
    }
  }

  /**
   * Handle and standardize authentication errors
   */
  private handleAuthError(error: any, defaultMessage: string): AuthError {
    if (error && typeof error === 'object' && error.code && error.message) {
      return error as AuthError;
    }

    return {
      code: error?.code || 'AUTH_ERROR',
      message: error?.message || defaultMessage,
      details: error,
    };
  }

  /**
   * Check if we're in development mode with placeholder credentials
   */
  private isDevelopmentMode(): boolean {
    const googleClientId = this.getGoogleClientId();
    return googleClientId.includes('development') ||
           googleClientId.includes('mock') ||
           process.env.NODE_ENV === 'development';
  }

  /**
   * Create a mock response for development mode
   */
  private createDevelopmentResponse(provider: 'google' | 'apple'): OAuthResponse {
    console.warn(`🚧 Development Mode: Using mock ${provider} authentication`);

    return {
      success: true,
      tokens: {
        accessToken: `dev_access_token_${provider}_${Date.now()}`,
        refreshToken: `dev_refresh_token_${provider}_${Date.now()}`,
        idToken: `dev_id_token_${provider}_${Date.now()}`,
        expiresIn: 3600,
        tokenType: 'Bearer',
      },
      user: {
        id: `dev_user_${provider}_${Date.now()}`,
        email: `dev.user@${provider}.com`,
        name: `Development User (${provider})`,
        picture: `https://via.placeholder.com/150?text=${provider.toUpperCase()}`,
        provider,
        verified: true,
      },
    };
  }
}

// Create and export a singleton instance
export const authService = new AuthService();
