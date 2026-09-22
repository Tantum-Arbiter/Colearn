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
