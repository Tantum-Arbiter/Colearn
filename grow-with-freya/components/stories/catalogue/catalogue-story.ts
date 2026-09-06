import { ImageSourcePropType } from 'react-native';
import {
  CatalogEntry,
  LocalizedText,
  STORY_FILTER_TAGS,
  Story,
  StoryCategory,
  StoryFilterTag,
} from '@/types/story';

/** The page the featured panel opens the book to, one-based. */
export const FEATURED_INSIGHT_PAGE = 3;

/**
 * Fixed for one run of the app: the featured book changes when the child
 * opens the app, not while they move around inside it.
 */
export const APP_LAUNCH_SEED = Math.random();

export type CatalogueStorySource =
  | { kind: 'downloaded'; story: Story }
  | { kind: 'remote'; entry: CatalogEntry };

export interface CatalogueStory {
  id: string;
  title: LocalizedText;
  /** A line or two about the story, for the featured panel. */
  description: LocalizedText | undefined;
  coverArtwork: ImageSourcePropType | string | undefined;
  category: StoryCategory;
  theme: StoryFilterTag[];
  /** How far the child has read, 0..1, or null when the book is not underway. */
  progress: number | null;
  locked: boolean;
  audioAvailable: boolean;
  interactive: boolean;
  /** A book built around a learning game: a jigsaw, spelling or word challenge. */
  learningGame: boolean;
  /** A book of music: tagged so, not merely a story with a song in it. */
  music: boolean;
  free: boolean;
  shareToUnlock: boolean;
  source: CatalogueStorySource;
}

function toFilterTags(tags: string[] | undefined): StoryFilterTag[] {
  if (!tags) return [];
  return tags.filter((tag): tag is StoryFilterTag => tag in STORY_FILTER_TAGS);
}

function toLocalizedTitle(localized: LocalizedText | undefined, fallback: string): LocalizedText {
  return localized ?? { en: fallback };
}

export function fromStory(story: Story): CatalogueStory {
  return {
    id: story.id,
    title: toLocalizedTitle(story.localizedTitle, story.title),
    description: story.localizedDescription ?? (story.description ? { en: story.description } : undefined),
    coverArtwork: story.coverImage,
    category: story.category,
    theme: toFilterTags(story.tags),
    progress: null,
    locked: false,
    audioAvailable: Boolean(story.pages?.length),
    interactive: Boolean(story.pages?.some((page) => page.interactiveElements?.length)),
    learningGame: storyHasJigsaw(story) || storyHasReadingChallenge(story) || Boolean(story.tags?.includes('learning')),
    music: Boolean(story.tags?.includes('music')),
    free: story.isFree ?? false,
    shareToUnlock: false,
    source: { kind: 'downloaded', story },
  };
}

export interface RemoteAccess {
  locked: boolean;
  shareToUnlock: boolean;
}

export function fromCatalogEntry(entry: CatalogEntry, access: RemoteAccess): CatalogueStory {
  return {
    id: entry.storyId,
    title: toLocalizedTitle(entry.localizedTitle, entry.title),
    description: entry.localizedDescription ?? (entry.description ? { en: entry.description } : undefined),
    coverArtwork: entry.thumbnailUrl,
    category: entry.category,
    theme: toFilterTags(entry.tags),
    progress: null,
    locked: access.locked,
    audioAvailable: false,
    interactive: Boolean(entry.tags?.includes('interactive')),
    learningGame: Boolean(entry.tags?.some((tag) => tag === 'learning' || tag === 'jigsaw' || tag === 'spelling')),
    music: Boolean(entry.tags?.includes('music')),
    free: entry.isFree,
    shareToUnlock: access.shareToUnlock,
    source: { kind: 'remote', entry },
  };
}

export type CatalogueMode = 'interactive' | 'music' | 'jigsaw';

export function storyHasMusic(story: Story): boolean {
  return !!story.pages?.some((page) => page.interactionType === 'music_challenge');
}

export function storyHasInteractive(story: Story): boolean {
  return !!story.pages?.some((page) => page.interactiveElements && page.interactiveElements.length > 0);
}

