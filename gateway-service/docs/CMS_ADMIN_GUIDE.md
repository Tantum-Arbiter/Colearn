# CMS & Story Management Guide

This guide covers how to add, update, and manage stories in the Colearn CMS system.

## Table of Contents

- [Overview](#overview)
- [Story Types](#story-types)
- [Adding a New CMS Story](#adding-a-new-cms-story)
- [Story File Structure](#story-file-structure)
- [Syncing Stories to GCP](#syncing-stories-to-gcp)
- [Testing Stories Locally](#testing-stories-locally)
- [Deleting Stories](#deleting-stories)
- [Delta Sync Testing](#delta-sync-testing)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Colearn CMS system manages stories through two mechanisms:

1. **Bundled Stories** - Shipped with the app in `grow-with-freya/assets/stories/`
2. **CMS Stories** - Dynamically synced from GCS/Firestore in `scripts/cms-stories/`

### How Story Sync Works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  CMS Stories    │────▶│  GitHub Actions │────▶│  GCS Bucket     │
│  (scripts/      │     │  (cms-sync.yml) │     │  (assets)       │
│   cms-stories/) │     │                 │     │                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │  Firestore      │────▶│  Mobile App     │
                        │  (metadata)     │     │  (delta sync)   │
                        └─────────────────┘     └─────────────────┘
```

---

## Story Types

| Type | Location | Sync Method | Use Case |
|------|----------|-------------|----------|
| **Bundled** | `grow-with-freya/assets/stories/` | App update | Core stories, always available offline |
| **CMS** | `scripts/cms-stories/` | GitHub Actions | New content, A/B testing, seasonal stories |

---

## Adding a New CMS Story

### Step 1: Create Story Directory

```bash
cd scripts/cms-stories

# Create new story directory (use kebab-case)
mkdir my-new-story

# Create required files
touch my-new-story/story-data.json
touch my-new-story/cover.webp
mkdir my-new-story/pages
```

### Step 2: Create story-data.json

```json
{
  "id": "my-new-story",
  "title": "My New Story",
  "localizedTitle": {
    "en": "My New Story",
    "pl": "Moja Nowa Historia",
    "es": "Mi Nueva Historia",
    "de": "Meine Neue Geschichte"
  },
  "category": "adventure",
  "ageRange": "3-6",
  "readingTime": 5,
  "version": 1,
  "pages": [
    {
      "pageNumber": 0,
      "type": "cover",
      "image": "cover.webp"
    },
    {
      "pageNumber": 1,
      "type": "content",
      "image": "pages/page1.webp",
      "text": "Once upon a time...",
      "localizedText": {
        "en": "Once upon a time...",
        "pl": "Dawno, dawno temu...",
        "es": "Érase una vez...",
        "de": "Es war einmal..."
      }
    }
  ]
}
```

### Step 3: Add Story Assets

```bash
# Add cover image (recommended: 800x600 WebP)
cp /path/to/cover.webp my-new-story/cover.webp

# Add page images
cp /path/to/page1.webp my-new-story/pages/page1.webp
cp /path/to/page2.webp my-new-story/pages/page2.webp
```

### Step 4: Validate Story

```bash
# Install validation tool
npm install -g ajv-cli

# Validate against schema
ajv validate -s scripts/story-schema.json \
  -d scripts/cms-stories/my-new-story/story-data.json \
  --strict=false
```

### Step 5: Commit and Push

```bash
git add scripts/cms-stories/my-new-story/
git commit -m "feat: Add new story - My New Story"
git push origin main
```

The GitHub Actions workflow will automatically:
1. Validate the story schema
2. Sync assets to GCS bucket
3. Upload metadata to Firestore

---

## Story File Structure

```
scripts/cms-stories/
└── my-new-story/
    ├── story-data.json      # Story metadata (required)
    ├── cover.webp           # Cover image (required)
    └── pages/
        ├── page1.webp       # Page images
        ├── page2.webp
        └── ...
```

### story-data.json Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique story ID (kebab-case) |
| `title` | string | ✅ | Display title |
| `localizedTitle` | object | ❌ | Translations {en, pl, es, de} |
| `category` | string | ✅ | Story category |
| `ageRange` | string | ✅ | Target age range (e.g., "3-6") |
| `readingTime` | number | ✅ | Estimated reading time in minutes |
| `version` | number | ✅ | Story version (increment on updates) |
| `pages` | array | ✅ | Array of page objects |

### Page Object Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pageNumber` | number | ✅ | Page index (0 = cover) |
| `type` | string | ✅ | "cover" or "content" |
| `image` | string | ✅ | Relative path to image |
| `text` | string | ❌ | Page text (content pages) |
| `localizedText` | object | ❌ | Translations {en, pl, es, de} |

---

## Syncing Stories to GCP

### Automatic Sync (Recommended)

Stories are automatically synced when you push to `main` branch:

1. Push changes to `scripts/cms-stories/`
2. GitHub Actions runs `cms-stories-sync.yml`
3. Assets sync to GCS bucket
4. Metadata uploads to Firestore
5. Mobile apps receive updates on next sync

### Manual Sync via GitHub Actions

```bash
# Go to GitHub Actions
# Select "CMS Stories Sync" workflow
# Click "Run workflow"
# Choose options:
#   - upload_mode: cms-only | bundled | all
#   - dry_run: true (validate only) | false (actually sync)
#   - force_upload: false (delta) | true (re-upload all)
```

### Manual Sync via CLI

```bash
cd scripts

# Install dependencies
npm install

# Sync to GCP production
GCP_SA_KEY=<base64-encoded-key> \
FIREBASE_PROJECT_ID=apt-icon-472307-b7 \
UPLOAD_MODE=cms-only \
node upload-stories-to-firestore.js

# Upload asset checksums
GCP_SA_KEY=<base64-encoded-key> \
FIREBASE_PROJECT_ID=apt-icon-472307-b7 \
node upload-assets-to-firestore.js
```

### Upload Modes

| Mode | Description |
|------|-------------|
| `cms-only` | Only sync stories from `scripts/cms-stories/` |
| `bundled` | Only sync stories from `grow-with-freya/assets/stories/` |
| `all` | Sync both CMS and bundled stories |

---

## Testing Stories Locally

### Using Firestore Emulator

```bash
# Start local stack
docker-compose up -d

# Upload stories to emulator
cd scripts
FIRESTORE_EMULATOR_HOST=localhost:8082 \
FIREBASE_PROJECT_ID=grow-with-freya-dev \
UPLOAD_MODE=all \
node upload-stories-to-firestore.js

# Start mobile app pointing to local gateway
cd ../grow-with-freya
EXPO_PUBLIC_GATEWAY_URL=http://192.168.1.219:8080 npx expo start -c
```

### Verifying Story Sync

```bash
# Check Firestore emulator data
curl http://localhost:8082/v1/projects/grow-with-freya-dev/databases/(default)/documents/stories

# Check content version
curl http://localhost:8082/v1/projects/grow-with-freya-dev/databases/(default)/documents/content_versions/current
```

---

## Deleting Stories

### Delete from CMS

```bash
# Remove story directory
rm -rf scripts/cms-stories/my-old-story/

# Commit and push
git add -A
git commit -m "chore: Remove old story"
git push origin main
```

### Delete from Firestore (Manual)

```bash
# Using Firebase CLI
firebase firestore:delete stories/my-old-story --project apt-icon-472307-b7

# Or via GCP Console
# 1. Go to Firestore in GCP Console
# 2. Navigate to stories collection
# 3. Select document and delete
```

### Delete from GCS (Manual)

```bash
# Delete story assets from bucket
gsutil rm -r gs://colearnwithfreya-assets/stories/my-old-story/
```

> **Note**: Deleting from CMS directory and pushing to main will NOT automatically delete from GCS/Firestore. Manual cleanup is required.

---

## Delta Sync Testing

The system uses checksums to only sync changed stories. To test delta sync:

### Modify a Story

```bash
cd scripts

# Apply test modification to cms-test-9-snowman-squirrel
node modify-cms-story.js

# Check current state
node modify-cms-story.js --check

# Revert to original
node modify-cms-story.js --revert
```

### Verify Delta Sync

```bash
# Upload to local emulator
FIRESTORE_EMULATOR_HOST=localhost:8082 \
FIREBASE_PROJECT_ID=grow-with-freya-dev \
UPLOAD_MODE=cms-only \
node upload-stories-to-firestore.js

# Check gateway logs - should show only 1 story synced
docker-compose logs -f gateway-service | grep "Sync"
```

### Force Full Re-upload

```bash
# Ignore checksums and re-upload everything
FIRESTORE_EMULATOR_HOST=localhost:8082 \
FIREBASE_PROJECT_ID=grow-with-freya-dev \
UPLOAD_MODE=all \
FORCE_UPLOAD=true \
node upload-stories-to-firestore.js
```

---

## Troubleshooting

### Story Not Appearing in App

1. **Check Firestore** - Verify story document exists
2. **Check content_versions** - Ensure version was incremented
3. **Check GCS** - Verify assets were uploaded
4. **Force app sync** - Log out and log back in

### Validation Errors

```bash
# Validate story schema
ajv validate -s scripts/story-schema.json \
  -d scripts/cms-stories/my-story/story-data.json \
  --strict=false --verbose
```

### Asset Not Loading

1. **Check GCS bucket** - `gsutil ls gs://colearnwithfreya-assets/stories/my-story/`
2. **Check asset checksums** - Verify in Firestore `asset_checksums` collection
3. **Check image format** - Must be WebP format

### Sync Failed in GitHub Actions

1. Check workflow logs in GitHub Actions
2. Verify `GCP_SA_KEY` secret is set correctly
3. Check service account has required permissions

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Duplicate story IDs found` | Same ID in CMS and bundled | Use unique IDs |
| `Schema validation failed` | Invalid story-data.json | Check required fields |
| `Permission denied` | Service account issue | Check GCP IAM permissions |
| `Asset not found` | Missing image file | Add missing assets |

---

## Related Documentation

- [Development Guide](./DEVELOPMENT_GUIDE.md) - Local development setup
- [API Reference](../README.md) - Full API documentation
- [Story Schema](../../scripts/story-schema.json) - JSON schema for validation

