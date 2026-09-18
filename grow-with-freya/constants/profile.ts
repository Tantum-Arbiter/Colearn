/**
 * Nickname rules, shared by onboarding and the account editor so the two can
 * never drift apart.
 */

/** Below this, Continue stays disabled and the field shows no tick. */
export const MIN_NICKNAME_LENGTH = 2;

/** The greeting on the login screen is set in 40pt serif, so the name has to
 *  stay short enough not to wrap it. */
export const MAX_NICKNAME_LENGTH = 14;
