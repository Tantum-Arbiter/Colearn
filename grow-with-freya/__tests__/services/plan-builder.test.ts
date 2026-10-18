import { PLAN_GOALS, PLAN_UNITS } from '@/data/plan-units';
import { buildWeek } from '@/services/plan-builder';
import type { PlanGoal, PlanUnitId } from '@/types/learning-plan';

const unitsOf = (goals: readonly PlanGoal[]) => buildWeek(goals).steps.map((step) => step.unitId);
const unit = (id: PlanUnitId) => PLAN_UNITS.find((candidate) => candidate.id === id)!;

const CHOICES: readonly (readonly PlanGoal[])[] = [
  [],
  ...PLAN_GOALS.map((goal) => [goal] as const),
  ...PLAN_GOALS.flatMap((first) => PLAN_GOALS.filter((second) => second !== first).map((second) => [first, second] as const)),
  [...PLAN_GOALS],
  [PLAN_GOALS[2], PLAN_GOALS[1], PLAN_GOALS[0]],
];
const EVERY_CHOICE = CHOICES.map((goals) => [goals] as const);

describe('buildWeek', () => {
  it('is the island week the app has always had when no goals are chosen', () => {
    const week = buildWeek([]);

    expect(week.id).toBe('island-week');
    expect(unitsOf([])).toEqual(['wombat-read', 'wombat-record', 'wombat-picnic', 'juni-record', 'music-practise', 'juni-read', 'ding-read']);
    expect(week.steps.map((step) => step.id)).toEqual(['day-1', 'day-2', 'day-3', 'day-4', 'day-5', 'day-6', 'day-7']);
    expect(week.steps.map((step) => step.placeKey)).toEqual([
      'plan.places.storyTime',
      'plan.places.storyNook',
      'plan.places.wombatBurrow',
      'plan.places.rockPool',
      'plan.places.musicGrove',
      'plan.places.storyCorner',
      'plan.places.storyBridge',
    ]);
    expect(week.steps.map((step) => step.mode)).toEqual(['read', 'record', undefined, 'record', undefined, 'read', 'read']);
    expect(week.steps[2]).toMatchObject({ kind: 'game', packId: 'wombat-picnic', missionId: 'picnic', titleKey: 'packs.wombatPicnic.missions.picnic.title' });
  });

  it('gives a family who want stories the whole wombat: read, recorded, counted with and listened to, then the bus', () => {
    expect(unitsOf(['cosyStories'])).toEqual(['wombat-read', 'wombat-record', 'wombat-picnic', 'wombat-listen', 'music-practise', 'juni-read', 'ding-read']);
  });

  it('gives a family who want to talk about feelings all of Juni, starting with her book', () => {
    expect(unitsOf(['bigFeelings'])).toEqual(['juni-read', 'wombat-read', 'wombat-record', 'wombat-picnic', 'juni-record', 'music-practise', 'juni-listen']);
  });

  it('listens to the first goal before the second', () => {
    expect(unitsOf(['bigFeelings', 'cosyStories'])).not.toEqual(unitsOf(['cosyStories', 'bigFeelings']));
    expect(unitsOf(['cosyStories', 'bigFeelings'])).toEqual(['wombat-read', 'wombat-record', 'wombat-picnic', 'wombat-listen', 'music-practise', 'juni-read', 'ding-record']);
  });

  it.each(EVERY_CHOICE)('counts with the wombat only after his book has been read, for goals %j', (goals) => {
    const units = unitsOf(goals);

    expect(units).toContain('wombat-picnic');
    expect(units.indexOf('wombat-read')).toBeLessThan(units.indexOf('wombat-picnic'));
  });

  it('pulls the wombat`s book in for a family whose goals would not have chosen it', () => {
    const units = unitsOf(['bigFeelings']);

    expect(units.indexOf('wombat-read')).toBeGreaterThanOrEqual(0);
    expect(units).toHaveLength(7);
  });

  it.each(EVERY_CHOICE)('fills seven different days for goals %j', (goals) => {
    const units = unitsOf(goals);

    expect(units).toHaveLength(7);
    expect(new Set(units).size).toBe(7);
    expect(buildWeek(goals).steps.map((step) => step.day)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it.each(EVERY_CHOICE)('opens with a book read together for goals %j', (goals) => {
    const first = buildWeek(goals).steps[0];

    expect(first.kind).toBe('story');
    expect(first.mode).toBe('read');
  });

  it.each(EVERY_CHOICE)('puts every day after the one it must follow, for goals %j', (goals) => {
    const units = unitsOf(goals);

    units.forEach((id, index) => {
      const after = unit(id).after;
      if (after) expect(units.indexOf(after)).toBeLessThan(index);
    });
  });

  it.each(EVERY_CHOICE)('touches language, feelings, music and maths for goals %j', (goals) => {
    const domains = new Set(buildWeek(goals).steps.map((step) => step.domainKey));

    expect(domains).toEqual(new Set(['plan.domains.language', 'plan.domains.feelings', 'plan.domains.music', 'plan.domains.maths']));
  });

  it.each(EVERY_CHOICE)('gives the same week twice for goals %j', (goals) => {
    expect(buildWeek(goals)).toEqual(buildWeek([...goals]));
  });

  it('ignores a goal it does not know, and a goal named twice', () => {
    expect(unitsOf(['bigFeelings', 'bigFeelings'])).toEqual(unitsOf(['bigFeelings']));
    expect(unitsOf(['nothing-of-the-sort' as PlanGoal])).toEqual(unitsOf([]));
    expect(unitsOf(['nothing-of-the-sort' as PlanGoal, 'cosyStories'])).toEqual(unitsOf(['cosyStories']));
  });

  it('keeps the day ids the island and the home card key progress by, whatever the goals', () => {
    CHOICES.forEach((goals) => {
      expect(buildWeek(goals).id).toBe('island-week');
      expect(buildWeek(goals).steps.map((step) => step.id)).toEqual(['day-1', 'day-2', 'day-3', 'day-4', 'day-5', 'day-6', 'day-7']);
    });
  });

  it('carries each unit`s place, aim, skills and time onto its day', () => {
    buildWeek(['bigFeelings']).steps.forEach((step) => {
      const source = unit(step.unitId);

      expect(step.placeKey).toBe(source.placeKey);
      expect(step.aimKey).toBe(`plan.units.${source.aimKey}.aim`);
      expect(step.skills).toEqual(source.skills);
      expect(step.minutes).toEqual(source.minutes);
      expect(step.storyId).toBe(source.storyId);
      expect(step.mode).toBe(source.mode);
      expect(step.kind).toBe(source.kind);
      expect(step.packId).toBe(source.packId);
      expect(step.missionId).toBe(source.missionId);
      expect(step.titleKey).toBe(source.titleKey);
      expect(step.picture).toBe(source.picture);
    });
  });
});

describe('the units a day can be', () => {
  it('are every book read, recorded and listened to, the wombat`s picnic and the music practise, in the order the island tells them', () => {
    expect(PLAN_UNITS.map((candidate) => candidate.id)).toEqual([
      'wombat-read', 'wombat-record', 'wombat-picnic', 'wombat-listen',
      'juni-record', 'music-practise', 'juni-read', 'juni-listen',
      'ding-read', 'ding-record', 'ding-listen',
    ]);
  });

  it('each listen unit follows its recording, and the picnic follows the wombat`s book', () => {
    expect(unit('wombat-listen').after).toBe('wombat-record');
    expect(unit('juni-listen').after).toBe('juni-record');
    expect(unit('ding-listen').after).toBe('ding-record');
    expect(unit('wombat-picnic').after).toBe('wombat-read');
    PLAN_UNITS.filter((candidate) => candidate.mode !== 'narrate' && candidate.kind !== 'game').forEach((candidate) => expect(candidate.after).toBeUndefined());
  });

  it('a game unit names its pack, mission, title and picture; a book unit none of them', () => {
    expect(unit('wombat-picnic')).toMatchObject({ kind: 'game', packId: 'wombat-picnic', missionId: 'picnic', domain: 'maths', skills: ['counting', 'numbers'] });
    expect(unit('wombat-picnic').titleKey).toBe('packs.wombatPicnic.missions.picnic.title');
    expect(unit('wombat-picnic').picture).toBeDefined();
    PLAN_UNITS.filter((candidate) => candidate.kind !== 'game').forEach((candidate) => {
      expect(candidate.packId).toBeUndefined();
      expect(candidate.missionId).toBeUndefined();
      expect(candidate.titleKey).toBeUndefined();
      expect(candidate.picture).toBeUndefined();
    });
  });

  it('has a place and two skills for every unit, and a book for every unit but the practise', () => {
    PLAN_UNITS.forEach((candidate) => {
      expect(candidate.placeKey.startsWith('plan.places.')).toBe(true);
      expect(candidate.skills).toHaveLength(2);
      expect(new Set(candidate.skills).size).toBe(2);
      expect(candidate.minutes[1]).toBeGreaterThan(candidate.minutes[0]);
      expect(candidate.kind === 'music' ? candidate.storyId : typeof candidate.storyId).toBe(candidate.kind === 'music' ? undefined : 'string');
    });
  });
});
