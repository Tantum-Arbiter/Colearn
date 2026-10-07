import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ISLAND_TRAIL, type TrailPoint } from '@/constants/island-trail';
import { activityFor, launchFor, stepStates, type PlanStepState } from '@/constants/learning-plan';
import { ISLAND_WEEK } from '@/data/learning-plan';
import { NUMBERS_ACTIVITIES, SPELLING_ACTIVITIES } from '@/data/learning-activities';
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
  const ageInMonths = useAppStore((state) => state.childAgeInMonths);
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
    const states = stepStates(ISLAND_WEEK, progress, now);

    return ISLAND_WEEK.steps.map((step, index) => {
      const story = step.kind === 'story' ? ALL_STORIES.find((candidate) => candidate.id === step.storyId) : undefined;
      const activityId = activityFor(step, ageInMonths);
      const game = [...SPELLING_ACTIVITIES, ...NUMBERS_ACTIVITIES].find((candidate) => candidate.id === activityId);

      const title = story
        ? getLocalizedText(story.localizedTitle, story.title, language)
        : game
          ? t(game.nameKey)
          : step.kind === 'feelings'
            ? t('emotions.title')
            : step.kind === 'music'
              ? t('menu.practise')
              : t(step.placeKey);

      return {
        step,
        state: states[index],
        point: trail[index],
        title,
        picture: pictureOf(story?.coverImage),
        launch: launchFor(step, ageInMonths),
      };
    });
  }, [ageInMonths, language, now, progress, t, trail]);

  const current = useMemo(
    () => steps.find((view) => view.state === 'open' || view.state === 'tomorrow') ?? null,
    [steps]
  );
  const doneCount = useMemo(() => steps.filter((view) => view.state === 'done').length, [steps]);

  const start = useCallback(
    (view: PlanStepView): PlanLaunch | null => {
      if ((view.state !== 'open' && view.state !== 'done') || !view.launch) return null;
      beginPlanStep({ planId: ISLAND_WEEK.id, stepId: view.step.id, launch: view.launch });

      return view.launch;
    },
    [beginPlanStep]
  );

  return useMemo(
    () => ({ plan: ISLAND_WEEK, steps, current, doneCount, start }),
    [steps, current, doneCount, start]
  );
}
