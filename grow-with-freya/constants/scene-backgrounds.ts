/**
 * Night-scene backgrounds shared by the music screens and the instrument picker.
 *
 * The artwork is 1086x1448 (3:4 portrait). It is drawn full-bleed in every
 * orientation via a centre crop, so a landscape viewport loses the top and
 * bottom of the scene -see SceneBackground's focalBias.
 */

export const SCENE_BACKGROUNDS: number[] = [
  require('@/assets/images/scene-backgrounds/scene-1.webp'),
  require('@/assets/images/scene-backgrounds/scene-2.webp'),
  require('@/assets/images/scene-backgrounds/scene-3.webp'),
  require('@/assets/images/scene-backgrounds/scene-4.webp'),
  require('@/assets/images/scene-backgrounds/scene-5.webp'),
];

export const SCENE_BACKGROUND_SOURCE_WIDTH = 1086;
export const SCENE_BACKGROUND_SOURCE_HEIGHT = 1448;
export const SCENE_BACKGROUND_ASPECT_RATIO =
  SCENE_BACKGROUND_SOURCE_WIDTH / SCENE_BACKGROUND_SOURCE_HEIGHT;

/** Deep navy behind the artwork so a not-yet-measured layout never flashes white. */
export const SCENE_BACKGROUND_FALLBACK_COLOR = '#141A47';

/**
 * Uniformly random scene, never the one passed as previousIndex.
 * Pure -callers own the "previous" value so this stays testable.
 */
export function pickSceneBackgroundIndex(previousIndex?: number): number {
  const count = SCENE_BACKGROUNDS.length;

  if (previousIndex === undefined || previousIndex < 0 || previousIndex >= count) {
    return Math.min(Math.floor(Math.random() * count), count - 1);
  }

  const drawn = Math.min(Math.floor(Math.random() * (count - 1)), count - 2);
  return drawn >= previousIndex ? drawn + 1 : drawn;
}

let lastSceneIndex: number | undefined;

/** Random scene that never repeats the previous caller's scene back-to-back. */
export function nextSceneBackgroundIndex(): number {
  lastSceneIndex = pickSceneBackgroundIndex(lastSceneIndex);
  return lastSceneIndex;
}

export function getSceneBackground(index: number): number {
  return SCENE_BACKGROUNDS[index] ?? SCENE_BACKGROUNDS[0];
}
