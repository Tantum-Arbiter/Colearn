# Story Catalog - Bundled vs CMS Stories

This document describes the hybrid story architecture with bundled and CMS-managed stories.

## 📊 Story Distribution

### Total Stories: 24
- **Bundled Stories**: 18 (3 per genre × 6 genres)
- **CMS-Only Stories**: 6 (1 per genre × 6 genres)

### Strategy
- **Bundled stories** are included in the app bundle → Work offline, always available
- **CMS stories** are downloaded after login → Premium content, requires internet

## 📚 Story Breakdown by Genre

### 🌙 Bedtime (4 stories)
**Bundled (3):**
1. `snuggle-little-wombat` - Snuggle Little Wombat 🐨
2. `sleepy-forest` - The Sleepy Forest 🦉
3. `moonlight-lullaby` - Moonlight Lullaby 🌙

**CMS-Only (1):**
4. `starlight-dreams` - Starlight Dreams ✨ (Premium)

### 🗺️ Adventure (4 stories)
**Bundled (3):**
1. `treasure-island` - Treasure Island Adventure 🏴‍☠️
2. `mountain-climb` - The Great Mountain Climb ⛰️
3. `jungle-explorer` - Jungle Explorer 🦁

**CMS-Only (1):**
4. `pirate-adventure` - The Pirate's Secret ⚓ (Premium)

### 🐢 Nature (4 stories)
**Bundled (3):**
1. `butterfly-garden` - The Butterfly Garden 🦋
2. `ocean-friends` - Ocean Friends 🐠
3. `forest-walk` - A Walk in the Forest 🌲

**CMS-Only (1):**
4. `rainforest-rescue` - Rainforest Rescue 🦜 (Premium)

### 🤝 Friendship (4 stories)
**Bundled (3):**
1. `best-friends` - Best Friends Forever 🐻
2. `sharing-is-caring` - Sharing is Caring 🎁
3. `new-friend` - Making a New Friend 🐰

**CMS-Only (1):**
4. `kindness-club` - The Kindness Club 💝 (Premium)

### 📚 Learning (4 stories)
**Bundled (3):**
1. `counting-stars` - Counting Stars ⭐
2. `rainbow-colors` - Rainbow Colors 🌈
3. `abc-adventure` - ABC Adventure 🔤

**CMS-Only (1):**
4. `science-explorer` - Little Science Explorer 🔬 (Premium)

### ✨ Fantasy (4 stories)
**Bundled (3):**
1. `fairy-garden` - The Fairy Garden 🧚
2. `dragon-friend` - My Dragon Friend 🐉
3. `unicorn-dreams` - Unicorn Dreams 🦄

**CMS-Only (1):**
4. `wizard-school` - First Day at Wizard School 🪄 (Premium)

## 📁 File Structure

```
grow-with-freya/
├── assets/
│   └── stories/
│       ├── snuggle-little-wombat/
│       │   ├── cover/
│       │   ├── page-1/ ... page-8/
│       │   └── story-data.json
│       ├── sleepy-forest/
│       ├── moonlight-lullaby/
│       └── ... (18 bundled stories total)
│
├── data/
│   └── bundled-stories.ts  ← TypeScript definitions for bundled stories
│
└── services/
    └── story-loader.ts      ← Merges bundled + CMS stories

scripts/
├── cms-stories/             ← CMS-only story metadata
│   ├── starlight-dreams/
│   ├── pirate-adventure/
│   └── ... (6 CMS stories total)
│
├── story-catalog.json       ← Master catalog of all stories
├── generate-story-files.js  ← Generate story-data.json files
└── upload-stories-to-firestore.js  ← Upload to Firestore
```

## 🔄 How It Works

### 1. App Launch (Offline)
```typescript
const stories = await StoryLoader.getStories();
// Returns: 18 bundled stories (works offline)
```

### 2. After Login (Online)
```typescript
// Login triggers story sync
await StorySyncService.prefetchStories();

const stories = await StoryLoader.getStories();
// Returns: 18 bundled + 6 CMS = 24 total stories
```

### 3. Story Loading Logic
```typescript
// StoryLoader.getStories() merges:
// 1. Bundled stories (always available)
// 2. CMS stories (if synced)
// 3. No duplicates (CMS can override bundled if same ID)
```

## 🛠️ Development Workflow

### Generate Story Files
```bash
cd scripts
node generate-story-files.js
```
Creates `story-data.json` for all 24 stories.

### Generate TypeScript Definitions
```bash
cd scripts
node generate-bundled-stories-ts.js
```
Creates `grow-with-freya/data/bundled-stories.ts`.

### Upload to Firestore

**Upload CMS-only stories (recommended):**
```bash
cd scripts
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=./service-account-key.json \
FIREBASE_PROJECT_ID=apt-icon-472307-b7 \
npm run upload-cms-stories
```

**Upload bundled stories (for testing):**
```bash
npm run upload-bundled-stories
```

**Upload all stories:**
```bash
npm run upload-all-stories
```

## 📱 Mobile App Integration

### Check Story Type
```typescript
const isBundled = StoryLoader.isBundledStory('snuggle-little-wombat');
// true - bundled story

const isBundled = StoryLoader.isBundledStory('starlight-dreams');
// false - CMS-only story
```

### Get Story Counts
```typescript
const counts = await StoryLoader.getStoryCounts();
// { bundled: 18, cms: 6, total: 24 }
```

### Get CMS Stories Only
```typescript
const cmsStories = await StoryLoader.getCmsStories();
// Returns only the 6 premium CMS stories
```

## 🎯 Benefits

✅ **Offline-first**: 18 stories work without internet
✅ **Premium content**: 6 CMS stories for paid users
✅ **No app updates**: Add new CMS stories without app store review
✅ **Delta-sync**: Only download changed stories
✅ **Flexible**: Can override bundled stories with CMS versions

## 🚀 Next Steps

1. ✅ Generate story files
2. ✅ Create bundled-stories.ts
3. ✅ Update StoryLoader
4. ⏳ Upload CMS stories to Firestore
5. ⏳ Test hybrid loading
6. ⏳ Add actual assets (images, audio)

