#!/bin/bash

# Script to create a new story directory structure
# Usage: ./create-story-structure.sh "story-name" "Story Title"

if [ $# -eq 0 ]; then
    echo "Usage: $0 <story-id> [story-title]"
    echo "Example: $0 'magical-forest' 'The Magical Forest Adventure'"
    exit 1
fi

STORY_ID="$1"
STORY_TITLE="${2:-$1}"

# Create the main story directory
STORY_DIR="assets/stories/$STORY_ID"

echo "Creating story structure for: $STORY_ID"

# Create all directories
mkdir -p "$STORY_DIR"/{props,characters,cover}
mkdir -p "$STORY_DIR"/page-{1..8}

# Create placeholder files
touch "$STORY_DIR/cover/thumbnail.webp"
touch "$STORY_DIR/cover/cover-large.webp"

# Create background files for each page
for i in {1..8}; do
    touch "$STORY_DIR/page-$i/background.webp"
done

# Create a basic story data JSON template
cat > "$STORY_DIR/story-data.json" << EOF
{
  "id": "$STORY_ID",
  "title": "$STORY_TITLE",
  "category": "bedtime",
  "tag": "🌙 Bedtime",
  "emoji": "📚",
  "coverImage": "assets/stories/$STORY_ID/cover/thumbnail.webp",
  "isAvailable": true,
  "ageRange": "2-5",
  "duration": 8,
  "description": "A wonderful story about...",
  "pages": [
    {
      "id": "$STORY_ID-1",
      "pageNumber": 1,
      "backgroundImage": "assets/stories/$STORY_ID/page-1/background.webp",
      "characterImage": "assets/stories/$STORY_ID/characters/main-character.webp",
      "text": "Once upon a time..."
    },
    {
      "id": "$STORY_ID-2",
      "pageNumber": 2,
      "backgroundImage": "assets/stories/$STORY_ID/page-2/background.webp",
      "characterImage": "assets/stories/$STORY_ID/characters/main-character.webp",
      "text": "Page 2 text..."
    },
    {
      "id": "$STORY_ID-3",
      "pageNumber": 3,
      "backgroundImage": "assets/stories/$STORY_ID/page-3/background.webp",
      "characterImage": "assets/stories/$STORY_ID/characters/main-character.webp",
      "text": "Page 3 text..."
    },
    {
      "id": "$STORY_ID-4",
      "pageNumber": 4,
      "backgroundImage": "assets/stories/$STORY_ID/page-4/background.webp",
      "characterImage": "assets/stories/$STORY_ID/characters/main-character.webp",
      "text": "Page 4 text..."
    },
    {
      "id": "$STORY_ID-5",
      "pageNumber": 5,
      "backgroundImage": "assets/stories/$STORY_ID/page-5/background.webp",
      "characterImage": "assets/stories/$STORY_ID/characters/main-character.webp",
      "text": "Page 5 text..."
    },
    {
      "id": "$STORY_ID-6",
      "pageNumber": 6,
      "backgroundImage": "assets/stories/$STORY_ID/page-6/background.webp",
      "characterImage": "assets/stories/$STORY_ID/characters/main-character.webp",
      "text": "Page 6 text..."
    },
    {
      "id": "$STORY_ID-7",
      "pageNumber": 7,
      "backgroundImage": "assets/stories/$STORY_ID/page-7/background.webp",
      "characterImage": "assets/stories/$STORY_ID/characters/main-character.webp",
      "text": "Page 7 text..."
    },
    {
      "id": "$STORY_ID-8",
      "pageNumber": 8,
      "backgroundImage": "assets/stories/$STORY_ID/page-8/background.webp",
      "characterImage": "assets/stories/$STORY_ID/characters/main-character.webp",
      "text": "The End."
    }
  ]
}
EOF

echo "✅ Story structure created successfully!"
echo "📁 Directory: $STORY_DIR"
echo "📝 Next steps:"
echo "   1. Add your WebP images to the appropriate folders"
echo "   2. Edit $STORY_DIR/story-data.json with your story content"
echo "   3. Add your story to grow-with-freya/data/stories.ts"
echo ""
echo "📂 Directory structure:"
tree "$STORY_DIR" 2>/dev/null || find "$STORY_DIR" -type d | sed 's|[^/]*/|  |g'
