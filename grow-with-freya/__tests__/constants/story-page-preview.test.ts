/**
 * Tests for the story card's page preview.
 *
 * While the card is open its cover turns, every few seconds, to the next
 * page of the book, so the pair get a glimpse of what is inside before they
 * choose how to read. The turn is a real page turn: the right-hand half of
 * the picture lifts at the spine and folds over to the left, showing the
 * next page on its back and uncovering the rest of it beneath.
 */

import type { ImageSourcePropType } from 'react-native';
import {
  STORY_PAGE_PREVIEW,
  castShadows,
  frameKey,
  leafFaces,
  leafPose,
  leafShade,
  nextFrame,
  previewFrames,
} from '@/constants/story-page-preview';
import type { Story, StoryPage } from '@/types/story';

const art = (name: string) => ({ uri: `test://${name}` }) as unknown as string;

function page(pageNumber: number, extra: Partial<StoryPage> = {}): StoryPage {
  return { id: `p${pageNumber}`, pageNumber, text: 'words', ...extra };
}

function story(extra: Partial<Story> = {}): Story {
  return {
    id: 'juni',
    title: 'Hold On, Juni',
    category: 'growing',
    isAvailable: true,
    coverImage: art('cover') as unknown as ImageSourcePropType,
    pages: [
      page(0, { type: 'cover', backgroundImage: art('cover-full') }),
      page(1, { type: 'story', backgroundImage: art('page-1') }),
      page(2, { type: 'story', backgroundImage: art('page-2') }),
      page(3, { type: 'story', backgroundImage: art('page-3') }),
    ],
    ...extra,
  };
}

const uris = (frames: ImageSourcePropType[]) => frames.map((frame) => frameKey(frame));

describe('previewFrames', () => {
  it('should start on the cover and then show the pages of the book in order', () => {
    const underTest = previewFrames(story());

    expect(uris(underTest)).toEqual(['test://cover', 'test://page-1', 'test://page-2', 'test://page-3']);
  });

  it('should not show the cover twice: the cover page of the book is skipped', () => {
    const underTest = previewFrames(story());

    expect(uris(underTest)).not.toContain('test://cover-full');
  });

  it('should skip pages that have no picture rather than turning to a blank', () => {
    const underTest = previewFrames(story({ pages: [page(1, { backgroundImage: art('page-1') }), page(2), page(3, { backgroundImage: art('page-3') })] }));

    expect(uris(underTest)).toEqual(['test://cover', 'test://page-1', 'test://page-3']);
  });

  it('should show each picture once even when pages share one', () => {
    const underTest = previewFrames(story({ pages: [page(1, { backgroundImage: art('same') }), page(2, { backgroundImage: art('same') })] }));

    expect(uris(underTest)).toEqual(['test://cover', 'test://same']);
  });

  it('should read page pictures given as web addresses', () => {
    const underTest = previewFrames(story({ coverImage: 'https://cdn/cover.webp', pages: [page(1, { backgroundImage: 'https://cdn/p1.webp' })] }));

    expect(underTest).toEqual([{ uri: 'https://cdn/cover.webp' }, { uri: 'https://cdn/p1.webp' }]);
  });

  it('should read bundled pictures given as asset numbers', () => {
    const underTest = previewFrames(story({ coverImage: 7, pages: [page(1, { backgroundImage: 8 as unknown as string })] }));

    expect(underTest).toEqual([7, 8]);
  });

  it('should give only a glimpse: no more than the first few pages after the cover', () => {
    const many = Array.from({ length: STORY_PAGE_PREVIEW.maxPages + 4 }, (_, i) => page(i + 1, { backgroundImage: art(`page-${i + 1}`) }));

    const underTest = previewFrames(story({ pages: many }));

    expect(underTest).toHaveLength(STORY_PAGE_PREVIEW.maxPages + 1);
    expect(uris(underTest)[underTest.length - 1]).toBe(`test://page-${STORY_PAGE_PREVIEW.maxPages}`);
  });

  it('should leave a book with only a cover on its cover', () => {
    const underTest = previewFrames(story({ pages: [page(1), page(2)] }));

    expect(uris(underTest)).toEqual(['test://cover']);
  });

  it('should have nothing to show for a book with no pictures at all', () => {
    const underTest = previewFrames(story({ coverImage: '', pages: undefined }));

    expect(underTest).toEqual([]);
  });
});

describe('nextFrame', () => {
  it.each([
    [0, 4, 1],
    [2, 4, 3],
    [3, 4, 0],
  ])('should turn from frame %i of %i to frame %i, back to the cover after the last page', (from, count, expected) => {
    expect(nextFrame(from, count)).toBe(expected);
  });

  it.each([0, 1])('should stay put with %i frame(s)', (count) => {
    expect(nextFrame(0, count)).toBe(0);
  });
});

