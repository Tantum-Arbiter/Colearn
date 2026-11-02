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
  head_sha: string;
  pull_requests: { number: number }[];
};

type Job = {
  id: number;
  run_id: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  started_at: string;
  completed_at: string;
  steps: { name: string; number: number; status: string; conclusion: string | null }[];
};

type Annotation = { annotation_level: 'failure' | 'warning' | 'notice'; message: string; title: string; path: string };

type Recorded =
  | Run[]
  | { error: string }
  | { runs: Run[]; jobs?: Record<string, Job[]>; annotations?: Record<string, Annotation[]>; logs?: Record<string, string> };

type Workflow = { file: string; label: string; staleAfterHours?: number; branches?: string[] | 'any'; blocks?: string; blocking?: boolean };
type Group = { name: string; workflows: Workflow[] };
type Config = { title: string; branches: string[]; groups: Group[] };

type Cell = {
  branch: string;
  state: 'green' | 'amber' | 'red' | 'grey';
  summary: string;
  run: { url: string; number: number; title: string; commitUrl: string; prUrl: string | null } | null;
  streak: number;
  streakAtLeast: boolean;
  lastSuccess: { url: string; ago: string } | null;
  history: { total: number; passed: number };
  medianDuration: string;
  overdue: boolean;
  failedJobs: { name: string; url: string; steps: string[]; messages: string[] }[];
};
type Status = {
  generatedAt: string;
  counts: Record<Cell['state'], number>;
  kpis: {
    greenCells: number;
    totalCells: number;
    failing: number;
    failingBlocking: number;
    successRate: { passed: number; total: number };
    longestStreak: { file: string; branch: string; runs: number; atLeast: boolean; lastSuccessAgo: string | null } | null;
    attention: number;
  };
  groups: {
    name: string;
    state: Cell['state'];
    workflows: { file: string; label: string; state: Cell['state']; blocks: string; blocking: boolean; cells: Cell[] }[];
  }[];
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
    head_sha: `sha${id}`,
    pull_requests: [],
    ...overrides,
  };
}

function job(runId: number, name: string, conclusion: string, failedSteps: string[] = []): Job {
  const id = nextId++;
  return {
    id,
    run_id: runId,
    name,
    status: 'completed',
    conclusion,
    html_url: `https://github.com/example/repo/actions/runs/${runId}/job/${id}`,
    created_at: '2026-11-02T11:00:00Z',
    started_at: '2026-11-02T11:01:00Z',
    completed_at: '2026-11-02T11:05:00Z',
    steps: [
      { name: 'Checkout', number: 1, status: 'completed', conclusion: 'success' },
      ...failedSteps.map((step, i) => ({ name: step, number: i + 2, status: 'completed', conclusion: 'failure' })),
    ],
  };
}

function annotation(level: Annotation['annotation_level'], message: string): Annotation {
  return { annotation_level: level, message, title: '', path: '.github' };
}

function config(groups: Group[], branches = ['mvp', 'main']): Config {
  return { title: 'Pipelines', branches, groups };
}

