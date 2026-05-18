/**
 * AnalyticsService -Privacy-safe, anonymous analytics for business insights.
 *
 * Design principles:
 * - No PII: no userId, deviceId, IP, or child data
 * - Session-scoped: UUID regenerated each app launch (non-persistent)
 * - Consent-gated: only sends if parent gave consent during onboarding
 * - End-of-session batch: one POST when app backgrounds / session ends
 * - Fire-and-forget: network failures silently ignored (analytics never blocks UX)
 * - Duration bucketing: exact durations converted to ranges for anonymity
 *
 * Events are buffered in memory and flushed:
 * 1. When the app goes to background (AppState change)
 * 2. When flush() is explicitly called (e.g., on logout)
 * 3. When buffer exceeds MAX_BUFFER_SIZE (safety valve)
 */

import { Platform, AppState, AppStateStatus } from 'react-native';
import Constants from 'expo-constants';
import { Logger } from '@/utils/logger';
import { SecureStorage } from './secure-storage';

const log = Logger.create('Analytics');

const extra = Constants.expoConfig?.extra || {};
const GATEWAY_URL = extra.gatewayUrl || process.env.EXPO_PUBLIC_GATEWAY_URL || 'http://localhost:8080';
const MAX_BUFFER_SIZE = 100;
const FLUSH_TIMEOUT_MS = 5000;

// --- Types ---

interface AnalyticsEvent {
  event: string;
  properties: Record<string, string>;
}

interface EventBatch {
  sessionId: string;
  platform: string;
  appVersion: string;
  locale: string;
  events: AnalyticsEvent[];
}

export type DurationBucket = '<1min' | '1-3min' | '3-5min' | '5-10min' | '10-20min' | '20min+';

// --- Duration bucketing ---

export function bucketDuration(seconds: number): DurationBucket {
  if (seconds < 60) return '<1min';
  if (seconds < 180) return '1-3min';
  if (seconds < 300) return '3-5min';
  if (seconds < 600) return '5-10min';
  if (seconds < 1200) return '10-20min';
  return '20min+';
}

// --- Service ---

class AnalyticsServiceImpl {
  private sessionId: string;
  private buffer: AnalyticsEvent[] = [];
  private locale: string = 'en';
  private consentGiven: boolean = false;
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
  private sessionStartTime: number = Date.now();

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  /** Call once during app startup after store hydration */
  initialize(locale: string, consentGiven: boolean): void {
    this.locale = locale;
    this.consentGiven = consentGiven;
    this.sessionStartTime = Date.now();

    // Listen for app backgrounding to flush
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);

