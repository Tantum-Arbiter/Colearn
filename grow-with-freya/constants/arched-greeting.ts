export const ARCHED_GREETING = {
  radius: 700,
  sidePadding: 24,
  subtitleChordRatio: 0.9,
  titleAscent: 0.78,
  titleDescent: 0.26,
  subtitleDescent: 0.3,
  lineGap: 12,
  /** From one title line to the next, as a share of the title's size. */
  titleLineHeight: 1.08,
  glowPadding: 10,
  glowBlur: 6,
  arcFill: 0.98,
  /** A title that would have to shrink below this share of its size breaks onto a second arc instead. */
  wrapBelow: 0.88,
  /** The smallest any greeting reaches with the name at its longest; a test holds every locale to it. */
  minScale: 0.6,
} as const;

export type GreetingWeight = 'heavy' | 'medium';

/**
 * Advances, in ems, of the printable ASCII characters (space to tilde) in the
 * rounded face at the greeting's two weights, measured from SF Pro Rounded:
 * the title at Heavy, and the subtitle at Bold, since react-native-svg on iOS
 * lays the subtitle's weight 500 out as wide as Bold, not Medium.
 * A flat half-em per letter under-counted the wide ones: "Welcome back,
 * wdwdsd!" was judged to fit and ran fifty points past the arc, which drops
 * whatever does not fit on it.
 */
const ADVANCES: Record<GreetingWeight, readonly number[]> = {
  heavy: [0.19,0.34,0.48,0.66,0.67,0.94,0.72,0.24,0.41,0.41,0.48,0.67,0.29,0.45,0.29,0.41,0.68,0.5,0.62,0.65,0.67,0.65,0.67,0.58,0.68,0.67,0.29,0.29,0.67,0.67,0.67,0.56,0.89,0.72,0.66,0.73,0.71,0.58,0.56,0.74,0.75,0.28,0.59,0.68,0.55,0.88,0.72,0.76,0.64,0.76,0.66,0.65,0.61,0.71,0.7,0.99,0.71,0.69,0.64,0.41,0.41,0.41,0.47,0.43,0.49,0.57,0.62,0.57,0.62,0.58,0.38,0.62,0.61,0.26,0.26,0.56,0.26,0.9,0.6,0.59,0.62,0.62,0.39,0.54,0.38,0.6,0.55,0.83,0.56,0.57,0.53,0.41,0.41,0.41,0.67],
  medium: [0.2,0.32,0.45,0.64,0.65,0.88,0.7,0.23,0.38,0.38,0.45,0.65,0.28,0.44,0.28,0.38,0.66,0.48,0.6,0.63,0.65,0.62,0.64,0.57,0.65,0.65,0.28,0.28,0.65,0.65,0.65,0.53,0.88,0.69,0.64,0.71,0.7,0.57,0.55,0.73,0.73,0.27,0.56,0.66,0.54,0.86,0.71,0.75,0.62,0.75,0.64,0.63,0.6,0.71,0.68,0.97,0.69,0.67,0.63,0.38,0.38,0.38,0.45,0.42,0.49,0.55,0.6,0.55,0.59,0.56,0.36,0.59,0.58,0.24,0.24,0.54,0.24,0.86,0.58,0.57,0.59,0.59,0.36,0.52,0.35,0.58,0.53,0.79,0.53,0.54,0.51,0.38,0.38,0.38,0.65],
};

/** Anything the table does not cover and is not a full-width glyph: counted generously. */
const FALLBACK_ADVANCE = 0.66;
const FULL_WIDTH = /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]/;

function advanceOf(char: string, table: readonly number[]): number {
  if (FULL_WIDTH.test(char)) return 1;
  const base = char.normalize('NFD').charCodeAt(0);
  return base >= 32 && base <= 126 ? table[base - 32] : FALLBACK_ADVANCE;
}

export function textAdvance(text: string, size: number, weight: GreetingWeight): number {
  const table = ADVANCES[weight];
  let ems = 0;
  for (const char of text) ems += advanceOf(char, table);
  return ems * size;
}

export function arcLength(radius: number, halfChord: number): number {
  return 2 * radius * Math.asin(Math.min(halfChord / radius, 1));
}

export function fitToArc(
  text: string,
  size: number,
  width: number,
  chordRatio: number = 1,
  weight: GreetingWeight = 'heavy'
): number {
  const halfChord = Math.max(width / 2 - ARCHED_GREETING.sidePadding, 1) * chordRatio;
  const room = arcLength(ARCHED_GREETING.radius, halfChord) * ARCHED_GREETING.arcFill;
  const needed = textAdvance(text, size, weight);
  if (needed <= room) {
    return size;
  }

  return Math.floor(size * (room / needed) * 100) / 100;
}

export interface GreetingTitlePlan {
  lines: string[];
  size: number;
}

/** Break after a space, or after a comma where a language writes none. */
function breakPoints(text: string): [string, string][] {
  const splits: [string, string][] = [];
  for (let i = 1; i < text.length - 1; i += 1) {
    if (text[i] === ' ') {
      splits.push([text.slice(0, i), text.slice(i + 1)]);
    } else if ('、，,'.includes(text[i]) && text[i + 1] !== ' ') {
      splits.push([text.slice(0, i + 1), text.slice(i + 1)]);
    }
  }
  return splits.filter(([head, tail]) => head.trim() && tail.trim());
}

