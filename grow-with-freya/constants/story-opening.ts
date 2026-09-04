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
