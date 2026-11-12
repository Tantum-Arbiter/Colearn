/**
 * Voice recordings stay on the phone. Android's Auto Backup would copy the
 * app's files, recordings included, to the family's Google Drive and onto a
 * new phone, so the app opts out of it.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');

function appConfig() {
  const source = readFileSync(join(ROOT, 'app.config.js'), 'utf8').replace('export default', 'return');
  return new Function('require', 'process', source)((path: string) => require(join(ROOT, path)), process);
}

describe('Android backup', () => {
  it('is switched off, so recordings never leave the phone', () => {
    expect(appConfig().expo.android.allowBackup).toBe(false);
  });
});
