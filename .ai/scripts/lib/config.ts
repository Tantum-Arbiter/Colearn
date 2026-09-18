import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { isInside } from './fsx.ts';

export type ReviewerKind = 'claude' | 'codex';

export interface ReviewerConfig {
  id: string;
  label: string;
  kind: ReviewerKind;
  profileDir: string;
  expectedPlan: string | null;
}

export interface OrchestratorConfig {
  lead: { label: string; profileDir: string };
  reviewers: ReviewerConfig[];
  binaries: { claude: string; codex: string };
  pins: { codex: string };
}

export class ConfigError extends Error {
  constructor(problem: string) {
    super(`Invalid .ai/config/reviewers.json: ${problem}`);
    this.name = 'ConfigError';
  }
}

const DEFAULT_PROFILES = ['.claude', '.codex'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireKeys(value: unknown, keys: readonly string[], where: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new ConfigError(`${where} must be an object`);
  }
  const unknown = Object.keys(value).filter((key) => !keys.includes(key));
  if (unknown.length > 0) {
    throw new ConfigError(`${where} has unknown keys: ${unknown.join(', ')}`);
  }
  const missing = keys.filter((key) => !(key in value));
  if (missing.length > 0) {
    throw new ConfigError(`${where} is missing: ${missing.join(', ')}`);
  }
  return value;
}

function requireString(value: unknown, where: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ConfigError(`${where} must be a non-empty string`);
  }
  return value;
}

export function expandHome(path: string, home: string): string {
  if (path === '~') {
    return home;
  }
  if (path.startsWith('~/')) {
    return join(home, path.slice(2));
  }
  throw new ConfigError(`paths must start with ~/ (got ${JSON.stringify(path)})`);
}

function homePath(value: unknown, home: string, where: string): string {
  const expanded = resolve(expandHome(requireString(value, where), home));
  if (!isInside(home, expanded) || expanded === resolve(home)) {
    throw new ConfigError(`${where} must be inside the home directory`);
  }
  return expanded;
}

export function parseConfig(raw: unknown, home: string): OrchestratorConfig {
  const root = requireKeys(raw, ['version', 'lead', 'reviewers', 'binaries', 'pins'], 'config');
  if (root.version !== 1) {
    throw new ConfigError('version must be 1');
  }
  const lead = requireKeys(root.lead, ['label', 'profile_dir'], 'lead');
  const binaries = requireKeys(root.binaries, ['claude', 'codex'], 'binaries');
  const pins = requireKeys(root.pins, ['codex'], 'pins');
  if (!Array.isArray(root.reviewers) || root.reviewers.length === 0) {
    throw new ConfigError('reviewers must be a non-empty array');
  }

  const defaultDirs = DEFAULT_PROFILES.map((dir) => resolve(home, dir));
  const seenIds = new Set<string>();
  const seenDirs = new Set<string>();
  const reviewers = root.reviewers.map((entry: unknown, index: number): ReviewerConfig => {
    const where = `reviewers[${index}]`;
    const r = requireKeys(entry, ['id', 'label', 'kind', 'profile_dir', 'expected_plan'], where);
    const id = requireString(r.id, `${where}.id`);
    if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(id)) {
      throw new ConfigError(`${where}.id must be lowercase letters, digits and dashes`);
    }
    if (r.kind !== 'claude' && r.kind !== 'codex') {
      throw new ConfigError(`${where}.kind must be "claude" or "codex"`);
    }
    const profileDir = homePath(r.profile_dir, home, `${where}.profile_dir`);
    if (defaultDirs.includes(profileDir)) {
      throw new ConfigError(`${where}.profile_dir must not be a default profile (${profileDir}); reviewers need isolated profiles`);
    }
    if (seenIds.has(id)) {
      throw new ConfigError(`duplicate reviewer id ${id}`);
    }
    if (seenDirs.has(profileDir)) {
      throw new ConfigError(`${where}.profile_dir is shared with another reviewer`);
    }
    seenIds.add(id);
    seenDirs.add(profileDir);
    if (r.expected_plan !== null && typeof r.expected_plan !== 'string') {
      throw new ConfigError(`${where}.expected_plan must be a string or null`);
    }
    return {
      id,
      label: requireString(r.label, `${where}.label`),
      kind: r.kind,
      profileDir,
      expectedPlan: r.expected_plan,
    };
  });

  const codexPin = requireString(pins.codex, 'pins.codex');
  if (!/^\d+\.\d+\.\d+$/.test(codexPin)) {
    throw new ConfigError('pins.codex must be an exact version');
  }

  return {
    lead: {
      label: requireString(lead.label, 'lead.label'),
      profileDir: homePath(lead.profile_dir, home, 'lead.profile_dir'),
    },
    reviewers,
    binaries: {
      claude: homePath(binaries.claude, home, 'binaries.claude'),
      codex: homePath(binaries.codex, home, 'binaries.codex'),
    },
    pins: { codex: codexPin },
  };
}

export function loadConfig(aiDir: string, home: string): OrchestratorConfig {
  const path = join(aiDir, 'config', 'reviewers.json');
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new ConfigError(error instanceof Error ? error.message : 'unreadable');
  }
  return parseConfig(raw, home);
}
