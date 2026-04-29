/**
 * Tests for MusicAnalytics service.
 *
 * Since Logger is disabled in test environment (enabled: !isTest),
 * we verify that each tracking function can be called without errors
 * and that the functions are properly exported. The Logger.debug calls
 * are no-ops in tests, which is the expected behavior.
 */

import {
  trackMusicPageViewed,
  trackMusicModeOpened,
  trackMicPermissionResult,
  trackChallengeStarted,
  trackChallengeCompleted,
  trackChallengeFailedAttempt,
  trackFallbackModeUsed,
  trackAssetError,
  trackConfigValidationError,
} from '@/services/music-analytics';

describe('MusicAnalytics', () => {
  it('should export trackMusicPageViewed and call without error', () => {
    expect(() => trackMusicPageViewed('story-1', 'page-7', 'flute_basic')).not.toThrow();
  });

  it('should export trackMusicModeOpened and call without error', () => {
    expect(() => trackMusicModeOpened('story-1', 'page-3', true)).not.toThrow();
  });

  it('should export trackMicPermissionResult and call without error', () => {
    expect(() => trackMicPermissionResult(true)).not.toThrow();
    expect(() => trackMicPermissionResult(false)).not.toThrow();
  });

  it('should export trackChallengeStarted and call without error', () => {
    expect(() => trackChallengeStarted('story-1', 'page-7', 'flute_basic', 4)).not.toThrow();
  });

  it('should export trackChallengeCompleted and call without error', () => {
    expect(() => trackChallengeCompleted('story-1', 'page-7', 'flute_basic', 3)).not.toThrow();
  });

  it('should export trackChallengeFailedAttempt and call without error', () => {
    expect(() => trackChallengeFailedAttempt('story-1', 'page-7', 2)).not.toThrow();
  });

  it('should export trackFallbackModeUsed and call without error', () => {
    expect(() => trackFallbackModeUsed('story-1', 'page-7', 'permission_denied')).not.toThrow();
  });

  it('should export trackAssetError and call without error', () => {
    expect(() => trackAssetError('story-1', 'page-7', ['instrument:missing', 'song:missing'])).not.toThrow();
  });

  it('should export trackConfigValidationError and call without error', () => {
    expect(() => trackConfigValidationError('story-1', 'page-7', ['missing instrumentId'])).not.toThrow();
  });

  it('should accept correct parameter types for all tracking functions', () => {
    // Verify type compatibility — these just need to not throw
    trackMusicPageViewed('s', 'p', 'i');
    trackMusicModeOpened('s', 'p', false);
    trackMicPermissionResult(true);
    trackChallengeStarted('s', 'p', 'i', 0);
    trackChallengeCompleted('s', 'p', 'i', 5);
    trackChallengeFailedAttempt('s', 'p', 1);
    trackFallbackModeUsed('s', 'p', 'reason');
    trackAssetError('s', 'p', []);
    trackConfigValidationError('s', 'p', ['issue']);
  });
});
