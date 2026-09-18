/**
 * Tests for BlobPanel's path.
 *
 * react-native-svg is mocked, so nothing is rasterised here -- what matters is that
 * the path closes, and that the bulge stays inside the canvas the component draws it
 * on. A control point outside that canvas is silently clipped on device.
 */

import { blobPath } from '@/components/ui/blob-panel';

function coordinates(path: string): { x: number; y: number }[] {
  return (path.match(/-?\d+(\.\d+)?\s+-?\d+(\.\d+)?/g) ?? []).map((pair) => {
    const [x, y] = pair.split(/\s+/).map(Number);
    return { x, y };
  });
}

describe('blobPath', () => {
  it('should close the outline', () => {
    expect(blobPath(300, 200, 40, 6).trim().endsWith('Z')).toBe(true);
  });

  it.each([
    ['a wide card', 540, 320, 46, 7],
    ['a narrow card', 330, 300, 42, 6],
    ['a squat card', 600, 120, 60, 4],
    ['no bow at all', 400, 250, 40, 0],
  ])('should keep every point inside the canvas for %s', (_name, width, height, corner, bow) => {
    const points = coordinates(blobPath(width, height, corner, bow));

    points.forEach(({ x, y }) => {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(width + bow * 2);
      expect(y).toBeLessThanOrEqual(height + bow * 2);
    });
  });

  it('should push the edges out by the bow', () => {
    const bowed = coordinates(blobPath(400, 300, 40, 10));
    const flat = coordinates(blobPath(400, 300, 40, 0));

    expect(Math.max(...bowed.map(p => p.x))).toBeGreaterThan(Math.max(...flat.map(p => p.x)));
  });

  it('should clamp the corner radius to half the shorter side', () => {
    const points = coordinates(blobPath(400, 100, 300, 0));

    // A corner larger than half the height would fold the outline back on itself.
    expect(Math.min(...points.map(p => p.y))).toBeGreaterThanOrEqual(0);
    expect(Math.max(...points.map(p => p.y))).toBeLessThanOrEqual(100);
  });
});
