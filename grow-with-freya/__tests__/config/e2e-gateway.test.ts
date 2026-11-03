/**
 * An E2E build carries a seeded, unsigned session, and it must only ever talk
 * to the stubbed gateway on the machine running it. A release build reads
 * `.env.production`, so without a guard it quietly points at the live API.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');

function appConfig(env: Record<string, string | undefined>) {
  const source = readFileSync(join(ROOT, 'app.config.js'), 'utf8').replace('export default', 'return');
  return new Function('require', 'process', source)((path: string) => require(join(ROOT, path)), { env });
}

function buildProperties(env: Record<string, string | undefined>) {
  const plugin = appConfig(env).expo.plugins.find(
    (entry: unknown) => Array.isArray(entry) && entry[0] === 'expo-build-properties'
  );
  return plugin[1];
}

describe('The gateway an E2E build talks to', () => {
  it.each([
    'https://api.colearnwithfreya.co.uk',
    'https://api.earlyroots.co.uk',
    'http://example.com:8080',
    'http://localhost.example.com:8080',
  ])('refuses %s', (url) => {
    expect(() => appConfig({ EXPO_PUBLIC_E2E: '1', EXPO_PUBLIC_GATEWAY_URL: url })).toThrow(/local gateway/);
  });

  it.each(['http://localhost:8080', 'http://127.0.0.1:8080', 'http://10.0.2.2:8080'])('accepts the stub at %s', (url) => {
    expect(appConfig({ EXPO_PUBLIC_E2E: '1', EXPO_PUBLIC_GATEWAY_URL: url }).expo.extra.gatewayUrl).toBe(url);
  });

  it('leaves every other build on the gateway it was given', () => {
    const config = appConfig({ EXPO_PUBLIC_GATEWAY_URL: 'https://api.colearnwithfreya.co.uk' });
    expect(config.expo.extra.gatewayUrl).toBe('https://api.colearnwithfreya.co.uk');
  });
});

describe('Plain HTTP on Android', () => {
  it('is allowed in an E2E build, so the stub on the host can answer', () => {
    expect(buildProperties({ EXPO_PUBLIC_E2E: '1', EXPO_PUBLIC_GATEWAY_URL: 'http://localhost:8080' }).android).toEqual({
      usesCleartextTraffic: true,
    });
  });

  it('is left alone in every other build', () => {
    expect(buildProperties({}).android).toBeUndefined();
    expect(buildProperties({ EXPO_PUBLIC_APP_ENV: 'production' }).android).toBeUndefined();
  });
});
