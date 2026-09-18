// Mock the Logger before importing the module under test
jest.mock('@/utils/logger', () => ({
  Logger: {
    create: () => ({
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    }),
  },
}));

import * as fs from 'fs';
import * as path from 'path';

import {
  getInstrument,
  validateMusicChallengeAssets,
  getAvailableInstrumentIds,
  getInstrumentsByFamily,
  registerInstrument,
  getAllPracticeSongs,
  getPracticeSong,
  NOTE_COLORS,
  InstrumentDefinition,
} from '@/services/music-asset-registry';

// All 6 supported instruments with their expected properties
const EXPECTED_INSTRUMENTS = [
  { id: 'flute', family: 'flute', displayName: 'Magic Flute', noteCount: 6 },
  { id: 'recorder', family: 'recorder', displayName: 'Woodland Recorder', noteCount: 6 },
  { id: 'ocarina', family: 'ocarina', displayName: 'Enchanted Ocarina', noteCount: 6 },
  { id: 'trumpet', family: 'trumpet', displayName: 'Golden Trumpet', noteCount: 3 },
  { id: 'clarinet', family: 'clarinet', displayName: 'Jazzy Clarinet', noteCount: 6 },
  { id: 'saxophone', family: 'saxophone', displayName: 'Sunshine Saxophone', noteCount: 5 },
];

