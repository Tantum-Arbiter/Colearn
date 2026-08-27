/**
 * Tests for the glance's choreography timeline.
 *
 * The open and close used to be a handful of `const`s adding durations
 * together inside the component, with every other moment written as a
 * millisecond offset from one of them. Reordering the beats -- which happened
 * three times over the design work -- meant re-deriving all of it by hand,
 * and a mistake showed only on a device.
 *
 * These are the invariants that were broken by hand at least once each. They
 * are cheap to state now that the timeline is data.
 */

import { SCREEN_TIME_GLANCE } from '@/constants/screen-time-ring';
import {
  DRAW_OVERLAP,
  SETTLING_HALF_TURN,
  TURN_SETTLES_BY,
  DRAW_PICKUP_X,
  TURN_CURVE,
  drawPickupSlope,
  glanceCloseTimeline,
  glanceOpenTimeline,
  type GlanceDurations,
} from '@/constants/screen-time-glance-timeline';

const open = glanceOpenTimeline();
const close = glanceCloseTimeline();

describe('glanceOpenTimeline', () => {
  it('runs its beats in order, with no gap between them', () => {
    expect(open.morph.at).toBe(open.spin.ends);
    expect(open.settle.at).toBe(open.draw.ends);
  });

  it('flattens and settles as one move rather than two beats', () => {
    // The defect this pins: the orb flattened where it was pressed and only
    // then dropped onto the border. Against a 15px settle that descent read
    // as a separate beat -- the line going down into position rather than
    // arriving there. Sharing the morph's window makes it one gesture.
    expect(open.travel.at).toBe(open.morph.at);
    expect(open.travel.ends).toBe(open.morph.ends);
  });

  it('starts the border exactly as the line lands, never before', () => {
    // The defect this pins: the border used to pick up 60ms early, from when
    // the line crossed a third of the screen and the overlap made the two
    // read as one movement. The line now only settles 15px onto the bottom
    // edge, so starting early drew the stroke several pixels below the line
    // -- which reads as the line jumping into position rather than arriving.
    expect(open.draw.at).toBe(open.travel.ends);
    expect(DRAW_OVERLAP).toBe(0);
  });

  it('lands the turn where a line looks the same, so it finishes level', () => {
    // A line is unchanged by half a turn, which is what lets the spin keep
    // running through the flatten. The requirement is a multiple of 180, not
    // of 360 -- and it is a real requirement: a rotation that landed on
    // neither left the finished line lying at an angle, correct-looking in
    // code and plainly wrong on screen.
    expect(open.rotation % 180).toBe(0);
    expect(open.turns).toBeGreaterThan(0);
  });

  it('finishes the turn while the arm is still a coil, not once it is a line', () => {
    // The defect this pins: the turn ran the whole length of the morph, and
    // the arm is recognisably a line long before the morph ends -- 59% laid
    // down and still 11 degrees off level, its far tip 25px from where it
    // lands. The line appeared and was then swung into position. A coil looks
    // right rotating; a line looks like it is being dragged.
    expect(open.turn.ends).toBeGreaterThan(open.morph.at);
    expect(open.turn.ends).toBeLessThan(open.morph.at + open.morph.over * 0.5);
  });

  it('makes a half turn more than its whole spins, while laying the arm down', () => {
    expect(open.rotation - open.turns * 360).toBe(SETTLING_HALF_TURN);
  });

  it('finishes the orb’s colour turn while it is still spinning', () => {
    // the orb has to be water blue by the time it is the line the border is
    // drawn in
    expect(open.water.ends).toBeLessThanOrEqual(open.spin.ends);
  });

  it('takes the orb away only once the border has taken over', () => {
    expect(open.orbOut.at).toBeGreaterThan(open.draw.at);
    expect(open.orbOut.ends).toBeLessThan(open.settle.at);
  });

  it('drops the ring’s outline as the orb flattens, not before', () => {
    // an outline squashed into a line is a pair of hairline caps; the core is
    // what has to survive as the travelling stroke
    expect(open.arcOut.at).toBe(open.morph.at);
    expect(open.arcOut.ends).toBeLessThan(open.morph.ends);
  });

  it('blacks out and fills together, only once the frame exists', () => {
    expect(open.settle.at).toBeGreaterThanOrEqual(open.draw.ends);
  });

  it('hands the drawn stroke over to the panel’s own border mid-settle', () => {
    expect(open.strokeOut.at).toBeGreaterThan(open.settle.at);
    expect(open.strokeOut.at).toBeLessThan(open.settle.ends);
  });

  it('brings the content in last', () => {
    expect(open.content.at).toBeGreaterThan(open.settle.at);
  });

  it('reports a total no beat runs past', () => {
    const ends = [
      open.spin, open.swell, open.ease, open.turn, open.orbIn, open.orbOut,
      open.water, open.arcOut, open.morph, open.travel, open.draw, open.settle,
      open.strokeOut, open.content,
    ].map((phase) => phase.ends);

    expect(Math.max(...ends)).toBe(open.total);
  });

  it('stays inside a budget a parent will wait through', () => {
    expect(open.total).toBeLessThan(2400);
  });

  it('holds its order when the durations change', () => {
    // the point of the extraction: retiming a beat cannot silently reorder
    // the others
    const slower: GlanceDurations = { ...SCREEN_TIME_GLANCE, morphDuration: 900 };
    const retimed = glanceOpenTimeline(slower);

    expect(retimed.morph.at).toBe(retimed.spin.ends);
    expect(retimed.travel.at).toBe(retimed.morph.at);
    expect(retimed.travel.ends).toBe(retimed.morph.ends);
    expect(retimed.draw.at).toBe(retimed.travel.ends);
    expect(retimed.settle.at).toBe(retimed.draw.ends);
    expect(retimed.turn.ends).toBeLessThan(retimed.morph.ends);
    expect(retimed.turn.ends).toBeGreaterThan(retimed.morph.at);
  });
});

