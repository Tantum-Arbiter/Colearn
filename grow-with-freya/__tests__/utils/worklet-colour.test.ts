import { rgba } from '@/utils/worklet-colour';

const PLAIN_RGBA = /^rgba\(\d{1,3}, \d{1,3}, \d{1,3}, (0|1|0\.\d{1,3})\)$/;

describe('rgba', () => {
  it.each([
    ['a whole alpha', 1, 'rgba(4, 9, 31, 1)'],
    ['a short fraction', 0.26, 'rgba(4, 9, 31, 0.26)'],
    ['zero', 0, 'rgba(4, 9, 31, 0)'],
    ['a long fraction, kept to three places', 0.123456, 'rgba(4, 9, 31, 0.123)'],
    ['the float residue left when a shade crosses zero', 8.881784197001253e-17, 'rgba(4, 9, 31, 0)'],
    ['a sliver of a fade', 3e-8, 'rgba(4, 9, 31, 0)'],
    ['a negative overshoot', -0.02, 'rgba(4, 9, 31, 0)'],
    ['an overshoot past opaque', 1.3, 'rgba(4, 9, 31, 1)'],
    ['a value that is not a number', Number.NaN, 'rgba(4, 9, 31, 0)'],
  ])('should write %s as a colour Reanimated can parse', (_label, alpha, expected) => {
    const underTest = rgba(4, 9, 31, alpha);

    expect(underTest).toBe(expected);
    expect(underTest).toMatch(PLAIN_RGBA);
  });

  it.each([0.0006, 0.2596, 0.9996, 0.123456])(
    'should never paint %s more strongly than asked, so a tint cannot outgrow its bound',
    (alpha) => {
      const underTest = Number(rgba(4, 9, 31, alpha).slice(15, -1));

      expect(underTest).toBeLessThanOrEqual(alpha);
      expect(alpha - underTest).toBeLessThan(0.001);
    },
  );

  it('should never write an alpha in exponent notation across a whole fade', () => {
    for (let step = 0; step <= 10000; step += 1) {
      const alpha = Math.pow(1 - step / 10000, 7);
      expect(rgba(255, 255, 255, alpha)).toMatch(PLAIN_RGBA);
    }
  });
});
