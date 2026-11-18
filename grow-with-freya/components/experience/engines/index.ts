import { CHALLENGE_FAMILIES, type ChallengeFamily } from '@/types/story';

export type EngineName = 'choose' | 'scene' | 'place' | 'instrument' | 'make';

export const ENGINE_FOR_FAMILY: Record<ChallengeFamily, EngineName> = {
  choose: 'choose',
  tap_scene: 'scene',
  sequence: 'place',
  music_audio: 'instrument',
  quantities: 'place',
  assign_sort: 'place',
  authored_sim: 'scene',
  snap_build: 'place',
  navigate: 'scene',
  trace_draw: 'make',
};

export const PAGE_ENGINES_BUILT: readonly EngineName[] = ['choose', 'scene'];

export const PAGE_FAMILIES_BUILT: readonly ChallengeFamily[] = ['choose', 'tap_scene'];

export function engineFor(family: ChallengeFamily): EngineName {
  return ENGINE_FOR_FAMILY[family];
}

export function isFamilyPlayable(family: unknown): family is ChallengeFamily {
  return typeof family === 'string' && (CHALLENGE_FAMILIES as readonly string[]).includes(family) && PAGE_FAMILIES_BUILT.includes(family as ChallengeFamily);
}
