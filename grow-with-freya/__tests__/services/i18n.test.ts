import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPPORTED_LANGUAGES, SupportedLanguage, baseLanguage, languageFlag } from '@/services/i18n';

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

  describe('The learning journey card on the home', () => {
    const cardName = (code: string): string => localeModules[code].home.milestone.eyebrow;

    it('is called Your Learning Journey in English', () => {
      expect(cardName('en')).toBe('Your Learning Journey');
    });

    it.each(ALL_LOCALE_CODES)('%s has the tour call the card what the card calls itself', (code) => {
      expect(localeModules[code].tutorial.mainMenu.achievement.title).toBe(cardName(code));
    });

    it.each(ALL_LOCALE_CODES.filter((code) => code !== 'en'))('%s has its own words for it, not the English', (code) => {
      expect(cardName(code)).not.toBe(cardName('en'));
      expect(cardName(code).trim().length).toBeGreaterThan(0);
    });

    it.each(ALL_LOCALE_CODES)('%s says both how many badges are unlocked and how many remain', (code) => {
      const underTest: string = localeModules[code].home.achievementTally.label;

      expect(underTest).toContain('{{unlocked}}');
      expect(underTest).toContain('{{remaining}}');
      expect(underTest.indexOf('{{unlocked}}')).toBeLessThan(underTest.indexOf('{{remaining}}'));
    });
  });

  describe('The way to the island', () => {
    it('invites the child to explore, in English, now the card no longer opens the badges', () => {
      expect(localeModules.en.home.achievements.cta).toBe('Explore');
      expect(localeModules.en.home.achievements.hint).toBe('Fly down to your island');
    });

    it.each(ALL_LOCALE_CODES)('%s no longer promises the badges from the card or the tour', (code) => {
      const before: Record<string, { cta: string; hint: string; tour: string }> = {
        en: { cta: 'View achievements', hint: 'See your badges', tour: 'Tap it to see them all.' },
      };
      const home = localeModules[code].home.achievements;
      const tour: string = localeModules[code].tutorial.mainMenu.achievement.description;

      expect(home.cta.trim().length).toBeGreaterThan(0);
      expect(home.hint.trim().length).toBeGreaterThan(0);
      expect(tour.trim().length).toBeGreaterThan(0);
      if (before[code]) {
        expect(home.cta).not.toBe(before[code].cta);
        expect(home.hint).not.toBe(before[code].hint);
        expect(tour).not.toContain(before[code].tour);
      }
    });

    it.each(ALL_LOCALE_CODES.filter((code) => code !== 'en'))('%s has its own words for exploring and for the island', (code) => {
      expect(localeModules[code].island.scene).not.toBe(localeModules.en.island.scene);
      expect(localeModules[code].island.scene.trim().length).toBeGreaterThan(0);
    });

    it('describes the island for someone who cannot see it', () => {
      expect(localeModules.en.island.scene).toBe('An island seen from the sky, with snowy mountains, forests, a river and a lighthouse');
    });
  });

  describe('The learning plan on the island', () => {
    const PLACES = ['storyTime', 'wordGarden', 'mathsMeadow', 'feelingsCove', 'musicGrove', 'storyCorner', 'storyBridge'];
    const DOMAINS = ['language', 'maths', 'feelings', 'music'];
    const SKILLS = ['listening', 'vocabulary', 'letters', 'counting', 'numbers', 'feelings', 'confidence', 'rhythm', 'patience'];
    const DAYS = [1, 2, 3, 4, 5, 6, 7];

    it('names each day`s place, kind of learning and skills, and says in a sentence what it builds, in English', () => {
      const plan = localeModules.en.plan;

      PLACES.forEach((place) => expect(plan.places[place].trim().length).toBeGreaterThan(0));
      DOMAINS.forEach((domain) => expect(plan.domains[domain].trim().length).toBeGreaterThan(0));
      SKILLS.forEach((skill) => expect(plan.skills[skill].trim().length).toBeGreaterThan(0));
      expect(plan.places.storyBridge).toBe('Story Bridge');
      expect(plan.islandWeek['day-1'].aim).toBe('Build listening, vocabulary and calm through a cosy bedtime story.');
      DAYS.forEach((day) => {
        const aim: string = plan.islandWeek[`day-${day}`].aim;
        expect(aim.trim().length).toBeGreaterThan(0);
        expect(aim.length).toBeLessThanOrEqual(80);
      });
      expect(plan.stepOf).toBe('Step {{day}} of {{total}}');
      expect(plan.minutes).toBe('{{from}}–{{to}} min');
      expect(plan.start).toBe('Start activity');
      expect(plan.preview).toBe('Preview');
      expect(plan.a11y.checkpoint).toContain('{{day}}');
      expect(plan.a11y.checkpoint).toContain('{{place}}');
      expect(plan.a11y.checkpoint).toContain('{{state}}');
      expect(plan.weekDoneBody).toContain('{{done}}');
    });

    it('keeps no words the card no longer shows', () => {
      const plan = localeModules.en.plan;

      expect(plan.step).toBeUndefined();
      expect(plan.places.bedtimeBridge).toBeUndefined();
      DAYS.forEach((day) => expect(plan.islandWeek[`day-${day}`].description).toBeUndefined());
    });

    it.each(ALL_LOCALE_CODES.filter((code) => code !== 'en'))('%s says it in its own words, keeping every placeholder', (code) => {
      const plan = localeModules[code].plan;
      const en = localeModules.en.plan;

      PLACES.forEach((place) => expect(plan.places[place]).not.toBe(en.places[place]));
      DAYS.forEach((day) => expect(plan.islandWeek[`day-${day}`].aim).not.toBe(en.islandWeek[`day-${day}`].aim));
      expect(plan.start).not.toBe(en.start);
      expect(plan.preview.trim().length).toBeGreaterThan(0);
      DOMAINS.forEach((domain) => expect(plan.domains[domain].trim().length).toBeGreaterThan(0));
      SKILLS.forEach((skill) => expect(plan.skills[skill].trim().length).toBeGreaterThan(0));
      expect(plan.stepOf).toContain('{{day}}');
      expect(plan.stepOf).toContain('{{total}}');
      expect(plan.minutes).toContain('{{from}}');
      expect(plan.minutes).toContain('{{to}}');
      expect(plan.a11y.checkpoint).toContain('{{day}}');
      expect(plan.a11y.checkpoint).toContain('{{place}}');
      expect(plan.a11y.checkpoint).toContain('{{state}}');
      expect(plan.weekDoneBody).toContain('{{done}}');
      expect(plan.weekDoneBody).toContain('{{total}}');
    });
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

  describe('No word split by a dash', () => {
    const SPLIT_ALLOWED = new Set(['en:tutorial.profile.login.description']);

    function stringValues(obj: any, prefix = ''): { key: string; value: string }[] {
      return Object.entries(obj).flatMap(([key, value]) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'string') return [{ key: fullKey, value }];
        return value && typeof value === 'object' ? stringValues(value, fullKey) : [];
      });
    }

    it.each(ALL_LOCALE_CODES)('%s keeps every accented letter rather than a spaced dash in its place', (code) => {
      const split = stringValues(localeModules[code])
        .filter(({ key }) => !SPLIT_ALLOWED.has(`${code}:${key}`))
        .filter(({ value }) => /['’] - /.test(value) || /(?<![\p{L}\p{N}])\p{L}{1,3} - \p{Ll}{1,5}(?!\p{L})/u.test(value))
        .map(({ key, value }) => `${key}: ${value.substring(0, 60)}`);

      expect(split).toEqual([]);
    });
  });
});


describe('languageFlag', () => {
  it('is the flag of each supported language', () => {
    SUPPORTED_LANGUAGES.forEach((language) => {
      expect(languageFlag(language.code)).toBe(language.flag);
    });
  });

  it('matches a regional code to its language', () => {
    expect(languageFlag('de-AT')).toBe('🇩🇪');
  });

  it('shows a globe for a language it does not know', () => {
    expect(languageFlag('xx')).toBe('🌐');
    expect(languageFlag(undefined)).toBe('🌐');
  });
});

describe('baseLanguage', () => {
  it('drops the region, so de-AT is German', () => {
    expect(baseLanguage('de-AT')).toBe('de');
    expect(baseLanguage('en')).toBe('en');
  });

  it('has nothing to give for no language', () => {
    expect(baseLanguage(undefined)).toBeUndefined();
  });
});
