import { apply, initialState, type GameEffect, type GameState, type RulesContext } from '@/components/experience/rules';
import type { EngineSave, GameObject, MissionStage, Rule, Zone } from '@/types/game-pack';

function item(id: string, kind: string): GameObject {
  return { id, kind, layerByState: { idle: id }, initial: 'idle', placeable: { zones: ['leaf'] } };
}

const WOMBAT: GameObject = { id: 'wombat', layerByState: { idle: 'wombat', glad: 'wombat-glad' }, initial: 'idle' };
const OBJECTS: GameObject[] = [WOMBAT, item('berry-1', 'berry'), item('berry-2', 'berry'), item('berry-3', 'berry'), item('nut-1', 'nut'), item('petal-1', 'petal')];
const LEAF: Zone = { id: 'leaf', accepts: ['berry', 'nut'], capacity: 4 };

const PACK_RULES: Rule[] = [
  { when: { tap: 'wombat' }, then: [{ react: 'hum' }, { play: 'hum' }] },
  { when: { hold: 'wombat', ms: 600 }, then: [{ set: 'wombat', state: 'glad' }] },
  { when: { dropInto: { zone: 'leaf' } }, then: [{ react: 'count' }, { play: 'pop' }] },
  { when: { dropInto: { zone: 'leaf', item: 'nut-1' } }, then: [{ play: 'crunch' }] },
  { when: { refused: true }, then: [{ play: 'bloop' }] },
  { when: { countEquals: { zone: 'leaf', value: 2 } }, then: [{ play: 'chime' }], once: true },
  { when: { allPlaced: true }, then: [{ play: 'tada' }] },
  { when: { chose: 'share' }, then: [{ react: 'nod' }] },
];

const MISSION_RULES: Rule[] = [
  { when: { stageMet: true }, then: [{ react: 'cheer' }] },
  { when: { missionMet: true }, then: [{ react: 'show-three' }, { complete: true }] },
  { when: { dropInto: { zone: 'leaf' } }, then: [{ play: 'mission-pop' }] },
];

const STAGES: MissionStage[] = [
  { goal: { berry: 1 }, promptKey: 'one' },
  { goal: { berry: 2 }, promptKey: 'two' },
];

function context(stages: MissionStage[] = STAGES, objects: GameObject[] = OBJECTS): RulesContext {
  return { objects, zones: [LEAF], stages };
}

const ALL_RULES = [...PACK_RULES, ...MISSION_RULES];

function drop(state: GameState, object: string, rules: Rule[] = ALL_RULES, ctx: RulesContext = context()) {
  return apply(rules, state, { type: 'drop', object, zone: 'leaf' }, ctx);
}

const sounds = (effects: GameEffect[]) => effects.filter((effect) => effect.type === 'play-sound').map((effect) => effect.sound);
const kinds = (effects: GameEffect[]) => effects.map((effect) => effect.type);

describe('initialState', () => {
  it('puts every object in its first state with nothing placed, on the first stage', () => {
    const state = initialState(OBJECTS, [LEAF], null);

    expect(state.states).toEqual({ wombat: 'idle', 'berry-1': 'idle', 'berry-2': 'idle', 'berry-3': 'idle', 'nut-1': 'idle', 'petal-1': 'idle' });
    expect(state.placed).toEqual({});
    expect(state.fired).toEqual([]);
    expect(state.stage).toBe(0);
    expect(state.complete).toBe(false);
  });

  it('carries on from a save: what was placed, what state things were in, which stage', () => {
    const save: EngineSave = { missionId: 'picnic', stage: 1, states: { wombat: 'glad' }, placed: { 'berry-1': 'leaf' }, savedAt: '2026-10-17T10:00:00.000Z' };

    const state = initialState(OBJECTS, [LEAF], save);

    expect(state.states.wombat).toBe('glad');
    expect(state.states['berry-1']).toBe('idle');
    expect(state.placed).toEqual({ 'berry-1': 'leaf' });
    expect(state.stage).toBe(1);
  });

  it('ignores a saved state or placement for a thing the pack no longer has', () => {
    const save: EngineSave = { missionId: null, stage: 0, states: { gone: 'x' }, placed: { gone: 'leaf', 'berry-1': 'nowhere' }, savedAt: '' };

    const state = initialState(OBJECTS, [LEAF], save);

    expect(state.states).not.toHaveProperty('gone');
    expect(state.placed).toEqual({});
  });
});

