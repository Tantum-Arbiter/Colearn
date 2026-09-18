export const FORBIDDEN_ENV_VARS: readonly string[] = [
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'OPENAI_API_KEY',
  'CODEX_API_KEY',
  'AZURE_OPENAI_API_KEY',
  'CLAUDE_CODE_USE_BEDROCK',
  'CLAUDE_CODE_USE_VERTEX',
  'CLAUDE_CODE_USE_FOUNDRY',
  'AWS_BEARER_TOKEN_BEDROCK',
];

const FORBIDDEN_PATTERN = /^(ANTHROPIC|OPENAI|CODEX|CLAUDE)_(?:.*_)?(API_KEY|AUTH_TOKEN)$/;

export const PASSTHROUGH_ENV_VARS: readonly string[] = [
  'HOME',
  'USER',
  'LOGNAME',
  'PATH',
  'SHELL',
  'TMPDIR',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
];

export type ProfileVar = 'CLAUDE_CONFIG_DIR' | 'CODEX_HOME';

export class ForbiddenEnvError extends Error {
  readonly names: string[];

  constructor(names: string[]) {
    super(
      `Refusing to start a worker: paid-API credentials are set in the environment (${names.join(', ')}). ` +
        'Workers run on subscription logins only. Unset these variables and try again.',
    );
    this.name = 'ForbiddenEnvError';
    this.names = names;
  }
}

export function findForbiddenEnv(env: NodeJS.ProcessEnv): string[] {
  return Object.keys(env)
    .filter((name) => FORBIDDEN_ENV_VARS.includes(name) || FORBIDDEN_PATTERN.test(name))
    .filter((name) => (env[name] ?? '') !== '')
    .sort();
}

export function buildWorkerEnv(
  parent: NodeJS.ProcessEnv,
  profile: { name: ProfileVar; dir: string } | null,
): Record<string, string> {
  const forbidden = findForbiddenEnv(parent);
  if (forbidden.length > 0) {
    throw new ForbiddenEnvError(forbidden);
  }
  const env: Record<string, string> = {};
  for (const name of PASSTHROUGH_ENV_VARS) {
    const value = parent[name];
    if (value !== undefined && value !== '') {
      env[name] = value;
    }
  }
  env.TERM = 'dumb';
  env.NO_COLOR = '1';
  if (profile !== null) {
    env[profile.name] = profile.dir;
  }
  return env;
}
