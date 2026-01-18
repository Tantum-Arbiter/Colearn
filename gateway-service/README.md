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
  "errorCode": "ERROR_CODE",
  "error": "Human readable error",
  "message": "Detailed message",
  "path": "/api/endpoint",
  "timestamp": "2026-01-18T12:30:00Z",
  "requestId": "uuid"
}
```

**Common Error Codes:**
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `MISSING_REQUIRED_FIELD` | 400/500 | Required field not provided |
| `INVALID_TOKEN` | 401 | Token is invalid or expired |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Access denied |
| `NOT_FOUND` | 404 | Resource not found |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |