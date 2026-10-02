import { ISLAND_ART } from '@/constants/island-art';
import { ISLAND_SUN, artFrame, artPoint, islandLayout, type IslandScreen } from '@/constants/island-scene';
import { heroSunScale, sunFrame } from '@/constants/home-sky';

const PHONE: IslandScreen = { width: 390, height: 844, topInset: 47 };
const SMALL_PHONE: IslandScreen = { width: 320, height: 568, topInset: 20 };
const TABLET: IslandScreen = { width: 834, height: 1210, topInset: 24 };
const TABLET_ON_ITS_SIDE: IslandScreen = { width: 1210, height: 834, topInset: 24 };
const SCREENS: [string, IslandScreen][] = [
  ['a phone', PHONE],
  ['a small phone', SMALL_PHONE],
  ['a tablet', TABLET],
  ['a tablet on its side', TABLET_ON_ITS_SIDE],
];

describe('islandLayout', () => {
  describe.each(SCREENS)('on %s', (_name, screen) => {
    const underTest = islandLayout(screen);

    it('covers the whole screen with the picture, in its own shape', () => {
      expect(underTest.picture.left).toBeLessThanOrEqual(0);
      expect(underTest.picture.top).toBeLessThanOrEqual(0);
      expect(underTest.picture.left + underTest.picture.width).toBeGreaterThanOrEqual(screen.width - 0.001);
      expect(underTest.picture.top + underTest.picture.height).toBeGreaterThanOrEqual(screen.height - 0.001);
      expect(underTest.picture.width / underTest.picture.height).toBeCloseTo(ISLAND_ART.width / ISLAND_ART.height, 5);
    });

    it('covers it with no more of the picture than it needs', () => {
      const fitsAcross = Math.abs(underTest.picture.width - screen.width) < 0.001;
      const fitsDown = Math.abs(underTest.picture.height - screen.height) < 0.001;

      expect(fitsAcross || fitsDown).toBe(true);
    });

    it('keeps the sky at the top of the screen', () => {
      expect(underTest.picture.top).toBe(0);
    });

    it('lays the horizon band exactly over its place in the picture', () => {
      expect(underTest.band.left).toBe(underTest.picture.left);
      expect(underTest.band.width).toBe(underTest.picture.width);
      expect(underTest.band.top).toBeCloseTo(underTest.picture.top + ISLAND_ART.bandTop * underTest.scale, 5);
      expect(underTest.band.height).toBeCloseTo((ISLAND_ART.bandBottom - ISLAND_ART.bandTop) * underTest.scale, 5);
    });

    it('stands the sun where the picture has room for it', () => {
      expect(underTest.sun.centreX).toBeCloseTo(underTest.picture.left + ISLAND_ART.sunX * underTest.scale, 5);
      expect(underTest.sun.centreY).toBeCloseTo(underTest.sun.top + underTest.sun.size / 2, 5);
    });

    it('keeps the whole face above the tallest thing in front of it', () => {
      const faceEnds = underTest.sun.top + underTest.sun.size * ISLAND_SUN.faceShare;

      expect(faceEnds).toBeLessThanOrEqual(ISLAND_ART.faceFloor * underTest.scale + 0.001);
    });

    it('sinks the foot of the sun behind the horizon, and no more than the foot', () => {
      const foot = underTest.sun.top + underTest.sun.size;
      const floor = ISLAND_ART.faceFloor * underTest.scale;

      expect(foot).toBeGreaterThan(floor);
      expect(foot - floor).toBeLessThanOrEqual(underTest.sun.size * (1 - ISLAND_SUN.faceShare) + 1);
    });

    it('keeps the top of the sun clear of the status bar', () => {
      expect(underTest.sun.top).toBeGreaterThanOrEqual(screen.topInset);
    });

    it('makes the sun a good deal bigger than it is on the home screen', () => {
      const home = sunFrame(screen.width, screen.topInset, screen.height, heroSunScale(screen.width, screen.height));

      expect(underTest.sun.size).toBeGreaterThanOrEqual(home.size * 1.4);
    });

    it('never makes the sun wider than its share of the shorter side', () => {
      expect(underTest.sun.size).toBeLessThanOrEqual(Math.min(screen.width, screen.height) * ISLAND_SUN.shortSideShare);
    });

    it('cuts the sun off at the line of the sea, so it is never drawn over the water', () => {
      expect(underTest.clipHeight).toBeCloseTo(ISLAND_ART.seaLine * underTest.scale, 5);
      expect(underTest.clipHeight).toBeLessThan(underTest.band.top + underTest.band.height);
    });

    it('cuts none of the face off', () => {
      expect(underTest.clipHeight).toBeGreaterThanOrEqual(ISLAND_ART.faceFloor * underTest.scale);
    });

    it('sets a piece of the painting where it lies in the painting', () => {
      const frame = artFrame({ x: 100, y: 200, width: 50, height: 80 }, underTest);

      expect(frame.left).toBeCloseTo(underTest.picture.left + 100 * underTest.scale, 5);
      expect(frame.top).toBeCloseTo(underTest.picture.top + 200 * underTest.scale, 5);
      expect(frame.width).toBeCloseTo(50 * underTest.scale, 5);
      expect(frame.height).toBeCloseTo(80 * underTest.scale, 5);
    });

    it('lays the band over its own rows as a piece of the painting would be', () => {
      const whole = artFrame({ x: 0, y: ISLAND_ART.bandTop, width: ISLAND_ART.width, height: ISLAND_ART.bandBottom - ISLAND_ART.bandTop }, underTest);

      expect(whole.left).toBeCloseTo(underTest.band.left, 5);
      expect(whole.top).toBeCloseTo(underTest.band.top, 5);
      expect(whole.width).toBeCloseTo(underTest.band.width, 5);
      expect(whole.height).toBeCloseTo(underTest.band.height, 5);
    });

    it('finds a point of the painting on the screen', () => {
      const point = artPoint(ISLAND_ART.sunX, ISLAND_ART.faceFloor, underTest);

      expect(point.x).toBeCloseTo(underTest.sun.centreX, 5);
      expect(point.y).toBeCloseTo(ISLAND_ART.faceFloor * underTest.scale, 5);
    });

    it('starts the sun out of sight below the band, however big it is', () => {
      expect(underTest.sun.top + underTest.riseFrom).toBeGreaterThanOrEqual(underTest.clipHeight);
    });
  });

  it('centres the sun across a screen narrower than the picture', () => {
    const underTest = islandLayout(PHONE);

    expect(underTest.sun.centreX).toBeCloseTo(PHONE.width / 2, 5);
  });

  it('does not slide the picture past its own edge to centre the sun', () => {
    const underTest = islandLayout(TABLET_ON_ITS_SIDE);

    expect(underTest.picture.left).toBe(0);
    expect(underTest.sun.centreX).toBeCloseTo(ISLAND_ART.sunX * underTest.scale, 5);
  });

  it('does not slide the picture past its left edge either, for a sun painted on the left', () => {
    const underTest = islandLayout(PHONE, { ...ISLAND_ART, sunX: 60 });

    expect(underTest.picture.left).toBe(0);
    expect(underTest.sun.centreX).toBeCloseTo(60 * underTest.scale, 5);
  });

  it('holds the sun to its share of the shorter side when the sky has room for more', () => {
    const underTest = islandLayout(TABLET_ON_ITS_SIDE, { ...ISLAND_ART, faceFloor: 900 });

    expect(underTest.sun.size).toBe(Math.floor(TABLET_ON_ITS_SIDE.height * ISLAND_SUN.shortSideShare));
  });

  it.each([
    [0, 844],
    [390, 0],
    [Number.NaN, 844],
    [390, Number.POSITIVE_INFINITY],
    [-390, 844],
  ])('has a layout to draw before the screen is measured (%p by %p)', (width, height) => {
    const underTest = islandLayout({ width, height, topInset: 47 });

    expect(underTest.scale).toBe(0);
    expect(underTest.sun.size).toBe(0);
    expect(underTest.picture).toEqual({ left: 0, top: 0, width: 0, height: 0 });
    expect(underTest.clipHeight).toBe(0);
    expect(artFrame({ x: 100, y: 200, width: 50, height: 80 }, underTest)).toEqual({ left: 0, top: 0, width: 0, height: 0 });
    expect(artPoint(100, 200, underTest)).toEqual({ x: 0, y: 0 });
  });

  it('gives a screen with no room above the horizon a sun of no size rather than a negative one', () => {
    const underTest = islandLayout({ width: 390, height: 844, topInset: 400 });

    expect(underTest.sun.size).toBe(0);
  });

  it('treats a missing inset as none', () => {
    const underTest = islandLayout({ width: 390, height: 844, topInset: Number.NaN });

    expect(underTest.sun.top).toBeGreaterThanOrEqual(0);
    expect(underTest.sun.size).toBeGreaterThan(0);
  });
});
