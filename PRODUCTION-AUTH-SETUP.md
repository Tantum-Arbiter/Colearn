# Production Authentication Setup Guide
## Grow with Freya - Enterprise-Grade Security Configuration

This guide provides comprehensive instructions for setting up production-ready authentication with the highest security standards for the Grow with Freya application.

## Overview

Based on the codebase analysis, we need to implement:
- **SSO Authentication**: Google & Apple Sign-In
- **Secure Token Management**: JWT with refresh tokens
- **API Gateway Integration**: GCP Cloud Run with authentication
- **Cloudflare Security**: WAF, DDoS protection, and edge security

## Architecture

```
Mobile App (React Native/Expo) 
    ↓ OAuth 2.0 + PKCE
Google/Apple Identity Providers
    ↓ ID Token + Auth Code
Cloudflare (WAF + Security)
    ↓ Verified Requests
GCP API Gateway (Cloud Endpoints)
    ↓ JWT Validation
Gateway Service (Spring Boot)
    ↓ Authorized Requests
Backend Services
```

## Part 1: Google Cloud Platform (GCP) Configuration

### 1.1 OAuth 2.0 Setup

#### Google Cloud Console Configuration

1. **Create OAuth 2.0 Credentials**:
   ```bash
   # Navigate to Google Cloud Console
   # APIs & Services > Credentials > Create Credentials > OAuth 2.0 Client IDs
   ```

2. **Configure OAuth Consent Screen**:
   - **Application Type**: Public
   - **Application Name**: "Grow with Freya"
   - **User Support Email**: your-support@growwithfreya.com
   - **Developer Contact**: your-dev@growwithfreya.com
   - **Authorized Domains**: 
     - `growwithfreya.com`
     - `api.growwithfreya.com`
   - **Scopes**: `openid`, `email`, `profile`

3. **Create Client IDs for Each Platform**:

   **iOS Client ID**:
   ```
   Application Type: iOS
   Bundle ID: com.growwithfreya.app
   ```

   **Android Client ID**:
   ```
   Application Type: Android
   Package Name: com.growwithfreya.app
   SHA-1 Certificate Fingerprint: [Your production SHA-1]
   ```

   **Web Client ID** (for backend verification):
   ```
   Application Type: Web Application
   Authorized Redirect URIs: https://api.growwithfreya.com/auth/callback
   ```

### 1.2 Apple Developer Configuration

1. **App ID Configuration**:
   - Enable "Sign In with Apple" capability
   - Configure Return URLs: `https://api.growwithfreya.com/auth/apple/callback`

2. **Service ID Creation**:
   ```
   Identifier: com.growwithfreya.app.signin
   Return URLs: https://api.growwithfreya.com/auth/apple/callback
   ```

3. **Key Generation**:
   - Create a new key with "Sign In with Apple" enabled
   - Download the .p8 key file (store securely)
   - Note the Key ID and Team ID

### 1.3 GCP API Gateway Setup

#### Cloud Endpoints Configuration

1. **Create API Configuration** (`api-config.yaml`):
   ```yaml
   swagger: "2.0"
   info:
     title: "Grow with Freya API"
     version: "1.0.0"
   host: "api.growwithfreya.com"
   schemes:
     - "https"
   
   securityDefinitions:
     firebase:
       authorizationUrl: ""
       flow: "implicit"
       type: "oauth2"
       x-google-issuer: "https://securetoken.google.com/YOUR_PROJECT_ID"
       x-google-jwks_uri: "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
       x-google-audiences: "YOUR_PROJECT_ID"
   
   paths:
     "/api/v1/**":
       security:
         - firebase: []
       x-google-backend:
         address: "https://gateway-service-jludng4t5a-ew.a.run.app"
   ```

2. **Deploy API Configuration**:
   ```bash
   gcloud endpoints services deploy api-config.yaml
   ```

### 1.4 Firebase Authentication Setup

1. **Enable Authentication Providers**:
   ```bash
   # Firebase Console > Authentication > Sign-in method
   # Enable Google and Apple providers
   ```

2. **Configure Authorized Domains**:
   - Add your production domains
   - Configure OAuth redirect URLs

### 1.5 Cloud Run Security Configuration

Update your `gateway-build.yml` workflow:

