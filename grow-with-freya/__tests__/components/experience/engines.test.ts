import { ENGINE_FOR_FAMILY, PAGE_ENGINES_BUILT, PAGE_FAMILIES_BUILT, engineFor, isFamilyPlayable } from '@/components/experience/engines';
import { CHALLENGE_FAMILIES } from '@/types/story';

describe('engineFor: every family names one engine', () => {
  it.each(CHALLENGE_FAMILIES)('%s has an engine', (family) => {
    expect(['choose', 'scene', 'place', 'instrument', 'make']).toContain(engineFor(family));
  });

  it.each([
    ['choose', 'choose'],
    ['tap_scene', 'scene'],
    ['sequence', 'place'],
    ['music_audio', 'instrument'],
    ['quantities', 'place'],
    ['assign_sort', 'place'],
    ['authored_sim', 'scene'],
    ['snap_build', 'place'],
    ['navigate', 'scene'],
    ['trace_draw', 'make'],
  ] as const)('%s plays on %s', (family, engine) => {
    expect(ENGINE_FOR_FAMILY[family]).toBe(engine);
  });
});

describe('isFamilyPlayable: a page offers its challenge only when its family has been built', () => {
  it.each(['choose', 'tap_scene'] as const)('%s is playable', (family) => {
    expect(isFamilyPlayable(family)).toBe(true);
    expect(PAGE_FAMILIES_BUILT).toContain(family);
  });

  it('every built family plays on a built engine', () => {
    expect(PAGE_FAMILIES_BUILT.map(engineFor).every((engine) => PAGE_ENGINES_BUILT.includes(engine))).toBe(true);
  });

  it.each(['authored_sim', 'navigate'] as const)('%s shares the scene engine but is not played yet', (family) => {
    expect(engineFor(family)).toBe('scene');
    expect(isFamilyPlayable(family)).toBe(false);
  });

  it.each(CHALLENGE_FAMILIES.filter((family) => !PAGE_FAMILIES_BUILT.includes(family)))('%s is not yet', (family) => {
    expect(isFamilyPlayable(family)).toBe(false);
  });

  it('an unknown family from a newer CMS is not playable', () => {
    expect(isFamilyPlayable('teleport')).toBe(false);
    expect(isFamilyPlayable(undefined)).toBe(false);
  });
});
