/**
 * The splash logo, grown rather than faded in: a pen draws the outline of the
 * shut book onto the empty sky, the book is inked in over the line and opens,
 * the stem rises out of it, the roots spread inside it, each leaf opens as the
 * stem reaches it, and the wordmark arrives last.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { AnimatedLogo } from '@/components/splash/animated-logo';
import {
  BOOK_HALVES,
  OUTLINE_STROKES,
  ROOT_STRAND_COUNT,
  SPLASH_LEAVES,
  SPLASH_LOGO_LAYERS,
  SPLASH_TIMELINE,
  bookSpineOffset,
  layerFrame,
  outlineLength,
  outlinePath,
  outlineStrokeWidth,
  penDashArray,
  rootStrandLength,
  rootStrandPath,
  rootsStrokeWidth,
  spineFrame,
  leafUnfurlDelayMs,
} from '@/constants/splash-logo';

jest.mock('@/components/splash/splash-logo-art', () => ({
  SPLASH_LOGO_ART: {
    bookLeft: { uri: 'test://bookLeft' },
    bookRight: { uri: 'test://bookRight' },
    roots: { uri: 'test://roots' },
    stem: { uri: 'test://stem' },
    leafLeft: { uri: 'test://leafLeft' },
    leafRight: { uri: 'test://leafRight' },
    leafTop: { uri: 'test://leafTop' },
    wordmark: { uri: 'test://wordmark' },
  },
}));

const SIZE = 280;
const animatedStyle = useAnimatedStyle as unknown as jest.Mock;
const animatedProps = useAnimatedProps as unknown as jest.Mock;
const sharedValue = useSharedValue as unknown as jest.Mock;
const delay = withDelay as unknown as jest.Mock;
const repeat = withRepeat as unknown as jest.Mock;
const timing = withTiming as unknown as jest.Mock;

type Rendered = ReturnType<typeof render>;

function flatStyle(node: { props: { style?: unknown } }): Record<string, unknown> {
  const flatten = (style: unknown): Record<string, unknown> => {
    if (Array.isArray(style)) {
      return style.reduce<Record<string, unknown>>((merged, part) => ({ ...merged, ...flatten(part) }), {});
    }

    return style && typeof style === 'object' ? (style as Record<string, unknown>) : {};
  };

  return flatten(node.props.style);
}

function styledNode(rendered: Rendered, testID: string) {
  return rendered.UNSAFE_queryAllByProps({ testID }).filter((node) => node.props.style)[0];
}

function layerNode(rendered: Rendered, layer: string) {
  return styledNode(rendered, `splash-logo-${layer}`);
}

function strokesOf(rendered: Rendered): Record<string, any>[] {
  const byPath = new Map<string, Record<string, any>>();
  rendered.UNSAFE_queryAllByProps({ testID: 'svg-Path' }).forEach((node) => {
    byPath.set(node.props.d as string, node.props);
  });

  return [...byPath.values()];
}

function sourcesOf(rendered: Rendered): string[] {
  return rendered.UNSAFE_root
    .findAll((node: any) => node.props.source && typeof node.props.source.uri === 'string')
    .map((node: any) => node.props.source.uri as string);
}

function transformOf(style: Record<string, unknown>, key: string): unknown {
  const transform = (style.transform ?? []) as Record<string, unknown>[];

  return transform.find((entry) => key in entry)?.[key];
}

describe('AnimatedLogo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    animatedStyle.mockImplementation((worklet: () => unknown) => worklet());
    animatedProps.mockImplementation((worklet: () => unknown) => worklet());
    sharedValue.mockImplementation((initial: number = 0) => React.useRef({ value: initial }).current);
  });

  afterEach(() => {
    animatedStyle.mockImplementation(() => ({}));
    animatedProps.mockImplementation(() => ({}));
    sharedValue.mockImplementation((initial: number = 0) => ({ value: initial }));
  });

  it('should draw every layer of the logo from its own artwork', () => {
    const underTest = render(<AnimatedLogo size={SIZE} playing={false} reduceMotion={false} />);

    const sources = new Set(sourcesOf(underTest));

    SPLASH_LOGO_LAYERS.forEach((layer) => {
      expect(sources.has(`test://${layer}`)).toBe(true);
    });
  });

  it.each(SPLASH_LOGO_LAYERS)('should place the %s layer where the logo has it', (layer) => {
    const frame = layerFrame(layer, SIZE);

    const underTest = render(<AnimatedLogo size={SIZE} playing={false} reduceMotion={false} />);

    const style = flatStyle(layerNode(underTest, layer));
    expect(style.left).toBeCloseTo(frame.left, 6);
    expect(style.width).toBeCloseTo(frame.width, 6);
  });

  it('should open on an empty sky, the shut book not yet drawn, as the native launch image leaves it', () => {
    const underTest = render(<AnimatedLogo size={SIZE} playing={false} reduceMotion={false} />);

    expect(flatStyle(layerNode(underTest, 'ink')).opacity).toBe(0);
    expect(flatStyle(layerNode(underTest, 'outline')).opacity).toBe(1);
    strokesOf(underTest).forEach((stroke) => {
      const [line, gap] = stroke.strokeDasharray.split(' ').map(Number);

      expect(stroke.animatedProps.strokeDashoffset).toBeCloseTo(line + stroke.strokeWidth, 6);
      expect(gap).toBeCloseTo(line + 2 * stroke.strokeWidth, 6);
    });
    expect(transformOf(flatStyle(layerNode(underTest, 'bookLeft')), 'scaleX')).toBe(-1);
    expect(transformOf(flatStyle(layerNode(underTest, 'bookLeft')), 'skewY')).toBe('0deg');
    expect(transformOf(flatStyle(layerNode(underTest, 'bookRight')), 'scaleX')).toBe(1);
    expect(flatStyle(layerNode(underTest, 'spine')).opacity).toBe(1);
    expect(flatStyle(layerNode(underTest, 'stem')).height).toBe(0);
    expect(flatStyle(layerNode(underTest, 'roots')).opacity).toBe(0);
    expect(flatStyle(layerNode(underTest, 'root-strands')).opacity).toBe(1);
    expect(flatStyle(layerNode(underTest, 'wordmark')).opacity).toBe(0);
    SPLASH_LEAVES.forEach((leaf) => {
      expect(transformOf(flatStyle(layerNode(underTest, leaf)), 'scale')).toBe(0);
    });
  });

  it('should grow the stem up from the book', () => {
    const stem = layerFrame('stem', SIZE);

    const underTest = render(<AnimatedLogo size={SIZE} playing={false} reduceMotion={false} />);

    const stemStyle = flatStyle(layerNode(underTest, 'stem'));
    expect(stemStyle.bottom).toBeCloseTo(SIZE - (stem.top + stem.height), 6);
    expect(stemStyle.top).toBeUndefined();
    expect(stemStyle.overflow).toBe('hidden');
  });

  it('should draw every root strand as its own pen stroke in the roots\' line weight, over the roots art', () => {
    const roots = layerFrame('roots', SIZE);

    const underTest = render(<AnimatedLogo size={SIZE} playing={false} reduceMotion={false} />);

    const paths = Array.from({ length: ROOT_STRAND_COUNT }, (_, index) => rootStrandPath(index, SIZE));
    const strokes = strokesOf(underTest).filter((stroke) => paths.includes(stroke.d));
    expect(strokes).toHaveLength(ROOT_STRAND_COUNT);
    strokes.forEach((stroke) => {
      expect(stroke.stroke).toBe('#FFFFFF');
      expect(stroke.fill).toBe('none');
      expect(stroke.strokeWidth).toBeCloseTo(rootsStrokeWidth(SIZE), 6);
      expect(stroke.strokeLinecap).toBe('round');
      expect(stroke.animatedProps.strokeDashoffset).toBeCloseTo(
        Number(stroke.strokeDasharray.split(' ')[0]) + rootsStrokeWidth(SIZE),
        6
      );
    });
    expect(strokes.map((stroke) => stroke.strokeDasharray).sort()).toEqual(
      paths.map((_, index) => penDashArray(rootStrandLength(index, SIZE), rootsStrokeWidth(SIZE))).sort()
    );
    const rootsStyle = flatStyle(layerNode(underTest, 'roots'));
    expect(rootsStyle.top).toBeCloseTo(roots.top, 6);
    expect(rootsStyle.left).toBeCloseTo(roots.left, 6);
  });

  it('should set the pen on the roots as the cover passes the spine, and ink them once the last strand is drawn', () => {
    render(<AnimatedLogo size={SIZE} playing reduceMotion={false} />);

    const delays = delay.mock.calls.map(([ms]) => ms as number);

    expect(delays).toContain(SPLASH_TIMELINE.roots.delayMs);
    expect(delays).toContain(SPLASH_TIMELINE.roots.delayMs + SPLASH_TIMELINE.roots.drawMs);
    expect(timing).toHaveBeenCalledWith(
      SPLASH_TIMELINE.roots.drawMs,
      expect.objectContaining({ duration: SPLASH_TIMELINE.roots.drawMs })
    );
  });

  it('should fold each half of the book about the spine, not about its own middle', () => {
    const underTest = render(<AnimatedLogo size={SIZE} playing={false} reduceMotion={false} />);

    BOOK_HALVES.forEach((half) => {
      const transform = (flatStyle(layerNode(underTest, half)).transform ?? []) as Record<string, number>[];
      const shifts = transform.filter((entry) => 'translateX' in entry).map((entry) => entry.translateX);

      expect(shifts).toEqual([bookSpineOffset(half, SIZE), -bookSpineOffset(half, SIZE)]);
      expect(bookSpineOffset(half, SIZE)).not.toBe(0);
      expect(transform.map((entry) => Object.keys(entry)[0])).toEqual(['translateX', 'scaleX', 'skewY', 'translateX']);
    });
  });

  it('should draw the closed book its spine where the two halves meet', () => {
    const frame = spineFrame(SIZE);

    const underTest = render(<AnimatedLogo size={SIZE} playing={false} reduceMotion={false} />);

    const style = flatStyle(layerNode(underTest, 'spine'));
    expect(style.left).toBeCloseTo(frame.left, 6);
    expect(style.top).toBeCloseTo(frame.top, 6);
    expect(style.height).toBeCloseTo(frame.height, 6);
  });

  it('should draw the shut book as two pen strokes, the cover and the page line, in the art\'s own line weight', () => {
    const underTest = render(<AnimatedLogo size={SIZE} playing={false} reduceMotion={false} />);

    const outlinePaths = OUTLINE_STROKES.map((stroke) => outlinePath(stroke, SIZE));
    const strokes = strokesOf(underTest).filter((stroke) => outlinePaths.includes(stroke.d));
    expect(strokes.map((stroke) => stroke.d).sort()).toEqual([...outlinePaths].sort());
    strokes.forEach((stroke) => {
      expect(stroke.stroke).toBe('#FFFFFF');
      expect(stroke.fill).toBe('none');
      expect(stroke.strokeWidth).toBeCloseTo(outlineStrokeWidth(SIZE), 6);
      expect(stroke.strokeLinecap).toBe('round');
      expect(stroke.strokeLinejoin).toBe('round');
    });
    expect(strokes.map((stroke) => stroke.strokeDasharray).sort()).toEqual(
      OUTLINE_STROKES.map((stroke) => penDashArray(outlineLength(stroke, SIZE), outlineStrokeWidth(SIZE))).sort()
    );
  });

  it('should put the pen to the sky first, ink the book in once the line is drawn, and only then open it', () => {
    render(<AnimatedLogo size={SIZE} playing reduceMotion={false} />);

    const delays = delay.mock.calls.map(([ms]) => ms as number);

    expect(Math.min(...delays)).toBe(SPLASH_TIMELINE.outline.delayMs);
    expect(delays).toContain(SPLASH_TIMELINE.ink.delayMs);
    expect(delays).toContain(SPLASH_TIMELINE.book.delayMs);
    expect(timing).toHaveBeenCalledWith(1, expect.objectContaining({ duration: SPLASH_TIMELINE.outline.durationMs }));
    expect(timing).toHaveBeenCalledWith(1, expect.objectContaining({ duration: SPLASH_TIMELINE.ink.durationMs }));
  });

  it('should wait to be told before it starts', () => {
    render(<AnimatedLogo size={SIZE} playing={false} reduceMotion={false} />);

    expect(delay).not.toHaveBeenCalled();
    expect(repeat).not.toHaveBeenCalled();
  });

  it('should open each leaf as the stem reaches it', () => {
    render(<AnimatedLogo size={SIZE} playing reduceMotion={false} />);

    const delays = delay.mock.calls.map(([ms]) => ms as number);

    SPLASH_LEAVES.forEach((leaf) => {
      expect(delays).toContain(leafUnfurlDelayMs(leaf));
    });
    expect(delays).toContain(SPLASH_TIMELINE.stem.delayMs);
    expect(delays).toContain(SPLASH_TIMELINE.roots.delayMs);
    expect(delays).toContain(SPLASH_TIMELINE.wordmark.delayMs);
  });

  it('should leave the leaves swaying once they are open', () => {
    render(<AnimatedLogo size={SIZE} playing reduceMotion={false} />);

    expect(repeat).toHaveBeenCalledTimes(1);
    expect(repeat.mock.calls[0][1]).toBe(-1);
  });

  it('should land as the logo exactly', () => {
    const underTest = render(<AnimatedLogo size={SIZE} playing reduceMotion={false} testID="first" />);

    underTest.rerender(<AnimatedLogo size={SIZE} playing reduceMotion={false} testID="landed" />);

    expect(flatStyle(layerNode(underTest, 'stem')).height).toBeCloseTo(layerFrame('stem', SIZE).height, 6);
    expect(flatStyle(layerNode(underTest, 'roots')).opacity).toBe(1);
    expect(flatStyle(layerNode(underTest, 'root-strands')).opacity).toBe(0);
    expect(flatStyle(layerNode(underTest, 'wordmark')).opacity).toBe(1);
    expect(transformOf(flatStyle(layerNode(underTest, 'wordmark')), 'translateY')).toBe(0);
    BOOK_HALVES.forEach((half) => {
      expect(transformOf(flatStyle(layerNode(underTest, half)), 'scaleX')).toBe(1);
      expect(transformOf(flatStyle(layerNode(underTest, half)), 'skewY')).toBe('0deg');
    });
    expect(flatStyle(layerNode(underTest, 'spine')).opacity).toBe(0);
    expect(flatStyle(layerNode(underTest, 'ink')).opacity).toBe(1);
    expect(flatStyle(layerNode(underTest, 'outline')).opacity).toBe(0);
    strokesOf(underTest).forEach((stroke) => {
      expect(stroke.animatedProps.strokeDashoffset).toBe(0);
    });
    SPLASH_LEAVES.forEach((leaf) => {
      const style = flatStyle(layerNode(underTest, leaf));

      expect(transformOf(style, 'scale')).toBe(1);
    });
  });

  describe('with reduce motion on', () => {
    it('should show the whole logo without growing or swaying it', () => {
      const underTest = render(<AnimatedLogo size={SIZE} playing reduceMotion testID="first" />);

      underTest.rerender(<AnimatedLogo size={SIZE} playing reduceMotion testID="settled" />);

      expect(delay).not.toHaveBeenCalled();
      expect(repeat).not.toHaveBeenCalled();
      expect(timing).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ duration: SPLASH_TIMELINE.outline.durationMs })
      );
      expect(flatStyle(layerNode(underTest, 'ink')).opacity).toBe(1);
      expect(flatStyle(layerNode(underTest, 'outline')).opacity).toBe(0);
      expect(flatStyle(layerNode(underTest, 'roots')).opacity).toBe(1);
      expect(flatStyle(layerNode(underTest, 'root-strands')).opacity).toBe(0);
      expect(flatStyle(layerNode(underTest, 'stem')).height).toBeCloseTo(layerFrame('stem', SIZE).height, 6);
      BOOK_HALVES.forEach((half) => {
        expect(transformOf(flatStyle(layerNode(underTest, half)), 'scaleX')).toBe(1);
        expect(transformOf(flatStyle(layerNode(underTest, half)), 'skewY')).toBe('0deg');
      });
      expect(flatStyle(layerNode(underTest, 'spine')).opacity).toBe(0);
      SPLASH_LEAVES.forEach((leaf) => {
        const style = flatStyle(layerNode(underTest, leaf));

        expect(transformOf(style, 'scale')).toBe(1);
        expect(transformOf(style, 'rotate')).toBe('0deg');
      });
    });
  });

  describe('on a tablet', () => {
    const TABLET_SIZE = 380;

    it('should start at the size of the native launch image and grow into its own', () => {
      const underTest = render(<AnimatedLogo size={TABLET_SIZE} playing={false} reduceMotion={false} testID="logo" />);

      const before = transformOf(flatStyle(styledNode(underTest, 'logo')), 'scale');
      underTest.rerender(<AnimatedLogo size={TABLET_SIZE} playing reduceMotion={false} testID="logo" />);
      underTest.rerender(<AnimatedLogo size={TABLET_SIZE} playing reduceMotion={false} testID="logo" />);
      const after = transformOf(flatStyle(styledNode(underTest, 'logo')), 'scale');

      expect(before).toBeCloseTo(280 / 380, 6);
      expect(after).toBe(1);
    });
  });
});
