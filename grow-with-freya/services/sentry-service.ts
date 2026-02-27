import * as Sentry from '@sentry/react-native';

let isInitialized = false;

// Only call after user consent
export function initializeSentry(): void {
  if (isInitialized) {
    console.log('[Sentry] Already initialized, skipping');
    return;
  }

  console.log('[Sentry] Initializing crash reporting with user consent');
  
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
  console.log('[Sentry] Crash reporting initialized');
}

export function disableSentry(): void {
  if (!isInitialized) {
    console.log('[Sentry] Not initialized, nothing to disable');
    return;
  }

  console.log('[Sentry] Disabling crash reporting per user request');
  
  // Close Sentry client to stop sending events
  Sentry.close();
  isInitialized = false;
  
  console.log('[Sentry] Crash reporting disabled');
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

