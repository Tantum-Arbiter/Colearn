/**
 * The pipeline dashboard on GitHub Pages reads the latest run of each watched
 * workflow per branch and paints it green, amber, red or grey. The rules live
 * in .github/scripts/ci-dashboard.py; this test drives them with synthetic runs
 * shaped like the Actions API, and keeps .github/ci-dashboard.json honest.
 */

import { spawnSync } from 'child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const REPO = join(__dirname, '..', '..', '..');
const SCRIPT = join(REPO, '.github', 'scripts', 'ci-dashboard.py');
const CONFIG_PATH = join(REPO, '.github', 'ci-dashboard.json');
const NOW = '2026-11-02T12:00:00Z';

type Run = {
  id: number;
  name: string;
  path: string;
  head_branch: string;
  event: string;
  status: 'completed' | 'in_progress' | 'queued' | 'waiting';
  conclusion: string | null;
  run_number: number;
  run_attempt: number;
  run_started_at: string;
  updated_at: string;
  created_at: string;
  html_url: string;
  display_title: string;
};

type Workflow = { file: string; label: string; staleAfterHours?: number; branches?: string[] | 'any' };
type Group = { name: string; workflows: Workflow[] };
type Config = { title: string; branches: string[]; groups: Group[] };

type Cell = {
  branch: string;
  state: 'green' | 'amber' | 'red' | 'grey';
  summary: string;
  run: { url: string; number: number; title: string } | null;
};
type Status = {
  generatedAt: string;
  counts: Record<Cell['state'], number>;
  groups: { name: string; state: Cell['state']; workflows: { file: string; label: string; state: Cell['state']; cells: Cell[] }[] }[];
};

let nextId = 1;

function run(file: string, branch: string, overrides: Partial<Run> = {}): Run {
  const id = nextId++;
  const startedAt = overrides.run_started_at ?? '2026-11-02T11:00:00Z';
  return {
    id,
    name: file,
    path: `.github/workflows/${file}`,
    head_branch: branch,
    event: 'push',
    status: 'completed',
    conclusion: 'success',
    run_number: id,
    run_attempt: 1,
    run_started_at: startedAt,
    updated_at: overrides.updated_at ?? startedAt.replace('11:00', '11:04'),
    created_at: startedAt,
    html_url: `https://github.com/example/repo/actions/runs/${id}`,
    display_title: `run ${id}`,
    ...overrides,
  };
}

function config(groups: Group[], branches = ['mvp', 'main']): Config {
  return { title: 'Pipelines', branches, groups };
}

function build(cfg: Config, runs: Record<string, Run[]>) {
  const dir = mkdtempSync(join(tmpdir(), 'ci-dashboard-'));
  const paths = { config: join(dir, 'config.json'), runs: join(dir, 'runs.json'), out: join(dir, 'site') };
  writeFileSync(paths.config, JSON.stringify(cfg));
  writeFileSync(paths.runs, JSON.stringify(runs));

  const result = spawnSync('python3', [SCRIPT, '--config', paths.config, '--runs', paths.runs, '--now', NOW, '--out', paths.out], {
    encoding: 'utf8',
  });

  const statusPath = join(paths.out, 'status.json');
  const htmlPath = join(paths.out, 'index.html');
  return {
    status: result.status,
    output: `${result.stdout}${result.stderr}`,
    json: existsSync(statusPath) ? (JSON.parse(readFileSync(statusPath, 'utf8')) as Status) : null,
    html: existsSync(htmlPath) ? readFileSync(htmlPath, 'utf8') : '',
  };
}

const gateway: Workflow = { file: 'gateway-build.yml', label: 'Gateway build and deploy' };
const nightly: Workflow = { file: 'app-e2e-nightly.yml', label: 'Nightly journeys', staleAfterHours: 36, branches: ['main'] };
const eas: Workflow = { file: 'deploy-eas.yml', label: 'EAS build', branches: 'any' };

function cell(result: ReturnType<typeof build>, file: string, branch: string): Cell {
  const workflow = result.json!.groups.flatMap((g) => g.workflows).find((w) => w.file === file)!;
  return workflow.cells.find((c) => c.branch === branch)!;
}

