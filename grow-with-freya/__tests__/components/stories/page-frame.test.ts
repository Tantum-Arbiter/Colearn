import { FOCUS_MARGIN, MASTER_ASPECT, challengeFocus, coverFrame, focusFrame, patchFrame } from '@/components/stories/page-frame';
import type { LearningChallenge } from '@/types/story';

describe('coverFrame: where a 4:3 master lands when it fills the screen from the centre', () => {
  it.each([
    ['a 20:9 phone', { width: 874, height: 402 }, { left: 0, top: (402 - 874 * 0.75) / 2, width: 874, height: 874 * 0.75 }],
    ['a 16:9 phone', { width: 844, height: 390 }, { left: 0, top: (390 - 844 * 0.75) / 2, width: 844, height: 844 * 0.75 }],
    ['a landscape tablet', { width: 1194, height: 834 }, { left: 0, top: (834 - 1194 * 0.75) / 2, width: 1194, height: 1194 * 0.75 }],
    ['a portrait tablet', { width: 834, height: 1194 }, { left: (834 - 1194 / 0.75) / 2, top: 0, width: 1194 / 0.75, height: 1194 }],
    ['a 4:3 screen', { width: 1024, height: 768 }, { left: 0, top: 0, width: 1024, height: 768 }],
  ])('%s: the short side fits, the long side spills evenly', (_name, screen, expected) => {
    const frame = coverFrame(screen);

    expect(frame.left).toBeCloseTo(expected.left);
    expect(frame.top).toBeCloseTo(expected.top);
    expect(frame.width).toBeCloseTo(expected.width);
    expect(frame.height).toBeCloseTo(expected.height);
  });

  it('takes another master aspect', () => {
    const frame = coverFrame({ width: 1000, height: 1000 }, 2);

    expect(frame.width).toBeCloseTo(2000);
    expect(frame.left).toBeCloseTo(-500);
    expect(frame.height).toBeCloseTo(1000);
  });

  it.each([
    [{ width: 0, height: 0 }],
    [{ width: Number.NaN, height: 402 }],
    [{ width: 874, height: -1 }],
  ])('an unmeasured screen %o gives an empty frame, never NaN', (screen) => {
    expect(coverFrame(screen)).toEqual({ left: 0, top: 0, width: 0, height: 0 });
  });

  it('the books` masters are 4:3', () => {
    expect(MASTER_ASPECT).toBeCloseTo(4 / 3);
  });
});

describe('patchFrame: a patch given in master coordinates lands on the master, not the screen', () => {
  const art = { left: 0, top: -125, width: 874, height: 655.5 };

  it('maps position and size through the master`s frame', () => {
    const patch = patchFrame({ position: { x: 0.28, y: 0.23 }, size: { width: 0.44, height: 0.37 } }, art);

    expect(patch.left).toBeCloseTo(0.28 * 874);
    expect(patch.top).toBeCloseTo(-125 + 0.23 * 655.5);
    expect(patch.width).toBeCloseTo(0.44 * 874);
    expect(patch.height).toBeCloseTo(0.37 * 655.5);
  });

  it('a frame that spills to the left, as on a portrait tablet, shifts the patch with it', () => {
    const wide = { left: -379, top: 0, width: 1592, height: 1194 };

    const patch = patchFrame({ position: { x: 0.5, y: 0.25 }, size: { width: 0.1, height: 0.1 } }, wide);

    expect(patch.left).toBeCloseTo(-379 + 0.5 * 1592);
    expect(patch.top).toBeCloseTo(0.25 * 1194);
    expect(patch.width).toBeCloseTo(159.2);
    expect(patch.height).toBeCloseTo(119.4);
  });

  it('a whole-master patch is the master`s frame itself', () => {
    expect(patchFrame({ position: { x: 0, y: 0 }, size: { width: 1, height: 1 } }, art)).toEqual(art);
  });

  it('a patch on the screen`s own frame is the old screen-fraction placement', () => {
    const patch = patchFrame({ position: { x: 0.5, y: 0.5 }, size: { width: 0.5, height: 0.5 } }, { left: 0, top: 0, width: 800, height: 400 });

    expect(patch).toEqual({ left: 400, top: 200, width: 400, height: 200 });
  });
});

