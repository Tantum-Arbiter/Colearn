import {
  staffStepsAboveBottomLine,
  staffLedgerSteps,
  staffStemsPointDown,
  staffNoteY,
  staffNoteMetrics,
  layoutStaffStrip,
  staffShadowLength,
  staffNoteSlots,
  staffFocusIndex,
  staffHoldTravel,
  staffRowShift,
  staffStemHeight,
  STAFF_LINE_GAP,
} from '@/services/staff-notation';

// The banner artwork is 2000x667. Its five staff lines were measured off the
// artwork at y = 243.5, 285.5, 327.5, 369 and 410, so a note placed on the
// staff of a 667px-tall banner has to land on one of those pixel rows.
const ARTWORK_HEIGHT = 667;
const TOP_LINE = 243.5;
const SECOND_LINE = 285.5;
const MIDDLE_LINE = 327.5;
const BOTTOM_LINE = 410;
const LINE_SPACING = (BOTTOM_LINE - TOP_LINE) / 4;

describe('staffStepsAboveBottomLine', () => {
  // The bundled note samples were measured at 523 Hz (C5) through 880 Hz (A5),
  // so the app's C is the C above middle C: the middle space of the staff, five
  // half-steps up from the bottom line.
  it('writes the app C in the middle space of the treble staff', () => {
    expect(staffStepsAboveBottomLine('C')).toBe(5);
  });

  it('climbs one step per letter so the scale rises up the staff', () => {
    expect(staffStepsAboveBottomLine('D')).toBe(6);
    expect(staffStepsAboveBottomLine('E')).toBe(7);
    expect(staffStepsAboveBottomLine('F')).toBe(8);
    expect(staffStepsAboveBottomLine('G')).toBe(9);
    expect(staffStepsAboveBottomLine('A')).toBe(10);
  });

  it('keeps the whole scale on or just over the staff, never under it', () => {
    for (const note of ['C', 'D', 'E', 'F', 'G', 'A']) {
      expect(staffStepsAboveBottomLine(note)!).toBeGreaterThan(0);
    }
  });

  it('reads a lower-case note name', () => {
    expect(staffStepsAboveBottomLine('g')).toBe(9);
  });

  it('has no position for a note name it does not know', () => {
    expect(staffStepsAboveBottomLine('H')).toBeNull();
    expect(staffStepsAboveBottomLine('')).toBeNull();
  });
});

describe('staffNoteY', () => {
  it('sits the bottom line note exactly on the measured bottom line', () => {
    expect(staffNoteY(0, ARTWORK_HEIGHT)).toBeCloseTo(BOTTOM_LINE, 0);
  });

  it('sits F on the measured top line, eight half-steps up', () => {
    expect(staffNoteY(8, ARTWORK_HEIGHT)).toBeCloseTo(TOP_LINE, 0);
  });

  it('sits C in the space between the second and middle lines', () => {
    const y = staffNoteY(5, ARTWORK_HEIGHT);
    expect(y).toBeGreaterThan(SECOND_LINE);
    expect(y).toBeLessThan(MIDDLE_LINE);
    // The printed lines are a shade uneven, so the even fit lands within a
    // pixel of the middle of the space on a 667px-tall artwork.
    expect(Math.abs(y - (SECOND_LINE + MIDDLE_LINE) / 2)).toBeLessThan(1);
  });

  it('places a space note half a line gap above the line below it', () => {
    expect(staffNoteY(0, ARTWORK_HEIGHT) - staffNoteY(1, ARTWORK_HEIGHT)).toBeCloseTo(LINE_SPACING / 2, 0);
  });

  it('lifts A a full line gap over the top line, where its ledger goes', () => {
    expect(staffNoteY(10, ARTWORK_HEIGHT)).toBeCloseTo(TOP_LINE - LINE_SPACING, 0);
  });

  it('scales with the banner height', () => {
    expect(staffNoteY(0, ARTWORK_HEIGHT / 2)).toBeCloseTo(BOTTOM_LINE / 2, 0);
  });
});

describe('staffLedgerSteps', () => {
  it('needs no ledger for a note on the staff', () => {
    expect(staffLedgerSteps(5)).toEqual([]);
    expect(staffLedgerSteps(8)).toEqual([]);
  });

  it('needs no ledger for the space just above the staff', () => {
    expect(staffLedgerSteps(9)).toEqual([]);
  });

  it('draws A its own line above the staff', () => {
    expect(staffLedgerSteps(10)).toEqual([10]);
  });

  it('carries the lines on up for anything higher', () => {
    expect(staffLedgerSteps(12)).toEqual([10, 12]);
    expect(staffLedgerSteps(13)).toEqual([10, 12]);
  });

  it('draws them under the staff for a note written below it', () => {
    expect(staffLedgerSteps(-2)).toEqual([-2]);
    expect(staffLedgerSteps(-1)).toEqual([]);
  });
});