function build(cfg: Config, runs: Record<string, Recorded>) {
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

    expect(cell(result, 'gateway-build.yml', 'main')).toMatchObject({ state: 'grey', summary: expect.stringContaining('never run'), run: null });
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

describe('what the dashboard says about a failure', () => {
  const deployGateway: Workflow = { ...gateway, branches: ['mvp'], blocks: 'the dev gateway deploy', blocking: true };
  const at = (day: number, conclusion = 'success') =>
    run('gateway-build.yml', 'mvp', { conclusion, run_started_at: `2026-10-${day}T10:00:00Z`, updated_at: `2026-10-${day}T10:04:00Z` });

  it('counts the consecutive failures and finds the last pass', () => {
    const runs = [at(31, 'failure'), at(30, 'failure'), at(29, 'timed_out'), at(28), at(27, 'failure')];

    const result = build(config([{ name: 'Gateway', workflows: [deployGateway] }]), { 'gateway-build.yml': runs });

    const found = cell(result, 'gateway-build.yml', 'mvp');
    expect(found.streak).toBe(3);
    expect(found.lastSuccess).toEqual({ url: runs[3].html_url, ago: '5 d ago' });
    expect(found.history).toEqual({ total: 5, passed: 1 });
  });

  it('neither counts nor breaks the streak on a cancelled run in between', () => {
    const runs = [at(31, 'failure'), at(30, 'cancelled'), at(29, 'failure'), at(28)];

    const result = build(config([{ name: 'Gateway', workflows: [deployGateway] }]), { 'gateway-build.yml': runs });

    expect(cell(result, 'gateway-build.yml', 'mvp').streak).toBe(2);
  });

  it('counts no streak and no last pass behind a passing run', () => {
    const result = build(config([{ name: 'Gateway', workflows: [deployGateway] }]), { 'gateway-build.yml': [at(31), at(30, 'failure')] });

    const found = cell(result, 'gateway-build.yml', 'mvp');
    expect(found.streak).toBe(0);
    expect(found.lastSuccess).toBeNull();
    expect(found.failedJobs).toEqual([]);
  });

  it('leaves a run still in progress out of the streak and the history', () => {
    const runs = [run('gateway-build.yml', 'mvp', { status: 'in_progress', conclusion: null }), at(31, 'failure'), at(30, 'failure')];

    const result = build(config([{ name: 'Gateway', workflows: [deployGateway] }]), { 'gateway-build.yml': runs });

    expect(cell(result, 'gateway-build.yml', 'mvp')).toMatchObject({ streak: 2, history: { total: 2, passed: 0 } });
  });

  it('reports the median duration of the recent completed runs', () => {
    const minutes = (n: number) => run('gateway-build.yml', 'mvp', { run_started_at: '2026-11-02T10:00:00Z', updated_at: `2026-11-02T10:${String(n).padStart(2, '0')}:00Z` });

    const result = build(config([{ name: 'Gateway', workflows: [deployGateway] }]), { 'gateway-build.yml': [minutes(9), minutes(2), minutes(4)] });

    expect(cell(result, 'gateway-build.yml', 'mvp').medianDuration).toBe('4 min');
  });

  it('names the failed jobs and steps of the latest run, with a link to their logs', () => {
    const failed = at(31, 'failure');
    const jobs = [job(failed.id, 'Unit tests', 'success'), job(failed.id, 'Deploy', 'failure', ['Deploy to Cloud Run']), job(failed.id, 'Notify', 'skipped')];

    const result = build(config([{ name: 'Gateway', workflows: [deployGateway] }]), {
      'gateway-build.yml': { runs: [failed], jobs: { [failed.id]: jobs } },
    });

    expect(cell(result, 'gateway-build.yml', 'mvp').failedJobs).toEqual([
      { name: 'Deploy', url: jobs[1].html_url, steps: ['Deploy to Cloud Run'], messages: [] },
    ]);
  });

  it('quotes the failure annotations of a failed job as the error summary, warnings left out', () => {
    const failed = at(31, 'failure');
    const deploy = job(failed.id, 'Deploy', 'failure', ['Deploy to Cloud Run']);
    const annotations = [
      annotation('warning', 'Node 20 is reaching end of life'),
      annotation('failure', 'ERROR: (gcloud.run.deploy) PERMISSION_DENIED: the service account lacks run.services.update'),
      annotation('failure', 'Process completed with exit code 1.'),
    ];

    const result = build(config([{ name: 'Gateway', workflows: [deployGateway] }]), {
      'gateway-build.yml': { runs: [failed], jobs: { [failed.id]: [deploy] }, annotations: { [deploy.id]: annotations } },
    });

    expect(cell(result, 'gateway-build.yml', 'mvp').failedJobs[0].messages).toEqual([
      'ERROR: (gcloud.run.deploy) PERMISSION_DENIED: the service account lacks run.services.update',
      'Process completed with exit code 1.',
    ]);
  });

  it('keeps at most three messages, each cut to a line', () => {
    const failed = at(31, 'failure');
    const deploy = job(failed.id, 'Deploy', 'failure', ['Deploy']);
    const annotations = [1, 2, 3, 4].map((n) => annotation('failure', `${n} ${'x'.repeat(300)}`));

    const result = build(config([{ name: 'Gateway', workflows: [deployGateway] }]), {
      'gateway-build.yml': { runs: [failed], jobs: { [failed.id]: [deploy] }, annotations: { [deploy.id]: annotations } },
    });

    const messages = cell(result, 'gateway-build.yml', 'mvp').failedJobs[0].messages;
    expect(messages).toHaveLength(3);
    expect(messages.every((m) => m.length <= 200)).toBe(true);
  });

  it('pulls the telling lines from the failed job log, before the error marker, timestamps dropped', () => {
    const failed = at(31, 'failure');
    const doctor = job(failed.id, 'Build Web App', 'failure', ['Expo doctor']);
    const log = [
      '2026-11-02T15:58:15.6690207Z ##[group]Run npx expo-doctor',
      '2026-11-02T15:58:15.6690481Z npx expo-doctor',
      '2026-11-02T15:58:15.6709767Z ##[endgroup]',
      '2026-11-02T15:58:17.4690038Z Running 21 checks on your project...',
      '2026-11-02T15:58:22.5958156Z 20/21 checks passed. 1 checks failed. Possible issues detected:',
      '2026-11-02T15:58:22.5959745Z ✖ Check that packages match versions required by installed Expo SDK',
      '2026-11-02T15:58:22.5961000Z @expo/metro-runtime      ~57.0.17  57.0.16',
      '2026-11-02T15:58:22.5021364Z ##[error]Process completed with exit code 1.',
      '2026-11-02T15:58:23.0000000Z Post job cleanup.',
    ].join('\n');

    const result = build(config([{ name: 'App', workflows: [{ ...gateway, branches: ['mvp'] }] }]), {
      'gateway-build.yml': {
        runs: [failed],
        jobs: { [failed.id]: [doctor] },
        annotations: { [doctor.id]: [annotation('failure', 'Process completed with exit code 1.')] },
        logs: { [doctor.id]: log },
      },
    });

    expect(cell(result, 'gateway-build.yml', 'mvp').failedJobs[0].messages).toEqual([
      '20/21 checks passed. 1 checks failed. Possible issues detected:',
      '✖ Check that packages match versions required by installed Expo SDK',
      'Process completed with exit code 1.',
    ]);
  });

  it('says a streak is at least the window when every fetched run failed', () => {
    const runs = Array.from({ length: 30 }, (_, i) =>
      run('gateway-build.yml', 'mvp', { conclusion: 'failure', run_started_at: `2026-10-${String(31 - (i % 30)).padStart(2, '0')}T${String(23 - Math.floor(i / 30)).padStart(2, '0')}:00:00Z` })
    );

    const result = build(config([{ name: 'Gateway', workflows: [deployGateway] }]), { 'gateway-build.yml': runs });

    expect(cell(result, 'gateway-build.yml', 'mvp')).toMatchObject({ streak: 30, streakAtLeast: true });
    expect(result.html).toContain('30+ in a row');
  });

  it('links the commit and, when there is one, the pull request', () => {
    const withPr = run('gateway-build.yml', 'mvp', { head_sha: 'abc123', pull_requests: [{ number: 62 }], event: 'pull_request' });

    const result = build(config([{ name: 'Gateway', workflows: [deployGateway] }]), { 'gateway-build.yml': [withPr] });

    expect(cell(result, 'gateway-build.yml', 'mvp').run).toMatchObject({
      commitUrl: 'https://github.com/example/repo/commit/abc123',
      prUrl: 'https://github.com/example/repo/pull/62',
    });
  });

  it('marks a scheduled workflow that never ran as overdue, not merely grey', () => {
    const result = build(config([{ name: 'App', workflows: [nightly] }]), { 'app-e2e-nightly.yml': [] });

    expect(cell(result, 'app-e2e-nightly.yml', 'main')).toMatchObject({ state: 'amber', overdue: true, summary: 'never run, overdue' });
  });

  it('marks a scheduled workflow overdue when nothing ran within its threshold', () => {
    const old = run('app-e2e-nightly.yml', 'main', { conclusion: 'failure', run_started_at: '2026-10-28T02:00:00Z', updated_at: '2026-10-28T02:30:00Z' });

    const result = build(config([{ name: 'App', workflows: [nightly] }]), { 'app-e2e-nightly.yml': [old] });

    expect(cell(result, 'app-e2e-nightly.yml', 'main')).toMatchObject({ state: 'red', overdue: true, summary: expect.stringContaining('overdue') });
  });

  it('carries what a failure blocks onto the workflow', () => {
    const result = build(config([{ name: 'Gateway', workflows: [deployGateway] }]), { 'gateway-build.yml': [at(31, 'failure')] });

    expect(result.json!.groups[0].workflows[0]).toMatchObject({ blocks: 'the dev gateway deploy', blocking: true });
  });

  it('sums the overview: green share, failing and blocking counts, success rate and the longest streak', () => {
    const checks: Workflow = { file: 'checks.yml', label: 'Checks', branches: ['mvp'], blocks: 'nothing by itself', blocking: false };
    const result = build(config([{ name: 'All', workflows: [deployGateway, checks, { ...eas, branches: ['mvp'] }] }]), {
      'gateway-build.yml': [at(31, 'failure'), at(30, 'failure'), at(29)],
      'checks.yml': [run('checks.yml', 'mvp', { conclusion: 'failure' }), run('checks.yml', 'mvp'), run('checks.yml', 'mvp')],
      'deploy-eas.yml': [run('deploy-eas.yml', 'mvp'), run('deploy-eas.yml', 'mvp')],
    });

    expect(result.json!.kpis).toEqual({
      greenCells: 1,
      totalCells: 3,
      failing: 2,
      failingBlocking: 1,
      successRate: { passed: 5, total: 8 },
      longestStreak: { file: 'gateway-build.yml', branch: 'mvp', runs: 2, atLeast: false, lastSuccessAgo: '4 d ago' },
      attention: 0,
    });
  });

  it('puts the failed step, the error line, the streak and what is blocked on the page', () => {
    const failed = at(31, 'failure');
    const deploy = job(failed.id, 'Deploy', 'failure', ['Deploy to Cloud Run']);
    const result = build(config([{ name: 'Gateway', workflows: [deployGateway] }]), {
      'gateway-build.yml': {
        runs: [failed, at(30, 'failure'), at(29)],
        jobs: { [failed.id]: [deploy] },
        annotations: { [deploy.id]: [annotation('failure', 'PERMISSION_DENIED on <service>')] },
      },
    });

    expect(result.html).toContain('Deploy to Cloud Run');
    expect(result.html).toContain('PERMISSION_DENIED on &lt;service&gt;');
    expect(result.html).toContain('2 in a row');
    expect(result.html).toContain('blocks the dev gateway deploy');
    expect(result.html).toContain(deploy.html_url);
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

  it.each(workflows)('says what a failure of %s blocks', (_, workflow) => {
    expect(workflow.blocks!.length).toBeGreaterThan(8);
    expect(typeof workflow.blocking).toBe('boolean');
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
