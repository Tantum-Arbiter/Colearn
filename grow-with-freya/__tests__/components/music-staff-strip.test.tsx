import React from 'react';
import { render, type RenderResult } from '@testing-library/react-native';
import { MusicStaffStrip } from '@/components/music/music-staff-strip';
import { staffNoteMetrics, staffNoteSlots, staffNoteY, staffRowShift, staffStemHeight, staffShadowLength, staffStepsAboveBottomLine, STAFF_ASPECT_RATIO } from '@/services/staff-notation';
import { buildHoldPlan } from '@/services/hold-plan';

jest.mock('@/hooks/use-reduced-motion', () => ({ useReducedMotion: () => false }));

const noteLayout = [
  { note: 'C', label: '⭐', color: '#E04E3A', icon: 'star' },
  { note: 'D', label: '🌙', color: '#F07A1D', icon: 'moon' },
  { note: 'E', label: '🍃', color: '#D69A16', icon: 'leaf' },
  { note: 'G', label: '☀️', color: '#1E88E5', icon: 'sun' },
  { note: 'A', label: '💧', color: '#8E5BD8', icon: 'droplet' },
] as any;

const stepsFor = (note: string) => staffStepsAboveBottomLine(note)!;

const WIDTH = 600;
const metrics = staffNoteMetrics(WIDTH)!;
const HEIGHT = WIDTH / STAFF_ASPECT_RATIO;

function flatStyle(style: unknown): Record<string, any> {
  return Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
}

function allByTestId(view: RenderResult, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID });
}

function byTestId(view: RenderResult, testID: string) {
  const matches = allByTestId(view, testID);
  return matches[matches.length - 1];
}

function renderStrip(overrides: Record<string, unknown> = {}) {
  return render(
    <MusicStaffStrip
      sequence={['C', 'E', 'G']}
      noteLayout={noteLayout}
      currentIndex={0}
      width={WIDTH}
      {...overrides}
    />
  );
}

/** Vertical centre of a note head, in banner pixels. */
function headCentreY(view: RenderResult, index: number) {
  const style = flatStyle(byTestId(view, `staff-note-${index}`).props.style);
  return style.top + style.height / 2;
}

