/**
 * The Profile slot in the journey bar wears the child's own face rather than
 * a glyph, the way Screensafe wears its ring. It reads the chosen avatar from
 * the store itself -- every bar on every page would otherwise have to be told.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { withRepeat } from 'react-native-reanimated';
import { ProfileNavAvatar } from '@/components/child-ui/profile-nav-avatar';
import { NAV_RING_SIZE } from '@/components/child-ui/child-bottom-navigation';
import { AVATAR_OPTIONS } from '@/components/onboarding/onboarding-pages';
import { ACCENT_GOLD, TEXT_PRIMARY } from '@/constants/night-palette';

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

const mockAppState: { userAvatarId: string | null; isGuestMode: boolean; sessionLapsed: boolean } = { userAvatarId: null, isGuestMode: false, sessionLapsed: false };
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
    jest.clearAllMocks();
    mockAppState.userAvatarId = null;
    mockAppState.isGuestMode = false;
    mockAppState.sessionLapsed = false;
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

  /** The child's own face is the biggest thing in the bar, as big as the Screensafe ring beside it. */
  it('defaults to the size of the Screensafe ring in the same bar', () => {
    const underTest = render(<ProfileNavAvatar selected={false} />);

    expect(ringStyle(underTest).width).toBe(NAV_RING_SIZE);
  });

  it('pins a settings cog to the face, sized off it', () => {
    const small = render(<ProfileNavAvatar selected={false} size={40} />);
    const large = render(<ProfileNavAvatar selected={false} size={80} />);

    const cog = (tree: ReturnType<typeof render>) => {
      const node = tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'profile-nav-avatar-settings')[0];
      return [node.props.style]
        .flat(Infinity)
        .filter(Boolean)
        .reduce((merged: any, part: any) => ({ ...merged, ...part }), {});
    };

    // It travels with the avatar rather than sitting at a fixed size. Allowing
    // a pixel for rounding still fails a fixed size, which would not grow at all.
    expect(Math.abs(cog(large).width - cog(small).width * 2)).toBeLessThanOrEqual(1);
    // Seated in the square's bottom-right corner, clear of the round ring.
    expect(cog(small).right).toBe(0);
    expect(cog(small).bottom).toBe(0);
    expect(cog(small).borderRadius).toBe(cog(small).width / 2);
  });

  it('stays a circle at whatever diameter it is given', () => {
    const underTest = render(<ProfileNavAvatar selected={false} size={40} />);

    const style = ringStyle(underTest);

    expect(style.width).toBe(40);
    expect(style.height).toBe(40);
    expect(style.borderRadius).toBe(20);
  });
});

/**
 * A guest has a login page to find. Now and then the face warps into a gold
 * login glyph, holds a few seconds and warps back, so the slot itself says
 * where to go.
 */
describe('the login cue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAppState.isGuestMode = false;
    mockAppState.sessionLapsed = false;
  });

  function loginGlyph(tree: ReturnType<typeof render>) {
    return tree.UNSAFE_root.findAll((n: any) => n.props.name === 'log-in-outline');
  }

  it('carries a gold login glyph and highlight, and starts its slow loop, for a guest', () => {
    mockAppState.isGuestMode = true;

    const underTest = render(<ProfileNavAvatar selected={false} />);

    expect(loginGlyph(underTest)).toHaveLength(1);
    expect(loginGlyph(underTest)[0].props.color).toBe(ACCENT_GOLD);
    expect(loginGlyph(underTest)[0].props.size).toBeGreaterThanOrEqual(38);
    expect(underTest.UNSAFE_root.findAll((n: any) => n.props.testID === 'profile-nav-avatar-highlight').length).toBeGreaterThan(0);
    expect(withRepeat).toHaveBeenCalledTimes(1);
    expect((withRepeat as jest.Mock).mock.calls[0][1]).toBe(-1);
  });

  it('cues again once a signed-in session lapses and a login is needed', () => {
    mockAppState.isGuestMode = false;
    mockAppState.sessionLapsed = true;

    const underTest = render(<ProfileNavAvatar selected={false} />);

    expect(loginGlyph(underTest)).toHaveLength(1);
    expect(withRepeat).toHaveBeenCalledTimes(1);
  });

  it('keeps the face alone, with no loop, once the family has signed in', () => {
    mockAppState.isGuestMode = false;

    const underTest = render(<ProfileNavAvatar selected={false} />);

    expect(loginGlyph(underTest)).toHaveLength(0);
    expect(withRepeat).not.toHaveBeenCalled();
  });
});

describe('held still for a picture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAppState.isGuestMode = false;
    mockAppState.sessionLapsed = false;
  });

  it('shows the sign-in symbol on demand, with no loop, whoever is signed in', () => {
    mockAppState.isGuestMode = false;

    const underTest = render(<ProfileNavAvatar selected={false} hold="login" />);

    expect(underTest.UNSAFE_root.findAll((n: any) => n.props.name === 'log-in-outline')).toHaveLength(1);
    expect(withRepeat).not.toHaveBeenCalled();
  });

  it('shows the face alone on demand, with no loop, even for a guest', () => {
    mockAppState.isGuestMode = true;

    const underTest = render(<ProfileNavAvatar selected={false} hold="avatar" />);

    expect(underTest.UNSAFE_root.findAll((n: any) => n.props.name === 'log-in-outline')).toHaveLength(0);
    expect(withRepeat).not.toHaveBeenCalled();
  });
});
