# WireMock Server - Authentication Mappings

Pure WireMock server for mocking external authentication services during functional testing.

## 🚀 Quick Start

### Using Docker Compose (Recommended)

```bash
cd wiremock-server
docker-compose up
```

### Using Shell Script

```bash
cd wiremock-server
./start-wiremock.sh
```

### Using Docker

```bash
cd wiremock-server
docker build -t wiremock-server .
docker run -p 8080:8080 wiremock-server
```

## 🧪 Testing

Run the comprehensive test script to validate all authentication mappings:

```bash
./test-auth-mappings.sh
```

This will test all endpoints used by the functional test suite.

## 📋 Configuration

- **Port**: 8080
- **Admin API**: http://localhost:8080/__admin
- **Health Check**: http://localhost:8080/__admin/health
- **Response Templating**: Enabled for dynamic responses

## 🗂️ Authentication Mappings

The server includes comprehensive mappings for the entire functional test suite:

### Firebase Authentication
- **Token Verification**: `GET /v1/projects/colean-func/accounts:lookup`
  - Google tokens: `Bearer valid-google-*`
  - Apple tokens: `Bearer valid-apple-*`
  - Invalid tokens: `Bearer invalid-*`
- **User Creation**: `POST /v1/projects/colean-func/accounts:signUp`
- **JWKS Keys**: `GET /v1/projects/colean-func/publicKeys`

### Google OAuth
- **User Info**: `GET /oauth2/v2/userinfo`
- **Token Info**: `GET /oauth2/v1/tokeninfo`
- **Token Exchange**: `POST /oauth2/v4/token`

### Apple OAuth
- **Public Keys**: `GET /auth/keys`
- **User Info**: `POST /auth/userinfo`
- **Token Exchange**: `POST /auth/oauth2/v2/token`
- **Token Revocation**: `POST /auth/revoke`

### Gateway Authentication
- **Google OAuth**: `POST /auth/google`
- **Apple OAuth**: `POST /auth/apple`
- **Token Refresh**: `POST /auth/refresh`
- **Token Revocation**: `POST /auth/revoke`

### User Management
- **Get Profile**: `GET /api/users/profile`
- **Update Profile**: `POST /api/users/profile`
- **Get Children**: `GET /api/users/children`
- **Create Child**: `POST /api/users/children`
- **Update Child**: `POST /api/users/children/{id}`
- **Delete Child**: `POST /api/users/children/{id}/delete`
- **Get Preferences**: `GET /api/users/preferences`
- **Update Preferences**: `POST /api/users/preferences`

## 🔑 Token Patterns

The mappings recognize these token patterns:

- **Valid Google**: `valid-google-*`
- **Valid Apple**: `valid-apple-*`
- **Invalid**: `invalid-*`
- **Gateway Access**: `gateway-access-token-*`
- **Gateway Refresh**: `gateway-refresh-token-*`

## 📝 Adding Custom Mappings

Create JSON files in the `mappings/` directory. Example:

```json
{
  "mappings": [
    {
      "id": "my-endpoint",
      "request": {
        "method": "GET",
        "urlPathEqualTo": "/api/test"
      },
      "response": {
        "status": 200,
        "jsonBody": {
          "message": "Hello from WireMock!"
        }
      }
    }
  ]
}
```

## 📁 Static Files

Place static response files in the `__files/` directory and reference them using `bodyFileName` in your mappings.

## 🔄 Response Templating

All mappings support Handlebars templating for dynamic responses:

- `{{randomValue length=10 type='ALPHANUMERIC'}}` - Random values
- `{{now format='yyyy-MM-dd'T'HH:mm:ss.SSS'Z'}}` - Current timestamp
- `{{jsonPath request.body '$.field'}}` - Extract from request body

## 🏥 Health Monitoring

- **Health Check**: `GET /__admin/health`
- **Mappings**: `GET /__admin/mappings`
- **Requests**: `GET /__admin/requests`
- **Reset**: `POST /__admin/reset`

## 📊 Functional Test Coverage

These mappings cover all authentication scenarios from the functional test suite:

### Authentication Feature Tests
- ✅ Successful Google OAuth authentication
- ✅ Successful Apple OAuth authentication
- ✅ Authentication with invalid token
- ✅ User registration with Google OAuth
- ✅ User login creates session
- ✅ Access protected endpoint without authentication
- ✅ Refresh token functionality
- ✅ Logout invalidates session

### User Management Feature Tests
- ✅ Get user profile with valid authentication
- ✅ Update user profile
- ✅ Add child profile
- ✅ Get children list
- ✅ Update child profile
- ✅ Delete child profile
- ✅ Get user preferences
- ✅ Update user preferences
- ✅ Access user data without authentication fails
- ✅ Access another user's data fails

## 🔧 Development

### File Structure
```
wiremock-server/
├── mappings/                           # JSON mapping files
│   ├── firebase-auth.json             # Firebase authentication
│   ├── google-oauth.json              # Google OAuth endpoints
│   ├── apple-oauth.json               # Apple OAuth endpoints
│   ├── gateway-oauth-endpoints.json   # Gateway auth endpoints
│   ├── gateway-auth-endpoints.json    # Gateway user endpoints
│   └── user-management-endpoints.json # User management APIs
├── __files/                           # Static response files
├── Dockerfile                         # Pure WireMock container
├── docker-compose.yml                 # Local deployment
├── start-wiremock.sh                  # Local startup script
├── test-wiremock.sh                   # Basic test script
├── test-auth-mappings.sh              # Comprehensive auth tests
└── README.md                          # This file
```

### Live Updates

When using Docker Compose with volume mounting, you can update mappings without restarting:

1. Edit JSON files in `mappings/`
2. Call `POST /__admin/mappings/reset` to reload
3. Or restart the container: `docker-compose restart`
