export interface SessionFlags {
  isGuestMode: boolean;
  sessionLapsed: boolean;
}

/**
 * Whether the family needs to sign in: browsing as a guest, or signed in
 * once but the app could no longer refresh the session. Both are answered
 * by the login page, and both are what the profile slot's cue is for.
 */
export function needsSignIn(state: SessionFlags): boolean {
  return state.isGuestMode || state.sessionLapsed;
}
