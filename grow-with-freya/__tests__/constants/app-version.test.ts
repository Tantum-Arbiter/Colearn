/**
 * One version, 1.<minor>.<patch>: a release with new features bumps the minor,
 * a release of fixes bumps the patch, and the major stays at 1. package.json
 * holds it; the Expo config hands it to EAS builds and to over-the-air updates,
 * which only reach binaries of the same version; Grown-ups shows it with the
 * store build beside it.
 */

import path from 'path';
import pkg from '../../package.json';
import { versionLabel } from '@/constants/app-version';

const RELEASE_VERSION = /^1\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

describe('the app version', () => {
  it('is 1.<minor>.<patch>', () => {
    expect(pkg.version).toMatch(RELEASE_VERSION);
  });

  it('is the version the Expo config gives every build and update', () => {
    const { getConfig } = jest.requireActual('@expo/config');
    const { exp } = getConfig(path.resolve(__dirname, '../..'), { skipSDKVersionRequirement: true, isPublicConfig: true });

    expect(exp.version).toBe(pkg.version);
    expect(exp.runtimeVersion).toEqual({ policy: 'appVersion' });
  });

  it('has a script for each bump the scheme allows, and none for the major', () => {
    expect(pkg.scripts['version:minor']).toBe('npm version minor --no-git-tag-version');
    expect(pkg.scripts['version:patch']).toBe('npm version patch --no-git-tag-version');
    expect(Object.keys(pkg.scripts).filter((name) => name.includes('major'))).toEqual([]);
  });

  it.each(['2.0.0', '1.2', '1.02.0', 'v1.2.0', '1.2.0-beta'])('would refuse %s', (version) => {
    expect(version).not.toMatch(RELEASE_VERSION);
  });
});

describe('versionLabel', () => {
  it('puts the store build after the version, the way the App Store lists it', () => {
    expect(versionLabel('1.2.0', '42')).toBe('1.2.0 (42)');
  });

  it('shows the version alone when there is no build to tell', () => {
    expect(versionLabel('1.2.0', null)).toBe('1.2.0');
    expect(versionLabel('1.2.0', '')).toBe('1.2.0');
  });
});
