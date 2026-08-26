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
  glanceCloseTimeline,
  glanceOpenTimeline,
  type GlanceDurations,
} from '@/constants/screen-time-glance-timeline';

const open = glanceOpenTimeline();
const close = glanceCloseTimeline();

describe('glanceOpenTimeline', () => {
  it('runs its beats in order, with no gap between them', () => {
    expect(open.morph.at).toBe(open.spin.ends);
    expect(open.travel.at).toBe(open.morph.ends);
    expect(open.settle.at).toBe(open.draw.ends);
  });

  it('changes the orb’s shape under the finger, before anything travels', () => {
    // travelling first and flattening on arrival made the shape change
    // somewhere the eye was not yet looking
    expect(open.morph.ends).toBeLessThanOrEqual(open.travel.at);
  });

  it('picks the border up just before the line lands, not after', () => {
    // the two have to read as one continuous stroke; a handover with a gap in
    // it reads as two animations
    expect(open.draw.at).toBeLessThan(open.travel.ends);
    expect(open.draw.at).toBeGreaterThan(open.travel.at);
    expect(open.travel.ends - open.draw.at).toBe(DRAW_OVERLAP);
  });

  it('turns a whole number of times, so the line lands vertical', () => {
    // The defect this pins: a rotation that did not land on a whole turn left
    // the finished line lying on its side -- perfectly correct in code and
    // plainly wrong on screen.
    expect(open.rotation % 360).toBe(0);
    expect(open.turns).toBeGreaterThan(0);
  });

  it('stops turning exactly as the line settles, and never turns while travelling', () => {
    expect(open.turn.ends).toBe(open.morph.ends);
    expect(open.turn.ends).toBeLessThanOrEqual(open.travel.at);
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
    expect(retimed.travel.at).toBe(retimed.morph.ends);
    expect(retimed.draw.at).toBeLessThan(retimed.travel.ends);
    expect(retimed.settle.at).toBe(retimed.draw.ends);
    expect(retimed.turn.ends).toBe(retimed.morph.ends);
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