describe('apply: taps, holds and choices', () => {
  const start = initialState(OBJECTS, [LEAF], null);

  it('fires the rule for a tap on the thing named, in the order the effects are written', () => {
    const { state, effects } = apply(ALL_RULES, start, { type: 'tap', object: 'wombat' }, context());

    expect(effects).toEqual([{ type: 'react-host', reaction: 'hum' }, { type: 'play-sound', sound: 'hum' }]);
    expect(state).toEqual(start);
  });

  it('does nothing for a tap on a thing no rule names', () => {
    const { state, effects } = apply(ALL_RULES, start, { type: 'tap', object: 'berry-1' }, context());

    expect(effects).toEqual([]);
    expect(state).toBe(start);
  });

  it.each([
    [599, []],
    [600, ['set-state']],
    [601, ['set-state']],
  ])('a hold of %i ms against a rule asking for 600', (ms, expected) => {
    const { state, effects } = apply(ALL_RULES, start, { type: 'hold', object: 'wombat', ms }, context());

    expect(kinds(effects)).toEqual(expected);
    expect(state.states.wombat).toBe(expected.length ? 'glad' : 'idle');
  });

  it('a set effect changes the state of the thing named and nothing else', () => {
    const { state, effects } = apply(ALL_RULES, start, { type: 'hold', object: 'wombat', ms: 900 }, context());

    expect(effects).toEqual([{ type: 'set-state', object: 'wombat', state: 'glad' }]);
    expect(state.states).toEqual({ ...start.states, wombat: 'glad' });
  });

  it('fires the rule for a choice', () => {
    const { effects } = apply(ALL_RULES, start, { type: 'choose', choice: 'share' }, context());

    expect(effects).toEqual([{ type: 'react-host', reaction: 'nod' }]);
  });

  it('leaves no trace of a rule that never fires', () => {
    const { state } = apply(ALL_RULES, start, { type: 'choose', choice: 'nothing-of-the-sort' }, context());

    expect(state.fired).toEqual([]);
  });
});

describe('apply: dropping things into a zone', () => {
  const start = initialState(OBJECTS, [LEAF], null);

  it('places a thing the zone accepts, then fires the pack rule and the mission rule for it, in that order', () => {
    const { state, effects } = drop(start, 'berry-1');

    expect(state.placed).toEqual({ 'berry-1': 'leaf' });
    expect(effects[0]).toEqual({ type: 'place', object: 'berry-1', zone: 'leaf' });
    expect(sounds(effects)).toEqual(['pop', 'mission-pop']);
    expect(effects.filter((effect) => effect.type === 'react-host').map((effect) => effect.reaction)).toEqual(['count', 'cheer']);
  });

  it('turns away a kind the zone does not accept, firing only the refused rule', () => {
    const { state, effects } = drop(start, 'petal-1');

    expect(state.placed).toEqual({});
    expect(effects).toEqual([{ type: 'refuse', object: 'petal-1', zone: 'leaf' }, { type: 'play-sound', sound: 'bloop' }]);
  });

  it('turns a thing away once the zone is full', () => {
    const full: GameState = { ...start, placed: { 'berry-1': 'leaf', 'berry-2': 'leaf', 'berry-3': 'leaf', 'nut-1': 'leaf' }, stage: 2 };
    const extra = context(STAGES, [...OBJECTS, item('berry-4', 'berry')]);

    const { state, effects } = apply(ALL_RULES, full, { type: 'drop', object: 'berry-4', zone: 'leaf' }, extra);

    expect(state.placed).toEqual(full.placed);
    expect(kinds(effects)).toEqual(['refuse', 'play-sound']);
  });

  it('turns away a thing that is not placeable, or a zone that does not exist', () => {
    const noZone = apply(ALL_RULES, start, { type: 'drop', object: 'berry-1', zone: 'pond' }, context());
    const notPlaceable = apply(ALL_RULES, start, { type: 'drop', object: 'wombat', zone: 'leaf' }, context());

    expect(noZone.state.placed).toEqual({});
    expect(notPlaceable.state.placed).toEqual({});
    expect(kinds(noZone.effects)[0]).toBe('refuse');
    expect(kinds(notPlaceable.effects)[0]).toBe('refuse');
  });

  it('does not place a thing twice', () => {
    const once = drop(start, 'berry-1').state;

    const { state, effects } = drop(once, 'berry-1');

    expect(state.placed).toEqual({ 'berry-1': 'leaf' });
    expect(kinds(effects)[0]).toBe('refuse');
  });

  it('a rule naming an item fires for that item alone', () => {
    const berry = drop(start, 'berry-1');
    const nut = drop(start, 'nut-1');

    expect(sounds(berry.effects)).not.toContain('crunch');
    expect(sounds(nut.effects)).toContain('crunch');
  });

  it('a zone accepting any kind takes a petal', () => {
    const open = { ...context(), zones: [{ ...LEAF, accepts: 'any' as const }] };

    const { state } = apply(ALL_RULES, start, { type: 'drop', object: 'petal-1', zone: 'leaf' }, open);

    expect(state.placed).toEqual({ 'petal-1': 'leaf' });
  });

  it('a zone may accept a thing by its id as well as its kind', () => {
    const byId = { ...context(), zones: [{ ...LEAF, accepts: ['petal-1'] }] };

    const { state } = apply(ALL_RULES, start, { type: 'drop', object: 'petal-1', zone: 'leaf' }, byId);

    expect(state.placed).toEqual({ 'petal-1': 'leaf' });
  });
});

