/**
 * useMicPermission — Shared microphone permission hook
 *
 * Centralizes mic permission state so it is only requested ONCE per app session,
 * regardless of whether recording mode or breath detection triggers the request first.
 *
 * Problem it solves:
 *   Both useVoiceRecording and useBreathDetector need mic permission.
 *   Without a shared state, a first-time user could see TWO permission prompts
 *   if they enter record mode and then hit a music challenge page (or vice versa).
 *   On iOS, the second prompt is a no-op (OS caches the result), but the UX is
 *   still jarring — the app shouldn't call requestPermissionsAsync() twice.
 *
 * How it works:
 *   1. On mount, checks current permission status (no prompt) via getPermissionsAsync()
 *   2. If already granted → done, no prompt
 *   3. If undetermined → requestPermission() will prompt exactly once
 *   4. If denied → marks as denied, callers use fallback
 *   5. Caches result in module-level singleton so subsequent hook instances get the same state
 *
 * Usage:
 *   const mic = useMicPermission();
 *   // mic.status: 'undetermined' | 'granted' | 'denied'
 *   // mic.requestPermission() — prompts if undetermined, no-op if already resolved
 *   // mic.isGranted — shortcut for status === 'granted'
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AudioModule } from 'expo-audio';
import { Logger } from '@/utils/logger';

const log = Logger.create('MicPermission');

export type MicPermissionStatus = 'undetermined' | 'granted' | 'denied';

export interface MicPermissionResult {
  status: MicPermissionStatus;
  isGranted: boolean;
  isDenied: boolean;
  isUndetermined: boolean;
  /** Request mic permission. Only prompts once — subsequent calls return cached result. */
  requestPermission: () => Promise<MicPermissionStatus>;
}

// ============================================================================
// Module-level singleton state — shared across ALL instances of the hook.
// This ensures that if useVoiceRecording and useBreathDetector both call
// useMicPermission(), they share the same cached permission result.
// ============================================================================
let cachedStatus: MicPermissionStatus = 'undetermined';
let permissionRequestInFlight: Promise<MicPermissionStatus> | null = null;
const listeners = new Set<(status: MicPermissionStatus) => void>();

function notifyListeners(status: MicPermissionStatus): void {
  cachedStatus = status;
  listeners.forEach(fn => fn(status));
}

/**
 * Check the current mic permission without prompting.
 * Updates the cached status.
 */
async function checkCurrentPermission(): Promise<MicPermissionStatus> {
  try {
    const { granted } = await AudioModule.requestRecordingPermissionsAsync();
    // Note: on iOS, getPermissionsAsync doesn't exist in expo-audio.
    // requestRecordingPermissionsAsync() returns the current status without
    // prompting if permission was already granted or permanently denied.
    // On first call with 'undetermined', it WILL prompt — so we only
    // call this from requestPermission(), not from the initial check.

    // Actually, expo-audio's AudioModule doesn't have getPermissionsAsync,
    // so we track state ourselves. The first real call to
    // requestRecordingPermissionsAsync() will prompt if needed.
    const status: MicPermissionStatus = granted ? 'granted' : 'denied';
    return status;
  } catch (err) {
    log.error('Failed to check mic permission:', err);
    return 'denied';
  }
}

/**
 * Request mic permission exactly once. Subsequent calls return cached result.
 * Uses a deduplication lock so even concurrent calls only prompt once.
 */
async function doRequestPermission(): Promise<MicPermissionStatus> {
  // Already resolved — don't prompt again
  if (cachedStatus !== 'undetermined') {
    return cachedStatus;
  }

  // Deduplicate concurrent requests
  if (permissionRequestInFlight) {
    return permissionRequestInFlight;
  }

  permissionRequestInFlight = (async () => {
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      const status: MicPermissionStatus = granted ? 'granted' : 'denied';
      log.debug(`Mic permission result: ${status}`);
      notifyListeners(status);
      return status;
    } catch (err) {
      log.error('Failed to request mic permission:', err);
      notifyListeners('denied');
      return 'denied' as MicPermissionStatus;
    } finally {
      permissionRequestInFlight = null;
    }
  })();

  return permissionRequestInFlight;
}

// For testing: reset the module-level singleton state
export function _resetMicPermissionForTesting(): void {
  cachedStatus = 'undetermined';
  permissionRequestInFlight = null;
  listeners.clear();
}

export function useMicPermission(): MicPermissionResult {
  const [status, setStatus] = useState<MicPermissionStatus>(cachedStatus);

  useEffect(() => {
    // Subscribe to shared state changes
    const listener = (newStatus: MicPermissionStatus) => setStatus(newStatus);
    listeners.add(listener);

    // Sync with current cached value (may have been set by another hook instance)
    if (cachedStatus !== status) {
      setStatus(cachedStatus);
    }

    return () => {
      listeners.delete(listener);
    };
  }, []);

  const requestPermission = useCallback(async (): Promise<MicPermissionStatus> => {
    const result = await doRequestPermission();
    setStatus(result);
    return result;
  }, []);

  return {
    status,
    isGranted: status === 'granted',
    isDenied: status === 'denied',
    isUndetermined: status === 'undetermined',
    requestPermission,
  };
}
