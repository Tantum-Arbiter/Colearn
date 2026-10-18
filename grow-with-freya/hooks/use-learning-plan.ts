import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ISLAND_TRAIL, type TrailPoint } from '@/constants/island-trail';
import { launchFor, stepStates, type PlanStepState } from '@/constants/learning-plan';
import { buildWeek } from '@/services/plan-builder';
import { ALL_STORIES } from '@/data/stories';
import type { SupportedLanguage } from '@/services/i18n';
import { useAppStore } from '@/store/app-store';
import { getLocalizedText } from '@/types/story';
import type { LearningPlan, LearningPlanStep, PlanLaunch } from '@/types/learning-plan';

export const PLAN_CLOCK_MS = 60_000;

export interface PlanStepView {
  step: LearningPlanStep;
  state: PlanStepState;
  point: TrailPoint;
  title: string;
  picture: ImageSourcePropType | null;
  launch: PlanLaunch | null;
}

export interface LearningPlanView {
  plan: LearningPlan;
  steps: PlanStepView[];
  current: PlanStepView | null;
  doneCount: number;
  start: (view: PlanStepView) => PlanLaunch | null;
}

function pictureOf(source: unknown): ImageSourcePropType | null {
  if (source === undefined || source === null) return null;
  return typeof source === 'string' ? { uri: source } : (source as ImageSourcePropType);
}

export function useLearningPlan(isActive: boolean, trail: readonly TrailPoint[] = ISLAND_TRAIL): LearningPlanView {
  const { t, i18n } = useTranslation();
  const progress = useAppStore((state) => state.learningPlanProgress);
  const goals = useAppStore((state) => state.childGoals);
  const plan = useMemo(() => buildWeek(goals), [goals]);
  const beginPlanStep = useAppStore((state) => state.beginPlanStep);
  const [now, setNow] = useState(() => new Date());
  const [wasActive, setWasActive] = useState(isActive);

  if (wasActive !== isActive) {
    setWasActive(isActive);
    if (isActive) setNow(new Date());
  }

  useEffect(() => {
    if (!isActive) return undefined;
    const clock = setInterval(() => setNow(new Date()), PLAN_CLOCK_MS);

    return () => clearInterval(clock);
  }, [isActive]);

  const language = (i18n.language ?? 'en') as SupportedLanguage;

  const steps = useMemo<PlanStepView[]>(() => {
    const states = stepStates(plan, progress, now);

    return plan.steps.map((step, index) => {
      const story = step.kind === 'story' ? ALL_STORIES.find((candidate) => candidate.id === step.storyId) : undefined;

      const title = story
        ? getLocalizedText(story.localizedTitle, story.title, language)
        : step.kind === 'music'
          ? t('menu.practise')
          : t(step.titleKey ?? step.placeKey);

      return {
        step,
        state: states[index],
        point: trail[index],
        title,
        picture: step.picture ?? pictureOf(story?.coverImage),
        launch: launchFor(step),
      };
    });
  }, [language, now, plan, progress, t, trail]);

  const current = useMemo(
    () => steps.find((view) => view.state === 'open' || view.state === 'tomorrow') ?? null,
    [steps]
  );
  const doneCount = useMemo(() => steps.filter((view) => view.state === 'done').length, [steps]);

  const start = useCallback(
    (view: PlanStepView): PlanLaunch | null => {
      if ((view.state !== 'open' && view.state !== 'done') || !view.launch) return null;
      beginPlanStep({ planId: plan.id, stepId: view.step.id, launch: view.launch });

      return view.launch;
    },
    [beginPlanStep, plan.id]
  );

  return useMemo(
    () => ({ plan, steps, current, doneCount, start }),
    [plan, steps, current, doneCount, start]
  );
}
