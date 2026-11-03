import {
  ROADMAP,
  ROADMAP_ART,
  roadmapArtFor,
  roadmapFits,
  roadmapLayout,
  roadmapMirrors,
  roadmapStopFrame,
  roadmapTitleFrame,
  type RoadmapArt,
  type RoadmapFrame,
  type ScreenRect,
} from '@/constants/roadmap';

const PHONE_INSETS = { top: 62, bottom: 34, left: 0, right: 0 };
const TABLET_INSETS = { top: 24, bottom: 20, left: 0, right: 0 };

function controlsFor(width: number, top: number, size: number, margin: number): ScreenRect[] {
  return [
    { left: margin, top, width: size * 1.8, height: size },
    { left: width - margin - size, top, width: size, height: size },
  ];
}

function phone(width: number, height: number): RoadmapFrame {
  return { width, height, insets: PHONE_INSETS, controls: controlsFor(width, PHONE_INSETS.top, 56, 22) };
}

function tablet(width: number, height: number): RoadmapFrame {
  return { width, height, insets: TABLET_INSETS, controls: controlsFor(width, TABLET_INSETS.top + 8, 64, 32) };
}

const SCREENS: [string, RoadmapFrame][] = [
  ['the smallest phone', phone(375, 667)],
  ['the phone in the picture', phone(402, 874)],
  ['the largest phone', phone(440, 956)],
  ['an 11-inch tablet held upright', tablet(834, 1210)],
  ['an 11-inch tablet on its side', tablet(1210, 834)],
  ['a 13-inch tablet held upright', tablet(1032, 1376)],
  ['a 13-inch tablet on its side', tablet(1376, 1032)],
  ['a small tablet held upright', tablet(744, 1133)],
  ['a small tablet on its side', tablet(1133, 744)],
];

function onScreen(rect: { x: number; y: number; width: number; height: number }, at: ReturnType<typeof roadmapLayout>): ScreenRect {
  return {
    left: at.left + rect.x * at.scale,
    top: at.top + rect.y * at.scale,
    width: rect.width * at.scale,
    height: rect.height * at.scale,
  };
}

function overlaps(a: ScreenRect, b: ScreenRect): boolean {
  return a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;
}

function grown(rect: ScreenRect, by: number): ScreenRect {
  return { left: rect.left - by, top: rect.top - by, width: rect.width + by * 2, height: rect.height + by * 2 };
}

describe('roadmapArtFor', () => {
  it.each(SCREENS)('picks the painting shaped most like %s', (_name, frame) => {
    const underTest = roadmapArtFor(frame.width, frame.height);
    const shape = frame.width / frame.height;
    const other = underTest === ROADMAP_ART.phone ? ROADMAP_ART.tablet : ROADMAP_ART.phone;

    expect(Math.abs(Math.log(shape / (underTest.width / underTest.height)))).toBeLessThan(
      Math.abs(Math.log(shape / (other.width / other.height)))
    );
  });

  it.each([
    ['a phone', 402, 874, 'phone'],
    ['a tablet held upright', 834, 1210, 'phone'],
    ['a tablet on its side', 1210, 834, 'tablet'],
    ['a 4:3 screen', 1376, 1032, 'tablet'],
  ])('shows %s the %s painting', (_name, width, height, id) => {
    expect(roadmapArtFor(width, height).id).toBe(id);
  });
});

