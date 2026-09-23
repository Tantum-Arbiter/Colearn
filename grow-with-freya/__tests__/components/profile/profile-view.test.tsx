/**
 * The child's own corner of the journey: who they are, then three tabs into
 * the things that are theirs -- what they loved, what they have earned, and
 * what they keep on the device -- one open at a time. Favourites arrive
 * already built by the catalogue that owns the shelves, so this view is the
 * framing and the switching, not the content.
 */

import React from 'react';
import { Text, View } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ProfileView } from '@/components/profile/profile-view';
import { AVATAR_OPTIONS } from '@/components/onboarding/onboarding-pages';
import { badgeStatus, type Badge } from '@/components/progress/progress-model';
import type { Story } from '@/types/story';

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

const mockAppState: { userAvatarId: string | null; userNickname: string | null } = {
  userAvatarId: 'fox',
  userNickname: 'Freya',
};
jest.mock('@/store/app-store', () => ({
  useAppStore: (selector?: (state: any) => any) => (selector ? selector(mockAppState) : mockAppState),
}));

const badge = (id: string, current: number, target: number): Badge => ({
  id,
  titleKey: `progress.badges.${id}.title`,
  descriptionKey: `progress.badges.${id}.description`,
  artwork: { uri: `test://${id}` },
  category: 'stories',
  currentProgress: current,
  targetProgress: target,
  status: badgeStatus(current, target),
});

const BADGES = [badge('one', 10, 10), badge('two', 0, 10)];

const story = (id: string): Story => ({
  id,
  title: id,
  category: 'bedtime',
  isAvailable: true,
  duration: 5,
});

const DOWNLOADS = [story('moon-bear'), story('sleepy-fox')];

function defaults() {
  return {
    favourites: <Text>the favourites shelf</Text>,
    downloads: DOWNLOADS,
    downloadLimit: 5,
    badges: BADGES,
    language: 'en' as const,
    width: 340,
    onOpenDownload: jest.fn(),
    onDeleteDownload: jest.fn(),
    onSelectBadge: jest.fn(),
    onEditProfile: jest.fn(),
    needsSignIn: true,
    onLogin: jest.fn(),
  };
}

function byTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

function textsIn(tree: ReturnType<typeof render>) {
  return tree.UNSAFE_root
    .findAll((n: any) => typeof n.props.children === 'string')
    .map((n: any) => n.props.children);
}

function openTab(tree: ReturnType<typeof render>, id: string) {
  fireEvent.press(
    tree.UNSAFE_root.findAll(
      (n: any) => n.props.testID === `profile-tab-${id}` && n.props.accessibilityRole === 'button',
    )[0],
  );
}

