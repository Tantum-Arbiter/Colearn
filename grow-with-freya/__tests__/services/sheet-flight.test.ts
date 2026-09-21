import {
  ARRIVAL_TOTAL_MS,
  CHROME_MS,
  CHROME_START_MS,
  INSTRUMENT_MS,
  INSTRUMENT_START_MS,
  NOTE_BALLOON_MS,
  NOTE_BALLOON_STAGGER_MS,
  NOTE_BALLOON_START_MS,
  PANEL_EXIT_MS,
  SHEET_FLIGHT_MS,
  SHEET_HANDOVER_MS,
  chromeEntry,
  flightPose,
  instrumentEntry,
  laneProgress,
  noteBalloonDelayMs,
  noteBalloonScale,
} from '@/services/sheet-flight';

const panelSheet = { x: 94, y: 260, width: 664, height: 166 };
const staffSheet = { x: 208, y: 40, width: 435, height: 108.75 };

const at = (ms: number) => ms / ARRIVAL_TOTAL_MS;

describe('sheet flight timeline', () => {
  it('starts the sheet moving before anything else arrives', () => {
    // The sheet is the one thing the child was already looking at, so it leads.
    expect(INSTRUMENT_START_MS).toBeGreaterThan(0);
    expect(NOTE_BALLOON_START_MS).toBeGreaterThan(INSTRUMENT_START_MS);
    expect(CHROME_START_MS).toBeGreaterThan(INSTRUMENT_START_MS);
  });

  it('lands the sheet before the instrument has finished sliding in', () => {
    expect(SHEET_FLIGHT_MS).toBeLessThan(INSTRUMENT_START_MS + INSTRUMENT_MS);
  });

  it('fits every lane inside the arrival', () => {
    expect(INSTRUMENT_START_MS + INSTRUMENT_MS).toBeLessThanOrEqual(ARRIVAL_TOTAL_MS);
    expect(CHROME_START_MS + CHROME_MS).toBeLessThanOrEqual(ARRIVAL_TOTAL_MS);
    expect(noteBalloonDelayMs(7, 8) + NOTE_BALLOON_MS).toBeLessThanOrEqual(ARRIVAL_TOTAL_MS);
  });

  it('keeps the whole arrival short enough for a child who already pressed the button', () => {
    expect(ARRIVAL_TOTAL_MS).toBeLessThanOrEqual(800);
  });

  it('takes the panel away while the sheet is still travelling', () => {
    expect(PANEL_EXIT_MS).toBeLessThan(SHEET_FLIGHT_MS);
  });
});

describe('laneProgress', () => {
  it('is nought before the lane starts and one after it ends', () => {
    expect(laneProgress(at(100), 200, 200)).toBe(0);
    expect(laneProgress(at(500), 200, 200)).toBe(1);
  });

  it('runs evenly across the lane', () => {
    expect(laneProgress(at(300), 200, 200)).toBeCloseTo(0.5, 5);
  });
});

describe('flightPose', () => {
  it('leaves the sheet exactly where the panel had it at the start', () => {
    const pose = flightPose(0, panelSheet, staffSheet);

    expect(pose).toEqual({ translateX: 0, translateY: 0, scale: 1 });
  });

  it('lands the sheet on the staff position, scaled to the staff width', () => {
    const pose = flightPose(at(SHEET_FLIGHT_MS), panelSheet, staffSheet);

    const fromCentreX = panelSheet.x + panelSheet.width / 2;
    const fromCentreY = panelSheet.y + panelSheet.height / 2;
    expect(pose.scale).toBeCloseTo(staffSheet.width / panelSheet.width, 5);
    expect(pose.translateX).toBeCloseTo(staffSheet.x + staffSheet.width / 2 - fromCentreX, 5);
    expect(pose.translateY).toBeCloseTo(staffSheet.y + staffSheet.height / 2 - fromCentreY, 5);
  });

  it('holds the landed pose for the rest of the arrival', () => {
    expect(flightPose(1, panelSheet, staffSheet)).toEqual(
      flightPose(at(SHEET_FLIGHT_MS), panelSheet, staffSheet),
    );
  });

  it('is halfway between the two rects at the middle of the flight', () => {
    const pose = flightPose(at(SHEET_FLIGHT_MS / 2), panelSheet, staffSheet);
    const landed = flightPose(1, panelSheet, staffSheet);

    expect(pose.translateX).toBeCloseTo(landed.translateX / 2, 5);
    expect(pose.translateY).toBeCloseTo(landed.translateY / 2, 5);
    expect(pose.scale).toBeCloseTo(1 + (landed.scale - 1) / 2, 5);
  });

  it('eases in and out, so the sheet neither jumps off nor slams down', () => {
    const landed = flightPose(1, panelSheet, staffSheet);
    const quarter = flightPose(at(SHEET_FLIGHT_MS / 4), panelSheet, staffSheet);
    const threeQuarters = flightPose(at((SHEET_FLIGHT_MS * 3) / 4), panelSheet, staffSheet);

    expect(Math.abs(quarter.translateX)).toBeLessThan(Math.abs(landed.translateX) / 4);
    expect(Math.abs(landed.translateX - threeQuarters.translateX))
      .toBeLessThan(Math.abs(landed.translateX) / 4);
  });

  it('never travels backwards', () => {
    let previous = 0;

    for (let step = 0; step <= 20; step += 1) {
      const { translateY } = flightPose(step / 20, panelSheet, staffSheet);
      expect(Math.abs(translateY)).toBeGreaterThanOrEqual(Math.abs(previous));
      previous = translateY;
    }
  });
});

