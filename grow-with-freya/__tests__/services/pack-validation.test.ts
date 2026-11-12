import { PACK_BUDGET_BYTES, validatePack, type PackFiles } from '@/services/pack-validation';
import type { GamePack } from '@/types/game-pack';

const FRAME = { x: 0, y: 0, w: 100, h: 100 };

function pack(): GamePack {
  return {
    id: 'test-pack',
    version: 1,
    checksum: 'abc',
    engine: 'place',
    world: 'island',
    storyId: 'snuggle-little-wombat',
    minAppVersion: '1.0.0',
    cover: 'cover.webp',
    art: {
      phone: { width: 1086, height: 1448, sky: '#000000', layers: [{ id: 'sky', file: 'art/phone/sky.webp', frame: FRAME, z: 0 }, { id: 'berry', file: 'art/phone/berry.webp', frame: FRAME, z: 2 }, { id: 'leaf', file: 'art/phone/leaf.webp', frame: FRAME, z: 1 }, { id: 'wombat', file: 'art/phone/wombat.webp', frame: FRAME, z: 3 }], starts: { 'berry-1': FRAME }, zones: { leaf: FRAME } },
      tablet: { width: 1448, height: 1086, sky: '#000000', layers: [{ id: 'sky', file: 'art/tablet/sky.webp', frame: FRAME, z: 0 }, { id: 'berry', file: 'art/tablet/berry.webp', frame: FRAME, z: 2 }, { id: 'leaf', file: 'art/tablet/leaf.webp', frame: FRAME, z: 1 }, { id: 'wombat', file: 'art/tablet/wombat.webp', frame: FRAME, z: 3 }], starts: { 'berry-1': FRAME }, zones: { leaf: FRAME } },
    },
    host: { objectId: 'wombat', reactions: { count: { move: 'bob', ms: 400, sound: 'pop' } } },
    objects: [
      { id: 'wombat', labelKey: 'packs.testPack.objects.wombat', layerByState: { idle: 'wombat' }, initial: 'idle' },
      { id: 'leaf', labelKey: 'packs.testPack.objects.leaf', layerByState: { plain: 'leaf' }, initial: 'plain' },
      { id: 'berry-1', kind: 'berry', labelKey: 'packs.testPack.objects.berry', layerByState: { idle: 'berry' }, initial: 'idle', placeable: { zones: ['leaf'] } },
    ],
    zones: [{ id: 'leaf', labelKey: 'packs.testPack.zones.leaf', accepts: ['berry'], capacity: 3 }],
    rules: [{ when: { dropInto: { zone: 'leaf' } }, then: [{ react: 'count' }, { play: 'pop' }] }],
    missions: [
      {
        id: 'picnic',
        titleKey: 'packs.testPack.missions.picnic.title',
        aimKey: 'packs.testPack.missions.picnic.aim',
        promptKey: 'packs.testPack.missions.picnic.prompt',
        grownUpKey: 'packs.testPack.missions.picnic.grownUp',
        byAge: {
          '1-2': { gesture: 'tap', stages: [{ goal: { berry: 1 }, promptKey: 'packs.testPack.missions.picnic.one' }] },
          '2-4': { gesture: 'tap-place', stages: [{ goal: { berry: 3 }, promptKey: 'packs.testPack.missions.picnic.three' }] },
          '4+': { gesture: 'drag', stages: [{ goal: { berry: 3 }, promptKey: 'packs.testPack.missions.picnic.three' }] },
        },
        rules: [{ when: { missionMet: true }, then: [{ complete: true }] }],
        bridgeActivityId: 'counting',
        minutes: [4, 7],
      },
    ],
    sounds: { pop: { file: 'sounds/pop.m4a' } },
    keys: [
      'packs.testPack.objects.wombat',
      'packs.testPack.objects.leaf',
      'packs.testPack.objects.berry',
      'packs.testPack.zones.leaf',
      'packs.testPack.missions.picnic.title',
      'packs.testPack.missions.picnic.aim',
      'packs.testPack.missions.picnic.prompt',
      'packs.testPack.missions.picnic.grownUp',
      'packs.testPack.missions.picnic.one',
      'packs.testPack.missions.picnic.three',
    ],
  };
}

