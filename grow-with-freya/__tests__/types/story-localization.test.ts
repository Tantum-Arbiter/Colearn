import { getLocalizedText, LocalizedText, StoryPage, Story } from '@/types/story';

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
        tag: '🌟',
        emoji: '🌟',
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
        tag: '🌙',
        emoji: '🌙',
        isAvailable: true,
      };

      expect(story.localizedDescription?.en).toBe('English description');
      expect(story.localizedDescription?.es).toBe('Spanish description');
    });
  });

  describe('StoryPage with localization', () => {
    it('supports localizedText field', () => {
      const page: StoryPage = {
        id: 'page-1',
        pageNumber: 1,
        text: 'Default text',
        localizedText: {
          en: 'English page text',
          de: 'German page text',
        },
      };

      expect(page.localizedText?.en).toBe('English page text');
      expect(page.localizedText?.de).toBe('German page text');
    });

    it('uses getLocalizedText for page content', () => {
      const page: StoryPage = {
        id: 'page-1',
        pageNumber: 1,
        text: 'Fallback text',
        localizedText: {
          en: 'Once upon a time...',
          pl: 'Dawno dawno temu...',
        },
      };

      expect(getLocalizedText(page.localizedText, page.text, 'en')).toBe('Once upon a time...');
      expect(getLocalizedText(page.localizedText, page.text, 'pl')).toBe('Dawno dawno temu...');
      expect(getLocalizedText(page.localizedText, page.text, 'es')).toBe('Once upon a time...');
    });
  });
});

