/**
 * The weekly security scan fails on advisories the allowlist does not accept:
 * a critical anywhere in the tree, or a high in the production tree. Expo
 * pulls its build tooling in as production dependencies, so most of what npm
 * flags never reaches the app; the allowlist records which, and why, and this
 * test keeps both the gate and the list honest.
 */

import { spawnSync } from 'child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const APP = join(__dirname, '..', '..');
const REPO = join(APP, '..');
const GATE = join(REPO, '.github', 'scripts', 'audit-gate.py');
const ALLOWLIST_PATH = join(APP, 'audit-allowlist.json');

type Severity = 'info' | 'low' | 'moderate' | 'high' | 'critical';

type Advisory = {
  source: number;
  name: string;
  dependency: string;
  title: string;
  url: string;
  severity: Severity;
  cwe: string[];
  cvss: { score: number; vectorString: string | null };
  range: string;
};

type Vulnerability = {
  name: string;
  severity: Severity;
  isDirect: boolean;
  via: (Advisory | string)[];
  effects: string[];
  range: string;
  nodes: string[];
  fixAvailable: boolean;
};

type Report = {
  auditReportVersion: 2;
  vulnerabilities: Record<string, Vulnerability>;
  metadata: {
    vulnerabilities: Record<Severity | 'total', number>;
    dependencies: { prod: number; dev: number; optional: number; peer: number; peerOptional: number; total: number };
  };
};

type AllowlistEntry = { package: string; advisory?: string; shipped: boolean; verified: string; reason: string };

function advisory(name: string, id: string, severity: Severity, title: string): Advisory {
  return {
    source: 1000000,
    name,
    dependency: name,
    title,
    url: `https://github.com/advisories/${id}`,
    severity,
    cwe: ['CWE-400'],
    cvss: { score: 0, vectorString: null },
    range: '<=1.0.0',
  };
}

function vulnerable(name: string, severity: Severity, via: (Advisory | string)[], parent?: string): Vulnerability {
  return {
    name,
    severity,
    isDirect: parent === undefined,
    via,
    effects: [],
    range: '<=1.0.0',
    nodes: [parent ? `node_modules/${parent}/node_modules/${name}` : `node_modules/${name}`],
    fixAvailable: true,
  };
}

function report(entries: Vulnerability[]): Report {
  const counts: Record<Severity | 'total', number> = { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 };
  for (const entry of entries) {
    counts[entry.severity] += 1;
    counts.total += 1;
  }
  return {
    auditReportVersion: 2,
    vulnerabilities: Object.fromEntries(entries.map((entry) => [entry.name, entry])),
    metadata: {
      vulnerabilities: counts,
      dependencies: { prod: 700, dev: 500, optional: 10, peer: 0, peerOptional: 0, total: 1210 },
    },
  };
}

function entry(pkg: string, overrides: Partial<AllowlistEntry> = {}): AllowlistEntry {
  return { package: pkg, shipped: false, verified: '2026-11-02', reason: 'build tooling, not in the bundle', ...overrides };
}

function runGate(full: Report | string | null, production: Report | string, entries: AllowlistEntry[]) {
  const dir = mkdtempSync(join(tmpdir(), 'audit-gate-'));
  const paths = { full: join(dir, 'full.json'), production: join(dir, 'production.json'), allowlist: join(dir, 'allowlist.json') };
  if (full !== null) writeFileSync(paths.full, typeof full === 'string' ? full : JSON.stringify(full));
  writeFileSync(paths.production, typeof production === 'string' ? production : JSON.stringify(production));
  writeFileSync(paths.allowlist, JSON.stringify({ entries }));
  const summaryPath = join(dir, 'summary.md');
  writeFileSync(summaryPath, '');

  const run = spawnSync(
    'python3',
    [GATE, '--full', paths.full, '--production', paths.production, '--allowlist', paths.allowlist],
    { encoding: 'utf8', env: { ...process.env, GITHUB_STEP_SUMMARY: summaryPath } }
  );

  return { status: run.status, output: `${run.stdout}${run.stderr}`, summary: readFileSync(summaryPath, 'utf8') };
}

const shellQuote = vulnerable('shell-quote', 'critical', [
  advisory('shell-quote', 'GHSA-w7jw-789q-3m8p', 'critical', 'quote() does not escape newlines'),
]);
const zod = vulnerable('zod', 'high', [advisory('zod', 'GHSA-mrhx-c7xc-m3w5', 'high', 'memory exhaustion')]);
const ws = vulnerable('ws', 'high', [advisory('ws', 'GHSA-96hv-2xvq-fx4p', 'high', 'memory exhaustion')], 'jsdom');
const decodeUriComponent = vulnerable('decode-uri-component', 'high', [
  advisory('decode-uri-component', 'GHSA-vcc3-ghjq-m6fr', 'moderate', 'exponential decoding'),
  advisory('decode-uri-component', 'GHSA-qr28-fpjm-wq7f', 'high', 'quadratic replacement'),
]);
const queryString = vulnerable('query-string', 'high', ['decode-uri-component']);
const expoRouter = vulnerable('expo-router', 'high', ['query-string']);
const linkChain = [decodeUriComponent, queryString, expoRouter];

