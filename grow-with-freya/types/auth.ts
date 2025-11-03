/**
 * Authentication Types and Interfaces
 * Enterprise-grade authentication system for Grow with Freya
 */

// OAuth Provider Types
export type OAuthProvider = 'google' | 'apple';

// Authentication State
export type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

// User Profile Interface
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: OAuthProvider;
  providerId: string;
  createdAt: string;
  updatedAt: string;
  preferences?: UserPreferences;
}

// User Preferences
export interface UserPreferences {
  childName?: string;
  childAge?: number;
  screenTimeEnabled: boolean;
  notificationsEnabled: boolean;
  musicVolume: number;
  preferredLanguage: string;
  theme: 'light' | 'dark' | 'auto';
}

// JWT Token Structure
export interface JWTToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: 'Bearer';
  scope: string[];
}

// OAuth Response from Providers
export interface OAuthResponse {
  provider: OAuthProvider;
  providerId: string;
  email: string;
  name: string;
  picture?: string;
  idToken: string;
  accessToken?: string;
}

// Authentication Request/Response
export interface AuthRequest {
  provider: OAuthProvider;
  idToken: string;
  clientId: string;
  nonce?: string;
}

export interface AuthResponse {
  success: boolean;
  user: UserProfile;
  tokens: JWTToken;
  message?: string;
}

// Token Refresh
export interface TokenRefreshRequest {
  refreshToken: string;
}

export interface TokenRefreshResponse {
  success: boolean;
  tokens: JWTToken;
  message?: string;
}

// API Error Response
export interface APIError {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path: string;
  details?: Record<string, any>;
}

// Security Context
export interface SecurityContext {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  deviceId: string;
  ipAddress?: string;
  userAgent?: string;
}

// Device Information
export interface DeviceInfo {
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
  osVersion: string;
  appVersion: string;
  deviceModel?: string;
  isEmulator?: boolean;
}

// Session Management
export interface UserSession {
  sessionId: string;
  userId: string;
  deviceInfo: DeviceInfo;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  isActive: boolean;
}

// Batch API Types
export interface BatchRequest {
  requests: BatchRequestItem[];
  metadata?: Record<string, any>;
}

export interface BatchRequestItem {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: any;
}

export interface BatchResponse {
  responses: BatchResponseItem[];
  metadata?: Record<string, any>;
}

export interface BatchResponseItem {
  id: string;
  status: number;
  headers?: Record<string, string>;
  body?: any;
  error?: APIError;
}

// Story Metadata for Batch API
export interface StoryMetadata {
  id: string;
  title: string;
  category: string;
  tag: string;
  emoji: string;
  coverImage: string;
  isAvailable: boolean;
  ageRange: string;
  duration: number;
  description: string;
  pages: StoryPageMetadata[];
  createdAt: string;
  updatedAt: string;
}

export interface StoryPageMetadata {
  id: string;
  pageNumber: number;
  backgroundImage: string;
  text: string;
  audioFile?: string;
  animations?: AnimationMetadata[];
}

export interface AnimationMetadata {
  type: 'swaying' | 'blinking' | 'laughing' | 'floating';
  element: string;
  duration?: number;
  delay?: number;
}

// CMS Content Types
export interface CMSContent {
  stories: StoryMetadata[];
  categories: ContentCategory[];
  settings: AppSettings;
  version: string;
  lastUpdated: string;
}

export interface ContentCategory {
  id: string;
  name: string;
  emoji: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
}

export interface AppSettings {
  maintenanceMode: boolean;
  minAppVersion: string;
  maxDailyUsage: number;
  featuresEnabled: string[];
  announcements: Announcement[];
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  startDate: string;
  endDate: string;
  targetAudience: string[];
}

// Authentication Store State
export interface AuthStore {
  // State
  authState: AuthState;
  user: UserProfile | null;
  tokens: JWTToken | null;
  error: string | null;
  isLoading: boolean;
  
  // Actions
  signIn: (provider: OAuthProvider) => Promise<void>;
  signOut: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  clearError: () => void;
  
  // Getters
  isAuthenticated: boolean;
  hasValidToken: boolean;
}

// API Client Configuration
export interface APIClientConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableRequestSigning: boolean;
  enableLogging: boolean;
}

// Request Signing
export interface SignedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: number;
  nonce: string;
  signature: string;
}

// Security Validation
export interface SecurityValidation {
  isValidJWT: (token: string) => boolean;
  isTokenExpired: (token: string) => boolean;
  validateRequestSignature: (request: SignedRequest) => boolean;
  sanitizeInput: (input: any) => any;
  detectSuspiciousActivity: (context: SecurityContext) => boolean;
}
