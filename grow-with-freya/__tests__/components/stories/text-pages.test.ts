import { act, renderHook } from '@testing-library/react-native';
import { wordText } from '@/components/stories/sound-words';
import { FADE_IN_MS, FADE_OUT_MS, pageAtFraction, paginate, rowBreaks, textLines, useTextPaging, type TextPage } from '@/components/stories/text-pages';

jest.mock('@/hooks/use-steady-shared-value', () => ({
  useSteadySharedValue: (initial: number) => require('react').useState({ value: initial })[0],
}));

const rowText = (page: TextPage) => page.rows.map((row) => row.map((word) => wordText(word.pieces)).join(''));

describe('textLines', () => {
  it('numbers the words across the whole text, leaving spaces unnumbered', () => {
    const lines = textLines('A bee\n*Tap!* *Plonk!*');

    expect(lines.map((line) => line.words.map((word) => [wordText(word.pieces), word.index]))).toEqual([
      [['A', 0], [' ', -1], ['bee', 1]],
      [['Tap!', 2], [' ', -1], ['Plonk!', 3]],
    ]);
  });
});

describe('paginate', () => {
  const pages = (text: string) => paginate(textLines(text)).map(rowText);

  const cases: [string, string, string[][]][] = [
    ['four lines make two pages of two', 'A\nB\nC\nD', [['A', 'B'], ['C', 'D']]],
    ['a line of sound words pairs like any other', 'A\nB\n*Tap!* *Tippy-tap!* *Plonk!*\nD', [['A', 'B'], ['Tap! Tippy-tap! Plonk!', 'D']]],
    ['a sound line never breaks a pair', 'A\n*Tap!*\nB\nC\nD', [['A', 'Tap!'], ['B', 'C'], ['D']]],
    ['blank lines are skipped', 'A\n\nB', [['A', 'B']]],
    ['an odd line ends on its own', 'A\nB\nC', [['A', 'B'], ['C']]],
    ['one line is one page', 'Once upon a time...', [['Once upon a time...']]],
    ['no text is no pages', '', []],
  ];

  it.each(cases)('%s', (_name, text, expected) => {
    expect(pages(text)).toEqual(expected);
  });

  it('splits a long line where it wraps, trimming the spaces at each row`s edge', () => {
    const lines = textLines('one two three four five six seven');

    const result = paginate(lines, [[6, 12]]).map(rowText);

    expect(result).toEqual([['one two three', 'four five six'], ['seven']]);
  });

  it('pairs rows across lines once a line has wrapped', () => {
    const lines = textLines('one two three\nfour');

    expect(paginate(lines, [[4], []]).map(rowText)).toEqual([['one two', 'three'], ['four']]);
  });

  it('weighs each page by its letters', () => {
    expect(paginate(textLines('ab cd\nef\n*Tap!*')).map((page) => page.weight)).toEqual([6, 4]);
  });
});

describe('pageAtFraction', () => {
  const pages = paginate(textLines('aaaaaaaaaa\nbbbbbbbbbb\ncccc\ndddddddddddddddddddd'));
  const cases: [number, number][] = [
    [-1, 0],
    [0, 0],
    [0.2, 0],
    [20 / 44 - 0.001, 0],
    [20 / 44, 1],
    [0.5, 1],
    [1, 1],
    [1.5, 1],
  ];

  it('weighs the pages by their letters: 20 and 24 of 44', () => {
    expect(pages.map((page) => page.weight)).toEqual([20, 24]);
  });

  it.each(cases)('at %p of the reading shows page %p', (fraction, expected) => {
    expect(pageAtFraction(pages, fraction)).toBe(expected);
  });

  it('with no pages stays on the first', () => {
    expect(pageAtFraction([], 0.5)).toBe(0);
  });
});

describe('rowBreaks', () => {
  const lines = textLines('one two three four five six\n*Tap!*');

  it('starts a row wherever a word sits lower than the one before', () => {
    const tops = { 0: 0, 1: 0, 2: 0.4, 3: 22, 4: 22, 5: 44, 6: 0 };

    expect(rowBreaks(lines, tops)).toEqual([[6, 10], []]);
  });

  it('waits until every word has been measured', () => {
    expect(rowBreaks(lines, { 0: 0, 1: 0, 2: 0 })).toBeNull();
  });

  it('measures a sound line too, which can wrap like any other', () => {
    expect(rowBreaks(lines, { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })).toBeNull();
    expect(rowBreaks(lines, { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 })).toEqual([[], []]);
  });
});