describe('the audit gate', () => {
  it('fails on a critical advisory that only test tooling pulls in and nobody accepted', () => {
    const result = runGate(report([shellQuote]), report([]), []);

    expect(result.status).toBe(1);
    expect(result.summary).toContain('shell-quote');
    expect(result.summary).toContain('not accepted');
  });

  it('passes a high advisory that only build and test tooling pulls in', () => {
    const result = runGate(report([ws]), report([]), []);

    expect(result.status).toBe(0);
    expect(result.summary).toContain('ws');
  });

  it('fails on a high advisory in the production tree that nobody accepted', () => {
    const result = runGate(report([zod]), report([zod]), []);

    expect(result.status).toBe(1);
    expect(result.summary).toContain('zod');
  });

  it('accepts a critical or high advisory when the package is on the allowlist', () => {
    const result = runGate(report([shellQuote, zod]), report([shellQuote, zod]), [entry('shell-quote'), entry('zod')]);

    expect(result.status).toBe(0);
    expect(result.summary).toContain('build tooling, not in the bundle');
  });

  it.each([
    ['the advisory is accepted', 'GHSA-qr28-fpjm-wq7f', 0],
    ['a different advisory is accepted', 'GHSA-0000-0000-0000', 1],
  ])('judges a chain of packages by the advisory at its root when %s', (_, accepted, status) => {
    const allowlist = [entry('decode-uri-component', { advisory: accepted, shipped: true, reason: 'deep links only' })];

    const result = runGate(report(linkChain), report(linkChain), allowlist);

    expect(result.status).toBe(status);
  });

  it('leaves advisories below the gate out of the decision on a package accepted by advisory', () => {
    const allowlist = [entry('decode-uri-component', { advisory: 'GHSA-qr28-fpjm-wq7f', shipped: true })];

    const result = runGate(report([decodeUriComponent]), report([decodeUriComponent]), allowlist);

    expect(result.status).toBe(0);
    expect(result.summary).not.toContain('unused');
  });

  it('accepts a shipped package only by advisory, never by name', () => {
    const result = runGate(report([decodeUriComponent]), report([decodeUriComponent]), [
      entry('decode-uri-component', { shipped: true }),
    ]);

    expect(result.status).toBe(2);
    expect(result.output).toContain('decode-uri-component');
  });

  it.each([
    ['a reason', { reason: '' }],
    ['a verification date', { verified: 'last week' }],
  ])('refuses an allowlist entry without %s', (_, broken) => {
    const result = runGate(report([zod]), report([zod]), [entry('zod', broken)]);

    expect(result.status).toBe(2);
  });

  it.each([
    ['npm reported an error instead of a tree', JSON.stringify({ error: { code: 'ENOAUDIT', summary: 'registry unreachable' } })],
    ['the report is not JSON', 'npm ERR! network'],
    ['the report is missing', null],
  ])('refuses to pass when %s', (_, full) => {
    const result = runGate(full, report([]), []);

    expect(result.status).toBe(2);
  });

  it("puts npm's own error on the run page when it reported one instead of a tree", () => {
    const result = runGate(JSON.stringify({ error: { code: 'ENOAUDIT', summary: 'registry unreachable' } }), report([]), []);

    expect(result.status).toBe(2);
    expect(result.summary).toContain('registry unreachable');
  });

  it('does not accept a package whose advisory npm did not explain', () => {
    const unexplained = vulnerable('mystery', 'high', []);

    const result = runGate(report([unexplained]), report([unexplained]), []);

    expect(result.status).toBe(1);
    expect(result.summary).toContain('mystery');
  });

  it('names allowlist entries that no longer match an advisory, without failing', () => {
    const result = runGate(report([]), report([]), [entry('shell-quote')]);

    expect(result.status).toBe(0);
    expect(result.summary).toContain('unused');
    expect(result.summary).toContain('shell-quote');
  });
});

describe('the committed allowlist', () => {
  const committed = (JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8')) as { entries: AllowlistEntry[] }).entries;
  const lockfile = JSON.parse(readFileSync(join(APP, 'package-lock.json'), 'utf8')) as { packages: Record<string, unknown> };
  const installed = new Set(Object.keys(lockfile.packages).map((path) => path.replace(/^.*node_modules\//, '')));
  const byPackage = committed.map((each): [string, AllowlistEntry] => [each.package, each]);

  it('has entries', () => {
    expect(committed.length).toBeGreaterThan(0);
  });

  it.each(byPackage)('explains %s, dates the check, and names a package still in the lockfile', (_, each) => {
    expect(each.reason.length).toBeGreaterThan(20);
    expect(each.verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(installed.has(each.package)).toBe(true);
    if (each.advisory !== undefined) expect(each.advisory).toMatch(/^GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}$/);
    if (each.shipped) expect(each.advisory).toBeDefined();
  });

  it('accepts the committed advisories as a whole, through the gate itself', () => {
    const result = runGate(report([]), report([]), committed);

    expect(result.status).toBe(0);
  });
});