describe('staffStemsPointDown', () => {
  it('hangs the stem down from the middle line up, as engravers do', () => {
    expect(staffStemsPointDown(4)).toBe(true);
    expect(staffStemsPointDown(5)).toBe(true);
    expect(staffStemsPointDown(10)).toBe(true);
  });

  it('sends it up from a note below the middle line', () => {
    expect(staffStemsPointDown(3)).toBe(false);
    expect(staffStemsPointDown(0)).toBe(false);
  });
});

describe('staffNoteMetrics', () => {
  const metrics = staffNoteMetrics(600)!;

  it('derives the line gap from the banner it is drawn on', () => {
    // 600 wide is 200 tall at the artwork's 3:1 aspect, and the measured line
    // spacing is 41.6/667 of the height.
    expect(metrics.lineGap).toBeCloseTo(200 * (LINE_SPACING / ARTWORK_HEIGHT), 1);
  });

  it('draws a note head wider than it is tall, like an engraved oval', () => {
    expect(metrics.headWidth).toBeGreaterThan(metrics.headHeight);
    expect(metrics.headHeight).toBeCloseTo(metrics.lineGap, 1);
  });

  it('leaves clear paper between neighbouring heads', () => {
    expect(metrics.spacing).toBeGreaterThan(metrics.headWidth + metrics.lineGap * 0.5);
  });

  it('cuts the notes off right against the clef, and stops before the leaves', () => {
    // The clef's ink was measured off the artwork at columns 257-358 of 2000,
    // so it ends at 0.179; the right-hand decorations start at 0.868. The cut
    // sits within a pixel or two of the clef, so no bare paper is left between
    // it and the note being played -- at 0.19 there was a visible 25px strip.
    expect(metrics.windowLeft / 600).toBeGreaterThan(0.179);
    expect(metrics.windowLeft / 600).toBeLessThan(0.1825);
    expect((metrics.windowLeft + metrics.windowWidth) / 600).toBeLessThan(0.868);
  });

  it('parks the note being played flush against the cut, its hold running right', () => {
    // Under a head in: enough for the ring to clear the edge, no more, so the
    // note sits right where notes scroll out.
    expect(metrics.playheadX).toBeGreaterThan(metrics.headWidth / 2);
    expect(metrics.playheadX).toBeLessThan(metrics.headWidth);
  });

  it('shows the same handful of notes whatever the banner size', () => {
    for (const width of [320, 600, 1200]) {
      const m = staffNoteMetrics(width)!;
      expect(Math.floor(m.windowWidth / m.spacing)).toBe(11);
    }
  });

  it('narrows the note window to what is on screen, measured from the left of the sheet', () => {
    // Half the banner on screen, anchored left: the window runs from the clear
    // paper past the clef up to where the screen ends.
    const m = staffNoteMetrics(600, 0.5)!;
    expect(m.windowLeft).toBeCloseTo(600 * 0.181, 1);
    expect(m.windowLeft + m.windowWidth).toBeCloseTo(600 * 0.5, 1);
  });

  it('never widens the window past the clear paper', () => {
    const m = staffNoteMetrics(600, 1)!;
    const full = staffNoteMetrics(600)!;
    expect(m.windowLeft).toBeCloseTo(full.windowLeft, 1);
    expect(m.windowWidth).toBeCloseTo(full.windowWidth, 1);
  });

  it('has no metrics for an unmeasured banner', () => {
    expect(staffNoteMetrics(0)).toBeNull();
  });
});