describe('roadmapLayout', () => {
  describe.each(SCREENS)('on %s', (_name, frame) => {
    const art = roadmapArtFor(frame.width, frame.height);
    const underTest = roadmapLayout(art, frame);
    const safe = {
      left: frame.insets.left + ROADMAP.margin,
      top: frame.insets.top + ROADMAP.margin,
      right: frame.width - frame.insets.right - ROADMAP.margin,
      bottom: frame.height - frame.insets.bottom - ROADMAP.margin,
    };

    it.each([
      ['the portal', art.vortex],
      ['the road map', art.roadmap],
    ])('keeps the whole of %s on screen, inside the safe area', (_part, rect) => {
      const shown = onScreen(rect, underTest);

      expect(shown.left).toBeGreaterThanOrEqual(safe.left - 0.01);
      expect(shown.top).toBeGreaterThanOrEqual(safe.top - 0.01);
      expect(shown.left + shown.width).toBeLessThanOrEqual(safe.right + 0.01);
      expect(shown.top + shown.height).toBeLessThanOrEqual(safe.bottom + 0.01);
    });

    it.each([
      ['the portal', art.vortex],
      ['the road map', art.roadmap],
    ])('keeps %s out from under the Home and sound buttons', (_part, rect) => {
      const shown = onScreen(rect, underTest);

      frame.controls.forEach((control) => expect(overlaps(shown, grown(control, ROADMAP.margin - 0.01))).toBe(false));
    });

    it('never paints it larger than it takes to fill the screen', () => {
      const cover = Math.max(frame.width / art.width, frame.height / art.height);

      expect(underTest.scale).toBeLessThanOrEqual(cover + 1e-9);
      expect(underTest.width).toBeCloseTo(art.width * underTest.scale, 6);
      expect(underTest.height).toBeCloseTo(art.height * underTest.scale, 6);
    });

    it('paints it as large as it can: filling the screen, or one step larger would no longer fit', () => {
      const cover = Math.max(frame.width / art.width, frame.height / art.height);

      expect(roadmapFits(art, frame, underTest.scale)).toBe(true);
      if (underTest.scale < cover) expect(roadmapFits(art, frame, underTest.scale / ROADMAP.shrinkStep)).toBe(false);
    });

    it('leaves no gap at either side when the painting is wider than the screen', () => {
      if (underTest.width < frame.width) return;

      expect(underTest.left).toBeLessThanOrEqual(0.01);
      expect(underTest.left + underTest.width).toBeGreaterThanOrEqual(frame.width - 0.01);
    });

    it('stands the painting on the foot of the screen when it is shorter than the screen, leaving the gap in the plain sky above', () => {
      if (underTest.height >= frame.height) return;

      expect(underTest.top + underTest.height).toBeCloseTo(frame.height, 6);
    });
  });

  it('keeps the portal below the buttons when it sits beneath them, and lets it rise past them when it does not', () => {
    const narrow = roadmapLayout(ROADMAP_ART.phone, phone(402, 874));
    const portal = onScreen(ROADMAP_ART.phone.vortex, narrow);

    expect(portal.top).toBeGreaterThanOrEqual(PHONE_INSETS.top + 56 + ROADMAP.margin - 0.01);

    const wide = tablet(1376, 1032);
    const sideways = roadmapLayout(ROADMAP_ART.tablet, wide);
    const raised = onScreen(ROADMAP_ART.tablet.vortex, sideways);

    expect(raised.top).toBeLessThan(wide.controls[0].top + wide.controls[0].height);
  });

  it.each([
    ['nothing measured', 0, 0],
    ['no width yet', 0, 874],
    ['no height yet', 402, 0],
  ])('draws nothing before the screen has been measured: %s', (_case, width, height) => {
    const underTest = roadmapLayout(ROADMAP_ART.phone, { width, height, insets: PHONE_INSETS, controls: [] });

    expect(underTest).toEqual({ scale: 0, left: 0, top: 0, width: 0, height: 0 });
  });

  it.each([
    ['a screen whose safe area leaves no height at all', { width: 402, height: 90, insets: PHONE_INSETS, controls: [] }],
    ['a screen whose buttons fill its whole height', { width: 402, height: 874, insets: PHONE_INSETS, controls: [{ left: 0, top: 0, width: 402, height: 874 }] }],
  ])('still shows the whole painting, fitted and centred, on %s', (_case, frame) => {
    const art = ROADMAP_ART.phone;
    const contain = Math.min(frame.width / art.width, frame.height / art.height);

    const underTest = roadmapLayout(art, frame);

    expect(underTest).toEqual({
      scale: contain,
      left: (frame.width - art.width * contain) / 2,
      top: (frame.height - art.height * contain) / 2,
      width: art.width * contain,
      height: art.height * contain,
    });
  });

  it('paints a phone`s road map as wide as the screen allows, the margin at each side and no more', () => {
    const frame = phone(402, 874);
    const art = ROADMAP_ART.phone;
    const keepLeft = Math.min(art.vortex.x, art.roadmap.x);
    const keepRight = Math.max(art.vortex.x + art.vortex.width, art.roadmap.x + art.roadmap.width);
    const widest = (frame.width - 2 * ROADMAP.margin) / (keepRight - keepLeft);

    const underTest = roadmapLayout(art, frame);

    expect(underTest.scale).toBeLessThanOrEqual(widest);
    expect(underTest.scale).toBeGreaterThan(widest * ROADMAP.shrinkStep);
  });

  it.each([
    ['the phone in the picture', phone(402, 874)],
    ['the largest phone', phone(440, 956)],
  ])('centres the portal and the road map on %s, not the painting around them', (_name, frame) => {
    const art = ROADMAP_ART.phone;
    const at = roadmapLayout(art, frame);
    const keepLeft = at.left + Math.min(art.vortex.x, art.roadmap.x) * at.scale;
    const keepRight = at.left + Math.max(art.vortex.x + art.vortex.width, art.roadmap.x + art.roadmap.width) * at.scale;

    expect(at.width).toBeGreaterThan(frame.width);
    expect(keepLeft).toBeCloseTo(frame.width - keepRight, 6);
  });
});

