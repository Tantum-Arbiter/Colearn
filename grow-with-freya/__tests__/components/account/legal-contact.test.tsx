/**
 * The legal pages inside the app give one address to write to.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { PrivacyPolicyScreen } from '@/components/account/privacy-policy-screen';
import { TermsConditionsScreen } from '@/components/account/terms-conditions-screen';

function textOf(element: React.ReactElement): string {
  return render(element).UNSAFE_root
    .findAll((n: any) => n.props.children !== undefined)
    .flatMap((n: any) => [].concat(n.props.children))
    .filter((c: unknown) => typeof c === 'string')
    .join(' ');
}

describe.each([
  ['the privacy policy', () => <PrivacyPolicyScreen onBack={jest.fn()} />],
  ['the terms', () => <TermsConditionsScreen onBack={jest.fn()} />],
])('%s', (_label, screen) => {
  it('gives contact@earlyroots.co.uk, and no other address', () => {
    const addresses = textOf(screen()).match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) ?? [];

    expect(addresses).toContain('contact@earlyroots.co.uk');
    expect(addresses.filter((address) => address !== 'contact@earlyroots.co.uk')).toEqual([]);
  });
});
