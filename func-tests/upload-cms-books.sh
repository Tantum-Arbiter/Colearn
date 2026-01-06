#!/bin/bash

# Script to upload CMS squirrel snowman book variations to Firebase
# Usage: ./upload-cms-books.sh [gateway-url] [num-variations]
# Example: ./upload-cms-books.sh http://localhost:8080 3

set -e

GATEWAY_URL="${1:-http://localhost:8080}"
NUM_VARIATIONS="${2:-3}"

echo "=========================================="
echo "Uploading CMS Books to Firebase"
echo "Gateway URL: $GATEWAY_URL"
echo "Number of variations: $NUM_VARIATIONS"
echo "=========================================="

# Load the base story data
STORY_DATA_FILE="src/test/resources/test-data/assets/stories/cms-squirrels-snowman/story-data.json"

if [ ! -f "$STORY_DATA_FILE" ]; then
    echo "ERROR: Story data file not found: $STORY_DATA_FILE"
    exit 1
fi

# Read the base story
BASE_STORY=$(cat "$STORY_DATA_FILE")

# Upload variations
for i in $(seq 1 $NUM_VARIATIONS); do
    STORY_ID="cms-test-$i-squirrel-snowman"
    TITLE="CMS test $i - squirrel snowman"
    
    # Create modified story with new ID and title
    MODIFIED_STORY=$(echo "$BASE_STORY" | \
        jq --arg id "$STORY_ID" --arg title "$TITLE" \
        '.id = $id | .title = $title')
    
    echo ""
    echo "Uploading variation $i: $STORY_ID"
    
    # Upload to gateway's private seeding endpoint
    RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "$MODIFIED_STORY" \
        "$GATEWAY_URL/private/seed/story")
    
    # Check response
    if echo "$RESPONSE" | grep -q '"status"'; then
        echo "✓ Successfully uploaded: $STORY_ID"
        echo "  Response: $RESPONSE"
    else
        echo "✗ Failed to upload: $STORY_ID"
        echo "  Response: $RESPONSE"
        exit 1
    fi
done

echo ""
echo "=========================================="
echo "All $NUM_VARIATIONS CMS book variations uploaded successfully!"
echo "=========================================="

