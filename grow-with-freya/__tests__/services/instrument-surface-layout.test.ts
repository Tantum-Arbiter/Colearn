import { layoutInstrumentSurface } from '@/services/instrument-surface-layout';
import type { NoteLayoutItem } from '@/services/music-asset-registry';

const artwork = { image: 1, aspectRatio: 4, holeDiameter: 0.05 };

const notes: NoteLayoutItem[] = [
  { note: 'C', label: 'C', color: '#111111', hole: { x: 0.25, y: 0.5 } },
  { note: 'D', label: 'D', color: '#222222', hole: { x: 0.5, y: 0.5 } },
  { note: 'E', label: 'E', color: '#333333', hole: { x: 0.75, y: 0.5 } },
];

describe('layoutInstrumentSurface', () => {
  it('fits the artwork to the box width when the box is wide enough', () => {
    const underTest = layoutInstrumentSurface(artwork, notes, { width: 800, height: 400 }, 60);

    expect(underTest).toMatchObject({ width: 800, height: 200 });
  });

  it('fits the artwork to the box height when the box is short', () => {
    const underTest = layoutInstrumentSurface(artwork, notes, { width: 800, height: 100 }, 60);

    expect(underTest).toMatchObject({ width: 400, height: 100 });
  });

  it('centres every note button on its hole', () => {
    const underTest = layoutInstrumentSurface(artwork, notes, { width: 800, height: 400 }, 60)!;

    for (const item of notes) {
      const pos = underTest.positions[item.note];
      expect(pos.left + underTest.buttonSize / 2).toBeCloseTo(item.hole!.x * 800);
      expect(pos.top + underTest.buttonSize / 2).toBeCloseTo(item.hole!.y * 200);
    }
  });

  it('never makes a button smaller than the minimum touch target when holes are far apart', () => {
    const tinyHoles = { ...artwork, holeDiameter: 0.01 };

    const underTest = layoutInstrumentSurface(tinyHoles, notes, { width: 800, height: 400 }, 60)!;

    expect(underTest.buttonSize).toBe(44);
  });

  it('never makes a button larger than the caller maximum', () => {
    const hugeHoles = { ...artwork, holeDiameter: 0.2 };

    const underTest = layoutInstrumentSurface(hugeHoles, notes, { width: 800, height: 400 }, 60)!;

    expect(underTest.buttonSize).toBe(60);
  });

  it('shrinks buttons so neighbouring holes do not overlap', () => {
    const underTest = layoutInstrumentSurface(artwork, notes, { width: 160, height: 400 }, 60)!;

    expect(underTest.buttonSize).toBeLessThanOrEqual(40);
    expect(underTest.buttonSize).toBeGreaterThanOrEqual(artwork.holeDiameter * 160);
  });

  it('skips notes that have no hole', () => {
    const withoutHole: NoteLayoutItem[] = [...notes, { note: 'F', label: 'F', color: '#444444' }];

    const underTest = layoutInstrumentSurface(artwork, withoutHole, { width: 800, height: 400 }, 60)!;

    expect(Object.keys(underTest.positions)).toEqual(['C', 'D', 'E']);
  });

  it('returns null before the box has been measured', () => {
    expect(layoutInstrumentSurface(artwork, notes, { width: 0, height: 0 }, 60)).toBeNull();
  });
});