describe('layoutStaffStrip', () => {
  // A landscape phone: 800x400 region with the instrument artwork starting 150
  // down, and the sheet allowed to overlap its top 12px.
  const region = { width: 800, height: 400, instrumentTop: 150, overlap: 12 };

  it('rests the bottom of the paper on the top of the instrument', () => {
    const strip = layoutStaffStrip(region)!;
    // Paper bottom at 162, and the paper runs to 0.78 of the banner height, so
    // the banner is 207.7 tall and starts at the top of the region.
    expect(strip.height).toBeCloseTo(207.7, 0);
    expect(strip.top).toBeCloseTo(0, 0);
  });

  it('keeps the banner artwork at its own aspect ratio', () => {
    const strip = layoutStaffStrip(region)!;
    expect(strip.width / strip.height).toBeCloseTo(2000 / 667, 2);
  });

  it('centres the banner across the region', () => {
    const strip = layoutStaffStrip(region)!;
    expect(strip.left).toBeCloseTo((800 - strip.width) / 2, 1);
  });

  it('narrows the banner to fit a region the sheet would overhang', () => {
    const strip = layoutStaffStrip({ width: 360, height: 400, instrumentTop: 150, overlap: 12 })!;
    expect(strip.width).toBeLessThanOrEqual(360 - 24);
    // Still hanging off the instrument top: 162 - 0.78 * height.
    expect(strip.top + strip.height * 0.78).toBeCloseTo(162, 0);
  });

  it('caps the sheet so it cannot take over a tall region', () => {
    const tall = layoutStaffStrip({ width: 2000, height: 1000, instrumentTop: 600, overlap: 12 })!;
    expect(tall.height).toBeLessThanOrEqual(1000 * 0.55 + 0.5);
  });

  it('has no placement until the region has been measured', () => {
    expect(layoutStaffStrip({ width: 0, height: 0, instrumentTop: 0, overlap: 0 })).toBeNull();
  });

  it('has no placement in a region too small to read a staff in', () => {
    expect(layoutStaffStrip({ width: 800, height: 400, instrumentTop: 20, overlap: 0 })).toBeNull();
  });

  describe('blow pose', () => {
    it('turns with the instrument in a landscape region, where it really does point at the floor', () => {
      expect(layoutStaffStrip(region)!.turnsForBlow).toBe(true);
    });

    it('stays put in a portrait region, where the instrument does not turn', () => {
      const portrait = layoutStaffStrip({ width: 800, height: 1200, instrumentTop: 500, overlap: 12 })!;
      expect(portrait.turnsForBlow).toBe(false);
    });

    it('draws the sheet longer than the screen on a phone, so the staff comes up to a readable size', () => {
      const strip = layoutStaffStrip(region)!;
      // Only as long as the region is tall, the staff would be unreadable, so
      // the sheet is zoomed past that and the decorative ends fall outside.
      expect(strip.rotatedZoom).toBeGreaterThan(1);
      expect(strip.width * strip.rotatedScale).toBeGreaterThan(400 - 24);
      const lineGap = STAFF_LINE_GAP * strip.height * strip.rotatedScale;
      expect(lineGap).toBeCloseTo(14, 0);
    });

    it('leaves a region already big enough at its natural size', () => {
      const big = layoutStaffStrip({ width: 2000, height: 1400, instrumentTop: 700, overlap: 12 })!;
      expect(big.rotatedZoom).toBe(1);
      expect(big.width * big.rotatedScale).toBeCloseTo(1400 - 24, 0);
    });

    it('keeps the zoomed sheet inside the screen it is turned across', () => {
      const strip = layoutStaffStrip(region)!;
      expect(strip.height * strip.rotatedScale).toBeLessThan(400);
    });

    it('lands the top of the paper on the near edge, which is the top of the upright phone', () => {
      const strip = layoutStaffStrip(region)!;
      const centreX = strip.left + strip.width / 2 + strip.rotatedTranslateX;
      const paperEdge = centreX - (0.5 - 0.2) * strip.height * strip.rotatedScale;
      expect(paperEdge).toBeCloseTo(12, 0);
    });

    it('clears a safe-area inset on that edge, so the notch cannot cover the song', () => {
      const strip = layoutStaffStrip({ ...region, edgeInset: 59 })!;
      const centreX = strip.left + strip.width / 2 + strip.rotatedTranslateX;
      const paperEdge = centreX - (0.5 - 0.2) * strip.height * strip.rotatedScale;
      expect(paperEdge).toBeCloseTo(59, 0);
    });

    it("ignores an inset smaller than the sheet's own margin", () => {
      const strip = layoutStaffStrip({ ...region, edgeInset: 4 })!;
      const centreX = strip.left + strip.width / 2 + strip.rotatedTranslateX;
      const paperEdge = centreX - (0.5 - 0.2) * strip.height * strip.rotatedScale;
      expect(paperEdge).toBeCloseTo(12, 0);
    });

    it('anchors the left of the sheet on screen, so the clef and the moon stay in view', () => {
      const strip = layoutStaffStrip(region)!;
      // The sheet's length runs along the region's height; its left edge should
      // land at the far end of that, which is the left of the upright phone.
      const centreY = strip.top + strip.height / 2 + strip.rotatedTranslateY;
      const leftEdge = centreY + (strip.width / 2) * strip.rotatedScale;
      expect(leftEdge).toBeCloseTo(400 - 12, 0);
    });

    it('still centres a sheet that needs no zoom', () => {
      const big = layoutStaffStrip({ width: 2000, height: 1400, instrumentTop: 700, overlap: 12 })!;
      expect(big.top + big.height / 2 + big.rotatedTranslateY).toBeCloseTo(700, 0);
    });
  });
});

