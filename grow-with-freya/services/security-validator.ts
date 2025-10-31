import * as Crypto from 'expo-crypto';
import { AuthTokens, TokenValidationResult } from '@/types/auth';

export interface SecurityConfig {
  tokenExpiryBuffer: number; // Minutes before expiry to consider token invalid
  maxTokenAge: number; // Maximum token age in hours
  requireSecureConnection: boolean;
  enableTokenRotation: boolean;
}

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  tokenExpiryBuffer: 5, // 5 minutes
  maxTokenAge: 24, // 24 hours
  requireSecureConnection: true,
  enableTokenRotation: true,
};

class SecurityValidatorService {
  private config: SecurityConfig;

  constructor(config: SecurityConfig = DEFAULT_SECURITY_CONFIG) {
    this.config = config;
  }

  /**
   * Validate JWT token structure and claims
   */
  async validateTokenStructure(token: string): Promise<TokenValidationResult> {
    try {
      // Basic JWT structure validation
      const parts = token.split('.');
      if (parts.length !== 3) {
        return {
          isValid: false,
          needsRefresh: false,
          error: { code: 'INVALID_TOKEN_STRUCTURE', message: 'Invalid JWT structure' },
        };
      }

      // Decode header and payload (without verification for now)
      const header = this.decodeBase64Url(parts[0]);
      const payload = this.decodeBase64Url(parts[1]);

      if (!header || !payload) {
        return {
          isValid: false,
          needsRefresh: false,
          error: { code: 'INVALID_TOKEN_ENCODING', message: 'Invalid token encoding' },
        };
      }

      // Validate token claims
      const claims = JSON.parse(payload);
      const validationResult = this.validateTokenClaims(claims);
      
      return validationResult;
    } catch (error) {
      return {
        isValid: false,
        needsRefresh: false,
        error: { 
          code: 'TOKEN_VALIDATION_ERROR', 
          message: 'Failed to validate token structure',
          details: error,
        },
      };
    }
  }

  /**
   * Validate token claims (exp, iat, etc.)
   */
  private validateTokenClaims(claims: any): TokenValidationResult {
    const now = Math.floor(Date.now() / 1000);

    // Check if token has expired
    if (claims.exp && claims.exp < now) {
      return {
        isValid: false,
        needsRefresh: true,
        error: { code: 'TOKEN_EXPIRED', message: 'Token has expired' },
      };
    }

    // Check if token is about to expire (within buffer time)
    if (claims.exp && claims.exp < (now + this.config.tokenExpiryBuffer * 60)) {
      return {
        isValid: true,
        needsRefresh: true,
        error: { code: 'TOKEN_EXPIRING_SOON', message: 'Token expires soon' },
      };
    }

    // Check if token is too old
    if (claims.iat) {
      const tokenAge = (now - claims.iat) / 3600; // Convert to hours
      if (tokenAge > this.config.maxTokenAge) {
        return {
          isValid: false,
          needsRefresh: true,
          error: { code: 'TOKEN_TOO_OLD', message: 'Token is too old' },
        };
      }
    }

    // Check if token was issued in the future (clock skew protection)
    if (claims.iat && claims.iat > (now + 300)) { // 5 minutes tolerance
      return {
        isValid: false,
        needsRefresh: false,
        error: { code: 'TOKEN_FUTURE_ISSUED', message: 'Token issued in the future' },
      };
    }

    // Check required claims
    if (!claims.sub || !claims.iss) {
      return {
        isValid: false,
        needsRefresh: false,
        error: { code: 'MISSING_REQUIRED_CLAIMS', message: 'Missing required token claims' },
      };
    }

    return { isValid: true, needsRefresh: false };
  }

  /**
   * Validate tokens object
   */
  async validateTokens(tokens: AuthTokens): Promise<TokenValidationResult> {
    if (!tokens.accessToken) {
      return {
        isValid: false,
        needsRefresh: false,
        error: { code: 'NO_ACCESS_TOKEN', message: 'No access token provided' },
      };
    }

    // Validate access token structure
    const accessTokenValidation = await this.validateTokenStructure(tokens.accessToken);
    if (!accessTokenValidation.isValid) {
      return accessTokenValidation;
    }

    // Check token expiry timestamp
    const now = Date.now();
    const bufferTime = this.config.tokenExpiryBuffer * 60 * 1000; // Convert to milliseconds

    if (tokens.expiresAt <= (now + bufferTime)) {
      return {
        isValid: false,
        needsRefresh: !!tokens.refreshToken,
        error: { code: 'TOKEN_EXPIRED', message: 'Token has expired or expires soon' },
      };
    }

    return { isValid: true, needsRefresh: false };
  }

  /**
   * Generate secure random string
   */
  async generateSecureRandom(length: number = 32): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(length);
    return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate PKCE code verifier and challenge
   */
  async generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
    const codeVerifier = await this.generateSecureRandom(32);
    const codeChallenge = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      codeVerifier,
      { encoding: Crypto.CryptoEncoding.BASE64URL }
    );

    return { codeVerifier, codeChallenge };
  }

  /**
   * Validate URL for security (prevent open redirects)
   */
  validateRedirectUrl(url: string, allowedDomains: string[]): boolean {
    try {
      const urlObj = new URL(url);
      
      // Check protocol
      if (!['https:', 'http:'].includes(urlObj.protocol)) {
        return false;
      }

      // Require HTTPS in production
      if (this.config.requireSecureConnection && urlObj.protocol !== 'https:') {
        return false;
      }

      // Check if domain is in allowed list
      return allowedDomains.some(domain => 
        urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
      );
    } catch {
      return false;
    }
  }

  /**
   * Sanitize user input
   */
  sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/data:/gi, '') // Remove data: protocol
      .substring(0, 1000); // Limit length
  }

  /**
   * Validate email format
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  /**
   * Check if app is running in secure context
   */
  isSecureContext(): boolean {
    // In React Native, we consider the app secure if it's not in debug mode
    // and running on a physical device with proper certificates
    return !__DEV__;
  }

  /**
   * Decode base64url string
   */
  private decodeBase64Url(str: string): string | null {
    try {
      // Add padding if needed
      const padding = '='.repeat((4 - (str.length % 4)) % 4);
      const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + padding;
      
      // In React Native, we can use atob or Buffer
      if (typeof atob !== 'undefined') {
        return atob(base64);
      } else {
        // Fallback for environments without atob
        return Buffer.from(base64, 'base64').toString('utf-8');
      }
    } catch {
      return null;
    }
  }

  /**
   * Update security configuration
   */
  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current security configuration
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }
}

// Create and export singleton instance
export const securityValidator = new SecurityValidatorService();

// Export types and constants
export { SecurityConfig, DEFAULT_SECURITY_CONFIG };
