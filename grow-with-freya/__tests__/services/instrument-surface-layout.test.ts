import { layoutInstrumentSurface, layoutInstrumentStage, flippedSurfaceShift, regionTurnsForBlow, instrumentFlipTransform, noteLabelTransform } from '@/services/instrument-surface-layout';
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

describe('layoutInstrumentSurface with a bell that expands while notes sound', () => {
  const bell = {
    image: 2,
    frame: { x: 0.75, y: 0, width: 0.25, height: 1 },
    origin: { x: 0.75, y: 0.5 },
    scale: { x: 1.04, y: 1.07 },
  };

  it('keeps the expanded bell inside a wide box by shrinking the artwork', () => {
    const underTest = layoutInstrumentSurface({ ...artwork, bell }, notes, { width: 800, height: 400 }, 60)!;

    const growth = (1 - bell.origin.x) * (bell.scale.x - 1);
    expect(underTest.width).toBeLessThan(800);
    expect(underTest.width * (1 + growth)).toBeCloseTo(800, 5);
  });

  it('keeps the expanded bell inside a short box by shrinking the artwork', () => {
    const underTest = layoutInstrumentSurface({ ...artwork, bell }, notes, { width: 800, height: 100 }, 60)!;

    const growth = Math.max(bell.origin.y, 1 - bell.origin.y) * (bell.scale.y - 1);
    expect(underTest.height * (1 + 2 * growth)).toBeCloseTo(100, 5);
  });

  it('places the bell frame and its origin in artwork pixels', () => {
    const underTest = layoutInstrumentSurface({ ...artwork, bell }, notes, { width: 800, height: 400 }, 60)!;

    expect(underTest.bell).toEqual({
      left: bell.frame.x * underTest.width,
      top: 0,
      width: bell.frame.width * underTest.width,
      height: underTest.height,
      originX: 0,
      originY: underTest.height / 2,
    });
  });

  it('reports no bell frame for artwork without a bell', () => {
    const underTest = layoutInstrumentSurface(artwork, notes, { width: 800, height: 400 }, 60)!;

    expect(underTest.bell).toBeUndefined();
    expect(underTest.width).toBe(800);
  });
});

describe('layoutInstrumentSurface anchored to the left edge', () => {
  it('keeps the artwork clear of a reserved strip on the right', () => {
    const underTest = layoutInstrumentSurface(artwork, notes, { width: 800, height: 400, reserveRight: 60 }, 60)!;

    expect(underTest.width).toBe(740);
    expect(underTest.height).toBe(185);
  });

  it('reserves the strip and the bell headroom together', () => {
    const bell = { image: 2, frame: { x: 0.75, y: 0, width: 0.25, height: 1 }, origin: { x: 0.75, y: 0.5 }, scale: { x: 1.04, y: 1.07 } };

    const underTest = layoutInstrumentSurface({ ...artwork, bell }, notes, { width: 800, height: 400, reserveRight: 60 }, 60)!;

    const growth = (1 - bell.origin.x) * (bell.scale.x - 1);
    expect(underTest.width * (1 + growth)).toBeCloseTo(740, 5);
  });
});

describe('layoutInstrumentSurface centring', () => {
  it('leaves a wide instrument against the left edge', () => {
    const underTest = layoutInstrumentSurface(artwork, notes, { width: 800, height: 400 }, 60)!;

    expect(underTest.left).toBe(0);
  });

  // A squat instrument is limited by the region's height, so without this it comes
  // out far narrower than the region and sits against the left edge.
  it('centres a squat instrument in the region', () => {
    const squat = { image: 1, aspectRatio: 1.8, holeDiameter: 0.05 };

    const underTest = layoutInstrumentSurface(squat, notes, { width: 800, height: 200 }, 60)!;

    expect(underTest.width).toBeLessThan(800);
    expect(underTest.left).toBeCloseTo((800 - underTest.width) / 2, 5);
  });

  it('centres within the space left of the reserved strip', () => {
    const squat = { image: 1, aspectRatio: 1.8, holeDiameter: 0.05 };

    const underTest = layoutInstrumentSurface(
      squat, notes, { width: 800, height: 200, reserveRight: 60 }, 60)!;

    expect(underTest.left + underTest.width / 2).toBeCloseTo((800 - 60) / 2, 5);
  });

  it('accounts for a bell that grows rightwards when centring', () => {
    const bell = { image: 2, frame: { x: 0.75, y: 0, width: 0.25, height: 1 }, origin: { x: 0.75, y: 0.5 }, scale: { x: 1.2, y: 1.0 } };
    const squat = { image: 1, aspectRatio: 1.8, holeDiameter: 0.05, bell };

    const underTest = layoutInstrumentSurface(squat, notes, { width: 800, height: 200 }, 60)!;
    const growth = (1 - bell.origin.x) * (bell.scale.x - 1);

    expect(underTest.left * 2 + underTest.width * (1 + growth)).toBeCloseTo(800, 5);
  });

  it('never pushes the artwork off the left edge', () => {
    const underTest = layoutInstrumentSurface(artwork, notes, { width: 200, height: 400 }, 60)!;

    expect(underTest.left).toBeGreaterThanOrEqual(0);
  });
});

