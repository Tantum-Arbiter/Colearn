import type { ArtCrop, Effect, GamePack, Mission, Rule, Trigger, Zone } from '@/types/game-pack';

export const PACK_BUDGET_BYTES = 3 * 1024 * 1024;

const ENGINES = ['scene', 'place', 'choose', 'make'];
const CROPS: ArtCrop[] = ['phone', 'tablet'];
const BANDS = ['1-2', '2-4', '4+'];

export interface PackFiles {
  has: (path: string) => boolean;
  sizeOf: (path: string) => number;
  total: () => number;
}

type Locales = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function shape(manifest: unknown): string[] {
  if (!isRecord(manifest)) return ['manifest is not an object'];
  const errors: string[] = [];
  if (typeof manifest.id !== 'string' || manifest.id === '') errors.push('manifest has no id');
  if (!Number.isInteger(manifest.version)) errors.push('manifest version is not a whole number');
  if (typeof manifest.checksum !== 'string') errors.push('manifest has no checksum');
  if (!ENGINES.includes(manifest.engine as string)) errors.push(`manifest engine ${String(manifest.engine)} is not one of ${ENGINES.join(', ')}`);
  if (typeof manifest.world !== 'string') errors.push('manifest has no world');
  if (typeof manifest.minAppVersion !== 'string') errors.push('manifest has no minAppVersion');
  if (typeof manifest.cover !== 'string') errors.push('manifest has no cover');
  if (!isRecord(manifest.art) || CROPS.some((crop) => !isRecord((manifest.art as Record<string, unknown>)[crop]))) errors.push('manifest art needs a phone and a tablet crop');
  if (!isRecord(manifest.host)) errors.push('manifest has no host');
  if (!Array.isArray(manifest.objects)) errors.push('manifest objects is not a list');
  if (manifest.zones !== undefined && !Array.isArray(manifest.zones)) errors.push('manifest zones is not a list');
  if (!Array.isArray(manifest.rules)) errors.push('manifest rules is not a list');
  if (!Array.isArray(manifest.missions)) errors.push('manifest missions is not a list');
  if (!isRecord(manifest.sounds)) errors.push('manifest sounds is not an object');
  if (!Array.isArray(manifest.keys)) errors.push('manifest keys is not a list');

  return errors;
}

function keyIn(locale: unknown, key: string): boolean {
  let at: unknown = locale;
  for (const part of key.split('.')) {
    if (!isRecord(at) || !(part in at)) return false;
    at = at[part];
  }

  return typeof at === 'string';
}

function keysUsed(pack: GamePack): string[] {
  const used: string[] = [];
  pack.objects.forEach((object) => object.labelKey && used.push(object.labelKey));
  (pack.zones ?? []).forEach((zone) => zone.labelKey && used.push(zone.labelKey));
  pack.missions.forEach((mission) => {
    used.push(mission.titleKey, mission.aimKey, mission.promptKey, mission.grownUpKey);
    Object.values(mission.byAge ?? {}).forEach((band) => (band?.stages ?? []).forEach((stage) => used.push(stage.promptKey)));
  });

  return used;
}

class Check {
  readonly errors: string[] = [];
  private readonly objectIds: Set<string>;
  private readonly zoneIds: Set<string>;
  private readonly kinds: Set<string>;
  private readonly layerIds: Set<string>;

  constructor(private readonly pack: GamePack, private readonly files: PackFiles, private readonly locales: Locales) {
    this.objectIds = new Set(pack.objects.map((object) => object.id));
    this.zoneIds = new Set((pack.zones ?? []).map((zone) => zone.id));
    this.kinds = new Set(pack.objects.flatMap((object) => (object.kind && object.placeable ? [object.kind] : [])));
    this.layerIds = new Set(CROPS.flatMap((crop) => pack.art[crop].layers.map((layer) => layer.id)));
  }

  run(): string[] {
    this.filesPresent();
    this.layersMatch();
    this.objectsSound();
    this.zonesSound();
    this.pack.rules.forEach((rule, index) => this.rule(rule, `rule ${index}`));
    this.pack.missions.forEach((mission) => this.mission(mission));
    this.host();
    this.keys();
    this.budget();

    return this.errors;
  }

  private file(path: string, what: string): void {
    if (!this.files.has(path)) this.errors.push(`${what} file ${path} is missing`);
  }

  private filesPresent(): void {
    this.file(this.pack.cover, 'cover');
    CROPS.forEach((crop) => this.pack.art[crop].layers.forEach((layer) => this.file(layer.file, `layer ${layer.id} (${crop})`)));
    Object.entries(this.pack.sounds).forEach(([id, sound]) => this.file(sound.file, `sound ${id}`));
  }

  private layersMatch(): void {
    CROPS.forEach((crop) => {
      const art = this.pack.art[crop];
      const mine = new Set(art.layers.map((layer) => layer.id));
      this.layerIds.forEach((id) => {
        if (!mine.has(id)) this.errors.push(`layer ${id} is missing from the ${crop} crop`);
      });
      this.pack.objects.forEach((object) => {
        if (object.placeable && !(object.id in (art.starts ?? {}))) this.errors.push(`object ${object.id} has no start in the ${crop} crop`);
      });
      (this.pack.zones ?? []).forEach((zone) => {
        if (!(zone.id in (art.zones ?? {}))) this.errors.push(`zone ${zone.id} has no frame in the ${crop} crop`);
      });
    });
  }

