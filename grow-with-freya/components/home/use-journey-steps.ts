import { useEffect, useMemo, useState } from 'react';
import { journeyStepsShown } from '@/constants/home-journey';
import { stepStates, type PlanStepState } from '@/constants/learning-plan';
import { ISLAND_WEEK } from '@/data/learning-plan';
import { useAppStore } from '@/store/app-store';
import type { ChildHomeJourneyStep } from '@/types/child-home';

export const JOURNEY_CLOCK_MS = 60_000;

const STATE_SEPARATOR = ',';

export function useJourneySteps(isActive: boolean): readonly ChildHomeJourneyStep[] {
  const progress = useAppStore((state) => state.learningPlanProgress);
  const [now, setNow] = useState(() => new Date());
  const [wasActive, setWasActive] = useState(isActive);

  if (wasActive !== isActive) {
    setWasActive(isActive);
    if (isActive) setNow(new Date());
  }

  useEffect(() => {
    if (!isActive) return undefined;
    const clock = setInterval(() => setNow(new Date()), JOURNEY_CLOCK_MS);

    return () => clearInterval(clock);
  }, [isActive]);

  const states = stepStates(ISLAND_WEEK, progress, now).join(STATE_SEPARATOR);

  return useMemo(() => {
    const each = states.split(STATE_SEPARATOR) as PlanStepState[];

    return journeyStepsShown(
      ISLAND_WEEK.steps.map((step, index) => ({ id: step.id, day: step.day, kind: step.kind, state: each[index] }))
    );
  }, [states]);
}
