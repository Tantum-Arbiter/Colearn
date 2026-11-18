import { useCallback, useEffect, useRef, useState } from 'react';
import { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSteadySharedValue } from '@/hooks/use-steady-shared-value';
import { isSpace, storyWords, wordText, type StoryWord } from './sound-words';

export const ROWS_PER_PAGE = 2;
export const FADE_OUT_MS = 300;
export const FADE_IN_MS = 400;

export interface PageWord {
  pieces: StoryWord;
  index: number;
}

export interface TextLine {
  words: PageWord[];
}

export interface TextPage {
  rows: PageWord[][];
  weight: number;
}

export type LineBreaks = number[][];

export function textLines(text: string): TextLine[] {
  let index = 0;
  return text.split('\n').map((line) => {
    const words = storyWords(line).map((pieces) => {
      if (isSpace(pieces)) return { pieces, index: -1 };
      const word = { pieces, index };
      index += 1;
      return word;
    });
    return { words };
  });
}

function trim(row: PageWord[]): PageWord[] {
  let start = 0;
  let end = row.length;
  while (start < end && isSpace(row[start].pieces)) start += 1;
  while (end > start && isSpace(row[end - 1].pieces)) end -= 1;
  return row.slice(start, end);
}

function weigh(rows: PageWord[][]): number {
  return rows.flat().reduce((sum, word) => sum + (isSpace(word.pieces) ? 0 : wordText(word.pieces).length), 0);
}

function rowsOf(line: TextLine, breaks: number[] | undefined): PageWord[][] {
  const cuts = [0, ...(breaks ?? []), line.words.length];
  return cuts.slice(0, -1).map((start, i) => trim(line.words.slice(start, cuts[i + 1]))).filter((row) => row.length > 0);
}

export function paginate(lines: readonly TextLine[], breaks?: LineBreaks | null): TextPage[] {
  const rows = lines.flatMap((line, i) => rowsOf(line, breaks?.[i]));
  const pages: TextPage[] = [];
  for (let start = 0; start < rows.length; start += ROWS_PER_PAGE) {
    const pair = rows.slice(start, start + ROWS_PER_PAGE);
    pages.push({ rows: pair, weight: weigh(pair) });
  }
  return pages;
}

export function pageAtFraction(pages: readonly TextPage[], fraction: number): number {
  if (pages.length === 0) return 0;
  const total = pages.reduce((sum, page) => sum + page.weight, 0);
  const reached = Math.max(0, fraction) * total;
  let end = 0;
  for (let i = 0; i < pages.length; i += 1) {
    end += pages[i].weight;
    if (reached < end) return i;
  }
  return pages.length - 1;
}

export function rowBreaks(lines: readonly TextLine[], tops: Readonly<Record<number, number>>): LineBreaks | null {
  const breaks: LineBreaks = [];
  for (const line of lines) {
    const cuts: number[] = [];
    let previous: number | null = null;
    for (let position = 0; position < line.words.length; position += 1) {
      const word = line.words[position];
      if (word.index < 0) continue;
      const top = tops[word.index];
      if (top === undefined) return null;
      if (previous !== null && top > previous + 1) cuts.push(position);
      previous = top;
    }
    breaks.push(cuts);
  }
  return breaks;
}

interface PagingOptions {
  pages: readonly TextPage[];
  resetKey: string;
  reduceMotion: boolean;
  voiceFraction: number | null;
}

export function useTextPaging({ pages, resetKey, reduceMotion, voiceFraction }: PagingOptions) {
  const [shown, setShown] = useState(0);
  const [seenKey, setSeenKey] = useState(resetKey);
  const [complete, setComplete] = useState(false);
  const opacity = useSteadySharedValue(1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const last = Math.max(0, pages.length - 1);

  if (seenKey !== resetKey) {
    setSeenKey(resetKey);
    setShown(0);
    setComplete(false);
  }
  const current = Math.min(shown, last);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    opacity.value = 1;
  }, [resetKey, opacity]);

  const goTo = useCallback(
    (target: number) => {
      if (timer.current) clearTimeout(timer.current);
      if (reduceMotion) {
        timer.current = null;
        opacity.value = 1;
        setShown(target);
        return;
      }
      opacity.value = withTiming(0, { duration: FADE_OUT_MS });
      timer.current = setTimeout(() => {
        timer.current = null;
        setShown(target);
        opacity.value = withTiming(1, { duration: FADE_IN_MS });
      }, FADE_OUT_MS);
    },
    [reduceMotion, opacity]
  );

  const next = useCallback(() => {
    if (current >= last) {
      setComplete(true);
      return false;
    }
    goTo(current + 1);
    return true;
  }, [current, last, goTo]);

  const previous = useCallback(() => {
    setComplete(false);
    if (current <= 0) return false;
    goTo(current - 1);
    return true;
  }, [current, goTo]);

  const voicePage = voiceFraction === null ? null : pageAtFraction(pages, voiceFraction);
  useEffect(() => {
    if (voicePage !== null && voicePage > current) goTo(voicePage);
  }, [voicePage, current, goTo]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const progress = complete ? 1 : pages.length === 0 ? 0 : current / pages.length;

  return { shown: current, next, previous, progress, style };
}
