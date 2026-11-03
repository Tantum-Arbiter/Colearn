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
type Config = { title: string; branches: string[]; groups: Group[]; pagesUrl?: string };

type HistoryRecord = {
  workflow: string;
  branch: string;
  event: string;
  conclusion: string | null;
  startedAt: string;
  duration: number | null;
  number: number;
  url: string;
};
type History = { keptDays: number; updatedAt: string; runs: Record<string, HistoryRecord> };
type Previous = History | { raw: string } | 'missing';

type Rate = { passed: number; total: number; percent: number } | null;
type Trends = {
  runs: number;
  successRate: { '7': Rate; '30': Rate; '90': Rate };
  duration: { runs: number; median: number; p95: number } | null;
  longestStreak: { runs: number; from: string; to: string } | null;
  days: { date: string; state: 'green' | 'amber' | 'red' | 'grey'; runs: number }[];
};

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
  trends: Trends;
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

function record(
  file: string,
  branch: string,
  daysAgo: number,
  conclusion: string | null = 'success',
  overrides: Partial<HistoryRecord> & { id?: number } = {}
): [string, HistoryRecord] {
  const { id = nextId++, ...fields } = overrides;
  const startedAt = new Date(Date.parse(NOW) - Math.round(daysAgo * 86400000)).toISOString().replace('.000Z', 'Z');
  return [
    String(id),
    {
      workflow: file,
      branch,
      event: 'push',
      conclusion,
      startedAt,
      duration: conclusion === null ? null : 240,
      number: id,
      url: `https://github.com/example/repo/actions/runs/${id}`,
      ...fields,
    },
  ];
}

function history(records: [string, HistoryRecord][]): History {
  return { keptDays: 90, updatedAt: '2026-11-01T12:00:00Z', runs: Object.fromEntries(records) };
}

