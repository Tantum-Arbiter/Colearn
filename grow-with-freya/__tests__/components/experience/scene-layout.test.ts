import { MIN_SPOT, sceneMode, sceneTap, spotFrame } from '@/components/experience/engines/scene/scene-layout';

const ART = { left: -40, top: 0, width: 960, height: 720 };

describe('sceneMode: the adapter decides how the scene is played', () => {
  it.each([
    ['multi_tap_count', 'count'],
    ['difference_find', 'every'],
    ['small_set_choice', 'find'],
    ['cause_effect', 'find'],
    ['a-newer-adapter', 'find'],
  ] as const)('%s plays as %s', (adapter, mode) => {
    expect(sceneMode(adapter)).toBe(mode);
  });
});

describe('spotFrame: a hotspot drawn in master coordinates lands on the art', () => {
  it('maps a large hotspot straight onto the art frame', () => {
    expect(spotFrame({ position: { x: 0.5, y: 0.25 }, size: { width: 0.1, height: 0.2 } }, ART)).toEqual({ left: 440, top: 180, width: 96, height: 144 });
  });

  it('grows a small hotspot to a touchable size around its own centre', () => {
    const frame = spotFrame({ position: { x: 0.5, y: 0.5 }, size: { width: 0.02, height: 0.02 } }, ART);

    expect(frame.width).toBe(MIN_SPOT);
    expect(frame.height).toBe(MIN_SPOT);
    expect(frame.left + frame.width / 2).toBeCloseTo(-40 + 0.51 * 960);
    expect(frame.top + frame.height / 2).toBeCloseTo(0.51 * 720);
  });

  it('grows only the side that is too small', () => {
    const frame = spotFrame({ position: { x: 0, y: 0 }, size: { width: 0.2, height: 0.01 } }, ART);

    expect(frame.width).toBe(192);
    expect(frame.height).toBe(MIN_SPOT);
  });
});

describe('sceneTap: counting, finding every one, and finding the one', () => {
  const IDS = ['hook-1', 'hook-2', 'hook-3'];

  it('counts each new spot once, in the order tapped', () => {
    const first = sceneTap('count', IDS, '', [], 'hook-2');
    const second = sceneTap('count', IDS, '', first.found, 'hook-1');

    expect(first).toEqual({ found: ['hook-2'], event: { type: 'counted', id: 'hook-2', count: 1 } });
    expect(second).toEqual({ found: ['hook-2', 'hook-1'], event: { type: 'counted', id: 'hook-1', count: 2 } });
  });

  it('keeps the count when a counted spot is tapped again', () => {
    expect(sceneTap('count', IDS, '', ['hook-1'], 'hook-1')).toEqual({ found: ['hook-1'], event: { type: 'repair', id: 'hook-1' } });
  });

  it('completes on the last new spot', () => {
    expect(sceneTap('count', IDS, '', ['hook-1', 'hook-3'], 'hook-2')).toEqual({ found: ['hook-1', 'hook-3', 'hook-2'], event: { type: 'complete', choice: '' } });
  });

  it('finding every one works the same way without numbers', () => {
    expect(sceneTap('every', ['a', 'b'], '', [], 'a').event).toEqual({ type: 'counted', id: 'a', count: 1 });
    expect(sceneTap('every', ['a', 'b'], '', ['a'], 'b').event).toEqual({ type: 'complete', choice: '' });
  });

  it('finds the target', () => {
    expect(sceneTap('find', ['two-dots', 'three-dots'], 'two-dots', [], 'two-dots')).toEqual({ found: ['two-dots'], event: { type: 'complete', choice: 'two-dots' } });
  });

  it('answers another spot gently and keeps looking', () => {
    expect(sceneTap('find', ['two-dots', 'three-dots'], 'two-dots', [], 'three-dots')).toEqual({ found: [], event: { type: 'repair', id: 'three-dots' } });
  });

  it('an open scene completes with whichever spot is tapped', () => {
    expect(sceneTap('find', ['paw', 'lamp'], '', [], 'lamp').event).toEqual({ type: 'complete', choice: 'lamp' });
  });

  it('ignores a spot it does not know', () => {
    expect(sceneTap('count', IDS, '', ['hook-1'], 'hook-9')).toEqual({ found: ['hook-1'], event: null });
  });
});