  private objectsSound(): void {
    this.pack.objects.forEach((object) => {
      Object.entries(object.layerByState).forEach(([state, layer]) => {
        if (!this.layerIds.has(layer)) this.errors.push(`object ${object.id} state ${state} names layer ${layer}, which no crop has`);
      });
      if (!(object.initial in object.layerByState)) this.errors.push(`object ${object.id} starts in state ${object.initial}, which it has not got`);
      object.placeable?.zones.forEach((zone) => {
        if (!this.zoneIds.has(zone)) this.errors.push(`object ${object.id} can be placed in zone ${zone}, which does not exist`);
      });
    });
  }

  private zonesSound(): void {
    (this.pack.zones ?? []).forEach((zone: Zone) => {
      if (zone.accepts === 'any') return;
      zone.accepts.forEach((accepted) => {
        if (!this.objectIds.has(accepted) && !this.kinds.has(accepted)) this.errors.push(`zone ${zone.id} accepts ${accepted}, which is neither a thing nor a kind of thing`);
      });
    });
  }

  private object(id: string, where: string): void {
    if (!this.objectIds.has(id)) this.errors.push(`${where} names object ${id}, which does not exist`);
  }

  private zone(id: string, where: string): void {
    if (!this.zoneIds.has(id)) this.errors.push(`${where} names zone ${id}, which does not exist`);
  }

  private trigger(trigger: Trigger, where: string): void {
    if ('tap' in trigger) this.object(trigger.tap, where);
    else if ('hold' in trigger) this.object(trigger.hold, where);
    else if ('dropInto' in trigger) {
      this.zone(trigger.dropInto.zone, where);
      if (trigger.dropInto.item !== undefined) this.object(trigger.dropInto.item, where);
    } else if ('countEquals' in trigger) this.zone(trigger.countEquals.zone, where);
  }

  private effect(effect: Effect, where: string): void {
    if ('set' in effect) {
      this.object(effect.set, where);
      const object = this.pack.objects.find((candidate) => candidate.id === effect.set);
      if (object && !(effect.state in object.layerByState)) this.errors.push(`${where} sets object ${effect.set} to state ${effect.state}, which it has not got`);
    } else if ('play' in effect) this.sound(effect.play, where);
    else if ('react' in effect) {
      if (!(effect.react in this.pack.host.reactions)) this.errors.push(`${where} asks for reaction ${effect.react}, which the host has not got`);
    } else if ('moveTo' in effect) this.object(effect.moveTo.object, where);
  }

  private sound(id: string, where: string): void {
    if (!(id in this.pack.sounds)) this.errors.push(`${where} plays sound ${id}, which does not exist`);
  }

  private rule(rule: Rule, where: string): void {
    this.trigger(rule.when, where);
    rule.then.forEach((effect) => this.effect(effect, where));
  }

  private mission(mission: Mission): void {
    const where = `mission ${mission.id}`;
    BANDS.forEach((band) => {
      const given = (mission.byAge as Partial<Record<string, { stages?: { goal?: Record<string, number> }[] }>>)[band];
      if (!given) {
        this.errors.push(`${where} is missing band ${band}`);
        return;
      }
      (given.stages ?? []).forEach((stage, index) => {
        Object.keys(stage.goal ?? {}).forEach((kind) => {
          if (!this.kinds.has(kind)) this.errors.push(`${where} band ${band} stage ${index} asks for kind ${kind}, which no placeable thing has`);
        });
      });
    });
    mission.rules.forEach((rule, index) => this.rule(rule, `${where} rule ${index}`));
  }

  private host(): void {
    if (!this.objectIds.has(this.pack.host.objectId)) this.errors.push(`host ${this.pack.host.objectId} is not an object`);
    Object.entries(this.pack.host.reactions).forEach(([id, reaction]) => {
      if (reaction.sound !== undefined) this.sound(reaction.sound, `reaction ${id}`);
    });
  }

  private keys(): void {
    const listed = new Set(this.pack.keys);
    keysUsed(this.pack).forEach((key) => {
      if (!listed.has(key)) this.errors.push(`key ${key} is used by the pack but not listed in its keys`);
    });
    Object.entries(this.locales).forEach(([code, locale]) => {
      this.pack.keys.forEach((key) => {
        if (!keyIn(locale, key)) this.errors.push(`locale ${code} is missing key ${key}`);
      });
    });
  }

  private budget(): void {
    const total = this.files.total();
    if (total > PACK_BUDGET_BYTES) this.errors.push(`pack ${this.pack.id} is ${total} bytes, over its budget of ${PACK_BUDGET_BYTES}`);
  }
}

export function validatePack(manifest: unknown, files: PackFiles, locales: Locales): string[] {
  const malformed = shape(manifest);
  if (malformed.length > 0) return malformed;

  return new Check(manifest as GamePack, files, locales).run();
}
