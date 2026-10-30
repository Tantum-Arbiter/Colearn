export type AppView = 'splash' | 'onboarding' | 'login' | 'loading' | 'app' | 'main' | 'stories' | 'story-reader' | 'account';

export const AUTH_OVERLAY_Z = 4000;

export function appTreeMounted(view: AppView): boolean {
  return view === 'login' || view === 'loading' || view === 'app' || view === 'story-reader';
}

export function authOverlayUp(view: AppView): boolean {
  return view === 'login' || view === 'loading';
}

export function menuRevealed(view: AppView): boolean {
  return appTreeMounted(view) && !authOverlayUp(view);
}

export type AuthEntrance = 'slide' | 'fade';

export function authEntrance(from: AppView): AuthEntrance {
  return from === 'app' || from === 'story-reader' ? 'slide' : 'fade';
}

export function pageAfterAuth<Page extends string>(returnPage: Page | null): Page | 'main' {
  return returnPage ?? 'main';
}

export function landsOnMainMenu(from: AppView): boolean {
  return !appTreeMounted(from);
}