export function storyHasJigsaw(story: Story): boolean {
  return !!story.pages?.some((page) => page.interactionType === 'jigsaw_puzzle');
}

export function storyHasReadingChallenge(story: Story): boolean {
  return !!story.pages?.some((page) => page.interactionType === 'reading_challenge');
}

/**
 * The three tiles the shelf is sorted under. A book is Music if it is tagged
 * so, else Learning if it is built around a game (a jigsaw, spelling or word
 * challenge, or the learning tag), else a Story: every book has exactly one
 * home, so the tiles between them show the whole shelf and nothing twice. A
 * story with a song on one page is still a story -- the bundled bedtime book
 * carries two music pages -- so music is read from the tag, not the pages.
 */
export type CatalogueTheme = 'stories' | 'learning' | 'music';
export const CATALOGUE_THEMES: readonly CatalogueTheme[] = ['stories', 'learning', 'music'];

export function storyTheme(story: CatalogueStory): CatalogueTheme {
  if (story.music) return 'music';
  if (story.learningGame) return 'learning';
  return 'stories';
}

export function filterByTheme(stories: CatalogueStory[], theme: CatalogueTheme): CatalogueStory[] {
  return stories.filter((story) => storyTheme(story) === theme);
}

export interface RecommendationTarget {
  theme?: CatalogueTheme;
  tags: StoryFilterTag[];
}

export function recommendationTarget(tag: StoryFilterTag | null): RecommendationTarget {
  if (tag === 'learning' || tag === 'music') return { theme: tag, tags: [] };
  return { tags: tag ? [tag] : [] };
}

export type Shelf =
  | { kind: 'row'; tag: StoryFilterTag; stories: CatalogueStory[] }
  | { kind: 'pick'; story: CatalogueStory }
  /** The books no theme row claims, so nothing on the shelf is out of reach. */
  | { kind: 'more'; stories: CatalogueStory[] };

export interface ShelfPlan {
  /** Fixed for one run of the app, so the shelves do not reshuffle underfoot. */
  seed: number;
  /** The book on the featured panel; the day's pick is never the same one. */
  featuredId: string | null;
}

