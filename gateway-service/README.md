# Gateway Service

This application is a monolithic service that serves as a gateway to various backend services. It is built using Spring Boot and is designed to handle HTTP requests, route them to the appropriate backend services, and return the responses to the clients.

It handles:
- User authentication and authorization
- Request routing to backend services / CMS
- Response aggregation and formatting
- Error handling and logging
- Rate limiting and throttling

# Local Development

### Reaching GCP via Postman requires a bearer token
Run:
```
gcloud auth print-identity-token \
  --audiences=https://gateway-service-jludng4t5a-ew.a.run.app \
  --impersonate-service-account=svc-deploy-functional@apt-icon-472307-b7.iam.gserviceaccount.com
```

---

# APIs

## Common Headers

All authenticated endpoints require:
| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Bearer token: `Bearer <access_token>` |
| `Content-Type` | Yes (POST/PUT) | `application/json` |
| `Accept` | Optional | `application/json` |

---

## Private APIs (Internal/Monitoring)

### `GET /private/healthcheck`
Health check endpoint to verify the service is running.

**Response:** `200 OK`
```json
{ "status": "UP" }
```

### `GET /private/info`
Returns service configuration and version info.

### `GET /private/prometheus`
Prometheus metrics endpoint for scraping.

---

## Authentication APIs

### `GET /auth/status`
Auth service status check (no auth required).

**Response:** `200 OK`
```json
{ "status": "available", "service": "auth" }
```

---

### `POST /auth/google`
Google OAuth authentication.

**Headers:**
| Header | Required | Value |
|--------|----------|-------|
| `Content-Type` | Yes | `application/json` |

**Request Body:**
```json
{
  "idToken": "string",       // Required: Google OAuth ID token
  "clientId": "string",      // Optional: Google client ID
  "nonce": "string",         // Optional: Nonce for replay protection
  "deviceInfo": {            // Optional
    "deviceId": "string",
    "platform": "ios|android",
    "osVersion": "string",
    "appVersion": "string"
  },
  "userInfo": {              // Optional: Pre-extracted user info
    "email": "string",
    "name": "string",
    "picture": "string"
  }
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "expiresIn": 3600,
  "tokenType": "Bearer",
  "user": {
    "id": "string",
    "email": "string",
    "name": "string",
    "picture": "string"
  }
}
```

---

### `POST /auth/apple`
Apple OAuth authentication.

**Request Body:** Same structure as `/auth/google`

**Response:** Same structure as `/auth/google`

---

### `POST /auth/firebase`
Firebase authentication (test/gcp-dev only).

**Request Body:**
```json
{
  "idToken": "string"   // Required: Firebase ID token
}
```

**Response:** Same structure as `/auth/google`

---

### `POST /auth/refresh`
Refresh access token.

**Request Body:**
```json
{
  "refreshToken": "string"  // Required: Valid refresh token
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "expiresIn": 3600,
  "tokenType": "Bearer"
}
```

---

### `POST /auth/revoke`
Revoke refresh token (logout).

**Request Body:**
```json
{
  "refreshToken": "string"  // Required: Refresh token to revoke
}
```

**Response:** `200 OK`
```json
{ "success": true }
```

---

## Story/CMS APIs

### `GET /api/stories`
Get all available stories.

**Headers:** Authorization required

**Response:** `200 OK`
```json
[
  {
    "id": "story-id",
    "title": "Story Title",
    "category": "adventure",
    "premium": false,
    "coverImage": "https://...",
    "pages": [
      {
        "pageNumber": 1,
        "backgroundImage": "https://...",
        "text": { "en": "Once upon a time..." }
      }
    ]
  }
]
```

---

### `GET /api/stories/{storyId}`
Get a specific story by ID.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `storyId` | string | Story ID |

**Response:** `200 OK` - Single story object (see above)

**Response:** `404 Not Found` - Story not found

---

### `GET /api/stories/category/{category}`
Get stories by category.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Category name (e.g., `adventure`, `animals`) |

**Response:** `200 OK` - Array of story objects

---

### `GET /api/stories/version`
Get current content version for delta sync.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `clientVersion` | integer | No | Client's current version. If matches server, sync is skipped. |

**Response:** `200 OK`
```json
{
  "id": "current",
  "version": 4,
  "totalStories": 13,
  "lastUpdated": "2026-01-18T12:30:00Z",
  "storyChecksums": {
    "story-1": "abc123...",
    "story-2": "def456..."
  }
}
```

