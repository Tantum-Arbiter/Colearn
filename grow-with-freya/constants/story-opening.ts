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
} as const;

/**
 * Which face of the cover is showing, as it swings open.
 *
 * Past a right angle the child is looking at the back of the cover rather than
 * its printed face, so the two swap. The back then stays: the opened cover
 * holds, and the book grows to fill the screen still wearing it. It used to
 * dissolve over the last stretch of the lift, which left the page alone on
 * screen before the grow had even started.
 */
export function coverFaceOpacity(progress: number): { front: number; back: number } {
  'worklet';
  const turned = Math.abs(progress * STORY_OPENING.coverLiftDegrees) >= 90;

  return { front: turned ? 0 : 1, back: turned ? 1 : 0 };
}

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
 * How far the open book grows before the reader arrives: until its left and
 * right edges meet the sides of the screen.
 *
 * It used to take the larger of the two ratios and grow until the book covered
 * the screen entirely, which meant cropping it -- the top and bottom of the
 * spread were pushed out of view while the child was still watching the book,
 * before the reader had dissolved in over it. The smaller ratio keeps the
 * whole spread on screen; on the portrait tablet the width is what binds, so
 * the book arrives spanning the view exactly as it should.
 */
export function openBookGrowScale(
  screen: { width: number; height: number },
  book: { width: number; height: number }
): number {
  'worklet';
  return Math.min(screen.width / book.width, screen.height / book.height);
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
 * Tile to card: the shelf falls into shadow while the story card rises from
 * the bottom of the screen with the tapped book on its cover, and the card's
 * title, meta and buttons follow in turn. Nothing flies; the card is the
 * whole event.
 *
 * - groundFadeMs the shadow settling over the shelf
 * - sheetRiseMs  the card rising into place
 * - staggerMs / contentMs   title, chips and buttons in turn
 */
export const STORY_DETAIL_OPENING = {
  groundFadeMs: 320,
  sheetRiseMs: 420,
  sheetSinkMs: 280,
  staggerMs: 60,
  contentMs: 320,
} as const;

/**
 * Card to book: choosing a way to read sinks the card, and the book is
 * sketched where it will open. Its outline is drawn as one line -- round the
 * cover and down the spine -- the cover appears inside it, and the drawn line
 * fades as the cover's own edges take over. Only then does the opening begin.
 *
 * - drawMs       the outline being drawn
 * - coverInMs    the cover appearing inside it
 * - strokeOutMs  the drawn line giving way to the cover's edge
 */
export const STORY_SKETCH = {
  /** The beat between the card clearing the screen and the first mark. */
  afterCardMs: 250,
  drawMs: 480,
  coverInMs: 300,
  strokeOutMs: 240,
  strokeWidth: 2,
  stroke: 'rgba(246, 239, 226, 0.92)',
  /**
   * The pace the line is drawn at: a pen, not a pendulum.
   *
   * An in-out cubic peaks at nearly three times its average pace, and over a
   * draw this short that put 39% of the whole outline down in one frame --
   * filmed, the line crawled, leapt across the top and right edges together,
   * then glided to a halt. This curve holds within 19% of its average the
   * whole way: it starts at four fifths of cruising pace rather than creeping
   * into motion, and settles at a third rather than stopping dead.
   */
  drawCurve: [0.2, 0.15, 0.75, 0.95] as readonly [number, number, number, number],
} as const;

export interface SketchPhase {
  readonly at: number;
  readonly over: number;
  readonly ends: number;
}

export interface SketchTimeline {
  readonly draw: SketchPhase;
  readonly cover: SketchPhase;
  readonly strokeOut: SketchPhase;
  readonly total: number;
}

function sketchPhase(at: number, over: number): SketchPhase {
  return { at, over, ends: at + over };
}

/**
 * The pen waits for the card to be gone and then a beat longer, so the first
 * mark lands on a clear, settled screen rather than over a sheet still on its
 * way out. The cover waits for the whole outline; the line fades once the
 * cover is half there, so the handover is invisible.
 */
export function storySketchTimeline(): SketchTimeline {
  const draw = sketchPhase(STORY_DETAIL_OPENING.sheetSinkMs + STORY_SKETCH.afterCardMs, STORY_SKETCH.drawMs);
  const cover = sketchPhase(draw.ends, STORY_SKETCH.coverInMs);
  const strokeOut = sketchPhase(cover.at + cover.over / 2, STORY_SKETCH.strokeOutMs);

  return { draw, cover, strokeOut, total: Math.max(cover.ends, strokeOut.ends) };
}

/**
 * How much of the sketched line is still hidden, as an SVG dash offset.
 *
 * The path is drawn by a dash the length of the whole line, slid into view.
 * The same answer serves the static prop the Path first renders with and the
 * animated one that follows: without the static one the browser's default
 * offset of zero showed the entire outline for the frame before the animation
 * landed, which read as the finished book flashing up and then being drawn.
 */
export function sketchDashOffset(length: number, progress: number): number {
  'worklet';
  return length * (1 - progress);
}

/**
 * The single line the book is sketched with, and its length -- the drawing is
 * a dash-offset sweep, so the dash pattern is built from the length.
 *
 * The spine is drawn first, upward, on an otherwise empty screen; the pen then
 * runs clockwise round the cover -- right along the top, down the fore-edge,
 * back along the bottom, up the left edge -- and closes exactly where the
 * spine began.
 *
 * The spine used to be the last stroke instead, which put the pen straight
 * back down a line one spine's width from the left edge it had just drawn,
 * travelling the opposite way. It read as the pen doubling back over itself.
 * Drawing it first separates the two by the whole loop, and gives the close a
 * point to land on.
 *
 * A spine narrower than the corner is moved out to where the top edge is
 * straight, so the line never closes inside a curve.
 */
export function bookOutlinePath(
  rect: { x: number; y: number; width: number; height: number },
  radius: number,
  spineWidth: number
): { d: string; length: number } {
  const { x: l, y: t, width: w, height: h } = rect;
  const r = l + w;
  const b = t + h;
  const rad = Math.min(radius, w / 2, h / 2);
  const spine = l + Math.max(rad, Math.min(spineWidth, w - rad));

  const d = [
    `M ${spine} ${b}`,
    `L ${spine} ${t}`,
    `L ${r - rad} ${t}`,
    `A ${rad} ${rad} 0 0 1 ${r} ${t + rad}`,
    `L ${r} ${b - rad}`,
    `A ${rad} ${rad} 0 0 1 ${r - rad} ${b}`,
    `L ${l + rad} ${b}`,
    `A ${rad} ${rad} 0 0 1 ${l} ${b - rad}`,
    `L ${l} ${t + rad}`,
    `A ${rad} ${rad} 0 0 1 ${l + rad} ${t}`,
    `L ${spine} ${t}`,
  ].join(' ');

  const length = 2 * (w - 2 * rad) + 2 * (h - 2 * rad) + 2 * Math.PI * rad + h;

  return { d, length };
}
