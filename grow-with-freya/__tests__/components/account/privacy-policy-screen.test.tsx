/**
 * The privacy policy shown in the app says what the backend keeps now: the
 * child profile and progress, subscription status, where the data lives, and
 * that proof of consent outlives the account by three years, not seven.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { PrivacyPolicyScreen } from '@/components/account/privacy-policy-screen';

function policyText(): string {
  const tree = render(<PrivacyPolicyScreen onBack={jest.fn()} />);
  return tree.UNSAFE_root
    .findAll((n: any) => typeof n.props.children === 'string' || Array.isArray(n.props.children))
    .flatMap((n: any) => [].concat(n.props.children))
    .filter((c: unknown) => typeof c === 'string')
    .join(' ');
}

describe('PrivacyPolicyScreen', () => {
  it.each([
    [/which books have been read and finished, badges earned/],
    [/We do not keep a record of when your child used the app/],
    [/Subscription: your plan/],
    [/stored in the European Union/],
    [/for 3 years after you delete your account/],
    [/asks a parents-only question before recording/],
    [/except the consent records described in Section 8/],
  ])('says %s', (phrase) => {
    expect(policyText()).toMatch(phrase);
  });

  it('no longer promises to keep consent records for seven years', () => {
    expect(policyText()).not.toMatch(/7 years/);
  });
});