/**
 * One arc while the title keeps close to its size there; otherwise two. Of
 * the splits, the one that keeps the type largest wins; among equals, the
 * break after a comma -- where the greeting ends and the name begins -- then
 * the one whose longer half is shortest. Either way it is set no larger than
 * its arcs can hold whole.
 */
export function planGreetingTitle(text: string, size: number, width: number): GreetingTitlePlan {
  const single = fitToArc(text, size, width);
  if (single >= size * ARCHED_GREETING.wrapBelow) {
    return { lines: [text], size: single };
  }

  let best: GreetingTitlePlan = { lines: [text], size: single };
  let bestRank: [number, number] = [0, Infinity];
  for (const [head, tail] of breakPoints(text)) {
    const fitted = Math.min(fitToArc(head, size, width), fitToArc(tail, size, width));
    const rank: [number, number] = [
      /[,、，]$/.test(head) ? 1 : 0,
      Math.max(textAdvance(head, size, 'heavy'), textAdvance(tail, size, 'heavy')),
    ];
    const better = fitted > best.size
      || (fitted === best.size && best.lines.length === 2
        && (rank[0] > bestRank[0] || (rank[0] === bestRank[0] && rank[1] < bestRank[1])));
    if (better) {
      best = { lines: [head, tail], size: fitted };
      bestRank = rank;
    }
  }
  return best;
}

export interface ArchedGreetingLayout {
  height: number;
  /** One arc per title line, top first, all about the same centre. */
  titlePaths: string[];
  /** The first title line's arc. */
  titlePath: string;
  subtitlePath: string;
  titleSag: number;
  subtitleSag: number;
}

function sagOf(radius: number, halfChord: number): number {
  return radius - Math.sqrt(Math.max(radius * radius - halfChord * halfChord, 0));
}

function arc(centreX: number, halfChord: number, endY: number, radius: number): string {
  return `M${centreX - halfChord} ${endY} A${radius} ${radius} 0 0 1 ${centreX + halfChord} ${endY}`;
}

export interface GreetingWords {
  title: number[];
  subtitle: number;
}

function dropAlong(runWidth: number, radius: number, halfChord: number): number {
  if (radius <= 0) return 0;
  const reach = Math.asin(Math.min(halfChord / radius, 1));
  const angle = Math.min(runWidth / 2 / radius, reach);
  return radius * (1 - Math.cos(angle));
}

export function archedGreetingLayout(
  width: number,
  titleSize: number,
  subtitleSize: number,
  titleLines: number = 1,
  words?: GreetingWords
): ArchedGreetingLayout {
  const centreX = width / 2;
  const halfChord = Math.max(width / 2 - ARCHED_GREETING.sidePadding, 1);
  const titleApex = ARCHED_GREETING.glowPadding + titleSize * ARCHED_GREETING.titleAscent;
  const titleSag = sagOf(ARCHED_GREETING.radius, halfChord);
  const lineDrop = titleSize * ARCHED_GREETING.titleLineHeight;

  // each further line hangs a line lower on a smaller arc about the same
  // centre, spanning the same width so it holds as much as the first
  const titlePaths = Array.from({ length: Math.max(titleLines, 1) }, (_, index) => {
    const radius = ARCHED_GREETING.radius - lineDrop * index;
    const apex = titleApex + lineDrop * index;
    return arc(centreX, halfChord, apex + sagOf(radius, halfChord), radius);
  });
  const lastDrop = lineDrop * (titlePaths.length - 1);

  const apexDrop = titleSize * ARCHED_GREETING.titleDescent + ARCHED_GREETING.lineGap + subtitleSize;
  const subtitleRadius = ARCHED_GREETING.radius - lastDrop - apexDrop;
  const subtitleHalfChord = halfChord * ARCHED_GREETING.subtitleChordRatio;
  const subtitleApex = titleApex + lastDrop + apexDrop;
  const subtitleSag = sagOf(subtitleRadius, subtitleHalfChord);
  const subtitleEnd = subtitleApex + subtitleSag;
  const arcHeight = Math.ceil(subtitleEnd + subtitleSize * ARCHED_GREETING.subtitleDescent + ARCHED_GREETING.glowPadding);

  const inkHeight = words
    ? Math.ceil(
        Math.max(
          ...titlePaths.map((_, index) => {
            const radius = ARCHED_GREETING.radius - lineDrop * index;
            return titleApex + lineDrop * index + dropAlong(words.title[index] ?? 0, radius, halfChord) + titleSize * ARCHED_GREETING.titleDescent;
          }),
          subtitleApex + dropAlong(words.subtitle, subtitleRadius, subtitleHalfChord) + subtitleSize * ARCHED_GREETING.subtitleDescent
        ) + ARCHED_GREETING.glowPadding
      )
    : arcHeight;

  return {
    height: Math.min(inkHeight, arcHeight),
    titlePaths,
    titlePath: titlePaths[0],
    subtitlePath: arc(centreX, subtitleHalfChord, subtitleEnd, subtitleRadius),
    titleSag,
    subtitleSag,
  };
}