describe('the turning leaf', () => {
  it('should wait three seconds on each page and turn slowly enough to be easy on the eyes', () => {
    expect(STORY_PAGE_PREVIEW.dwellMs).toBe(3000);
    expect(STORY_PAGE_PREVIEW.turnMs).toBeGreaterThanOrEqual(1200);
    expect(STORY_PAGE_PREVIEW.turnMs).toBeLessThanOrEqual(2000);
    expect(STORY_PAGE_PREVIEW.fadeMs).toBeGreaterThanOrEqual(600);
  });

  it('should pivot on the spine: the leaf is the right half and folds about its left edge', () => {
    const underTest = leafPose(0, 400);

    expect(underTest.transform[0]).toEqual({ translateX: -100 });
    expect(underTest.transform[3]).toEqual({ translateX: 100 });
  });

  it('should fold flat in two dimensions, since a true 3D turn breaks the card\'s clipping on iOS', () => {
    const underTest = leafPose(0.3, 400);

    expect(underTest.transform.map((part) => Object.keys(part)[0])).toEqual(['translateX', 'scaleX', 'scaleY', 'translateX']);
  });

  it.each([
    [0, 1],
    [0.25, Math.SQRT1_2],
    [0.5, 0],
    [0.75, -Math.SQRT1_2],
    [1, -1],
  ])('should narrow to the spine and come out mirrored on the left: progress %s folds the leaf to %s of its width', (progress, scaleX) => {
    const underTest = leafPose(progress, 400).transform[1] as { scaleX: number };

    expect(underTest.scaleX).toBeCloseTo(scaleX, 6);
    expect(Object.is(underTest.scaleX, -0)).toBe(false);
  });

  it('should lift the leaf a little towards the child mid-turn and lay it flat at either end', () => {
    const bulge = (progress: number) => (leafPose(progress, 400).transform[2] as { scaleY: number }).scaleY;

    expect(bulge(0)).toBeCloseTo(1);
    expect(bulge(0.5)).toBeCloseTo(1 + STORY_PAGE_PREVIEW.liftBulge);
    expect(bulge(1)).toBeCloseTo(1);
    expect(STORY_PAGE_PREVIEW.liftBulge).toBeLessThanOrEqual(0.1);
  });

  it('should show the printed face until the leaf stands upright, then its back', () => {
    expect(leafFaces(0)).toEqual({ front: 1, back: 0 });
    expect(leafFaces(0.49)).toEqual({ front: 1, back: 0 });
    expect(leafFaces(0.5)).toEqual({ front: 0, back: 1 });
    expect(leafFaces(1)).toEqual({ front: 0, back: 1 });
  });

  it('should darken the face as it tilts away from the light and lighten it as it lands', () => {
    expect(leafShade(0).front).toBe(0);
    expect(leafShade(0.25).front).toBeGreaterThan(0);
    expect(leafShade(0.5).front).toBeCloseTo(STORY_PAGE_PREVIEW.leafShade);
    expect(leafShade(0.5).back).toBeCloseTo(STORY_PAGE_PREVIEW.leafShade);
    expect(leafShade(0.75).back).toBeLessThan(leafShade(0.5).back);
    expect(leafShade(1).back).toBe(0);
  });

  it('should cast a shadow on the page being uncovered that is deepest with the leaf upright and gone once it lands', () => {
    expect(castShadows(0).right).toBe(0);
    expect(castShadows(0.5).right).toBeCloseTo(STORY_PAGE_PREVIEW.castShade);
    expect(castShadows(1).right).toBeCloseTo(0);
  });

  it('should cast a shadow on the page being landed on only once the leaf is past upright', () => {
    expect(castShadows(0.25).left).toBe(0);
    expect(castShadows(0.5).left).toBe(0);
    expect(castShadows(0.75).left).toBeCloseTo(STORY_PAGE_PREVIEW.castShade);
    expect(castShadows(1).left).toBeCloseTo(0);
  });

  it('should never cast a shadow darker than the page shade, so the art stays readable', () => {
    const samples = Array.from({ length: 21 }, (_, i) => i / 20);

    const underTest = samples.every((p) => castShadows(p).left <= STORY_PAGE_PREVIEW.castShade && castShadows(p).right <= STORY_PAGE_PREVIEW.castShade);

    expect(underTest).toBe(true);
    expect(STORY_PAGE_PREVIEW.castShade).toBeLessThanOrEqual(0.6);
  });
});