describe('the pipeline dashboard', () => {
  it.each([
    ['a passing run', {}, 'green', 'passing'],
    ['a failed run', { conclusion: 'failure' }, 'red', 'failing'],
    ['a timed-out run', { conclusion: 'timed_out' }, 'red', 'timed out'],
    ['a run that could not start', { conclusion: 'startup_failure' }, 'red', 'could not start'],
    ['a cancelled run', { conclusion: 'cancelled' }, 'amber', 'cancelled'],
    ['a run in progress', { status: 'in_progress' as const, conclusion: null }, 'amber', 'running'],
    ['a queued run', { status: 'queued' as const, conclusion: null }, 'amber', 'queued'],
  ])('paints %s', (_, overrides, state, word) => {
    const result = build(config([{ name: 'Gateway', workflows: [gateway] }]), {
      'gateway-build.yml': [run('gateway-build.yml', 'mvp', overrides)],
    });

    expect(result.status).toBe(0);
    expect(cell(result, 'gateway-build.yml', 'mvp').state).toBe(state);
    expect(cell(result, 'gateway-build.yml', 'mvp').summary).toContain(word);
  });

  it('paints a branch with no runs grey', () => {
    const result = build(config([{ name: 'Gateway', workflows: [gateway] }]), {
      'gateway-build.yml': [run('gateway-build.yml', 'mvp')],
    });

    expect(cell(result, 'gateway-build.yml', 'main')).toMatchObject({ state: 'grey', summary: expect.stringContaining('no runs'), run: null });
  });

  it.each([
    ['fresh', '2026-11-01T02:00:00Z', 'green'],
    ['older than its threshold', '2026-10-30T02:00:00Z', 'amber'],
  ])('judges a scheduled workflow stale when its last pass is %s', (_, startedAt, state) => {
    const result = build(config([{ name: 'App', workflows: [nightly] }]), {
      'app-e2e-nightly.yml': [run('app-e2e-nightly.yml', 'main', { event: 'schedule', run_started_at: startedAt, updated_at: startedAt })],
    });

    expect(cell(result, 'app-e2e-nightly.yml', 'main').state).toBe(state);
  });

  it('says how old a stale pass is', () => {
    const result = build(config([{ name: 'App', workflows: [nightly] }]), {
      'app-e2e-nightly.yml': [run('app-e2e-nightly.yml', 'main', { run_started_at: '2026-10-30T02:00:00Z', updated_at: '2026-10-30T02:30:00Z' })],
    });

    expect(cell(result, 'app-e2e-nightly.yml', 'main').summary).toContain('3 d ago');
  });

  it('shows only the branches a workflow names', () => {
    const result = build(config([{ name: 'App', workflows: [nightly] }]), { 'app-e2e-nightly.yml': [] });

    expect(result.json!.groups[0].workflows[0].cells.map((c) => c.branch)).toEqual(['main']);
  });

  it('judges each branch by its own latest run, whatever other branches did since', () => {
    const result = build(config([{ name: 'Gateway', workflows: [gateway] }]), {
      'gateway-build.yml': [
        run('gateway-build.yml', 'feature/x', { conclusion: 'failure', run_started_at: '2026-11-02T11:30:00Z' }),
        run('gateway-build.yml', 'mvp', { run_started_at: '2026-11-02T10:00:00Z', display_title: 'the newest run on mvp' }),
        run('gateway-build.yml', 'mvp', { conclusion: 'failure', run_started_at: '2026-11-01T10:00:00Z' }),
      ],
    });

    expect(cell(result, 'gateway-build.yml', 'mvp').state).toBe('green');
    expect(cell(result, 'gateway-build.yml', 'mvp').run?.title).toBe('the newest run on mvp');
  });

  it('takes the latest run from any branch for a manual workflow', () => {
    const result = build(config([{ name: 'App', workflows: [eas] }]), {
      'deploy-eas.yml': [
        run('deploy-eas.yml', 'release/1.2', { event: 'workflow_dispatch', run_started_at: '2026-11-01T09:00:00Z' }),
        run('deploy-eas.yml', 'mvp', { event: 'workflow_dispatch', conclusion: 'failure', run_started_at: '2026-10-20T09:00:00Z' }),
      ],
    });

    const cells = result.json!.groups[0].workflows[0].cells;
    expect(cells).toHaveLength(1);
    expect(cells[0]).toMatchObject({ branch: 'any', state: 'green' });
    expect(cells[0].summary).toContain('release/1.2');
  });

  it.each([
    ['green and amber', ['success', 'cancelled'], 'amber'],
    ['green, red and amber', ['success', 'failure', 'cancelled'], 'red'],
    ['grey and green', [null, 'success'], 'green'],
    ['only grey', [null], 'grey'],
  ])('paints a group the worst of its cells: %s', (_, conclusions, state) => {
    const workflows = conclusions.map((_, i) => ({ file: `w${i}.yml`, label: `W${i}`, branches: ['mvp'] }));
    const runs = Object.fromEntries(
      conclusions.map((conclusion, i) => [`w${i}.yml`, conclusion === null ? [] : [run(`w${i}.yml`, 'mvp', { conclusion })]])
    );

    const result = build(config([{ name: 'Mixed', workflows }]), runs);

    expect(result.json!.groups[0].state).toBe(state);
  });

  it('counts the cells by state', () => {
    const result = build(config([{ name: 'Gateway', workflows: [gateway] }]), {
      'gateway-build.yml': [run('gateway-build.yml', 'mvp'), run('gateway-build.yml', 'main', { conclusion: 'failure' })],
    });

    expect(result.json!.counts).toEqual({ green: 1, amber: 0, red: 1, grey: 0 });
    expect(result.json!.generatedAt).toBe(NOW);
  });

  it('writes a page that names every workflow, its state in words, and links the run', () => {
    const result = build(config([{ name: 'Gateway', workflows: [gateway] }]), {
      'gateway-build.yml': [
        run('gateway-build.yml', 'mvp', {
          conclusion: 'failure',
          display_title: 'fix(gateway): <refresh>',
          html_url: 'https://github.com/example/repo/actions/runs/777',
        }),
      ],
    });

    expect(result.html).toContain('Gateway build and deploy');
    expect(result.html).toContain('failing');
    expect(result.html).toContain('https://github.com/example/repo/actions/runs/777');
    expect(result.html).toContain('&lt;refresh&gt;');
    expect(result.html).not.toContain('<refresh>');
  });

  it('paints a workflow the API would not give grey, and still publishes the rest', () => {
    const result = build(config([{ name: 'Gateway', workflows: [gateway, { ...eas, branches: ['mvp'] }] }]), {
      'gateway-build.yml': { error: 'HTTP 500' } as unknown as Run[],
      'deploy-eas.yml': [run('deploy-eas.yml', 'mvp')],
    });

    expect(result.status).toBe(0);
    expect(cell(result, 'gateway-build.yml', 'mvp')).toMatchObject({ state: 'grey', summary: 'unavailable (HTTP 500)' });
    expect(cell(result, 'deploy-eas.yml', 'mvp').state).toBe('green');
  });

  it('writes nothing when every workflow is unavailable, so the last page stands', () => {
    const result = build(config([{ name: 'Gateway', workflows: [gateway] }]), {
      'gateway-build.yml': { error: 'HTTP 503' } as unknown as Run[],
    });

    expect(result.status).toBe(1);
    expect(result.json).toBeNull();
    expect(result.output).toContain('unavailable (HTTP 503)');
  });

  it('refuses to run without a readable config', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ci-dashboard-'));

    const result = spawnSync('python3', [SCRIPT, '--config', join(dir, 'missing.json'), '--runs', join(dir, 'missing.json'), '--out', join(dir, 'site')], {
      encoding: 'utf8',
    });

    expect(result.status).toBe(2);
  });
});

