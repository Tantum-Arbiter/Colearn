import { DEFAULT_WEEK, GOAL_FOCUS, PLAN_GOALS, PLAN_UNITS, type PlanUnit } from '@/data/plan-units';
import { PLAN_STEPS_PER_WEEK } from '@/constants/learning-plan';
import type { LearningPlan, LearningPlanStep, PlanDomain, PlanGoal, PlanUnitId } from '@/types/learning-plan';

export const WEEK_ID = 'island-week';

const DOMAINS: readonly PlanDomain[] = ['language', 'feelings', 'music', 'maths'];
const DOMAIN_POINTS = 3;
const SKILL_POINTS = 2;

export function normaliseGoals(goals: readonly PlanGoal[]): PlanGoal[] {
  return [...new Set(goals.filter((goal) => (PLAN_GOALS as readonly string[]).includes(goal)))].slice(0, PLAN_GOALS.length);
}

function scoreOf(unit: PlanUnit, goals: readonly PlanGoal[]): number {
  return goals.reduce((total, goal, rank) => {
    const focus = GOAL_FOCUS[goal];
    const weight = goals.length - rank;
    const domain = focus.domain === unit.domain ? DOMAIN_POINTS : 0;
    const skills = unit.skills.filter((skill) => focus.skills.includes(skill)).length * SKILL_POINTS;
    return total + weight * (domain + skills);
  }, 0);
}

function chooseUnits(goals: readonly PlanGoal[]): PlanUnit[] {
  const ranked = PLAN_UNITS.map((unit) => ({ unit, score: scoreOf(unit, goals) })).sort((a, b) => b.score - a.score);
  const chosen: PlanUnit[] = [];
  const has = (id: PlanUnitId) => chosen.some((unit) => unit.id === id);
  const byId = (id: PlanUnitId) => PLAN_UNITS.find((unit) => unit.id === id);
  const missingBefore = (unit: PlanUnit) => (unit.after === undefined || has(unit.after) ? undefined : byId(unit.after));
  const take = (fits: (unit: PlanUnit) => boolean) => {
    const room = PLAN_STEPS_PER_WEEK - chosen.length;
    const next = ranked.find(({ unit }) => {
      if (has(unit.id) || !fits(unit)) return false;
      const before = missingBefore(unit);
      return before === undefined ? room >= 1 : before.after === undefined && room >= 2;
    });
    if (!next) return;
    const before = missingBefore(next.unit);
    if (before) chosen.push(before);
    chosen.push(next.unit);
  };

  take((unit) => unit.mode === 'read');
  DOMAINS.forEach((domain) => {
    if (!chosen.some((unit) => unit.domain === domain)) take((unit) => unit.domain === domain);
  });
  while (chosen.length < PLAN_STEPS_PER_WEEK) take(() => true);

  const first = chosen[0];
  const rest = chosen.slice(1).sort((a, b) => PLAN_UNITS.indexOf(a) - PLAN_UNITS.indexOf(b));

  return [first, ...rest];
}

function stepOf(unit: PlanUnit, index: number): LearningPlanStep {
  return {
    id: `day-${index + 1}`,
    day: index + 1,
    unitId: unit.id,
    kind: unit.kind,
    placeKey: unit.placeKey,
    domainKey: `plan.domains.${unit.domain}`,
    aimKey: `plan.units.${unit.aimKey}.aim`,
    skills: unit.skills,
    minutes: unit.minutes,
    ...(unit.storyId === undefined ? {} : { storyId: unit.storyId }),
    ...(unit.mode === undefined ? {} : { mode: unit.mode }),
    ...(unit.packId === undefined ? {} : { packId: unit.packId }),
    ...(unit.missionId === undefined ? {} : { missionId: unit.missionId }),
    ...(unit.titleKey === undefined ? {} : { titleKey: unit.titleKey }),
    ...(unit.picture === undefined ? {} : { picture: unit.picture }),
  };
}

export function buildWeek(goals: readonly PlanGoal[]): LearningPlan {
  const chosen = normaliseGoals(goals);
  const units = chosen.length === 0
    ? DEFAULT_WEEK.map((id) => PLAN_UNITS.find((unit) => unit.id === id) as PlanUnit)
    : chooseUnits(chosen);

  return { id: WEEK_ID, steps: units.map(stepOf) };
}
