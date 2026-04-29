/**
 * MusicAnalytics - Analytics event tracking for the music challenge feature.
 *
 * Uses the app's Logger for structured event logging.
 * These events can later be forwarded to a backend analytics service.
 *
 * Tracked events:
 * - music_page_viewed
 * - music_mode_opened
 * - mic_permission_result
 * - challenge_started
 * - challenge_completed
 * - challenge_failed_attempt
 * - fallback_mode_used
 * - asset_error
 * - config_validation_error
 */

import { Logger } from '@/utils/logger';

const log = Logger.create('MusicAnalytics');

export interface MusicAnalyticsEvent {
  event: string;
  storyId?: string;
  pageId?: string;
  instrumentId?: string;
  songId?: string;
  [key: string]: any;
}

function trackEvent(event: MusicAnalyticsEvent): void {
  log.debug(`[ANALYTICS] ${event.event}`, JSON.stringify(event));
  // TODO: Forward to backend analytics endpoint when available
}

/** Track when a music challenge page is viewed */
export function trackMusicPageViewed(storyId: string, pageId: string, instrumentId: string): void {
  trackEvent({
    event: 'music_page_viewed',
    storyId,
    pageId,
    instrumentId,
  });
}

/** Track when Music Mode is opened from the burger menu */
export function trackMusicModeOpened(storyId: string, pageId: string, hasMusicChallenge: boolean): void {
  trackEvent({
    event: 'music_mode_opened',
    storyId,
    pageId,
    hasMusicChallenge,
  });
}

/** Track mic permission request result */
export function trackMicPermissionResult(granted: boolean): void {
  trackEvent({
    event: 'mic_permission_result',
    granted,
  });
}

/** Track when a music challenge is started */
export function trackChallengeStarted(storyId: string, pageId: string, instrumentId: string, sequenceLength: number): void {
  trackEvent({
    event: 'challenge_started',
    storyId,
    pageId,
    instrumentId,
    sequenceLength,
  });
}

/** Track when a music challenge is completed successfully */
export function trackChallengeCompleted(
  storyId: string,
  pageId: string,
  instrumentId: string,
  failedAttempts: number
): void {
  trackEvent({
    event: 'challenge_completed',
    storyId,
    pageId,
    instrumentId,
    failedAttempts,
  });
}

/** Track a failed attempt in a music challenge */
export function trackChallengeFailedAttempt(storyId: string, pageId: string, attemptNumber: number): void {
  trackEvent({
    event: 'challenge_failed_attempt',
    storyId,
    pageId,
    attemptNumber,
  });
}

/** Track when fallback blow button is used instead of mic */
export function trackFallbackModeUsed(storyId: string, pageId: string, reason: string): void {
  trackEvent({
    event: 'fallback_mode_used',
    storyId,
    pageId,
    reason,
  });
}

/** Track missing or invalid asset references */
export function trackAssetError(storyId: string, pageId: string, missingAssets: string[]): void {
  trackEvent({
    event: 'asset_error',
    storyId,
    pageId,
    missingAssets,
  });
}

/** Track CMS config validation issues */
export function trackConfigValidationError(storyId: string, pageId: string, issues: string[]): void {
  trackEvent({
    event: 'config_validation_error',
    storyId,
    pageId,
    issues,
  });
}
