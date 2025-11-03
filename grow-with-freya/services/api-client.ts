/**
 * Secure API Client
 * Enterprise-grade HTTP client with JWT authentication, request signing, and security features
 */

import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import {
  APIClientConfig,
  APIError,
  SignedRequest,
  BatchRequest,
  BatchResponse,
  SecurityContext,
} from '../types/auth';
import SecureStorageService from './secure-storage';

// Default configuration
const DEFAULT_CONFIG: APIClientConfig = {
  baseURL: process.env.EXPO_PUBLIC_GATEWAY_URL || 'https://gateway-service-jludng4t5a-ew.a.run.app',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  enableRequestSigning: true,
  enableLogging: __DEV__,
};

// Request interceptor type
type RequestInterceptor = (config: RequestConfig) => Promise<RequestConfig>;
type ResponseInterceptor = (response: any) => Promise<any>;

interface RequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  requireAuth?: boolean;
  skipSigning?: boolean;
}

class APIClient {
  private static instance: APIClient;
  private config: APIClientConfig;
  private secureStorage: SecureStorageService;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  static getInstance(config?: Partial<APIClientConfig>): APIClient {
    if (!APIClient.instance) {
      APIClient.instance = new APIClient(config);
    }
    return APIClient.instance;
  }

  constructor(config?: Partial<APIClientConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.secureStorage = SecureStorageService.getInstance();
    this.setupDefaultInterceptors();
  }

