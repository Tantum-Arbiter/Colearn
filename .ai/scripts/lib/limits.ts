import { safeDisplay } from './text.ts';

export interface UsageLimit {
  resetAt: Date | null;
  message: string;
}

const LIMIT_PATTERNS: readonly RegExp[] = [
  /you(?:'|’)?ve hit your (?:[\w-]+ )?(?:usage )?limit/i,
  /\b(?:weekly|daily|session|monthly|5-hour|usage) limit (?:reached|exceeded)\b/i,
  /\busage_limit_reached\b/,
  /\bworkspace_(?:owner|member)_usage_limit_reached\b/,
];

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const WALL_CLOCK_RESET =
  /\b(?:resets|try again at)\s+(?:on\s+|at\s+)?(?:([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(?:(\d{4})\s*)?(?:at\s+)?)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b(?:\s*\(([A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)*)\))?/i;

const RELATIVE_RESET =
  /\btry again in\s+((?:\d+\s*(?:days?|hours?|hrs?|minutes?|mins?|seconds?|secs?)\b[\s,]*(?:and\s+)?)+)/i;

const UNIT_MS: Record<string, number> = {
  day: 86_400_000,
  hour: 3_600_000,
  hr: 3_600_000,
  minute: 60_000,
  min: 60_000,
  second: 1000,
  sec: 1000,
};

const DAY_MS = 86_400_000;

function validTimeZone(zone: string | undefined): string | null {
  if (zone === undefined) {
    return null;
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return zone;
  } catch {
    return null;
  }
}

interface WallParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function wallPartsAt(instant: number, zone: string | null): WallParts {
  if (zone === null) {
    const d = new Date(instant);
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      day: d.getDate(),
      hour: d.getHours(),
      minute: d.getMinutes(),
      second: d.getSeconds(),
    };
  }
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instant));
  const get = (type: Intl.DateTimeFormatPartTypes): number => Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get('year'),
    month: get('month') - 1,
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

function offsetMs(instant: number, zone: string): number {
  const w = wallPartsAt(instant, zone);
  return Date.UTC(w.year, w.month, w.day, w.hour, w.minute, w.second) - Math.floor(instant / 1000) * 1000;
}

export function wallTimeToInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  zone: string | null,
): number {
  if (zone === null) {
    return new Date(year, month, day, hour, minute).getTime();
  }
  const guess = Date.UTC(year, month, day, hour, minute);
  const first = guess - offsetMs(guess, zone);
  return guess - offsetMs(first, zone);
}

function parseWallClockReset(match: RegExpMatchArray, now: Date): Date | null {
  const [, monthToken, dayToken, yearToken, hourToken, minuteToken, meridiem, zoneToken] = match;
  const zone = validTimeZone(zoneToken);
  const hour12 = Number(hourToken);
  if (hour12 < 1 || hour12 > 12) {
    return null;
  }
  const minute = minuteToken === undefined ? 0 : Number(minuteToken);
  if (minute > 59) {
    return null;
  }
  const hour = (hour12 % 12) + ((meridiem ?? '').toLowerCase() === 'pm' ? 12 : 0);
  const today = wallPartsAt(now.getTime(), zone);

  if (monthToken !== undefined && dayToken !== undefined) {
    const month = MONTHS.indexOf(monthToken.toLowerCase());
    const day = Number(dayToken);
    if (month < 0 || day < 1 || day > 31) {
      return null;
    }
    if (yearToken !== undefined) {
      return new Date(wallTimeToInstant(Number(yearToken), month, day, hour, minute, zone));
    }
    let instant = wallTimeToInstant(today.year, month, day, hour, minute, zone);
    if (instant < now.getTime() - DAY_MS) {
      instant = wallTimeToInstant(today.year + 1, month, day, hour, minute, zone);
    }
    return new Date(instant);
  }

  let instant = wallTimeToInstant(today.year, today.month, today.day, hour, minute, zone);
  if (instant <= now.getTime()) {
    instant = wallTimeToInstant(today.year, today.month, today.day + 1, hour, minute, zone);
  }
  return new Date(instant);
}

function parseRelativeReset(spec: string, now: Date): Date | null {
  let total = 0;
  for (const part of spec.matchAll(/(\d+)\s*([a-z]+)/gi)) {
    const unit = (part[2] ?? '').toLowerCase().replace(/s$/, '');
    const size = UNIT_MS[unit];
    if (size === undefined) {
      return null;
    }
    total += Number(part[1]) * size;
  }
  return total > 0 ? new Date(now.getTime() + total) : null;
}

export function detectUsageLimit(text: string, now: Date): UsageLimit | null {
  const hit = LIMIT_PATTERNS.map((pattern) => text.match(pattern)).find((m) => m !== null);
  if (hit === undefined || hit === null) {
    return null;
  }
  const start = hit.index ?? 0;
  const ends = ['\n', '"'].map((stop) => text.indexOf(stop, start)).filter((index) => index !== -1);
  const message = safeDisplay(text.slice(start, ends.length > 0 ? Math.min(...ends) : undefined), 300);

  const wall = text.match(WALL_CLOCK_RESET);
  if (wall !== null) {
    const resetAt = parseWallClockReset(wall, now);
    if (resetAt !== null) {
      return { resetAt, message };
    }
  }
  const relative = text.match(RELATIVE_RESET);
  if (relative !== null) {
    return { resetAt: parseRelativeReset(relative[1] ?? '', now), message };
  }
  return { resetAt: null, message };
}
