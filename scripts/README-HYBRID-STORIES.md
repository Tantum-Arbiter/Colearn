# Hybrid Story System - Quick Start Guide

## 🎯 What Was Built

A hybrid story system with:
- **18 bundled stories** (3 per genre) - Always available, work offline
- **6 CMS stories** (1 per genre) - Premium content, downloaded after login
- **24 total stories** across 6 genres

## 📦 Quick Commands

### Generate All Story Files
```bash
cd scripts
node generate-story-files.js
```
Creates `story-data.json` for all 24 stories.

### Generate TypeScript Bundled Stories
```bash
cd scripts
node generate-bundled-stories-ts.js
```
Creates `grow-with-freya/data/bundled-stories.ts`.

### Upload CMS Stories to Firestore
```bash
cd scripts

# Set environment variables
export FIREBASE_SERVICE_ACCOUNT_KEY_PATH=./service-account-key.json
export FIREBASE_PROJECT_ID=apt-icon-472307-b7

# Upload CMS-only stories (recommended)
npm run upload-cms-stories

# Or upload all stories
npm run upload-all-stories
```

## 📊 Story Catalog

### Genres (6 total)
1. 🌙 Bedtime
2. 🗺️ Adventure
3. 🐢 Nature
4. 🤝 Friendship
5. 📚 Learning
6. ✨ Fantasy

### Distribution
- **Bundled**: 3 stories per genre = 18 total
- **CMS-Only**: 1 premium story per genre = 6 total
- **Total**: 24 stories

## 🔄 How It Works

### Offline (No Login)
```
User opens app → 18 bundled stories available
```

### Online (After Login)
```
User logs in → CMS sync → 18 bundled + 6 CMS = 24 stories
```

### Story Loading
```typescript
// In your app
import { StoryLoader } from '@/services/story-loader';

// Get all stories (bundled + CMS)
const stories = await StoryLoader.getStories();

// Check if story is bundled
const isBundled = StoryLoader.isBundledStory('snuggle-little-wombat');

// Get counts
const counts = await StoryLoader.getStoryCounts();
// { bundled: 18, cms: 6, total: 24 }
```

## 📁 File Locations

### Bundled Stories
```
grow-with-freya/assets/stories/
├── snuggle-little-wombat/
├── sleepy-forest/
├── moonlight-lullaby/
├── treasure-island/
└── ... (18 total)
```

### CMS Stories
```
scripts/cms-stories/
├── starlight-dreams/
├── pirate-adventure/
├── rainforest-rescue/
└── ... (6 total)
```

### Generated Files
```
grow-with-freya/data/bundled-stories.ts  ← TypeScript definitions
scripts/story-catalog.json               ← Master catalog
```

## 🧪 Testing Locally

### 1. Test Bundled Stories (Offline)
```typescript
// Don't login - should see 18 bundled stories
const stories = await StoryLoader.getStories();
console.log(stories.length); // 18
```

### 2. Test CMS Stories (Online)
```bash
# Upload CMS stories to Firestore
cd scripts
npm run upload-cms-stories

# Then in app:
# Login → Sync → Should see 24 stories
const stories = await StoryLoader.getStories();
console.log(stories.length); // 24
```

### 3. Check Story Counts
```typescript
const counts = await StoryLoader.getStoryCounts();
console.log(counts);
// { bundled: 18, cms: 6, total: 24 }
```

## 🎨 Adding Assets

Currently, stories have placeholder content. To add real assets:

### For Bundled Stories
```
grow-with-freya/assets/stories/{story-id}/
├── cover/
│   ├── thumbnail.webp
│   └── cover-large.webp
├── page-1/
│   └── background.webp
├── page-2/
│   └── background.webp
└── ... (one folder per page)
```

### For CMS Stories
CMS stories reference asset paths but assets are NOT uploaded to Firestore.
Assets would be delivered via iOS/Android asset packs (future enhancement).

## 📝 NPM Scripts

```json
{
  "upload-cms-stories": "Upload only CMS stories (6)",
  "upload-bundled-stories": "Upload only bundled stories (18)",
  "upload-all-stories": "Upload all stories (24)",
  "generate-stories": "Generate story-data.json files",
  "generate-bundled-ts": "Generate bundled-stories.ts"
}
```

## ✅ What's Complete

- ✅ Story catalog with 24 stories
- ✅ Generated story-data.json files
- ✅ TypeScript bundled-stories.ts
- ✅ Updated StoryLoader to merge bundled + CMS
- ✅ Upload script with mode selection
- ✅ Helper methods for story management

## ⏳ Next Steps

1. Upload CMS stories to Firestore
2. Test hybrid loading in app
3. Add actual assets (images, audio) to bundled stories
4. Test offline/online scenarios