    if (consentGiven) {
      this.track('session_started', {});
      log.debug('Initialized (consent=true)');
    } else {
      log.debug('Initialized (consent=false, events will be discarded)');
    }
  }

  /** Update consent status (e.g., if user grants consent mid-session) */
  setConsent(given: boolean): void {
    this.consentGiven = given;
  }

  /** Update locale if user changes language */
  setLocale(locale: string): void {
    this.locale = locale;
  }

  // --- Core tracking ---

  track(event: string, properties: Record<string, string>): void {
    if (!this.consentGiven) return;

    this.buffer.push({ event, properties });

    if (this.buffer.length >= MAX_BUFFER_SIZE) {
      this.flush();
    }
  }

  // --- Typed convenience methods ---

  trackStoryOpened(storyId: string, category: string, storyType: string): void {
    this.track('story_opened', { storyId, category, storyType });
  }

  trackStoryCompleted(storyId: string, durationSeconds: number, pagesViewed: number): void {
    this.track('story_completed', {
      storyId,
      durationBucket: bucketDuration(durationSeconds),
      pagesViewed: String(pagesViewed),
    });
  }

  trackStoryAbandoned(storyId: string, lastPage: number, durationSeconds: number): void {
    this.track('story_abandoned', {
      storyId,
      lastPage: String(lastPage),
      durationBucket: bucketDuration(durationSeconds),
    });
  }

  trackMusicChallengeCompleted(storyId: string, instrumentId: string): void {
    this.track('music_challenge_completed', { storyId, instrumentId });
  }

  trackMusicChallengeFailed(storyId: string, instrumentId: string): void {
    this.track('music_challenge_failed', { storyId, instrumentId });
  }

  trackPractiseSession(instrumentId: string, songIndex: number, durationSeconds: number): void {
    this.track('practise_session', {
      instrumentId,
      songIndex: String(songIndex),
      durationBucket: bucketDuration(durationSeconds),
    });
  }

  trackFreeplaySession(instrumentId: string, durationSeconds: number): void {
    this.track('freeplay_session', {
      instrumentId,
      durationBucket: bucketDuration(durationSeconds),
    });
  }

  trackInstrumentSelected(instrumentId: string): void {
    this.track('instrument_selected', { instrumentId });
  }

  trackOnboardingStep(step: string, result: 'completed' | 'abandoned'): void {
    this.track('onboarding_step', { step, result });
  }

  trackOnboardingCompleted(): void {
    this.track('onboarding_completed', {});
  }

  trackOnboardingAbandoned(step: string): void {
    this.track('onboarding_abandoned', { step });
  }

  trackSubscriptionOverlayShown(trigger: string): void {
    this.track('subscription_overlay_shown', { trigger });
  }

  trackSubscriptionOverlayDismissed(trigger: string): void {
    this.track('subscription_overlay_dismissed', { trigger });
  }

  trackDownloadLimitReached(): void {
    this.track('download_limit_reached', {});
  }

  trackShareToUnlock(storyId: string): void {
    this.track('share_to_unlock', { storyId });
  }

  trackDownloadStarted(storyId: string): void {
    this.track('download_started', { storyId });
  }

  trackDownloadCompleted(storyId: string): void {
    this.track('download_completed', { storyId });
  }

  trackDownloadFailed(storyId: string, reason: string): void {
    this.track('download_failed', { storyId, reason });
  }

  trackAppError(errorType: string): void {
    this.track('app_error', { errorType });
  }

  // --- Flush ---

  async flush(): Promise<void> {
    if (!this.consentGiven || this.buffer.length === 0) {
      this.buffer = [];
      return;
    }

    const eventsToSend = [...this.buffer];
    this.buffer = [];

    const batch: EventBatch = {
      sessionId: this.sessionId,
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version || 'unknown',
      locale: this.locale,
      events: eventsToSend,
    };

    try {
      const accessToken = await SecureStorage.getAccessToken();
      if (!accessToken) {
        log.debug('No auth token, discarding analytics batch');
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FLUSH_TIMEOUT_MS);

      await fetch(`${GATEWAY_URL}/api/analytics/events`, {
        method: 'POST',
        // PRIVACY: Only send Content-Type and auth. Do NOT send device headers
        // (X-Device-ID etc.) -analytics must not transmit persistent identifiers.
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(batch),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      log.debug(`Flushed ${eventsToSend.length} events`);
    } catch (error) {
      // Fire-and-forget -analytics should never block UX
      log.debug(`Flush failed (${eventsToSend.length} events discarded)`);
    }
  }

  /** End session: track session_ended, flush, clean up */
  async endSession(): Promise<void> {
    const durationSeconds = Math.floor((Date.now() - this.sessionStartTime) / 1000);
    this.track('session_ended', { durationBucket: bucketDuration(durationSeconds) });
    await this.flush();
  }

  /** Clean up listeners */
  destroy(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }

  // --- Internals ---

  private handleAppStateChange = (state: AppStateStatus): void => {
    if (state === 'background' || state === 'inactive') {
      this.flush();
    }
  };

  private generateSessionId(): string {
    // Simple UUID v4 -non-persistent, regenerated each launch
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // --- Testing helpers ---

  /** @internal -for tests only */
  _getBuffer(): AnalyticsEvent[] { return this.buffer; }
  _getSessionId(): string { return this.sessionId; }
  _isConsentGiven(): boolean { return this.consentGiven; }
  _resetForTesting(): void {
    this.buffer = [];
    this.sessionId = this.generateSessionId();
    this.consentGiven = false;
    this.locale = 'en';
  }
}

/** Singleton instance */
export const AnalyticsService = new AnalyticsServiceImpl();
