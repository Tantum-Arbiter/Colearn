/**
 * jigsaw-shapes.ts -Generates SVG clip-path data for jigsaw puzzle tiles.
 *
 * Each tile edge can be:
 *   - flat   (outer border of the puzzle)
 *   - tab    (convex bump protruding outward)
 *   - blank  (concave indent matching a neighbour's tab)
 *
 * Adjacent tiles share a complementary edge: one has a tab, the other a blank.
 * The tab/blank assignment is deterministic per grid position so pieces always
 * fit together identically.
 *
 * The jigsaw "nub" is drawn with two cubic Bézier curves forming a rounded
 * bump (or indent) at the midpoint of each edge.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EdgeType = 'flat' | 'tab' | 'blank';

export interface TileEdges {
  top: EdgeType;
  right: EdgeType;
  bottom: EdgeType;
  left: EdgeType;
}

// ---------------------------------------------------------------------------
// Edge assignment
// ---------------------------------------------------------------------------

/**
 * Deterministically assign tab/blank for each internal edge of an NxN grid.
 * Convention: for a shared edge the tile on top/left gets 'tab', the tile
 * on bottom/right gets 'blank'. This is arbitrary but consistent.
 */
export function getTileEdges(row: number, col: number, gridSize: number): TileEdges {
  return {
    top:    row === 0             ? 'flat' : 'blank',   // top neighbour has 'tab' on its bottom
    bottom: row === gridSize - 1  ? 'flat' : 'tab',
    left:   col === 0             ? 'flat' : 'blank',   // left neighbour has 'tab' on its right
    right:  col === gridSize - 1  ? 'flat' : 'tab',
  };
}

// ---------------------------------------------------------------------------
// SVG path generation
// ---------------------------------------------------------------------------

/** Size of the nub as a fraction of the edge length. */
const NUB_SIZE = 0.18;
/** How far along the edge the nub starts (centred). */
const NUB_START = 0.35;
const NUB_END = 0.65;

/**
 * Build an SVG path `d` string that traces the outline of one jigsaw tile.
 * The path is defined in a local coordinate system where the tile occupies
 * [0, 0] → [w, h].
 *
 * `nubScale` controls how far the nub protrudes. Positive = outward (tab),
 * negative = inward (blank).
 */
export function buildTileClipPath(
  w: number,
  h: number,
  edges: TileEdges,
): string {
  const parts: string[] = [];

  // Start at top-left corner
  parts.push(`M 0 0`);

  // ── Top edge (left → right) ──
  parts.push(topEdgePath(w, h, edges.top));

  // ── Right edge (top → bottom) ──
  parts.push(rightEdgePath(w, h, edges.right));

  // ── Bottom edge (right → left) ──
  parts.push(bottomEdgePath(w, h, edges.bottom));

  // ── Left edge (bottom → top) ──
  parts.push(leftEdgePath(w, h, edges.left));

  parts.push('Z');
  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Individual edge paths
// ---------------------------------------------------------------------------

function topEdgePath(w: number, _h: number, edge: EdgeType): string {
  if (edge === 'flat') return `L ${w} 0`;
  const dir = edge === 'tab' ? -1 : 1; // tab goes up (negative y), blank goes down
  const nw = w * NUB_SIZE;
  const x1 = w * NUB_START;
  const x2 = w * NUB_END;
  const cy = dir * nw;
  return `L ${x1} 0 C ${x1} ${cy}, ${x2} ${cy}, ${x2} 0 L ${w} 0`;
}

function rightEdgePath(w: number, h: number, edge: EdgeType): string {
  if (edge === 'flat') return `L ${w} ${h}`;
  const dir = edge === 'tab' ? 1 : -1; // tab goes right (positive x), blank goes left
  const nh = h * NUB_SIZE;
  const y1 = h * NUB_START;
  const y2 = h * NUB_END;
  const cx = w + dir * nh;
  return `L ${w} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${w} ${y2} L ${w} ${h}`;
}

function bottomEdgePath(w: number, h: number, edge: EdgeType): string {
  if (edge === 'flat') return `L 0 ${h}`;
  const dir = edge === 'tab' ? 1 : -1; // tab goes down (positive y), blank goes up
  const nw = w * NUB_SIZE;
  const x1 = w * NUB_END;
  const x2 = w * NUB_START;
  const cy = h + dir * nw;
  return `L ${x1} ${h} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${h} L 0 ${h}`;
}

function leftEdgePath(_w: number, h: number, edge: EdgeType): string {
  if (edge === 'flat') return `L 0 0`;
  const dir = edge === 'tab' ? -1 : 1; // tab goes left (negative x), blank goes right
  const nh = h * NUB_SIZE;
  const y1 = h * NUB_END;
  const y2 = h * NUB_START;
  const cx = dir * nh;
  return `L 0 ${y1} C ${cx} ${y1}, ${cx} ${y2}, 0 ${y2} L 0 0`;
}

// ---------------------------------------------------------------------------
// Boundary lines for overlay (idle state)
// ---------------------------------------------------------------------------

/**
 * Generate SVG path data for all internal jigsaw boundary lines of an NxN grid.
 * These lines show the cut pattern over the complete image.
 */
export function buildBoundaryLines(
  totalWidth: number,
  totalHeight: number,
  gridSize: number,
): string {
  const tw = totalWidth / gridSize;
  const th = totalHeight / gridSize;
  const parts: string[] = [];

  // Horizontal lines (between rows)
  for (let row = 1; row < gridSize; row++) {
    const y = row * th;
    let x = 0;
    parts.push(`M 0 ${y}`);
    for (let col = 0; col < gridSize; col++) {
      // The edge between row-1 and row at this column
      // row-1 bottom = 'tab', so the line bulges downward
      const nw = tw * NUB_SIZE;
      const x1 = x + tw * NUB_START;
      const x2 = x + tw * NUB_END;
      const cy = y + nw; // tab = downward
      parts.push(`L ${x1} ${y} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y}`);
      x += tw;
    }
    parts.push(`L ${totalWidth} ${y}`);
  }

  // Vertical lines (between columns)
  for (let col = 1; col < gridSize; col++) {
    const x = col * tw;
    let y = 0;
    parts.push(`M ${x} 0`);
    for (let row = 0; row < gridSize; row++) {
      const nh = th * NUB_SIZE;
      const y1 = y + th * NUB_START;
      const y2 = y + th * NUB_END;
      const cx = x + nh; // tab = rightward
      parts.push(`L ${x} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x} ${y2}`);
      y += th;
    }
    parts.push(`L ${x} ${totalHeight}`);
  }

  return parts.join(' ');
}
