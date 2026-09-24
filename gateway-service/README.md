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

Every path below is taken from a controller in `src/main/java/com/app/controller/`. CORS is
configured only in `SecurityConfig`.

## Common headers

Every `/api/**` call that carries a token must also carry the three client headers; a call
without them is refused with `400 GTW-101` (`RequestValidationFilter`). The one exception is
`POST /api/analytics/events`, which sends no device id.

| Header | Required | Value |
|-|-|-|
| `Authorization` | on `/api/**` | `Bearer <access token>` |
| `X-Client-Platform` | on `/api/**` | `ios`, `android` or `web` |
| `X-Client-Version` | on `/api/**` | semantic version, e.g. `1.4.0` |
| `X-Device-ID` | on `/api/**` (not analytics) | the app's device id |
| `Content-Type` | with a body | `application/json` |

---

## Sign-in — `/auth/**` (no token)

| Method and path | Body | Answer |
|-|-|-|
| `GET /auth/status` | — | `{ status: "available", service: "auth" }` |
| `POST /auth/google` | `{ idToken, clientId?, nonce?, deviceInfo?, userInfo? }` | `AuthResponse` |
| `POST /auth/apple` | `{ idToken, authorizationCode?, clientId?, nonce?, deviceInfo?, userInfo? }` | `AuthResponse` |
| `POST /auth/firebase` | Firebase ID token (test and emulator builds) | `AuthResponse` |
| `POST /auth/refresh` | `{ refreshToken }` | `{ success, tokens }` |
| `POST /auth/revoke` | `{ refreshToken }` | `{ success, message }` |

`AuthResponse` is `{ success, message, user: { id, provider, providerId, createdAt, updatedAt },
tokens: { accessToken, refreshToken, expiresAt, tokenType, scope } }`.

---

## The family's data — `/api/**`

### Child document (Phase C)

| Method and path | Answer |
|-|-|
| `GET /api/children` | `{ children: [ChildDocument] }`. With none saved yet, one unsaved child seeded from the older profile. |
| `GET /api/children/{childId}` | `ChildDocument`, or `404` |
| `PUT /api/children/{childId}` | Body: `ChildDocument` with the `version` last read. `200` with the saved document (version + 1); `409 GTW-414` with `details.current` when another device wrote first; `409 GTW-415` past 10 children. |

`ChildDocument` (`dto/ChildDocument.java`): `childId, version, nickname, avatarType, avatarId,
ageBucket (0-2 | 2-4 | 4-6), language, textSizeScale, favorites { stories, activities, songs },
storyProgress { storyId: { pageIndex, totalPages, finishedCount } }, finishedStoryIds,
challengeCounts, achievements, settings { screenTimeEnabled, smartRemindersEnabled,
customReminders[] }`. No server times are returned. The app's merge rules are in
`grow-with-freya/services/child-document.ts`.

### Consent, export and deletion

| Method and path | Answer |
|-|-|
| `POST /api/consents` | Body `{ policyVersion, scope: core, acceptedAt?, appVersion? }` → `201` |
| `GET /api/account/export` | Account, older profile, children, consents, subscription, `downloadedStories` |
| `DELETE /api/account` | Deletes profile, children, consents, downloads, sessions and the user, first copying each consent to `consent_log` (policy version, times, a SHA-256 of the sign-in identity; removed after 3 years by Firestore TTL, `CONSENT_LOG_RETENTION_DAYS`); stops before the user is deleted if any step fails (`500 GTW-412`); `409 GTW-413` while a deletion is running |

### Profile (deprecated)

`GET`, `POST`, `DELETE /api/profile` (`ProfileController`) remain only until the build that uses
the child document is on TestFlight (PHASE-8 C2); the current app no longer calls them.

---

## Stories — `/api/stories/**`

| Method and path | Answer |
|-|-|
| `GET /api/stories` | Available stories |
| `GET /api/stories/{storyId}` | One story |
| `GET /api/stories/category/{category}` | Stories in a category |
| `GET /api/stories/version` | `{ id, version, assetVersion, lastUpdated, storyChecksums, totalStories }` |
| `POST /api/stories/delta` | See below |
| `GET /api/stories/{storyId}/download` | The full story, and the device is recorded as holding it. With `ENTITLEMENTS_ENFORCE=true`: `403 GTW-416` for a paid story without a subscription, `403 GTW-417` past the plan's limit (free 2, basic 50, premium 125 stories). `404` unknown, `403 GTW-100` withdrawn. |
| `DELETE /api/stories/{storyId}/download` | The device no longer holds the story → `204` |

**Delta sync.** Body: `{ clientVersion, storyChecksums: { id: checksum }, achievementChecksums: { id: checksum } }`
(each at most 500 entries). Answer: `{ serverVersion, assetVersion, stories, deletedStoryIds,
storyChecksums, totalStories, updatedCount, lastUpdated, catalog, achievementDefinitions,
deletedAchievementIds }`. Stories are sent only when the client is behind; the catalogue (with
signed thumbnails) and changed badge definitions are sent on every call. Story checksums are the
shared canonical-JSON SHA-256 (`StoryChecksums`, `scripts/lib/story-checksum.js`).

## Assets — `/api/assets/**`

| Method and path | Answer |
|-|-|
| `GET /api/assets/version` | Asset version and checksums |
| `POST /api/assets/batch-urls` | Body `{ paths: [...] }` (at most 100) → `{ urls: [{ path, signedUrl, expiresAt }], failed }` |

## Analytics

`POST /api/analytics/events` — `{ sessionId, platform, appVersion, locale, events: [{ event,
properties }] }`. Turned into anonymous counters; nothing is stored per user.

---

## RevenueCat webhook — `POST /webhooks/revenuecat`

Authenticated by `Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>` (the `Bearer ` prefix is
optional), not by a user token. `503` until the secret is set; `401` with the wrong secret; `500`
when the entitlement cannot be stored, so RevenueCat retries. Answers `{ outcome: APPLIED |
IGNORED | NO_ACCOUNT }`. Writes `users/{uid}.entitlement` (`EntitlementService`).

## Configuration

| Variable | Effect |
|-|-|
| `REVENUECAT_WEBHOOK_SECRET` | Turns the webhook on |
| `REVENUECAT_ACCEPT_SANDBOX` | `true` (default) while the app is TestFlight-only |
| `ENTITLEMENTS_ENFORCE` | `false` (default): `/download` only logs what it would refuse |

---

## Private and monitoring

`/private/**`, `/actuator/**` and `/health/**` are open in `test`/`dev` profiles and denied in
production (`SecurityConfig`). `/private/**` holds the test-support endpoints used by the
functional tests (`/private/reset`, `/private/seed/story`, `/private/rebuild-content-version`, …).

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
| `GTW-402` | 500 | Failed to update profile |
| `GTW-411` | 404 | User profile not found |
| `GTW-412` | 500 | Account deletion failed |
| `GTW-413` | 409 | Account deletion already in progress |
| `GTW-414` | 409 | The child has changed on another device |
| `GTW-415` | 409 | No more children can be added |
| `GTW-416` | 403 | This story needs a subscription |
| `GTW-417` | 403 | The plan's story limit is reached |

### System Errors (GTW-500 to GTW-599)
| Code | HTTP | Description |
|------|------|-------------|
| `GTW-500` | 500 | Internal server error |
| `GTW-501` | 500 | Database operation failed |
| `GTW-503` | 503 | Service temporarily unavailable |
| `GTW-504` | 504 | Request timeout |
| `GTW-506` | 503 | System is in maintenance mode |