describe('glanceCloseTimeline', () => {
  it('dims the content before gathering the panel', () => {
    expect(close.gather.at).toBe(close.dim.ends);
  });

  it('tints to water while the panel is still gathering', () => {
    expect(close.tint.at).toBeGreaterThan(close.gather.at);
    expect(close.tint.ends).toBe(close.gather.ends);
  });

  it('brings the teardrop up before the gathered panel is gone', () => {
    // The defect this pins: the drop was never seen at all. The gathered
    // panel underneath is convincing enough to hide its absence at speed.
    expect(close.dropIn.at).toBeLessThan(close.handover.at);
    expect(close.dropIn.ends).toBeLessThanOrEqual(close.flight.at);
  });

  it('keeps the drop at full opacity for the whole flight', () => {
    // it vanished in mid-air sixty milliseconds before landing, once
    expect(close.dropIn.ends).toBeLessThanOrEqual(close.flight.at);
    expect(close.dropOut.at).toBeGreaterThanOrEqual(close.flight.ends - 20);
  });

  it('hangs for a beat at its smallest before falling', () => {
    expect(close.flight.at).toBeGreaterThan(close.gather.ends);
  });

  it('lifts the night while the drop is still travelling', () => {
    // the home screen has to be back by the time the drop gets there
    expect(close.nightLifts.at).toBeGreaterThan(close.flight.at);
    expect(close.nightLifts.ends).toBeLessThanOrEqual(close.flight.ends);
  });

  it('splashes exactly where the flight ends', () => {
    expect(close.splash.at).toBe(close.flight.ends);
  });

  it('grows the orb out of the splash rather than alongside it', () => {
    expect(close.orbIn.at).toBeGreaterThan(close.splash.at);
    expect(close.orbIn.at).toBeLessThan(close.splash.ends);
  });

  it('brings the outline back only once the orb is solid', () => {
    expect(close.arcBack.at).toBeGreaterThanOrEqual(close.orbIn.ends);
  });

  it('turns blue back to the ring’s colour only once the orb can be seen', () => {
    // The defect this pins: started with the fade-in, the colour was already
    // halfway to red before there was anything solid to see it on, and the
    // orb simply arrived a muddy red.
    expect(close.water.at).toBeGreaterThan(close.orbIn.ends);
  });

  it('finishes on the colour turn, so nothing is still moving when it closes', () => {
    // The defect this pins: the callback hung on the core's growth, and the
    // window handed the corner back to a red ring while the orb was still
    // half blue.
    const ends = [
      close.dim, close.gather, close.tint, close.handover, close.dropIn,
      close.flight, close.dropOut, close.nightLifts, close.splash,
      close.orbIn, close.reform, close.arcBack, close.water,
    ].map((phase) => phase.ends);

    expect(close.water.ends).toBe(Math.max(...ends));
    expect(close.total).toBe(close.water.ends);
  });

  it('stays inside a budget a parent will wait through', () => {
    expect(close.total).toBeLessThan(2000);
  });
});