const ALL_FILES = [
  'cover.webp',
  'art/phone/sky.webp', 'art/phone/berry.webp', 'art/phone/leaf.webp', 'art/phone/wombat.webp',
  'art/tablet/sky.webp', 'art/tablet/berry.webp', 'art/tablet/leaf.webp', 'art/tablet/wombat.webp',
  'sounds/pop.m4a',
];

function files(present: string[] = ALL_FILES, bytes = 1000): PackFiles {
  const sizes = new Map(present.map((path) => [path, bytes]));
  return { has: (path) => sizes.has(path), sizeOf: (path) => sizes.get(path) ?? 0, total: () => [...sizes.values()].reduce((sum, size) => sum + size, 0) };
}

function locale(keys: string[] = pack().keys): Record<string, unknown> {
  const tree: Record<string, unknown> = {};
  keys.forEach((key) => {
    let at = tree;
    const parts = key.split('.');
    parts.slice(0, -1).forEach((part) => {
      at[part] = at[part] ?? {};
      at = at[part] as Record<string, unknown>;
    });
    at[parts[parts.length - 1]] = key;
  });
  return tree;
}

const LOCALES = { en: locale(), fr: locale() };

describe('validatePack', () => {
  it('passes a pack whose files, keys, bands and budget are all in order', () => {
    expect(validatePack(pack(), files(), LOCALES)).toEqual([]);
  });

  it.each([
    ['a layer file', 'art/phone/berry.webp', 'file art/phone/berry.webp'],
    ['the cover', 'cover.webp', 'file cover.webp'],
    ['a sound', 'sounds/pop.m4a', 'file sounds/pop.m4a'],
  ])('fails on %s that is missing', (_, missing, expected) => {
    const errors = validatePack(pack(), files(ALL_FILES.filter((path) => path !== missing)), LOCALES);

    expect(errors.some((error) => error.includes(expected))).toBe(true);
  });

  it('fails on an object state naming a layer no crop has', () => {
    const broken = pack();
    broken.objects[0].layerByState.idle = 'nothing-of-the-sort';

    const errors = validatePack(broken, files(), LOCALES);

    expect(errors.some((error) => error.includes('layer nothing-of-the-sort'))).toBe(true);
  });

  it('fails on a layer present in one crop but not the other', () => {
    const broken = pack();
    broken.art.phone.layers = broken.art.phone.layers.filter((layer) => layer.id !== 'leaf');

    const errors = validatePack(broken, files(), LOCALES);

    expect(errors.some((error) => error.includes('leaf') && error.includes('phone'))).toBe(true);
  });

  it.each([
    ['a rule naming an object that does not exist', (broken: GamePack) => { broken.rules.push({ when: { tap: 'ghost' }, then: [] }); }, 'object ghost'],
    ['a rule dropping into a zone that does not exist', (broken: GamePack) => { broken.rules.push({ when: { dropInto: { zone: 'pond' } }, then: [] }); }, 'zone pond'],
    ['a rule playing a sound that does not exist', (broken: GamePack) => { broken.rules.push({ when: { tap: 'wombat' }, then: [{ play: 'silence' }] }); }, 'sound silence'],
    ['a rule asking for a reaction the host has not got', (broken: GamePack) => { broken.rules.push({ when: { tap: 'wombat' }, then: [{ react: 'dance' }] }); }, 'reaction dance'],
    ['a rule setting a state an object has not got', (broken: GamePack) => { broken.rules.push({ when: { tap: 'wombat' }, then: [{ set: 'wombat', state: 'asleep' }] }); }, 'state asleep'],
    ['a mission rule as much as a pack rule', (broken: GamePack) => { broken.missions[0].rules.push({ when: { tap: 'ghost' }, then: [] }); }, 'object ghost'],
    ['a reaction with a sound that does not exist', (broken: GamePack) => { broken.host.reactions.count.sound = 'silence'; }, 'sound silence'],
    ['a host that is not an object', (broken: GamePack) => { broken.host.objectId = 'ghost'; }, 'host ghost'],
    ['a placeable thing naming a zone that does not exist', (broken: GamePack) => { broken.objects[2].placeable = { zones: ['pond'] }; }, 'zone pond'],
    ['a placeable thing with no start in a crop', (broken: GamePack) => { broken.art.phone.starts = {}; }, 'no start in the phone crop'],
    ['a zone with no frame in a crop', (broken: GamePack) => { broken.art.tablet.zones = {}; }, 'no frame in the tablet crop'],
    ['a zone accepting an id or kind nothing has', (broken: GamePack) => { if (broken.zones) broken.zones[0].accepts = ['pebble']; }, 'pebble'],
  ])('fails on %s', (_, breakIt, expected) => {
    const broken = pack();
    breakIt(broken);

    const errors = validatePack(broken, files(), LOCALES);

    expect(errors.some((error) => error.includes(expected))).toBe(true);
  });

  it('fails on a key missing from any one locale, naming the locale', () => {
    const errors = validatePack(pack(), files(), { en: locale(), fr: locale(pack().keys.slice(1)) });

    expect(errors).toEqual([`locale fr is missing key ${pack().keys[0]}`]);
  });

  it('fails on a key the pack uses but does not list', () => {
    const broken = pack();
    broken.keys = broken.keys.filter((key) => key !== 'packs.testPack.missions.picnic.aim');

    const errors = validatePack(broken, files(), { en: locale(pack().keys), fr: locale(pack().keys) });

    expect(errors.some((error) => error.includes('packs.testPack.missions.picnic.aim') && error.includes('not listed'))).toBe(true);
  });

  it('accepts a locale key whose value is empty text, since a translator may still be at work', () => {
    const empty = locale();
    (empty.packs as Record<string, Record<string, Record<string, string>>>).testPack.objects.wombat = '';

    expect(validatePack(pack(), files(), { en: locale(), fr: empty })).toEqual([]);
  });

  it.each([
    [PACK_BUDGET_BYTES, []],
    [PACK_BUDGET_BYTES + 1, [`pack test-pack is ${PACK_BUDGET_BYTES + 1} bytes, over its budget of ${PACK_BUDGET_BYTES}`]],
  ])('measures the whole pack against its budget: %i bytes', (total, expected) => {
    const perFile = Math.floor(total / ALL_FILES.length);
    const remainder = total - perFile * ALL_FILES.length;
    const sizes = new Map(ALL_FILES.map((path, index) => [path, perFile + (index === 0 ? remainder : 0)]));
    const measured: PackFiles = { has: (path) => sizes.has(path), sizeOf: (path) => sizes.get(path) ?? 0, total: () => total };

    expect(validatePack(pack(), measured, LOCALES)).toEqual(expected);
  });

  it.each(['1-2', '2-4', '4+'] as const)('fails on a mission missing the %s band', (band) => {
    const broken = pack();
    delete (broken.missions[0].byAge as Partial<Record<string, unknown>>)[band];

    const errors = validatePack(broken, files(), LOCALES);

    expect(errors.some((error) => error.includes(`band ${band}`))).toBe(true);
  });

  it('fails on a stage goal naming a kind no placeable thing has', () => {
    const broken = pack();
    broken.missions[0].byAge['2-4'].stages[0].goal = { pebble: 1 };

    const errors = validatePack(broken, files(), LOCALES);

    expect(errors.some((error) => error.includes('kind pebble'))).toBe(true);
  });

  it.each([
    ['not an object', 42],
    ['an empty object', {}],
    ['a pack with no id', { ...pack(), id: '' }],
    ['a pack with an unknown engine', { ...pack(), engine: 'dice' }],
    ['a pack whose missions are not a list', { ...pack(), missions: 'none' }],
    ['a pack with no art', { ...pack(), art: undefined }],
    ['a pack with a version that is not a whole number', { ...pack(), version: 1.5 }],
  ])('rejects what is not a pack: %s', (_, manifest) => {
    const errors = validatePack(manifest, files(), LOCALES);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('reports every problem at once rather than the first', () => {
    const broken = pack();
    broken.rules.push({ when: { tap: 'ghost' }, then: [{ play: 'silence' }] });

    const errors = validatePack(broken, files(ALL_FILES.filter((path) => path !== 'cover.webp')), LOCALES);

    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});
