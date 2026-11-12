import { ImageSourcePropType } from 'react-native';
import {
  CatalogEntry,
  LocalizedText,
  STORY_FILTER_TAGS,
  Story,
  StoryCategory,
  StoryFilterTag,
} from '@/types/story';

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
    music: bookTheme(story.tags) === 'music',
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
    music: bookTheme(entry.tags) === 'music',
    free: entry.isFree,
    shareToUnlock: access.shareToUnlock,
    source: { kind: 'remote', entry },
  };
}

export type CatalogueMode = 'interactive' | 'music';

export function storyHasMusic(story: Story): boolean {
  return !!story.pages?.some((page) => page.interactionType === 'music_challenge');
}

export function storyHasInteractive(story: Story): boolean {
  return !!story.pages?.some((page) => page.interactiveElements && page.interactiveElements.length > 0);
}

/**
 * The two tiles the shelf is sorted under. A book is Music if it is tagged
 * so, else a Story: every book has exactly one
 * home, so the tiles between them show the whole shelf and nothing twice. A
 * story with a song on one page is still a story -- the bundled bedtime book
 * carries two music pages -- so music is read from the tag, not the pages.
 */
export type CatalogueTheme = 'stories' | 'music';
export const CATALOGUE_THEMES: readonly CatalogueTheme[] = ['stories', 'music'];

export function bookTheme(tags?: readonly string[]): CatalogueTheme {
  return tags?.includes('music') ? 'music' : 'stories';
}

export function storyTheme(story: CatalogueStory): CatalogueTheme {
  if (story.music) return 'music';
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
  if (tag === 'music') return { theme: tag, tags: [] };
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
 * The shelves under the featured panel. Each book stands on one shelf only,
 * though it may carry several themes: the fullest shelf is filled first --
 * the theme that gathers the most books not yet shelved -- then the next, so
 * the rows are as full as the catalogue allows and none repeats a title
 * (operator, 2026-11-12). Equally full shelves come in an order drawn afresh
 * each time the app opens. Every theme still finds a book through the
 * filters and See all, which match any of its themes.
 *
 * The books on the big cards -- the featured panel and the day's pick, which
 * stands after the second row -- are left out of the rows, unless that would
 * leave the rows with nothing at all. A book with no theme closes the shelf
 * as More Stories.
 */
export function buildShelves(stories: CatalogueStory[], plan: ShelfPlan): Shelf[] {
  const pickable = stories.filter((story) => story.source.kind === 'downloaded' && story.id !== plan.featuredId);
  const pick = pickable.length > 0
    ? pickable[Math.min(pickable.length - 1, Math.floor(plan.seed * pickable.length))]
    : null;

  const onBigCards = new Set([plan.featuredId, pick?.id].filter((id): id is string => !!id));
  const besideBigCards = stories.filter((story) => !onBigCards.has(story.id));
  const shelved = besideBigCards.length > 0 ? besideBigCards : stories;

  const themes = shuffled(Object.keys(STORY_FILTER_TAGS) as StoryFilterTag[], plan.seed);
  const claimed = new Set<string>();
  const rows: Shelf[] = [];
  for (;;) {
    const fullest = themes
      .map((tag) => ({ tag, stories: shelved.filter((story) => !claimed.has(story.id) && story.theme.includes(tag)) }))
      .reduce((best, row) => (row.stories.length > best.stories.length ? row : best), { tag: themes[0], stories: [] as CatalogueStory[] });
    if (fullest.stories.length === 0) break;
    fullest.stories.forEach((story) => claimed.add(story.id));
    rows.push({ kind: 'row', tag: fullest.tag, stories: fullest.stories });
  }

  if (pick) rows.splice(Math.min(PICK_AFTER_ROW, rows.length), 0, { kind: 'pick', story: pick });

  const unclaimed = shelved.filter((story) => !claimed.has(story.id));
  if (unclaimed.length > 0) rows.push({ kind: 'more', stories: unclaimed });

  return rows;
}

/**
 * The saved shelf: favourites grouped under the themes they belong to.
 *
 * Nothing is shuffled -- a shelf the child built themselves should be where
 * they left it, not rearranged on every launch -- and each story is claimed
 * by the first theme that matches, so no title appears twice.
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
  return true;
}

export function entryMatchesMode(entry: CatalogEntry, mode: CatalogueMode | null): boolean {
  if (mode === 'interactive') return !!entry.tags?.includes('interactive');
  if (mode === 'music') return !!entry.tags?.includes('music');
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

export interface ReadingRecord {
  pageIndex: number;
  totalPages: number;
  updatedAt: string;
}

export function continuingStoryId(progress: Record<string, ReadingRecord>): string | null {
  const underway = Object.entries(progress)
    .filter(([, record]) => record.pageIndex > 0 && record.pageIndex < record.totalPages)
    .sort(([, a], [, b]) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

  return underway.length > 0 ? underway[0][0] : null;
}

export function selectContinuing(stories: CatalogueStory[], storyId: string | null): CatalogueStory | null {
  if (!storyId) return null;
  const match = stories.find((story) => story.id === storyId && story.source.kind === 'downloaded');

  return match ?? null;
}

/**
 * The picture on the featured panel: for a book the child is part-way
 * through, the page they are on (`pageIndex`, as the reader counts it);
 * otherwise the book's cover, at full size where its cover page carries one,
 * else the shelf's thumbnail. A page without a picture falls back to the
 * cover (operator, 2026-11-12).
 */
export function featuredInsightImage(story: CatalogueStory, pageIndex?: number): ImageSourcePropType | string | undefined {
  if (story.source.kind !== 'downloaded') return story.coverArtwork;

  const pages = story.source.story.pages;
  const onPage = pageIndex === undefined ? undefined : pages?.[pageIndex]?.backgroundImage;
  if (onPage) return onPage;
  const cover = pages?.find((page) => page.type === 'cover' || page.pageNumber === 0);

  return cover?.backgroundImage ?? story.coverArtwork;
}
