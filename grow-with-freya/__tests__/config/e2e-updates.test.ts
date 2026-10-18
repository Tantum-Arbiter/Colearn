/**
 * An E2E build runs the JavaScript it was built with. A release build with
 * over-the-air updates switched on would ask Expo's update server for a newer
 * bundle as it starts, and the journeys would then test whatever was last
 * published instead of the commit under test.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');

function appConfig(env: Record<string, string | undefined>) {
  const source = readFileSync(join(ROOT, 'app.config.js'), 'utf8').replace('export default', 'return');
  return new Function('require', 'process', source)((path: string) => require(join(ROOT, path)), { env });
}

describe('Over-the-air updates', () => {
  it('are switched off in an E2E build', () => {
    expect(appConfig({ EXPO_PUBLIC_E2E: '1' }).expo.updates.enabled).toBe(false);
  });

  it('stay on in every other build', () => {
    for (const env of [{}, { EXPO_PUBLIC_E2E: '0' }, { EXPO_PUBLIC_APP_ENV: 'production' }]) {
      expect(appConfig(env).expo.updates.enabled).toBe(true);
    }
  });

  it('keep pointing at the project update server', () => {
    expect(appConfig({ EXPO_PUBLIC_E2E: '1' }).expo.updates.url).toBe(
      'https://u.expo.dev/439b6b2f-be5f-4d59-98eb-73befbd1973e'
    );
  });
});