describe('TURN_CURVE', () => {
  const [x1, y1, x2, y2] = TURN_CURVE;

  it('reaches its working speed rather than spiking through it', () => {
    // The defect this pins: an in-out cubic is symmetric, so the orb peaked at
    // 3650 deg/s a third of the way in and had coasted to a tenth of that by
    // the time the arm began to lay down -- the spin and the line happened one
    // after the other rather than one carrying into the other.
    //
    // A cubic bezier leaves the origin at y1/x1. One means it arrives at its
    // working speed and stays there instead of accelerating through it.
    expect(y1 / x1).toBeCloseTo(1, 1);
  });

  it('brakes to a stop rather than being cut off', () => {
    // final slope is (1 - y2) / (1 - x2); zero means it comes to rest
    expect(y2).toBe(1);
  });

  it('holds that speed until late, so it is still turning as the arm lays down', () => {
    expect(x2).toBeGreaterThan(0.7);
  });

  it('is a curve a bezier easing will accept', () => {
    [x1, x2].forEach((x) => {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
    });
  });
});

describe('drawPickupSlope', () => {
  // A perimeter and a pace taken from a real iPad: the border is 3840px and
  // the arm lays 129px over the 340ms morph.
  const LINE = 128.6;
  const BORDER = 3840;

  it('hands the border the rate the arm was laying at', () => {
    // The defect this pins: the draw was eased in-out, so it started at zero.
    // The stroke reached the arm's tip, stopped dead, and then accelerated to
    // sixty times the speed it had arrived at. It is a `withSequence` join by
    // another name -- committed between two elements rather than within one
    // value, which is why looking at either on its own never showed it.
    const y1 = drawPickupSlope(LINE, BORDER, 340, 480);

    // a cubic bezier leaves the origin at y1/x1
    const slope = y1 / DRAW_PICKUP_X;
    const pxPerSecond = (slope * BORDER) / (480 / 1000);

    expect(pxPerSecond).toBeCloseTo(LINE / (340 / 1000), 0);
  });

  it('gives a control point a bezier will accept', () => {
    const y1 = drawPickupSlope(LINE, BORDER, 340, 480);

    expect(y1).toBeGreaterThan(0);
    expect(y1).toBeLessThan(1);
  });

  it('asks the border to start slower the longer it has to travel', () => {
    // a bigger screen means more perimeter in the same time, so the pickup has
    // to be a smaller fraction of it
    const small = drawPickupSlope(LINE, 2000, 340, 480);
    const large = drawPickupSlope(LINE, 6000, 340, 480);

    expect(large).toBeLessThan(small);
  });

  it('does not divide by a perimeter it has not been given', () => {
    expect(Number.isFinite(drawPickupSlope(LINE, 0, 340, 480))).toBe(true);
    expect(Number.isFinite(drawPickupSlope(LINE, BORDER, 0, 480))).toBe(true);
  });
});
