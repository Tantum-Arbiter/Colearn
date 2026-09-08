import { buildMelodyTimeline, MELODY_TAIL_MS } from '@/services/melody-scheduler';

describe('buildMelodyTimeline', () => {
  it('spaces plain sequences one beat apart at the given tempo', () => {
    const underTest = buildMelodyTimeline(['C', 'D', 'E'], 120);

    expect(underTest.events.map(e => e.startMs)).toEqual([0, 500, 1000]);
    expect(underTest.events.map(e => e.slotMs)).toEqual([500, 500, 500]);
  });

  it('uses the rhythm in beats when one is supplied', () => {
    const underTest = buildMelodyTimeline(['C', 'D', 'E'], 120, [1, 0.5, 2]);

    expect(underTest.events.map(e => e.startMs)).toEqual([0, 500, 750]);
    expect(underTest.events.map(e => e.slotMs)).toEqual([500, 250, 1000]);
  });

  it('falls back to one beat per note when the rhythm does not match the sequence', () => {
    const underTest = buildMelodyTimeline(['C', 'D', 'E'], 120, [1, 2]);

    expect(underTest.events.map(e => e.startMs)).toEqual([0, 500, 1000]);
  });

  it('falls back to one beat per note when a rhythm entry is not a positive number', () => {
    const underTest = buildMelodyTimeline(['C', 'D'], 120, [1, 0]);

    expect(underTest.events.map(e => e.slotMs)).toEqual([500, 500]);
  });

  it('leaves an articulation gap so every note stops before the next one starts', () => {
    const underTest = buildMelodyTimeline(['C', 'C', 'C'], 120, [1, 0.25, 4]);

    for (const event of underTest.events) {
      expect(event.soundMs).toBeLessThan(event.slotMs);
      expect(event.soundMs).toBeGreaterThanOrEqual(event.slotMs * 0.65);
    }
  });

  it('holds long notes for most of their slot rather than a fixed length', () => {
    const [short, long] = buildMelodyTimeline(['C', 'D'], 60, [1, 4]).events;

    expect(long.soundMs).toBeGreaterThan(short.soundMs * 3);
  });

  it('splits chord entries into their notes', () => {
    const underTest = buildMelodyTimeline(['C+E+G', 'D'], 120);

    expect(underTest.events[0].notes).toEqual(['C', 'E', 'G']);
    expect(underTest.events[1].notes).toEqual(['D']);
  });

  it('numbers events by their position in the sequence', () => {
    const underTest = buildMelodyTimeline(['C', 'D', 'E'], 120);

    expect(underTest.events.map(e => e.index)).toEqual([0, 1, 2]);
  });

  it('adds a ring-out tail after the last slot to the total', () => {
    const underTest = buildMelodyTimeline(['C', 'D'], 120, [1, 2]);

    expect(underTest.totalMs).toBe(500 + 1000 + MELODY_TAIL_MS);
  });

  it('clamps unreasonable tempos instead of producing zero-length slots', () => {
    const tooFast = buildMelodyTimeline(['C'], 100000);
    const tooSlow = buildMelodyTimeline(['C'], 0);

    expect(tooFast.events[0].slotMs).toBeGreaterThanOrEqual(200);
    expect(tooSlow.events[0].slotMs).toBeLessThanOrEqual(2000);
  });

  it('returns an empty timeline for an empty sequence', () => {
    expect(buildMelodyTimeline([], 120)).toEqual({ events: [], totalMs: 0 });
  });
});
