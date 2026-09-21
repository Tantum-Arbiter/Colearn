/**
 * The home tour's step for the Learn button is titled with the same word the
 * bar shows under that button, in every language, and says what is behind it.
 */

import { SUPPORTED_LANGUAGES } from '@/services/i18n';

const LOCALES = SUPPORTED_LANGUAGES.map((language) => language.code);

function load(code: string): Record<string, any> {
  return require(`@/locales/${code}`).default;
}

describe('tutorial.mainMenu.navLearn', () => {
  it('covers all fourteen languages', () => {
    expect(LOCALES).toHaveLength(14);
  });

  it.each(LOCALES)("titles the step with the bar's own Learn label in %s", (code) => {
    const strings = load(code);

    expect(strings.tutorial.mainMenu.navLearn.title).toBe(strings.childUi.nav.home);
  });

  it.each(LOCALES)('says what the Learn button opens in %s', (code) => {
    const description: unknown = load(code).tutorial.mainMenu.navLearn.description;

    expect(typeof description).toBe('string');
    expect((description as string).length).toBeGreaterThan(20);
  });
});
