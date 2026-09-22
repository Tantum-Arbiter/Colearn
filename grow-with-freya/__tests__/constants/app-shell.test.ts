/**
 * The app shell mounts the main app tree once the journey reaches login, and
 * keeps it mounted through the login and loading overlays, so the main menu the
 * child sees revealed is the one they go on to use.
 */

import { appTreeMounted, authOverlayUp, menuRevealed, type AppView } from '@/constants/app-shell';

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
