import { SAFE_ZONE, cardFrames, chooseOutcome, trayFrame } from '@/components/experience/engines/choose/choose-layout';

const PHONE = { width: 844, height: 390 };
const TABLET = { width: 1180, height: 820 };

describe('trayFrame: the tray sits inside the page art`s safe zone', () => {
  it.each([PHONE, TABLET])('spans 28–72 % across and 23–60 % down of %o', (screen) => {
    const tray = trayFrame(screen);

    expect(tray.left).toBeCloseTo(screen.width * SAFE_ZONE.left);
    expect(tray.left + tray.width).toBeCloseTo(screen.width * SAFE_ZONE.right);
    expect(tray.top).toBeCloseTo(screen.height * SAFE_ZONE.top);
    expect(tray.top + tray.height).toBeCloseTo(screen.height * SAFE_ZONE.bottom);
  });
});

describe('cardFrames: square cards in one row, centred in the tray', () => {
  const tray = { left: 100, top: 50, width: 371, height: 144 };

  it.each([2, 3, 4])('%i cards are square, equal and inside the tray', (count) => {
    const frames = cardFrames(count, tray);

    expect(frames).toHaveLength(count);
    frames.forEach((frame) => {
      expect(frame.width).toBeCloseTo(frames[0].width);
      expect(frame.height).toBeCloseTo(frame.width);
      expect(frame.left).toBeGreaterThanOrEqual(tray.left - 0.01);
      expect(frame.left + frame.width).toBeLessThanOrEqual(tray.left + tray.width + 0.01);
      expect(frame.top).toBeGreaterThanOrEqual(tray.top - 0.01);
      expect(frame.top + frame.height).toBeLessThanOrEqual(tray.top + tray.height + 0.01);
    });
  });

  it('two cards fill the tray`s height and leave equal room either side', () => {
    const [first, second] = cardFrames(2, tray);

    expect(first.height).toBeCloseTo(tray.height);
    expect(first.left - tray.left).toBeCloseTo(tray.left + tray.width - (second.left + second.width));
    expect(second.left).toBeGreaterThan(first.left + first.width);
  });

  it('three cards shrink to fit the width and sit mid-height', () => {
    const frames = cardFrames(3, tray);

    expect(frames[0].width).toBeLessThan(tray.height);
    expect(frames[0].top + frames[0].height / 2).toBeCloseTo(tray.top + tray.height / 2);
  });

  it('no cards is no frames', () => {
    expect(cardFrames(0, tray)).toEqual([]);
  });
});

describe('chooseOutcome: open challenges welcome every choice, guided ones repair the others', () => {
  it.each([
    ['', 'megaphone', 'complete'],
    ['', 'waving-paw', 'complete'],
    ['waving-paw', 'waving-paw', 'complete'],
    ['waving-paw', 'megaphone', 'repair'],
  ] as const)('target %p, chose %p → %s', (target, choice, outcome) => {
    expect(chooseOutcome(target, choice)).toBe(outcome);
  });
});

describe('trayFrame: bounds from the page chrome', () => {
  const screen = { width: 874, height: 402 };

  it('starts below a prompt that would otherwise cover the safe zone`s top', () => {
    const tray = trayFrame(screen, { top: 140 });

    expect(tray.top).toBe(140);
    expect(tray.left).toBeCloseTo(874 * SAFE_ZONE.left);
  });

  it('may reach past the safe zone`s bottom when the narration is out of the way', () => {
    const tray = trayFrame(screen, { top: 140, bottom: 340 });

    expect(tray.top + tray.height).toBe(340);
  });

  it('keeps the safe zone`s top when the chrome ends above it, and its bottom when none is given', () => {
    const tray = trayFrame(screen, { top: 10 });

    expect(tray.top).toBeCloseTo(402 * SAFE_ZONE.top);
    expect(tray.top + tray.height).toBeCloseTo(402 * SAFE_ZONE.bottom);
  });

  it('never has a negative height', () => {
    const tray = trayFrame(screen, { top: 380, bottom: 300 });

    expect(tray.height).toBe(0);
  });
});

describe('trayFrame: the safe zone follows the page art when the art is larger than the screen', () => {
  const art = { left: 0, top: -126.75, width: 874, height: 655.5 };

  it('measures the safe zone from the art`s own frame, so the cards sit where the painter left room', () => {
    const tray = trayFrame(art);

    expect(tray.left).toBeCloseTo(874 * SAFE_ZONE.left);
    expect(tray.width).toBeCloseTo(874 * (SAFE_ZONE.right - SAFE_ZONE.left));
    expect(tray.top).toBeCloseTo(-126.75 + 655.5 * SAFE_ZONE.top);
    expect(tray.top + tray.height).toBeCloseTo(-126.75 + 655.5 * SAFE_ZONE.bottom);
  });

  it('the chrome bounds stay screen positions', () => {
    const tray = trayFrame(art, { top: 90, bottom: 340 });

    expect(tray.top).toBe(90);
    expect(tray.top + tray.height).toBe(340);
  });

  it('art that spills to the left shifts the tray with it', () => {
    const tray = trayFrame({ left: -379, top: 0, width: 1592, height: 1194 });

    expect(tray.left).toBeCloseTo(-379 + 1592 * SAFE_ZONE.left);
  });
});