describe('ProfileView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAppState.userAvatarId = 'fox';
    mockAppState.userNickname = 'Freya';
  });

  it('heads the page with the child’s own avatar and name', () => {
    const underTest = render(<ProfileView {...defaults()} />);

    const avatar = byTestId(underTest, 'profile-hero-avatar-image')[0];

    expect(avatar.props.source).toBe(AVATAR_OPTIONS.find((option) => option.key === 'fox')?.art);
    expect(textsIn(underTest)).toContain('Freya');
  });

  it('falls back to a greeting when no name has been given', () => {
    mockAppState.userNickname = null;

    const underTest = render(<ProfileView {...defaults()} />);

    expect(textsIn(underTest)).toContain('profile.noName');
  });

  it('opens on the saved tab, with the other two sections put away', () => {
    const underTest = render(<ProfileView {...defaults()} />);

    expect(byTestId(underTest, 'profile-tabs')).toHaveLength(1);
    expect(textsIn(underTest)).toContain('the favourites shelf');
    expect(byTestId(underTest, 'profile-downloads-list')).toHaveLength(0);
    expect(byTestId(underTest, 'badge-wall')).toHaveLength(0);
  });

  it('shows one section at a time, whichever tab is open', () => {
    const underTest = render(<ProfileView {...defaults()} />);

    openTab(underTest, 'badges');
    expect(byTestId(underTest, 'badge-wall')).toHaveLength(1);
    expect(textsIn(underTest)).not.toContain('the favourites shelf');
    expect(byTestId(underTest, 'profile-downloads-list')).toHaveLength(0);

    openTab(underTest, 'manage');
    expect(byTestId(underTest, 'profile-downloads-list')).toHaveLength(1);
    expect(byTestId(underTest, 'badge-wall')).toHaveLength(0);

    openTab(underTest, 'saved');
    expect(textsIn(underTest)).toContain('the favourites shelf');
  });

  it('renders the favourites shelf it was handed rather than building one', () => {
    const underTest = render(<ProfileView {...defaults()} />);

    expect(textsIn(underTest)).toContain('the favourites shelf');
  });

  it('lists every downloaded book under manage', () => {
    const underTest = render(<ProfileView {...defaults()} />);
    openTab(underTest, 'manage');

    for (const entry of DOWNLOADS) {
      expect(byTestId(underTest, `download-row-${entry.id}`).length).toBeGreaterThan(0);
    }
  });

  it('says how much of the download allowance has been spent', () => {
    const underTest = render(<ProfileView {...defaults()} />);
    openTab(underTest, 'manage');

    expect(textsIn(underTest)).toContain('profile.downloadsUsed (used:2, limit:5)');
  });

  /**
   * Bundled books ship with the app and count toward the plan's allowance, so
   * a free device can hold more books than the plan nominally allows. "4 of 2"
   * reads as a bug; the plain count is true and says the same thing.
   */
  it('drops the allowance and just counts when the device holds more than the plan allows', () => {
    const underTest = render(<ProfileView {...defaults()} downloadLimit={1} />);
    openTab(underTest, 'manage');

    expect(textsIn(underTest)).toContain('profile.downloadsCount (count:2)');
    expect(textsIn(underTest)).not.toContain('profile.downloadsUsed (used:2, limit:1)');
  });

  it('still shows the allowance when the device is exactly at the limit', () => {
    const underTest = render(<ProfileView {...defaults()} downloadLimit={2} />);
    openTab(underTest, 'manage');

    expect(textsIn(underTest)).toContain('profile.downloadsUsed (used:2, limit:2)');
  });

  it('says nothing about an allowance when the plan sets no limit', () => {
    const underTest = render(<ProfileView {...defaults()} downloadLimit={Infinity} />);
    openTab(underTest, 'manage');

    expect(byTestId(underTest, 'profile-downloads-used')).toHaveLength(0);
  });

  it('offers an empty line rather than a bare tab when nothing is downloaded', () => {
    const underTest = render(<ProfileView {...defaults()} downloads={[]} />);
    openTab(underTest, 'manage');

    expect(byTestId(underTest, 'profile-downloads-empty')).toHaveLength(1);
    expect(textsIn(underTest)).toContain('profile.downloadsEmpty');
  });

  it('passes a tapped download up to be opened', () => {
    const props = defaults();
    const underTest = render(<ProfileView {...props} />);
    openTab(underTest, 'manage');

    fireEvent.press(byTestId(underTest, 'download-row-moon-bear')[0]);

    expect(props.onOpenDownload).toHaveBeenCalledTimes(1);
    expect(props.onOpenDownload.mock.calls[0][0]).toEqual(DOWNLOADS[0]);
  });

  it('passes a removal request up rather than deleting anything itself', () => {
    const props = defaults();
    const underTest = render(<ProfileView {...props} />);
    openTab(underTest, 'manage');

    fireEvent.press(byTestId(underTest, 'download-row-delete-sleepy-fox')[0]);

    expect(props.onDeleteDownload).toHaveBeenCalledWith(DOWNLOADS[1]);
  });

  it('puts the whole badge wall up, earned and locked alike', () => {
    const underTest = render(<ProfileView {...defaults()} />);
    openTab(underTest, 'badges');

    expect(byTestId(underTest, 'badge-wall')).toHaveLength(1);
    for (const entry of BADGES) {
      expect(byTestId(underTest, `badge-wall-item-${entry.id}`).length).toBeGreaterThan(0);
    }
  });

  it('reports a tapped badge so the page above can open its detail', () => {
    const props = defaults();
    const underTest = render(<ProfileView {...props} />);
    openTab(underTest, 'badges');

    fireEvent.press(byTestId(underTest, 'badge-wall-item-one')[0]);

    expect(props.onSelectBadge).toHaveBeenCalledWith(BADGES[0]);
  });
});

