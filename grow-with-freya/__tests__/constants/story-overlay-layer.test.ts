/**
 * The story sheet rises over the shelf and everything on it, the journey bar
 * included. The bar is drawn at an app-level outlet, and context providers add
 * no native view of their own, so the bar's layer and the story overlay end up
 * as siblings: whichever has the higher zIndex is on top.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { JOURNEY_BAR_LAYER_Z } from '@/components/child-ui/journey-bar-slot';
import { STORY_OVERLAY_LAYER_Z } from '@/constants/story-overlay-layer';

const OWL_GUIDE_LAYER_Z = JOURNEY_BAR_LAYER_Z + 100;
const SUBSCRIPTION_OVERLAY_Z = 2500;

describe('STORY_OVERLAY_LAYER_Z', () => {
  it('should cover the journey bar, so the bar never sits on top of the story sheet', () => {
    expect(STORY_OVERLAY_LAYER_Z).toBeGreaterThan(JOURNEY_BAR_LAYER_Z);
  });

  it('should cover an owl guide too, as it did when guides were drawn inside the page', () => {
    expect(STORY_OVERLAY_LAYER_Z).toBeGreaterThan(OWL_GUIDE_LAYER_Z);
  });

  it('should stay beneath the paywall and the grown-ups check, which open over the sheet', () => {
    expect(STORY_OVERLAY_LAYER_Z).toBeLessThan(SUBSCRIPTION_OVERLAY_Z);
  });

  it('should be what the story overlay is actually drawn at', () => {
    const source = readFileSync(join(__dirname, '../../contexts/story-transition-context.tsx'), 'utf8');
    const overlayStyle = source.slice(source.indexOf('\n  overlay: {'), source.indexOf('\n  },', source.indexOf('\n  overlay: {')));

    expect(overlayStyle).toContain('zIndex: STORY_OVERLAY_LAYER_Z');
    expect(overlayStyle).not.toMatch(/zIndex:\s*\d/);
  });
});
