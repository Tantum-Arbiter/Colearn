import { SNAP_RADIUS, fitArt, slotIn, toScreen, zoneAt, type ArtFit } from '@/components/experience/engines/place/place-geometry';
import type { Frame, ZonePlace } from '@/types/game-pack';

const PHONE_ART = { width: 1086, height: 1448 };
const TABLET_ART = { width: 1448, height: 1086 };
const NO_INSETS = { top: 0, bottom: 0, left: 0, right: 0 };

describe('fitArt', () => {
  it.each([
    ['iPhone SE', 375, 667, { top: 20, bottom: 0, left: 0, right: 0 }],
    ['iPhone 16 Pro', 402, 874, { top: 62, bottom: 34, left: 0, right: 0 }],
    ['a small Android phone', 360, 640, { top: 24, bottom: 0, left: 0, right: 0 }],
  ])('keeps the phone painting whole inside the safe area on %s', (_, width, height, insets) => {
    const fit = fitArt(PHONE_ART, { width, height, insets });

    expect(fit.width).toBeLessThanOrEqual(width - insets.left - insets.right + 0.001);
    expect(fit.height).toBeLessThanOrEqual(height - insets.top - insets.bottom + 0.001);
    expect(fit.left).toBeGreaterThanOrEqual(insets.left);
    expect(fit.top).toBeGreaterThanOrEqual(insets.top);
    expect(Math.abs(fit.width / fit.height - PHONE_ART.width / PHONE_ART.height)).toBeLessThan(0.001);
  });

  it.each([
    ['iPad 11 upright', 834, 1194],
    ['iPad 11 on its side', 1194, 834],
    ['iPad 13 upright', 1032, 1376],
    ['iPad 13 on its side', 1376, 1032],
  ])('keeps the tablet painting whole in both orientations: %s', (_, width, height) => {
    const fit = fitArt(TABLET_ART, { width, height, insets: { top: 24, bottom: 20, left: 0, right: 0 } });

    expect(fit.width).toBeLessThanOrEqual(width + 0.001);
    expect(fit.height).toBeLessThanOrEqual(height - 44 + 0.001);
    expect(Math.abs(fit.width / fit.height - TABLET_ART.width / TABLET_ART.height)).toBeLessThan(0.001);
  });

  it('fills the safe width when the painting is the shape of the screen', () => {
    const fit = fitArt(TABLET_ART, { width: 1448, height: 1086, insets: NO_INSETS });

    expect(fit).toEqual({ scale: 1, left: 0, top: 0, width: 1448, height: 1086 });
  });

  it('centres the painting in the room left over', () => {
    const fit = fitArt(TABLET_ART, { width: 1448, height: 2000, insets: NO_INSETS });

    expect(fit.top).toBeCloseTo((2000 - 1086) / 2, 5);
    expect(fit.left).toBe(0);
  });

  it('has no size at all before the screen is measured', () => {
    expect(fitArt(TABLET_ART, { width: 0, height: 0, insets: NO_INSETS })).toEqual({ scale: 0, left: 0, top: 0, width: 0, height: 0 });
    expect(fitArt(TABLET_ART, { width: Number.NaN, height: 800, insets: NO_INSETS })).toEqual({ scale: 0, left: 0, top: 0, width: 0, height: 0 });
  });
});

describe('toScreen', () => {
  const fit: ArtFit = { scale: 0.5, left: 10, top: 20, width: 724, height: 543 };

  it('scales and shifts a frame from painting pixels to screen points', () => {
    expect(toScreen({ x: 100, y: 200, w: 50, h: 40 }, fit)).toEqual({ left: 60, top: 120, width: 25, height: 20 });
  });
});

describe('zoneAt', () => {
  const leaf: ZonePlace = { id: 'leaf', frame: { x: 100, y: 100, w: 200, h: 100 } };
  const pond: ZonePlace = { id: 'pond', frame: { x: 600, y: 100, w: 100, h: 100 } };
  const fit: ArtFit = { scale: 1, left: 0, top: 0, width: 1000, height: 1000 };

  it('finds the zone a point is inside', () => {
    expect(zoneAt({ x: 150, y: 150 }, [leaf, pond], fit)).toBe('leaf');
    expect(zoneAt({ x: 650, y: 150 }, [leaf, pond], fit)).toBe('pond');
  });

  it.each([
    [SNAP_RADIUS - 1, 'leaf'],
    [SNAP_RADIUS, 'leaf'],
    [SNAP_RADIUS + 1, null],
  ])('snaps a point %i points past the edge of a zone: %s', (past, expected) => {
    expect(zoneAt({ x: 300 + past, y: 150 }, [leaf, pond], fit)).toBe(expected);
    expect(zoneAt({ x: 150, y: 200 + past }, [leaf, pond], fit)).toBe(expected);
  });

  it('measures the snap in screen points, whatever the painting`s scale', () => {
    const half: ArtFit = { scale: 0.5, left: 0, top: 0, width: 500, height: 500 };

    expect(zoneAt({ x: 150 + SNAP_RADIUS, y: 75 }, [leaf], half)).toBe('leaf');
    expect(zoneAt({ x: 150 + SNAP_RADIUS + 1, y: 75 }, [leaf], half)).toBeNull();
  });

  it('takes the nearer zone when two are within reach', () => {
    const near: ZonePlace = { id: 'near', frame: { x: 310, y: 100, w: 50, h: 100 } };

    expect(zoneAt({ x: 304, y: 150 }, [leaf, near], fit)).toBe('leaf');
    expect(zoneAt({ x: 307, y: 150 }, [leaf, near], fit)).toBe('near');
  });

  it('finds nothing far from every zone, and nothing among no zones', () => {
    expect(zoneAt({ x: 500, y: 500 }, [leaf, pond], fit)).toBeNull();
    expect(zoneAt({ x: 150, y: 150 }, [], fit)).toBeNull();
  });
});

describe('slotIn', () => {
  const zone: Frame = { x: 100, y: 100, w: 300, h: 100 };
  const item: Frame = { x: 0, y: 0, w: 50, h: 50 };

  it('lays the things placed in a zone along it, from the left, resting on its floor', () => {
    const first = slotIn(zone, item, 0, 3);
    const second = slotIn(zone, item, 1, 3);
    const third = slotIn(zone, item, 2, 3);

    expect(first.w).toBe(50);
    expect(first.h).toBe(50);
    expect(first.y).toBe(second.y);
    expect(first.x).toBeLessThan(second.x);
    expect(second.x).toBeLessThan(third.x);
    expect(third.x + third.w).toBeLessThanOrEqual(zone.x + zone.w + 0.001);
    expect(first.x).toBeGreaterThanOrEqual(zone.x - 0.001);
    expect(first.y + first.h).toBeLessThanOrEqual(zone.y + zone.h + 0.001);
  });

  it('centres a single thing', () => {
    const only = slotIn(zone, item, 0, 1);

    expect(only.x + only.w / 2).toBeCloseTo(zone.x + zone.w / 2, 5);
  });

  it('shrinks things that would not fit side by side', () => {
    const crowded = slotIn(zone, { x: 0, y: 0, w: 200, h: 200 }, 0, 4);

    expect(crowded.w).toBeLessThan(200);
    expect(crowded.w / crowded.h).toBeCloseTo(1, 5);
    expect(crowded.w * 4).toBeLessThanOrEqual(zone.w + 0.001);
  });
});
