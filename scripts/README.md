# Story CMS Upload Scripts

Scripts for uploading story metadata to Firestore.

## Prerequisites

1. **Firebase Service Account Key**
   - Download from Firebase Console → Project Settings → Service Accounts
   - Save as `service-account-key.json` (do NOT commit to git)

2. **Node.js 18+**
   ```bash
   node --version  # Should be >= 18.0.0
   ```

3. **Install Dependencies**
   ```bash
   cd scripts
   npm install
   ```

## Usage

### Upload Stories to Firestore

```bash
# Set environment variables
export FIREBASE_SERVICE_ACCOUNT_KEY_PATH=/path/to/service-account-key.json
export FIREBASE_PROJECT_ID=apt-icon-472307-b7

# Run upload script
npm run upload-stories
```

Or in one command:

```bash
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=./service-account-key.json \
FIREBASE_PROJECT_ID=apt-icon-472307-b7 \
npm run upload-stories
```

### What the Script Does

1. **Reads** all `story-data.json` files from `grow-with-freya/assets/stories/`
2. **Calculates** SHA-256 checksums for each story
3. **Uploads** story metadata to Firestore `stories` collection
4. **Updates** `content_versions/current` document with:
   - Incremented version number
   - Story checksums map
   - Total story count
   - Last updated timestamp

### Output Example

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
   Timestamp: 2025-01-25T10:30:00.000Z
```

## CI/CD Integration

See `.github/workflows/story-cms-deploy.yml` for automated deployment on story changes.

## Firestore Collections

### `stories` Collection
- Document ID: Story ID (e.g., `snuggle-little-wombat`)
- Fields: id, title, category, pages[], version, checksum, etc.

### `content_versions` Collection
- Document ID: `current` (singleton)
- Fields: version, storyChecksums{}, totalStories, lastUpdated

## Security

⚠️ **NEVER commit service account keys to git!**

Add to `.gitignore`:
```
scripts/service-account-key.json
**/service-account-key*.json
```

