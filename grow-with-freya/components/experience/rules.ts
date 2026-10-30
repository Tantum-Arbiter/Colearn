import type { Effect, EngineSave, Frame, GameObject, MissionStage, Rule, Trigger, Zone } from '@/types/game-pack';

export interface GameState {
  readonly states: Readonly<Record<string, string>>;
  readonly placed: Readonly<Record<string, string>>;
  readonly fired: readonly number[];
  readonly stage: number;
  readonly complete: boolean;
}

export type GameInput =
  | { type: 'tap'; object: string }
  | { type: 'hold'; object: string; ms: number }
  | { type: 'drop'; object: string; zone: string }
  | { type: 'choose'; choice: string };

export type GameEffect =
  | { type: 'set-state'; object: string; state: string }
  | { type: 'play-sound'; sound: string }
  | { type: 'react-host'; reaction: string }
  | { type: 'move-to'; object: string; frame: Frame; ms: number }
  | { type: 'complete' }
  | { type: 'place'; object: string; zone: string }
  | { type: 'refuse'; object: string; zone: string }
  | { type: 'stage'; index: number };

export interface RulesContext {
  readonly objects: readonly GameObject[];
  readonly zones: readonly Zone[];
  readonly stages: readonly MissionStage[];
}

export interface Applied {
  state: GameState;
  effects: GameEffect[];
}

type Happening =
  | { kind: 'tap'; object: string }
  | { kind: 'hold'; object: string; ms: number }
  | { kind: 'dropInto'; zone: string; item: string }
  | { kind: 'refused' }
  | { kind: 'countEquals'; zone: string; value: number }
  | { kind: 'allPlaced' }
  | { kind: 'stageMet' }
  | { kind: 'missionMet' }
  | { kind: 'chose'; choice: string };

export function initialState(objects: readonly GameObject[], zones: readonly Zone[], save: EngineSave | null | undefined): GameState {
  const known = new Set(objects.map((object) => object.id));
  const places = new Set(zones.map((zone) => zone.id));
  const states: Record<string, string> = {};
  objects.forEach((object) => {
    states[object.id] = object.initial;
  });
  if (save) {
    Object.entries(save.states).forEach(([id, state]) => {
      if (known.has(id)) states[id] = state;
    });
  }
  const placed: Record<string, string> = {};
  if (save) {
    Object.entries(save.placed).forEach(([id, zone]) => {
      if (known.has(id) && places.has(zone)) placed[id] = zone;
    });
  }

  return { states, placed, fired: [], stage: save?.stage ?? 0, complete: false };
}

export function placedIn(state: GameState, zone: string): string[] {
  return Object.entries(state.placed)
    .filter(([, where]) => where === zone)
    .map(([id]) => id);
}

export function countOfKind(state: GameState, objects: readonly GameObject[], kind: string): number {
  return objects.filter((object) => object.kind === kind && state.placed[object.id] !== undefined).length;
}

export function zoneAccepts(zone: Zone, object: GameObject): boolean {
  if (zone.accepts === 'any') return true;

  return zone.accepts.includes(object.id) || (object.kind !== undefined && zone.accepts.includes(object.kind));
}

export function roomIn(zone: Zone, state: GameState): boolean {
  return placedIn(state, zone.id).length < zone.capacity;
}

export function stageMet(stage: MissionStage, state: GameState, objects: readonly GameObject[]): boolean {
  return Object.entries(stage.goal).every(([kind, wanted]) => countOfKind(state, objects, kind) >= wanted);
}

function matches(trigger: Trigger, happening: Happening): boolean {
  if ('tap' in trigger) return happening.kind === 'tap' && happening.object === trigger.tap;
  if ('hold' in trigger) return happening.kind === 'hold' && happening.object === trigger.hold && happening.ms >= trigger.ms;
  if ('dropInto' in trigger) {
    return (
      happening.kind === 'dropInto' &&
      happening.zone === trigger.dropInto.zone &&
      (trigger.dropInto.item === undefined || trigger.dropInto.item === happening.item)
    );
  }
  if ('refused' in trigger) return happening.kind === 'refused';
  if ('countEquals' in trigger) {
    return happening.kind === 'countEquals' && happening.zone === trigger.countEquals.zone && happening.value === trigger.countEquals.value;
  }
  if ('allPlaced' in trigger) return happening.kind === 'allPlaced';
  if ('stageMet' in trigger) return happening.kind === 'stageMet';
  if ('missionMet' in trigger) return happening.kind === 'missionMet';

  return happening.kind === 'chose' && happening.choice === trigger.chose;
}