describe('ROADMAP.fade', () => {
  it('brings the map in, then its heading after it, and takes both away a little faster', () => {
    const { mapIn, titleIn, titleDelay, out } = ROADMAP.fade;

    expect(titleDelay.duration).toBeGreaterThan(0);
    expect(titleDelay.duration).toBeLessThan(mapIn.duration);
    expect(out.duration).toBeLessThan(mapIn.duration);
    expect(titleIn.duration).toBeGreaterThanOrEqual(mapIn.duration);
  });

  it('keeps a short dissolve under Reduce Motion, the fade being what stands in for motion, with no wait for the heading', () => {
    const { mapIn, titleIn, titleDelay, out } = ROADMAP.fade;

    [mapIn, titleIn, out].forEach((beat) => {
      expect(beat.reducedDuration).toBeGreaterThan(0);
      expect(beat.reducedDuration).toBeLessThan(beat.duration);
    });
    expect(titleDelay.reducedDuration).toBe(0);
  });
});

describe('roadmapMirrors', () => {
  const art = { scale: 1, left: 41, top: 23, width: 1128, height: 846 };

  it('reflects the painting into every gap it leaves, sides and corners, so each edge carries on into its own mirror image', () => {
    const underTest = roadmapMirrors(art, 1210, 834);

    expect(underTest).toEqual([
      { key: 'left', left: 41 - 1128, top: 23, width: 1128, height: 846, flipX: true, flipY: false },
      { key: 'right', left: 41 + 1128, top: 23, width: 1128, height: 846, flipX: true, flipY: false },
      { key: 'top', left: 41, top: 23 - 846, width: 1128, height: 846, flipX: false, flipY: true },
      { key: 'top-left', left: 41 - 1128, top: 23 - 846, width: 1128, height: 846, flipX: true, flipY: true },
      { key: 'top-right', left: 41 + 1128, top: 23 - 846, width: 1128, height: 846, flipX: true, flipY: true },
    ]);
  });

  it('reflects only what is open: a phone painting standing on the foot and running past both sides needs a mirror above it alone', () => {
    const underTest = roadmapMirrors({ scale: 0.454, left: -16.5, top: 114.7, width: 427, height: 759 }, 402, 874);

    expect(underTest.map((mirror) => mirror.key)).toEqual(['top']);
  });

  it('reflects into the lower corners too when the painting has risen off the foot with room at both sides', () => {
    const underTest = roadmapMirrors({ scale: 0.5, left: 20, top: 30, width: 360, height: 700 }, 400, 800);

    expect(underTest.map((mirror) => mirror.key)).toEqual([
      'left',
      'right',
      'top',
      'top-left',
      'top-right',
      'bottom',
      'bottom-left',
      'bottom-right',
    ]);
    expect(underTest.slice(-2)).toEqual([
      { key: 'bottom-left', left: 20 - 360, top: 30 + 700, width: 360, height: 700, flipX: true, flipY: true },
      { key: 'bottom-right', left: 20 + 360, top: 30 + 700, width: 360, height: 700, flipX: true, flipY: true },
    ]);
  });

  it('reflects below a painting that has had to rise off the foot', () => {
    const underTest = roadmapMirrors({ scale: 0.5, left: 0, top: 0, width: 400, height: 700 }, 400, 800);

    expect(underTest.map((mirror) => mirror.key)).toEqual(['bottom']);
    expect(underTest[0]).toEqual(expect.objectContaining({ top: 700, flipY: true, flipX: false }));
  });

  it.each([
    ['the painting covers the screen exactly', { scale: 1, left: 0, top: 0, width: 400, height: 800 }],
    ['the painting runs past every edge', { scale: 1, left: -10, top: -10, width: 420, height: 820 }],
    ['the gaps are under half a point, too thin to see', { scale: 1, left: 0.4, top: 0.3, width: 399.4, height: 799.5 }],
    ['nothing has been measured yet', { scale: 0, left: 0, top: 0, width: 0, height: 0 }],
  ])('needs no mirror when %s', (_case, at) => {
    expect(roadmapMirrors(at, 400, 800)).toEqual([]);
  });
});

