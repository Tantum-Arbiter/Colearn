/**
 * The agent instruction set is one body of rules read by two clients. These checks keep it
 * consistent and keep its promises enforceable: one import, links that resolve, skill copies
 * that match, pinned hashes that still hold, and a committed permission deny list that backs
 * the written secrets rule. Prose alone cannot stop prompt injection; the deny list can at
 * least stop a misled session reaching a secret or piping a download into a shell.
 */
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../..');

const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel: string) => fs.existsSync(path.join(ROOT, rel));
const sha256 = (rel: string) => createHash('sha256').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex');
const listDirs = (rel: string) => fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();

const SCOPED_AGENTS = ['func-tests', 'gateway-service', 'grow-with-freya', 'nft', 'scripts', 'security', 'website'].map((dir) => `${dir}/AGENTS.md`);
const CORE_SKILLS = ['fv-debug', 'fv-feature', 'fv-init', 'fv-release', 'fv-remediate', 'fv-review', 'fv-tests'];
const SKILL_LEAVES = ['SKILL.md', 'references/boundaries.md', 'references/evidence.md'];
const RISK_GUIDES = ['fv-authz-review', 'fv-child-privacy', 'fv-security-audit'];

const ROOT_INSTRUCTIONS = [
  'AGENTS.md',
  'CLAUDE.md',
  'TESTING-STANDARD.md',
  'QA-AUTOMATION.md',
  'docs/agent-context-map.md',
  'docs/ai-development-workflow.md',
  'docs/ai-governance-snapshot.md',
];
const SKILL_FILES = [
  ...CORE_SKILLS.flatMap((skill) => SKILL_LEAVES.flatMap((leaf) => [`.agents/skills/${skill}/${leaf}`, `.claude/skills/${skill}/${leaf}`])),
  ...RISK_GUIDES.flatMap((guide) => SKILL_LEAVES.map((leaf) => `docs/ai-skills/${guide}/${leaf}`)),
];
const INSTRUCTION_FILES = [...ROOT_INSTRUCTIONS, ...SCOPED_AGENTS, ...SKILL_FILES];