describe('MusicStaffStrip', () => {
  it('draws the staff banner at the width it is given', () => {
    const view = renderStrip();
    const banner = allByTestId(view, 'staff-banner').filter(node => node.props.source)[0];
    expect(flatStyle(banner.props.style)).toMatchObject({ width: WIDTH, height: HEIGHT });
  });

  it('draws one note head per entry in the sequence', () => {
    const view = renderStrip({ sequence: ['C', 'D', 'E', 'G'] });
    expect(allByTestId(view, 'staff-note-head-3').length).toBeGreaterThan(0);
    expect(allByTestId(view, 'staff-note-head-4').length).toBe(0);
  });

  it('colours each head like the instrument button for that note', () => {
    const view = renderStrip({ sequence: ['G', 'C'] });
    expect(flatStyle(byTestId(view, 'staff-note-head-0').props.style).backgroundColor).toBe('#1E88E5');
    expect(flatStyle(byTestId(view, 'staff-note-head-1').props.style).backgroundColor).toBe('#E04E3A');
  });

  it('sits each head on the staff line or space its note belongs to', () => {
    const view = renderStrip({ sequence: ['E', 'G', 'C'] });
    expect(headCentreY(view, 0)).toBeCloseTo(staffNoteY(stepsFor('E'), HEIGHT), 1);
    expect(headCentreY(view, 1)).toBeCloseTo(staffNoteY(stepsFor('G'), HEIGHT), 1);
    expect(headCentreY(view, 2)).toBeCloseTo(staffNoteY(stepsFor('C'), HEIGHT), 1);
  });

  it('keeps the whole scale inside the printed paper', () => {
    const view = renderStrip({ sequence: ['C', 'D', 'E', 'F', 'G', 'A'] });
    for (let index = 0; index < 6; index += 1) {
      const style = flatStyle(byTestId(view, `staff-note-${index}`).props.style);
      expect(style.top).toBeGreaterThan(0);
      expect(style.top + style.height).toBeLessThan(HEIGHT * 0.78);
    }
  });

  it('spaces the notes along the row so the score reads left to right', () => {
    const view = renderStrip({ sequence: ['C', 'C', 'C'] });
    const left = (index: number) => flatStyle(byTestId(view, `staff-note-${index}`).props.style).left;
    expect(left(1) - left(0)).toBeCloseTo(metrics.spacing, 1);
    expect(left(2) - left(1)).toBeCloseTo(metrics.spacing, 1);
  });

  it('draws a ledger line for A, the one note written above the staff', () => {
    const view = renderStrip({ sequence: ['A', 'G', 'C'] });
    expect(allByTestId(view, 'staff-note-ledger-0').length).toBeGreaterThan(0);
    // G is the space just over the top line, so it needs no line of its own.
    expect(allByTestId(view, 'staff-note-ledger-1').length).toBe(0);
    expect(allByTestId(view, 'staff-note-ledger-2').length).toBe(0);
  });




  it('never takes a touch, so the instrument keeps every press', () => {
    const view = renderStrip();
    expect(byTestId(view, 'staff-strip').props.pointerEvents).toBe('none');
  });

  it('gives every note a stem, drawn in the note colour', () => {
    const view = renderStrip({ sequence: ['G'] });
    const stem = flatStyle(byTestId(view, 'staff-note-stem-0').props.style);
    expect(stem.backgroundColor).toBe('#1E88E5');
    expect(stem.height).toBeCloseTo(staffStemHeight(stepsFor('G'), HEIGHT, metrics.lineGap), 1);
  });

  it('hangs the stem below the head, as it is engraved this high on the staff', () => {
    const view = renderStrip({ sequence: ['C'] });
    const stem = flatStyle(byTestId(view, 'staff-note-stem-0').props.style);
    expect(stem.top).toBeCloseTo(metrics.headHeight / 2, 1);
    expect(stem.bottom).toBeUndefined();
  });

  it('ends every stem on the bottom staff line, whatever the note', () => {
    const view = renderStrip({ sequence: ['C', 'E', 'A'] });
    const stemEnd = (index: number) => {
      const note = flatStyle(byTestId(view, `staff-note-${index}`).props.style);
      const stem = flatStyle(byTestId(view, `staff-note-stem-${index}`).props.style);
      return note.top + stem.top + stem.height;
    };
    const bottomLine = staffNoteY(0, HEIGHT);
    expect(stemEnd(0)).toBeCloseTo(bottomLine, 1);
    expect(stemEnd(1)).toBeCloseTo(bottomLine, 1);
    expect(stemEnd(2)).toBeCloseTo(bottomLine, 1);
  });

  it('writes each note letter under the staff', () => {
    const view = renderStrip({ sequence: ['C', 'G'] });
    expect(byTestId(view, 'staff-note-letter-0').props.children).toBe('C');
    expect(byTestId(view, 'staff-note-letter-1').props.children).toBe('G');
  });

  it('lines every letter up on one baseline, however high its note sits', () => {
    const view = renderStrip({ sequence: ['C', 'A', 'E'] });
    const letterY = (index: number) => {
      const note = flatStyle(byTestId(view, `staff-note-${index}`).props.style);
      const letter = flatStyle(byTestId(view, `staff-note-letter-${index}`).props.style);
      return note.top + letter.top + letter.height / 2;
    };
    expect(letterY(1)).toBeCloseTo(letterY(0), 1);
    expect(letterY(2)).toBeCloseTo(letterY(0), 1);
    // And that baseline is the one the geometry names, under the bottom line.
    expect(letterY(0)).toBeCloseTo(metrics.letterY, 1);
    expect(letterY(0)).toBeGreaterThan(staffNoteY(0, HEIGHT));
  });

  it('colours the letter like its note, so it matches the button', () => {
    const view = renderStrip({ sequence: ['G'] });
    expect(flatStyle(byTestId(view, 'staff-note-letter-0').props.style).color).toBe('#1E88E5');
  });

  it('writes the song name on the clear paper between the border and the staff', () => {
    const view = renderStrip({ title: 'Au Clair de la Lune' });
    const title = byTestId(view, 'staff-title');
    expect(title.props.children).toBe('Au Clair de la Lune');
    const band = flatStyle(byTestId(view, 'staff-title-band').props.style);
    expect(band.top).toBeGreaterThanOrEqual(HEIGHT * 0.2);
    expect(band.top + band.height).toBeLessThanOrEqual(HEIGHT * 0.3651 + 0.01);
    // A line of it has to fit in that band, or it spills onto the staff.
    expect(flatStyle(title.props.style).fontSize * 1.2).toBeLessThanOrEqual(band.height);
  });

  it('leaves the paper clear when there is no song name', () => {
    expect(allByTestId(renderStrip(), 'staff-title').length).toBe(0);
  });

  it('fades the notes that have already been played', () => {
    const view = renderStrip({ sequence: ['C', 'D', 'E'], currentIndex: 2 });
    const opacity = (index: number) => flatStyle(byTestId(view, `staff-note-${index}`).props.style).opacity;
    expect(opacity(0)).toBeLessThan(0.6);
    expect(opacity(1)).toBeLessThan(0.6);
    expect(opacity(2)).toBe(1);
  });

  it('bounces the note the child is on, so a landing reads as one', () => {
    const view = renderStrip({ sequence: ['C', 'D'], currentIndex: 0 });
    // The bounce style rides on the focused head only; the others get nothing.
    const styleOf = (index: number) => byTestId(view, `staff-note-head-${index}`).props.style as unknown[];
    expect(styleOf(0)[1]).toBeTruthy();
    expect(styleOf(1)[1]).toBeFalsy();
  });

  it('rings the note the child has to play next', () => {
    const view = renderStrip({ sequence: ['C', 'D', 'E'], currentIndex: 1 });
    expect(allByTestId(view, 'staff-note-halo-1').length).toBeGreaterThan(0);
    expect(allByTestId(view, 'staff-note-halo-0').length).toBe(0);
    expect(allByTestId(view, 'staff-note-halo-2').length).toBe(0);
  });

  it('rings nothing when it is a sheet to read rather than play', () => {
    // The music-sheet page has no next note to point at, so a ring there only
    // invites the child to press the wrong thing.
    const view = renderStrip({ sequence: ['C', 'D', 'E'], currentIndex: 1, markCurrent: false });
    expect(allByTestId(view, 'staff-note-halo-1').length).toBe(0);
    expect(allByTestId(view, 'staff-note-head-1').length).toBeGreaterThan(0);
  });


  it('moves the ring onto the note the success melody is sounding', () => {
    const view = renderStrip({ sequence: ['C', 'D', 'E'], currentIndex: 0, playbackIndex: 2 });
    expect(allByTestId(view, 'staff-note-halo-2').length).toBeGreaterThan(0);
    expect(allByTestId(view, 'staff-note-halo-0').length).toBe(0);
  });

  // The row's position is a shared value now, so it reaches the screen by one
  // route and a jest render cannot read it (`useAnimatedStyle` gives back {}).
  // What the row is parked on is asserted against the pure layer instead --
  // `staffRowShift` and `staffFocusIndex` in staff-notation.test.ts -- and what
  // is drawn inside the row is asserted here.

  it('keeps the closing note on the page once the song is done', () => {
    // Past the last note there is nothing left to play, so the score stops on
    // the closing note rather than scrolling off and leaving a blank staff.
    const view = renderStrip({ sequence: ['C', 'D', 'E'], currentIndex: 3 });
    expect(allByTestId(view, 'staff-note-head-2').length).toBeGreaterThan(0);
    expect(flatStyle(byTestId(view, 'staff-note-2').props.style).opacity).toBeLessThan(0.6);
  });

  it('takes the ring off once there is no note left to play', () => {
    const view = renderStrip({ sequence: ['C', 'D'], currentIndex: 2 });
    expect(allByTestId(view, 'staff-note-halo-0').length).toBe(0);
    expect(allByTestId(view, 'staff-note-halo-1').length).toBe(0);
  });

  it('reads a chord entry as its first known note', () => {
    const view = renderStrip({ sequence: ['C+E'] });
    expect(flatStyle(byTestId(view, 'staff-note-head-0').props.style).backgroundColor).toBe('#E04E3A');
    expect(headCentreY(view, 0)).toBeCloseTo(staffNoteY(stepsFor('C'), HEIGHT), 1);
  });

  it('leaves the slot empty for a note it cannot place but keeps the ones after it in step', () => {
    const view = renderStrip({ sequence: ['H', 'E'] });
    expect(allByTestId(view, 'staff-note-head-0').length).toBe(0);
    expect(flatStyle(byTestId(view, 'staff-note-1').props.style).left)
      .toBeCloseTo(metrics.spacing - metrics.headWidth / 2, 1);
  });

  it('parks the notes inside the part of the sheet that is on screen', () => {
    const view = renderStrip({ visibleFraction: 0.5 });
    const window = flatStyle(byTestId(view, 'staff-note-window').props.style);
    expect(window.left).toBeCloseTo(WIDTH * 0.181, 1);
    expect(window.left + window.width).toBeCloseTo(WIDTH * 0.5, 1);
  });

  describe('hold shadows', () => {
    const noteLeft = (view: RenderResult, index: number) =>
      flatStyle(byTestId(view, `staff-note-${index}`).props.style).left as number;

    it('draws a shadow behind each note for how long to hold it', () => {
      const plan = buildHoldPlan(['C', 'D'], 120, [1, 1]);
      const view = renderStrip({ sequence: ['C', 'D'], holdPlan: plan });
      const shadow = flatStyle(byTestId(view, 'staff-note-shadow-0').props.style);
      expect(shadow.width).toBeCloseTo(staffShadowLength(plan.targets[0].holdMs, plan.beatMs, metrics), 1);
      expect(shadow.backgroundColor).toBe('#E04E3A');
    });

    it('keeps the shadow visible but see-through, so the staff still reads under it', () => {
      const view = renderStrip({ sequence: ['C'], holdPlan: buildHoldPlan(['C'], 120, [1]) });
      const opacity = flatStyle(byTestId(view, 'staff-note-shadow-0').props.style).opacity as number;
      expect(opacity).toBeGreaterThan(0.6);
      expect(opacity).toBeLessThan(0.95);
    });

    it('gives a note held twice as long twice the shadow', () => {
      const plan = buildHoldPlan(['C', 'D'], 120, [1, 2]);
      const view = renderStrip({ sequence: ['C', 'D'], holdPlan: plan });
      const first = flatStyle(byTestId(view, 'staff-note-shadow-0').props.style).width as number;
      const second = flatStyle(byTestId(view, 'staff-note-shadow-1').props.style).width as number;
      expect(second).toBeCloseTo(first * 2, 1);
    });

    it('leaves notes of the same length evenly spaced, each shadow standing clear', () => {
      const view = renderStrip({ sequence: ['C', 'D', 'E'], holdPlan: buildHoldPlan(['C', 'D', 'E'], 120, [1, 1, 1]) });
      const first = noteLeft(view, 1) - noteLeft(view, 0);
      expect(noteLeft(view, 2) - noteLeft(view, 1)).toBeCloseTo(first, 1);
      // Wider than the bare spacing, so the shadows do not run into one another.
      expect(first).toBeGreaterThan(metrics.spacing);
      expect(first).toBeLessThan(metrics.spacing * 1.25);
    });

    it('moves the next note along when a shadow needs the room', () => {
      const view = renderStrip({ sequence: ['C', 'D'], holdPlan: buildHoldPlan(['C', 'D'], 120, [4, 1]) });
      expect(noteLeft(view, 1) - noteLeft(view, 0)).toBeGreaterThan(metrics.spacing * 2);
    });

    it('marks where the hold has to reach with a line at the end of the shadow', () => {
      const plan = buildHoldPlan(['C'], 120, [1]);
      const view = renderStrip({ sequence: ['C'], holdPlan: plan });
      const shadow = flatStyle(byTestId(view, 'staff-note-shadow-0').props.style);
      const target = flatStyle(byTestId(view, 'staff-note-target-0').props.style);
      // Stands at the far end of the shadow, and taller than it so it reads as a line.
      expect(target.left + target.width).toBeCloseTo(shadow.left + shadow.width, 1);
      expect(target.height).toBeGreaterThan(shadow.height);
      expect(target.backgroundColor).toBe('#E04E3A');
    });

    it('draws no shadow for a song with no hold data', () => {
      const view = renderStrip({ sequence: ['C', 'D'] });
      expect(allByTestId(view, 'staff-note-shadow-0').length).toBe(0);
    });
  });

  it('stands a light at the cut, where the note slides out of view', () => {
    const view = renderStrip();
    const light = flatStyle(byTestId(view, 'staff-hold-light').props.style);
    const window = flatStyle(byTestId(view, 'staff-note-window').props.style);
    // Centred on the cut, and outside the window so the very edge it marks does
    // not clip it in half.
    expect(light.left + light.width / 2).toBeCloseTo(window.left as number, 1);
  });

  it('sits the light on the held note, not across the whole staff', () => {
    // What is being consumed is that one note and its highlight. A full-height
    // line said nothing about which note it belonged to.
    const view = renderStrip({ sequence: ['C', 'A'], currentIndex: 1 });
    const light = flatStyle(byTestId(view, 'staff-hold-light').props.style);
    expect(light.top + light.height / 2).toBeCloseTo(staffNoteY(stepsFor('A'), HEIGHT), 1);
    // No taller than a couple of line gaps -- it is on the row, not spanning it.
    expect(light.height).toBeLessThan(metrics.lineGap * 2);
  });

  it('follows the held note up and down the staff', () => {
    const low = renderStrip({ sequence: ['C', 'A'], currentIndex: 0 });
    const high = renderStrip({ sequence: ['C', 'A'], currentIndex: 1 });
    const y = (v: RenderResult) => flatStyle(byTestId(v, 'staff-hold-light').props.style).top;
    expect(y(high)).toBeLessThan(y(low) as number);
  });

  it('haloes the light in the note\'s own colour so it reads on the highlight', () => {
    const view = renderStrip({ sequence: ['C', 'A'], currentIndex: 1 });
    const core = flatStyle(byTestId(view, 'staff-hold-line').props.style);
    const box = flatStyle(byTestId(view, 'staff-hold-light').props.style);
    const glow = flatStyle(byTestId(view, 'staff-hold-glow').props.style);
    expect(glow.backgroundColor).toBe('#8E5BD8');        // A's button colour
    expect(core.backgroundColor).not.toBe(glow.backgroundColor);
    expect(glow.width).toBeGreaterThan(core.width as number);
    expect(glow.height).toBeGreaterThan(core.height as number);
    // Level with the line, but spreading right from the cut, over the highlight
    // being eaten rather than back over the clef and bare paper.
    expect(glow.top + glow.height / 2).toBeCloseTo(box.top + box.height / 2, 1);
    const window = flatStyle(byTestId(view, 'staff-note-window').props.style);
    expect(glow.left).toBeCloseTo(window.left as number, 1);
    expect(glow.left).toBeGreaterThan(box.left as number);
  });

  it('falls away in layers so the light radiates rather than sitting there', () => {
    // One block of the note's colour read as a pale slab on the paper. The
    // layers carry static opacities under a single animated one -- nested
    // opacity multiplies -- so the falloff costs no extra animation.
    const view = renderStrip({ sequence: ['C', 'A'], currentIndex: 1 });
    const layers = allByTestId(view, 'staff-hold-glow-inner')
      .concat(allByTestId(view, 'staff-hold-glow'))
      .map(node => flatStyle(node.props.style))
      .filter(style => style.width !== undefined);
    expect(layers.length).toBeGreaterThan(2);
    const sorted = [...layers].sort((a, b) => (a.width as number) - (b.width as number));
    // Wider means fainter, all the way out.
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i].opacity).toBeLessThan(sorted[i - 1].opacity as number);
      expect(sorted[i].height).toBeGreaterThan(sorted[i - 1].height as number);
    }
    // Narrower than the single block it replaced, which was 2.1 line gaps.
    expect(Math.max(...sorted.map(l => l.width as number))).toBeLessThan(metrics.lineGap * 1.6);
  });

  it('blooms behind the line so it reads as a light, not a painted bar', () => {
    const view = renderStrip();
    const line = flatStyle(byTestId(view, 'staff-hold-line').props.style);
    const bloom = flatStyle(byTestId(view, 'staff-hold-line-bloom').props.style);
    expect(bloom.width).toBeGreaterThan(line.width as number);
    expect(bloom.height).toBeGreaterThan(line.height as number);
    expect(bloom.opacity).toBeLessThan(1);
    expect(bloom.backgroundColor).toBe(line.backgroundColor);
  });

  it('leaves the light off a note it cannot place on the staff', () => {
    const view = renderStrip({ sequence: ['H'], currentIndex: 0 });
    expect(allByTestId(view, 'staff-hold-light').length).toBe(0);
  });

  it('swells a note harder while the melody plays it back than while the child does', () => {
    // Nothing is being asked of the child during playback, so the notes are
    // free to be pleased with themselves.
    const playing = renderStrip({ sequence: ['C', 'D'], currentIndex: 0, playbackIndex: 1 });
    const child = renderStrip({ sequence: ['C', 'D'], currentIndex: 1 });
    // The bounce rides on the focused head in both, which is what a jest render
    // can see; the size of it lives in the animation.
    expect((byTestId(playing, 'staff-note-head-1').props.style as unknown[])[1]).toBeTruthy();
    expect((byTestId(child, 'staff-note-head-1').props.style as unknown[])[1]).toBeTruthy();
  });

  it('keeps the wrong-note wash inside the paper, not over the story behind it', () => {
    // The artwork is paper with transparent margins and a transparent skirt
    // below it, so a coloured rectangle over the strip's box washed the story
    // art above the sheet red too. The wash is the banner itself, tinted.
    const view = renderStrip();
    // Every image shares one mock object here, so what matters is that the wash
    // *is* an image sized to the banner rather than a plain coloured box.
    const wash = allByTestId(view, 'staff-error-wash').filter(node => node.props.source)[0];
    expect(wash).toBeTruthy();
    const style = flatStyle(wash.props.style);
    expect(style.tintColor).toBeTruthy();
    expect(style.width).toBe(WIDTH);
    expect(style.height).toBeCloseTo(HEIGHT, 1);
    expect(wash.props.resizeMode).toBe('contain');
  });

  it('draws nothing before the strip has been measured', () => {
    const view = renderStrip({ width: 0 });
    expect(allByTestId(view, 'staff-banner').length).toBe(0);
  });

  it('draws nothing when there is no sequence to play', () => {
    const view = renderStrip({ sequence: [] });
    expect(allByTestId(view, 'staff-banner').length).toBe(0);
  });
});
