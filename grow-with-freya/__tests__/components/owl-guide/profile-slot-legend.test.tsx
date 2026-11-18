/**
 * The picture under the home tour's profile step: the real slot, twice, so a
 * parent sees the child's face and the gold sign-in symbol it turns into
 * while nobody is signed in.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ProfileSlotLegend } from '@/components/owl-guide/profile-slot-legend';

jest.mock('@/components/onboarding/onboarding-pages', () => ({
  AVATAR_OPTIONS: [{ key: 'bear', art: { uri: 'test://bear' } }],
}));

const mockAppState: { userAvatarId: string | null; isGuestMode: boolean } = { userAvatarId: 'bear', isGuestMode: false };
jest.mock('@/store/app-store', () => ({
  useAppStore: (selector?: (state: any) => any) => (selector ? selector(mockAppState) : mockAppState),
}));

function byTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

describe('ProfileSlotLegend', () => {
  it('draws the slot as the face and as the sign-in symbol, even for a signed-in family', () => {
    mockAppState.isGuestMode = false;

    const underTest = render(<ProfileSlotLegend />);

    expect(byTestId(underTest, 'profile-slot-legend-profile').length).toBeGreaterThan(0);
    expect(byTestId(underTest, 'profile-slot-legend-login').length).toBeGreaterThan(0);
    expect(byTestId(underTest, 'profile-slot-legend-login-login').length).toBeGreaterThan(0);
    expect(byTestId(underTest, 'profile-slot-legend-profile-login')).toHaveLength(0);
  });

  it('captions each state', () => {
    const underTest = render(<ProfileSlotLegend />);

    const texts = underTest.UNSAFE_root
      .findAll((n: any) => typeof n.props.children === 'string')
      .map((n: any) => n.props.children);

    expect(texts).toContain('tutorial.catalogue.navProfile.profileCaption');
    expect(texts).toContain('tutorial.catalogue.navProfile.loginCaption');
  });
});
