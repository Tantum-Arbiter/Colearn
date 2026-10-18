import React from 'react';
import { StyleSheet } from 'react-native';
import { act, render } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { RoadmapScene } from '@/components/island/roadmap-scene';
import { ROADMAP, ROADMAP_ART, roadmapLayout, roadmapMirrors, roadmapStopFrame, roadmapTitleFrame, type ScreenRect } from '@/constants/roadmap';
import { Fonts } from '@/constants/theme';

const INSETS = { top: 62, bottom: 34, left: 0, right: 0 };

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 62, bottom: 34, left: 0, right: 0 }),
}));

const CONTROLS: ScreenRect[] = [
  { left: 22, top: 62, width: 96, height: 56 },
  { left: 324, top: 62, width: 56, height: 56 },
];

let originalWidth: number;
let originalHeight: number;

function measureTheScreen(width: number, height: number) {
  Object.defineProperty(document.documentElement, 'clientWidth', { value: width, configurable: true });
  Object.defineProperty(document.documentElement, 'clientHeight', { value: height, configurable: true });
  act(() => { window.dispatchEvent(new Event('resize')); });
}

function picture(root: ReactTestInstance, testID: string): ReactTestInstance {
  return root.findAll((node) => node.props.testID === testID && node.props.contentFit !== undefined)[0];
}

function styled(root: ReactTestInstance, testID: string) {
  return StyleSheet.flatten(root.findAll((node) => node.props.testID === testID && node.props.style)[0].props.style);
}

function mirrorsIn(root: ReactTestInstance): ReactTestInstance[] {
  return root.findAll(
    (node) =>
      typeof node.props.testID === 'string' &&
      node.props.testID.startsWith('roadmap-mirror-') &&
      node.props.contentFit !== undefined &&
      node.parent?.props.testID !== node.props.testID
  );
}

function nameIn(root: ReactTestInstance, id: string): ReactTestInstance {
  return root
    .findAll((node) => node.props.testID === `roadmap-stop-${id}`)[0]
    .findAll((node) => node.props.numberOfLines !== undefined)[0];
}

