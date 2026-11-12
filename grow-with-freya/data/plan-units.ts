import type { ImageSourcePropType } from 'react-native';
import type { ReadingMode } from '@/contexts/story-transition-context';
import type { PlanDomain, PlanGoal, PlanSkill, PlanStepKind, PlanUnitId } from '@/types/learning-plan';

export const MUSIC_PRACTISE_ACTIVITY = 'music-practise';

export interface PlanUnit {
  id: PlanUnitId;
  kind: PlanStepKind;
  storyId?: string;
  mode?: ReadingMode;
  packId?: string;
  missionId?: string;
  titleKey?: string;
  picture?: ImageSourcePropType;
  domain: PlanDomain;
  placeKey: string;
  aimKey: string;
  skills: readonly [PlanSkill, PlanSkill];
  minutes: readonly [number, number];
  after?: PlanUnitId;
}

export const PLAN_GOALS = ['cosyStories', 'bigFeelings', 'makeMusic'] as const satisfies readonly PlanGoal[];

export const GOAL_FOCUS: Record<PlanGoal, { domain: PlanDomain; skills: readonly PlanSkill[] }> = {
  cosyStories: { domain: 'language', skills: ['listening', 'vocabulary'] },
  bigFeelings: { domain: 'feelings', skills: ['feelings', 'confidence'] },
  makeMusic: { domain: 'music', skills: ['rhythm', 'listening'] },
};

export const PLAN_UNITS: readonly PlanUnit[] = [
  {
    id: 'wombat-read',
    kind: 'story',
    storyId: 'snuggle-little-wombat',
    mode: 'read',
    domain: 'language',
    placeKey: 'plan.places.storyTime',
    aimKey: 'wombatRead',
    skills: ['listening', 'vocabulary'],
    minutes: [5, 7],
  },
  {
    id: 'wombat-record',
    kind: 'story',
    storyId: 'snuggle-little-wombat',
    mode: 'record',
    domain: 'language',
    placeKey: 'plan.places.storyNook',
    aimKey: 'wombatRecord',
    skills: ['confidence', 'listening'],
    minutes: [5, 8],
  },
  {
    id: 'wombat-picnic',
    kind: 'game',
    storyId: 'snuggle-little-wombat',
    packId: 'wombat-picnic',
    missionId: 'picnic',
    titleKey: 'packs.wombatPicnic.missions.picnic.title',
    picture: require('@/assets/packs/wombat-picnic/cover.webp'),
    domain: 'maths',
    placeKey: 'plan.places.wombatBurrow',
    aimKey: 'wombatPicnic',
    skills: ['counting', 'numbers'],
    minutes: [4, 7],
    after: 'wombat-read',
  },
  {
    id: 'wombat-listen',
    kind: 'story',
    storyId: 'snuggle-little-wombat',
    mode: 'narrate',
    domain: 'language',
    placeKey: 'plan.places.echoGlade',
    aimKey: 'wombatListen',
    skills: ['listening', 'vocabulary'],
    minutes: [5, 7],
    after: 'wombat-record',
  },
  {
    id: 'juni-record',
    kind: 'story',
    storyId: 'hold-on-juni',
    mode: 'record',
    domain: 'feelings',
    placeKey: 'plan.places.rockPool',
    aimKey: 'juniRecord',
    skills: ['confidence', 'feelings'],
    minutes: [5, 8],
  },
  {
    id: 'music-practise',
    kind: 'music',
    domain: 'music',
    placeKey: 'plan.places.musicGrove',
    aimKey: 'musicPractise',
    skills: ['rhythm', 'listening'],
    minutes: [4, 8],
  },
  {
    id: 'juni-read',
    kind: 'story',
    storyId: 'hold-on-juni',
    mode: 'read',
    domain: 'feelings',
    placeKey: 'plan.places.storyCorner',
    aimKey: 'juniRead',
    skills: ['listening', 'feelings'],
    minutes: [5, 7],
  },
  {
    id: 'juni-listen',
    kind: 'story',
    storyId: 'hold-on-juni',
    mode: 'narrate',
    domain: 'feelings',
    placeKey: 'plan.places.tidePool',
    aimKey: 'juniListen',
    skills: ['listening', 'feelings'],
    minutes: [5, 7],
    after: 'juni-record',
  },
  {
    id: 'ding-read',
    kind: 'story',
    storyId: 'my-turn-to-ding',
    mode: 'read',
    domain: 'language',
    placeKey: 'plan.places.storyBridge',
    aimKey: 'dingRead',
    skills: ['patience', 'listening'],
    minutes: [3, 5],
  },
  {
    id: 'ding-record',
    kind: 'story',
    storyId: 'my-turn-to-ding',
    mode: 'record',
    domain: 'language',
    placeKey: 'plan.places.busStop',
    aimKey: 'dingRecord',
    skills: ['confidence', 'listening'],
    minutes: [4, 6],
  },
  {
    id: 'ding-listen',
    kind: 'story',
    storyId: 'my-turn-to-ding',
    mode: 'narrate',
    domain: 'language',
    placeKey: 'plan.places.lighthouse',
    aimKey: 'dingListen',
    skills: ['listening', 'vocabulary'],
    minutes: [3, 5],
    after: 'ding-record',
  },
];

export const DEFAULT_WEEK: readonly PlanUnitId[] = [
  'wombat-read',
  'wombat-record',
  'wombat-picnic',
  'juni-record',
  'music-practise',
  'juni-read',
  'ding-read',
];