function relativeLinks(rel: string): string[] {
  const links: string[] = [];
  for (const match of read(rel).matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const target = match[1];
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    links.push(target.replace(/#.*$/, ''));
  }
  return links;
}

describe('the agent instruction set', () => {
  it('lets Claude read the shared rules through one import of AGENTS.md, and nothing else', () => {
    const imports = [...read('CLAUDE.md').matchAll(/^@(\S+)/gm)].map((match) => match[1]);

    expect(imports).toEqual(['AGENTS.md']);
    expect(read('AGENTS.md')).not.toMatch(/^@\S+/m);
  });

  it.each(SCOPED_AGENTS)('%s points at the shared root rules, never at the Claude entry point', (rel) => {
    const text = read(rel);

    expect(text).toContain('../AGENTS.md');
    expect(text).not.toContain('CLAUDE.md');
  });

  it.each(INSTRUCTION_FILES)('%s exists and every relative link in it resolves', (rel) => {
    expect(exists(rel)).toBe(true);
    const dir = path.dirname(path.join(ROOT, rel));

    relativeLinks(rel).forEach((target) => {
      expect({ from: rel, to: target, found: fs.existsSync(path.resolve(dir, target)) }).toEqual({ from: rel, to: target, found: true });
    });
  });

  it('names Claude Code and Codex in the prompt-injection rules, which both clients read', () => {
    const line = read('AGENTS.md').split('\n').find((each) => each.includes('Applies to')) ?? '';

    expect(line).toMatch(/Claude Code/);
    expect(line).toMatch(/Codex/);
  });

  it('shows every root document the map sends agents to in the repository tree as well', () => {
    const agents = read('AGENTS.md');
    const tree = agents.split('```')[1];
    const mapSection = agents.split('## Documentation Map')[1].split('\n## ')[0];
    const rootDocs = [...new Set([...mapSection.matchAll(/\]\(([A-Z0-9-]+\.md)\)/g)].map((match) => match[1]))];

    expect(rootDocs.length).toBeGreaterThan(5);
    rootDocs.forEach((doc) => expect({ doc, inTree: tree.includes(doc) }).toEqual({ doc, inTree: true }));
  });

  it('lists only files that exist at the top of the repository tree', () => {
    const tree = read('AGENTS.md').split('```')[1];
    const topLevel = [...tree.matchAll(/^[├└]── ([^\s/]+\/?)/gm)].map((match) => match[1].replace(/\/$/, ''));

    expect(topLevel.length).toBeGreaterThan(10);
    topLevel.forEach((entry) => expect({ entry, found: exists(entry) }).toEqual({ entry, found: true }));
  });
});

describe('the pinned skills', () => {
  it('are the same seven for Codex and for Claude', () => {
    expect(listDirs('.agents/skills')).toEqual(CORE_SKILLS);
    expect(listDirs('.claude/skills')).toEqual(CORE_SKILLS);
  });

  it.each(CORE_SKILLS)('%s: the Claude copy equals the Codex copy, apart from the invocation line both derive from the same policy', (skill) => {
    const codex = read(`.agents/skills/${skill}/SKILL.md`);
    const claude = read(`.claude/skills/${skill}/SKILL.md`);
    const explicitOnly = read(`.agents/skills/${skill}/agents/openai.yaml`).includes('allow_implicit_invocation: false');

    expect(claude.includes('disable-model-invocation: true\n')).toBe(explicitOnly);
    expect(claude.replace('disable-model-invocation: true\n', '')).toBe(codex);
    expect(codex).toMatch(new RegExp(`^name: ${skill}$`, 'm'));
    ['references/boundaries.md', 'references/evidence.md'].forEach((leaf) => {
      expect(read(`.claude/skills/${skill}/${leaf}`)).toBe(read(`.agents/skills/${skill}/${leaf}`));
    });
  });

  it('still match the hashes the risk-guide manifest pinned', () => {
    const manifest = JSON.parse(read('docs/ai-skills/manifest.json')) as { files: Record<string, string> };
    const expected = RISK_GUIDES.flatMap((guide) => SKILL_LEAVES.map((leaf) => `docs/ai-skills/${guide}/${leaf}`)).sort();

    expect(Object.keys(manifest.files).sort()).toEqual(expected);
    Object.entries(manifest.files).forEach(([rel, hash]) => expect({ rel, hash: sha256(rel) }).toEqual({ rel, hash }));
  });

  it('keep the governance snapshot at the hash the pin records', () => {
    const pin = JSON.parse(read('.engineering-governance.yml')) as { snapshot_sha256: string; review_snapshot: string };

    expect(sha256(pin.review_snapshot)).toBe(pin.snapshot_sha256);
  });
});

describe('nothing in the instruction set reads as an injection', () => {
  const markdown = INSTRUCTION_FILES.filter((rel) => rel.endsWith('.md'));

  it.each(markdown)('%s carries no hidden characters that could conceal text', (rel) => {
    expect(read(rel)).not.toMatch(/[​-‏‪-‮⁠-⁤﻿]/);
  });

  it.each(markdown)('%s gives no instruction to drop the rules, impersonate a role or decode a payload', (rel) => {
    const text = read(rel);

    expect(text).not.toMatch(/(^|[.!?]\s+|["'“‘])(please )?(ignore|disregard|forget) (all |any )?(previous|prior|above|earlier|the) (instructions|rules)/im);
    expect(text).not.toMatch(/\byou are now\b/i);
    expect(text).not.toMatch(/[A-Za-z0-9+/]{120,}={0,2}/);
  });
});

describe('the committed Claude permissions back the written rules', () => {
  const settings = () => JSON.parse(read('.claude/settings.json')) as { permissions?: { deny?: string[]; allow?: string[]; defaultMode?: string } };

  it('exist as shared project settings', () => {
    expect(exists('.claude/settings.json')).toBe(true);
    expect(Array.isArray(settings().permissions?.deny)).toBe(true);
  });

  it.each([
    ['.env', 'Read(**/.env)'],
    ['*.pem', 'Read(**/*.pem)'],
    ['*.key', 'Read(**/*.key)'],
    ['id_rsa', 'Read(**/id_rsa*)'],
    ['id_ed25519', 'Read(**/id_ed25519*)'],
    ['~/.ssh', 'Read(~/.ssh/**)'],
    ['~/.aws', 'Read(~/.aws/**)'],
    ['~/.config/gcloud', 'Read(~/.config/gcloud/**)'],
  ])('deny what the secrets rule names: %s', (named, rule) => {
    expect(read('AGENTS.md')).toContain(named);
    expect(settings().permissions?.deny).toContain(rule);
  });

  it.each([
    'Read(**/.env.local)',
    'Read(**/.env.development)',
    'Read(**/.env.test)',
    'Read(**/.env.preview)',
    'Read(**/.env.production)',
    'Read(**/*.p12)',
    'Read(**/*.jks)',
    'Read(**/*.keystore)',
    'Bash(curl * | sh*)',
    'Bash(curl * | bash*)',
    'Bash(wget * | sh*)',
    'Bash(wget * | bash*)',
    'Bash(sudo *)',
  ])('deny %s', (rule) => {
    expect(settings().permissions?.deny).toContain(rule);
  });

  it('leave the example env file readable, so the rule costs nothing it need not', () => {
    const deny = settings().permissions?.deny ?? [];

    expect(deny.some((rule) => /\.env\*|\.env\.\*/.test(rule))).toBe(false);
    expect(exists('grow-with-freya/.env.example')).toBe(true);
  });

  it('grant no blanket allowance that would undo the gate', () => {
    const { allow = [], defaultMode } = settings().permissions ?? {};

    expect(allow.filter((rule) => /^(Bash|Read|Edit|Write)(\(\*\))?$/.test(rule))).toEqual([]);
    expect(defaultMode).not.toBe('bypassPermissions');
  });
});

describe('the review tooling leaves nothing generated behind', () => {
  it('ignores Python bytecode, which the launcher produces beside itself', () => {
    const ignore = read('.gitignore').split('\n');

    expect(ignore).toContain('__pycache__/');
    expect(ignore).toContain('*.pyc');
  });
});
