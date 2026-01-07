# Asset Sync to Firestore

This script populates the Firestore `asset_versions/current` document with checksums of all assets in the GCS bucket.

## Purpose

The asset sync system works as follows:

1. **Client** sends its local asset checksums to the backend
2. **Backend** compares with server checksums and returns only changed/new assets
3. **Client** downloads and caches the changed assets
4. **Next sync** only downloads what's actually changed (delta-sync)

For this to work, the backend needs to know about all assets in the GCS bucket. This script scans the bucket and populates the Firestore database.

## Usage

### Automatic (CI/CD)

The script runs automatically in the GitHub Actions workflow after assets are synced to GCS:

```yaml
# .github/workflows/cms-stories-sync.yml
- name: Upload asset checksums to Firestore
  run: node upload-assets-to-firestore.js
  env:
    GCP_SA_KEY: ${{ secrets.GCP_SA_KEY }}
    FIREBASE_PROJECT_ID: apt-icon-472307-b7
```

### Manual

To run manually with proper GCP credentials:

```bash
cd scripts
npm install

# Set environment variables with your GCP service account key
export GCP_SA_KEY='{"type":"service_account","project_id":"...","...":"..."}'
export FIREBASE_PROJECT_ID="apt-icon-472307-b7"

# Run the script
node upload-assets-to-firestore.js
```

## What It Does

1. Lists all files in `gs://colearnwithfreya-assets/stories/`
2. Downloads each file and calculates SHA-256 checksum
3. Updates Firestore `asset_versions/current` with:
   - `assetChecksums`: Map of asset path → checksum
   - `totalAssets`: Total number of assets
   - `totalSizeBytes`: Total size of all assets
   - `version`: Incremented version number
   - `lastUpdated`: Current timestamp

## Output

```
Starting asset checksum upload...

Listing assets from GCS bucket...
Found 150 assets in bucket
  Processed 10 assets...
  Processed 20 assets...
  ...
Processed 150 assets total

Updating Firestore asset_versions/current...
✓ Asset version updated successfully
  - Total assets: 150
  - Total size: 45.23 MB
  - Version: 1

✓ Asset upload complete
```

## Troubleshooting

### "Service account object must contain a string 'project_id' property"

The `GCP_SA_KEY` environment variable is not a valid JSON service account key. Make sure it's a complete service account JSON with all required fields.

### "Error listing assets from bucket"

Check that:
- The service account has `storage.buckets.get` and `storage.objects.list` permissions
- The bucket name is correct: `colearnwithfreya-assets`
- The GCP project ID is correct

### "Error updating asset version"

Check that:
- The service account has `datastore.databases.update` permission
- Firestore is enabled in the GCP project
- The project ID is correct

