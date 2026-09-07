import { renderHook, act } from '@testing-library/react-native';
import type { RefObject } from 'react';
import type { View } from 'react-native';

import { useGuideTargets } from '@/components/owl-guide/use-guide-targets';
import { GUIDE_TIMING } from '@/constants/owl-guide';

function ref(x: number, y: number, width: number, height: number): RefObject<View | null> {
  return { current: { measureInWindow: (cb: (...args: number[]) => void) => cb(x, y, width, height) } as unknown as View };
}

async function settle() {
  await act(async () => {
    jest.advanceTimersByTime(GUIDE_TIMING.measureSettleMs);
  });
}

describe('useGuideTargets', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('measures every ref once the screen has settled', async () => {
    const refs = { a: ref(1, 2, 30, 40), b: ref(5, 6, 70, 80) };
    const { result } = renderHook(() => useGuideTargets(refs, true, 0, '402x874'));

    expect(result.current.ready).toBe(false);

    await settle();

    expect(result.current.ready).toBe(true);
    expect(result.current.rects).toEqual({
      a: { x: 1, y: 2, width: 30, height: 40 },
      b: { x: 5, y: 6, width: 70, height: 80 },
    });
  });

  it('leaves out refs that are empty or measure to nothing', async () => {
    const refs = {
      gone: { current: null } as RefObject<View | null>,
      flat: ref(1, 2, 0, 0),
      real: ref(3, 4, 10, 10),
    };
    const { result } = renderHook(() => useGuideTargets(refs, true, 0, '402x874'));

    await settle();

    expect(result.current.ready).toBe(true);
    expect(Object.keys(result.current.rects)).toEqual(['real']);
  });

  it('is ready with nothing to measure', async () => {
    const { result } = renderHook(() => useGuideTargets({}, true, 0, '402x874'));

    await settle();

    expect(result.current).toEqual({ ready: true, rects: {} });
  });

  it('measures nothing while inactive, and forgets what it knew', async () => {
    const refs = { a: ref(1, 2, 30, 40) };
    const { result, rerender } = renderHook(
      ({ active }: { active: boolean }) => useGuideTargets(refs, active, 0, '402x874'),
      { initialProps: { active: true } }
    );
    await settle();
    expect(result.current.ready).toBe(true);

    rerender({ active: false });

    expect(result.current).toEqual({ ready: false, rects: {} });
  });

  it('gives the screen time to finish turning before measuring again', async () => {
    let x = 10;
    const refs = { a: { current: { measureInWindow: (cb: (...args: number[]) => void) => cb(x, 0, 10, 10) } as unknown as View } };
    const { result, rerender } = renderHook(
      ({ frame }: { frame: string }) => useGuideTargets(refs, true, 0, frame),
      { initialProps: { frame: '402x874' } }
    );
    await settle();
    expect(result.current.rects.a.x).toBe(10);

    x = 20;
    rerender({ frame: '874x402' });
    await settle();
    expect(result.current.rects.a.x).toBe(10);

    await act(async () => {
      jest.advanceTimersByTime(GUIDE_TIMING.turnSettleMs - GUIDE_TIMING.measureSettleMs);
    });
    expect(result.current.rects.a.x).toBe(20);
  });

  it('measures again when the step or the screen size changes', async () => {
    let x = 10;
    const refs = { a: { current: { measureInWindow: (cb: (...args: number[]) => void) => cb(x, 0, 10, 10) } as unknown as View } };
    const { result, rerender } = renderHook(
      ({ step, frame }: { step: number; frame: string }) => useGuideTargets(refs, true, step, frame),
      { initialProps: { step: 0, frame: '402x874' } }
    );
    await settle();
    expect(result.current.rects.a.x).toBe(10);

    x = 20;
    rerender({ step: 1, frame: '402x874' });
    await settle();
    expect(result.current.rects.a.x).toBe(20);

    x = 30;
    rerender({ step: 1, frame: '874x402' });
    await act(async () => {
      jest.advanceTimersByTime(GUIDE_TIMING.turnSettleMs);
    });
    expect(result.current.rects.a.x).toBe(30);
  });
});
