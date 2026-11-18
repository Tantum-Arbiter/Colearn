import { CALM, whenCalm } from '@/utils/when-calm';

describe('whenCalm', () => {
  let queue: { id: number; run: (now: number) => void }[];
  let nextId: number;
  let clock: number;
  const realRequest = global.requestAnimationFrame;
  const realCancel = global.cancelAnimationFrame;

  const frame = (gapMs: number) => {
    clock += gapMs;
    const due = queue;
    queue = [];
    due.forEach((pending) => pending.run(clock));
  };
  const frames = (count: number, gapMs: number) => {
    for (let index = 0; index < count; index += 1) frame(gapMs);
  };

  beforeEach(() => {
    queue = [];
    nextId = 1;
    clock = 1000;
    global.requestAnimationFrame = ((run: (now: number) => void) => {
      const id = nextId;
      nextId += 1;
      queue.push({ id, run });
      return id;
    }) as typeof requestAnimationFrame;
    global.cancelAnimationFrame = ((id: number) => {
      queue = queue.filter((pending) => pending.id !== id);
    }) as typeof cancelAnimationFrame;
  });

  afterEach(() => {
    global.requestAnimationFrame = realRequest;
    global.cancelAnimationFrame = realCancel;
  });

  it('runs once the screen has drawn three frames in a row on time', () => {
    const run = jest.fn();
    whenCalm(run);

    frames(CALM.frames, 16);
    expect(run).not.toHaveBeenCalled();
    frame(16);

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('starts counting again after a frame that came late, as when the screen is still taking in a change', () => {
    const run = jest.fn();
    whenCalm(run);

    frames(3, 16);
    frame(95);
    frames(CALM.frames - 1, 16);
    expect(run).not.toHaveBeenCalled();
    frame(16);

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('counts a frame a little late as on time', () => {
    const run = jest.fn();
    whenCalm(run);

    frames(CALM.frames + 1, CALM.frameMs);

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('waits no longer than its limit when the screen never settles', () => {
    const run = jest.fn();
    whenCalm(run);

    frame(16);
    frames(Math.floor(CALM.maxWaitMs / 40) - 1, 40);
    expect(run).not.toHaveBeenCalled();
    frames(2, 40);

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('can be told to wait less, as after a tap, where a child expects a reply', () => {
    const run = jest.fn();
    whenCalm(run, CALM.afterTapMs);

    frame(16);
    frames(Math.floor(CALM.afterTapMs / 40) - 1, 40);
    expect(run).not.toHaveBeenCalled();
    frames(2, 40);

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('runs only once, and asks for no more frames after', () => {
    const run = jest.fn();
    whenCalm(run);

    frames(20, 16);

    expect(run).toHaveBeenCalledTimes(1);
    expect(queue).toHaveLength(0);
  });

  it('never runs once it has been called off', () => {
    const run = jest.fn();
    const callOff = whenCalm(run);

    frame(16);
    callOff();
    frames(10, 16);

    expect(run).not.toHaveBeenCalled();
    expect(queue).toHaveLength(0);
  });

  it('waits a few frames, and at most half a second', () => {
    expect(CALM.frames).toBe(3);
    expect(CALM.frameMs).toBeGreaterThan(1000 / 60);
    expect(CALM.frameMs).toBeLessThan(2 * (1000 / 60));
    expect(CALM.maxWaitMs).toBeLessThanOrEqual(500);
    expect(CALM.afterTapMs).toBeLessThanOrEqual(200);
    expect(CALM.afterTapMs).toBeLessThan(CALM.maxWaitMs);
  });
});
