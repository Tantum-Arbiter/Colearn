/**
 * The Profile slot in the journey bar wears the child's own face rather than
 * a glyph, the way Screensafe wears its ring. It reads the chosen avatar from
 * the store itself -- every bar on every page would otherwise have to be told.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ProfileNavAvatar } from '@/components/child-ui/profile-nav-avatar';
import { AVATAR_OPTIONS } from '@/components/onboarding/onboarding-pages';
import { TEXT_PRIMARY } from '@/constants/night-palette';

// Every .webp maps to the same image mock, so real AVATAR_OPTIONS art is
// indistinguishable between avatars -- a test asserting on it proves nothing.
jest.mock('@/components/onboarding/onboarding-pages', () => ({
  AVATAR_OPTIONS: [
    { key: 'bear', art: { uri: 'test://bear' } },
    { key: 'rabbit', art: { uri: 'test://rabbit' } },
    { key: 'fox', art: { uri: 'test://fox' } },
    { key: 'dino', art: { uri: 'test://dino' } },
    { key: 'elephant', art: { uri: 'test://elephant' } },
  ],
}));

const mockAppState: { userAvatarId: string | null } = { userAvatarId: null };
jest.mock('@/store/app-store', () => ({
  useAppStore: (selector?: (state: any) => any) =>
    (selector ? selector(mockAppState) : mockAppState),
}));

function avatarImage(tree: ReturnType<typeof render>) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'profile-nav-avatar-image')[0];
}

function ringStyle(tree: ReturnType<typeof render>) {
  const ring = tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'profile-nav-avatar')[0];
  return [ring.props.style].flat(Infinity).reduce((acc: any, s: any) => ({ ...acc, ...s }), {});
}

describe('ProfileNavAvatar', () => {
  beforeEach(() => {
    mockAppState.userAvatarId = null;
  });

  it('draws the avatar the child chose', () => {
    mockAppState.userAvatarId = 'fox';

    const underTest = render(<ProfileNavAvatar selected={false} />);

    const expected = AVATAR_OPTIONS.find((option) => option.key === 'fox');
    expect(avatarImage(underTest).props.source).toBe(expected?.art);
  });

  it('falls back to the first avatar when none has been chosen', () => {
    const underTest = render(<ProfileNavAvatar selected={false} />);

    expect(avatarImage(underTest).props.source).toBe(AVATAR_OPTIONS[0].art);
  });

  it('falls back to the first avatar when the stored id is no longer offered', () => {
    mockAppState.userAvatarId = 'unicorn';

    const underTest = render(<ProfileNavAvatar selected={false} />);

    expect(avatarImage(underTest).props.source).toBe(AVATAR_OPTIONS[0].art);
  });

  it('rims itself in white once the slot is the selected one', () => {
    const unselected = render(<ProfileNavAvatar selected={false} />);
    const selected = render(<ProfileNavAvatar selected />);

    expect(ringStyle(selected).borderColor).toBe(TEXT_PRIMARY);
    expect(ringStyle(unselected).borderColor).not.toBe(TEXT_PRIMARY);
  });

  /** It shares the bar with the glyphs, so it fills the same height they do. */
  it('defaults to a diameter that keeps pace with the bar\'s glyphs', () => {
    const underTest = render(<ProfileNavAvatar selected={false} />);

    expect(ringStyle(underTest).width).toBeGreaterThanOrEqual(46);
  });

  it('stays a circle at whatever diameter it is given', () => {
    const underTest = render(<ProfileNavAvatar selected={false} size={40} />);

    const style = ringStyle(underTest);

    expect(style.width).toBe(40);
    expect(style.height).toBe(40);
    expect(style.borderRadius).toBe(20);
  });
});
