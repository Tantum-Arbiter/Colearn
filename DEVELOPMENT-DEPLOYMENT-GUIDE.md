#  **Development Environment Deployment Guide**
## End-to-End Integration Testing (No Production Deployment Yet)

---

##  **What's New in This Guide**

This guide has been updated to reflect:
-  **Current API state** - All authentication, profile, and metrics endpoints documented
-  **Prometheus metrics** - Complete list of metrics being collected (ready for Grafana/GCP)
-  **Firestore collections** - Detailed schema for users, sessions, profiles, analytics
-  **No Cloud Storage for stories** - Stories bundled in app or downloaded as in-app purchases
-  **Monitoring options** - GCP Cloud Monitoring (recommended) vs Prometheus+Grafana (advanced)
-  **Mobile app analytics** - Future enhancement plan for tracking user events

**Key Architecture Decision:**
- Stories are **NOT** stored in Cloud Storage
- Stories are **bundled in the app** (free) or **downloaded as in-app purchases** (premium)
- Cloud Storage is **only used for Firestore backups**
- This saves costs and provides offline-first experience

---

##  **Table of Contents**

### **Part A: Development Deployment (Do This Now)**
0. [Current State: APIs & Architecture](#0-current-state-apis--architecture)
1. [Development Deployment Overview](#1-development-deployment-overview)
2. [GCP Development Project Setup](#2-gcp-development-project-setup)
3. [Firebase/Firestore Development Setup](#3-firebasefirestore-development-setup)
4. [Development Backup Strategy](#4-development-backup-strategy)
5. [Deploy Gateway to Cloud Run (Dev)](#5-deploy-gateway-to-cloud-run-dev)
6. [Deploy Firestore Rules & Indexes (Dev)](#6-deploy-firestore-rules--indexes-dev)
7. [CMS Setup for Development](#7-cms-setup-for-development)
8. [Mobile App Development Builds](#8-mobile-app-development-builds)
9. [End-to-End Testing](#9-end-to-end-testing)
10. [Development Monitoring & Analytics](#10-development-monitoring--analytics)

### **Part B: Production Deployment (Future - When Ready for Shopify/App Store)**
11. [Production Deployment Plan](#11-production-deployment-plan)

---

# **PART A: DEVELOPMENT DEPLOYMENT (DO THIS NOW)**

---

## **0. Current State: APIs & Architecture**

### **0.1 Current Backend APIs (Gateway Service)**

Your Spring Boot gateway service currently exposes the following REST APIs:

#### **Authentication APIs** (`/auth/*`)
| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/auth/google` | POST | Google OAuth authentication | No |
| `/auth/apple` | POST | Apple OAuth authentication | No |
| `/auth/refresh` | POST | Refresh access token using refresh token | No |
| `/auth/revoke` | POST | Revoke refresh token (logout) | No |

**What they do:**
- Accept OAuth ID tokens from Google/Apple
- Validate tokens with OAuth providers (RSA256 public key verification)
- Create/update user in Firestore `users` collection
- Create session in Firestore `user_sessions` collection
- Return JWT access token (15 min) + refresh token (7 days)

**Security Features:**
-  **OAuth Token Validation** - RSA256 public key verification for Google/Apple ID tokens
-  **JWKS Fetching** - Automatic public key rotation from Google/Apple
-  **Issuer Validation** - Verifies tokens are from trusted OAuth providers
-  **Audience Validation** - Ensures tokens are for your app's client ID
-  **Refresh Token Hashing** - SHA-256 + BCrypt (cost factor 12) before storage
-  **Short-lived Access Tokens** - 15 min production, 1 hour dev
-  **Token Rotation** - New refresh token on each refresh
-  **Session Limits** - Max 5 sessions per user
-  **Automatic Cleanup** - Expired sessions removed automatically

#### **User Profile APIs** (`/api/profile`)
| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/profile` | GET | Get user profile (nickname, avatar, settings) | Yes |
| `/api/profile` | POST | Create/update user profile | Yes |

**What they do:**
- Store non-PII data in Firestore `user_profiles` collection
- Sync nickname, avatar, notifications, schedule across devices
- Validate profile data (nickname 1-20 chars, avatarType: boy/girl)

#### **Metrics & Monitoring APIs** (`/actuator/*`)
| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/actuator/health` | GET | Health check (Spring Boot Actuator) | No |
| `/actuator/prometheus` | GET | Prometheus metrics scrape endpoint | No |
| `/actuator/custom/metrics` | GET | Custom application metrics summary | No |
| `/actuator/custom/devices` | GET | Device/platform statistics | No |
| `/actuator/custom/requests` | GET | Request statistics | No |
| `/actuator/custom/health` | GET | Custom health check with metrics | No |

**What they do:**
- Expose Prometheus-formatted metrics for scraping
- Track device types, platforms, app versions
- Track authentication success/failure rates
- Track request counts, response times, error rates
- Track active sessions, connections

#### **Private APIs** (`/private/*`)
| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/private/healthcheck` | GET | Simple health check | No |
| `/private/info` | GET | API documentation | No |
| `/private/prometheus` | GET | Prometheus metrics (alternative endpoint) | No |
| `/private/metrics` | GET | List of available metric names | No |

**What they do:**
- Provide internal endpoints for monitoring/debugging
- Not exposed to public internet (Cloud Run internal only)

### **0.2 Current Prometheus Metrics Being Collected**

Your gateway service uses **Micrometer** with **Prometheus** registry to collect:

#### **Application Metrics**
```
# Request metrics (tagged by device_type, platform, app_version, endpoint, method, status_code)
app_requests_total{device_type="mobile",platform="ios",app_version="1.0.0",endpoint="/api/profile",method="GET",status_code="200"}
app_response_time{device_type="mobile",platform="ios",app_version="1.0.0",endpoint="/api/profile",method="GET",status_code="200"}

# Authentication metrics (tagged by provider, device_type, platform, app_version, result)
app_authentication_total{provider="google",device_type="mobile",platform="ios",app_version="1.0.0",result="success"}
app_authentication_time{provider="google",device_type="mobile",platform="ios",app_version="1.0.0",result="success"}

# Error metrics (tagged by device_type, platform, endpoint, error_type, error_code)
app_errors_total{device_type="mobile",platform="ios",endpoint="/api/profile",error_type="ValidationException",error_code="MISSING_FIELD"}

# User metrics (tagged by provider, user_type, lookup_type, result)
app_users_created{provider="google"}
app_users_logins{provider="google",user_type="new"}
app_users_lookups{lookup_type="by_email",result="found"}
app_users_preferences_updates{user_id="..."}

# Session metrics (tagged by device_type, platform, reason)
app_sessions_created{device_type="mobile",platform="ios"}
app_sessions_accessed{device_type="mobile",platform="ios"}
app_sessions_revoked{device_type="mobile",platform="ios",reason="user_logout"}

# Active gauges
app_active_sessions
app_active_connections
```

#### **Spring Boot Actuator Metrics**
```
# HTTP server metrics
http_server_requests{method="GET",uri="/api/profile",status="200"}

# JVM metrics
jvm_memory_used_bytes
jvm_memory_max_bytes
jvm_gc_pause_seconds
jvm_threads_live

# System metrics
system_cpu_usage
system_load_average_1m
process_uptime_seconds
```

### **0.3 Current Firestore Collections**

#### **Collection: `users`** (PII data - managed by authentication)
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "initials": "JD",
  "provider": "google",
  "providerId": "google-oauth-id",
  "isActive": true,
  "isEmailVerified": true,
  "lastLoginAt": "2025-01-24T10:00:00Z",
  "createdAt": "2025-01-20T10:00:00Z",
  "updatedAt": "2025-01-24T10:00:00Z",
  "preferences": {},
  "children": [],
  "metadata": {}
}
```

**Indexes:**
- `provider + providerId` (composite) - OAuth lookup
- `isActive + createdAt` (composite) - Active users query
- `email` (single) - Email lookup

#### **Collection: `user_sessions`** (Session tracking)
```json
{
  "id": "session-uuid",
  "userId": "user-uuid",
  "refreshToken": "$2a$12$abc123...",
  "deviceId": "device-uuid",
  "deviceType": "mobile",
  "platform": "ios",
  "appVersion": "1.0.0",
  "isActive": true,
  "createdAt": "2025-01-24T10:00:00Z",
  "lastAccessedAt": "2025-01-24T10:30:00Z",
  "expiresAt": "2025-01-31T10:00:00Z",
  "revokedAt": null,
  "metadata": {}
}
```

**Security: Refresh Token Hashing**
-  **Refresh tokens are hashed** using SHA-256 + BCrypt (cost factor 12) before storage
-  **Compliance-ready** - Meets SOC 2, ISO 27001, PCI-DSS requirements
-  **Defense-in-depth** - Even if database is compromised, tokens cannot be used
-  **BCrypt cost factor 12** - 2^12 = 4096 rounds (~250ms per hash/validation)
-  **SHA-256 pre-hashing** - Required because JWT tokens exceed BCrypt's 72-byte limit
-  **Cannot query by token** - Must fetch all active sessions and validate hashes in-memory
-  **Performance impact** - Acceptable because max 5 sessions per user, infrequent refresh

**Indexes:**
- `userId + isActive` (composite) - User session lookup
- `isActive + expiresAt` (composite) - Active session cleanup
- `userId + isActive` (composite) - User's active sessions
- `isActive + expiresAt` (composite) - Expiring sessions cleanup

#### **Collection: `user_profiles`** (Non-PII preferences - synced across devices)
```json
{
  "userId": "user-uuid",
  "nickname": "Freya",
  "avatarType": "girl",
  "avatarId": "girl_1",
  "notifications": {
    "enabled": true,
    "storyReminders": true,
    "emotionCheckIns": true,
    "bedtimeReminders": true,
    "soundEnabled": true,
    "vibrationEnabled": false
  },
  "schedule": {
    "storyTime": {
      "enabled": true,
      "time": "19:00",
      "days": [1, 2, 3, 4, 5]
    },
    "bedtime": {
      "enabled": true,
      "time": "20:00",
      "days": [0, 1, 2, 3, 4, 5, 6]
    },
    "emotionCheckIns": [
      {
        "time": "12:00",
        "days": [1, 2, 3, 4, 5],
        "label": "Lunch time check-in"
      }
    ]
  },
  "createdAt": "2025-01-24T10:00:00Z",
  "updatedAt": "2025-01-24T10:30:00Z",
  "version": 1
}
```

**Indexes:**
- `userId` (single) - Profile lookup

#### **Collection: `analytics`** (Future - not yet implemented)
```json
{
  "userId": "user-uuid",
  "event": "story_completed",
  "storyId": "story-001",
  "duration": 180,
  "timestamp": "2025-01-24T10:00:00Z",
  "deviceType": "mobile",
  "platform": "ios",
  "appVersion": "1.0.0"
}
```

**Note:** Currently, analytics are **NOT** being stored in Firestore. All metrics are collected via Prometheus from HTTP request headers.

### **0.4 Mobile App Analytics (Current State)**

The mobile app currently tracks:
- **Screen time** (local only, not sent to backend)
  - Activity type: story, emotions, music
  - Duration tracking
  - Age-appropriate limits (18-24 months: 30 min, 2-6 years: 60 min, 6+ years: 120 min)
  - Stored in AsyncStorage (device-local)

- **Device metadata** (sent with every API request via headers)
  - `X-Client-Platform`: ios/android
  - `X-Client-Version`: 1.0.0
  - `X-Device-ID`: device-uuid (TODO: not yet implemented)
  - `User-Agent`: GrowWithFreya/1.0.0 (iOS/Android)

**What's NOT being tracked:**
-  Story views/completions
-  Emotion game interactions
-  Music playback
-  App crashes
-  Performance metrics
-  User behavior analytics

### **0.5 Architecture Overview**

Based on your clarification that **stories are bundled in the app** and **storybook packs are downloaded from iOS/Android stores** (not Cloud Storage), here's the updated architecture:

#### **Development Environment Architecture (Single Region)**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT ENVIRONMENT                          │
│                    Region: europe-west2 (London)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐                                              │
│  │   iOS Test       │                                              │
│  │   Device         │──────┐                                       │
│  │  (TestFlight)    │      │                                       │
│  │                  │      │                                       │
│  │  Stories:        │      │                                       │
│  │  • Bundled       │      │                                       │
│  │  • In-App        │      │                                       │
│  │  • Free          │      │                                       │
│  └──────────────────┘      │                                       │
│                            │                                       │
│  ┌──────────────────┐      │    ┌──────────────────────────────┐  │
│  │  Android Test    │      │    │   Cloud Run Gateway          │  │
│  │  Device          │──────┼───▶│   (Development)              │  │
│  │  (Internal)      │      │    │                              │  │
│  │                  │      │    │  - OAuth (Google/Apple)      │  │
│  │  Stories:        │      │    │  - JWT Auth                  │  │
│  │  • Bundled       │      │    │  - Rate Limiting             │  │
│  │  • In-App        │      │    │  - User Management           │  │
│  │  • Free          │      │    │  - Profile Sync              │  │
│  └──────────────────┘      │    │  - Prometheus Metrics        │  │
│                            │    │                              │  │
│                            │    │  Min: 0 instances            │  │
│                            │    │  Max: 10 instances           │  │
│                            │    │  CPU: 1 vCPU                 │  │
│                            │    │  Memory: 1 GiB               │  │
│                            │    └──────────┬───────────────────┘  │
│                            │               │                      │
│                            │               │                      │
│                            │    ┌──────────▼───────────────────┐  │
│                            │    │   Firestore (Native Mode)    │  │
│                            │    │   Region: europe-west2       │  │
│                            │    │                              │  │
│                            │    │  Collections:                │  │
│                            │    │  - users (PII)               │  │
│                            │    │  - user_sessions             │  │
│                            │    │  - user_profiles             │  │
│                            │    │  - analytics (future)        │  │
│                            │    └──────────────────────────────┘  │
│                            │                                       │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │         Cloud Storage (Backups Only)                         │ │
│  │         Bucket: grow-with-freya-dev-backups                  │ │
│  │         Region: europe-west2                                 │ │
│  │                                                               │ │
│  │  - Firestore exports (weekly)                                │ │
│  │  - Lifecycle: Delete after 30 days                           │ │
│  │  - NO story images/audio/assets                              │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │         Monitoring: GCP Cloud Monitoring                     │ │
│  │                                                               │ │
│  │  - Auto-ingests Prometheus metrics from Cloud Run            │ │
│  │  - Pre-built dashboards                                      │ │
│  │  - Alerting (email/SMS)                                      │ │
│  │  - Log aggregation                                           │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### **Production Environment Architecture (Multi-Region)**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PRODUCTION ENVIRONMENT                           │
│                    Multi-Region: Global                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐                                              │
│  │   iOS App        │                                              │
│  │   (App Store)    │──────┐                                       │
│  │                  │      │                                       │
│  │  Stories:        │      │                                       │
│  │  • Bundled       │      │                                       │
│  │  • In-App        │      │    ┌──────────────────────────────┐  │
│  │  • Premium       │      │    │   Cloud Load Balancer        │  │
│  └──────────────────┘      │    │   (Global HTTPS)             │  │
│                            │    │                              │  │
│  ┌──────────────────┐      │    │  - SSL Termination           │  │
│  │  Android App     │      │    │  - DDoS Protection           │  │
│  │  (Play Store)    │──────┼───▶│  - CDN (optional)            │  │
│  │                  │      │    │  - Custom Domain             │  │
│  │  Stories:        │      │    └──────────┬───────────────────┘  │
│  │  • Bundled       │      │               │                      │
│  │  • In-App        │      │               │                      │
│  │  • Premium       │      │               ▼                      │
│  └──────────────────┘      │    ┌──────────────────────────────┐  │
│                            │    │   Cloud Run (Multi-Region)   │  │
│                            │    │                              │  │
│                            │    │  Region 1: europe-west2      │  │
│                            │    │  - Min: 1 instance           │  │
│                            │    │  - Max: 100 instances        │  │
│                            │    │  - CPU: 2 vCPU               │  │
│                            │    │  - Memory: 2 GiB             │  │
│                            │    │                              │  │
│                            │    │  Region 2: us-central1       │  │
│                            │    │  - Min: 1 instance           │  │
│                            │    │  - Max: 100 instances        │  │
│                            │    │  - CPU: 2 vCPU               │  │
│                            │    │  - Memory: 2 GiB             │  │
│                            │    └──────────┬───────────────────┘  │
│                            │               │                      │
│                            │               │                      │
│                            │    ┌──────────▼───────────────────┐  │
│                            │    │   Firestore (Multi-Region)   │  │
│                            │    │   Location: eur3 (Europe)    │  │
│                            │    │                              │  │
│                            │    │  Collections:                │  │
│                            │    │  - users (PII)               │  │
│                            │    │  - user_sessions             │  │
│                            │    │  - user_profiles             │  │
│                            │    │  - analytics                 │  │
│                            │    │  - entitlements (Shopify)    │  │
│                            │    └──────────────────────────────┘  │
│                            │                                       │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │         Cloud Storage (Backups Only)                         │ │
│  │         Bucket: grow-with-freya-prod-backups                 │ │
│  │         Multi-Region: EU                                     │ │
│  │                                                               │ │
│  │  - Firestore exports (daily)                                 │ │
│  │  - Lifecycle: Archive after 90 days, delete after 365 days   │ │
│  │  - Versioning enabled                                        │ │
│  │  - NO story images/audio/assets                              │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │         Monitoring & Alerting                                │ │
│  │                                                               │ │
│  │  - GCP Cloud Monitoring (Prometheus metrics)                 │ │
│  │  - Uptime checks (every 1 min)                               │ │
│  │  - Error rate alerts                                         │ │
│  │  - Latency alerts (p95 > 500ms)                              │ │
│  │  - PagerDuty integration                                     │ │
│  │  - Log-based metrics                                         │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │         External Integrations                                │ │
│  │                                                               │ │
│  │  - Shopify (payment processing)                              │ │
│  │  - SendGrid (transactional email)                            │ │
│  │  - Twilio (SMS notifications - optional)                     │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Architecture Points:**
- **No Cloud Storage for stories** - All story content bundled in app or downloaded as in-app purchases from iOS/Android stores
- **Cloud Storage only for backups** - Firestore exports stored in GCS
- **Prometheus metrics ready** - Gateway already exposes `/actuator/prometheus` endpoint
- **Auto-scaling** - Cloud Run scales based on traffic (0 instances in dev, min 1 in prod)
- **Multi-region production** - Deployed to multiple regions for low latency and high availability

### **0.6 Story Distribution Strategy**

Since stories are **NOT** stored in Cloud Storage, here's how content is distributed:

#### **Free Stories (Bundled in App)**
- Included in app bundle (iOS .ipa / Android .apk)
- Images, audio, JSON metadata all bundled
- No network requests needed
- Always available offline
- Updated with app updates

#### **Premium Stories (In-App Purchases)**
- Purchased through iOS App Store / Google Play Store
- Downloaded as "storybook packs" (similar to DLC)
- Stored locally on device after purchase
- Managed by iOS/Android platform
- No backend storage needed

#### **Future: Shopify Integration (Production Only)**
- Shopify handles payment processing
- Webhook notifies gateway of purchase
- Gateway updates user entitlements in Firestore
- App checks entitlements, unlocks content
- Content still delivered via iOS/Android stores

**Benefits of this approach:**
-  No Cloud Storage costs for story assets
-  Faster story loading (local files)
-  Offline-first experience
-  Platform-native purchase flow
-  Apple/Google handle content delivery

---

## **1. Development Deployment Overview**

### **1.1 What You're Building**

```

                    DEVELOPMENT ENVIRONMENT                   

                                                              
                
     iOS Test      Cloud Run Gateway           
      Device               (Development Instance)       
    (TestFlight)                                        
                           - OAuth (Google/Apple)       
    Stories:               - JWT Auth                   
    • Bundled              - Rate Limiting              
    • In-App               - User Management            
    • Free                 - Profile Sync               
             - Prometheus Metrics         
                                
                                            
    Android Test                      
      Device                                              
   (Internal)                                             
                              
    Stories:                Firestore (Dev)             
    • Bundled                                           
    • In-App               - users (PII)                
    • Free                 - user_sessions              
             - user_profiles              
                             - analytics (future)         
                                
                                                              
    
           Cloud Storage (Dev)                            
    - Firestore backups ONLY (weekly)                     
    - NO story images/audio/assets                        
    
                                                              

```

**Note:** Stories are **bundled in the app** or downloaded as **in-app purchases** from iOS/Android stores. No Cloud Storage needed for story content.

### **1.2 Key Differences from Production**

| Aspect | Development | Production (Future) |
|--------|-------------|---------------------|
| **GCP Project** | `apt-icon-472307-b7` (existing) | New project (separate) |
| **Firebase Project** | `grow-with-freya-dev` (existing) | New project (separate) |
| **Cloud Run** | Single region, min 0 instances | Multi-region, min 1 instance |
| **Backups** | Weekly manual/scheduled | Daily automated |
| **Monitoring** | Basic logging | Full alerting + dashboards |
| **Mobile Builds** | EAS development/preview builds | App Store production builds |
| **Distribution** | TestFlight + Internal Testing | Public app stores |
| **Cost** | ~$0-20/month | ~$50-200/month |
| **Domain** | Cloud Run URL | Custom domain |
| **SSL** | Auto (Cloud Run) | Auto (Cloud Run) |

### **1.3 Timeline**

**This guide: 2-4 hours**
- GCP setup: 30 minutes
- Gateway deployment: 30 minutes
- Firestore setup: 30 minutes
- Mobile builds: 1-2 hours
- Testing: 30 minutes

---

## **2. GCP Development Project Setup**

### **2.1 Use Your Existing Project**

You already have:
-  **Project ID**: `apt-icon-472307-b7`
-  **Region**: `europe-west2`
-  **Billing**: Enabled

**Verify:**
```bash
# Authenticate
gcloud auth login

# Set project
gcloud config set project apt-icon-472307-b7

# Verify
gcloud config get-value project
# Output: apt-icon-472307-b7

# Check billing
gcloud beta billing projects describe apt-icon-472307-b7
```

### **2.2 Enable Required APIs**

```bash
# Enable all required APIs (one command)
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  containerregistry.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  firebase.googleapis.com \
  cloudscheduler.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com

# Verify (should see all enabled)
gcloud services list --enabled | grep -E 'run|firestore|firebase|secret'
```

**Expected output:**
```
run.googleapis.com
firestore.googleapis.com
firebase.googleapis.com
secretmanager.googleapis.com
```

### **2.3 Create Service Account for Cloud Run**

```bash
# Create service account
gcloud iam service-accounts create gateway-dev-sa \
  --display-name="Gateway Development Service Account" \
  --description="Service account for development Gateway Cloud Run service"

# Grant Firestore access
gcloud projects add-iam-policy-binding apt-icon-472307-b7 \
  --member="serviceAccount:gateway-dev-sa@apt-icon-472307-b7.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

# Grant Secret Manager access
gcloud projects add-iam-policy-binding apt-icon-472307-b7 \
  --member="serviceAccount:gateway-dev-sa@apt-icon-472307-b7.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Verify
gcloud iam service-accounts list | grep gateway-dev-sa
```

---

## **3. Firebase/Firestore Development Setup**

### **3.1 Use Your Existing Firebase Project**

You already have:
-  **Firebase Project**: `grow-with-freya-dev`
-  **Linked to GCP**: `apt-icon-472307-b7`

**Verify:**
```bash
# Authenticate with Firebase
firebase login

# List projects
firebase projects:list

# Set default project
firebase use grow-with-freya-dev

# Verify
firebase projects:list
# Should show: grow-with-freya-dev (current)
```

### **3.2 Check Firestore Database**

**Option A: Using Firebase Console**
1. Go to [Firebase Console](https://console.firebase.google.com/project/grow-with-freya-dev)
2. Navigate to **Firestore Database**
3. Check if database exists

**Option B: Using CLI**
```bash
# Check Firestore status
gcloud firestore databases describe --database='(default)' --project=apt-icon-472307-b7

# If database doesn't exist, create it
gcloud firestore databases create --location=europe-west2 --project=apt-icon-472307-b7
```

### **3.3 Create Firebase Service Account (If Not Exists)**

```bash
# Check if service account exists
gcloud iam service-accounts list | grep firebase

# If not exists, create it
gcloud iam service-accounts create firebase-admin-dev \
  --display-name="Firebase Admin Development"

# Grant Firebase Admin role
gcloud projects add-iam-policy-binding apt-icon-472307-b7 \
  --member="serviceAccount:firebase-admin-dev@apt-icon-472307-b7.iam.gserviceaccount.com" \
  --role="roles/firebase.admin"

# Generate key
gcloud iam service-accounts keys create ~/firebase-admin-dev-key.json \
  --iam-account=firebase-admin-dev@apt-icon-472307-b7.iam.gserviceaccount.com

# View key (you'll need this later)
cat ~/firebase-admin-dev-key.json

# IMPORTANT: Keep this file secure, don't commit to git
```

---

## **4. Development Backup Strategy**

### **4.1 Create Backup Bucket**

```bash
# Create bucket for backups
gsutil mb -p apt-icon-472307-b7 \
  -c STANDARD \
  -l europe-west2 \
  gs://grow-with-freya-dev-backups

# Enable versioning
gsutil versioning set on gs://grow-with-freya-dev-backups

# Set lifecycle (delete backups older than 30 days for dev)
cat > /tmp/lifecycle-dev.json << 'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 30}
      }
    ]
  }
}
EOF

gsutil lifecycle set /tmp/lifecycle-dev.json gs://grow-with-freya-dev-backups

# Verify
gsutil lifecycle get gs://grow-with-freya-dev-backups
```

### **4.2 Create Manual Backup Script**

```bash
cd gateway-service

# Create backup script
cat > backup-firestore-dev.sh << 'EOF'
#!/bin/bash
set -e

PROJECT_ID="apt-icon-472307-b7"
BUCKET="gs://grow-with-freya-dev-backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo " Starting Firestore backup: $TIMESTAMP"

# Export all collections
gcloud firestore export ${BUCKET}/backups/${TIMESTAMP} \
  --project=${PROJECT_ID} \
  --async

echo " Backup initiated: ${BUCKET}/backups/${TIMESTAMP}"
echo " Check status: gcloud firestore operations list --project=${PROJECT_ID}"
EOF

chmod +x backup-firestore-dev.sh

# Test it
./backup-firestore-dev.sh
```

### **4.3 Schedule Weekly Backups (Optional)**

```bash
# Create service account for backups
gcloud iam service-accounts create firestore-backup-dev \
  --display-name="Firestore Backup Development"

# Grant export permission
gcloud projects add-iam-policy-binding apt-icon-472307-b7 \
  --member="serviceAccount:firestore-backup-dev@apt-icon-472307-b7.iam.gserviceaccount.com" \
  --role="roles/datastore.importExportAdmin"

# Grant storage write permission
gsutil iam ch \
  serviceAccount:firestore-backup-dev@apt-icon-472307-b7.iam.gserviceaccount.com:objectAdmin \
  gs://grow-with-freya-dev-backups

# Create weekly backup job (Sundays at 2 AM)
gcloud scheduler jobs create http firestore-weekly-backup-dev \
  --location=europe-west2 \
  --schedule="0 2 * * 0" \
  --uri="https://firestore.googleapis.com/v1/projects/apt-icon-472307-b7/databases/(default):exportDocuments" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"outputUriPrefix":"gs://grow-with-freya-dev-backups/scheduled","collectionIds":[]}' \
  --oauth-service-account-email="firestore-backup-dev@apt-icon-472307-b7.iam.gserviceaccount.com" \
  --oauth-token-scope="https://www.googleapis.com/auth/cloud-platform"

# Verify
gcloud scheduler jobs list --location=europe-west2
```

---

## **5. Deploy Gateway to Cloud Run (Dev)**

### **5.1 Prepare Secrets**

**Step 1: Generate JWT Secret**
```bash
# Generate strong secret
openssl rand -base64 32

# Copy the output - you'll need it
```

**Step 2: Get Your OAuth Credentials**

From your existing setup, you should have:
- **Google Client ID**: From Google Cloud Console
- **Google Client Secret**: From Google Cloud Console
- **Apple Client ID**: `com.growwithfreya.app.signin`
- **Apple Client Secret**: From Apple Developer Portal

**Step 3: Create Secrets**
```bash
cd gateway-service

# Set environment variables
export GCP_PROJECT_ID=apt-icon-472307-b7
export GCP_REGION=europe-west2

# Create secrets using the deployment script
./deploy-gcp.sh secrets

# Update with actual values
echo "YOUR_JWT_SECRET_FROM_STEP1" | \
  gcloud secrets versions add jwt-secret --data-file=-

echo "YOUR_GOOGLE_CLIENT_ID" | \
  gcloud secrets versions add google-client-id --data-file=-

echo "YOUR_GOOGLE_CLIENT_SECRET" | \
  gcloud secrets versions add google-client-secret --data-file=-

echo "com.growwithfreya.app.signin" | \
  gcloud secrets versions add apple-client-id --data-file=-

echo "YOUR_APPLE_CLIENT_SECRET" | \
  gcloud secrets versions add apple-client-secret --data-file=-

echo "grow-with-freya-dev" | \
  gcloud secrets versions add firebase-project-id --data-file=-

# Add Firebase service account key
cat ~/firebase-admin-dev-key.json | \
  gcloud secrets versions add firebase-service-account-key --data-file=-

# Verify all secrets
gcloud secrets list
```

**Expected output:**
```
NAME                              CREATED
apple-client-id                   2025-01-24T...
apple-client-secret               2025-01-24T...
firebase-project-id               2025-01-24T...
firebase-service-account-key      2025-01-24T...
google-client-id                  2025-01-24T...
google-client-secret              2025-01-24T...
jwt-secret                        2025-01-24T...
```

### **5.2 Deploy to Cloud Run**

```bash
cd gateway-service

# Set environment variables
export GCP_PROJECT_ID=apt-icon-472307-b7
export GCP_REGION=europe-west2

# Deploy (this takes 10-15 minutes)
./deploy-gcp.sh deploy
```

**What happens:**
1.  Checks prerequisites (gcloud, docker)
2.  Enables required APIs
3.  Builds Docker image
4.  Pushes to Google Container Registry
5.  Deploys to Cloud Run
6.  Sets up monitoring
7.  Returns service URL

**Expected output:**
```
[INFO] Starting deployment of Grow with Freya Gateway Service
[INFO] Project: apt-icon-472307-b7
[INFO] Region: europe-west2
[SUCCESS] Prerequisites check passed
[SUCCESS] Docker image built and pushed successfully
[SUCCESS] Service deployed successfully
[SUCCESS] Service URL: https://grow-with-freya-gateway-abc123-ew.a.run.app
```

### **5.3 Save Your Service URL**

```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe grow-with-freya-gateway \
  --region=europe-west2 \
  --format="value(status.url)")

echo "Your Gateway URL: $SERVICE_URL"

# Save to file for later use
echo "EXPO_PUBLIC_GATEWAY_URL=$SERVICE_URL" > ~/gateway-url.txt

# Example: https://grow-with-freya-gateway-jludng4t5a-ew.a.run.app
```

### **5.4 Configure for Development**

```bash
# Update Cloud Run service for development
gcloud run services update grow-with-freya-gateway \
  --region=europe-west2 \
  --min-instances=0 \
  --max-instances=10 \
  --concurrency=80 \
  --cpu=1 \
  --memory=1Gi \
  --timeout=300

# Verify
gcloud run services describe grow-with-freya-gateway \
  --region=europe-west2 \
  --format="value(spec.template.spec.containers[0].resources.limits)"
```

### **5.5 Test Deployment**

```bash
# Test health endpoint
curl -i ${SERVICE_URL}/actuator/health

# Expected response:
# HTTP/2 200
# {"status":"UP"}

# Test private health check
curl -i ${SERVICE_URL}/private/healthcheck

# Test authentication (should fail - no token)
curl -i ${SERVICE_URL}/auth/validate
# Expected: 401 Unauthorized
```

---

## **6. Deploy Firestore Rules & Indexes (Dev)**

### **6.1 Review Your Existing Configuration**

```bash
cd gateway-service

# Check if files exist
ls -la firestore.rules firestore.indexes.json firebase.json

# View rules
cat firestore.rules | head -30

# View indexes
cat firestore.indexes.json | head -50
```

### **6.2 Deploy to Development**

```bash
cd gateway-service

# Set Firebase project
export FIREBASE_PROJECT_ID=grow-with-freya-dev
firebase use grow-with-freya-dev

# Preview changes (dry run)
./deploy-firestore-config.sh --dry-run

# Deploy for real
./deploy-firestore-config.sh
```

**Expected output:**
```
[INFO] Starting Firestore configuration deployment...
[INFO] Target project: grow-with-freya-dev
[SUCCESS] Configuration files validated
[INFO] Deploying Firestore indexes to project: grow-with-freya-dev
 Deploy complete!
[SUCCESS] Firestore indexes deployed successfully
[INFO] Deploying Firestore security rules to project: grow-with-freya-dev
 Deploy complete!
[SUCCESS] Firestore security rules deployed successfully
```

### **6.3 Verify Deployment**

**Option A: Firebase Console**
1. Go to [Firebase Console](https://console.firebase.google.com/project/grow-with-freya-dev)
2. Navigate to **Firestore Database** → **Indexes**
3. Check status (should show "Building" or "Enabled")
4. Navigate to **Firestore Database** → **Rules**
5. Verify rules are deployed

**Option B: CLI**
```bash
# Check index status
gcloud firestore indexes list --project=apt-icon-472307-b7

# Expected output shows indexes with state: CREATING or READY
```

### **6.4 Wait for Indexes to Build**

```bash
# Indexes can take 5-30 minutes to build
# Check status periodically
watch -n 30 'gcloud firestore indexes list --project=apt-icon-472307-b7'

# When all show "READY", you're good to go
```

---

## **7. CMS Setup for Development**

### **7.1 Story Content Strategy**

**Important:** Stories are **NOT** stored in Cloud Storage. They are:
-  **Bundled in the app** (free stories)
-  **Downloaded as in-app purchases** from iOS/Android stores (premium stories)
-  **Stored locally on device** after download
-  **NOT fetched from Cloud Storage**

**Why this approach?**
- No Cloud Storage costs for story assets
- Faster story loading (local files)
- Offline-first experience
- Platform-native purchase flow
- Apple/Google handle content delivery

### **7.2 Story Metadata in Firestore (Optional)**

If you want to track story metadata (for analytics or recommendations), you can store minimal data in Firestore:

```bash
cd gateway-service

cat > story-metadata-template.json << 'EOF'
{
  "storyId": "test-story-001",
  "title": "The Magic Garden",
  "description": "A magical adventure in a secret garden",
  "genre": "adventure",
  "ageRange": "3-5",
  "duration": 180,
  "author": "Dev Team",
  "tags": ["adventure", "nature", "magic"],
  "isPremium": false,
  "isAvailable": true,
  "createdAt": "2025-01-24T00:00:00Z",
  "updatedAt": "2025-01-24T00:00:00Z"
}
EOF
```

**Add to Firestore (Optional):**
1. Go to [Firebase Console](https://console.firebase.google.com/project/grow-with-freya-dev)
2. Navigate to **Firestore Database** → **Data**
3. Create collection: `story_metadata`
4. Add document with story metadata
5. Use for analytics/recommendations only

**Note:** This is **optional**. If stories are bundled in the app, you don't need Firestore for story content.

### **7.3 User Entitlements (Future - Shopify Integration)**

When you integrate Shopify for premium content, you'll store user entitlements in Firestore:

```json
{
  "userId": "user-uuid",
  "entitlements": {
    "premium_stories": ["story-001", "story-002", "story-003"],
    "premium_music": ["music-pack-001"],
    "premium_emotions": ["emotions-pack-001"]
  },
  "purchases": [
    {
      "purchaseId": "shopify-order-123",
      "productId": "story-pack-001",
      "purchaseDate": "2025-01-24T10:00:00Z",
      "platform": "shopify"
    }
  ],
  "createdAt": "2025-01-24T10:00:00Z",
  "updatedAt": "2025-01-24T10:00:00Z"
}
```

**For now:** Skip this section. You'll implement it when ready for Shopify integration.

---

## **8. Mobile App Development Builds**

### **8.1 Update Mobile App Configuration**

```bash
cd grow-with-freya

# Get your Cloud Run URL
SERVICE_URL=$(gcloud run services describe grow-with-freya-gateway \
  --region=europe-west2 \
  --format="value(status.url)")

# Create/update .env file for development
cat > .env << EOF
# API Configuration
EXPO_PUBLIC_GATEWAY_URL=${SERVICE_URL}

# Google OAuth (use your actual values)
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=YOUR_IOS_CLIENT_ID
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=YOUR_ANDROID_CLIENT_ID
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID

# Apple OAuth
EXPO_PUBLIC_APPLE_CLIENT_ID=com.growwithfreya.app

# Development flags
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_CRASH_REPORTING=false
ENABLE_DEBUG_MODE=true

# Environment
NODE_ENV=development
EOF

# Verify
cat .env
```

### **8.2 Update OAuth Redirect URIs**

**Google OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your OAuth 2.0 Client ID (Web application)
3. Add to **Authorized redirect URIs**:
   ```
   https://YOUR_CLOUD_RUN_URL/auth/google/callback
   ```
4. Click **Save**

**Apple OAuth:**
1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list/serviceId)
2. Select your Service ID (`com.growwithfreya.app.signin`)
3. Edit **Sign In with Apple** configuration
4. Add to **Return URLs**:
   ```
   https://YOUR_CLOUD_RUN_URL/auth/apple/callback
   ```
5. Click **Save**

### **8.3 Create Development Build**

```bash
cd grow-with-freya

# Verify EAS is installed
eas --version

# Login to Expo
eas login

# Configure EAS (if not already done)
eas build:configure

# Build for iOS (development build)
eas build --platform ios --profile development

# Build for Android (development build)
eas build --platform android --profile development

# Or build both
eas build --platform all --profile development
```

**Build will take 15-20 minutes. Expected output:**
```
 Build complete!
 Install on device:
   iOS: Download from link or use TestFlight
   Android: Download APK from link
```

### **8.4 Install on Test Devices**

**iOS (TestFlight):**
1. Build completes → EAS provides link
2. Open link on iOS device
3. Install via TestFlight
4. App appears as "Grow with Freya (Dev)"

**Android (Internal Testing):**
1. Build completes → EAS provides APK download link
2. Download APK on Android device
3. Enable "Install from unknown sources"
4. Install APK
5. App appears as "Grow with Freya (Dev)"

**Or use Preview builds (more production-like):**
```bash
# Preview builds (no dev client, more like production)
eas build --platform ios --profile preview
eas build --platform android --profile preview
```

---

## **9. End-to-End Testing**

### **9.1 Backend Testing**

```bash
cd gateway-service

# Set gateway URL
export GATEWAY_URL=${SERVICE_URL}

# Run all functional tests
./gradlew functionalTest

# Expected: All 117 tests passing
#  117 scenarios (117 passed)
```

### **9.2 Mobile App Testing Checklist**

**Authentication Flow:**
- [ ] Open app on test device
- [ ] App shows "Grow with Freya (Dev)" (not "Expo Go")
- [ ] Tap "Sign in with Google"
- [ ] Google sign-in shows your app name
- [ ] Successfully authenticates
- [ ] Returns to app with user logged in
- [ ] Tap "Sign in with Apple"
- [ ] Apple sign-in shows "Sign in to Grow with Freya (Dev)"
- [ ] Successfully authenticates
- [ ] Check logs for token storage

**Story Loading:**
- [ ] Stories load from Firestore
- [ ] Images load from Cloud Storage
- [ ] Audio plays correctly
- [ ] Navigation works

**Profile Sync:**
- [ ] Change nickname in app
- [ ] Check Firestore console - should see update
- [ ] Change on another device
- [ ] First device should sync

**Token Refresh:**
- [ ] Leave app open for 20+ minutes
- [ ] Use app again
- [ ] Should auto-refresh token (check logs)
- [ ] No re-login required

**Logout:**
- [ ] Tap account button
- [ ] Tap "Logout"
- [ ] Confirms logout
- [ ] Returns to login screen
- [ ] Tokens cleared (check logs)

### **9.3 Manual API Testing**

```bash
# Test health
curl -i ${SERVICE_URL}/actuator/health

# Test authentication (get token from mobile app logs)
# After logging in on mobile, check logs for access token
ACCESS_TOKEN="eyJhbGc..."  # Copy from mobile app logs

# Test validate endpoint
curl -i ${SERVICE_URL}/auth/validate \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "X-Client-Platform: ios" \
  -H "X-Client-Version: 1.0.0" \
  -H "X-Device-ID: test-device" \
  -H "User-Agent: GrowWithFreya/1.0.0 (iOS)"

# Expected: 200 OK with user info

# Test profile endpoint
curl -i ${SERVICE_URL}/api/profile \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "X-Client-Platform: ios" \
  -H "X-Client-Version: 1.0.0" \
  -H "X-Device-ID: test-device" \
  -H "User-Agent: GrowWithFreya/1.0.0 (iOS)"

# Expected: 200 OK with profile data
```

### **9.4 Verify Firestore Data**

**Check Firebase Console:**
1. Go to [Firebase Console](https://console.firebase.google.com/project/grow-with-freya-dev)
2. Navigate to **Firestore Database** → **Data**
3. Check collections:
   - `users` - Should have your test user
   - `user_sessions` - Should have active session
   - `user_profiles` - Should have your profile
   - `stories` - Should have test story

**Or use CLI:**
```bash
# List users
gcloud firestore documents list users --project=apt-icon-472307-b7

# List sessions
gcloud firestore documents list user_sessions --project=apt-icon-472307-b7
```

---

## **10. Development Monitoring & Analytics**

### **10.1 Monitoring Strategy: Choose Your Approach**

Your gateway service already exposes **Prometheus metrics** at `/actuator/prometheus`. You have two options:

#### **Option A: GCP Cloud Monitoring (Recommended for Development)**

**Pros:**
-  Zero setup - works out of the box
-  Auto-ingests Prometheus metrics from Cloud Run
-  Pre-built dashboards
-  Alerting built-in
-  Integrates with Cloud Logging
-  No infrastructure to manage

**Cons:**
-  Less customization than Grafana
-  Costs ~$5-15/month (after free tier)
-  Vendor lock-in to GCP

**Cost:** ~$5-15/month (development), ~$20-50/month (production)

#### **Option B: Prometheus + Grafana (Self-Hosted)**

**Pros:**
-  Full control over metrics and dashboards
-  Beautiful custom dashboards
-  Open source, no vendor lock-in
-  Can export metrics to other tools
-  Great for learning observability

**Cons:**
-  Requires setup and maintenance
-  Need to run Prometheus + Grafana on Cloud Run
-  More complex configuration
-  Costs ~$10-30/month for Cloud Run instances

**Cost:** ~$10-30/month (development), ~$30-100/month (production)

#### **Recommendation for Development**

**Use Option A (GCP Cloud Monitoring)** for now:
- Faster to get started
- Less infrastructure to manage
- Good enough for development
- Can switch to Prometheus+Grafana later if needed

**Switch to Option B (Prometheus+Grafana)** when:
- You need custom dashboards
- You want to learn observability tools
- You're ready for production and want more control

### **10.2 Setup: GCP Cloud Monitoring (Option A)**

**Step 1: Enable Cloud Monitoring**
```bash
# Already enabled when you deployed Cloud Run
# Verify it's enabled
gcloud services list --enabled | grep monitoring

# Expected output:
# monitoring.googleapis.com
```

**Step 2: View Metrics in Console**
```bash
# Open Cloud Run metrics dashboard
echo "View Cloud Run metrics at:"
echo "https://console.cloud.google.com/run/detail/europe-west2/grow-with-freya-gateway/metrics?project=apt-icon-472307-b7"

# Open Cloud Monitoring dashboard
echo "View all metrics at:"
echo "https://console.cloud.google.com/monitoring/dashboards?project=apt-icon-472307-b7"
```

**Step 3: Create Custom Dashboard**
1. Go to [Cloud Monitoring](https://console.cloud.google.com/monitoring/dashboards?project=apt-icon-472307-b7)
2. Click **Create Dashboard**
3. Name it "Grow with Freya - Development"
4. Add charts for:
   - **Request Rate**: `app_requests_total` (rate)
   - **Response Time**: `app_response_time` (p50, p95, p99)
   - **Error Rate**: `app_errors_total` (rate)
   - **Authentication Success Rate**: `app_authentication_total{result="success"}` (rate)
   - **Active Sessions**: `app_active_sessions` (gauge)
   - **Device Types**: `app_requests_total` (grouped by `device_type`)
   - **Platforms**: `app_requests_total` (grouped by `platform`)

**Step 4: Set Up Basic Alerts (Optional)**
```bash
# Create alert for high error rate
gcloud alpha monitoring policies create \
  --notification-channels=YOUR_EMAIL_CHANNEL_ID \
  --display-name="High Error Rate" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=0.05 \
  --condition-threshold-duration=300s \
  --condition-filter='metric.type="prometheus.googleapis.com/app_errors_total/counter"'
```

### **10.3 Setup: Prometheus + Grafana (Option B - Advanced)**

**Only follow this if you chose Option B.**

**Step 1: Create Prometheus Configuration**
```bash
cd gateway-service

mkdir -p monitoring/prometheus
cat > monitoring/prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'gateway'
    metrics_path: '/actuator/prometheus'
    static_configs:
      - targets: ['grow-with-freya-gateway:8080']
    scheme: https
    tls_config:
      insecure_skip_verify: true
EOF
```

**Step 2: Create Grafana Dashboard JSON**
```bash
mkdir -p monitoring/grafana
cat > monitoring/grafana/gateway-dashboard.json << 'EOF'
{
  "dashboard": {
    "title": "Grow with Freya - Gateway Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(app_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Response Time (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(app_response_time_bucket[5m]))"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(app_errors_total[5m])"
          }
        ]
      },
      {
        "title": "Active Sessions",
        "targets": [
          {
            "expr": "app_active_sessions"
          }
        ]
      }
    ]
  }
}
EOF
```

**Step 3: Deploy Prometheus + Grafana to Cloud Run**
```bash
# Create Dockerfile for Prometheus
cat > monitoring/prometheus/Dockerfile << 'EOF'
FROM prom/prometheus:latest
COPY prometheus.yml /etc/prometheus/prometheus.yml
EXPOSE 9090
EOF

# Create Dockerfile for Grafana
cat > monitoring/grafana/Dockerfile << 'EOF'
FROM grafana/grafana:latest
COPY gateway-dashboard.json /etc/grafana/provisioning/dashboards/
EXPOSE 3000
EOF

# Build and deploy Prometheus
cd monitoring/prometheus
gcloud builds submit --tag gcr.io/apt-icon-472307-b7/prometheus
gcloud run deploy prometheus \
  --image gcr.io/apt-icon-472307-b7/prometheus \
  --region europe-west2 \
  --platform managed \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 1 \
  --memory 512Mi

# Build and deploy Grafana
cd ../grafana
gcloud builds submit --tag gcr.io/apt-icon-472307-b7/grafana
gcloud run deploy grafana \
  --image gcr.io/apt-icon-472307-b7/grafana \
  --region europe-west2 \
  --platform managed \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 1 \
  --memory 512Mi
```

**Step 4: Access Grafana**
```bash
# Get Grafana URL
GRAFANA_URL=$(gcloud run services describe grafana \
  --region=europe-west2 \
  --format="value(status.url)")

echo "Grafana URL: $GRAFANA_URL"
# Open in browser, login with admin/admin
```

### **10.4 Mobile App Analytics (Future Enhancement)**

Currently, the mobile app **does NOT send analytics events** to the backend. Here's what you could add:

#### **Events to Track (Future)**
```typescript
// Story events
trackEvent('story_started', { storyId, duration, platform, deviceType });
trackEvent('story_completed', { storyId, duration, platform, deviceType });
trackEvent('story_abandoned', { storyId, progress, platform, deviceType });

// Emotion game events
trackEvent('emotion_game_started', { emotionType, platform, deviceType });
trackEvent('emotion_game_completed', { emotionType, score, platform, deviceType });

// Music events
trackEvent('music_started', { trackId, category, platform, deviceType });
trackEvent('music_completed', { trackId, duration, platform, deviceType });

// Screen time events
trackEvent('screen_time_warning', { duration, limit, platform, deviceType });
trackEvent('screen_time_limit_reached', { duration, limit, platform, deviceType });

// App lifecycle events
trackEvent('app_opened', { platform, deviceType, appVersion });
trackEvent('app_backgrounded', { sessionDuration, platform, deviceType });
```

#### **Implementation Options**

**Option 1: Send to Gateway API (Recommended)**
```typescript
// Create new endpoint in gateway: POST /api/analytics/events
await ApiClient.request('/api/analytics/events', {
  method: 'POST',
  body: JSON.stringify({
    event: 'story_completed',
    properties: { storyId, duration, platform, deviceType },
    timestamp: new Date().toISOString(),
  }),
});

// Gateway stores in Firestore `analytics` collection
// Prometheus metrics updated automatically
```

**Option 2: Use Firebase Analytics (Alternative)**
```typescript
import analytics from '@react-native-firebase/analytics';

await analytics().logEvent('story_completed', {
  storyId,
  duration,
  platform: Platform.OS,
});

// Pros: Built-in, free, integrates with Firebase
// Cons: Vendor lock-in, less control
```

**Recommendation:** Implement Option 1 when you're ready to track user behavior. For now, focus on getting the deployment working.

### **10.5 View Logs**

```bash
# Tail logs in real-time
gcloud run services logs tail grow-with-freya-gateway \
  --region=europe-west2

# View recent errors
gcloud logging read \
  "resource.type=cloud_run_revision AND severity>=ERROR" \
  --limit=20 \
  --project=apt-icon-472307-b7

# View authentication logs
gcloud logging read \
  "resource.type=cloud_run_revision AND jsonPayload.event=~'LOGIN|LOGOUT'" \
  --limit=10 \
  --project=apt-icon-472307-b7

# View Prometheus metrics scrape
curl https://YOUR_GATEWAY_URL/actuator/prometheus | grep app_requests_total
```

### **10.6 Detailed Cost Breakdown**

This section provides accurate cost estimates for both development and production environments based on GCP pricing as of January 2025.

#### **Quick Summary**

| Environment | Monthly Cost | Use Case |
|-------------|--------------|----------|
| **Development** | **£2-5** ($2-6) | Testing, development |
| **Production-Lite** (Recommended for £150 budget) | **£50-70** ($62-86) | Early-stage production, MVP, up to 5K users, 300 req/min |
| **Full Production** (Future reference) | **£1,050-1,150** ($1,295-1,418) | Multi-region, always-on, 99.95% SLA, global users |

**For your £150/month budget:** Use **Production-Lite** configuration (single region, scales to zero, keep-alive pings). This gives you production-grade security and reliability at development-like costs, with £80-100/month buffer for growth.

---

#### **Development Environment Cost Breakdown (Single Region)**

**Assumptions:**
- Region: europe-west2 (London)
- Traffic: ~100 requests/day (~3,000 requests/month)
- Active testing: 2-4 hours/day
- Cloud Run scales to zero when idle
- 2-3 test users
- Firestore: ~10,000 reads, ~1,000 writes/month

| Service | Configuration | Monthly Cost | Notes |
|---------|--------------|--------------|-------|
| **Cloud Run (Gateway)** | 1 vCPU, 1 GiB RAM, min 0 instances | $0.00 - $2.00 | Free tier: 2M requests, 360K vCPU-seconds, 180K GiB-seconds |
| **Firestore** | Native mode, europe-west2 | $0.00 - $1.00 | Free tier: 50K reads, 20K writes, 20K deletes, 1 GiB storage |
| **Cloud Storage** | Standard, europe-west2, ~5 GB backups | $0.10 - $0.50 | $0.020/GB/month, lifecycle deletes after 30 days |
| **Secret Manager** | 6 secrets, ~100 accesses/month | $0.36 | $0.06/secret/month |
| **Cloud Monitoring** | Metrics ingestion, logs | $0.00 - $3.00 | Free tier: 150 MiB logs, 50 GiB metrics |
| **Cloud Logging** | Application logs | $0.00 - $2.00 | Free tier: 50 GiB/month |
| **Container Registry** | Docker images (~2 GB) | $0.04 | $0.020/GB/month |
| **Cloud Build** | 1-2 builds/week | $0.00 | Free tier: 120 build-minutes/day |
| **Networking (Egress)** | Minimal external traffic | $0.00 - $1.00 | Free tier: 1 GB/month to most regions |

**Total Development Cost: $0.50 - $10.00/month**

**Typical Development Cost: ~$2-5/month** (most services stay within free tier)

---

#### **Production Environment Cost Breakdown (Multi-Region, 300 req/min)**

**Assumptions:**
- Regions: 2 regions (europe-west2, us-central1)
- Traffic: 300 requests/minute = 18,000 requests/hour = 432,000 requests/day = ~13M requests/month
- Average request duration: 200ms
- Average response size: 5 KB
- Active users: 1,000 users
- Firestore: ~40M reads, ~5M writes/month
- Storage: ~50 GB (user data, sessions, profiles, analytics)
- Min instances: 1 per region (always-on for low latency)
- Peak traffic: 2x average (600 req/min during peak hours)

##### **Compute Costs**

| Service | Configuration | Calculation | Monthly Cost |
|---------|--------------|-------------|--------------|
| **Cloud Run (Region 1)** | 2 vCPU, 2 GiB RAM, min 1, max 100 | Base: 1 instance × 730 hrs × ($0.00002400/vCPU-sec × 2 vCPU × 3600 + $0.00000250/GiB-sec × 2 GiB × 3600) = $315.36<br>Requests: 6.5M × $0.40/M = $2.60<br>Autoscale: ~2 additional instances during peaks × 8 hrs/day × 30 days × $0.43/hr = $206.40 | **$524.36** |
| **Cloud Run (Region 2)** | 2 vCPU, 2 GiB RAM, min 1, max 100 | Same as Region 1 | **$524.36** |
| **Cloud Load Balancer** | HTTPS, 2 backends | Forwarding rules: 1 × $18/month = $18<br>Data processed: 13M req × 5 KB × 2 (in+out) = 130 GB × $0.008/GB = $1.04 | **$19.04** |

**Subtotal Compute: $1,067.76/month**

##### **Database & Storage Costs**

| Service | Configuration | Calculation | Monthly Cost |
|---------|--------------|-------------|--------------|
| **Firestore** | Multi-region (eur3) | Reads: 40M × $0.06/100K = $24.00<br>Writes: 5M × $0.18/100K = $9.00<br>Deletes: 500K × $0.02/100K = $0.10<br>Storage: 50 GB × $0.18/GB = $9.00 | **$42.10** |
| **Cloud Storage (Backups)** | Multi-region EU, ~200 GB | Storage: 200 GB × $0.026/GB = $5.20<br>Operations: ~30 writes × $0.05/10K = $0.00<br>Retrieval (rare): $0.00 | **$5.20** |

**Subtotal Database & Storage: $47.30/month**

##### **Networking Costs**

| Service | Configuration | Calculation | Monthly Cost |
|---------|--------------|-------------|--------------|
| **Egress (Internet)** | Worldwide destinations | 13M req × 5 KB = 65 GB/month<br>Premium tier: 65 GB × $0.12/GB = $7.80 | **$7.80** |
| **Egress (Inter-region)** | Cloud Run ↔ Firestore | Minimal (same region preferred) | **$0.50** |

**Subtotal Networking: $8.30/month**

##### **Monitoring & Operations Costs**

| Service | Configuration | Calculation | Monthly Cost |
|---------|--------------|-------------|--------------|
| **Cloud Monitoring** | Metrics, uptime checks, alerts | Metrics ingestion: ~500 MiB × $0.2580/MiB (after free tier) = $129.00<br>Uptime checks: 2 checks × $0.30 = $0.60 | **$129.60** |
| **Cloud Logging** | Application & system logs | Logs ingestion: ~100 GiB × $0.50/GiB (after free tier) = $50.00 | **$50.00** |
| **Error Reporting** | Error tracking | Included in Cloud Logging | **$0.00** |
| **Cloud Trace** | Request tracing (optional) | 1M traces × $0.20/M = $0.20 | **$0.20** |

**Subtotal Monitoring: $179.80/month**

##### **Security & Secrets Costs**

| Service | Configuration | Calculation | Monthly Cost |
|---------|--------------|-------------|--------------|
| **Secret Manager** | 7 secrets, ~50K accesses/month | Secrets: 7 × $0.06 = $0.42<br>Access: 50K × $0.03/10K = $0.15 | **$0.57** |
| **Cloud Armor** | DDoS protection (optional) | Policy: $5/month<br>Rules: 5 × $1 = $5 | **$10.00** |

**Subtotal Security: $10.57/month**

##### **CI/CD & Container Registry Costs**

| Service | Configuration | Calculation | Monthly Cost |
|---------|--------------|-------------|--------------|
| **Container Registry** | Docker images (~10 GB) | Storage: 10 GB × $0.020/GB = $0.20<br>Egress: ~5 GB × $0.12/GB = $0.60 | **$0.80** |
| **Cloud Build** | 10 builds/week | Build time: 40 builds × 10 min = 400 min<br>After free tier: 280 min × $0.003/min = $0.84 | **$0.84** |

**Subtotal CI/CD: $1.64/month**

##### **External Services (Optional)**

| Service | Configuration | Monthly Cost | Notes |
|---------|--------------|--------------|-------|
| **SendGrid** | Transactional email, 10K emails/month | $14.95 | Email notifications |
| **Twilio** | SMS notifications (optional), 1K SMS/month | $75.00 | SMS alerts (optional) |
| **PagerDuty** | On-call alerting (optional) | $21.00/user | Incident management |

**Subtotal External Services: $0.00 - $110.95/month** (depending on features enabled)

---

#### **Production Cost Summary (300 req/min) - if we was making profit in a ideal world situation (this increases significantly when microservices are added)**

| Category | Monthly Cost |
|----------|--------------|
| Compute (Cloud Run + Load Balancer) | $1,067.76 |
| Database & Storage (Firestore + GCS) | $47.30 |
| Networking (Egress) | $8.30 |
| Monitoring & Operations | $179.80 |
| Security & Secrets | $10.57 |
| CI/CD & Container Registry | $1.64 |
| **Core Infrastructure Total** | **$1,315.37** |
| External Services (optional) | $0.00 - $110.95 |
| **Grand Total** | **$1,315 - $1,426/month** |

**Estimated Production Cost: $1,300 - $1,450/month**

---

#### **Cost Optimization Strategies**

**Development:**
1. Use Cloud Run min instances = 0 (scales to zero when idle)
2. Delete old Firestore backups after 30 days
3. Use Cloud Monitoring free tier (disable detailed metrics)
4. Minimize logging verbosity
5. Use development builds (no external services)

**Production:**
1. **Committed Use Discounts**: Save 37% on Cloud Run with 1-year commitment (~$400/month savings)
2. **Sustained Use Discounts**: Automatic 30% discount for always-on instances
3. **Firestore Optimization**:
   - Use composite indexes efficiently
   - Implement caching for frequently read data (reduce reads by 50% = $12/month savings)
   - Batch writes where possible
4. **Cloud Run Optimization**:
   - Right-size instances (test with 1 vCPU, 1 GiB if sufficient)
   - Use request-based autoscaling (not CPU-based)
   - Set max instances to prevent runaway costs
5. **Monitoring Optimization**:
   - Use sampling for traces (10% sample = $116/month savings)
   - Aggregate metrics before sending to Cloud Monitoring
   - Use log exclusion filters for debug logs
6. **Networking Optimization**:
   - Use Cloud CDN for static content (if applicable)
   - Enable compression for API responses
   - Use Standard tier networking instead of Premium (save 50% on egress)

**Potential Optimized Production Cost: $900 - $1,100/month**

---

#### **Budget-Constrained Production (£150/month = ~$185/month)**

**Your Constraint:** Self-funded, maximum £150/month budget

**Strategy:** Single-region production with smart optimizations - same approach as dev but with production-grade reliability and security.

##### **Configuration: Production-Lite (Single Region, Cost-Optimized)**

**Assumptions:**
- Region: 1 region only (europe-west2 - closest to your users)
- Traffic: Up to 300 req/min sustained (can burst higher)
- Min instances: 0 (scales to zero during low traffic, like dev)
- Cold start mitigation: Use Cloud Scheduler to ping every 5 minutes during business hours
- Active users: Up to 5,000 users
- Firestore: ~20M reads, ~2M writes/month

| Service | Configuration | Monthly Cost | Notes |
|---------|--------------|--------------|-------|
| **Cloud Run (Gateway)** | 1 vCPU, 1 GiB RAM, min 0, max 50 | $15 - $45 | Scales to zero when idle. Cold starts: ~1-2s (acceptable for mobile app). Ping every 5 min during business hours to keep warm. |
| **Firestore** | Single-region (europe-west2) | $8 - $15 | Reads: 20M × $0.036/100K = $7.20<br>Writes: 2M × $0.108/100K = $2.16<br>Storage: 20 GB × $0.18/GB = $3.60 |
| **Cloud Storage** | Standard, europe-west2, ~50 GB backups | $1.00 - $2.00 | Daily backups, delete after 30 days |
| **Secret Manager** | 7 secrets, ~10K accesses/month | $0.45 | $0.06/secret/month + minimal access costs |
| **Cloud Monitoring** | Basic metrics only | $5 - $15 | Use free tier + minimal paid metrics. Disable detailed tracing. |
| **Cloud Logging** | Reduced logging | $2 - $8 | Log only errors and warnings. Exclude debug logs. Free tier: 50 GiB/month. |
| **Container Registry** | Docker images (~5 GB) | $0.10 | Minimal storage |
| **Cloud Build** | 4-8 builds/month | $0.00 - $0.50 | Stay within free tier (120 min/day) |
| **Networking (Egress)** | Worldwide, ~30 GB/month | $3.60 | 13M req × 2.5 KB avg = 32.5 GB × $0.12/GB (after 1 GB free) |
| **Cloud Scheduler** | Keep-alive pings | $0.30 | 3 jobs × $0.10/job/month |
| **SSL Certificate** | Managed by Cloud Run | $0.00 | Free with Cloud Run custom domains |

**Total Production-Lite Cost: $36 - $90/month**

**Typical Cost: ~$50-70/month** (well within your £150 budget!)

**Remaining Budget: £80-100/month** for:
- External services (SendGrid free tier: 100 emails/day)
- Future scaling
- Unexpected overages
- Domain name (~£10/year)

---

##### **What You Get with Production-Lite**

**Reliability:**
- **99.5% uptime** (Cloud Run SLA with single region)
- **Auto-scaling**: 0 to 50 instances based on traffic
- **Cold start mitigation**: Cloud Scheduler pings every 5 min during business hours (9am-9pm)
- **Automatic retries**: Cloud Run handles failed requests
- **Health checks**: Built-in liveness/readiness probes
- **Graceful degradation**: App continues working during Firestore slowdowns

**Security:**
- **HTTPS only**: Managed SSL certificates (free)
- **OAuth validation**: Google/Apple token verification with JWKS
- **Refresh token hashing**: SHA-256 + BCrypt (cost factor 12)
- **JWT access tokens**: Short-lived (15 min)
- **Rate limiting**: Per-IP and per-user limits
- **Firestore security rules**: Server-side validation
- **Secret Manager**: Encrypted secrets storage
- **IAM roles**: Least-privilege service accounts
- **Audit logging**: Track all authentication events
- **CORS protection**: Whitelist mobile app origins only

**Monitoring:**
- **Error tracking**: Cloud Error Reporting (free)
- **Basic metrics**: Request count, latency, errors
- **Uptime monitoring**: Cloud Scheduler health checks
- **Email alerts**: Critical errors only (free tier)
- **Log analysis**: Query logs for debugging
- **Prometheus metrics**: Available at `/actuator/prometheus`

**What You DON'T Get (vs. Full Production):**
- Multi-region deployment (single region only)
- Always-on instances (scales to zero, ~1-2s cold start)
- Cloud Load Balancer (not needed for single region)
- Cloud Armor DDoS protection (rely on Cloud Run built-in)
- Detailed tracing (use sampling instead)
- PagerDuty integration (use email alerts)
- SMS notifications (email only)

**Is This Production-Ready?**

**YES**, for your use case:
- Mobile apps tolerate 1-2s cold starts (happens rarely with keep-alive pings)
- Single region (europe-west2) covers UK/EU users with <50ms latency
- 99.5% uptime = ~3.6 hours downtime/month (acceptable for early-stage app)
- Security is identical to full production (OAuth, encryption, rate limiting)
- Can scale to 50 instances = handle 1,500 req/min burst traffic
- Firestore single-region is reliable (Google's SLA: 99.9%)

**When to Upgrade to Full Production:**
- Revenue > £500/month (can afford $1,300/month infrastructure)
- Users complaining about cold starts (upgrade to min 1 instance: +$40/month)
- Need multi-region for global users (upgrade to 2 regions: +$600/month)
- Need 99.95% uptime SLA (upgrade to multi-region + load balancer)
- Need advanced DDoS protection (add Cloud Armor: +$10/month)

---

##### **Production-Lite Deployment Configuration**

**Cloud Run Configuration:**
```bash
gcloud run deploy grow-with-freya-gateway \
  --image gcr.io/apt-icon-472307-b7/grow-with-freya-gateway:latest \
  --region europe-west2 \
  --platform managed \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 50 \
  --cpu 1 \
  --memory 1Gi \
  --timeout 60 \
  --concurrency 80 \
  --cpu-throttling \
  --service-account gateway-prod-sa@apt-icon-472307-b7.iam.gserviceaccount.com \
  --set-env-vars "SPRING_PROFILES_ACTIVE=prod" \
  --set-env-vars "JWT_EXPIRATION=900" \
  --set-env-vars "REFRESH_TOKEN_EXPIRATION=604800" \
  --set-secrets "JWT_SECRET=jwt-secret:latest" \
  --set-secrets "GOOGLE_CLIENT_ID=google-client-id:latest" \
  --set-secrets "GOOGLE_CLIENT_SECRET=google-client-secret:latest" \
  --set-secrets "APPLE_CLIENT_ID=apple-client-id:latest" \
  --set-secrets "APPLE_CLIENT_SECRET=apple-client-secret:latest" \
  --set-secrets "FIREBASE_PROJECT_ID=firebase-project-id:latest" \
  --set-secrets "FIREBASE_SERVICE_ACCOUNT_KEY=firebase-service-account-key:latest"
```

**Firestore Configuration:**
```bash
# Use single-region Firestore (cheaper than multi-region)
gcloud firestore databases create \
  --location=europe-west2 \
  --type=firestore-native \
  --project=apt-icon-472307-b7

# Deploy security rules (same as dev)
firebase deploy --only firestore:rules

# Deploy indexes (same as dev)
firebase deploy --only firestore:indexes
```

**Cloud Scheduler Keep-Alive (Prevent Cold Starts):**
```bash
# Ping every 5 minutes during business hours (9am-9pm UK time)
gcloud scheduler jobs create http keep-alive-gateway \
  --location=europe-west2 \
  --schedule="*/5 9-21 * * *" \
  --uri="https://YOUR_GATEWAY_URL/actuator/health" \
  --http-method=GET \
  --time-zone="Europe/London" \
  --description="Keep gateway warm during business hours"

# Health check every 15 minutes (24/7)
gcloud scheduler jobs create http health-check-gateway \
  --location=europe-west2 \
  --schedule="*/15 * * * *" \
  --uri="https://YOUR_GATEWAY_URL/actuator/health" \
  --http-method=GET \
  --time-zone="Europe/London" \
  --description="Monitor gateway health"
```

**Cloud Monitoring Alerts (Free Tier):**
```bash
# Alert on high error rate (email only)
gcloud alpha monitoring policies create \
  --notification-channels=YOUR_EMAIL_CHANNEL_ID \
  --display-name="High Error Rate - Production" \
  --condition-display-name="Error rate > 10%" \
  --condition-threshold-value=0.10 \
  --condition-threshold-duration=300s \
  --condition-filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_count" AND metric.labels.response_code_class="5xx"'

# Alert on service down (email only)
gcloud alpha monitoring policies create \
  --notification-channels=YOUR_EMAIL_CHANNEL_ID \
  --display-name="Service Down - Production" \
  --condition-display-name="No requests in 10 minutes" \
  --condition-threshold-value=1 \
  --condition-threshold-duration=600s \
  --condition-filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_count"'
```

**Logging Configuration (Reduce Costs):**
```bash
# Exclude debug logs (only log INFO, WARN, ERROR)
gcloud logging sinks create exclude-debug-logs \
  logging.googleapis.com/projects/apt-icon-472307-b7/logs \
  --log-filter='severity < "INFO"'

# Exclude health check logs (noisy)
gcloud logging sinks create exclude-health-checks \
  logging.googleapis.com/projects/apt-icon-472307-b7/logs \
  --log-filter='resource.type="cloud_run_revision" AND httpRequest.requestUrl=~"/actuator/health"'
```

**Daily Backup Script:**
```bash
# Create daily backup job (runs at 2am UK time)
gcloud scheduler jobs create http firestore-daily-backup \
  --location=europe-west2 \
  --schedule="0 2 * * *" \
  --uri="https://firestore.googleapis.com/v1/projects/apt-icon-472307-b7/databases/(default):exportDocuments" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"outputUriPrefix":"gs://grow-with-freya-prod-backups/daily","collectionIds":[]}' \
  --oauth-service-account-email="firestore-backup-prod@apt-icon-472307-b7.iam.gserviceaccount.com" \
  --oauth-token-scope="https://www.googleapis.com/auth/cloud-platform" \
  --time-zone="Europe/London"
```

---

##### **Production-Lite Cost Breakdown**

| Category | Monthly Cost | Optimization |
|----------|--------------|--------------|
| Cloud Run (min 0 instances) | $15 - $45 | Scales to zero when idle. Keep-alive pings during business hours. |
| Firestore (single-region) | $8 - $15 | Use single-region (40% cheaper than multi-region). Implement caching. |
| Cloud Storage (backups) | $1 - $2 | Daily backups, 30-day retention. |
| Monitoring & Logging | $7 - $23 | Use free tier + minimal paid. Exclude debug logs. |
| Networking | $3.60 | Compress responses. Use efficient JSON. |
| Secrets & Scheduler | $0.75 | Minimal overhead. |
| **Total** | **$35 - $90/month** | **~£28 - £72/month** |

**Typical Production-Lite Cost: £50-60/month**

**Your Budget: £150/month**

**Remaining: £90-100/month** for:
- Domain name (~£10/year)
- SendGrid (free tier: 100 emails/day, or $15/month for 40K emails)
- Future scaling (add min 1 instance when revenue allows: +£32/month)
- Unexpected traffic spikes
- Emergency support

---

#### **Environment Comparison: Dev vs Production-Lite vs Full Production**

| Feature | Development | Production-Lite (£150 budget) | Full Production (Future) |
|---------|-------------|-------------------------------|--------------------------|
| **Monthly Cost** | £2-5 | £50-70 | £1,050-1,150 |
| **Regions** | 1 (europe-west2) | 1 (europe-west2) | 2+ (multi-region) |
| **Min Instances** | 0 (scales to zero) | 0 (scales to zero) | 1 per region (always-on) |
| **Max Instances** | 10 | 50 | 100 per region |
| **CPU/Memory** | 1 vCPU, 1 GiB | 1 vCPU, 1 GiB | 2 vCPU, 2 GiB |
| **Cold Start** | 1-2s (acceptable) | 1-2s (mitigated with pings) | None (always warm) |
| **Firestore** | Single-region | Single-region | Multi-region |
| **Uptime SLA** | None | 99.5% (~3.6 hrs/month down) | 99.95% (~22 min/month down) |
| **Load Balancer** | No | No | Yes (global) |
| **DDoS Protection** | Basic (Cloud Run) | Basic (Cloud Run) | Advanced (Cloud Armor) |
| **Monitoring** | Basic (free tier) | Basic + alerts | Advanced (tracing, PagerDuty) |
| **Logging** | All logs | Errors/warnings only | All logs + analysis |
| **Backups** | Weekly | Daily | Daily + versioning |
| **SSL** | Managed (free) | Managed (free) | Managed (free) |
| **Security** | Full OAuth + encryption | Full OAuth + encryption | Full OAuth + encryption |
| **Max Traffic** | 100 req/day | 300 req/min sustained | 1,200+ req/min |
| **Max Users** | 2-3 test users | 5,000 active users | 50,000+ active users |
| **Use Case** | Testing, development | Early-stage production, MVP | Scale-up, revenue-generating |

**Key Insight:** Production-Lite gives you **production-grade security and reliability** at **development-like costs** by using the same "scale to zero" strategy with smart keep-alive pings.

---

#### **Cost Scaling Projections (All Environments)**

| Environment | Traffic | Monthly Cost (£) | Monthly Cost ($) | When to Use |
|-------------|---------|------------------|------------------|-------------|
| **Development** | 100 req/day | £2-5 | $2-6 | Testing, development |
| **Production-Lite** | 50 req/min | £35-45 | $43-55 | MVP, early users (0-1K users) |
| **Production-Lite** | 150 req/min | £45-60 | $55-74 | Growing user base (1K-3K users) |
| **Production-Lite** | **300 req/min** | **£50-70** | **$62-86** | **Your target (3K-5K users)** |
| **Production-Lite Max** | 500 req/min | £70-90 | $86-111 | Near capacity (5K-8K users) |
| **Production Standard** | 300 req/min, min 1 | £320-400 | $395-493 | Need <500ms cold start |
| **Full Production** | 300 req/min, multi-region | £1,050-1,150 | $1,295-1,418 | Global users, 99.95% SLA |
| **Full Production** | 600 req/min, multi-region | £1,920-2,240 | $2,368-2,762 | High traffic, revenue-generating |

**Note:** Costs scale sub-linearly due to:
- Sustained use discounts
- Committed use discounts
- Fixed costs (load balancer, min instances) amortized over more traffic
- Firestore free tier absorption

**Recommendation for Your Budget (£150/month):**
1. **Start with Production-Lite** (£50-70/month) - gives you £80-100/month buffer
2. **Monitor costs weekly** - set up budget alerts at £100, £125, £150
3. **Optimize as you grow** - implement caching, reduce logging, compress responses
4. **Upgrade when revenue allows** - move to min 1 instance when you can afford £320/month
5. **Scale to multi-region** - only when you have global users and £1,000+/month budget

---

#### **Monitoring Your Costs**

```bash
# View current month's costs
gcloud billing accounts list
gcloud billing projects describe apt-icon-472307-b7

# View billing dashboard
echo "View billing at:"
echo "https://console.cloud.google.com/billing?project=apt-icon-472307-b7"

# Set up budget alerts
gcloud billing budgets create \
  --billing-account=YOUR_BILLING_ACCOUNT_ID \
  --display-name="Grow with Freya Monthly Budget" \
  --budget-amount=1500 \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100

# Export billing data to BigQuery for analysis
gcloud billing accounts get-iam-policy YOUR_BILLING_ACCOUNT_ID
```

---

## **11. Development Workflow**

### **11.1 Daily Development**

```bash
# 1. Make code changes
cd gateway-service
# ... edit code ...

# 2. Run tests locally
./gradlew test

# 3. Run functional tests
./gradlew functionalTest

# 4. Commit changes
git add .
git commit -m "feat: add new feature"
git push
```

### **11.2 Deploy Updates**

```bash
# When ready to deploy changes to Cloud Run
cd gateway-service

export GCP_PROJECT_ID=apt-icon-472307-b7
export GCP_REGION=europe-west2

# Build and deploy
./deploy-gcp.sh deploy

# Or just build new image
./deploy-gcp.sh build

# Verify deployment
./deploy-gcp.sh url
curl ${SERVICE_URL}/actuator/health
```

### **11.3 Update Mobile App**

```bash
cd grow-with-freya

# 1. Make changes
# ... edit code ...

# 2. Test locally
npm start

# 3. Run tests
npm run test

# 4. Build new development build
eas build --platform all --profile development

# 5. Install on test devices
# Download from EAS link
```

### **11.4 Troubleshooting**

**Gateway won't start:**
```bash
# Check logs
gcloud run services logs read grow-with-freya-gateway \
  --region=europe-west2 \
  --limit=50

# Check service status
gcloud run services describe grow-with-freya-gateway \
  --region=europe-west2

# Check secrets
gcloud secrets list
```

**Mobile app can't connect:**
```bash
# Verify gateway URL in .env
cat grow-with-freya/.env | grep GATEWAY_URL

# Test gateway is accessible
curl -i ${SERVICE_URL}/actuator/health

# Check OAuth redirect URIs are correct
# Google: https://console.cloud.google.com/apis/credentials
# Apple: https://developer.apple.com/account/resources/identifiers
```

**Firestore errors:**
```bash
# Check rules are deployed
firebase deploy --only firestore:rules --project=grow-with-freya-dev

# Check indexes are ready
gcloud firestore indexes list --project=apt-icon-472307-b7

# View Firestore logs
gcloud logging read "resource.type=cloud_firestore_database" \
  --limit=20 \
  --project=apt-icon-472307-b7
```

---

# **PART B: PRODUCTION DEPLOYMENT (FUTURE)**

---

## **12. Production Deployment Plan**

### **12.1 When to Deploy to Production**

Deploy to production when:
-  Development environment is stable
-  All features are tested end-to-end
-  Shopify integration is ready
-  Marketing website is ready
-  App store assets prepared (screenshots, descriptions)
-  Privacy policy and terms of service published
-  Support infrastructure in place
-  Budget approved for production costs

**Estimated Timeline: 2-3 months from now**

### **12.2 Production Architecture**

```

                   PRODUCTION ENVIRONMENT                     

                                                              
                
    App Store      Cloud Run Gateway           
    iOS Users              (Production Instance)        
                                                        
             - Multi-region               
                             - Auto-scaling               
             - High availability          
   Google Play    - Custom domain              
  Android Users            - SSL/TLS                    
                
                                                            
                                            
     Shopify                          
     Store                                                
                
                              Firestore (Prod)            
                             - Multi-region               
                             - Daily backups              
                             - 99.999% SLA                
                                
                                                              
    
           Monitoring & Alerting                          
    - Cloud Monitoring dashboards                         
    - Error rate alerts                                   
    - Latency alerts                                      
    - Uptime checks                                       
    - PagerDuty integration                               
    
                                                              

```

### **12.3 Production Setup Steps**

#### **Step 1: Create New GCP Project (Separate from Dev)**

```bash
# Create production project
gcloud projects create grow-with-freya-prod \
  --name="Grow with Freya Production" \
  --set-as-default

# Link billing
gcloud billing projects link grow-with-freya-prod \
  --billing-account=YOUR_BILLING_ACCOUNT_ID

# Enable APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  containerregistry.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  firebase.googleapis.com \
  cloudscheduler.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com \
  cloudtrace.googleapis.com
```

#### **Step 2: Create Production Firebase Project**

```bash
# Add Firebase to production GCP project
firebase projects:addfirebase grow-with-freya-prod

# Initialize Firestore (production mode)
# Select location: europe-west2 (multi-region for HA)
```

#### **Step 3: Set Up Production Secrets**

```bash
# Generate new production JWT secret (different from dev!)
openssl rand -base64 32

# Create production secrets
gcloud secrets create jwt-secret-prod --data-file=-
gcloud secrets create google-client-id-prod --data-file=-
gcloud secrets create google-client-secret-prod --data-file=-
gcloud secrets create apple-client-id-prod --data-file=-
gcloud secrets create apple-client-secret-prod --data-file=-
gcloud secrets create firebase-project-id-prod --data-file=-
gcloud secrets create firebase-service-account-key-prod --data-file=-
```

#### **Step 4: Deploy Gateway to Production**

```bash
cd gateway-service

export GCP_PROJECT_ID=grow-with-freya-prod
export GCP_REGION=europe-west2

# Deploy with production configuration
./deploy-gcp.sh deploy

# Configure for high availability
gcloud run services update grow-with-freya-gateway \
  --region=europe-west2 \
  --min-instances=1 \
  --max-instances=100 \
  --concurrency=80 \
  --cpu=2 \
  --memory=2Gi \
  --timeout=300 \
  --cpu-throttling=false
```

#### **Step 5: Set Up Custom Domain (Optional)**

```bash
# Map custom domain (e.g., api.growwithfreya.com)
gcloud run domain-mappings create \
  --service=grow-with-freya-gateway \
  --domain=api.growwithfreya.com \
  --region=europe-west2

# Update DNS records as instructed by gcloud
# SSL certificate is automatically provisioned
```

#### **Step 6: Deploy Firestore Rules & Indexes**

```bash
cd gateway-service

export FIREBASE_PROJECT_ID=grow-with-freya-prod
firebase use grow-with-freya-prod

./deploy-firestore-config.sh
```

#### **Step 7: Set Up Production Backups**

```bash
# Create production backup bucket
gsutil mb -p grow-with-freya-prod \
  -c STANDARD \
  -l europe-west2 \
  gs://grow-with-freya-prod-backups

# Schedule daily backups (2 AM UTC)
gcloud scheduler jobs create http firestore-daily-backup-prod \
  --location=europe-west2 \
  --schedule="0 2 * * *" \
  --uri="https://firestore.googleapis.com/v1/projects/grow-with-freya-prod/databases/(default):exportDocuments" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"outputUriPrefix":"gs://grow-with-freya-prod-backups/daily","collectionIds":[]}' \
  --oauth-service-account-email="firestore-backup-prod@grow-with-freya-prod.iam.gserviceaccount.com" \
  --oauth-token-scope="https://www.googleapis.com/auth/cloud-platform"

# Set lifecycle (keep backups for 90 days)
cat > lifecycle-prod.json << 'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 90}
      }
    ]
  }
}
EOF

gsutil lifecycle set lifecycle-prod.json gs://grow-with-freya-prod-backups
```

#### **Step 8: Set Up Production Monitoring**

```bash
# Create monitoring dashboard
# Create alert policies for:
# - Error rate > 1%
# - Latency > 500ms
# - Service down
# - High memory usage
# - High CPU usage

# Set up notification channels:
# - Email
# - SMS (optional)
# - PagerDuty (optional)

# Create uptime checks
gcloud monitoring uptime create prod-health-check \
  --resource-type=uptime-url \
  --display-name="Production Health Check" \
  --http-check-path=/actuator/health \
  --monitored-resource=https://api.growwithfreya.com \
  --period=60 \
  --timeout=10s
```

#### **Step 9: Create Production Mobile Builds**

```bash
cd grow-with-freya

# Create .env.production
cat > .env.production << EOF
EXPO_PUBLIC_GATEWAY_URL=https://api.growwithfreya.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=PROD_IOS_CLIENT_ID
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=PROD_ANDROID_CLIENT_ID
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=PROD_WEB_CLIENT_ID
EXPO_PUBLIC_APPLE_CLIENT_ID=com.growwithfreya.app
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_CRASH_REPORTING=true
ENABLE_DEBUG_MODE=false
NODE_ENV=production
EOF

# Build production apps
eas build --platform all --profile production

# Submit to app stores
eas submit --platform ios
eas submit --platform android
```

#### **Step 10: Shopify Integration**

```bash
# Set up Shopify store
# - Create products for stories
# - Set up payment processing
# - Configure webhooks to notify gateway
# - Implement purchase verification in gateway

# Add Shopify webhook endpoint to gateway
# POST /api/shopify/webhook
# - Verify purchase
# - Grant access to premium content
# - Update user profile in Firestore
```

### **12.4 Production Deployment Checklist**

**Infrastructure:**
- [ ] New GCP project created (separate from dev)
- [ ] New Firebase project created (separate from dev)
- [ ] Production secrets configured
- [ ] Cloud Run deployed with HA configuration
- [ ] Custom domain configured (optional)
- [ ] SSL certificate provisioned
- [ ] Firestore rules deployed
- [ ] Firestore indexes built
- [ ] Daily backups configured
- [ ] Monitoring dashboards created
- [ ] Alert policies configured
- [ ] Uptime checks configured

**Application:**
- [ ] All tests passing (117/117)
- [ ] Load testing completed
- [ ] Security audit completed
- [ ] Performance optimization done
- [ ] Error handling tested
- [ ] Disaster recovery tested

**Mobile App:**
- [ ] Production builds created
- [ ] App store metadata prepared
- [ ] Screenshots created
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Support email configured
- [ ] App store submissions approved

**Business:**
- [ ] Shopify store configured
- [ ] Payment processing tested
- [ ] Purchase flow tested end-to-end
- [ ] Customer support process defined
- [ ] Marketing plan ready
- [ ] Launch date set

### **12.5 Production Cost Estimate**

| Service | Estimated Monthly Cost |
|---------|------------------------|
| **Cloud Run** | $30-100 (depends on traffic) |
| **Firestore** | $20-50 (depends on usage) |
| **Cloud Storage** | $5-15 (stories + backups) |
| **Secret Manager** | $0.42 (7 secrets) |
| **Cloud Logging** | $10-30 (depends on logs) |
| **Cloud Monitoring** | $5-15 (dashboards + alerts) |
| **Cloud Scheduler** | $0.10 (1 job) |
| **Domain** | $12/year (~$1/month) |
| **Total** | **$70-210/month** |

**Additional Costs:**
- Apple Developer: $99/year
- Google Play Developer: $25 one-time
- Shopify: $29-299/month (depends on plan)

### **12.6 Production Rollout Strategy**

**Week 1: Soft Launch**
- Deploy to production
- Release to 10% of users (staged rollout)
- Monitor metrics closely
- Fix critical issues

**Week 2-3: Gradual Rollout**
- Increase to 25% of users
- Monitor error rates, crashes
- Gather user feedback
- Increase to 50%

**Week 4: Full Launch**
- 100% rollout
- Marketing campaign
- Monitor continuously
- Respond to user feedback

---

## **13. Quick Reference**

### **Development Commands**

```bash
# === BACKEND ===
cd gateway-service

# Deploy to dev
export GCP_PROJECT_ID=apt-icon-472307-b7
export GCP_REGION=europe-west2
./deploy-gcp.sh deploy

# View logs
gcloud run services logs tail grow-with-freya-gateway --region=europe-west2

# Run tests
./gradlew functionalTest

# === MOBILE APP ===
cd grow-with-freya

# Build development
eas build --platform all --profile development

# Build preview
eas build --platform all --profile preview

# === FIRESTORE ===
cd gateway-service

# Deploy rules/indexes
firebase use grow-with-freya-dev
./deploy-firestore-config.sh

# Backup
./backup-firestore-dev.sh

# === MONITORING ===
# View metrics
echo "https://console.cloud.google.com/run/detail/europe-west2/grow-with-freya-gateway/metrics?project=apt-icon-472307-b7"

# View logs
gcloud logging read "severity>=ERROR" --limit=20 --project=apt-icon-472307-b7
```

### **Your Current Setup**

```
Development Environment:
 GCP Project: apt-icon-472307-b7
 Firebase Project: grow-with-freya-dev
 Region: europe-west2
 Gateway URL: https://grow-with-freya-gateway-xxx-ew.a.run.app
 Firestore: (default) database
    users (PII data)
    user_sessions (session tracking)
    user_profiles (non-PII preferences)
    analytics (future)
 Backups: gs://grow-with-freya-dev-backups
 Stories: Bundled in app (NO Cloud Storage)
 Monitoring: GCP Cloud Monitoring (recommended) or Prometheus+Grafana
```

### **Current APIs**

```
Authentication:
 POST /auth/google - Google OAuth
 POST /auth/apple - Apple OAuth
 POST /auth/refresh - Refresh access token
 POST /auth/revoke - Logout

User Profile:
 GET /api/profile - Get user profile
 POST /api/profile - Create/update profile

Metrics (Prometheus):
 GET /actuator/prometheus - Prometheus scrape endpoint
 GET /actuator/custom/metrics - Application metrics summary
 GET /actuator/custom/devices - Device/platform statistics
 GET /actuator/custom/requests - Request statistics

Health:
 GET /actuator/health - Spring Boot health check
 GET /private/healthcheck - Simple health check
```

---

## **14. Next Steps**

**Start here (2-4 hours):**
1.  **Section 2**: Verify GCP project setup
2.  **Section 3**: Verify Firebase/Firestore
3.  **Section 4**: Set up backups
4.  **Section 5**: Deploy gateway to Cloud Run
5.  **Section 6**: Deploy Firestore rules/indexes
6.  **Section 7**: Add test story to Firestore
7.  **Section 8**: Build mobile app (development profile)
8.  **Section 9**: Test end-to-end

**Then (ongoing):**
- Use development environment for all testing
- Iterate on features
- Test with real devices
- Gather feedback

**Later (2-3 months):**
- Follow **Section 12** for production deployment
- Set up Shopify integration
- Submit to app stores
- Launch! 

---

**Good luck with your development deployment! **

