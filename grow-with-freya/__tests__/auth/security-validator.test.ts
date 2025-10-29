import { securityValidator } from '@/services/security-validator';
import * as Crypto from 'expo-crypto';

// Mock dependencies
jest.mock('expo-crypto');

const mockCrypto = Crypto;

describe('SecurityValidator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateTokenStructure', () => {
    it('should validate a properly structured JWT', async () => {
      const header = { alg: 'RS256', typ: 'JWT' };
      const payload = {
        sub: 'user-123',
        iss: 'https://accounts.google.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      };

      const encodedHeader = btoa(JSON.stringify(header));
      const encodedPayload = btoa(JSON.stringify(payload));
      const signature = 'mock-signature';
      
      const token = `${encodedHeader}.${encodedPayload}.${signature}`;

      const result = await securityValidator.validateTokenStructure(token);

      expect(result.isValid).toBe(true);
      expect(result.needsRefresh).toBe(false);
    });

    it('should reject tokens with invalid structure', async () => {
      const invalidToken = 'invalid.token';

      const result = await securityValidator.validateTokenStructure(invalidToken);

      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe('INVALID_TOKEN_STRUCTURE');
    });

    it('should detect expired tokens', async () => {
      const header = { alg: 'RS256', typ: 'JWT' };
      const payload = {
        sub: 'user-123',
        iss: 'https://accounts.google.com',
        exp: Math.floor(Date.now() / 1000) - 100, // Expired
        iat: Math.floor(Date.now() / 1000) - 3700,
      };

      const encodedHeader = btoa(JSON.stringify(header));
      const encodedPayload = btoa(JSON.stringify(payload));
      const signature = 'mock-signature';
      
      const token = `${encodedHeader}.${encodedPayload}.${signature}`;

      const result = await securityValidator.validateTokenStructure(token);

      expect(result.isValid).toBe(false);
      expect(result.needsRefresh).toBe(true);
      expect(result.error?.code).toBe('TOKEN_EXPIRED');
    });

    it('should detect tokens expiring soon', async () => {
      const header = { alg: 'RS256', typ: 'JWT' };
      const payload = {
        sub: 'user-123',
        iss: 'https://accounts.google.com',
        exp: Math.floor(Date.now() / 1000) + 120, // Expires in 2 minutes
        iat: Math.floor(Date.now() / 1000),
      };

      const encodedHeader = btoa(JSON.stringify(header));
      const encodedPayload = btoa(JSON.stringify(payload));
      const signature = 'mock-signature';
      
      const token = `${encodedHeader}.${encodedPayload}.${signature}`;

      const result = await securityValidator.validateTokenStructure(token);

      expect(result.isValid).toBe(true);
      expect(result.needsRefresh).toBe(true);
      expect(result.error?.code).toBe('TOKEN_EXPIRING_SOON');
    });

    it('should reject tokens with missing required claims', async () => {
      const header = { alg: 'RS256', typ: 'JWT' };
      const payload = {
        // Missing 'sub' and 'iss'
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      };

      const encodedHeader = btoa(JSON.stringify(header));
      const encodedPayload = btoa(JSON.stringify(payload));
      const signature = 'mock-signature';
      
      const token = `${encodedHeader}.${encodedPayload}.${signature}`;

      const result = await securityValidator.validateTokenStructure(token);

      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe('MISSING_REQUIRED_CLAIMS');
    });

    it('should reject tokens issued in the future', async () => {
      const header = { alg: 'RS256', typ: 'JWT' };
      const payload = {
        sub: 'user-123',
        iss: 'https://accounts.google.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000) + 1000, // Issued in future
      };

      const encodedHeader = btoa(JSON.stringify(header));
      const encodedPayload = btoa(JSON.stringify(payload));
      const signature = 'mock-signature';
      
      const token = `${encodedHeader}.${encodedPayload}.${signature}`;

      const result = await securityValidator.validateTokenStructure(token);

      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe('TOKEN_FUTURE_ISSUED');
    });
  });

  describe('validateTokens', () => {
    it('should validate tokens object with valid access token', async () => {
      const tokens = {
        accessToken: 'valid-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer' as const,
      };

      // Mock the validateTokenStructure method to return valid
      jest.spyOn(securityValidator, 'validateTokenStructure').mockResolvedValue({
        isValid: true,
        needsRefresh: false,
      });

      const result = await securityValidator.validateTokens(tokens);

      expect(result.isValid).toBe(true);
      expect(result.needsRefresh).toBe(false);
    });

    it('should reject tokens without access token', async () => {
      const tokens = {
        accessToken: '',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer' as const,
      };

      const result = await securityValidator.validateTokens(tokens);

      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe('NO_ACCESS_TOKEN');
    });

    it('should detect tokens expiring soon based on timestamp', async () => {
      const tokens = {
        accessToken: 'valid-token',
        expiresAt: Date.now() + 120000, // Expires in 2 minutes
        tokenType: 'Bearer' as const,
        refreshToken: 'refresh-token',
      };

      const result = await securityValidator.validateTokens(tokens);

      expect(result.isValid).toBe(false);
      expect(result.needsRefresh).toBe(true);
      expect(result.error?.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('generateSecureRandom', () => {
    it('should generate secure random string', async () => {
      const mockBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      mockCrypto.getRandomBytesAsync.mockResolvedValue(mockBytes);

      const result = await securityValidator.generateSecureRandom(8);

      expect(result).toBe('0102030405060708');
      expect(mockCrypto.getRandomBytesAsync).toHaveBeenCalledWith(8);
    });
  });

  describe('generatePKCE', () => {
    it('should generate PKCE code verifier and challenge', async () => {
      const mockBytes = new Uint8Array(32).fill(1);
      mockCrypto.getRandomBytesAsync.mockResolvedValue(mockBytes);
      mockCrypto.digestStringAsync.mockResolvedValue('mock-code-challenge');

      const result = await securityValidator.generatePKCE();

      expect(result.codeVerifier).toBe('01'.repeat(32));
      expect(result.codeChallenge).toBe('mock-code-challenge');
    });
  });

  describe('validateRedirectUrl', () => {
    it('should validate allowed redirect URLs', () => {
      const allowedDomains = ['example.com', 'app.example.com'];
      
      expect(securityValidator.validateRedirectUrl('https://example.com/callback', allowedDomains)).toBe(true);
      expect(securityValidator.validateRedirectUrl('https://app.example.com/auth', allowedDomains)).toBe(true);
      expect(securityValidator.validateRedirectUrl('https://sub.example.com/callback', allowedDomains)).toBe(true);
    });

    it('should reject disallowed redirect URLs', () => {
      const allowedDomains = ['example.com'];
      
      expect(securityValidator.validateRedirectUrl('https://malicious.com/callback', allowedDomains)).toBe(false);
      expect(securityValidator.validateRedirectUrl('javascript:alert(1)', allowedDomains)).toBe(false);
      expect(securityValidator.validateRedirectUrl('ftp://example.com/file', allowedDomains)).toBe(false);
    });

    it('should handle invalid URLs gracefully', () => {
      const allowedDomains = ['example.com'];
      
      expect(securityValidator.validateRedirectUrl('not-a-url', allowedDomains)).toBe(false);
      expect(securityValidator.validateRedirectUrl('', allowedDomains)).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize potentially dangerous input', () => {
      const input = '<script>alert("xss")</script>javascript:void(0)data:text/html,<h1>test</h1>';
      const sanitized = securityValidator.sanitizeInput(input);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('data:');
    });

    it('should trim whitespace and limit length', () => {
      const longInput = '  ' + 'a'.repeat(2000) + '  ';
      const sanitized = securityValidator.sanitizeInput(longInput);
      
      expect(sanitized.length).toBeLessThanOrEqual(1000);
      expect(sanitized).not.toMatch(/^\s/);
      expect(sanitized).not.toMatch(/\s$/);
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      expect(securityValidator.validateEmail('test@example.com')).toBe(true);
      expect(securityValidator.validateEmail('user.name+tag@domain.co.uk')).toBe(true);
      expect(securityValidator.validateEmail('user123@test-domain.org')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(securityValidator.validateEmail('invalid-email')).toBe(false);
      expect(securityValidator.validateEmail('@domain.com')).toBe(false);
      expect(securityValidator.validateEmail('user@')).toBe(false);
      expect(securityValidator.validateEmail('user@domain')).toBe(false);
      expect(securityValidator.validateEmail('')).toBe(false);
    });

    it('should reject emails that are too long', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(securityValidator.validateEmail(longEmail)).toBe(false);
    });
  });

  describe('isSecureContext', () => {
    it('should return false in development mode', () => {
      // __DEV__ is true in test environment
      expect(securityValidator.isSecureContext()).toBe(false);
    });
  });
});
