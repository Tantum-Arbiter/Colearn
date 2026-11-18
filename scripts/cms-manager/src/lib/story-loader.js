import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

export const CMS_STORIES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'cms-stories');

const STORY_FILE = 'story-data.json';

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(root, relative = '') {
  const entries = await fs.readdir(path.join(root, relative), { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.')) continue;
    const child = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...await listFiles(root, child));
    } else if (child !== STORY_FILE) {
      files.push(child);
    }
  }
  return files;
}

export function createStoryStore(storiesDir) {
  const storyFile = (id) => path.join(storiesDir, id, STORY_FILE);

  async function loadStory(id) {
    if (!await exists(storyFile(id))) return null;
    try {
      return { id, data: JSON.parse(await fs.readFile(storyFile(id), 'utf8')) };
    } catch (error) {
      return { id, data: null, error: error.message };
    }
  }

  async function loadAllStories() {
    const entries = await fs.readdir(storiesDir, { withFileTypes: true });
    const ids = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
    const stories = [];
    for (const id of ids) {
      const story = await loadStory(id);
      if (story) stories.push(story);
    }
    return stories;
  }

  async function saveStory(id, data) {
    await fs.mkdir(path.join(storiesDir, id), { recursive: true });
    await fs.writeFile(storyFile(id), `${JSON.stringify(data, null, 2)}\n`);
  }

  async function storyExists(id) {
    return exists(storyFile(id));
  }

  async function getStoryAssets(id) {
    if (!await exists(path.join(storiesDir, id))) return [];
    const files = await listFiles(path.join(storiesDir, id));
    return files.map((relativePath) => ({ relativePath, gcsPath: `stories/${id}/${relativePath}` }));
  }

  return { loadStory, loadAllStories, saveStory, storyExists, getStoryAssets };
}

const defaultStore = createStoryStore(CMS_STORIES_DIR);

export const { loadStory, loadAllStories, saveStory, storyExists, getStoryAssets } = defaultStore;