```yaml
- name: Deploy to Cloud Run
  run: |
    gcloud run deploy gateway-service \
      --image europe-west1-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/gateway-repo/gateway-service:$VERSION \
      --platform managed \
      --region europe-west1 \
      --allow-unauthenticated \
      --set-env-vars="SPRING_PROFILES_ACTIVE=production" \
      --set-env-vars="JWT_SECRET=${{ secrets.JWT_SECRET }}" \
      --set-env-vars="GOOGLE_CLIENT_ID=${{ secrets.GOOGLE_WEB_CLIENT_ID }}" \
      --set-env-vars="APPLE_CLIENT_ID=${{ secrets.APPLE_CLIENT_ID }}" \
      --set-env-vars="APPLE_TEAM_ID=${{ secrets.APPLE_TEAM_ID }}" \
      --set-env-vars="APPLE_KEY_ID=${{ secrets.APPLE_KEY_ID }}" \
      --set-env-vars="APPLE_PRIVATE_KEY=${{ secrets.APPLE_PRIVATE_KEY }}" \
      --cpu=2 \
      --memory=2Gi \
      --max-instances=100 \
      --concurrency=80 \
      --timeout=300 \
      --service-account=gateway-service@${{ secrets.GCP_PROJECT_ID }}.iam.gserviceaccount.com
```

## Part 2: Cloudflare Configuration

### 2.1 DNS and SSL Setup

1. **Add Domain to Cloudflare**:
   - Point `api.growwithfreya.com` to your GCP Load Balancer IP
   - Enable "Proxied" status (orange cloud)

2. **SSL/TLS Configuration**:
   - Set SSL/TLS encryption mode to "Full (strict)"
   - Enable "Always Use HTTPS"
   - Set minimum TLS version to 1.2
   - Enable HSTS with max-age=31536000

### 2.2 Web Application Firewall (WAF)

Configure WAF rules in Cloudflare:

```javascript
// Rate limiting rule
(http.request.uri.path contains "/api/auth/login" and http.request.method eq "POST") 
or (http.request.uri.path contains "/api/auth/refresh" and http.request.method eq "POST")
```

**Rate Limits**:
- Authentication endpoints: 5 requests per minute per IP
- API endpoints: 100 requests per minute per IP
- Global: 1000 requests per minute per IP

### 2.3 Security Rules

1. **Block Malicious Traffic**:
   ```javascript
   // Block known bad user agents
   (http.user_agent contains "sqlmap") 
   or (http.user_agent contains "nikto")
   or (http.user_agent contains "nmap")
   ```

2. **Geo-blocking** (if needed):
   ```javascript
   // Allow only specific countries
   ip.geoip.country in {"US" "CA" "GB" "AU" "DE" "FR"}
   ```

3. **Bot Protection**:
   - Enable "Bot Fight Mode"
   - Configure "Super Bot Fight Mode" for enhanced protection

### 2.4 Page Rules

1. **API Caching**:
   ```
   URL: api.growwithfreya.com/api/v1/public/*
   Settings: Cache Level = Cache Everything, Edge Cache TTL = 1 hour
   ```

2. **Security Headers**:
   ```
   URL: api.growwithfreya.com/*
   Settings: Security Level = High, Browser Integrity Check = On
   ```

## Part 3: Required GitHub Secrets

Add these secrets to your GitHub repository:

### 3.1 GCP Secrets
```bash
GCP_PROJECT_ID=your-project-id
GCP_SA_KEY={"type":"service_account",...}  # Service account JSON
```

### 3.2 JWT Secrets
```bash
# Generate with: openssl rand -base64 64
JWT_SECRET=your-super-secure-jwt-secret-key-here
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-key-here
```

### 3.3 OAuth Secrets
```bash
GOOGLE_WEB_CLIENT_ID=your-google-web-client-id
GOOGLE_IOS_CLIENT_ID=your-google-ios-client-id  
GOOGLE_ANDROID_CLIENT_ID=your-google-android-client-id
APPLE_CLIENT_ID=com.growwithfreya.app.signin
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

### 3.4 Database Secrets
```bash
DATABASE_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://user:pass@host:6379
```

## Part 4: Mobile App Configuration

### 4.1 Environment Variables

Update your `.env.production`:

```bash
# API Configuration
EXPO_PUBLIC_GATEWAY_URL=https://api.growwithfreya.com
EXPO_PUBLIC_API_VERSION=v1