function build(cfg: Config, runs: Record<string, Recorded>, previous?: Previous) {
  const dir = mkdtempSync(join(tmpdir(), 'ci-dashboard-'));
  const paths = { config: join(dir, 'config.json'), runs: join(dir, 'runs.json'), history: join(dir, 'previous.json'), out: join(dir, 'site') };
  writeFileSync(paths.config, JSON.stringify(cfg));
  writeFileSync(paths.runs, JSON.stringify(runs));
  const args = [SCRIPT, '--config', paths.config, '--runs', paths.runs, '--now', NOW, '--out', paths.out];
  if (previous) {
    if (previous !== 'missing') writeFileSync(paths.history, 'raw' in previous ? previous.raw : JSON.stringify(previous));
    args.push('--history', paths.history);
  }

  const result = spawnSync('python3', args, { encoding: 'utf8' });

  const statusPath = join(paths.out, 'status.json');
  const htmlPath = join(paths.out, 'index.html');
  const monitorPath = join(paths.out, 'monitor.html');
  const historyPath = join(paths.out, 'history.json');
  return {
    status: result.status,
    output: `${result.stdout}${result.stderr}`,
    json: existsSync(statusPath) ? (JSON.parse(readFileSync(statusPath, 'utf8')) as Status) : null,
    html: existsSync(htmlPath) ? readFileSync(htmlPath, 'utf8') : '',
    monitor: existsSync(monitorPath) ? readFileSync(monitorPath, 'utf8') : '',
    history: existsSync(historyPath) ? (JSON.parse(readFileSync(historyPath, 'utf8')) as History) : null,
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

describe('what the dashboard remembers', () => {
  const watched = config([{ name: 'Gateway', workflows: [{ ...gateway, branches: ['mvp'] }] }]);
  const spec = (runs: [number, string | null][]) => history(runs.map(([daysAgo, conclusion]) => record('gateway-build.yml', 'mvp', daysAgo, conclusion)));
  const trendsAfter = (previous: History, fetched: Recorded = []) => cell(build(watched, { 'gateway-build.yml': fetched }, previous), 'gateway-build.yml', 'mvp').trends;

  it('publishes history.json with one compact record per run it fetched', () => {
    const done = run('gateway-build.yml', 'mvp');
    const going = run('gateway-build.yml', 'mvp', { status: 'in_progress', conclusion: null, run_started_at: '2026-11-02T11:50:00Z', event: 'schedule' });

    const result = build(watched, { 'gateway-build.yml': [done, going] });

    expect(result.history).toEqual({
      keptDays: 90,
      updatedAt: NOW,
      runs: {
        [done.id]: {
          workflow: 'gateway-build.yml',
          branch: 'mvp',
          event: 'push',
          conclusion: 'success',
          startedAt: '2026-11-02T11:00:00Z',
          duration: 240,
          number: done.run_number,
          url: done.html_url,
        },
        [going.id]: {
          workflow: 'gateway-build.yml',
          branch: 'mvp',
          event: 'schedule',
          conclusion: null,
          startedAt: '2026-11-02T11:50:00Z',
          duration: null,
          number: going.run_number,
          url: going.html_url,
        },
      },
    });
    expect(result.output).toContain('starts from this build');
  });

  it('keeps what it fetched this time for a run it had already seen, and everything else it knew', () => {
    const finished = run('gateway-build.yml', 'mvp');
    const older = record('gateway-build.yml', 'mvp', 40, 'failure');
    const previous = history([record('gateway-build.yml', 'mvp', 0.1, null, { id: finished.id }), older]);

    const result = build(watched, { 'gateway-build.yml': [finished] }, previous);

    expect(result.history!.runs[finished.id]).toMatchObject({ conclusion: 'success', duration: 240 });
    expect(result.history!.runs[older[0]]).toEqual(older[1]);
    expect(Object.keys(result.history!.runs)).toHaveLength(2);
    expect(result.output).not.toContain('starts from this build');
  });

  it.each([
    ['inside', 89.9, true],
    ['past', 90.1, false],
  ])('keeps a record %s the 90-day window: %s days old', (_, daysAgo, kept) => {
    const old = record('gateway-build.yml', 'mvp', daysAgo);

    const result = build(watched, { 'gateway-build.yml': [run('gateway-build.yml', 'mvp')] }, history([old]));

    expect(old[0] in result.history!.runs).toBe(kept);
  });

  it.each<[string, Previous]>([
    ['missing', 'missing'],
    ['not JSON', { raw: '{not json' }],
    ['the wrong shape', { raw: '[1, 2, 3]' }],
    ['without its runs', { raw: '{"keptDays": 90, "runs": "none"}' }],
  ])('starts from this build when the previous history is %s, and says so', (_, previous) => {
    const fetched = run('gateway-build.yml', 'mvp');

    const result = build(watched, { 'gateway-build.yml': [fetched] }, previous);

    expect(result.status).toBe(0);
    expect(Object.keys(result.history!.runs)).toEqual([String(fetched.id)]);
    expect(result.output).toContain('starts from this build');
  });

  it('skips a record it cannot date and keeps the rest', () => {
    const good = record('gateway-build.yml', 'mvp', 3);
    const previous = { ...history([good]), runs: { ...history([good]).runs, '9999': { workflow: 'gateway-build.yml' }, '9998': 'what' } };

    const result = build(watched, { 'gateway-build.yml': [] }, previous as unknown as History);

    expect(Object.keys(result.history!.runs)).toEqual([good[0]]);
  });

  it('reads the previous history back from the published page when no file is given', () => {
    const pages = mkdtempSync(join(tmpdir(), 'ci-dashboard-pages-'));
    const older = record('gateway-build.yml', 'mvp', 3, 'failure');
    writeFileSync(join(pages, 'history.json'), JSON.stringify(history([older])));

    const result = build({ ...watched, pagesUrl: `file://${pages}/` }, { 'gateway-build.yml': [run('gateway-build.yml', 'mvp')] });

    expect(result.history!.runs[older[0]]).toEqual(older[1]);
    expect(Object.keys(result.history!.runs)).toHaveLength(2);
  });

  it('carries on when the page has no history yet', () => {
    const pages = mkdtempSync(join(tmpdir(), 'ci-dashboard-pages-'));

    const result = build({ ...watched, pagesUrl: `file://${pages}/` }, { 'gateway-build.yml': [run('gateway-build.yml', 'mvp')] });

    expect(result.status).toBe(0);
    expect(result.output).toContain('starts from this build');
    expect(Object.keys(result.history!.runs)).toHaveLength(1);
  });

  const third = { passed: 2, total: 3, percent: 67 };
  it.each<[string, [number, string | null][], Trends['successRate']]>([
    ['two runs are too few for a rate', [[1, 'success'], [2, 'success']], { '7': null, '30': null, '90': null }],
    ['three runs this week', [[1, 'success'], [2, 'failure'], [3, 'success']], { '7': third, '30': third, '90': third }],
    [
      'a bad week after a good quarter',
      [[1, 'failure'], [2, 'failure'], [3, 'success'], [10, 'success'], [12, 'success'], [20, 'success'], [40, 'success'], [60, 'success'], [80, 'success']],
      { '7': { passed: 1, total: 3, percent: 33 }, '30': { passed: 4, total: 6, percent: 67 }, '90': { passed: 7, total: 9, percent: 78 } },
    ],
    [
      'a run exactly seven days ago, which counts for the week',
      [[7, 'failure'], [8, 'failure'], [1, 'success'], [2, 'success']],
      { '7': third, '30': { passed: 2, total: 4, percent: 50 }, '90': { passed: 2, total: 4, percent: 50 } },
    ],
    ['a run still going, which does not count, and a cancelled one, which counts against', [[1, null], [2, 'cancelled'], [3, 'success'], [4, 'success']], { '7': third, '30': third, '90': third }],
  ])('rates the last 7, 30 and 90 days: %s', (_, runs, expected) => {
    expect(trendsAfter(spec(runs)).successRate).toEqual(expected);
  });

  it('reports the median and 95th-percentile duration over 30 days, unfinished and older runs left out', () => {
    const minutes = [30, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    const month = minutes.map((n, i) => record('gateway-build.yml', 'mvp', i + 1, 'success', { duration: 60 * n }));
    const previous = history([...month, record('gateway-build.yml', 'mvp', 31, 'success', { duration: 6000 }), record('gateway-build.yml', 'mvp', 0.5, null)]);

    expect(trendsAfter(previous).duration).toEqual({ runs: 10, median: 330, p95: 1800 });
    expect(trendsAfter(spec([[1, null]])).duration).toBeNull();
  });

  it.each<[string, [number, string | null][], Trends['longestStreak']]>([
    ['no failures', [[1, 'success'], [2, 'cancelled']], null],
    [
      'three failures with a cancelled run between them, before a pass',
      [[20, 'success'], [15, 'failure'], [14, 'cancelled'], [13, 'failure'], [12, 'timed_out'], [11, 'success'], [5, 'failure'], [4, 'failure'], [3, 'success']],
      { runs: 3, from: '2026-10-18', to: '2026-10-21' },
    ],
    [
      'the streak still running',
      [[12, 'success'], [11, 'failure'], [10, 'failure'], [5, 'success'], [4, 'failure'], [3, 'failure'], [2, 'startup_failure'], [1, 'failure']],
      { runs: 4, from: '2026-10-29', to: '2026-11-01' },
    ],
  ])('finds the longest failure streak in 90 days: %s', (_, runs, expected) => {
    expect(trendsAfter(spec(runs)).longestStreak).toEqual(expected);
  });

  it('paints the last 14 days by the worst run each day', () => {
    const days = trendsAfter(spec([[14, 'failure'], [13, 'success'], [5.2, 'success'], [5.1, 'failure'], [2, 'cancelled'], [0.9, null], [0.1, 'success']])).days;
    const on = (date: string) => days.find((day) => day.date === date);

    expect(days).toHaveLength(14);
    expect(days[0]).toEqual({ date: '2026-10-20', state: 'green', runs: 1 });
    expect(days[13].date).toBe('2026-11-02');
    expect(on('2026-10-19')).toBeUndefined();
    expect(on('2026-10-25')).toEqual({ date: '2026-10-25', state: 'grey', runs: 0 });
    expect(on('2026-10-28')).toEqual({ date: '2026-10-28', state: 'red', runs: 2 });
    expect(on('2026-10-31')).toEqual({ date: '2026-10-31', state: 'amber', runs: 1 });
    expect(on('2026-11-01')).toEqual({ date: '2026-11-01', state: 'amber', runs: 1 });
    expect(on('2026-11-02')).toEqual({ date: '2026-11-02', state: 'green', runs: 1 });
  });

  it('counts the runs it fetched this time alongside the history', () => {
    const trends = trendsAfter(spec([[1, 'success'], [2, 'success']]), [run('gateway-build.yml', 'mvp', { conclusion: 'failure' })]);

    expect(trends).toMatchObject({ runs: 3, successRate: { '7': { passed: 2, total: 3, percent: 67 } }, longestStreak: { runs: 1, from: '2026-11-02', to: '2026-11-02' } });
  });

  it('keeps each branch to its own runs, and counts every branch for a workflow watched on any', () => {
    const previous = history([
      record('gateway-build.yml', 'mvp', 1),
      record('gateway-build.yml', 'mvp', 2),
      record('gateway-build.yml', 'mvp', 3),
      record('gateway-build.yml', 'main', 1, 'failure'),
      record('deploy-eas.yml', 'release/1.2', 1),
      record('deploy-eas.yml', 'mvp', 2, 'failure'),
      record('deploy-eas.yml', 'main', 3),
    ]);

    const result = build(config([{ name: 'All', workflows: [gateway, eas] }]), { 'gateway-build.yml': [], 'deploy-eas.yml': [] }, previous);

    expect(cell(result, 'gateway-build.yml', 'mvp').trends.successRate['7']).toEqual({ passed: 3, total: 3, percent: 100 });
    expect(cell(result, 'gateway-build.yml', 'main').trends).toMatchObject({ runs: 1, successRate: { '7': null } });
    expect(cell(result, 'deploy-eas.yml', 'any').trends.successRate['7']).toEqual(third);
  });

  it('still shows the trend when the API would not answer this time', () => {
    const both = config([{ name: 'All', workflows: [{ ...gateway, branches: ['mvp'] }, { ...eas, branches: ['mvp'] }] }]);

    const result = build(both, { 'gateway-build.yml': { error: 'HTTP 500' } as unknown as Run[], 'deploy-eas.yml': [run('deploy-eas.yml', 'mvp')] }, spec([[1, 'success'], [2, 'success'], [3, 'failure']]));

    expect(cell(result, 'gateway-build.yml', 'mvp')).toMatchObject({ state: 'grey', trends: { runs: 3, successRate: { '7': third } } });
    expect(Object.keys(result.history!.runs)).toHaveLength(4);
  });

  it('puts a trend line and a 14-day strip under the cell', () => {
    const previous = spec([[1, 'failure'], [2, 'failure'], [3, 'success'], [10, 'success'], [12, 'success'], [20, 'success'], [40, 'success'], [60, 'success'], [80, 'success']]);
    const going = run('gateway-build.yml', 'mvp', { status: 'in_progress', conclusion: null });

    const result = build(watched, { 'gateway-build.yml': [going] }, previous);

    expect(result.html).toContain('7 d: 1 of 3 passed, 33%');
    expect(result.html).toContain('30 d: 4 of 6, 67%');
    expect(result.html).toContain('90 d: 7 of 9, 78%');
    expect(result.html).toContain('median 4 min, p95 4 min');
    expect(result.html).toContain('worst streak 2, 31 Oct–1 Nov');
    expect(result.html.match(/class="day state-/g)).toHaveLength(14);
    expect(result.html).toContain('<span class="day state-red" title="2026-11-01: failing, 1 run">■</span>');
    expect(result.html).toContain('<span class="day state-amber" title="2026-11-02: attention, 1 run">▲</span>');
    expect(result.html).toContain('<span class="day state-grey" title="2026-10-25: no runs">○</span>');
  });

  it('says when there is too little history for a rate, keeps a lone failure off the streak line, and shows nothing for a workflow without any', () => {
    const little = build(watched, { 'gateway-build.yml': [] }, spec([[1, 'failure']]));
    const none = build(watched, { 'gateway-build.yml': [] });

    expect(little.html).toContain('fewer than 3 runs in 90 d, no rate yet');
    expect(little.html).not.toContain('worst streak');
    expect(none.html).not.toContain('class="day ');
    expect(none.html).not.toContain('class="trend"');
  });
});

describe('the wall monitor', () => {
  const wall = config([
    { name: 'Gateway', workflows: [{ ...gateway, branches: ['mvp'] }] },
    { name: 'App', workflows: [{ ...eas, branches: ['mvp'] }, nightly] },
  ]);
  const failed = run('gateway-build.yml', 'mvp', { conclusion: 'failure', display_title: 'fix: <thing>', html_url: 'https://github.com/example/repo/actions/runs/777' });
  const deploy = job(failed.id, 'Deploy', 'failure', ['Deploy to Cloud Run']);
  const runs = {
    'gateway-build.yml': { runs: [failed, run('gateway-build.yml', 'mvp', { conclusion: 'failure', run_started_at: '2026-11-01T11:00:00Z' })], jobs: { [failed.id]: [deploy] } },
    'deploy-eas.yml': [run('deploy-eas.yml', 'mvp', { status: 'in_progress' as const, conclusion: null })],
    'app-e2e-nightly.yml': [],
  };

  it('writes monitor.html with one tile per cell: the workflow, the branch, the state as colour, shape and word', () => {
    const result = build(wall, runs);

    expect(result.monitor.match(/class="tile state-/g)).toHaveLength(3);
    expect(result.monitor).toContain('class="tile state-red"');
    expect(result.monitor).toContain('Gateway build and deploy');
    expect(result.monitor).toContain('■</span> failing</span>');
    expect(result.monitor).toContain('class="tile state-amber running"');
    expect(result.monitor).toContain('▲</span> running');
    expect(result.monitor).toContain('class="tile state-amber overdue"');
    expect(result.monitor).toContain('▲</span> never run</span>');
    expect(result.monitor).toContain('<span class="note">overdue</span>');
  });

  it('says on a red tile how many in a row, what failed where, and links the run', () => {
    const result = build(wall, runs);

    expect(result.monitor).toContain('2 in a row');
    expect(result.monitor).toContain(`<a href="${deploy.html_url}">Deploy</a> › Deploy to Cloud Run`);
    expect(result.monitor).toContain('href="https://github.com/example/repo/actions/runs/777"');
    expect(result.monitor).toContain('run #');
    expect(result.monitor).toContain('&lt;thing&gt;');
    expect(result.monitor).not.toContain('<thing>');
  });

  it('carries the 14-day strip onto every tile with history, and nothing onto one without', () => {
    const result = build(wall, runs);

    expect(result.monitor.match(/class="day state-/g)).toHaveLength(28);
  });

  it.each([
    [1, 1],
    [2, 2],
    [4, 2],
    [5, 3],
    [9, 3],
    [12, 4],
    [13, 4],
    [16, 4],
    [17, 5],
  ])('lays %s tiles out in %s columns', (cells, columns) => {
    const workflows = Array.from({ length: cells }, (_, i) => ({ file: `w${i}.yml`, label: `W${i}`, branches: ['mvp'] }));

    const result = build(config([{ name: 'All', workflows }]), Object.fromEntries(workflows.map((w) => [w.file, []])));

    expect(result.monitor).toContain(`--columns: ${columns};`);
  });

  it('shares the headline with the detailed page, and each page links the other', () => {
    const result = build(wall, runs);

    expect(result.monitor).toContain('1 failing, 2 need attention');
    expect(result.monitor).toContain('href="index.html"');
    expect(result.html).toContain('href="monitor.html"');
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

  it('names the page it reads its history back from', () => {
    expect(committed.pagesUrl).toMatch(/^https:\/\/[a-z0-9-]+\.github\.io\/Colearn\/$/);
  });

  it('is accepted by the generator', () => {
    const result = build(committed, {}, 'missing');

    expect(result.status).toBe(0);
    expect(result.json!.groups).toHaveLength(committed.groups.length);
  });

  it('lists in the workflow exactly the workflows it watches, by name', () => {
    const dashboard = readFileSync(join(REPO, '.github', 'workflows', 'ci-dashboard.yml'), 'utf8');
    const names = workflows.map(([file]) => readFileSync(join(REPO, '.github', 'workflows', file), 'utf8').match(/^name:\s*(.+)$/m)![1].trim());

    for (const name of names) expect(dashboard).toContain(`"${name}"`);
  });
});