/**
 * The face and name at the top are not just a heading: they are the way to
 * change them. A chevron beside the name says so, and a tap on any of it
 * asks the page above to open the edit page.
 */
describe('the profile hero', () => {
  beforeEach(() => {
    mockAppState.userAvatarId = 'fox';
    mockAppState.userNickname = 'Freya';
  });

  it('wears a chevron beside the name so it reads as editable', () => {
    const underTest = render(<ProfileView {...defaults()} />);

    expect(byTestId(underTest, 'profile-hero-chevron').length).toBeGreaterThan(0);
  });

  it('hands the tour a target holding just the face and the name', () => {
    const underTest = render(<ProfileView {...defaults()} />);

    const focus = byTestId(underTest, 'profile-hero-focus')[0];

    expect(focus).toBeTruthy();
    expect(focus.findAll((n: any) => n.props.testID === 'profile-hero-avatar-image').length).toBeGreaterThan(0);
    expect(focus.findAll((n: any) => n.props.testID === 'profile-hero-chevron').length).toBeGreaterThan(0);
    expect(focus.findAll((n: any) => n.props.testID === 'profile-tabs').length).toBe(0);
    // Inside the centred control, so it can only ever be as wide as the two of them.
    const hero = byTestId(underTest, 'profile-hero').find((n: any) => n.props.accessibilityRole === 'button');
    expect(hero.findAll((n: any) => n.props.testID === 'profile-hero-focus').length).toBeGreaterThan(0);
  });

  it('is one tappable control, named for a screen reader as editing the profile', () => {
    const underTest = render(<ProfileView {...defaults()} />);

    const hero = byTestId(underTest, 'profile-hero').find((n: any) => n.props.accessibilityRole === 'button');

    expect(hero).toBeTruthy();
    expect(hero.props.accessibilityLabel).toBe('common.editProfile');
  });

  it('asks the page above to open the edit page when tapped', () => {
    const props = defaults();
    const underTest = render(<ProfileView {...props} />);

    fireEvent.press(byTestId(underTest, 'profile-hero').find((n: any) => n.props.accessibilityRole === 'button'));

    expect(props.onEditProfile).toHaveBeenCalledTimes(1);
  });
});

describe('signing in from the profile', () => {
  it('offers a guest the login page, under the name and above the tabs', () => {
    const props = defaults();
    const tree = render(<ProfileView {...props} needsSignIn />);

    const pill = byTestId(tree, 'profile-session').filter((n: any) => n.props.accessibilityRole === 'button')[0];
    expect(pill.props.accessibilityLabel).toBe('common.login');
    fireEvent.press(pill);
    expect(props.onLogin).toHaveBeenCalledTimes(1);
    const order = tree.UNSAFE_root
      .findAll((n: any) => ['profile-hero', 'profile-session', 'profile-tab-saved'].includes(n.props.testID))
      .map((n: any) => n.props.testID)
      .filter((id: string, index: number, all: string[]) => all.indexOf(id) === index);
    expect(order).toEqual(['profile-hero', 'profile-session', 'profile-tab-saved']);
  });

  it('tells a signed-in family so, with no button to sign in or out here', () => {
    const props = defaults();
    const tree = render(<ProfileView {...props} needsSignIn={false} />);

    expect(byTestId(tree, 'profile-session-card').length).toBeGreaterThan(0);
    expect(byTestId(tree, 'profile-session').filter((n: any) => n.props.accessibilityRole === 'button')).toHaveLength(0);
  });
});
