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

import {
  getInstrument,
  validateMusicChallengeAssets,
  getAvailableInstrumentIds,
  getInstrumentsByFamily,
  registerInstrument,
  InstrumentDefinition,
} from '@/services/music-asset-registry';

// All 6 supported instruments with their expected properties
const EXPECTED_INSTRUMENTS = [
  { id: 'flute', family: 'flute', displayName: 'Magic Flute', noteCount: 6 },
  { id: 'recorder', family: 'recorder', displayName: 'Woodland Recorder', noteCount: 6 },
  { id: 'ocarina', family: 'ocarina', displayName: 'Enchanted Ocarina', noteCount: 6 },
  { id: 'trumpet', family: 'trumpet', displayName: 'Golden Trumpet', noteCount: 3 },
  { id: 'clarinet', family: 'clarinet', displayName: 'Jazzy Clarinet', noteCount: 5 },
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
        note: 'C', label: '⭐', color: '#4FC3F7', icon: 'star',
      });
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

    it('clarinet keeps the generic layout until artwork exists', () => {
      const underTest = getInstrument('clarinet')!;

      expect(underTest.artwork).toBeUndefined();
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
        image: 0, notes: {}, noteLayout: [], noteCount: 0,
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
        image: 1, notes: { C: 10, D: 11 }, noteLayout: [], noteCount: 2,
      });
      expect(validateMusicChallengeAssets('valid_inst', ['C', 'D'])).toEqual([]);
    });

    it('should flag missing notes', () => {
      const missing = validateMusicChallengeAssets('trumpet', ['C', 'Z']);
      expect(missing).toContain('note:trumpet/Z');
    });
  });
});
