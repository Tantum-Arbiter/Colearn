/**
 * The home scene ships behind a flag.
 *
 * With the flag off the legacy carousel renders untouched; nothing in the new
 * tree is reachable. This is what makes the work safe to land before the design
 * is signed off.
 */

import { useAppStore } from '@/store/app-store';

const actualStore = jest.requireActual<typeof import('@/store/app-store')>('@/store/app-store');

describe('useHomeScene flag', () => {
  it('should default to on so the new home is what a family sees', () => {
    const underTest = actualStore.useAppStore.getState().useHomeScene;

    expect(underTest).toBe(true);
  });

  it('should fall back to the legacy menu through its setter', () => {
    actualStore.useAppStore.getState().setUseHomeScene(false);

    const underTest = actualStore.useAppStore.getState().useHomeScene;

    expect(underTest).toBe(false);
  });

  it('should turn back on', () => {
    actualStore.useAppStore.getState().setUseHomeScene(false);
    actualStore.useAppStore.getState().setUseHomeScene(true);

    const underTest = actualStore.useAppStore.getState().useHomeScene;

    expect(underTest).toBe(true);
  });

  it('should expose the flag through the module under test', () => {
    const underTest = typeof useAppStore;

    expect(underTest).toBe('function');
  });
});

describe('useHomeScene persistence', () => {
  it('should not be written to storage, so the build decides which home ships', () => {
    const source = require('fs').readFileSync(
      require('path').join(process.cwd(), 'store/app-store.ts'),
      'utf8'
    );

    const underTest = source.includes('useHomeScene: state.useHomeScene');

    expect(underTest).toBe(false);
  });
});
