/**
 * The flags that fill the language button: the real ones, from
 * country-flag-icons, one per language that has a country to fly it.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { FLAGGED_LANGUAGES, FlagArt, hasFlag } from '@/components/child-ui/flag-art';
import { SUPPORTED_LANGUAGES } from '@/services/i18n';

describe('FlagArt', () => {
  it.each(FLAGGED_LANGUAGES)('should show the %s flag at the size it is asked for', (code) => {
    const view = render(<FlagArt code={code} size={53} />);

    expect(view.toJSON()).toBe('MockSvg-53x53-1');
  });

  it('should have a flag for every supported language but Latin, which has no country', () => {
    SUPPORTED_LANGUAGES.forEach((language) => {
      expect(hasFlag(language.code)).toBe(language.code !== 'la');
    });
    expect(hasFlag(undefined)).toBe(false);
    expect(hasFlag('xx')).toBe(false);
  });
});