describe('layoutInstrumentStage', () => {
  const stageOptions = { maxButtonSize: 60, lowerBlockHeight: 138, topMargin: 12, buttonGap: 16 };

  it('puts the note row exactly on the middle line of the region', () => {
    const underTest = layoutInstrumentStage(artwork, notes, { width: 800, height: 400, reserveRight: 8 }, stageOptions)!;

    const rowCentre = underTest.surfaceTop + 0.5 * underTest.layout.height;
    expect(rowCentre).toBeCloseTo(200, 5);
  });

  it('keeps a tube instrument at full width when the row already leaves room below', () => {
    const underTest = layoutInstrumentStage(artwork, notes, { width: 800, height: 400, reserveRight: 8 }, stageOptions)!;

    expect(underTest.layout.width).toBe(792);
  });

  it('shrinks a low-holed instrument until its art clears the top margin', () => {
    const lowHoles: NoteLayoutItem[] = notes.map(item => ({ ...item, hole: { x: item.hole!.x, y: 0.8 } }));
    const compact = { image: 1, aspectRatio: 1.8, holeDiameter: 0.05 };

    const underTest = layoutInstrumentStage(compact, lowHoles, { width: 800, height: 400, reserveRight: 8 }, stageOptions)!;

    expect(underTest.surfaceTop).toBeCloseTo(12, 5);
    expect(underTest.surfaceTop + 0.8 * underTest.layout.height).toBeCloseTo(200, 5);
  });

  it('shrinks a high-holed instrument until the lower block fits under its buttons', () => {
    const highHoles: NoteLayoutItem[] = notes.map(item => ({ ...item, hole: { x: item.hole!.x, y: 0.2 } }));
    const compact = { image: 1, aspectRatio: 1.8, holeDiameter: 0.05 };

    const underTest = layoutInstrumentStage(compact, highHoles, { width: 800, height: 400, reserveRight: 8 }, stageOptions)!;

    const buttonsBottom = underTest.surfaceTop + Math.max(...Object.values(underTest.layout.positions).map(p => p.top)) + underTest.layout.buttonSize;
    expect(underTest.lowerBlockTop).toBeGreaterThanOrEqual(buttonsBottom + 16);
    expect(underTest.lowerBlockTop + 138).toBeLessThanOrEqual(400);
  });

  it('centres the lower block between the buttons and the bottom edge', () => {
    const underTest = layoutInstrumentStage(artwork, notes, { width: 800, height: 400, reserveRight: 8 }, stageOptions)!;

    const buttonsBottom = underTest.surfaceTop + Math.max(...Object.values(underTest.layout.positions).map(p => p.top)) + underTest.layout.buttonSize;
    expect(underTest.lowerBlockTop).toBeCloseTo(buttonsBottom + (400 - buttonsBottom - 138) / 2, 5);
  });

  /** A flute: far wider than it is tall, with its holes left of centre. */
  const wideArtwork = { image: 1, aspectRatio: 8.3585, holeDiameter: 0.0406 };
  const wideNotes: NoteLayoutItem[] = [
    { note: 'C', label: 'C', color: '#111111', hole: { x: 0.1618, y: 0.4906 } },
    { note: 'D', label: 'D', color: '#222222', hole: { x: 0.2739, y: 0.4906 } },
    { note: 'E', label: 'E', color: '#333333', hole: { x: 0.3853, y: 0.4906 } },
    { note: 'F', label: 'F', color: '#444444', hole: { x: 0.4951, y: 0.4906 } },
    { note: 'G', label: 'G', color: '#555555', hole: { x: 0.605, y: 0.4906 } },
    { note: 'A', label: 'A', color: '#666666', hole: { x: 0.7133, y: 0.4906 } },
  ];
  const UPRIGHT = { width: 800, height: 1200, reserveRight: 8 };
  const SIDEWAYS = { width: 800, height: 400, reserveRight: 8 };

  it('lets a wide instrument bleed past an upright screen, rather than leaving a thin band', () => {
    const underTest = layoutInstrumentStage(wideArtwork, wideNotes, UPRIGHT, stageOptions)!;

    expect(underTest.layout.width).toBeGreaterThan(UPRIGHT.width);
  });

  it('grows the buttons with it, which is the point of the bleed', () => {
    const upright = layoutInstrumentStage(wideArtwork, wideNotes, UPRIGHT, stageOptions)!;
    const sideways = layoutInstrumentStage(wideArtwork, wideNotes, SIDEWAYS, stageOptions)!;

    expect(upright.layout.buttonSize).toBeGreaterThan(sideways.layout.buttonSize);
  });

  it('keeps a button\'s width of screen around every hole it bled past', () => {
    const underTest = layoutInstrumentStage(wideArtwork, wideNotes, UPRIGHT, stageOptions)!;

    const available = UPRIGHT.width - UPRIGHT.reserveRight;
    for (const item of wideNotes) {
      const centre = underTest.layout.left + item.hole!.x * underTest.layout.width;
      expect(centre).toBeGreaterThanOrEqual(stageOptions.maxButtonSize);
      expect(centre).toBeLessThanOrEqual(available - stageOptions.maxButtonSize);
    }
  });

  it('keeps the instrument centred on the screen, not on the width it was drawn at', () => {
    const underTest = layoutInstrumentStage(wideArtwork, wideNotes, UPRIGHT, stageOptions)!;

    const available = UPRIGHT.width - UPRIGHT.reserveRight;
    expect(underTest.layout.left).toBeCloseTo((available - underTest.layout.width) / 2, 5);
  });

  it('never draws an instrument narrower than the screen to make room around its holes', () => {
    // Holes almost at the ends of the art: there is no room to bleed, and the
    // answer is the screen's own width rather than something smaller than it.
    const edgeHoles: NoteLayoutItem[] = [
      { note: 'C', label: 'C', color: '#111111', hole: { x: 0.05, y: 0.4906 } },
      { note: 'D', label: 'D', color: '#222222', hole: { x: 0.95, y: 0.4906 } },
    ];

    const underTest = layoutInstrumentStage(wideArtwork, edgeHoles, UPRIGHT, stageOptions)!;

    expect(underTest.layout.width).toBe(UPRIGHT.width - UPRIGHT.reserveRight);
  });

  it('leaves a screen wider than it is tall exactly as it was', () => {
    const underTest = layoutInstrumentStage(wideArtwork, wideNotes, SIDEWAYS, stageOptions)!;

    expect(underTest.layout.width).toBe(792);
    expect(underTest.layout.left).toBe(0);
  });

  it('still puts the note row on the middle line when it has bled', () => {
    const underTest = layoutInstrumentStage(wideArtwork, wideNotes, UPRIGHT, stageOptions)!;

    const rowCentre = underTest.surfaceTop + 0.4906 * underTest.layout.height;
    expect(rowCentre).toBeCloseTo(UPRIGHT.height / 2, 5);
  });

  it('returns null before the region has been measured', () => {
    expect(layoutInstrumentStage(artwork, notes, { width: 0, height: 0 }, stageOptions)).toBeNull();
  });
});

