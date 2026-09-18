import type { SupportedLanguage } from '@/services/i18n';
import { type LocalizedText, getLocalizedText } from '@/types/story';
import type { CatalogueStory } from './catalogue-story';

/** How many past searches the panel offers back. */
export const RECENT_SEARCH_LIMIT = 8;

/** Below this the results change on every keystroke and mean nothing. */
export const MIN_SEARCH_LENGTH = 2;

/**
 * A term reduced to what matching should care about.
 *
 * Accents are stripped so a child typing "cafe" still finds "Café", and case
 * and repeated spaces go the same way. Books arrive from two places -- the
 * bundle on the device and the catalogue the CMS serves -- and neither
 * promises a normalised title, so both sides of a comparison go through here.
 */
export function normaliseSearch(value: string): string {
  // Guarded rather than assumed: nothing else in the app calls normalize, so
  // this is the first place that would find out on a device if the engine
  // shipped without it. Without decomposition an accent simply stops matching
  // its bare letter, which is a poorer search rather than a crash.
  const decomposed = typeof value.normalize === 'function' ? value.normalize('NFD') : value;
  return decomposed
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * The strings a story offers to a search: what the child is reading, and the
 * English it falls back to. Both, because a catalogue served in one language
 * can still carry an English title the child has heard aloud.
 */
function readable(text: LocalizedText | undefined, language: SupportedLanguage): string[] {
  if (!text) return [];
  const values = [getLocalizedText(text, text.en, language), text.en];
  return Array.from(new Set(values.filter(Boolean)));
}

export type SearchField = 'title' | 'description';

export interface SearchHit {
  story: CatalogueStory;
  /** Which field matched: a title match is a better answer than a description one. */
  field: SearchField;
  /** True when the title begins with the term, the best answer of all. */
  startsWith: boolean;
}

function hitFor(story: CatalogueStory, term: string, language: SupportedLanguage): SearchHit | null {
  const titles = readable(story.title, language).map(normaliseSearch);
  if (titles.some((title) => title.startsWith(term))) {
    return { story, field: 'title', startsWith: true };
  }
  if (titles.some((title) => title.includes(term))) {
    return { story, field: 'title', startsWith: false };
  }
  const descriptions = readable(story.description, language).map(normaliseSearch);
  if (descriptions.some((description) => description.includes(term))) {
    return { story, field: 'description', startsWith: false };
  }
  return null;
}

/**
 * The books whose title or description carries the term.
 *
 * Ordered by how well they answer: titles that begin with what was typed,
 * then titles that contain it, then descriptions. Within each band the
 * caller's order is kept, so an installed book still comes before one that is
 * only a thumbnail from the catalogue.
 */
export function searchStories(
  stories: readonly CatalogueStory[],
  query: string,
  language: SupportedLanguage,
): CatalogueStory[] {
  const term = normaliseSearch(query);
  if (term.length < MIN_SEARCH_LENGTH) return [];

  const bands: CatalogueStory[][] = [[], [], []];
  for (const story of stories) {
    const hit = hitFor(story, term, language);
    if (!hit) continue;
    const band = hit.field === 'description' ? 2 : hit.startsWith ? 0 : 1;
    bands[band].push(hit.story);
  }

  return [...bands[0], ...bands[1], ...bands[2]];
}

/** True once the query is worth running, so the panel knows to leave history up. */
export function isSearching(query: string): boolean {
  return normaliseSearch(query).length >= MIN_SEARCH_LENGTH;
}

/**
 * The remembered searches with this one at the front.
 *
 * Repeating a search moves it up rather than adding it twice, and the term is
 * kept as it was typed -- it is offered back to the child to read, so only the
 * comparison is normalised.
 */
export function rememberSearch(recent: readonly string[], query: string): string[] {
  const term = query.trim().replace(/\s+/g, ' ');
  if (normaliseSearch(term).length < MIN_SEARCH_LENGTH) return [...recent];

  const key = normaliseSearch(term);
  const rest = recent.filter((entry) => normaliseSearch(entry) !== key);
  return [term, ...rest].slice(0, RECENT_SEARCH_LIMIT);
}
