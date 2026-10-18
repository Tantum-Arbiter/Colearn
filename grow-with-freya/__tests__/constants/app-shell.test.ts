/**
 * The app shell mounts the main app tree once the journey reaches login, and
 * keeps it mounted through the login and loading overlays, so the main menu the
 * child sees revealed is the one they go on to use.
 */

import { appTreeMounted, authEntrance, authOverlayUp, landsOnMainMenu, menuRevealed, pageAfterAuth, type AppView } from '@/constants/app-shell';

describe('appTreeMounted', () => {
  it.each<AppView>(['login', 'loading', 'app', 'story-reader'])('mounts the app tree during %s', (view) => {
    expect(appTreeMounted(view)).toBe(true);
  });

  it.each<AppView>(['splash', 'onboarding'])('keeps the app tree out during %s', (view) => {
    expect(appTreeMounted(view)).toBe(false);
  });
});

describe('authOverlayUp', () => {
  it.each<AppView>(['login', 'loading'])('floats the sign-in overlay over the app during %s', (view) => {
    expect(authOverlayUp(view)).toBe(true);
  });

  it.each<AppView>(['splash', 'onboarding', 'app', 'story-reader'])('has no overlay during %s', (view) => {
    expect(authOverlayUp(view)).toBe(false);
  });
});

describe('menuRevealed', () => {
  it('is the app tree with nothing over it', () => {
    expect(menuRevealed('app')).toBe(true);
    expect(menuRevealed('story-reader')).toBe(true);
  });

  it('is not while the sign-in overlay covers it, nor before it exists', () => {
    expect(menuRevealed('login')).toBe(false);
    expect(menuRevealed('loading')).toBe(false);
    expect(menuRevealed('onboarding')).toBe(false);
  });
});

// sign-in opened from a page in the app slides up over that page and hands the
// child back to it; at launch it fades in and leads to the main menu
describe('authEntrance', () => {
  it.each<AppView>(['app', 'story-reader'])('slides sign-in up over the page when opened from %s', (from) => {
    expect(authEntrance(from)).toBe('slide');
  });

  it.each<AppView>(['splash', 'onboarding'])('fades sign-in in when the journey reaches it from %s', (from) => {
    expect(authEntrance(from)).toBe('fade');
  });
});

describe('pageAfterAuth', () => {
  it('returns to the page that opened sign-in', () => {
    expect(pageAfterAuth('stories')).toBe('stories');
    expect(pageAfterAuth('account')).toBe('account');
  });

  it('goes to the main menu when sign-in came first', () => {
    expect(pageAfterAuth(null)).toBe('main');
  });
});

// the journey check runs again whenever the sign-in flag changes; once the app
// is up it must leave the page alone, or a guest who signed in from Profile is
// carried off to the main menu
describe('landsOnMainMenu', () => {
  it.each<AppView>(['splash', 'onboarding'])('opens the app on the main menu when coming from %s', (from) => {
    expect(landsOnMainMenu(from)).toBe(true);
  });

  it.each<AppView>(['login', 'loading', 'app', 'story-reader'])('leaves the page as it is when coming from %s', (from) => {
    expect(landsOnMainMenu(from)).toBe(false);
  });
});
