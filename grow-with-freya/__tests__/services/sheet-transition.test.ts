import {
  cueHiddenMs,
  cueMaskedAtMs,
  cueTotalMs,
  ERROR_RED_IN_MS,
  ERROR_RED_OUT_MS,
  NOTES_IN_MS,
  NOTES_OUT_MS,
} from '@/services/sheet-transition';

describe('sheet cues', () => {
  it('shows the red wash before clearing the notes on a wrong note', () => {
    // The child has to see that something went wrong before the page clears,
    // so the notes only start leaving once the red has come and gone.
    expect(cueMaskedAtMs('wrong')).toBe(ERROR_RED_IN_MS + ERROR_RED_OUT_MS + NOTES_OUT_MS);
    expect(cueMaskedAtMs('wrong')).toBeGreaterThan(cueMaskedAtMs('replay'));
  });

  it('clears the notes straight away when offering the song again', () => {
    // Nothing went wrong, so there is nothing to announce first.
    expect(cueMaskedAtMs('replay')).toBe(NOTES_OUT_MS);
  });

  it('hides the notes before the score is reset, for both cues', () => {
    // This is the whole point of the timings: the reset lands behind the cue.
    for (const cue of ['wrong', 'replay'] as const) {
      expect(cueMaskedAtMs(cue)).toBeGreaterThan(0);
      expect(cueTotalMs(cue)).toBeGreaterThan(cueMaskedAtMs(cue));
    }
  });

  it('brings the notes back for as long as it takes them to fade in', () => {
    expect(cueHiddenMs('wrong')).toBe(NOTES_IN_MS);
    expect(cueHiddenMs('replay')).toBe(NOTES_IN_MS);
  });

  it('brings the notes back more slowly than it takes them away', () => {
    // Coming back is the part the child watches, and the part that read as the
    // song simply appearing when it was as quick as the way out.
    expect(NOTES_IN_MS).toBeGreaterThan(NOTES_OUT_MS);
    expect(NOTES_IN_MS).toBeGreaterThanOrEqual(450);
  });

  it('keeps both cues short enough not to feel like a wait', () => {
    expect(cueTotalMs('wrong')).toBeLessThan(1200);
    expect(cueTotalMs('replay')).toBeLessThan(900);
  });
});
