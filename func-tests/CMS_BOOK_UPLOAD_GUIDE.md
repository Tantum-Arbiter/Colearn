# CMS Book Upload Guide

## Overview

After functional tests complete, the system automatically uploads 3 variations of the CMS squirrel snowman book to Firebase. This ensures you always have test data available even after tests clean up.

## Automatic Upload (After Tests)

The upload happens automatically when:
1. Functional tests complete successfully (`TEST_EXIT_CODE = 0`)
2. The `entrypoint.sh` script runs the `upload-cms-books.sh` script
3. 3 book variations are created with incrementing names:
   - `cms-test-1-squirrel-snowman` → "CMS test 1 - squirrel snowman"
   - `cms-test-2-squirrel-snowman` → "CMS test 2 - squirrel snowman"
   - `cms-test-3-squirrel-snowman` → "CMS test 3 - squirrel snowman"

## Manual Upload

You can also manually upload books at any time:

### Prerequisites
- Gateway service running (default: `http://localhost:8080`)
- `jq` installed (for JSON processing)
- `curl` installed

### Run the Upload Script

```bash
cd func-tests

# Upload 3 variations (default)
./upload-cms-books.sh

# Upload to custom gateway URL
./upload-cms-books.sh http://api.example.com

# Upload custom number of variations
./upload-cms-books.sh http://localhost:8080 5
```

### Manual cURL Upload

If you prefer to upload a single book manually:

```bash
# Load the base story
STORY=$(cat src/test/resources/test-data/assets/stories/cms-squirrels-snowman/story-data.json)

# Modify ID and title
MODIFIED=$(echo "$STORY" | jq '.id = "cms-test-1-squirrel-snowman" | .title = "CMS test 1 - squirrel snowman"')

# Upload to gateway
curl -X POST \
  -H "Content-Type: application/json" \
  -d "$MODIFIED" \
  http://localhost:8080/private/seed/story
```

## Story Structure

Each uploaded book includes:
- **ID**: `cms-test-{N}-squirrel-snowman`
- **Title**: `CMS test {N} - squirrel snowman`
- **Category**: nature
- **Pages**: 11 pages with interactive elements
- **Assets**: References to squirrels-snowman image assets
- **Metadata**: Version, checksum, author, tags, etc.

## Firestore Collection

Books are stored in the `stories` collection:
```
Firestore
└── stories
    ├── cms-test-1-squirrel-snowman
    ├── cms-test-2-squirrel-snowman
    └── cms-test-3-squirrel-snowman
```

## Verify Upload

Check if books were uploaded successfully:

```bash
# Get all stories
curl http://localhost:8080/api/stories

# Get specific story
curl http://localhost:8080/api/stories/cms-test-1-squirrel-snowman

# Sync stories (delta-sync)
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"clientVersion": 0, "storyChecksums": {}}' \
  http://localhost:8080/api/stories/sync
```

## Troubleshooting

### Script not found
```bash
chmod +x func-tests/upload-cms-books.sh
```

### jq not installed
```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt-get install jq

# Docker (already included in test container)
```

### Gateway connection failed
- Ensure gateway service is running
- Check `GATEWAY_URL` environment variable
- Verify network connectivity

### Upload returns error
- Check gateway logs for `/private/seed/story` endpoint
- Verify story JSON is valid
- Ensure Firestore is accessible

## Environment Variables

- `GATEWAY_URL`: Gateway service URL (default: `http://localhost:8080`)
- `GCS_REPORTS_BUCKET`: Optional GCS bucket for test reports

## Notes

- Upload is non-critical; test failures won't block it
- Books persist in Firebase until manually deleted
- Each upload overwrites previous versions with same ID
- Asset references point to bundled app assets