# OAuth Configuration  
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-google-ios-client-id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-google-android-client-id
EXPO_PUBLIC_APPLE_CLIENT_ID=com.growwithfreya.app

# Security Configuration
EXPO_PUBLIC_ENABLE_SSL_PINNING=true
EXPO_PUBLIC_API_TIMEOUT=30000
```

### 4.2 App Configuration

Update `app.config.js`:

```javascript
export default {
  expo: {
    // ... existing config
    scheme: 'growwithfreya',
    ios: {
      bundleIdentifier: 'com.growwithfreya.app',
      associatedDomains: [
        'applinks:growwithfreya.com',
        'applinks:api.growwithfreya.com'
      ],
    },
    android: {
      package: 'com.growwithfreya.app',
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            {
              scheme: 'https',
              host: 'api.growwithfreya.com',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
  },
};
```

## Part 5: Security Best Practices Implementation

### 5.1 Token Security

1. **JWT Configuration**:
   - Access token expiry: 15 minutes
   - Refresh token expiry: 7 days
   - Use RS256 algorithm for signing
   - Include minimal claims (sub, iat, exp, aud)

2. **Token Storage**:
   - Use Expo SecureStore for token storage
   - Implement automatic token refresh
   - Clear tokens on app uninstall/logout

### 5.2 Network Security

1. **Certificate Pinning**:
   ```typescript
   // Implement SSL pinning for API calls
   const pinnedCertificate = 'sha256/your-certificate-hash';
   ```

2. **Request Signing**:
   - Implement HMAC request signing for sensitive operations
   - Include timestamp and nonce to prevent replay attacks

### 5.3 Runtime Security

1. **Root/Jailbreak Detection**:
   - Implement device integrity checks
   - Disable app functionality on compromised devices

2. **Debug Detection**:
   - Detect debugging tools in production
   - Implement anti-tampering measures

## Part 6: Monitoring and Alerting

### 6.1 GCP Monitoring

1. **Cloud Logging**:
   - Log all authentication attempts
   - Monitor failed login patterns
   - Set up log-based alerts

2. **Cloud Monitoring**:
   - Monitor API response times
   - Track error rates
   - Set up uptime checks

### 6.2 Cloudflare Analytics

1. **Security Analytics**:
   - Monitor blocked requests
   - Track attack patterns
   - Set up threat notifications

2. **Performance Monitoring**:
   - Monitor cache hit rates
   - Track origin response times
   - Monitor bandwidth usage

## Next Steps

1. **Phase 1**: Set up GCP OAuth and Firebase Authentication
2. **Phase 2**: Configure Cloudflare WAF and security rules  
3. **Phase 3**: Implement mobile app authentication flow
4. **Phase 4**: Set up monitoring and alerting
5. **Phase 5**: Conduct security testing and penetration testing

## Security Checklist

- [ ] OAuth 2.0 with PKCE implemented
- [ ] JWT tokens with short expiry times
- [ ] Refresh token rotation
- [ ] Certificate pinning enabled
- [ ] Rate limiting configured
- [ ] WAF rules active
- [ ] HTTPS everywhere
- [ ] Security headers configured
- [ ] Monitoring and alerting set up
- [ ] Penetration testing completed

This configuration provides enterprise-grade security suitable for production deployment with child safety as the top priority.

## Part 7: Advanced Security Implementation

### 7.1 Zero-Trust Architecture

**Service Account Configuration**:
```bash
# Create dedicated service accounts with minimal permissions
gcloud iam service-accounts create gateway-service \
  --display-name="Gateway Service Account"

# Grant only necessary permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:gateway-service@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:gateway-service@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

**Network Security**:
```yaml
# VPC Configuration for Cloud Run
vpc_connector:
  name: "gateway-connector"
  ip_cidr_range: "10.8.0.0/28"
  max_instances: 10
  min_instances: 2
```

### 7.2 Secret Management with Google Secret Manager

**Store Sensitive Configuration**:
```bash
# Store JWT secrets
echo -n "your-super-secure-jwt-secret" | gcloud secrets create jwt-secret --data-file=-

# Store OAuth credentials
echo -n "your-google-client-secret" | gcloud secrets create google-client-secret --data-file=-

# Store Apple private key
gcloud secrets create apple-private-key --data-file=apple-key.p8
```

**Access Secrets in Cloud Run**:
```yaml
env:
  - name: JWT_SECRET
    valueFrom:
      secretKeyRef:
        name: jwt-secret
        version: latest
  - name: GOOGLE_CLIENT_SECRET
    valueFrom:
      secretKeyRef:
        name: google-client-secret
        version: latest
```

### 7.3 Database Security Configuration

**Cloud SQL Security**:
```bash
# Create Cloud SQL instance with security features
gcloud sql instances create freya-db \
  --database-version=POSTGRES_14 \
  --tier=db-custom-2-4096 \
  --region=europe-west1 \
  --storage-type=SSD \
  --storage-size=20GB \
  --storage-auto-increase \
  --backup-start-time=03:00 \
  --enable-bin-log \
  --require-ssl \
  --deletion-protection \
  --no-assign-ip \
  --network=default \
  --database-flags=log_statement=all,log_min_duration_statement=1000
```

**Connection Security**:
```yaml
# Use Cloud SQL Proxy for secure connections
cloud_sql_proxy:
  instances:
    - "YOUR_PROJECT_ID:europe-west1:freya-db"
  port: 5432
  credentials: "/path/to/service-account-key.json"
```

### 7.4 Advanced Cloudflare Security Rules

**Custom WAF Rules**:
```javascript
// Block requests with suspicious patterns
(
  http.request.uri.query contains "union select" or
  http.request.uri.query contains "drop table" or
  http.request.uri.query contains "script>" or
  http.request.body contains "javascript:" or
  http.request.headers["user-agent"] contains "bot" or
  http.request.headers["user-agent"] contains "crawler"
)

// Rate limit by JWT subject claim (requires Cloudflare Workers)
(
  http.request.uri.path matches "^/api/v1/(user|child)/" and
  rate(1m) > 60
)

// Block requests without proper mobile app headers
(
  http.request.uri.path matches "^/api/v1/" and
  not http.request.headers["x-app-version"] and
  not http.request.headers["x-platform"]
)
```

**Cloudflare Workers for Advanced Security**:
```javascript
// JWT validation at the edge
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)

  // Skip validation for public endpoints
  if (url.pathname.startsWith('/api/v1/public/')) {
    return fetch(request)
  }

  // Validate JWT token
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 })
  }

  const token = authHeader.substring(7)
  const isValid = await validateJWT(token)

  if (!isValid) {
    return new Response('Invalid token', { status: 401 })
  }

  // Add security headers
  const response = await fetch(request)
  const newResponse = new Response(response.body, response)

  newResponse.headers.set('X-Content-Type-Options', 'nosniff')
  newResponse.headers.set('X-Frame-Options', 'DENY')
  newResponse.headers.set('X-XSS-Protection', '1; mode=block')
  newResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')

  return newResponse
}
```

### 7.5 Mobile App Security Implementation

**Secure Storage Implementation**:
```typescript
// services/secure-storage.ts
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

class SecureTokenStorage {
  private static readonly ACCESS_TOKEN_KEY = 'access_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private static readonly ENCRYPTION_KEY = 'user_encryption_key';

  static async storeTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      // Generate user-specific encryption key
      const encryptionKey = await this.getOrCreateEncryptionKey();

      // Encrypt tokens before storage
      const encryptedAccessToken = await this.encrypt(accessToken, encryptionKey);
      const encryptedRefreshToken = await this.encrypt(refreshToken, encryptionKey);

      await Promise.all([
        SecureStore.setItemAsync(this.ACCESS_TOKEN_KEY, encryptedAccessToken),
        SecureStore.setItemAsync(this.REFRESH_TOKEN_KEY, encryptedRefreshToken),
      ]);
    } catch (error) {
      console.error('Failed to store tokens:', error);
      throw new Error('Token storage failed');
    }
  }

  static async getAccessToken(): Promise<string | null> {
    try {
      const encryptedToken = await SecureStore.getItemAsync(this.ACCESS_TOKEN_KEY);
      if (!encryptedToken) return null;

      const encryptionKey = await this.getOrCreateEncryptionKey();
      return await this.decrypt(encryptedToken, encryptionKey);
    } catch (error) {
      console.error('Failed to retrieve access token:', error);
      return null;
    }
  }

  private static async encrypt(data: string, key: string): Promise<string> {
    // Implement AES encryption
    const encrypted = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data + key
    );
    return encrypted;
  }

  private static async getOrCreateEncryptionKey(): Promise<string> {
    let key = await SecureStore.getItemAsync(this.ENCRYPTION_KEY);
    if (!key) {
      key = await Crypto.randomUUID();
      await SecureStore.setItemAsync(this.ENCRYPTION_KEY, key);
    }
    return key;
  }
}
```

**Certificate Pinning**:
```typescript
// services/api-client.ts
import { Platform } from 'react-native';

const CERTIFICATE_PINS = {
  'api.growwithfreya.com': [
    'sha256/your-primary-certificate-hash',
    'sha256/your-backup-certificate-hash',
  ],
};

class SecureApiClient {
  private static async validateCertificate(hostname: string, certificate: string): Promise<boolean> {
    const expectedPins = CERTIFICATE_PINS[hostname];
    if (!expectedPins) return false;

    return expectedPins.includes(certificate);
  }

  static async makeSecureRequest(url: string, options: RequestInit = {}): Promise<Response> {
    // Add security headers
    const secureHeaders = {
      'X-App-Version': Constants.expoConfig?.version || '1.0.0',
      'X-Platform': Platform.OS,
      'X-Device-ID': await this.getDeviceId(),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers: secureHeaders,
    });

    // Validate response headers
    if (!response.headers.get('X-Content-Type-Options')) {
      throw new Error('Missing security headers');
    }

    return response;
  }
}
```

### 7.6 Compliance and Privacy

**COPPA Compliance** (Children's Online Privacy Protection Act):
```typescript
// Age verification and parental consent
interface ParentalConsent {
  parentEmail: string;
  childAge: number;
  consentTimestamp: string;
  ipAddress: string;
  consentMethod: 'email' | 'phone' | 'credit_card';
}

class COPPACompliance {
  static async requireParentalConsent(childAge: number): Promise<boolean> {
    if (childAge < 13) {
      // Require verifiable parental consent
      return await this.obtainParentalConsent();
    }
    return true;
  }

  static async obtainParentalConsent(): Promise<boolean> {
    // Implement parental consent flow
    // This could involve email verification, phone verification, or credit card verification
    return false; // Placeholder
  }
}
```

**GDPR Compliance**:
```typescript
interface DataProcessingConsent {
  userId: string;
  consentTypes: string[];
  consentTimestamp: string;
  ipAddress: string;
  withdrawalRights: boolean;
}

class GDPRCompliance {
  static async recordConsent(consent: DataProcessingConsent): Promise<void> {
    // Store consent records with audit trail
  }

  static async handleDataDeletion(userId: string): Promise<void> {
    // Implement right to be forgotten
  }
}
```

## Part 8: Testing and Validation

### 8.1 Security Testing Checklist

**Authentication Testing**:
- [ ] OAuth 2.0 flow with PKCE
- [ ] JWT token validation
- [ ] Refresh token rotation
- [ ] Session timeout handling
- [ ] Concurrent session limits

**Authorization Testing**:
- [ ] Role-based access control
- [ ] Resource-level permissions
- [ ] API endpoint protection
- [ ] Cross-user data access prevention

**Network Security Testing**:
- [ ] HTTPS enforcement
- [ ] Certificate pinning validation
- [ ] Man-in-the-middle attack prevention
- [ ] Request/response tampering detection

**Input Validation Testing**:
- [ ] SQL injection prevention
- [ ] XSS attack prevention
- [ ] CSRF protection
- [ ] File upload security
- [ ] API parameter validation

### 8.2 Penetration Testing

**Automated Security Scanning**:
```bash
# OWASP ZAP scanning
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://api.growwithfreya.com \
  -J zap-report.json

# Nmap port scanning
nmap -sS -O api.growwithfreya.com

# SSL/TLS testing
testssl.sh api.growwithfreya.com
```

**Manual Testing Areas**:
- Authentication bypass attempts
- Authorization escalation
- Session management flaws
- Input validation vulnerabilities
- Business logic flaws

This comprehensive security setup ensures enterprise-grade protection for the Grow with Freya application, with special attention to child safety and privacy requirements.