describe('instrumentEntry', () => {
  it('holds the instrument off the left edge until its lane starts', () => {
    expect(instrumentEntry(at(INSTRUMENT_START_MS - 1))).toEqual({ slide: 1, opacity: 0 });
  });

  it('has the instrument in place and solid by the end of its lane', () => {
    expect(instrumentEntry(at(INSTRUMENT_START_MS + INSTRUMENT_MS))).toEqual({ slide: 0, opacity: 1 });
  });

  it('brings the instrument to full strength well before it stops moving', () => {
    const midway = instrumentEntry(at(INSTRUMENT_START_MS + INSTRUMENT_MS / 2));

    expect(midway.opacity).toBe(1);
    expect(midway.slide).toBeGreaterThan(0);
  });

  it('settles rather than overshoots, so the buttons stay on their holes', () => {
    for (let step = 0; step <= 20; step += 1) {
      expect(instrumentEntry(step / 20).slide).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('note buttons', () => {
  it('pops them left to right', () => {
    const delays = [0, 1, 2, 3].map(index => noteBalloonDelayMs(index, 4));

    expect(delays).toEqual([...delays].sort((a, b) => a - b));
    expect(new Set(delays).size).toBe(4);
  });

  it('staggers by the same gap for a small instrument', () => {
    expect(noteBalloonDelayMs(1, 4) - noteBalloonDelayMs(0, 4)).toBe(NOTE_BALLOON_STAGGER_MS);
  });

  it('tightens the stagger rather than running past the arrival on a wide instrument', () => {
    const gap = noteBalloonDelayMs(1, 12) - noteBalloonDelayMs(0, 12);

    expect(gap).toBeLessThan(NOTE_BALLOON_STAGGER_MS);
    expect(noteBalloonDelayMs(11, 12) + NOTE_BALLOON_MS).toBeLessThanOrEqual(ARRIVAL_TOTAL_MS);
  });

  it('keeps a button at nothing until its own turn', () => {
    expect(noteBalloonScale(at(noteBalloonDelayMs(2, 4)), 2, 4)).toBe(0);
    expect(noteBalloonScale(at(noteBalloonDelayMs(0, 4)), 2, 4)).toBe(0);
  });

  it('balloons past full size and settles back on it', () => {
    const delay = noteBalloonDelayMs(0, 4);
    const overshoot = Math.max(
      ...[0.5, 0.6, 0.7, 0.8].map(f => noteBalloonScale(at(delay + NOTE_BALLOON_MS * f), 0, 4)),
    );

    expect(overshoot).toBeGreaterThan(1);
    expect(overshoot).toBeLessThan(1.25);
    expect(noteBalloonScale(at(delay + NOTE_BALLOON_MS), 0, 4)).toBe(1);
  });

  it('leaves every button at rest once the arrival is over', () => {
    expect([0, 1, 2, 3].map(index => noteBalloonScale(1, index, 4))).toEqual([1, 1, 1, 1]);
  });
});

describe('chromeEntry', () => {
  it('keeps the controls off the bottom edge until their lane starts', () => {
    expect(chromeEntry(at(CHROME_START_MS - 1))).toEqual({ slide: 1, opacity: 0 });
  });

  it('has the controls in place by the end of the arrival', () => {
    expect(chromeEntry(at(CHROME_START_MS + CHROME_MS))).toEqual({ slide: 0, opacity: 1 });
    expect(chromeEntry(1)).toEqual({ slide: 0, opacity: 1 });
  });

  it('brings the controls in after the notes have started popping', () => {
    expect(CHROME_START_MS).toBeGreaterThanOrEqual(NOTE_BALLOON_START_MS);
  });
});

describe('resting state', () => {
  it('leaves nothing moved or faded once the arrival is complete', () => {
    expect(flightPose(1, panelSheet, panelSheet)).toEqual({ translateX: 0, translateY: 0, scale: 1 });
    expect(instrumentEntry(1)).toEqual({ slide: 0, opacity: 1 });
    expect(chromeEntry(1)).toEqual({ slide: 0, opacity: 1 });
  });
});

describe('the handover at the end of the flight', () => {
  it('overlaps the two sheets rather than cutting between them', () => {
    expect(SHEET_HANDOVER_MS).toBeGreaterThan(0);
    expect(SHEET_HANDOVER_MS).toBeLessThan(SHEET_FLIGHT_MS);
  });
});