describe('MusicAssetRegistry', () => {
  // =============================================
  // All 6 instruments registered and accessible
  // =============================================

  describe('getInstrument -all 6 instruments', () => {
    it.each(EXPECTED_INSTRUMENTS)(
      'should return $id with displayName "$displayName"',
      ({ id, displayName }) => {
        const instrument = getInstrument(id);
        expect(instrument).toBeDefined();
        expect(instrument!.id).toBe(id);
        expect(instrument!.displayName).toBe(displayName);
      }
    );

    it.each(EXPECTED_INSTRUMENTS)(
      '$id should have family "$family"',
      ({ id, family }) => {
        const instrument = getInstrument(id);
        expect(instrument!.family).toBe(family);
      }
    );

    it.each(EXPECTED_INSTRUMENTS)(
      '$id should have $noteCount notes in noteLayout',
      ({ id, noteCount }) => {
        const instrument = getInstrument(id);
        expect(instrument!.noteLayout).toHaveLength(noteCount);
        expect(instrument!.noteCount).toBe(noteCount);
      }
    );

    it.each(EXPECTED_INSTRUMENTS)(
      '$id should have a description',
      ({ id }) => {
        const instrument = getInstrument(id);
        expect(instrument!.description).toBeTruthy();
        expect(instrument!.description.length).toBeGreaterThan(10);
      }
    );

    it.each(EXPECTED_INSTRUMENTS)(
      '$id should have a medallion image',
      ({ id }) => {
        const instrument = getInstrument(id);
        expect(instrument!.medallion).toBeDefined();
        expect(instrument!.medallion).not.toBe(0);
      }
    );

    it('should return undefined for an unknown instrument', () => {
      expect(getInstrument('unknown_instrument')).toBeUndefined();
    });
  });

  // =============================================
  // Backward compatibility aliases
  // =============================================

  describe('backward compatibility aliases', () => {
    it.each([
      ['flute_basic', 'flute'],
      ['recorder_basic', 'recorder'],
      ['ocarina_basic', 'ocarina'],
      ['trumpet_basic', 'trumpet'],
      ['clarinet_basic', 'clarinet'],
      ['saxophone_basic', 'saxophone'],
    ])('alias "%s" should resolve to "%s"', (alias, expectedId) => {
      const instrument = getInstrument(alias);
      expect(instrument).toBeDefined();
      expect(instrument!.id).toBe(expectedId);
    });
  });

  // =============================================
  // Note layout structure
  // =============================================

  describe('note layout structure', () => {
    it('each note button should have note, label, and color', () => {
      for (const { id } of EXPECTED_INSTRUMENTS) {
        const instrument = getInstrument(id)!;
        for (const noteItem of instrument.noteLayout) {
          expect(noteItem.note).toBeTruthy();
          expect(noteItem.label).toBeTruthy();
          expect(noteItem.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        }
      }
    });

    it('flute note layout should start with C/star', () => {
      const flute = getInstrument('flute')!;
      expect(flute.noteLayout[0]).toMatchObject({
        note: 'C', label: '⭐', color: NOTE_COLORS.C, icon: 'star',
      });
    });

    it('colours every note the same on every instrument', () => {
      for (const { id } of EXPECTED_INSTRUMENTS) {
        for (const item of getInstrument(id)!.noteLayout) {
          expect({ id, note: item.note, color: item.color }).toEqual({ id, note: item.note, color: NOTE_COLORS[item.note as keyof typeof NOTE_COLORS] });
        }
      }
    });

    it('gives the six notes six distinct colours', () => {
      expect(new Set(Object.values(NOTE_COLORS)).size).toBe(6);
    });

    it('orders every instrument\'s buttons from C upwards', () => {
      const order = ['C', 'D', 'E', 'F', 'G', 'A'];
      for (const { id } of EXPECTED_INSTRUMENTS) {
        const notes = getInstrument(id)!.noteLayout.map(item => item.note);
        expect({ id, notes }).toEqual({ id, notes: order.slice(0, notes.length) });
      }
    });

    it('each instrument should have unique icon themes', () => {
      const allIcons = EXPECTED_INSTRUMENTS.flatMap(({ id }) => {
        const instrument = getInstrument(id)!;
        return instrument.noteLayout.map(n => n.icon).filter(Boolean);
      });
      // At least 20 unique icons across all instruments
      const uniqueIcons = new Set(allIcons);
      expect(uniqueIcons.size).toBeGreaterThanOrEqual(20);
    });
  });

  // =============================================
  // Instrument artwork and hole positions
  // =============================================

  describe('instrument artwork', () => {
    const ILLUSTRATED = ['flute', 'recorder', 'ocarina', 'trumpet', 'saxophone'];

    it.each(ILLUSTRATED)('%s has body artwork with a landscape aspect ratio', (id) => {
      const underTest = getInstrument(id)!;

      expect(underTest.artwork).toBeDefined();
      expect(underTest.artwork!.aspectRatio).toBeGreaterThan(1);
      expect(underTest.artwork!.holeDiameter).toBeGreaterThan(0);
      expect(underTest.artwork!.holeDiameter).toBeLessThan(0.2);
    });

    it.each(ILLUSTRATED)('%s places every note in a hole inside the artwork', (id) => {
      const underTest = getInstrument(id)!;

      for (const item of underTest.noteLayout) {
        expect(item.hole).toBeDefined();
        expect(item.hole!.x).toBeGreaterThan(0);
        expect(item.hole!.x).toBeLessThan(1);
        expect(item.hole!.y).toBeGreaterThan(0);
        expect(item.hole!.y).toBeLessThan(1);
      }
    });

    it.each(ILLUSTRATED)('%s orders notes left to right along the holes', (id) => {
      const underTest = getInstrument(id)!;

      const xs = underTest.noteLayout.map(item => item.hole!.x);
      expect(xs).toEqual([...xs].sort((a, b) => a - b));
    });

    it.each(ILLUSTRATED)('%s has a note sample for every hole and no extra samples', (id) => {
      const underTest = getInstrument(id)!;

      expect(Object.keys(underTest.notes).sort()).toEqual(underTest.noteLayout.map(n => n.note).sort());
    });

    it('trumpet plays one note per valve', () => {
      const underTest = getInstrument('trumpet')!;

      expect(underTest.noteLayout.map(n => n.note)).toEqual(['C', 'D', 'E']);
    });

    it.each(['recorder', 'ocarina', 'flute'])('%s plays six notes up to A', (id) => {
      const underTest = getInstrument(id)!;

      expect(underTest.noteLayout.map(n => n.note)).toEqual(['C', 'D', 'E', 'F', 'G', 'A']);
    });

    it('clarinet plays one note per hole, sixth hole included', () => {
      const underTest = getInstrument('clarinet')!;

      expect(underTest.artwork).toBeDefined();
      expect(Object.keys(underTest.notes)).toEqual(['C', 'D', 'E', 'F', 'G', 'A']);
    });
  });

  // =============================================
  // getInstrumentsByFamily
  // =============================================

  describe('getInstrumentsByFamily', () => {
    it('should return flute for family "flute"', () => {
      const instruments = getInstrumentsByFamily('flute');
      expect(instruments).toHaveLength(1);
      expect(instruments[0].id).toBe('flute');
    });

    it('should return empty for unknown family', () => {
      const instruments = getInstrumentsByFamily('harmonica' as any);
      expect(instruments).toHaveLength(0);
    });
  });

  // =============================================
  // getAvailableInstrumentIds
  // =============================================

  describe('getAvailableInstrumentIds', () => {
    it('should include all 6 instruments', () => {
      const ids = getAvailableInstrumentIds();
      for (const { id } of EXPECTED_INSTRUMENTS) {
        expect(ids).toContain(id);
      }
    });

    it('should include dynamically registered instruments', () => {
      registerInstrument({
        id: 'dynamic_xylophone', family: 'flute' as any,
        displayName: 'Xylophone', description: 'test',
        image: 0, medallion: 0, notes: {}, noteLayout: [], noteCount: 0,
      });
      expect(getAvailableInstrumentIds()).toContain('dynamic_xylophone');
    });
  });

  // =============================================
  // Asset validation
  // =============================================

  describe('validateMusicChallengeAssets', () => {
    it('should return missing instrument if not registered', () => {
      const missing = validateMusicChallengeAssets('nonexistent', ['C']);
      expect(missing).toContain('instrument:nonexistent');
    });

    it('should resolve alias and validate instrument', () => {
      // flute_basic → flute (alias). Instrument should resolve via alias.
      const missing = validateMusicChallengeAssets('flute_basic', ['C']);
      expect(missing).not.toContain('instrument:flute_basic'); // instrument resolves via alias
    });

    it('should return empty array when all assets are valid', () => {
      registerInstrument({
        id: 'valid_inst', family: 'flute' as any,
        displayName: 'Valid', description: 'test',
        image: 1, medallion: 2, notes: { C: 10, D: 11 }, noteLayout: [], noteCount: 2,
      });
      expect(validateMusicChallengeAssets('valid_inst', ['C', 'D'])).toEqual([]);
    });

    it('should flag missing notes', () => {
      const missing = validateMusicChallengeAssets('trumpet', ['C', 'Z']);
      expect(missing).toContain('note:trumpet/Z');
    });
  });
  // =============================================
  // Medallion assets on disk
  //
  // Jest maps every image require() to the same stub string, so identity and
  // dimensions cannot be asserted through the registry -check the files.
  // =============================================

  describe('medallion assets', () => {
    const medallionDir = path.resolve(__dirname, '../../assets/music/instruments/medallions');
    const builtInIds = EXPECTED_INSTRUMENTS.map(i => i.id);

    it.each(builtInIds)('%s should have a medallion asset file', (id) => {
      expect(fs.existsSync(path.join(medallionDir, `${id}.webp`))).toBe(true);
    });

    it('every medallion should be a distinct image', () => {
      const contents = builtInIds.map(id =>
        fs.readFileSync(path.join(medallionDir, `${id}.webp`)).toString('base64'));

      expect(new Set(contents).size).toBe(builtInIds.length);
    });
  });
});

describe('MusicAssetRegistry practice songs', () => {
  const songs = getAllPracticeSongs();

  it('gives every song with a rhythm one beat count per sequence entry', () => {
    for (const song of songs) {
      if (song.rhythm) {
        expect({ id: song.id, length: song.rhythm.length }).toEqual({ id: song.id, length: song.sequence.length });
        expect(song.rhythm.every(beats => beats > 0)).toBe(true);
      }
    }
  });

  it('lists exactly the notes each sequence uses as its required notes', () => {
    for (const song of songs) {
      const used = [...new Set(song.sequence.flatMap(entry => entry.split('+')))].sort();
      expect({ id: song.id, notes: [...song.requiredNotes].sort() }).toEqual({ id: song.id, notes: used });
    }
  });

  it('plays Hot Cross Buns with four pennies on C and four on D', () => {
    expect(getPracticeSong('hot_cross_buns')!.sequence).toEqual(
      ['E', 'D', 'C', 'E', 'D', 'C', 'C', 'C', 'C', 'C', 'D', 'D', 'D', 'D', 'E', 'D', 'C'],
    );
  });

  it('keeps all three notes of "happy birthday dear" in Happy Birthday', () => {
    expect(getPracticeSong('happy_birthday')!.sequence).toEqual(
      ['C', 'C', 'D', 'C', 'F', 'E', 'C', 'C', 'D', 'C', 'G', 'F', 'C', 'C', 'C', 'A', 'F', 'E', 'D'],
    );
  });

  it('gives the well-known nursery rhymes a rhythm', () => {
    for (const id of ['hot_cross_buns', 'twinkle_star', 'jingle_bells', 'happy_birthday', 'frere_jacques', 'ode_to_joy', 'london_bridge', 'mary_lamb', 'old_macdonald']) {
      expect({ id, hasRhythm: getPracticeSong(id)!.rhythm !== undefined }).toEqual({ id, hasRhythm: true });
    }
  });
});

describe('MusicAssetRegistry instrument bells', () => {
  it.each(['trumpet', 'saxophone', 'recorder', 'flute', 'ocarina', 'clarinet'])('%s has a bell cutout inside its body artwork', (id) => {
    const bell = getInstrument(id)!.artwork!.bell!;

    expect(bell.image).toBeTruthy();
    expect(bell.frame.x).toBeGreaterThanOrEqual(0);
    expect(bell.frame.y).toBeGreaterThanOrEqual(0);
    expect(bell.frame.x + bell.frame.width).toBeLessThanOrEqual(1);
    expect(bell.frame.y + bell.frame.height).toBeLessThanOrEqual(1);
    expect(bell.origin.x).toBeGreaterThanOrEqual(bell.frame.x);
    expect(bell.origin.x).toBeLessThanOrEqual(bell.frame.x + bell.frame.width);
    expect(bell.origin.y).toBeGreaterThanOrEqual(bell.frame.y);
    expect(bell.origin.y).toBeLessThanOrEqual(bell.frame.y + bell.frame.height);
  });

  it.each(['trumpet', 'saxophone', 'recorder', 'flute', 'ocarina', 'clarinet'])('%s expands its bell by a subtle 2-8 percent', (id) => {
    const { scale } = getInstrument(id)!.artwork!.bell!;

    expect(scale.x).toBeGreaterThanOrEqual(1.02);
    expect(scale.x).toBeLessThanOrEqual(1.08);
    expect(scale.y).toBeGreaterThanOrEqual(1.02);
    expect(scale.y).toBeLessThanOrEqual(1.08);
  });

  it('pins every clarinet note to a hole on its body artwork', () => {
    const underTest = getInstrument('clarinet')!;

    expect(underTest.artwork).toBeDefined();
    expect(underTest.noteLayout.every(item => item.hole)).toBe(true);
    expect(underTest.noteLayout.map(item => item.note)).toEqual(['C', 'D', 'E', 'F', 'G', 'A']);
  });
});