describe('staffShadowLength', () => {
  const metrics = staffNoteMetrics(600)!;

  it('gives one beat exactly the ordinary note spacing, so plain songs lay out unchanged', () => {
    expect(staffShadowLength(500, 500, metrics)).toBeCloseTo(metrics.spacing, 1);
  });

  it('gives a longer hold proportionally more room', () => {
    expect(staffShadowLength(1000, 500, metrics)).toBeCloseTo(metrics.spacing * 2, 1);
    expect(staffShadowLength(250, 500, metrics)).toBeCloseTo(metrics.spacing / 2, 1);
  });

  it('draws nothing for a nonsense tempo', () => {
    expect(staffShadowLength(500, 0, metrics)).toBe(0);
  });
});

describe('staffNoteSlots', () => {
  const metrics = staffNoteMetrics(600)!;

  it('spaces notes with no shadow evenly, on the bare spacing', () => {
    const offsets = staffNoteSlots([0, 0, 0], metrics);
    expect(offsets[1] - offsets[0]).toBeCloseTo(metrics.spacing, 1);
    expect(offsets[2] - offsets[1]).toBeCloseTo(metrics.spacing, 1);
  });

  it('opens a gap after a note whose shadow needs the room', () => {
    const long = metrics.spacing * 3;
    const offsets = staffNoteSlots([long, 0], metrics);
    expect(offsets[1] - offsets[0]).toBeGreaterThan(long);
  });

  it('opens an ordinary note out past the bare spacing, so its shadow stands clear', () => {
    // 0.85 of a beat of shadow plus the gap comes to a little over one slot.
    const offsets = staffNoteSlots([metrics.spacing * 0.85, 0], metrics);
    expect(offsets[1] - offsets[0]).toBeGreaterThan(metrics.spacing);
    expect(offsets[1] - offsets[0]).toBeLessThan(metrics.spacing * 1.25);
  });

  it('leaves clear paper between a shadow and the next head', () => {
    const long = metrics.spacing * 3;
    const offsets = staffNoteSlots([long, 0], metrics);
    expect(offsets[1] - offsets[0] - long).toBeCloseTo(metrics.spacing * 0.3, 1);
  });

  it('starts the row at nothing', () => {
    expect(staffNoteSlots([0, 0], metrics)[0]).toBe(0);
  });

  it('runs one entry past the end, so every note has a travel distance', () => {
    const offsets = staffNoteSlots([0, 0, 0], metrics);
    expect(offsets).toHaveLength(4);
    expect(offsets[3] - offsets[2]).toBeCloseTo(metrics.spacing, 1);
  });

  it('has just the end marker for an empty song', () => {
    expect(staffNoteSlots([], metrics)).toEqual([0]);
  });
});


describe('staffStemHeight', () => {
  const lineGap = STAFF_LINE_GAP * ARTWORK_HEIGHT;

  it('runs a stem down to the bottom staff line, so every stem ends on the same line', () => {
    for (const note of ['C', 'D', 'E', 'F', 'G', 'A']) {
      const steps = staffStepsAboveBottomLine(note)!;
      const end = staffNoteY(steps, ARTWORK_HEIGHT) + staffStemHeight(steps, ARTWORK_HEIGHT, lineGap);
      expect(end).toBeCloseTo(BOTTOM_LINE, 0);
    }
  });

  it('leaves every stem in the scale long enough to read', () => {
    for (const note of ['C', 'D', 'E', 'F', 'G', 'A']) {
      const steps = staffStepsAboveBottomLine(note)!;
      expect(staffStemHeight(steps, ARTWORK_HEIGHT, lineGap)).toBeGreaterThanOrEqual(lineGap * 2);
    }
  });

  it('gives a note written below the staff a plain upward stem', () => {
    expect(staffStemHeight(-2, ARTWORK_HEIGHT, lineGap)).toBeCloseTo(lineGap * 3, 1);
  });
});