  /**
   * GET request
   */
  async get<T>(url: string, config?: Partial<RequestConfig>): Promise<T> {
    return this.request<T>({ ...config, url, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<T> {
    return this.request<T>({ ...config, url, method: 'POST', body: data });
  }

  /**
   * PUT request
   */
  async put<T>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<T> {
    return this.request<T>({ ...config, url, method: 'PUT', body: data });
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, config?: Partial<RequestConfig>): Promise<T> {
    return this.request<T>({ ...config, url, method: 'DELETE' });
  }

  /**
   * Batch API request
   */
  async batch(batchRequest: BatchRequest): Promise<BatchResponse> {
    return this.post<BatchResponse>('/api/batch', batchRequest, {
      requireAuth: true,
      skipSigning: false,
    });
  }

  /**
   * Upload file
   */
  async upload<T>(url: string, file: File | Blob, config?: Partial<RequestConfig>): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request<T>({
      ...config,
      url,
      method: 'POST',
      body: formData,
      skipSigning: true, // FormData signing is complex
    });
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  // Private Methods

  private async request<T>(config: RequestConfig): Promise<T> {
    let requestConfig = { ...config };

    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      requestConfig = await interceptor(requestConfig);
    }

    const fullUrl = this.buildUrl(requestConfig.url);
    let attempt = 0;

    while (attempt <= this.config.retryAttempts) {
      try {
        const response = await this.executeRequest(fullUrl, requestConfig);
        
        // Apply response interceptors
        let processedResponse = response;
        for (const interceptor of this.responseInterceptors) {
          processedResponse = await interceptor(processedResponse);
        }

        return processedResponse;
      } catch (error) {
        attempt++;
        
        if (attempt > this.config.retryAttempts || !this.shouldRetry(error)) {
          throw error;
        }

        // Wait before retry
        await this.delay(this.config.retryDelay * attempt);
        
        if (this.config.enableLogging) {
          console.log(`Retrying request (${attempt}/${this.config.retryAttempts}):`, fullUrl);
        }
      }
    }

    throw new Error('Max retry attempts exceeded');
  }

  private async executeRequest(url: string, config: RequestConfig): Promise<any> {
    const headers = await this.buildHeaders(config);
    const body = this.buildBody(config.body);

    // Create signed request if enabled
    let requestData: any = {
      method: config.method,
      headers,
      body,
    };

    if (this.config.enableRequestSigning && !config.skipSigning) {
      requestData = await this.signRequest(url, requestData);
    }

    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout || this.config.timeout);

    try {
      if (this.config.enableLogging) {
        console.log(`API Request: ${config.method} ${url}`, {
          headers: this.sanitizeHeaders(headers),
          body: config.method !== 'GET' ? body : undefined,
        });
      }

      const response = await fetch(url, {
        ...requestData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw await this.createAPIError(response);
      }

      const responseData = await this.parseResponse(response);

      if (this.config.enableLogging) {
        console.log(`API Response: ${response.status}`, responseData);
      }

      return responseData;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  private async buildHeaders(config: RequestConfig): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': `GrowWithFreya/${Platform.OS}/1.0.0`,
      'X-Client-Platform': Platform.OS,
      'X-Client-Version': '1.0.0',
      ...config.headers,
    };

    // Add authentication header
    if (config.requireAuth !== false) {
      const accessToken = await this.secureStorage.getTokens();
      if (accessToken?.accessToken) {
        headers['Authorization'] = `Bearer ${accessToken.accessToken}`;
      }
    }

    // Add device ID
    try {
      const deviceId = await this.secureStorage.getDeviceId();
      headers['X-Device-ID'] = deviceId;
    } catch (error) {
      console.warn('Failed to get device ID for headers:', error);
    }

    // Add session ID if available
    try {
      const sessionId = await this.secureStorage.getSessionId();
      if (sessionId) {
        headers['X-Session-ID'] = sessionId;
      }
    } catch (error) {
      // Session ID is optional
    }

    return headers;
  }

  private buildBody(data: any): string | FormData | null {
    if (!data) return null;
    
    if (data instanceof FormData) {
      return data;
    }
    
    if (typeof data === 'object') {
      return JSON.stringify(data);
    }
    
    return String(data);
  }

  private async signRequest(url: string, request: any): Promise<any> {
    try {
      const timestamp = Date.now();
      const nonce = await this.generateNonce();
      const bodyString = request.body || '';
      
      // Create signature payload
      const signaturePayload = [
        request.method,
        url,
        timestamp,
        nonce,
        bodyString,
      ].join('|');

      // Generate signature (simplified - use HMAC in production)
      const signature = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        signaturePayload,
        { encoding: Crypto.CryptoEncoding.HEX }
      );

      // Add signature headers
      request.headers = {
        ...request.headers,
        'X-Timestamp': timestamp.toString(),
        'X-Nonce': nonce,
        'X-Signature': signature,
      };

      return request;
    } catch (error) {
      console.error('Failed to sign request:', error);
      return request; // Continue without signing
    }
  }

  private async generateNonce(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    return randomBytes.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private buildUrl(path: string): string {
    if (path.startsWith('http')) {
      return path;
    }
    
    const baseUrl = this.config.baseURL.replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    
    return `${baseUrl}${cleanPath}`;
  }

  private async parseResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      return await response.json();
    }
    
    if (contentType?.includes('text/')) {
      return await response.text();
    }
    
    return await response.blob();
  }

  private async createAPIError(response: Response): Promise<APIError> {
    let errorData: any = {};
    
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }

    return {
      error: errorData.error || 'API_ERROR',
      message: errorData.message || 'An API error occurred',
      statusCode: response.status,
      timestamp: new Date().toISOString(),
      path: response.url,
      details: errorData.details || {},
    };
  }

  private shouldRetry(error: any): boolean {
    // Retry on network errors and 5xx server errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return true; // Network error
    }
    
    if (error.statusCode >= 500) {
      return true; // Server error
    }
    
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized = { ...headers };
    
    // Hide sensitive headers in logs
    if (sanitized.Authorization) {
      sanitized.Authorization = 'Bearer ***';
    }
    
    return sanitized;
  }

  private setupDefaultInterceptors(): void {
    // Add default request interceptor for common headers
    this.addRequestInterceptor(async (config) => {
      return config;
    });

    // Add default response interceptor for error handling
    this.addResponseInterceptor(async (response) => {
      return response;
    });
  }
}

export default APIClient;