describe('apply: counting', () => {
  const start = initialState(OBJECTS, [LEAF], null);

  it('fires countEquals only when the count lands exactly on the value', () => {
    const one = drop(start, 'berry-1');
    const two = drop(one.state, 'berry-2');
    const three = drop(two.state, 'berry-3');

    expect(sounds(one.effects)).not.toContain('chime');
    expect(sounds(two.effects)).toContain('chime');
    expect(sounds(three.effects)).not.toContain('chime');
  });

  it('counts the drop before the rules that count see it', () => {
    const one = drop(start, 'berry-1');

    const { effects } = drop(one.state, 'berry-2');

    expect(kinds(effects).indexOf('place')).toBeLessThan(sounds(effects).indexOf('chime'));
    expect(sounds(effects).indexOf('pop')).toBeLessThan(sounds(effects).indexOf('chime'));
  });

  it('fires allPlaced once every placeable thing is in a zone', () => {
    const few = context([], [WOMBAT, item('berry-1', 'berry'), item('nut-1', 'nut')]);
    const first = apply(ALL_RULES, initialState(few.objects, [LEAF], null), { type: 'drop', object: 'berry-1', zone: 'leaf' }, few);

    const last = apply(ALL_RULES, first.state, { type: 'drop', object: 'nut-1', zone: 'leaf' }, few);

    expect(sounds(first.effects)).not.toContain('tada');
    expect(sounds(last.effects)).toContain('tada');
  });
});

describe('apply: once', () => {
  const start = initialState(OBJECTS, [LEAF], null);
  const onceOnly: Rule[] = [{ when: { tap: 'wombat' }, then: [{ play: 'hum' }], once: true }];
  const everyTime: Rule[] = [{ when: { tap: 'wombat' }, then: [{ play: 'hum' }] }];

  it('a once rule fires the first time only', () => {
    const first = apply(onceOnly, start, { type: 'tap', object: 'wombat' }, context());
    const second = apply(onceOnly, first.state, { type: 'tap', object: 'wombat' }, context());

    expect(sounds(first.effects)).toEqual(['hum']);
    expect(sounds(second.effects)).toEqual([]);
    expect(first.state.fired).toEqual([0]);
  });

  it('a rule without once fires every time', () => {
    const first = apply(everyTime, start, { type: 'tap', object: 'wombat' }, context());
    const second = apply(everyTime, first.state, { type: 'tap', object: 'wombat' }, context());

    expect(sounds(second.effects)).toEqual(['hum']);
    expect(second.state.fired).toEqual([]);
  });

  it('remembers once rules by their place in the list, so two alike are told apart', () => {
    const twoAlike: Rule[] = [...onceOnly, ...onceOnly];

    const { state, effects } = apply(twoAlike, start, { type: 'tap', object: 'wombat' }, context());

    expect(sounds(effects)).toEqual(['hum', 'hum']);
    expect(state.fired).toEqual([0, 1]);
  });
});

