export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: 'google' | 'apple';
  providerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: number;
  tokenType: 'Bearer';
}

export interface AuthState {
  // Authentication status
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  
  // User data
  user: User | null;
  tokens: AuthTokens | null;
  
  // Error handling
  error: string | null;
  
  // OAuth state
  oauthState?: string;
}

export interface AuthActions {
  // Authentication methods
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  
  // Token management
  refreshTokens: () => Promise<void>;
  validateTokens: () => Promise<boolean>;
  
  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  initialize: () => Promise<void>;
  
  // User management
  updateUser: (user: Partial<User>) => void;
}

export interface OAuthConfig {
  google: {
    clientId: string;
    iosClientId?: string;
    androidClientId?: string;
    webClientId?: string;
  };
  apple: {
    clientId: string;
  };
}

export interface SecureStorageKeys {
  ACCESS_TOKEN: 'auth_access_token';
  REFRESH_TOKEN: 'auth_refresh_token';
  ID_TOKEN: 'auth_id_token';
  USER_DATA: 'auth_user_data';
  TOKEN_EXPIRY: 'auth_token_expiry';
}

export interface AuthError {
  code: string;
  message: string;
  details?: any;
}

export interface TokenValidationResult {
  isValid: boolean;
  needsRefresh: boolean;
  error?: AuthError;
}

export interface OAuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface ApiAuthHeaders {
  Authorization: string;
  'Content-Type': string;
}

export type AuthProvider = 'google' | 'apple';

export interface ProviderCredentials {
  provider: AuthProvider;
  accessToken: string;
  idToken?: string;
  authorizationCode?: string; // For Apple
  identityToken?: string; // For Apple
  user?: {
    email?: string;
    name?: {
      firstName?: string;
      lastName?: string;
    };
  };
}
