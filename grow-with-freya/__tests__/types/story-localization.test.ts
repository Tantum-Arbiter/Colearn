import { getLocalizedText, resolveAgeGroup, LocalizedText, StoryPage, Story, AgeGroupText } from '@/types/story';

describe('Story Localization', () => {
  describe('getLocalizedText', () => {
    const localizedContent: LocalizedText = {
      en: 'Hello World',
      pl: 'Witaj Świecie',
      es: 'Hola Mundo',
      de: 'Hallo Welt',
    };

    it('returns fallback when localized is undefined', () => {
      expect(getLocalizedText(undefined, 'Fallback Text')).toBe('Fallback Text');
    });

    it('returns English when no language specified', () => {
      expect(getLocalizedText(localizedContent, 'Fallback')).toBe('Hello World');
    });

    it('returns English when language is en', () => {
      expect(getLocalizedText(localizedContent, 'Fallback', 'en')).toBe('Hello World');
    });

    it('returns Polish when language is pl', () => {
      expect(getLocalizedText(localizedContent, 'Fallback', 'pl')).toBe('Witaj Świecie');
    });

    it('returns Spanish when language is es', () => {
      expect(getLocalizedText(localizedContent, 'Fallback', 'es')).toBe('Hola Mundo');
    });

    it('returns German when language is de', () => {
      expect(getLocalizedText(localizedContent, 'Fallback', 'de')).toBe('Hallo Welt');
    });

    it('falls back to English when requested language is missing', () => {
      const partialLocalized: LocalizedText = {
        en: 'English Only',
      };
      expect(getLocalizedText(partialLocalized, 'Fallback', 'pl')).toBe('English Only');
    });

    it('falls back to fallback when English is empty', () => {
      const emptyEnglish: LocalizedText = {
        en: '',
        pl: 'Polish',
      };
      expect(getLocalizedText(emptyEnglish, 'Fallback', 'de')).toBe('Fallback');
    });
  });

  describe('LocalizedText interface', () => {
    it('requires en field', () => {
      const valid: LocalizedText = { en: 'Required' };
      expect(valid.en).toBe('Required');
    });

    it('allows optional pl, es, de fields', () => {
      const partial: LocalizedText = { en: 'English', pl: 'Polish' };
      expect(partial.pl).toBe('Polish');
      expect(partial.es).toBeUndefined();
      expect(partial.de).toBeUndefined();
    });
  });

  describe('Story with localization', () => {
    it('supports localizedTitle field', () => {
      const story: Story = {
        id: 'test-story',
        title: 'Default Title',
        localizedTitle: {
          en: 'English Title',
          pl: 'Polish Title',
        },
        category: 'adventure',
        isAvailable: true,
      };

      expect(story.localizedTitle?.en).toBe('English Title');
      expect(story.localizedTitle?.pl).toBe('Polish Title');
    });

    it('supports localizedDescription field', () => {
      const story: Story = {
        id: 'test-story',
        title: 'Title',
        description: 'Default description',
        localizedDescription: {
          en: 'English description',
          es: 'Spanish description',
        },
        category: 'bedtime',
        isAvailable: true,
      };

      expect(story.localizedDescription?.en).toBe('English description');
      expect(story.localizedDescription?.es).toBe('Spanish description');
    });
  });

  describe('StoryPage with localization', () => {
    it('supports age-grouped localizedText field', () => {
      const page: StoryPage = {
        id: 'page-1',
        pageNumber: 1,
        text: 'Default text',
        localizedText: {
          '4-6': { en: 'English page text', de: 'German page text' },
        },
      };

      expect(page.localizedText?.['4-6']?.en).toBe('English page text');
      expect(page.localizedText?.['4-6']?.de).toBe('German page text');
    });

    it('uses getLocalizedText for page content with age group', () => {
      const page: StoryPage = {
        id: 'page-1',
        pageNumber: 1,
        text: 'Fallback text',
        localizedText: {
          '4-6': {
            en: 'Once upon a time...',
            pl: 'Dawno dawno temu...',
          },
        },
      };

      expect(getLocalizedText(undefined, page.text, 'en', page.localizedText, '4-6')).toBe('Once upon a time...');
      expect(getLocalizedText(undefined, page.text, 'pl', page.localizedText, '4-6')).toBe('Dawno dawno temu...');
      // Falls back to English within the age group when language not available
      expect(getLocalizedText(undefined, page.text, 'es', page.localizedText, '4-6')).toBe('Once upon a time...');
    });

    it('supports multiple age groups in localizedText', () => {
      const page: StoryPage = {
        id: 'page-1',
        pageNumber: 1,
        text: 'Default text',
        localizedText: {
          '0-2': { en: 'Baby text', pl: 'Tekst dla niemowlaka' },
          '2-4': { en: 'Toddler text', pl: 'Tekst dla malucha' },
          '4-6': { en: 'Preschool text', pl: 'Tekst przedszkolny' },
        },
      };

      expect(page.localizedText?.['0-2']?.en).toBe('Baby text');
      expect(page.localizedText?.['2-4']?.en).toBe('Toddler text');
      expect(page.localizedText?.['4-6']?.en).toBe('Preschool text');
    });
  });

  describe('resolveAgeGroup', () => {
    it('returns 0-2 for children under 24 months', () => {
      expect(resolveAgeGroup(0)).toBe('0-2');
      expect(resolveAgeGroup(12)).toBe('0-2');
      expect(resolveAgeGroup(23)).toBe('0-2');
    });

    it('returns 2-4 for children 24-47 months', () => {
      expect(resolveAgeGroup(24)).toBe('2-4');
      expect(resolveAgeGroup(36)).toBe('2-4');
      expect(resolveAgeGroup(47)).toBe('2-4');
    });

    it('returns 4-6 for children 48+ months', () => {
      expect(resolveAgeGroup(48)).toBe('4-6');
      expect(resolveAgeGroup(60)).toBe('4-6');
      expect(resolveAgeGroup(72)).toBe('4-6');
    });
  });

  describe('getLocalizedText with ageGroupText', () => {
    const ageGroupText: AgeGroupText = {
      '0-2': { en: 'Baby bear sleeps.', pl: 'Miś śpi.' },
      '2-4': { en: 'The little bear curls up and sleeps.', pl: 'Mały miś zwija się i śpi.' },
      '4-6': { en: 'The bear nestles into the soft leaves and drifts off to sleep.', pl: 'Niedźwiedź wtula się w miękkie liście i zasypia.' },
    };
    const localizedText: LocalizedText = { en: 'Default localized text', pl: 'Domyślny zlokalizowany tekst' };
    const fallback = 'Fallback text';

    it('prioritises ageGroupText when ageGroup is provided', () => {
      expect(getLocalizedText(localizedText, fallback, 'en', ageGroupText, '0-2')).toBe('Baby bear sleeps.');
      expect(getLocalizedText(localizedText, fallback, 'en', ageGroupText, '2-4')).toBe('The little bear curls up and sleeps.');
      expect(getLocalizedText(localizedText, fallback, 'en', ageGroupText, '4-6')).toBe('The bear nestles into the soft leaves and drifts off to sleep.');
    });

    it('returns age-appropriate text in requested language', () => {
      expect(getLocalizedText(localizedText, fallback, 'pl', ageGroupText, '0-2')).toBe('Miś śpi.');
      expect(getLocalizedText(localizedText, fallback, 'pl', ageGroupText, '4-6')).toBe('Niedźwiedź wtula się w miękkie liście i zasypia.');
    });

    it('falls back to ageGroupText English when requested language missing from age group', () => {
      expect(getLocalizedText(localizedText, fallback, 'de', ageGroupText, '0-2')).toBe('Baby bear sleeps.');
    });

    it('falls back to localizedText when ageGroup not in ageGroupText', () => {
      const partialAgeGroupText: AgeGroupText = {
        '4-6': { en: 'Only for older kids' },
      };
      expect(getLocalizedText(localizedText, fallback, 'en', partialAgeGroupText, '0-2')).toBe('Default localized text');
    });

    it('falls back to localizedText when ageGroupText is undefined', () => {
      expect(getLocalizedText(localizedText, fallback, 'en', undefined, '0-2')).toBe('Default localized text');
    });

    it('falls back to localizedText when ageGroup is undefined', () => {
      expect(getLocalizedText(localizedText, fallback, 'en', ageGroupText, undefined)).toBe('Default localized text');
    });

    it('works with no ageGroupText params (backward compatible)', () => {
      expect(getLocalizedText(localizedText, fallback, 'en')).toBe('Default localized text');
      expect(getLocalizedText(localizedText, fallback, 'pl')).toBe('Domyślny zlokalizowany tekst');
      expect(getLocalizedText(undefined, fallback)).toBe('Fallback text');
    });
  });
});