describe('the committed dashboard config', () => {
  const committed = JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) as Config;
  const workflows = committed.groups.flatMap((group) => group.workflows.map((w): [string, Workflow] => [w.file, w]));

  it('watches the gateway deploy, the functional checks and the app builds', () => {
    const files = workflows.map(([file]) => file);

    expect(files).toEqual(expect.arrayContaining(['gateway-build.yml', 'backend-checks.yml', 'deploy-eas.yml', 'app-e2e-nightly.yml']));
    expect(committed.branches).toEqual(['mvp', 'main']);
  });

  it.each(workflows)('names a workflow file that exists and labels it: %s', (file, workflow) => {
    expect(existsSync(join(REPO, '.github', 'workflows', file))).toBe(true);
    expect(workflow.label.length).toBeGreaterThan(3);
  });

  it('is accepted by the generator', () => {
    const result = build(committed, {});

    expect(result.status).toBe(0);
    expect(result.json!.groups).toHaveLength(committed.groups.length);
  });

  it('lists in the workflow exactly the workflows it watches, by name', () => {
    const dashboard = readFileSync(join(REPO, '.github', 'workflows', 'ci-dashboard.yml'), 'utf8');
    const names = workflows.map(([file]) => readFileSync(join(REPO, '.github', 'workflows', file), 'utf8').match(/^name:\s*(.+)$/m)![1].trim());

    for (const name of names) expect(dashboard).toContain(`"${name}"`);
  });
});