/** A small, deterministic random source, so one seed always gives one order. */
function seededRandom(seed: number): () => number {
  let state = Math.floor(seed * 0xffffffff) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], seed: number): T[] {
  const random = seededRandom(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Where the day's pick stands among the rows: after the second, so the shelf opens with rows. */
const PICK_AFTER_ROW = 2;

/**
 * The shelves under the featured panel: a row for every theme tag with a book
 * to its name, in an order drawn afresh each time the app opens, with the
 * day's pick -- a second big panel -- standing among them. The same few books turn up in more than one row, as on any
 * shelf sorted by theme; what changes is which rows lead -- though a
 * row that would repeat exactly the books of one above it is left out. A book
 * with no theme to its name would appear in no row, so those close the shelf
 * as More Stories.
 */
export function buildShelves(stories: CatalogueStory[], plan: ShelfPlan): Shelf[] {
  // A row that would show exactly the books of a row above it says nothing new;
  // with a small shelf every theme would otherwise repeat the same one book
  const shown = new Set<string>();
  const rows: Shelf[] = shuffled(
    (Object.keys(STORY_FILTER_TAGS) as StoryFilterTag[])
      .map((tag) => ({ kind: 'row' as const, tag, stories: stories.filter((story) => story.theme.includes(tag)) }))
      .filter((row) => row.stories.length > 0),
    plan.seed,
  ).filter((row) => {
    const key = row.stories.map((story) => story.id).sort().join('|');
    if (shown.has(key)) return false;
    shown.add(key);
    return true;
  });

  const pickable = stories.filter((story) => story.source.kind === 'downloaded' && story.id !== plan.featuredId);
  if (pickable.length > 0) {
    const pick = pickable[Math.min(pickable.length - 1, Math.floor(plan.seed * pickable.length))];
    rows.splice(Math.min(PICK_AFTER_ROW, rows.length), 0, { kind: 'pick', story: pick });
  }

  const inARow = new Set(rows.flatMap((row) => (row.kind === 'row' ? row.stories.map((story) => story.id) : [])));
  const unclaimed = stories.filter((story) => !inARow.has(story.id));
  if (unclaimed.length > 0) rows.push({ kind: 'more', stories: unclaimed });

  return rows;
}

/**
 * The saved shelf: favourites grouped under the themes they belong to.
 *
 * Two deliberate differences from the catalogue's own shelves. Nothing is
 * shuffled -- a shelf the child built themselves should be where they left it,
 * not rearranged on every launch. And each story is claimed by the first theme
 * that matches rather than appearing under every one of them: across a whole
 * catalogue the repetition reads as variety, but across a handful of saved
 * books it reads as the same three titles over and over.
 */
export function buildSavedRows(stories: CatalogueStory[]): Shelf[] {
  const claimed = new Set<string>();

  const rows: Shelf[] = (Object.keys(STORY_FILTER_TAGS) as StoryFilterTag[])
    .map((tag) => {
      const inTag = stories.filter((story) => !claimed.has(story.id) && story.theme.includes(tag));
      inTag.forEach((story) => claimed.add(story.id));
      return { kind: 'row' as const, tag, stories: inTag };
    })
    .filter((row) => row.stories.length > 0);

  const unclaimed = stories.filter((story) => !claimed.has(story.id));
  if (unclaimed.length > 0) rows.push({ kind: 'more', stories: unclaimed });

  return rows;
}

export function storyMatchesMode(story: Story, mode: CatalogueMode | null): boolean {
  if (mode === 'interactive') return storyHasInteractive(story);
  if (mode === 'music') return storyHasMusic(story);
  if (mode === 'jigsaw') return storyHasJigsaw(story);
  return true;
}

export function entryMatchesMode(entry: CatalogEntry, mode: CatalogueMode | null): boolean {
  if (mode === 'interactive') return !!entry.tags?.includes('interactive');
  if (mode === 'music') return !!entry.tags?.includes('music');
  if (mode === 'jigsaw') return false;
  return true;
}

type Gendered = { gender?: 'boy' | 'girl' | 'unisex' };

export function matchesGender(item: Gendered, avatarType: string | null | undefined): boolean {
  if (!avatarType) return true;
  return !item.gender || item.gender === 'unisex' || item.gender === avatarType;
}

export interface FeaturedChoice {
  /** Fixed for one run of the app, so the book does not change underfoot. */
  seed: number;
  /** Whether a book came bundled with the app rather than being installed. */
  isPreInstalled: (storyId: string) => boolean;
}

/**
 * The book the featured panel offers, chosen afresh each time the app opens.
 *
 * Only a book the child can actually open is eligible, so remote entries are
 * never featured. A book the child installed is preferred; on a first run, or
 * once every downloaded book has been deleted, the panel falls back to the
 * ones that came bundled with the app so it always has something to show.
 */
export function selectFeatured(stories: CatalogueStory[], choice: FeaturedChoice): CatalogueStory | null {
  const installed = stories.filter((story) => story.source.kind === 'downloaded');
  if (installed.length === 0) return null;

  const chosenFrom = installed.filter((story) => !choice.isPreInstalled(story.id));
  const shelf = chosenFrom.length > 0 ? chosenFrom : installed;
  const index = Math.min(shelf.length - 1, Math.floor(choice.seed * shelf.length));

  return shelf[index];
}

/**
 * The picture the featured panel shows to give a glimpse inside: the third
 * page, rather than the cover the child has already seen on the shelf.
 *
 * Counted by the book rather than by the array. A story leads with its cover
 * as page zero, so the third page is the fourth entry; indexing blind lands on
 * page two. Books too short to have a third page, or whose third page carries
 * no picture, fall back to the cover.
 */
export function featuredInsightImage(story: CatalogueStory): ImageSourcePropType | string | undefined {
  if (story.source.kind !== 'downloaded') return story.coverArtwork;

  const pages = story.source.story.pages;
  const third = pages?.find((page) => page.pageNumber === FEATURED_INSIGHT_PAGE)
    ?? pages?.[FEATURED_INSIGHT_PAGE - 1];

  return third?.backgroundImage ?? story.coverArtwork;
}
