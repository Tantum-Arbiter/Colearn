import type { PlanAgeRange } from '@/types/learning-plan';

export type EngineKind = 'scene' | 'place' | 'choose' | 'make';

export type ArtCrop = 'phone' | 'tablet';

export type LayerClock = 'sway' | 'bob' | 'drift' | 'twinkle';

export type HostMove = 'bob' | 'turn' | 'hum' | 'nod' | 'cheer';

export type MissionGesture = 'tap' | 'tap-place' | 'drag';

export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Layer {
  id: string;
  file: string;
  frame: Frame;
  z: number;
  clock?: LayerClock;
}

export interface PackArt {
  width: number;
  height: number;
  sky: string;
  layers: Layer[];
  starts: Record<string, Frame>;
  zones: Record<string, Frame>;
}

export interface Placeable {
  zones: string[];
}

export interface GameObject {
  id: string;
  kind?: string;
  labelKey?: string;
  layerByState: Record<string, string>;
  initial: string;
  placeable?: Placeable;
}

export interface Zone {
  id: string;
  labelKey?: string;
  accepts: string[] | 'any';
  capacity: number;
}

export interface ZonePlace {
  id: string;
  frame: Frame;
}

export interface Reaction {
  move: HostMove;
  ms: number;
  sound?: string;
}

export type Trigger =
  | { tap: string }
  | { hold: string; ms: number }
  | { dropInto: { zone: string; item?: string } }
  | { refused: true }
  | { countEquals: { zone: string; value: number } }
  | { allPlaced: true }
  | { stageMet: true }
  | { missionMet: true }
  | { chose: string };

export type Effect =
  | { set: string; state: string }
  | { play: string }
  | { react: string }
  | { moveTo: { object: string; frame: Frame; ms: number } }
  | { complete: true };

export interface Rule {
  when: Trigger;
  then: Effect[];
  once?: boolean;
}

export interface MissionStage {
  goal: Record<string, number>;
  promptKey: string;
}

export interface MissionBand {
  gesture: MissionGesture;
  stages: MissionStage[];
}

export interface Mission {
  id: string;
  titleKey: string;
  aimKey: string;
  promptKey: string;
  grownUpKey: string;
  byAge: Record<PlanAgeRange, MissionBand>;
  rules: Rule[];
  bridgeActivityId: string;
  minutes: [number, number];
}

export interface GamePack {
  id: string;
  version: number;
  checksum: string;
  engine: EngineKind;
  world: string;
  storyId?: string;
  minAppVersion: string;
  cover: string;
  art: Record<ArtCrop, PackArt>;
  host: { objectId: string; reactions: Record<string, Reaction> };
  objects: GameObject[];
  zones?: Zone[];
  rules: Rule[];
  missions: Mission[];
  sounds: Record<string, { file: string }>;
  keys: string[];
}

export interface EngineSave {
  missionId: string | null;
  stage: number;
  states: Record<string, string>;
  placed: Record<string, string>;
  savedAt: string;
}

export type ShellResult =
  | { outcome: 'completed'; packId: string; missionId: string; durationMs: number }
  | { outcome: 'left'; packId: string; missionId: string | null; durationMs: number };
