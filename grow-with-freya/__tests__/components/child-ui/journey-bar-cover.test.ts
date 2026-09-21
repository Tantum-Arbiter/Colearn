/**
 * The overlays that cover the bar (the plans, the trial's end) are imported by
 * pages the bar's own module chain reaches. If this module imported anything
 * of the app's, the chain closed into a loop and, on device, the hook arrived
 * undefined and the whole screen stopped taking taps. It depends on React
 * alone; this keeps it so.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('journey-bar-cover', () => {
  it('imports nothing but React', () => {
    const source = readFileSync(join(__dirname, '../../../components/child-ui/journey-bar-cover.tsx'), 'utf8');

    const imports = [...source.matchAll(/from '([^']+)'/g)].map((match) => match[1]);

    expect(imports).toEqual(['react']);
  });
});
