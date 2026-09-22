/**
 * The login cue on the profile slot: for a guest, the child's face warps into
 * a gold login glyph, holds a few seconds and warps back, on a slow loop.
 */

import { LOGIN_CUE, loginCuePose, loginGlyphSize } from '@/constants/login-cue';

describe('loginCuePose', () => {
  it('shows only the face, upright and full size, while the cue is off', () => {
    const underTest = loginCuePose(0, true);

    expect(underTest.avatar).toEqual({ opacity: 1, scale: 1, rotateDeg: 0 });
    expect(underTest.glyph.opacity).toBe(0);
    expect(underTest.highlight).toBe(0);
  });

  it('shows only the glyph, upright and full size, lit gold, while the cue is on', () => {
    const underTest = loginCuePose(1, true);

    expect(underTest.glyph).toEqual({ opacity: 1, scale: 1, rotateDeg: 0 });
    expect(underTest.avatar.opacity).toBe(0);
    expect(underTest.highlight).toBe(1);
  });

  it('turns the face out and the glyph in, each shrinking away and growing in, half way', () => {
    const underTest = loginCuePose(0.5, true);

    expect(underTest.avatar.rotateDeg).toBeCloseTo(-LOGIN_CUE.spinDeg / 2, 6);
    expect(underTest.glyph.rotateDeg).toBeCloseTo(LOGIN_CUE.spinDeg / 2, 6);
    expect(underTest.avatar.scale).toBeLessThan(1);
    expect(underTest.glyph.scale).toBeLessThan(1);
    expect(underTest.avatar.opacity + underTest.glyph.opacity).toBeCloseTo(1, 6);
  });

  it('only cross-fades, with no turn, when motion is reduced', () => {
    const underTest = loginCuePose(0.5, false);

    expect(underTest.avatar.rotateDeg).toBe(0);
    expect(underTest.glyph.rotateDeg).toBe(0);
    expect(underTest.avatar.opacity).toBe(0.5);
  });

  it('never runs past either end', () => {
    expect(loginCuePose(1.4, true)).toEqual(loginCuePose(1, true));
    expect(loginCuePose(-0.3, true)).toEqual(loginCuePose(0, true));
  });
});

describe('the cue rhythm', () => {
  it('holds the glyph a few seconds and leaves a long, calm gap between showings', () => {
    expect(LOGIN_CUE.holdMs).toBeGreaterThanOrEqual(2000);
    expect(LOGIN_CUE.holdMs).toBeLessThanOrEqual(4000);
    expect(LOGIN_CUE.everyMs).toBeGreaterThanOrEqual(15000);
    expect(LOGIN_CUE.warpMs).toBeLessThan(LOGIN_CUE.holdMs);
  });
});

describe('loginGlyphSize', () => {
  // at 450 ms with a quarter turn and a quarter shrink it read as a flicker
  // (operator 2026-09-22: too fast, over stimulating); it now eases over
  // more than a second, tips rather than spins, and barely changes size
  it('turns face to glyph slowly and gently, not in a quick spin', () => {
    expect(LOGIN_CUE.warpMs).toBeGreaterThanOrEqual(1000);
    expect(LOGIN_CUE.spinDeg).toBeLessThanOrEqual(30);
    expect(LOGIN_CUE.avatarShrink).toBeLessThanOrEqual(0.15);
    expect(LOGIN_CUE.glyphGrow).toBeLessThanOrEqual(0.15);
  });

  it('draws the glyph no smaller than the bar\'s other glyphs, whatever the avatar\'s size', () => {
    expect(loginGlyphSize(58)).toBeGreaterThanOrEqual(38);
    expect(loginGlyphSize(40)).toBe(38);
    expect(loginGlyphSize(90)).toBe(Math.round(90 * LOGIN_CUE.glyphRatio));
  });
});
