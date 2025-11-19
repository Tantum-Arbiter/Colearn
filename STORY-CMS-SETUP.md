# Story CMS Setup and Testing Guide

This guide walks you through setting up and testing the Story CMS with delta-sync functionality.

## 🎯 What We've Built

A complete **Story Content Management System** that:
- ✅ Stores story metadata in Firestore (not visual assets)
- ✅ Implements delta-sync to minimize data transfer
- ✅ Automatically versions content with SHA-256 checksums
- ✅ Provides REST APIs for mobile apps to sync stories
- ✅ Includes CI/CD automation for story deployments

## 📋 Prerequisites

### 1. Firebase Service Account Key

You need a Firebase service account key to upload stories to Firestore.

**Get the key:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `apt-icon-472307-b7`
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Save as `scripts/service-account-key.json`

⚠️ **IMPORTANT:** Never commit this file to git!

### 2. Environment Setup

```bash
# Install script dependencies (already done ✅)
cd scripts
npm install

# Verify Node.js version
node --version  # Should be >= 18.0.0
```

## 🚀 Step-by-Step Testing

### Step 1: Upload Stories to Firestore

```bash
# From project root
cd scripts

# Upload stories
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=./service-account-key.json \
FIREBASE_PROJECT_ID=apt-icon-472307-b7 \
npm run upload-stories
```

**Expected output:**
```
🚀 Story Metadata Upload Script
================================

📁 Stories directory: /path/to/grow-with-freya/assets/stories
🔥 Firebase project: apt-icon-472307-b7

✅ Loaded story: snuggle-little-wombat (8 pages)
✅ Loaded story: my-custom-story (8 pages)

📤 Uploading 2 stories to Firestore...
  ➡️  snuggle-little-wombat: Snuggle Little Wombat
  ➡️  my-custom-story: My Custom Story
✅ Successfully uploaded 2 stories

📝 Updating content version...
✅ Content version updated to v1 (2 stories)

✨ Upload complete!
   Version: 1
   Stories: 2
```

### Step 2: Build Gateway Service

```bash
# From project root
cd gateway-service

# Clean build
./gradlew clean build
```

### Step 3: Run Functional Tests

```bash
# From project root

# Start services with Docker Compose
docker compose -f docker-compose.functional-tests.yml --profile func up -d

# Wait for services to be healthy (check logs)
docker compose -f docker-compose.functional-tests.yml logs -f func-tests

# To stop services
docker compose -f docker-compose.functional-tests.yml down
```

**Tests to verify:**
- ✅ `GET /api/stories` - Returns all available stories
- ✅ `GET /api/stories/{id}` - Returns specific story
- ✅ `GET /api/stories/version` - Returns content version
- ✅ `POST /api/stories/sync` - Delta-sync with checksums
- ✅ `GET /api/stories/category/{category}` - Filter by category

### Step 4: Manual API Testing

You can also test the APIs manually using curl:

```bash
# Get all stories
curl http://localhost:8080/api/stories

# Get content version
curl http://localhost:8080/api/stories/version

# Get specific story
curl http://localhost:8080/api/stories/snuggle-little-wombat

# Delta sync (initial sync with no client data)
curl -X POST http://localhost:8080/api/stories/sync \
  -H "Content-Type: application/json" \
  -d '{
    "clientVersion": 0,
    "storyChecksums": {},
    "lastSyncTimestamp": 0
  }'

# Delta sync (with matching checksums - should return 0 updates)
curl -X POST http://localhost:8080/api/stories/sync \
  -H "Content-Type: application/json" \
  -d '{
    "clientVersion": 1,
    "storyChecksums": {
      "snuggle-little-wombat": "actual-checksum-from-version-endpoint"
    },
    "lastSyncTimestamp": 1234567890000
  }'
```

## 🔍 Verify in Firebase Console

1. Go to [Firestore Console](https://console.firebase.google.com/project/apt-icon-472307-b7/firestore)
2. Check collections:
   - **`stories`** - Should have 2 documents (snuggle-little-wombat, my-custom-story)
   - **`content_versions`** - Should have 1 document (`current`)

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stories` | Get all available stories |
| GET | `/api/stories/{id}` | Get specific story by ID |
| GET | `/api/stories/version` | Get current content version |
| POST | `/api/stories/sync` | Delta-sync stories |
| GET | `/api/stories/category/{category}` | Get stories by category |

## 🔄 Delta-Sync Flow

1. **Client** sends current checksums to `/api/stories/sync`
2. **Server** compares with latest checksums
3. **Server** returns only changed/new stories
4. **Client** updates local storage with new metadata
5. **Client** uses local assets (images/audio) with synced metadata

## 📱 Next Steps: Mobile Integration

After backend testing is complete, implement mobile side:

1. Create TypeScript types matching backend models
2. Create `StorySyncService` for delta-sync logic
3. Integrate sync on login and token refresh
4. Update story loading to use synced metadata

## 🐛 Troubleshooting

### Upload script fails
- Check service account key path
- Verify Firebase project ID
- Ensure Firestore is enabled in Firebase Console

### Functional tests fail
- Ensure stories are uploaded to Firestore first
- Check Docker containers are running
- Verify gateway service can connect to Firestore

### API returns empty stories
- Run upload script to populate Firestore
- Check Firestore security rules allow read access
- Verify indexes are deployed

## 📚 Files Created

### Backend
- `gateway-service/src/main/java/com/app/model/Story.java`
- `gateway-service/src/main/java/com/app/model/StoryPage.java`
- `gateway-service/src/main/java/com/app/model/ContentVersion.java`
- `gateway-service/src/main/java/com/app/repository/StoryRepository.java`
- `gateway-service/src/main/java/com/app/repository/ContentVersionRepository.java`
- `gateway-service/src/main/java/com/app/service/StoryService.java`
- `gateway-service/src/main/java/com/app/controller/StoryController.java`

### Testing
- `func-tests/src/test/resources/features/story-cms.feature`
- `func-tests/src/test/java/com/app/functest/stepdefs/StoryCmsStepDefs.java`

### CI/CD
- `scripts/upload-stories-to-firestore.js`
- `scripts/package.json`
- `.github/workflows/story-cms-deploy.yml`

