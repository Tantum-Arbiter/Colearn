/**
 * The grown-ups gate opens its door only once the keyboard has gone: a page
 * slide that starts while the keyboard is still sliding away shares every
 * frame with it, and moved on every second frame into Grown-ups.
 */

import { Keyboard } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { KEYBOARD_GONE_WAIT_MS, afterKeyboardGone, useParentsOnlyChallenge } from '@/hooks/use-parents-only-challenge';

type Listener = (event?: { duration: number }) => void;

describe('afterKeyboardGone', () => {
  let listeners: Record<string, Listener>;
  let removed: jest.Mock;
  const hide = () => listeners.keyboardDidHide?.();

  beforeEach(() => {
    jest.useFakeTimers();
    listeners = {};
    removed = jest.fn();
    jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => undefined);
    jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, listener: Listener) => {
      listeners[event] = listener;
      return { remove: removed };
    }) as never);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('opens at once when no keyboard is up', () => {
    jest.spyOn(Keyboard, 'isVisible').mockReturnValue(false);
    const open = jest.fn();

    afterKeyboardGone(open);

    expect(open).toHaveBeenCalledTimes(1);
    expect(Keyboard.dismiss).not.toHaveBeenCalled();
  });

  it('sends the keyboard away and opens only once it has gone', () => {
    jest.spyOn(Keyboard, 'isVisible').mockReturnValue(true);
    const open = jest.fn();

    afterKeyboardGone(open);

    expect(Keyboard.dismiss).toHaveBeenCalledTimes(1);
    expect(open).not.toHaveBeenCalled();
    act(() => hide());
    expect(open).toHaveBeenCalledTimes(1);
    expect(removed).toHaveBeenCalledTimes(2);
  });

  // on the iPad the did-hide event never arrived: the door opens when the
  // keyboard's own hide animation ends, as it announced it would
  it('opens as the keyboard finishes the hide it announced, without waiting for the backstop', () => {
    jest.spyOn(Keyboard, 'isVisible').mockReturnValue(true);
    const open = jest.fn();

    afterKeyboardGone(open);
    act(() => listeners.keyboardWillHide?.({ duration: 250 }));
    act(() => {
      jest.advanceTimersByTime(249);
    });
    expect(open).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(open).toHaveBeenCalledTimes(1);
    act(() => {
      jest.advanceTimersByTime(KEYBOARD_GONE_WAIT_MS);
    });
    act(() => hide());
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('opens anyway if the keyboard never says it has gone, and only once', () => {
    jest.spyOn(Keyboard, 'isVisible').mockReturnValue(true);
    const open = jest.fn();

    afterKeyboardGone(open);
    act(() => {
      jest.advanceTimersByTime(KEYBOARD_GONE_WAIT_MS - 1);
    });
    expect(open).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(1);
    });
    act(() => hide());

    expect(open).toHaveBeenCalledTimes(1);
  });
});

describe('useParentsOnlyChallenge', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => undefined);
    jest.spyOn(Keyboard, 'addListener').mockImplementation((() => ({ remove: jest.fn() })) as never);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('closes the gate at once on a right answer, but waits for the keyboard before opening the door', () => {
    jest.spyOn(Keyboard, 'isVisible').mockReturnValue(true);
    const door = jest.fn();
    const { result } = renderHook(() => useParentsOnlyChallenge());

    act(() => result.current.showChallenge(door));
    act(() => result.current.setInputValue(String(result.current.challenge.answer)));
    act(() => result.current.handleSubmit());

    expect(result.current.isVisible).toBe(false);
    expect(door).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(KEYBOARD_GONE_WAIT_MS);
    });
    expect(door).toHaveBeenCalledTimes(1);
  });

  it('opens the door straight away when the answer was tapped on the keypad', () => {
    jest.spyOn(Keyboard, 'isVisible').mockReturnValue(false);
    const door = jest.fn();
    const { result } = renderHook(() => useParentsOnlyChallenge());

    act(() => result.current.showChallenge(door));
    act(() => result.current.setInputValue(String(result.current.challenge.answer)));
    act(() => result.current.handleSubmit());

    expect(door).toHaveBeenCalledTimes(1);
  });
});
