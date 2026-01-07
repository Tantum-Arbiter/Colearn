# Quick Start: CMS Book Upload

## What Happens Automatically

After your functional tests run successfully, **3 CMS book variations are automatically uploaded to Firebase**:

```
✓ cms-test-1-squirrel-snowman → "CMS test 1 - squirrel snowman"
✓ cms-test-2-squirrel-snowman → "CMS test 2 - squirrel snowman"
✓ cms-test-3-squirrel-snowman → "CMS test 3 - squirrel snowman"
```

These books persist in Firebase even after tests clean up, so you always have test data available.

## Manual Upload (Anytime)

### Option 1: Run the Script (Easiest)

```bash
cd func-tests
./upload-cms-books.sh
```

### Option 2: Custom Gateway URL

```bash
cd func-tests
./upload-cms-books.sh https://api.colearnwithfreya.co.uk
```

### Option 3: Custom Number of Variations

```bash
cd func-tests
./upload-cms-books.sh http://localhost:8080 5  # Creates 5 variations instead of 3
```

## Verify Upload

```bash
# Check all stories
curl http://localhost:8080/api/stories | jq '.[] | {id, title}'

# Check specific story
curl http://localhost:8080/api/stories/cms-test-1-squirrel-snowman | jq '.title'

# Sync stories (what the app does)
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"clientVersion": 0, "storyChecksums": {}}' \
  http://localhost:8080/api/stories/sync | jq '.stories[] | {id, title}'
```

## What Gets Uploaded

Each book includes:
- ✓ 11 pages with full content
- ✓ Interactive elements (tap-to-reveal)
- ✓ Asset references (images)
- ✓ Metadata (category, tags, author, etc.)
- ✓ Version & checksum for delta-sync

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `command not found: jq` | `brew install jq` (macOS) or `apt-get install jq` (Linux) |
| `Connection refused` | Ensure gateway is running on the specified URL |
| `Permission denied` | Run `chmod +x func-tests/upload-cms-books.sh` |
| Upload fails silently | Check gateway logs: `docker logs gateway-service` |

## Full Documentation

See `CMS_BOOK_UPLOAD_GUIDE.md` for detailed information.

