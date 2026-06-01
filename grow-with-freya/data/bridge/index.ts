/**
 * Real World Bridge — Data Index
 *
 * Central lookup for bridge data by activity ID. Re-exports all bridge
 * arrays and provides the getBridgeData() function used by the overlay.
 */

import type { RealWorldBridgeData } from '@/types/real-world-bridge';
import { SPELLING_BRIDGES } from './spelling-bridges';
import { NUMBERS_BRIDGES } from './numbers-bridges';
import { FEELINGS_BRIDGES } from './feelings-bridges';

export { SPELLING_BRIDGES, NUMBERS_BRIDGES, FEELINGS_BRIDGES };

/** All bridge data entries combined */
const ALL_BRIDGES: RealWorldBridgeData[] = [
  ...SPELLING_BRIDGES,
  ...NUMBERS_BRIDGES,
  ...FEELINGS_BRIDGES,
];

/** Lookup map for O(1) access by activity ID */
const BRIDGE_MAP = new Map<string, RealWorldBridgeData>(
  ALL_BRIDGES.map(b => [b.activityId, b])
);

/** Get bridge data for a specific activity ID, or undefined if none exists */
export function getBridgeData(activityId: string): RealWorldBridgeData | undefined {
  return BRIDGE_MAP.get(activityId);
}

/** Get all bridge data entries (45 total) */
export function getAllBridgeData(): RealWorldBridgeData[] {
  return ALL_BRIDGES;
}
