/**
 * The app is Early Roots wherever a family can read its name: the home screen,
 * notifications, share messages, the tours in every language, and the terms.
 * The old name survives only in identifiers the stores and EAS are bound to
 * (com.growwithfreya.app, the grow-with-freya slug, the growwithfreya scheme).
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = join(__dirname, '../..');
const SOURCES = ['app', 'components', 'services', 'hooks', 'constants', 'contexts', 'locales', 'utils', 'store'];
const OLD_NAME = /grow\s+with(\s|\\n)+freya|colearn\s+with\s+freya|growwithfreya\.com/i;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : files(path);
    return /\.(ts|tsx|js)$/.test(name) ? [path] : [];
  });
}

describe('the app name', () => {
  it('is never Grow with Freya in anything a family can read', () => {
    const named = [...SOURCES.flatMap((dir) => files(join(ROOT, dir))), join(ROOT, 'app.config.js')]
      .flatMap((path) =>
        readFileSync(path, 'utf8')
          .split('\n')
          .map((line, index) => ({ line, at: `${relative(ROOT, path)}:${index + 1}` }))
      )
      .filter(({ line }) => OLD_NAME.test(line))
      .map(({ at, line }) => `${at}: ${line.trim().slice(0, 80)}`);

    expect(named).toEqual([]);
  });

  it('is Early Roots under the icon on a store build', () => {
    const { getConfig } = jest.requireActual('@expo/config');
    const { exp } = getConfig(ROOT, { skipSDKVersionRequirement: true, isPublicConfig: true });

    expect(exp.name).toBe('Early Roots');
  });

  it('keeps the identifiers the stores and EAS are bound to', () => {
    const { getConfig } = jest.requireActual('@expo/config');
    const { exp } = getConfig(ROOT, { skipSDKVersionRequirement: true, isPublicConfig: true });

    expect(exp.ios.bundleIdentifier).toBe('com.growwithfreya.app');
    expect(exp.android.package).toBe('com.growwithfreya.app');
    expect(exp.slug).toBe('grow-with-freya');
  });
});
