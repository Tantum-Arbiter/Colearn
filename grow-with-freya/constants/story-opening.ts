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