describe('flippedSurfaceShift', () => {
  it('mirrors the artwork about the surface, so a left bleed becomes an equal right bleed', () => {
    // Art pinned to the left, running 8px short of the right edge.
    const shift = flippedSurfaceShift({ left: 0, width: 792 }, 800);
    expect(shift).toBe(8);
  });

  it('carries a bleed off the near edge over to the far edge', () => {
    // The art starts 16px off the left edge of the surface.
    const shift = flippedSurfaceShift({ left: -16, width: 800 }, 800);
    const mirroredRight = -16 + 800 + shift;
    expect(mirroredRight).toBe(800 + 16);
  });

  it('leaves a centred instrument centred', () => {
    expect(flippedSurfaceShift({ left: 150, width: 500 }, 800)).toBe(0);
  });
});

describe('instrumentFlipTransform', () => {
  it('leaves the instrument alone while it faces the way it is drawn', () => {
    expect(instrumentFlipTransform(40, 0)).toEqual({ translateX: 0, scaleX: 1 });
  });

  it('turns it end for end, and slides it, once it has fully turned', () => {
    expect(instrumentFlipTransform(40, -90)).toEqual({ translateX: 40, scaleX: -1 });
  });

  it('passes through edge-on halfway, so it reads as the instrument turning round', () => {
    expect(instrumentFlipTransform(40, -45)).toEqual({ translateX: 20, scaleX: 0 });
  });
});

describe('noteLabelTransform', () => {
  it('leaves the letters upright while the instrument faces the way it is drawn', () => {
    expect(noteLabelTransform(0)).toEqual({ rotate: '0deg', scaleX: 1 });
  });

  it('undoes both the turn and the mirror, so the letter still reads upright', () => {
    // Inside a mirrored parent, a -90deg child comes out at +90deg, so the
    // label has to ask for +90 to land on -90.
    expect(noteLabelTransform(-90)).toEqual({ rotate: '90deg', scaleX: -1 });
  });
});

describe('regionTurnsForBlow', () => {
  it('turns in a landscape region, which is how a phone draws this screen', () => {
    expect(regionTurnsForBlow({ width: 800, height: 400 })).toBe(true);
  });

  it('stays put in a portrait region, where the instrument lies across the screen', () => {
    expect(regionTurnsForBlow({ width: 800, height: 1200 })).toBe(false);
    expect(regionTurnsForBlow({ width: 800, height: 800 })).toBe(false);
  });
});