describe('challengeFocus: the part of the master a scene challenge is played on', () => {
  const spot = (id: string, x: number, y: number, width: number, height: number) => ({ id, label: id, hotspot: { position: { x, y }, size: { width, height } } });
  const challenge = (items: unknown[], byAge: Record<string, { items: string[] }>) => ({ items, byAge } as unknown as LearningChallenge);

  it('has no focus without a challenge', () => {
    expect(challengeFocus(undefined)).toBeNull();
  });

  it('has no focus when no item is on the picture', () => {
    expect(challengeFocus(challenge([{ id: 'a', label: 'a', image: 'a.webp' }], { '2-4': { items: ['a'] } }))).toBeNull();
  });

  it('spans every spot shown in any age band', () => {
    const focus = challengeFocus(challenge(
      [spot('c', 0.1, 0.4, 0.05, 0.05), spot('b', 0.5, 0.7, 0.2, 0.15), spot('a', 0.3, 0.6, 0.1, 0.1)],
      { '2-4': { items: ['a', 'b'] }, '4-6': { items: ['c'] } },
    ));

    expect(focus).not.toBeNull();
    expect(focus!.left).toBeCloseTo(0.1);
    expect(focus!.top).toBeCloseTo(0.4);
    expect(focus!.right).toBeCloseTo(0.7);
    expect(focus!.bottom).toBeCloseTo(0.85);
  });

  it('leaves out a spot no age band shows', () => {
    const focus = challengeFocus(challenge([spot('a', 0.3, 0.3, 0.1, 0.1), spot('unused', 0.9, 0.9, 0.05, 0.05)], { '2-4': { items: ['a'] } }));

    expect(focus!.right).toBeCloseTo(0.4);
    expect(focus!.bottom).toBeCloseTo(0.4);
  });
});

describe('focusFrame: a cover fit moved just enough to keep a challenge`s spots in view', () => {
  const phone = { width: 874, height: 402 };
  const tallTablet = { width: 834, height: 1194 };
  const visible = (frame: ReturnType<typeof coverFrame>, focus: { top: number; bottom: number }, height: number) =>
    frame.top + focus.top * frame.height >= FOCUS_MARGIN - 1e-6 && frame.top + focus.bottom * frame.height <= height - FOCUS_MARGIN + 1e-6;

  it('is the centred cover fit when there is nothing to keep in view', () => {
    expect(focusFrame(phone, null)).toEqual(coverFrame(phone));
  });

  it('stays centred when the spots are already in view', () => {
    expect(focusFrame(phone, { left: 0.4, top: 0.4, right: 0.7, bottom: 0.67 })).toEqual(coverFrame(phone));
  });

  it('lifts the art just enough to show spots near the bottom', () => {
    const focus = { left: 0.33, top: 0.69, right: 0.71, bottom: 0.86 };
    const frame = focusFrame(phone, focus);

    expect(visible(frame, focus, phone.height)).toBe(true);
    expect(frame.top + focus.bottom * frame.height).toBeCloseTo(phone.height - FOCUS_MARGIN);
    expect(frame.width).toBeCloseTo(coverFrame(phone).width);
    expect(frame.height).toBeCloseTo(coverFrame(phone).height);
  });

  it('lowers the art just enough to show spots near the top', () => {
    const focus = { left: 0.2, top: 0.05, right: 0.4, bottom: 0.2 };
    const frame = focusFrame(phone, focus);

    expect(visible(frame, focus, phone.height)).toBe(true);
    expect(frame.top + focus.top * frame.height).toBeCloseTo(FOCUS_MARGIN);
  });

  it('never moves the art far enough to open a gap at an edge', () => {
    const frame = focusFrame(phone, { left: 0.4, top: 0.97, right: 0.5, bottom: 1 });

    expect(frame.top).toBeCloseTo(phone.height - frame.height);
    expect(focusFrame(phone, { left: 0.4, top: 0, right: 0.5, bottom: 0.02 }).top).toBeCloseTo(0);
  });

  it('centres on spots that are taller than the screen', () => {
    const focus = { left: 0.4, top: 0.1, right: 0.5, bottom: 0.9 };
    const frame = focusFrame(phone, focus);

    expect(frame.top + 0.5 * frame.height).toBeCloseTo(phone.height / 2);
  });

  it('moves sideways when the art spills left and right, as on a portrait tablet', () => {
    const focus = { left: 0.85, top: 0.4, right: 0.95, bottom: 0.5 };
    const frame = focusFrame(tallTablet, focus);

    expect(frame.left + focus.right * frame.width).toBeCloseTo(tallTablet.width - FOCUS_MARGIN);
    expect(frame.top).toBeCloseTo(0);
  });

  it('an unmeasured screen gives an empty frame', () => {
    expect(focusFrame({ width: 0, height: 0 }, { left: 0, top: 0.8, right: 1, bottom: 0.9 })).toEqual({ left: 0, top: 0, width: 0, height: 0 });
  });
});