describe('note letters', () => {
  it('shares one baseline under the staff, clear of the printed lines', () => {
    const metrics = staffNoteMetrics(600)!;
    const height = 600 / (2000 / 667);
    expect(metrics.letterY).toBeGreaterThan(staffNoteY(0, height));
    expect(metrics.letterY + metrics.letterSize / 2).toBeLessThan(height * 0.75);
  });

  it('sizes the letter to the staff it sits under', () => {
    expect(staffNoteMetrics(600)!.letterSize).toBeCloseTo(staffNoteMetrics(600)!.lineGap * 1.15, 1);
  });
});

describe('staffRowShift', () => {
  const metrics = staffNoteMetrics(600)!;

  /** au_clair_lune: eleven notes at 90bpm, two of two beats and a closing four. */
  const song = () => {
    const beatMs = 60000 / 90;
    const rhythm = [1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 4];
    const holds = rhythm.map(beats => Math.min(2000, 0.85 * beats * beatMs));
    return staffNoteSlots(holds.map(ms => staffShadowLength(ms, beatMs, metrics)), metrics);
  };

  it('parks the note being played on the playhead', () => {
    const slots = song();
    for (let index = 0; index < 11; index += 1) {
      const noteOnScreen = slots[index] + staffRowShift(slots, index, 0, metrics.playheadX);
      expect(noteOnScreen).toBeCloseTo(metrics.playheadX, 6);
    }
  });

  it('hands over with no jump, so the score cannot drift through a song', () => {
    const slots = song();
    for (let index = 0; index < 10; index += 1) {
      // Where the row ends up once this note's hold has run, against where it
      // starts for the next note. Any gap here is a step the score would drift.
      expect(staffRowShift(slots, index, 1, metrics.playheadX))
        .toBeCloseTo(staffRowShift(slots, index + 1, 0, metrics.playheadX), 6);
    }
  });

  it('moves a long note further than a short one, and always leftwards', () => {
    const slots = song();
    const short = staffRowShift(slots, 0, 0, 0) - staffRowShift(slots, 0, 1, 0);
    const long = staffRowShift(slots, 4, 0, 0) - staffRowShift(slots, 4, 1, 0);
    expect(short).toBeGreaterThan(0);
    expect(long).toBeGreaterThan(short * 1.5);
  });

  it('leaves the note where it rests for a song with nothing held', () => {
    const slots = staffNoteSlots([0, 0, 0], metrics);
    expect(staffRowShift(slots, 1, 0, 10)).toBeCloseTo(10 - metrics.spacing, 6);
    expect(staffRowShift(slots, 1, 1, 10)).toBeCloseTo(10 - 2 * metrics.spacing, 6);
  });

  it('holds still on a row it has no slot for', () => {
    expect(staffRowShift([], 3, 1, 7)).toBe(7);
  });
});

describe('staffHoldTravel', () => {
  const metrics = staffNoteMetrics(600)!;

  it('agrees with the travel the row actually moves', () => {
    // staffRowShift spells the same subtraction out for the UI thread, so the
    // two have to stay in step.
    const slots = staffNoteSlots([0, staffShadowLength(1000, 500, metrics), 0], metrics);
    for (let index = 0; index < 3; index += 1) {
      expect(staffRowShift(slots, index, 0, 0) - staffRowShift(slots, index, 1, 0))
        .toBeCloseTo(staffHoldTravel(slots, index), 6);
    }
  });

  it('is the gap to where the next note rests', () => {
    const slots = staffNoteSlots([0, 0, 0], metrics);
    expect(staffHoldTravel(slots, 0)).toBeCloseTo(metrics.spacing, 6);
  });

  it('covers the last note too, off the slot table\'s end marker', () => {
    const long = staffShadowLength(2000, 500, metrics);
    const slots = staffNoteSlots([0, long], metrics);
    expect(staffHoldTravel(slots, 1)).toBeGreaterThan(long);
  });

  it('is nothing at all past the end of the song', () => {
    expect(staffHoldTravel(staffNoteSlots([0], metrics), 5)).toBe(0);
  });
});

describe('staffFocusIndex', () => {
  it('follows the score through the song', () => {
    expect(staffFocusIndex(0, 5)).toBe(0);
    expect(staffFocusIndex(3, 5)).toBe(3);
  });

  it('stops on the closing note once the song is over', () => {
    // Otherwise the row scrolls off the end and leaves a blank staff behind the
    // celebration.
    expect(staffFocusIndex(5, 5)).toBe(4);
    expect(staffFocusIndex(99, 5)).toBe(4);
  });

  it('never reads before the first note', () => {
    expect(staffFocusIndex(-3, 5)).toBe(0);
    expect(staffFocusIndex(0, 0)).toBe(0);
  });
});
