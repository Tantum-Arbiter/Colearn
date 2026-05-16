import * as Sentry from '@sentry/react-native';
import { Logger } from '@/utils/logger';

const log = Logger.create('Sentry');

let isInitialized = false;

// Only call after user consent
export function initializeSentry(): void {
  if (isInitialized) {
    log.debug('Already initialized, skipping');
    return;
  }

  log.info('Initializing crash reporting…');
  
  Sentry.init({
    dsn: 'https://0de17ab586a0e7cd361706a1054022bb@o4510552687902720.ingest.de.sentry.io/4510552711364688',

    // Disable PII collection for privacy - we only need crash data
    sendDefaultPii: false,

    // Enable Logs
    enableLogs: true,

    // Configure Session Replay - reduced sample rate for privacy
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1,
    integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

    // Only capture errors, not transactions for minimal data collection
    tracesSampleRate: 0,
  });

  isInitialized = true;
  log.info('Crash reporting initialized');
}

export function disableSentry(): void {
  if (!isInitialized) {
    log.debug('Not initialized, nothing to disable');
    return;
  }

  log.info('Disabling crash reporting…');

  // Close Sentry client to stop sending events
  Sentry.close();
  isInitialized = false;

  log.info('Crash reporting disabled');
}

export function isSentryInitialized(): boolean {
  return isInitialized;
}

export function updateSentryConsent(enabled: boolean): void {
  if (enabled && !isInitialized) {
    initializeSentry();
  } else if (!enabled && isInitialized) {
    disableSentry();
  }
}