---

### `POST /api/stories/sync`
Delta sync - get only stories that have changed.

**Headers:**
| Header | Required | Value |
|--------|----------|-------|
| `Authorization` | Yes | `Bearer <token>` |
| `Content-Type` | Yes | `application/json` |

**Request Body:**
```json
{
  "clientVersion": 3,                    // Required: Client's current version
  "lastSyncTimestamp": 1705582800000,    // Required: Last sync time (epoch ms)
  "storyChecksums": {                    // Required: Client's story checksums
    "story-1": "abc123...",
    "story-2": "def456..."
  }
}
```

**Response:** `200 OK`
```json
{
  "serverVersion": 4,
  "totalStories": 13,
  "updatedStories": 1,
  "lastUpdated": 1705583400000,
  "storyChecksums": {
    "story-1": "abc123...",
    "story-2": "xyz789..."  // Changed checksum
  },
  "stories": [
    {
      "id": "story-2",
      "title": "Updated Story",
      "pages": [...]
    }
  ]
}
```

**Response:** `500 Internal Server Error` (missing required fields)
```json
{
  "success": false,
  "errorCode": "MISSING_REQUIRED_FIELD",
  "error": "Missing required field",
  "message": "Missing required fields: clientVersion, storyChecksums, or lastSyncTimestamp",
  "path": "/api/stories/sync",
  "timestamp": "2026-01-18T12:30:00Z",
  "requestId": "uuid"
}
```

---

## Error Response Format

All error responses follow this structure:
```json
{
  "success": false,
  "errorCode": "GTW-XXX",
  "error": "Short error type",
  "message": "Detailed human-readable message",
  "path": "/api/endpoint",
  "timestamp": "2026-01-18T12:30:00.000Z",
  "requestId": "uuid",
  "details": { "field": "value" }
}
```

## Error Codes Reference

Error codes follow the format `GTW-XXX` where the number range indicates the category:

### Authentication & Authorization (GTW-001 to GTW-099)
| Code | HTTP | Description |
|------|------|-------------|
| `GTW-001` | 401 | Authentication failed |
| `GTW-002` | 401 | Invalid or expired token |
| `GTW-003` | 401 | Invalid Google ID token |
| `GTW-004` | 401 | Invalid Apple ID token |
| `GTW-005` | 401 | Token has expired |
| `GTW-006` | 401 | Invalid or expired refresh token |
| `GTW-007` | 401 | Unauthorized access to resource |
| `GTW-008` | 401 | Insufficient permissions |

### Validation & Request Errors (GTW-100 to GTW-199)
| Code | HTTP | Description |
|------|------|-------------|
| `GTW-100` | 400 | Invalid request format |
| `GTW-101` | 400 | Required field is missing |
| `GTW-102` | 400 | Request body is invalid |
| `GTW-103` | 400 | Invalid parameter value |
| `GTW-105` | 415 | Unsupported media type |
| `GTW-106` | 400 | Malformed JSON in request body |
| `GTW-109` | 400 | Field validation failed |
| `GTW-113` | 400 | Invalid nickname |
| `GTW-114` | 400 | Invalid avatar type |

### Downstream Service Errors (GTW-200 to GTW-299)
| Code | HTTP | Description |
|------|------|-------------|
| `GTW-200` | 502 | Downstream service error |
| `GTW-201` | 502 | Firebase service unavailable |
| `GTW-204` | 504 | Downstream service timeout |
| `GTW-209` | 503 | Circuit breaker is open |

### Rate Limiting & Security (GTW-300 to GTW-399)
| Code | HTTP | Description |
|------|------|-------------|
| `GTW-300` | 429 | Rate limit exceeded |
| `GTW-301` | 429 | Too many requests |

### User Management Errors (GTW-400 to GTW-499)
| Code | HTTP | Description |
|------|------|-------------|
| `GTW-400` | 404 | User not found |
| `GTW-402` | 409 | Failed to update profile |
| `GTW-411` | 404 | User profile not found |

### System Errors (GTW-500 to GTW-599)
| Code | HTTP | Description |
|------|------|-------------|
| `GTW-500` | 500 | Internal server error |
| `GTW-501` | 500 | Database operation failed |
| `GTW-503` | 503 | Service temporarily unavailable |
| `GTW-504` | 504 | Request timeout |
| `GTW-506` | 503 | System is in maintenance mode |