describe('apply: two rules on one trigger', () => {
  it('fire both, in the order they are written', () => {
    const rules: Rule[] = [
      { when: { tap: 'wombat' }, then: [{ play: 'first' }] },
      { when: { tap: 'wombat' }, then: [{ play: 'second' }] },
    ];

    const { effects } = apply(rules, initialState(OBJECTS, [LEAF], null), { type: 'tap', object: 'wombat' }, context());

    expect(sounds(effects)).toEqual(['first', 'second']);
  });
});

describe('apply: a mission in stages', () => {
  const start = initialState(OBJECTS, [LEAF], null);

  it('meets the first stage with one berry, cheers, and moves to the next stage', () => {
    const { state, effects } = drop(start, 'berry-1');

    expect(effects.filter((effect) => effect.type === 'react-host').map((effect) => effect.reaction)).toContain('cheer');
    expect(effects).toContainEqual({ type: 'stage', index: 1 });
    expect(effects).not.toContainEqual({ type: 'complete' });
    expect(state.stage).toBe(1);
    expect(state.complete).toBe(false);
  });

  it('a nut does not count towards a goal of berries', () => {
    const { state, effects } = drop(start, 'nut-1');

    expect(state.stage).toBe(0);
    expect(effects).not.toContainEqual({ type: 'stage', index: 1 });
  });

  it('meets the last stage with the second berry, and the mission is complete', () => {
    const one = drop(start, 'berry-1');

    const { state, effects } = drop(one.state, 'berry-2');

    expect(effects.filter((effect) => effect.type === 'react-host').map((effect) => effect.reaction)).toEqual(['count', 'cheer', 'show-three']);
    expect(effects).toContainEqual({ type: 'complete' });
    expect(effects.filter((effect) => effect.type === 'stage')).toEqual([]);
    expect(state.complete).toBe(true);
    expect(state.stage).toBe(2);
  });

  it('cheers only at the moment a stage is met, not on every later drop', () => {
    const one = drop(start, 'berry-1');
    const two = drop(one.state, 'berry-2');

    const { state, effects } = drop(two.state, 'berry-3');

    expect(state.placed['berry-3']).toBe('leaf');
    expect(effects.filter((effect) => effect.type === 'react-host').map((effect) => effect.reaction)).toEqual(['count']);
    expect(effects).not.toContainEqual({ type: 'complete' });
    expect(state.complete).toBe(true);
  });

  it('a stage already met by what a save had placed is met again on the next drop, so a resumed child is never stuck', () => {
    const resumed: GameState = { ...start, placed: { 'berry-1': 'leaf', 'berry-2': 'leaf' }, stage: 0 };

    const { state, effects } = drop(resumed, 'nut-1');

    expect(state.stage).toBe(2);
    expect(effects).toContainEqual({ type: 'complete' });
  });

  it('free play has no stages, so nothing is ever met or complete', () => {
    const free = context([]);
    const one = apply(PACK_RULES, start, { type: 'drop', object: 'berry-1', zone: 'leaf' }, free);
    const two = apply(PACK_RULES, one.state, { type: 'drop', object: 'berry-2', zone: 'leaf' }, free);

    expect(two.state.stage).toBe(0);
    expect(two.state.complete).toBe(false);
    expect(kinds(two.effects)).not.toContain('stage');
  });

  it('a goal of two kinds needs both', () => {
    const both = context([{ goal: { berry: 1, nut: 1 }, promptKey: 'both' }]);
    const berry = apply(ALL_RULES, start, { type: 'drop', object: 'berry-1', zone: 'leaf' }, both);

    const nut = apply(ALL_RULES, berry.state, { type: 'drop', object: 'nut-1', zone: 'leaf' }, both);

    expect(berry.state.complete).toBe(false);
    expect(nut.state.complete).toBe(true);
  });

  it('a mission with no goal at all is met on the first drop', () => {
    const empty = context([{ goal: {}, promptKey: 'any' }]);

    const { state } = apply(ALL_RULES, start, { type: 'drop', object: 'berry-1', zone: 'leaf' }, empty);

    expect(state.complete).toBe(true);
  });
});