describe('useTextPaging', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const three = paginate(textLines('A\nB\nC\nD\nE'));
  type Props = Parameters<typeof useTextPaging>[0];
  const base: Props = { pages: three, resetKey: 'page-1', reduceMotion: false, voiceFraction: null };

  function setup(props: Partial<Props> = {}) {
    return renderHook((current: Props) => useTextPaging(current), { initialProps: { ...base, ...props } });
  }

  it('starts on the first page', () => {
    expect(setup().result.current.shown).toBe(0);
  });

  it('next fades the old text out before the new text comes in', () => {
    const { result } = setup();
    let handled = false;

    act(() => {
      handled = result.current.next();
    });
    expect(handled).toBe(true);
    expect(result.current.shown).toBe(0);
    act(() => jest.advanceTimersByTime(FADE_OUT_MS));

    expect(result.current.shown).toBe(1);
  });

  it('next at the last page leaves the turn to the book', () => {
    const { result } = setup();
    act(() => { result.current.next(); });
    act(() => jest.advanceTimersByTime(FADE_OUT_MS));
    act(() => { result.current.next(); });
    act(() => jest.advanceTimersByTime(FADE_OUT_MS));
    let handled = true;

    act(() => {
      handled = result.current.next();
    });

    expect(result.current.shown).toBe(2);
    expect(handled).toBe(false);
  });

  it('previous steps back, and at the first page leaves the turn to the book', () => {
    const { result } = setup();
    act(() => { result.current.next(); });
    act(() => jest.advanceTimersByTime(FADE_OUT_MS));
    let first = false;
    let second = true;

    act(() => {
      first = result.current.previous();
    });
    act(() => jest.advanceTimersByTime(FADE_OUT_MS));
    act(() => {
      second = result.current.previous();
    });

    expect([first, second, result.current.shown]).toEqual([true, false, 0]);
  });

  it('under Reduce Motion changes at once', () => {
    const { result } = setup({ reduceMotion: true });

    act(() => { result.current.next(); });

    expect(result.current.shown).toBe(1);
  });

  it('fades slowly enough to see: out over at least 300 ms, back in over a little longer', () => {
    expect(FADE_OUT_MS).toBeGreaterThanOrEqual(300);
    expect(FADE_IN_MS).toBeGreaterThan(FADE_OUT_MS);
    expect(FADE_OUT_MS + FADE_IN_MS).toBeLessThanOrEqual(800);
  });

  it('next fades the old lines out over FADE_OUT_MS and the new ones in over FADE_IN_MS', () => {
    const reanimated = jest.requireMock('react-native-reanimated');
    const { result } = setup();
    reanimated.withTiming.mockClear();

    act(() => { result.current.next(); });
    act(() => jest.advanceTimersByTime(FADE_OUT_MS));

    expect(reanimated.withTiming.mock.calls.map((call: unknown[]) => [call[0], (call[1] as { duration: number }).duration])).toEqual([[0, FADE_OUT_MS], [1, FADE_IN_MS]]);
  });

  it('a new page of the book starts at its first lines', () => {
    const { result, rerender } = setup();
    act(() => { result.current.next(); });
    act(() => jest.advanceTimersByTime(FADE_OUT_MS));

    rerender({ ...base, resetKey: 'page-2' });

    expect(result.current.shown).toBe(0);
  });

  it('fewer pages after measuring never leave it past the end', () => {
    const { result, rerender } = setup({ reduceMotion: true });
    act(() => { result.current.next(); });
    act(() => { result.current.next(); });

    rerender({ ...base, reduceMotion: true, pages: three.slice(0, 1) });

    expect(result.current.shown).toBe(0);
  });

  it('follows the voice forward as it reads', () => {
    const { result, rerender } = setup();

    rerender({ ...base, voiceFraction: 0.9 });
    act(() => jest.advanceTimersByTime(FADE_OUT_MS));

    expect(result.current.shown).toBe(2);
  });

  it('never pulls the reader back to where the voice is', () => {
    const { result, rerender } = setup({ reduceMotion: true });
    act(() => { result.current.next(); });
    act(() => { result.current.next(); });

    rerender({ ...base, reduceMotion: true, voiceFraction: 0.1 });

    expect(result.current.shown).toBe(2);
  });

  it('starts empty, moves only when next is pressed, and completes on the press that leaves the last lines', () => {
    const { result } = setup({ reduceMotion: true });
    const seen = [result.current.progress];
    act(() => { result.current.next(); });
    seen.push(result.current.progress);
    act(() => { result.current.next(); });
    seen.push(result.current.progress);
    act(() => { result.current.next(); });
    seen.push(result.current.progress);

    expect(seen).toEqual([0, 1 / 3, 2 / 3, 1]);
  });

  it('a page with one set of lines starts empty and completes on the first press', () => {
    const { result } = setup({ pages: paginate(textLines('Once upon a time...')) });
    expect(result.current.progress).toBe(0);
    let handled = true;

    act(() => {
      handled = result.current.next();
    });

    expect([handled, result.current.progress]).toEqual([false, 1]);
  });

  it('back undoes a completed ring', () => {
    const { result } = setup({ pages: paginate(textLines('Once upon a time...')) });
    act(() => { result.current.next(); });

    act(() => { result.current.previous(); });

    expect(result.current.progress).toBe(0);
  });

  it('a new page starts empty again', () => {
    const { result, rerender } = setup({ pages: paginate(textLines('Once upon a time...')) });
    act(() => { result.current.next(); });

    rerender({ ...base, pages: paginate(textLines('Once upon a time...')), resetKey: 'page-2' });

    expect(result.current.progress).toBe(0);
  });
});
