/**
 * useJigsawChallenge - React hook for managing jigsaw puzzle state
 *
 * The puzzle slices the page's background image into an NxN grid and
 * randomly scrambles the tiles.  The player selects one tile, then
 * taps an adjacent tile to swap them.  When every tile is back in its
 * original (solved) position the puzzle is complete and celebration
 * text appears.
 *
 * State machine:
 *   idle → playing → completed
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Logger } from '@/utils/logger';
import type { JigsawPuzzle, JigsawGridSize } from '@/types/story';

const log = Logger.create('JigsawChallenge');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type JigsawChallengeState = 'idle' | 'playing' | 'completed';

export interface JigsawChallengeHookResult {
  // State
  state: JigsawChallengeState;
  /** Current tile order - index = visual position, value = original tile id */
  tiles: number[];
  gridSize: number;
  /** Index of the currently-selected tile (-1 = none) */
  selectedTile: number;
  moveCount: number;
  isComplete: boolean;
  /** Indices adjacent to the selected tile that are valid swap targets */
  validSwapTargets: number[];

  // Actions
  start: () => void;
  /** Select or swap a tile.  First tap selects, second tap on adjacent swaps. */
  tapTile: (index: number) => void;
  retry: () => void;
  skip: () => void;
  cleanup: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse "4x4" → 4, "6x6" → 6, etc. */
function parseGridSize(size: JigsawGridSize): number {
  const n = parseInt(size.split('x')[0], 10);
  return isNaN(n) ? 4 : n;
}

/** Create a solved tile array [0, 1, 2, … n*n-1]. */
function createSolvedTiles(n: number): number[] {
  return Array.from({ length: n * n }, (_, i) => i);
}

/**
 * Fisher-Yates shuffle that guarantees the result is solvable AND
 * not already in the solved state.
 *
 * Because we use direct-swap mechanics (not sliding), every permutation
 * is reachable, so any shuffle is solvable.  We just re-shuffle if
 * we accidentally produce the identity permutation.
 */
function shuffleTiles(n: number): number[] {
  const total = n * n;
  let tiles: number[];
  do {
    tiles = createSolvedTiles(n);
    // Fisher-Yates
    for (let i = total - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
  } while (isSolved(tiles));
  return tiles;
}

/** Check if the tile array is in solved order. */
function isSolved(tiles: number[]): boolean {
  return tiles.every((val, idx) => val === idx);
}

/**
 * Return the indices of tiles that are orthogonally adjacent
 * to `index` in an NxN grid.
 */
function getAdjacentIndices(index: number, n: number): number[] {
  const row = Math.floor(index / n);
  const col = index % n;
  const result: number[] = [];
  if (row > 0) result.push((row - 1) * n + col);     // up
  if (row < n - 1) result.push((row + 1) * n + col);  // down
  if (col > 0) result.push(row * n + (col - 1));       // left
  if (col < n - 1) result.push(row * n + (col + 1));   // right
  return result;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useJigsawChallenge(
  config: JigsawPuzzle | undefined,
  onComplete?: () => void,
): JigsawChallengeHookResult {
  const [state, setState] = useState<JigsawChallengeState>('idle');
  const [tiles, setTiles] = useState<number[]>([]);
  const [selectedTile, setSelectedTile] = useState(-1);
  const [moveCount, setMoveCount] = useState(0);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const gridSize = useMemo(() => parseGridSize(config?.gridSize ?? '4x4'), [config?.gridSize]);

  const validSwapTargets = useMemo(() => {
    if (selectedTile < 0) return [];
    return getAdjacentIndices(selectedTile, gridSize);
  }, [selectedTile, gridSize]);

  // Auto-cleanup when config becomes undefined (navigated away)
  useEffect(() => {
    if (!config) {
      setTiles([]);
      setSelectedTile(-1);
      setMoveCount(0);
      if (state !== 'idle') setState('idle');
    }
  }, [config]);

  const start = useCallback(() => {
    if (!config?.enabled) return;
    const n = parseGridSize(config.gridSize);
    const shuffled = shuffleTiles(n);
    setTiles(shuffled);
    setSelectedTile(-1);
    setMoveCount(0);
    setState('playing');
    log.debug(`Jigsaw started: ${config.gridSize} (${n * n} tiles)`);
  }, [config]);

  const tapTile = useCallback((index: number) => {
    if (state !== 'playing') return;
    if (index < 0 || index >= tiles.length) return;

    if (selectedTile < 0) {
      // Nothing selected yet → select this tile
      setSelectedTile(index);
      return;
    }

    if (index === selectedTile) {
      // Tapped the same tile → deselect
      setSelectedTile(-1);
      return;
    }

    // Check adjacency
    const adjacent = getAdjacentIndices(selectedTile, gridSize);
    if (!adjacent.includes(index)) {
      // Not adjacent → re-select the tapped tile instead
      setSelectedTile(index);
      return;
    }

    // Swap the two tiles
    setTiles(prev => {
      const next = [...prev];
      [next[selectedTile], next[index]] = [next[index], next[selectedTile]];

      // Check completion
      if (isSolved(next)) {
        setState('completed');
        log.debug(`Jigsaw completed in ${moveCount + 1} moves`);
        // Defer callback so state updates flush first
        setTimeout(() => onCompleteRef.current?.(), 0);
      }

      return next;
    });
    setMoveCount(prev => prev + 1);
    setSelectedTile(-1);
  }, [state, tiles, selectedTile, gridSize, moveCount]);

  const retry = useCallback(() => {
    if (!config?.enabled) return;
    const n = parseGridSize(config.gridSize);
    setTiles(shuffleTiles(n));
    setSelectedTile(-1);
    setMoveCount(0);
    setState('playing');
    log.debug('Jigsaw retry');
  }, [config]);

  const skip = useCallback(() => {
    if (config?.allowSkip) {
      setState('completed');
      onCompleteRef.current?.();
      log.debug('Jigsaw skipped');
    }
  }, [config]);

  const cleanup = useCallback(() => {
    setTiles([]);
    setSelectedTile(-1);
    setMoveCount(0);
    setState('idle');
    log.debug('Jigsaw cleanup');
  }, []);

  return {
    state,
    tiles,
    gridSize,
    selectedTile,
    moveCount,
    isComplete: state === 'completed',
    validSwapTargets,

    start,
    tapTile,
    retry,
    skip,
    cleanup,
  };
}