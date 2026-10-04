import { renderHook } from '@testing-library/react-native';
import { cancelAnimation, withRepeat, withTiming } from 'react-native-reanimated';
import { useIslandClocks } from '@/hooks/use-island-clocks';
import { ISLAND_LIFE } from '@/constants/island-life';

const CLOCKS = [
  ['wind', ISLAND_LIFE.windMs],
  ['tide', ISLAND_LIFE.tideMs],
  ['ripple', ISLAND_LIFE.rippleMs],
  ['sky', ISLAND_LIFE.skyMs],
  ['beat', ISLAND_LIFE.beatMs],
  ['fall', ISLAND_LIFE.fallMs],
  ['lamp', ISLAND_LIFE.lampMs],
] as const;

describe('useIslandClocks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (withTiming as jest.Mock).mockImplementation((to: number, config: { duration: number }) => ({ to, duration: config.duration }));
    (withRepeat as jest.Mock).mockImplementation((animation: object, times: number, reverse: boolean) => ({ animation, times, reverse }));
  });

  afterEach(() => {
    (withTiming as jest.Mock).mockImplementation((value: number, _config: unknown, callback?: (done: boolean) => void) => {
      if (typeof callback === 'function') callback(true);
      return value;
    });
    (withRepeat as jest.Mock).mockImplementation((value: number) => value);
  });

  it.each(CLOCKS)('turns the %s clock from nought to one for ever, once round in its own time, never running back', (name, ms) => {
    const { result } = renderHook(() => useIslandClocks(true));

    expect(result.current[name].value).toEqual({ animation: { to: 1, duration: ms }, times: -1, reverse: false });
  });

  it.each(CLOCKS)('leaves the %s clock at rest while the island is not alive', (name) => {
    const { result } = renderHook(() => useIslandClocks(false));

    expect(result.current[name].value).toBe(0);
    expect(withRepeat).not.toHaveBeenCalled();
  });

  it('stops every clock and puts it back to nought when the island stops', () => {
    const { result, rerender } = renderHook(({ alive }: { alive: boolean }) => useIslandClocks(alive), {
      initialProps: { alive: true },
    });
    const clocks = result.current;

    rerender({ alive: false });

    CLOCKS.forEach(([name]) => {
      expect(result.current[name].value).toBe(0);
      expect(cancelAnimation).toHaveBeenCalledWith(clocks[name]);
    });
  });

  it('starts them again when the island comes back', () => {
    const { result, rerender } = renderHook(({ alive }: { alive: boolean }) => useIslandClocks(alive), {
      initialProps: { alive: false },
    });

    rerender({ alive: true });

    expect(result.current.wind.value).toEqual({ animation: { to: 1, duration: ISLAND_LIFE.windMs }, times: -1, reverse: false });
  });

  it('keeps the same clocks from one draw to the next, so nothing reading them is left behind', () => {
    const { result, rerender } = renderHook(({ alive }: { alive: boolean }) => useIslandClocks(alive), {
      initialProps: { alive: true },
    });
    const first = result.current;

    rerender({ alive: true });

    CLOCKS.forEach(([name]) => expect(result.current[name]).toBe(first[name]));
    expect(withRepeat).toHaveBeenCalledTimes(CLOCKS.length);
  });

  it('stops every clock when the island goes away', () => {
    const { result, unmount } = renderHook(() => useIslandClocks(true));
    const clocks = result.current;
    (cancelAnimation as jest.Mock).mockClear();

    unmount();

    CLOCKS.forEach(([name]) => expect(cancelAnimation).toHaveBeenCalledWith(clocks[name]));
  });
});
