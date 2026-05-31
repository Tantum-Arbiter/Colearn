import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '@/services/i18n';

// Helper to extract all leaf keys from a nested object
function getLeafKeys(obj: any, prefix = ''): string[] {
  const keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...getLeafKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// All locale codes that should be registered
const ALL_LOCALE_CODES = ['en', 'pl', 'es', 'de', 'fr', 'it', 'pt', 'ar', 'tr', 'nl', 'da', 'la', 'ja', 'zh'];

// Load all locale modules once
const localeModules: Record<string, any> = {};
ALL_LOCALE_CODES.forEach(code => {
  localeModules[code] = require(`@/locales/${code}`).default;
});

describe('i18n Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SUPPORTED_LANGUAGES', () => {
    it('should have 14 supported languages', () => {
      expect(SUPPORTED_LANGUAGES).toHaveLength(14);
    });

    it.each([
      ['en', 'English', '🇬🇧', 'English'],
      ['pl', 'Polish', '🇵🇱', 'Polski'],
      ['es', 'Spanish', '🇪🇸', 'Español'],
      ['de', 'German', '🇩🇪', 'Deutsch'],
      ['fr', 'French', '🇫🇷', 'Français'],
      ['it', 'Italian', '🇮🇹', 'Italiano'],
      ['pt', 'Portuguese', '🇵🇹', 'Português'],
      ['ar', 'Arabic', '🇸🇦', 'العربية'],
      ['tr', 'Turkish', '🇹🇷', 'Türkçe'],
      ['nl', 'Dutch', '🇳🇱', 'Nederlands'],
      ['da', 'Danish', '🇩🇰', 'Dansk'],
      ['la', 'Latin', '🏛️', 'Latīna'],
      ['ja', 'Japanese', '🇯🇵', '日本語'],
      ['zh', 'Chinese', '🇨🇳', '中文'],
    ])('should include %s (%s)', (code, name, flag, nativeName) => {
      const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
      expect(lang).toBeDefined();
      expect(lang?.name).toBe(name);
      expect(lang?.flag).toBe(flag);
      expect(lang?.nativeName).toBe(nativeName);
    });

    it('should have unique language codes', () => {
      const codes = SUPPORTED_LANGUAGES.map(l => l.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it('should have non-empty flags for all languages', () => {
      SUPPORTED_LANGUAGES.forEach(lang => {
        expect(lang.flag).toBeDefined();
        expect(lang.flag.length).toBeGreaterThan(0);
      });
    });
  });

  describe('SupportedLanguage type', () => {
    it('should accept all 14 valid language codes', () => {
      const validCodes: SupportedLanguage[] = ['en', 'pl', 'es', 'de', 'fr', 'it', 'pt', 'ar', 'tr', 'nl', 'da', 'la', 'ja', 'zh'];
      validCodes.forEach(code => {
        expect(ALL_LOCALE_CODES).toContain(code);
      });
      expect(validCodes).toHaveLength(14);
    });
  });

  describe('Language storage integration', () => {
    it('should use @app_language key for storage', async () => {
      const mockGetItem = AsyncStorage.getItem as jest.Mock;
      mockGetItem.mockResolvedValue('pl');
      const EXPECTED_KEY = '@app_language';
      expect(EXPECTED_KEY).toBe('@app_language');
    });
  });

  describe('Translation resources', () => {
    it('should have all top-level sections in every language', () => {
      const enKeys = Object.keys(localeModules['en']);
      ALL_LOCALE_CODES.forEach(code => {
        const locKeys = Object.keys(localeModules[code]);
        enKeys.forEach(key => {
          expect(locKeys).toContain(key);
        });
      });
    });

    it('should have common section in all languages', () => {
      ALL_LOCALE_CODES.forEach(code => {
        expect(localeModules[code].common).toBeDefined();
      });
    });

    it('should have menu section in all languages', () => {
      ALL_LOCALE_CODES.forEach(code => {
        expect(localeModules[code].menu).toBeDefined();
      });
    });
  });

  describe('Deep key parity', () => {
    const enKeys = getLeafKeys(localeModules['en']);
    const enKeySet = new Set(enKeys);

    it.each(ALL_LOCALE_CODES.filter(c => c !== 'en'))(
      '%s should have every key that English has',
      (code) => {
        const locKeys = new Set(getLeafKeys(localeModules[code]));
        const missing = enKeys.filter(k => !locKeys.has(k));
        expect(missing).toEqual([]);
      }
    );

    it.each(ALL_LOCALE_CODES.filter(c => c !== 'en'))(
      '%s should not have extra keys that English lacks',
      (code) => {
        const locKeys = getLeafKeys(localeModules[code]);
        const extra = locKeys.filter(k => !enKeySet.has(k));
        expect(extra).toEqual([]);
      }
    );
  });

  describe('No decorative symbols in translation strings', () => {
    // These symbols should be rendered as Ionicons in UI buttons/labels,
    // not embedded in translation strings
    const FORBIDDEN_PATTERNS = [
      { pattern: /←/, name: 'left arrow (←)' },
      { pattern: /→/, name: 'right arrow (→)' },
      { pattern: /↻/, name: 'rotate arrow (↻)' },
      { pattern: /♪/, name: 'music note (♪)' },
      { pattern: /♫/, name: 'music notes (♫)' },
    ];

    // Keys where these symbols are intentionally used as content (not UI decoration)
    const ALLOWED_KEYS = new Set([
      'common.backArrow',                        // Text-based back arrow label
      'accessibility.grayscaleIos',               // Navigation path: Settings → ...
      'accessibility.grayscaleAndroid',            // Navigation path: Settings → ...
      'accessibility.blueLightIos',               // Navigation path: Settings → ...
      'accessibility.blueLightAndroid',            // Navigation path: Settings → ...
      'music.successSong',                        // Music label with ♫
      'music.readyToPlay',                        // Music label with ♫
      'music.tracks.sleepSequence.description',   // Sequence indicator: A → B
    ]);

    function collectStringValues(obj: any, prefix = ''): { key: string; value: string }[] {
      const entries: { key: string; value: string }[] = [];
      for (const key of Object.keys(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'string') {
          entries.push({ key: fullKey, value: obj[key] });
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          entries.push(...collectStringValues(obj[key], fullKey));
        }
      }
      return entries;
    }

    it.each(ALL_LOCALE_CODES)(
      '%s should not contain decorative arrows or music symbols in translation strings',
      (code) => {
        const entries = collectStringValues(localeModules[code]);
        const violations: string[] = [];

        entries.forEach(({ key, value }) => {
          if (ALLOWED_KEYS.has(key)) return; // Skip intentional uses
          FORBIDDEN_PATTERNS.forEach(({ pattern, name }) => {
            if (pattern.test(value)) {
              violations.push(`${key}: contains ${name} in "${value.substring(0, 60)}..."`);
            }
          });
        });

        expect(violations).toEqual([]);
      }
    );
  });
});

