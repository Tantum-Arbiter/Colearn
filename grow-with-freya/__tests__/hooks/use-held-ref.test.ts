/**
 * Two layers of one page can hold the same element for a moment -- the
 * library keeps the section it is leaving on screen while the next fades in,
 * and both carry the page's scroll view and its Home button. The ref has to
 * keep the newest one: a plain ref was cleared when the old layer went, and
 * the owl lost the Home button and the page it scrolls.
 */

import { createRef } from 'react';
import { renderHook } from '@testing-library/react-native';
import { useHeldRef } from '@/hooks/use-held-ref';

type Node = { name: string };

function heldBy() {
  const target = createRef<Node>();
  const { result } = renderHook(() => useHeldRef(target));
  return { target, attach: result.current };
}

describe('useHeldRef', () => {
  it('holds the element it is attached to', () => {
    const { target, attach } = heldBy();

    attach({ name: 'home' });

    expect(target.current).toEqual({ name: 'home' });
  });

  it('keeps the newer element when the one it replaced goes away', () => {
    const { target, attach } = heldBy();
    const leaving = { name: 'leaving' };
    const entering = { name: 'entering' };

    const release = attach(leaving);
    attach(entering);
    release?.();

    expect(target.current).toBe(entering);
  });

  it('lets go once the element it holds goes away', () => {
    const { target, attach } = heldBy();
    const only = { name: 'only' };

    const release = attach(only);
    release?.();

    expect(target.current).toBeNull();
  });

  it('hands the page the same attacher across renders, so nothing is detached and attached again', () => {
    const target = createRef<Node>();
    const { result, rerender } = renderHook(() => useHeldRef(target));
    const first = result.current;

    rerender({});

    expect(result.current).toBe(first);
  });
});