describe('RoadmapScene', () => {
  beforeEach(() => {
    originalWidth = document.documentElement.clientWidth;
    originalHeight = document.documentElement.clientHeight;
    measureTheScreen(402, 874);
  });

  afterEach(() => {
    measureTheScreen(originalWidth, originalHeight);
  });

  it('paints the phone`s portal and road map where the layout puts them, clear of the buttons', () => {
    const { UNSAFE_root } = render(<RoadmapScene controls={CONTROLS} />);
    const expected = roadmapLayout(ROADMAP_ART.phone, { width: 402, height: 874, insets: INSETS, controls: CONTROLS });

    const shown = picture(UNSAFE_root, 'roadmap-picture');

    expect(shown.props.source).toBe(ROADMAP_ART.phone.picture);
    expect(shown.props.contentFit).toBe('fill');
    expect(StyleSheet.flatten(shown.props.style)).toEqual(
      expect.objectContaining({ position: 'absolute', left: expected.left, top: expected.top, width: expected.width, height: expected.height })
    );
    expect(expected.scale).toBeGreaterThan(0);
  });

  it('paints the 4:3 painting on a tablet on its side', () => {
    measureTheScreen(1210, 834);
    const { UNSAFE_root } = render(<RoadmapScene controls={[]} />);

    expect(picture(UNSAFE_root, 'roadmap-picture').props.source).toBe(ROADMAP_ART.tablet.picture);
  });

  it('carries the painting on into whatever it leaves uncovered as its own mirror image, behind it, hidden from screen readers', () => {
    measureTheScreen(1210, 834);
    const { UNSAFE_root } = render(<RoadmapScene controls={CONTROLS} />);
    const at = roadmapLayout(ROADMAP_ART.tablet, { width: 1210, height: 834, insets: INSETS, controls: CONTROLS });
    const expected = roadmapMirrors(at, 1210, 834);

    const mirrors = mirrorsIn(UNSAFE_root);
    const all = UNSAFE_root.findAll((node) => typeof node.props.testID === 'string').map((node) => node.props.testID);

    expect(expected.length).toBeGreaterThan(0);
    expect(mirrors.map((node) => node.props.testID)).toEqual(expected.map((mirror) => `roadmap-mirror-${mirror.key}`));
    mirrors.forEach((node, index) => {
      const mirror = expected[index];
      const style = StyleSheet.flatten(node.props.style);

      expect(node.props.source).toBe(ROADMAP_ART.tablet.picture);
      expect(node.props.contentFit).toBe('fill');
      expect(node.props.accessible).not.toBe(true);
      expect(style).toEqual(
        expect.objectContaining({ position: 'absolute', left: mirror.left, top: mirror.top, width: mirror.width, height: mirror.height })
      );
      expect(style.transform).toEqual([{ scaleX: mirror.flipX ? -1 : 1 }, { scaleY: mirror.flipY ? -1 : 1 }]);
      expect(all.indexOf(`roadmap-mirror-${mirror.key}`)).toBeLessThan(all.indexOf('roadmap-picture'));
    });
  });

  it('fades the mirror above the painting into the painting`s own night sky, so nothing it reflects reaches the top of the screen', () => {
    measureTheScreen(1210, 834);
    const { UNSAFE_root } = render(<RoadmapScene controls={CONTROLS} />);
    const at = roadmapLayout(ROADMAP_ART.tablet, { width: 1210, height: 834, insets: INSETS, controls: CONTROLS });

    const fade = UNSAFE_root.findAll((node) => node.props.testID === 'roadmap-sky-fade' && Array.isArray(node.props.colors))[0];
    const all = UNSAFE_root.findAll((node) => typeof node.props.testID === 'string').map((node) => node.props.testID);

    expect(at.top).toBeGreaterThan(0);
    expect(fade.props.colors).toEqual([ROADMAP_ART.tablet.sky, `${ROADMAP_ART.tablet.sky}00`]);
    expect(StyleSheet.flatten(fade.props.style)).toEqual(
      expect.objectContaining({ position: 'absolute', left: 0, right: 0, top: 0, height: at.top })
    );
    expect(all.lastIndexOf('roadmap-mirror-top')).toBeLessThan(all.indexOf('roadmap-sky-fade'));
    expect(all.indexOf('roadmap-sky-fade')).toBeLessThan(all.indexOf('roadmap-picture'));
  });

  it('needs no fade where the painting is mirrored only at its sides', () => {
    measureTheScreen(1032, 1376);
    const { UNSAFE_root } = render(<RoadmapScene controls={[]} />);

    expect(mirrorsIn(UNSAFE_root).map((node) => node.props.testID)).toEqual(['roadmap-mirror-left', 'roadmap-mirror-right']);
    expect(UNSAFE_root.findAll((node) => node.props.testID === 'roadmap-sky-fade')).toHaveLength(0);
  });

  it('draws no mirror where the painting already reaches the edge', () => {
    const { UNSAFE_root } = render(<RoadmapScene controls={CONTROLS} />);

    const keys = mirrorsIn(UNSAFE_root).map((node) => node.props.testID);

    expect(keys).toEqual(['roadmap-mirror-top']);
  });

  it.each(['japanNewZealand', 'franceItaly', 'lapland'])('writes %s in the app`s own words, on its panel, under the painted quarter', (id) => {
    const { UNSAFE_root } = render(<RoadmapScene controls={CONTROLS} />);
    const at = roadmapLayout(ROADMAP_ART.phone, { width: 402, height: 874, insets: INSETS, controls: CONTROLS });
    const stop = ROADMAP_ART.phone.stops.find((entry) => entry.id === id)!;
    const frame = roadmapStopFrame(stop, at);

    const name = nameIn(UNSAFE_root, id);
    const words = StyleSheet.flatten(name.props.style);

    expect(name.props.children).toBe(`roadmap.stops.${id}`);
    expect(styled(UNSAFE_root, `roadmap-stop-${id}`)).toEqual(
      expect.objectContaining({ position: 'absolute', left: frame.left, top: frame.top, width: frame.width, height: frame.height })
    );
    expect(words.fontSize).toBe(frame.fontSize);
    expect(words.fontFamily).toBe(Fonts.serif);
    expect(words.color).toBe(ROADMAP.ink);
    expect(words.textAlign).toBe('center');
  });

  it('lets a long name take two lines and shrink before it would leave its panel, without a fixed line height', () => {
    const { UNSAFE_root } = render(<RoadmapScene controls={CONTROLS} />);

    const name = nameIn(UNSAFE_root, 'japanNewZealand');

    expect(name.props.numberOfLines).toBe(2);
    expect(name.props.adjustsFontSizeToFit).toBe(true);
    expect(name.props.minimumFontScale).toBe(ROADMAP.minimumFontScale);
    expect(StyleSheet.flatten(name.props.style).lineHeight).toBeUndefined();
  });

  it('gives the words the same warm glow as the painted quarter above them', () => {
    const { UNSAFE_root } = render(<RoadmapScene controls={CONTROLS} />);

    const words = StyleSheet.flatten(nameIn(UNSAFE_root, 'lapland').props.style);

    expect(words.textShadowColor).toBe(ROADMAP.glow);
    expect(words.textShadowRadius).toBe(ROADMAP.glowRadius);
  });

  it('says the adventure continues above the road map, in the app`s own words, where the painting keeps room for it', () => {
    const { UNSAFE_root } = render(<RoadmapScene controls={CONTROLS} />);
    const at = roadmapLayout(ROADMAP_ART.phone, { width: 402, height: 874, insets: INSETS, controls: CONTROLS });
    const frame = roadmapTitleFrame(ROADMAP_ART.phone, at);

    const words = UNSAFE_root.findAll((node) => node.props.testID === 'roadmap-title-words' && node.props.style)[0];
    const style = StyleSheet.flatten(words.props.style);

    expect(words.props.children).toBe('roadmap.title');
    expect(styled(UNSAFE_root, 'roadmap-title')).toEqual(
      expect.objectContaining({ position: 'absolute', left: frame.left, top: frame.top, width: frame.width, height: frame.height })
    );
    expect(style).toEqual(
      expect.objectContaining({
        fontSize: frame.fontSize,
        fontFamily: Fonts.serif,
        color: ROADMAP.ink,
        textAlign: 'center',
        textShadowColor: ROADMAP.titleGlow,
        textShadowRadius: ROADMAP.titleGlowRadius,
      })
    );
    expect(words.props.numberOfLines).toBe(1);
    expect(words.props.adjustsFontSizeToFit).toBe(true);
    expect(style.lineHeight).toBeUndefined();
  });

  it('lays a soft shadow under the heading`s words, so they read over the lit rock', () => {
    const { UNSAFE_root } = render(<RoadmapScene controls={CONTROLS} />);

    const shade = UNSAFE_root.findAll((node) => node.props.testID === 'roadmap-title-shade' && node.props.style)[0];
    const all = UNSAFE_root.findAll((node) => typeof node.props.testID === 'string').map((node) => node.props.testID);

    expect(shade.props.children).toBe('roadmap.title');
    expect(StyleSheet.flatten(shade.props.style)).toEqual(
      expect.objectContaining({ color: ROADMAP.titleShade, textShadowColor: ROADMAP.titleShade, textShadowRadius: ROADMAP.titleShadeRadius })
    );
    expect(all.indexOf('roadmap-title-shade')).toBeLessThan(all.indexOf('roadmap-title-words'));
  });

  it('fades its heading by the style it is handed, and draws it fully otherwise', () => {
    const handed = { opacity: 0.4 };
    const plain = render(<RoadmapScene controls={CONTROLS} />);
    const faded = render(<RoadmapScene controls={CONTROLS} titleStyle={handed} />);

    expect(styled(plain.UNSAFE_root, 'roadmap-title').opacity ?? 1).toBe(1);
    expect(styled(faded.UNSAFE_root, 'roadmap-title').opacity).toBe(0.4);
  });

  it('is described for someone who cannot see it: the heading, the portal, then each stop with its quarter', () => {
    const { UNSAFE_root } = render(<RoadmapScene controls={CONTROLS} />);

    const scene = UNSAFE_root.findAll((node) => node.props.testID === 'roadmap-scene' && node.props.accessible)[0];

    expect(scene.props.accessibilityRole).toBe('image');
    expect(scene.props.accessibilityLabel).toBe(
      [
        'roadmap.title',
        'roadmap.scene',
        'roadmap.stop (quarter:Q2 2027, place:roadmap.stops.japanNewZealand)',
        'roadmap.stop (quarter:Q3 2027, place:roadmap.stops.franceItaly)',
        'roadmap.stop (quarter:Q4 2027, place:roadmap.stops.lapland)',
      ].join(' ')
    );
  });

  it('takes no touches, so nothing on it can be pressed by mistake', () => {
    const { UNSAFE_root } = render(<RoadmapScene controls={CONTROLS} />);

    expect(styled(UNSAFE_root, 'roadmap-scene')).toEqual(expect.objectContaining({ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }));
    expect(UNSAFE_root.findAll((node) => node.props.testID === 'roadmap-scene' && node.props.pointerEvents === 'none').length).toBeGreaterThan(0);
  });
});
