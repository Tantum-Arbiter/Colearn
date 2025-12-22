/**
 * Utility functions for formatting time durations
 */

/**
 * Format seconds into a human-readable time string
 * Examples:
 * - 30 seconds -> "30s"
 * - 90 seconds -> "1m 30s"
 * - 3600 seconds -> "1h"
 * - 3690 seconds -> "1h 1m 30s"
 * - 7200 seconds -> "2h"
 */
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds === 0) return "0s";

  // Round to nearest second to avoid floating point display issues
  const roundedSeconds = Math.round(totalSeconds);

  const hours = Math.floor(roundedSeconds / 3600);
  const minutes = Math.floor((roundedSeconds % 3600) / 60);
  const seconds = roundedSeconds % 60;
  
  const parts: string[] = [];
  
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  
  // Only show seconds if less than 1 hour total, or if it's the only unit
  if (hours === 0 && seconds > 0) {
    parts.push(`${seconds}s`);
  }
  
  return parts.join(' ');
}

/**
 * Format seconds into a compact time string for display in limited space
 * Examples:
 * - 30 seconds -> "30s"
 * - 90 seconds -> "1m 30s"
 * - 3600 seconds -> "1h"
 * - 3690 seconds -> "1h 1m"
 * - 7200 seconds -> "2h"
 */
export function formatDurationCompact(totalSeconds: number): string {
  if (totalSeconds === 0) return "0s";

  // Round to nearest second to avoid floating point display issues
  const roundedSeconds = Math.round(totalSeconds);

  const hours = Math.floor(roundedSeconds / 3600);
  const minutes = Math.floor((roundedSeconds % 3600) / 60);
  const seconds = roundedSeconds % 60;
  
  if (hours > 0) {
    if (minutes > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${hours}h`;
  }
  
  if (minutes > 0) {
    if (seconds > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${minutes}m`;
  }
  
  return `${seconds}s`;
}

/**
 * Format seconds into time with context (e.g., "out of 2h")
 * Examples:
 * - formatDurationWithLimit(1800, 3600) -> "30m out of 1h"
 * - formatDurationWithLimit(7200, 7200) -> "2h out of 2h"
 */
export function formatDurationWithLimit(usedSeconds: number, limitSeconds: number): string {
  const used = formatDurationCompact(usedSeconds);
  const limit = formatDurationCompact(limitSeconds);
  return `${used} out of ${limit}`;
}