function toEffect(effect: Effect): GameEffect {
  if ('set' in effect) return { type: 'set-state', object: effect.set, state: effect.state };
  if ('play' in effect) return { type: 'play-sound', sound: effect.play };
  if ('react' in effect) return { type: 'react-host', reaction: effect.react };
  if ('moveTo' in effect) return { type: 'move-to', object: effect.moveTo.object, frame: effect.moveTo.frame, ms: effect.moveTo.ms };

  return { type: 'complete' };
}

class Run {
  state: GameState;
  readonly effects: GameEffect[] = [];

  constructor(state: GameState, private readonly rules: readonly Rule[], private readonly context: RulesContext) {
    this.state = state;
  }

  happen(happening: Happening): void {
    this.rules.forEach((rule, index) => {
      if (!matches(rule.when, happening)) return;
      if (rule.once && this.state.fired.includes(index)) return;
      if (rule.once) this.state = { ...this.state, fired: [...this.state.fired, index] };
      rule.then.forEach((effect) => this.take(toEffect(effect)));
    });
  }

  private take(effect: GameEffect): void {
    this.effects.push(effect);
    if (effect.type === 'set-state') {
      this.state = { ...this.state, states: { ...this.state.states, [effect.object]: effect.state } };
    } else if (effect.type === 'complete') {
      this.state = { ...this.state, complete: true };
    }
  }

  drop(objectId: string, zoneId: string): void {
    const object = this.context.objects.find((candidate) => candidate.id === objectId);
    const zone = this.context.zones.find((candidate) => candidate.id === zoneId);
    const welcome =
      object !== undefined &&
      zone !== undefined &&
      object.placeable !== undefined &&
      this.state.placed[object.id] === undefined &&
      zoneAccepts(zone, object) &&
      roomIn(zone, this.state);
    if (!welcome || object === undefined || zone === undefined) {
      this.effects.push({ type: 'refuse', object: objectId, zone: zoneId });
      this.happen({ kind: 'refused' });
      return;
    }

    this.state = { ...this.state, placed: { ...this.state.placed, [object.id]: zone.id } };
    this.effects.push({ type: 'place', object: object.id, zone: zone.id });
    this.happen({ kind: 'dropInto', zone: zone.id, item: object.id });
    this.happen({ kind: 'countEquals', zone: zone.id, value: placedIn(this.state, zone.id).length });
    if (this.context.objects.every((candidate) => candidate.placeable === undefined || this.state.placed[candidate.id] !== undefined)) {
      this.happen({ kind: 'allPlaced' });
    }
    this.meetStages();
  }

  private meetStages(): void {
    const { stages, objects } = this.context;
    while (this.state.stage < stages.length && stageMet(stages[this.state.stage], this.state, objects)) {
      this.happen({ kind: 'stageMet' });
      const next = this.state.stage + 1;
      this.state = { ...this.state, stage: next };
      if (next < stages.length) {
        this.effects.push({ type: 'stage', index: next });
      } else {
        this.happen({ kind: 'missionMet' });
      }
    }
  }
}

export function apply(rules: readonly Rule[], state: GameState, input: GameInput, context: RulesContext): Applied {
  const run = new Run(state, rules, context);
  switch (input.type) {
    case 'tap':
      run.happen({ kind: 'tap', object: input.object });
      break;
    case 'hold':
      run.happen({ kind: 'hold', object: input.object, ms: input.ms });
      break;
    case 'drop':
      run.drop(input.object, input.zone);
      break;
    case 'choose':
      run.happen({ kind: 'chose', choice: input.choice });
      break;
  }

  return { state: run.state, effects: run.effects };
}
