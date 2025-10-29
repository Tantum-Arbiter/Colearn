import Constants from 'expo-constants';
import { AuthTokens, ApiAuthHeaders } from '@/types/auth';
import { useAuthStore } from '@/store/auth-store';

export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: any;

  constructor(options: { status: number; message: string; code?: string; details?: any }) {
    super(options.message);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
  }
}

class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor() {
    this.baseUrl = Constants.expoConfig?.extra?.gatewayUrl || 'https://gateway-service-jludng4t5a-ew.a.run.app';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  /**
   * Get authentication headers with current token
   */
  private async getAuthHeaders(): Promise<ApiAuthHeaders> {
    const { tokens, validateTokens, refreshTokens } = useAuthStore.getState();
    
    if (!tokens) {
      throw new ApiError({
        status: 401,
        message: 'No authentication token available',
        code: 'NO_TOKEN',
      });
    }

    // Validate tokens and refresh if needed
    const isValid = await validateTokens();
    if (!isValid) {
      throw new ApiError({
        status: 401,
        message: 'Authentication token is invalid',
        code: 'INVALID_TOKEN',
      });
    }

    return {
      ...this.defaultHeaders,
      'Authorization': `Bearer ${tokens.accessToken}`,
    } as ApiAuthHeaders;
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      
      let headers = { ...this.defaultHeaders };
      
      if (requireAuth) {
        const authHeaders = await this.getAuthHeaders();
        headers = { ...headers, ...authHeaders };
      }

      const config: RequestInit = {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      };

      console.log(`API Request: ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(url, config);
      
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const data = await response.json();
      
      return {
        data,
        success: true,
        message: data.message,
      };
    } catch (error) {
      console.error('API request failed:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError({
        status: 500,
        message: error instanceof Error ? error.message : 'Network request failed',
        code: 'NETWORK_ERROR',
        details: error,
      });
    }
  }

  /**
   * Handle error responses
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: any = {};
    
    try {
      errorData = await response.json();
    } catch {
      // Response might not be JSON
    }

    const error = new ApiError({
      status: response.status,
      message: errorData.message || response.statusText || 'Request failed',
      code: errorData.code || `HTTP_${response.status}`,
      details: errorData,
    });

    // Handle specific error cases
    if (response.status === 401) {
      // Token expired or invalid - trigger re-authentication
      const { signOut } = useAuthStore.getState();
      await signOut();
      error.code = 'AUTH_EXPIRED';
      error.message = 'Your session has expired. Please sign in again.';
    }

    throw error;
  }

  // Public API methods

  /**
   * GET request
   */
  async get<T>(endpoint: string, requireAuth: boolean = true): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' }, requireAuth);
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string, 
    data?: any, 
    requireAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      },
      requireAuth
    );
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string, 
    data?: any, 
    requireAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    return this.request<T>(
      endpoint,
      {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      },
      requireAuth
    );
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, requireAuth: boolean = true): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' }, requireAuth);
  }

  /**
   * Upload file
   */
  async upload<T>(
    endpoint: string,
    file: FormData,
    requireAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    const headers = requireAuth ? await this.getAuthHeaders() : this.defaultHeaders;
    
    // Remove Content-Type for FormData - let browser set it
    const { 'Content-Type': _, ...headersWithoutContentType } = headers;

    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        body: file,
        headers: headersWithoutContentType,
      },
      false // We already handled auth headers above
    );
  }

  // Authentication-specific endpoints

  /**
   * Authenticate with OAuth provider
   */
  async authenticateOAuth(credentials: any): Promise<ApiResponse<any>> {
    return this.post('/auth/oauth', credentials, false);
  }

  /**
   * Validate current token
   */
  async validateToken(): Promise<ApiResponse<any>> {
    return this.get('/auth/validate');
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(refreshToken: string): Promise<ApiResponse<AuthTokens>> {
    return this.post('/auth/refresh', { refreshToken }, false);
  }

  /**
   * Sign out and invalidate token
   */
  async signOut(): Promise<ApiResponse<any>> {
    return this.post('/auth/signout');
  }

  // User management endpoints

  /**
   * Get current user profile
   */
  async getUserProfile(): Promise<ApiResponse<any>> {
    return this.get('/user/profile');
  }

  /**
   * Update user profile
   */
  async updateUserProfile(data: any): Promise<ApiResponse<any>> {
    return this.put('/user/profile', data);
  }

  // App-specific endpoints

  /**
   * Get user's children/profiles
   */
  async getChildren(): Promise<ApiResponse<any[]>> {
    return this.get('/user/children');
  }

  /**
   * Create child profile
   */
  async createChild(childData: any): Promise<ApiResponse<any>> {
    return this.post('/user/children', childData);
  }

  /**
   * Get user progress/analytics
   */
  async getUserProgress(): Promise<ApiResponse<any>> {
    return this.get('/user/progress');
  }

  /**
   * Save user progress
   */
  async saveProgress(progressData: any): Promise<ApiResponse<any>> {
    return this.post('/user/progress', progressData);
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient();

// Export error class for type checking
export { ApiError };
