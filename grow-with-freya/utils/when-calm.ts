export const CALM = {
  frames: 3,
  frameMs: 22,
  maxWaitMs: 500,
  afterTapMs: 200,
} as const;

export function whenCalm(run: () => void, maxWaitMs: number = CALM.maxWaitMs): () => void {
  let previous: number | null = null;
  let started: number | null = null;
  let calm = 0;
  let finished = false;
  let pending = requestAnimationFrame(tick);

  function tick(now: number) {
    if (started === null) started = now;
    if (previous !== null) calm = now - previous <= CALM.frameMs ? calm + 1 : 0;
    previous = now;

    if (calm >= CALM.frames || now - started >= maxWaitMs) {
      finished = true;
      run();
      return;
    }
    pending = requestAnimationFrame(tick);
  }

  return () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(pending);
  };
}