describe('roadmapTitleFrame', () => {
  it('puts the heading where the painting keeps room for it, at the painting`s scale', () => {
    const at = { scale: 0.5, left: -10, top: 40, width: 470.5, height: 836 };
    const art = ROADMAP_ART.phone;

    const underTest = roadmapTitleFrame(art, at);

    expect(underTest).toEqual({
      left: -10 + art.title.x * 0.5,
      top: 40 + art.title.y * 0.5,
      width: art.title.width * 0.5,
      height: art.title.height * 0.5,
      fontSize: art.titleSize * 0.5,
    });
  });

  it.each(SCREENS)('keeps the heading on screen, above the road map and below the portal, on %s', (_name, frame) => {
    const art = roadmapArtFor(frame.width, frame.height);
    const at = roadmapLayout(art, frame);
    const title = roadmapTitleFrame(art, at);
    const portal = onScreen(art.vortex, at);
    const road = onScreen(art.roadmap, at);

    expect(title.left).toBeGreaterThanOrEqual(-0.01);
    expect(title.left + title.width).toBeLessThanOrEqual(frame.width + 0.01);
    expect(title.top).toBeGreaterThanOrEqual(portal.top + portal.height - 0.01);
    expect(title.top + title.height).toBeLessThanOrEqual(road.top + 0.01);
    expect(title.fontSize).toBeLessThanOrEqual(title.height);
  });
});

describe('roadmapStopFrame', () => {
  it('puts a name where the painting puts its panel, at the painting`s scale', () => {
    const at = { scale: 0.5, left: -10, top: 40, width: 470.5, height: 836 };
    const stop = ROADMAP_ART.phone.stops[0];

    const underTest = roadmapStopFrame(stop, at);

    expect(underTest).toEqual({
      left: -10 + stop.label.x * 0.5,
      top: 40 + stop.label.y * 0.5,
      width: stop.label.width * 0.5,
      height: stop.label.height * 0.5,
      fontSize: stop.nameSize * 0.5,
    });
  });
});

describe('ROADMAP_ART', () => {
  const ARTS: [string, RoadmapArt][] = [['phone', ROADMAP_ART.phone], ['tablet', ROADMAP_ART.tablet]];

  it.each(ARTS)('sets out the three destinations on the %s painting in order, Q2 to Q4 of 2027', (_name, art) => {
    expect(art.stops.map((stop) => [stop.id, stop.quarter, stop.year])).toEqual([
      ['japanNewZealand', 2, 2027],
      ['franceItaly', 3, 2027],
      ['lapland', 4, 2027],
    ]);
  });

  it.each(ARTS)('places each name on the %s painting inside the road map, left to right, clear of each other', (_name, art) => {
    art.stops.forEach((stop, index) => {
      expect(stop.label.x).toBeGreaterThanOrEqual(art.roadmap.x);
      expect(stop.label.y).toBeGreaterThanOrEqual(art.roadmap.y);
      expect(stop.label.x + stop.label.width).toBeLessThanOrEqual(art.roadmap.x + art.roadmap.width);
      expect(stop.label.y + stop.label.height).toBeLessThanOrEqual(art.roadmap.y + art.roadmap.height);
      if (index > 0) expect(stop.label.x).toBeGreaterThan(art.stops[index - 1].label.x + art.stops[index - 1].label.width);
    });
  });

  it.each([
    ['phone', ROADMAP_ART.phone, '#062468'],
    ['tablet', ROADMAP_ART.tablet, '#0F2060'],
  ])('carries the %s painting`s own night sky, the colour along its top edge', (_name, art, sky) => {
    expect(art.sky).toBe(sky);
  });

  it.each(ARTS)('keeps room for the heading on the %s painting between the bear and the road map, centred on the road map', (_name, art) => {
    expect(art.title.y).toBeGreaterThanOrEqual(art.vortex.y + art.vortex.height);
    expect(art.title.y + art.title.height).toBeLessThanOrEqual(art.roadmap.y);
    expect(art.title.x).toBeGreaterThanOrEqual(art.roadmap.x);
    expect(art.title.x + art.title.width).toBeLessThanOrEqual(art.roadmap.x + art.roadmap.width);
    expect(Math.abs(art.title.x + art.title.width / 2 - (art.roadmap.x + art.roadmap.width / 2))).toBeLessThanOrEqual(10);
    expect(art.titleSize).toBeGreaterThan(art.stops[0].nameSize);
    expect(art.roadmap.y - (art.title.y + art.title.height)).toBeLessThanOrEqual(20);
  });

  it.each(ARTS)('keeps the portal and the road map of the %s painting inside the picture', (_name, art) => {
    [art.vortex, art.roadmap].forEach((rect) => {
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(art.width);
      expect(rect.y + rect.height).toBeLessThanOrEqual(art.height);
    });
  });
});
