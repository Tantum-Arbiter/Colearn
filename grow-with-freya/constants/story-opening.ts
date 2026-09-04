export const STORY_OPENING = {
  settleMs: 260,
  veilInMs: 220,
  turnAllowanceMs: 300,
  veilOutMs: 320,
  reenterMs: 460,
  coverLiftMs: 480,
  holdMs: 140,
  growMs: 520,
  dissolveMs: 200,
  coverLiftDegrees: 160,
  reenterLift: 28,
  reenterScale: 0.94,
  pageShadeAtRest: 0.42,
  coverShadeWhenTurned: 0.4,
  seatWidthRatio: 0.46,
  coverFadeFrom: 0.6,
} as const;

export type OpeningStepName =
  | 'settle'
  | 'veilIn'
  | 'turn'
  | 'reenter'
  | 'coverLift'
  | 'hold'
  | 'grow'
  | 'dissolve';

export interface OpeningStep {
  name: OpeningStepName;
  at: number;
  duration: number;
}

export interface OpeningTimeline {
  steps: OpeningStep[];
  readerMountsAt: number;
  total: number;
}

export function storyOpeningTimeline(needsRotation: boolean): OpeningTimeline {
  const steps: OpeningStep[] = [];
  let at = 0;
  const add = (name: OpeningStepName, duration: number) => {
    steps.push({ name, at, duration });
    at += duration;
  };

  add('settle', STORY_OPENING.settleMs);
  if (needsRotation) {
    add('veilIn', STORY_OPENING.veilInMs);
    add('turn', STORY_OPENING.turnAllowanceMs);
    add('reenter', STORY_OPENING.reenterMs);
  }
  add('coverLift', STORY_OPENING.coverLiftMs);
  const readerMountsAt = at;
  add('hold', STORY_OPENING.holdMs);
  add('grow', STORY_OPENING.growMs);
  add('dissolve', STORY_OPENING.dissolveMs);

  return { steps, readerMountsAt, total: at };
}

/**
 * Where the book sits while its cover lifts: centred, at a width that leaves
 * the whole open spread -- flap and page -- inside the screen with a margin.
 */
export function openingSeat(
  screen: { width: number; height: number },
  card: { width: number; height: number }
): { x: number; y: number; width: number; height: number; scale: number } {
  const width = screen.width * STORY_OPENING.seatWidthRatio;
  const scale = width / card.width;
  const height = card.height * scale;

  return {
    x: screen.width / 2 - width / 2,
    y: screen.height / 2 - height / 2,
    width,
    height,
    scale,
  };
}

/**
 * Whether a story needs the "turn the screen together" ritual before it opens.
 *
 * Only phones do. A phone is locked to portrait everywhere outside the reader,
 * so its interface cannot follow the device and the pair have to be asked, then
 * the screen is turned for them behind the veil. Tablets are unlocked on both
 * iOS and Android -- a child turns them whenever they like and the interface
 * follows -- so a tablet is never asked and never has its orientation taken
 * away; the book simply opens whichever way the tablet is being held.
 */
export function needsGuidedTurn(device: {
  isTablet: boolean;
  width: number;
  height: number;
}): boolean {
  if (device.isTablet) {
    return false;
  }

  return device.width <= device.height;
}

/**
 * Whether the book's recorded placement still means anything.
 *
 * A placement is worked out against one screen: its offsets carry the card from
 * where it was tapped to the centre of that screen. Turn the phone and the same
 * offsets point somewhere else entirely, so the book must be seated outright
 * rather than glided from a position it never really occupied.
 */
export function placementIsStale(
  placedOn: { width: number; height: number } | null,
  screen: { width: number; height: number }
): boolean {
  if (!placedOn) {
    return true;
  }

  return placedOn.width !== screen.width || placedOn.height !== screen.height;
}

/**
 * The transform that carries the card from where it was tapped to the opening
 * seat on the given screen. Recomputed for every screen the book finds itself
 * on: a phone turned mid-prompt gets a fresh one for the landscape screen, so
 * the book is at the centre of both layouts iOS blends between and never seems
 * to move.
 */
export function seatTransform(
  screen: { width: number; height: number },
  card: { x: number; y: number; width: number; height: number }
): { moveX: number; moveY: number; scale: number; rect: { x: number; y: number; width: number; height: number } } {
  const seat = openingSeat(screen, card);

  return {
    moveX: screen.width / 2 - (card.x + card.width / 2),
    moveY: screen.height / 2 - (card.y + card.height / 2),
    scale: seat.scale,
    rect: { x: seat.x, y: seat.y, width: seat.width, height: seat.height },
  };
}

/**
 * Tile to detail: the book lifts from its tile into the hero while a plain
 * navy ground fades in beneath it and the catalogue falls away, and the
 * detail sheet rises to meet the book as it lands. One motion, not three.
 *
 * - liftMs      the book's flight from tile to hero, decelerating into place
 * - groundFadeMs the navy ground fading in over the catalogue
 * - sheetMountAt when the sheet mounts, part-way through the flight, so it is
 *                rising while the book is still moving
 * - heroFadeMs  the sheet's own hero fading in over the landed book -- the
 *                same art in the same place, so nothing visibly changes but
 *                the soft gradient beneath the title
 * - sheetRiseMs the sheet body rising into place
 * - staggerMs / contentMs   title, chips, description and buttons in turn
 */
export const STORY_DETAIL_OPENING = {
  liftMs: 620,
  groundFadeMs: 420,
  sheetMountAt: 300,
  heroFadeMs: 220,
  sheetRiseMs: 420,
  staggerMs: 60,
  contentMs: 320,
} as const;

/** How long the sheet's hero waits after mounting, so it fades over a landed book. */
export function heroFadeDelay(): number {
  return Math.max(0, STORY_DETAIL_OPENING.liftMs - STORY_DETAIL_OPENING.sheetMountAt);
}
