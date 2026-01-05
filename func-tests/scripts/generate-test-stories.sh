#!/bin/bash
# Generate 10 test CMS stories for functional testing
# These stories reuse the squirrels-snowman images but have unique text

CATEGORIES=("adventure" "bedtime" "nature" "emotions" "learning" "friendship" "fantasy" "animals" "seasons" "family")
EMOJIS=("🌟" "🌙" "🌲" "💫" "📚" "🤝" "🧙" "🐾" "🍂" "🏠")
TAGS=("🗺️ Adventure" "🌙 Bedtime" "🐢 Nature" "💫 Emotions" "📚 Learning" "🤝 Friendship" "🧙 Fantasy" "🐾 Animals" "🍂 Seasons" "🏠 Family")
TITLES=("The Adventure Begins" "Sweet Dreams Journey" "Nature's Wonders" "Feelings Garden" "Discovery Time" "Best Friends Forever" "Magic Kingdom" "Animal Friends" "Four Seasons" "Home Sweet Home")

OUTPUT_DIR="$(dirname "$0")/../src/test/resources/test-data/cms-stories"

for i in {1..10}; do
  idx=$((i - 1))
  cat > "$OUTPUT_DIR/test-story-$i.json" << EOF
{
  "id": "test-story-$i",
  "title": "Test Story $i - ${TITLES[$idx]}",
  "category": "${CATEGORIES[$idx]}",
  "tag": "${TAGS[$idx]}",
  "emoji": "${EMOJIS[$idx]}",
  "coverImage": "assets/stories/squirrels-snowman/cover/thumbnail.webp",
  "isAvailable": true,
  "ageRange": "2-5",
  "duration": $((5 + i)),
  "description": "Test story $i for CMS functional testing - ${TITLES[$idx]}.",
  "isPremium": $([ $i -le 3 ] && echo "false" || echo "true"),
  "author": "Test Author",
  "tags": ["test", "${CATEGORIES[$idx]}"],
  "version": 1,
  "checksum": "test-checksum-$i-v1",
  "pages": [
    {
      "id": "test-story-$i-cover",
      "pageNumber": 0,
      "type": "cover",
      "backgroundImage": "assets/stories/squirrels-snowman/cover/cover.webp",
      "text": "Test Story $i\\n\\n${TITLES[$idx]}"
    },
    {
      "id": "test-story-$i-page-1",
      "pageNumber": 1,
      "type": "story",
      "backgroundImage": "assets/stories/squirrels-snowman/page-1/page-1.webp",
      "text": "TEST STORY $i - Page 1.\\nThis is unique test content for story $i."
    },
    {
      "id": "test-story-$i-page-2",
      "pageNumber": 2,
      "type": "story",
      "backgroundImage": "assets/stories/squirrels-snowman/page-2/props/page-2.webp",
      "text": "TEST STORY $i - Page 2.\\nMore unique content to verify CMS loading."
    },
    {
      "id": "test-story-$i-page-3",
      "pageNumber": 3,
      "type": "story",
      "backgroundImage": "assets/stories/squirrels-snowman/page-3/page-3.webp",
      "text": "TEST STORY $i - Page 3.\\nThe ${CATEGORIES[$idx]} adventure continues."
    },
    {
      "id": "test-story-$i-page-4",
      "pageNumber": 4,
      "type": "story",
      "backgroundImage": "assets/stories/squirrels-snowman/page-4/page-4.webp",
      "text": "TEST STORY $i - Page 4.\\nValidating content delivery from CMS."
    },
    {
      "id": "test-story-$i-page-5",
      "pageNumber": 5,
      "type": "story",
      "backgroundImage": "assets/stories/squirrels-snowman/page-5/page-5.webp",
      "text": "TEST STORY $i - Page 5.\\nThe end of ${TITLES[$idx]}."
    }
  ]
}
EOF
  echo "Generated test-story-$i.json"
done

echo "All 10 test stories generated in $OUTPUT_DIR"

