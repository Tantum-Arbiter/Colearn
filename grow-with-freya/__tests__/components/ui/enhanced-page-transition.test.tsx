/**
 * Tests for the page slider.
 *
 * Every page stays mounted while another slides over it, so the slider must
 * not make the hidden pages do work: a slide blocks touches through one
 * overlay rather than by re-rendering every page twice.
 */

import React from 'react';
import { Dimensions, PixelRatio, StyleSheet, Text } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { COLD_PAGE_FRAMES, EnhancedPageTransition } from '@/components/ui/enhanced-page-transition';
import { NIGHT_VOID } from '@/constants/night-palette';
import { getScreenDimensions } from '@/components/main-menu/constants';
import { cloudGap } from '@/constants/earth';
import { slideTravel } from '@/constants/page-slide';

let mockScreen = { width: 390, height: 844 };
jest.mock('@/components/main-menu/constants', () => ({
  ...jest.requireActual('@/components/main-menu/constants'),
  getScreenDimensions: () => mockScreen,
}));

const renders: Record<string, number> = {};

function Page({ name }: { name: string }) {
  renders[name] = (renders[name] ?? 0) + 1;
  return <Text>{name}</Text>;
}

const PAGES = {
  main: <Page name="main" />,
  stories: <Page name="stories" />,
  account: <Page name="account" />,
};

function shown(view: ReturnType<typeof render>): string[] {
  return view
    .UNSAFE_queryAllByType(Text)
    .map((node) => String(node.props.children))
    .sort();
}

function guard(view: ReturnType<typeof render>) {
  const matches = view.UNSAFE_root.findAll((node: any) => node.props.testID === 'page-transition-touch-guard');

  return matches[matches.length - 1];
}

describe('EnhancedPageTransition', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    Object.keys(renders).forEach((key) => delete renders[key]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should sit the pages on the night navy, so nothing pale can show between two of them', () => {
    const view = render(<EnhancedPageTransition currentPage="main" pages={PAGES} duration={800} />);

    const backdrop = view.UNSAFE_root.findAll((n: any) => n.props.testID === 'page-transition-backdrop')[0];

    expect(StyleSheet.flatten(backdrop.props.style).backgroundColor).toBe(NIGHT_VOID);
  });

  it('should let each page reach a device pixel below its box, so two pages rounded a pixel apart still meet', () => {
    const view = render(<EnhancedPageTransition currentPage="main" pages={PAGES} duration={800} />);

    const page = view.UNSAFE_root.findAll((n: any) => n.props.testID === 'page-transition-page-main' && typeof n.type !== 'string')[0];

    expect(StyleSheet.flatten(page.props.style)).toMatchObject({ top: 0, bottom: -1 / PixelRatio.get() });
  });

  /**
   * A page below the home page rests a screen and a layer of cloud away, and
   * the cloud lies in that gap (operator, 2026-10-03).
   */
  it('should lay the sky of the gap under the pages and the ring of cloud over them, under the touch guard', () => {
    const view = render(<EnhancedPageTransition currentPage="main" pages={PAGES} duration={800} />);
    const names = ['page-transition-gap-sky', 'page-transition-page-main', 'page-transition-clouds', 'page-transition-touch-guard'];

    const order = view.UNSAFE_root
      .findAll((node: any) => names.includes(node.props.testID))
      .map((node: any) => node.props.testID)
      .filter((name: string, index: number, all: string[]) => all.indexOf(name) === index);
    const [sky, clouds] = view.UNSAFE_root
      .findAll((node: any) => node.props.mainOffset !== undefined)
      .filter((node: any, index: number, all: any[]) => all.findIndex((other: any) => other.props.testID === node.props.testID) === index);

    expect(order).toEqual(names);
    expect(clouds.props.mainOffset.value).toBe(0);
    expect(clouds.props.width).toBe(390);
    expect(clouds.props.height).toBe(844);
    expect(clouds.props.gap).toBeCloseTo(cloudGap(390, 844), 6);
    expect(sky.props.mainOffset).toBe(clouds.props.mainOffset);
    expect(sky.props.gap).toBeCloseTo(cloudGap(390, 844), 6);
    expect(sky.props.height).toBe(844);
    expect(sky.props.width).toBe(390);
  });

  it('should size the cloud afresh when the screen is turned', () => {
    let turned: () => void = () => undefined;
    const listen = jest.spyOn(Dimensions, 'addEventListener').mockImplementation(((_type: string, handler: () => void) => {
      turned = handler;
      return { remove: jest.fn() };
    }) as never);
    const view = render(<EnhancedPageTransition currentPage="main" pages={PAGES} duration={800} />);

    act(() => {
      mockScreen = { width: 844, height: 390 };
      turned();
    });
    const clouds = view.UNSAFE_root.findAll((node: any) => node.props.mainOffset !== undefined && node.props.width !== undefined)[0];
    mockScreen = { width: 390, height: 844 };
    listen.mockRestore();

    expect(clouds.props.width).toBe(844);
    expect(clouds.props.height).toBe(390);
    expect(clouds.props.gap).toBeCloseTo(cloudGap(844, 390), 6);
  });

  it('should give the cloud the home page`s own slide, and rest the home page a screen and the cloud away', () => {
    const view = render(<EnhancedPageTransition currentPage="stories" pages={PAGES} duration={800} />);

    const clouds = view.UNSAFE_root.findAll((node: any) => node.props.mainOffset !== undefined && node.props.width !== undefined)[0];
    const home = view.UNSAFE_root.findAll((node: any) => node.props.pageKey === 'main' && node.props.animationValue)[0];

    expect(clouds.props.mainOffset).toBe(home.props.animationValue);
    expect(clouds.props.mainOffset.value).toBeCloseTo(-slideTravel(390, 844), 6);
  });

  it('should let touches through while nothing is sliding', () => {
    const view = render(<EnhancedPageTransition currentPage="main" pages={PAGES} duration={800} />);

    const underTest = guard(view).props.pointerEvents;

    expect(underTest).toBe('none');
  });

  it('should swallow touches for the length of the slide', () => {
    const view = render(<EnhancedPageTransition currentPage="main" pages={PAGES} duration={800} />);

    view.rerender(<EnhancedPageTransition currentPage="stories" pages={PAGES} duration={800} />);

    expect(guard(view).props.pointerEvents).toBe('auto');

    act(() => {
      jest.advanceTimersByTime(800);
    });

    expect(guard(view).props.pointerEvents).toBe('none');
  });

  it('should not re-render the pages when the slide starts or ends', () => {
    const view = render(<EnhancedPageTransition currentPage="main" pages={PAGES} duration={800} />);
    view.rerender(<EnhancedPageTransition currentPage="stories" pages={PAGES} duration={800} />);
    const afterMount = { ...renders };

    act(() => {
      jest.advanceTimersByTime(800);
    });

    const underTest = renders;

    expect(underTest).toEqual(afterMount);
  });

  it('should mount only the home page and the page showing', () => {
    render(<EnhancedPageTransition currentPage="main" pages={PAGES} duration={800} />);

    const underTest = Object.keys(renders).sort();

    expect(underTest).toEqual(['main']);
  });

  describe('warming a page ahead of time', () => {
    it('should mount a page the child is likely to open once the home page has been still for a moment, and not before', () => {
      render(<EnhancedPageTransition currentPage="main" pages={PAGES} duration={800} prewarm={['stories']} prewarmAfterMs={1200} />);

      act(() => {
        jest.advanceTimersByTime(1199);
      });
      expect(Object.keys(renders).sort()).toEqual(['main']);

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(Object.keys(renders).sort()).toEqual(['main', 'stories']);
    });

    it('should warm every listed page together, so the library and Grown-ups are both ready', () => {
      render(<EnhancedPageTransition currentPage="main" pages={PAGES} duration={800} prewarm={['stories', 'account']} prewarmAfterMs={1200} />);

      act(() => {
        jest.advanceTimersByTime(1200);
      });

      expect(Object.keys(renders).sort()).toEqual(['account', 'main', 'stories']);
    });

    it('should not mount it again when the child then opens it, so the slide pays for nothing', () => {
      const view = render(<EnhancedPageTransition currentPage="main" pages={PAGES} duration={800} prewarm={['stories']} prewarmAfterMs={1200} />);
      act(() => {
        jest.advanceTimersByTime(1200);
      });
      const before = renders.stories;

      view.rerender(<EnhancedPageTransition currentPage="stories" pages={PAGES} duration={800} prewarm={['stories']} prewarmAfterMs={1200} />);

      expect(renders.stories).toBe(before);
    });

    it('should wait for stillness again if the child moves on before the page has been warmed', () => {
      const view = render(<EnhancedPageTransition currentPage="main" pages={PAGES} duration={800} prewarm={['stories']} prewarmAfterMs={1200} />);
      act(() => {
        jest.advanceTimersByTime(600);
      });

      view.rerender(<EnhancedPageTransition currentPage="account" pages={PAGES} duration={800} prewarm={['stories']} prewarmAfterMs={1200} />);
      act(() => {
        jest.advanceTimersByTime(1199);
      });
      expect(renders.stories).toBeUndefined();

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(renders.stories).toBeGreaterThan(0);
    });

    it('should keep a warmed page mounted however far the child wanders', () => {
      const view = render(<EnhancedPageTransition currentPage="main" pages={PAGES} duration={800} prewarm={['stories']} prewarmAfterMs={1200} />);
      act(() => {
        jest.advanceTimersByTime(1200);
      });

      view.rerender(<EnhancedPageTransition currentPage="account" pages={PAGES} duration={800} prewarm={['stories']} prewarmAfterMs={1200} />);
      act(() => {
        jest.advanceTimersByTime(800);
      });

      expect(shown(view)).toContain('stories');
    });
  });

  it('should mount the destination before sliding to it', () => {
    const view = render(<EnhancedPageTransition currentPage="main" pages={PAGES} duration={800} />);

    view.rerender(<EnhancedPageTransition currentPage="stories" pages={PAGES} duration={800} />);

    const underTest = Object.keys(renders).sort();

    expect(underTest).toEqual(['main', 'stories']);
  });

  it('should keep the page it is leaving mounted until the slide has finished', () => {
    const view = render(<EnhancedPageTransition currentPage="stories" pages={PAGES} duration={800} />);

    view.rerender(<EnhancedPageTransition currentPage="account" pages={PAGES} duration={800} />);

    const underTest = shown(view);

    expect(underTest).toEqual(['account', 'main', 'stories']);
  });

  it('should keep the page it has just left, and let older ones go', () => {
    const view = render(<EnhancedPageTransition currentPage="stories" pages={PAGES} duration={800} />);
    view.rerender(<EnhancedPageTransition currentPage="account" pages={PAGES} duration={800} />);
    act(() => {
      jest.advanceTimersByTime(800);
    });
    view.rerender(<EnhancedPageTransition currentPage="main" pages={PAGES} duration={800} />);
    act(() => {
      jest.advanceTimersByTime(800);
    });

    const underTest = shown(view);

    expect(underTest).toEqual(['account', 'main']);
  });

  it('should not slide when animation is switched off', () => {
    const view = render(
      <EnhancedPageTransition currentPage="main" pages={PAGES} duration={800} animate={false} />
    );

    view.rerender(<EnhancedPageTransition currentPage="stories" pages={PAGES} duration={800} animate={false} />);

    const underTest = guard(view).props.pointerEvents;

    expect(underTest).toBe('none');
  });

  describe('a page that makes its own entrance', () => {
    const HEIGHT = slideTravel(getScreenDimensions().width, getScreenDimensions().height);
    const WITH_ISLAND = { ...PAGES, island: <Page name="island" /> };
    const INSTANT = ['island'];

    beforeEach(() => {
      (useSharedValue as jest.Mock).mockImplementation((initial: number) => React.useRef({ value: initial }).current);
      (withTiming as jest.Mock).mockImplementation((to: number) => ({ slidesTo: to }));
    });

    afterEach(() => {
      (useSharedValue as jest.Mock).mockImplementation((initial = 0) => ({ value: initial }));
      (withTiming as jest.Mock).mockImplementation((value: number, _config: unknown, callback?: (done: boolean) => void) => {
        if (typeof callback === 'function') callback(true);
        return value;
      });
    });

    function offset(view: ReturnType<typeof render>, pageKey: string): unknown {
      return view.UNSAFE_root.findAll((node: any) => node.props.pageKey === pageKey && node.props.animationValue)[0]
        .props.animationValue.value;
    }

    it('is put in place at once, with no slide and no wait, and the home page taken away as quickly', () => {
      const view = render(<EnhancedPageTransition currentPage="main" pages={WITH_ISLAND} duration={800} instant={INSTANT} />);

      view.rerender(<EnhancedPageTransition currentPage="island" pages={WITH_ISLAND} duration={800} instant={INSTANT} />);

      expect(offset(view, 'island')).toBe(0);
      expect(offset(view, 'main')).toBe(-HEIGHT);
    });

    it('gives the home page back at once on the way out', () => {
      const view = render(<EnhancedPageTransition currentPage="main" pages={WITH_ISLAND} duration={800} instant={INSTANT} />);
      view.rerender(<EnhancedPageTransition currentPage="island" pages={WITH_ISLAND} duration={800} instant={INSTANT} />);

      view.rerender(<EnhancedPageTransition currentPage="main" pages={WITH_ISLAND} duration={800} instant={INSTANT} />);

      expect(offset(view, 'main')).toBe(0);
      expect(offset(view, 'island')).toBe(HEIGHT);
    });

    it('swallows no touches, having no slide to guard', () => {
      const view = render(<EnhancedPageTransition currentPage="main" pages={WITH_ISLAND} duration={800} instant={INSTANT} />);

      view.rerender(<EnhancedPageTransition currentPage="island" pages={WITH_ISLAND} duration={800} instant={INSTANT} />);

      expect(guard(view).props.pointerEvents).toBe('none');
    });

    // warming a page already on screen changed nothing but re-rendered every page 1.2 s after the
    // switch, which landed on the arrival's frames as a 35-40 ms hitch
    it('does not stir again to warm the island while the child is already on it', () => {
      let commits = 0;
      const tree = (page: string) => (
        <React.Profiler id="pages" onRender={() => { commits += 1; }}>
          <EnhancedPageTransition currentPage={page} pages={WITH_ISLAND} duration={800} instant={INSTANT} prewarm={['island']} prewarmAfterMs={1200} />
        </React.Profiler>
      );
      const view = render(tree('main'));
      view.rerender(tree('island'));
      act(() => { jest.advanceTimersByTime(1000); });
      const settled = commits;

      act(() => { jest.advanceTimersByTime(1000); });

      expect(commits).toBe(settled);
      expect(shown(view)).toContain('island');
    });

    it('still warms a listed page the child is not on', () => {
      const view = render(<EnhancedPageTransition currentPage="island" pages={WITH_ISLAND} duration={800} instant={INSTANT} prewarm={['island', 'stories']} prewarmAfterMs={1200} />);

      act(() => { jest.advanceTimersByTime(1200); });

      expect(Object.keys(renders)).toEqual(expect.arrayContaining(['island', 'stories']));
      expect(shown(view)).toContain('island');
    });

    it('rests below the screen until it is opened', () => {
      const view = render(<EnhancedPageTransition currentPage="main" pages={WITH_ISLAND} duration={800} instant={INSTANT} prewarm={['island']} prewarmAfterMs={10} />);
      act(() => {
        jest.advanceTimersByTime(10);
      });

      const underTest = offset(view, 'island');

      expect(typeof underTest === 'number' ? underTest : (underTest as { slidesTo: number }).slidesTo).toBe(HEIGHT);
    });

    it('slides out to an activity, and slides back, as a page would from anywhere else', () => {
      const WITH_FEELINGS = { ...WITH_ISLAND, feelings: <Page name="feelings" /> };
      const view = render(<EnhancedPageTransition currentPage="main" pages={WITH_FEELINGS} duration={800} instant={INSTANT} />);
      view.rerender(<EnhancedPageTransition currentPage="island" pages={WITH_FEELINGS} duration={800} instant={INSTANT} />);

      view.rerender(<EnhancedPageTransition currentPage="feelings" pages={WITH_FEELINGS} duration={800} instant={INSTANT} />);
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(offset(view, 'feelings')).toEqual({ slidesTo: 0 });
      expect(offset(view, 'island')).toEqual({ slidesTo: -HEIGHT });
      expect(guard(view).props.pointerEvents).toBe('auto');

      act(() => {
        jest.advanceTimersByTime(800);
      });
      view.rerender(<EnhancedPageTransition currentPage="island" pages={WITH_FEELINGS} duration={800} instant={INSTANT} />);
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(offset(view, 'island')).toEqual({ slidesTo: 0 });
      expect(offset(view, 'feelings')).toEqual({ slidesTo: HEIGHT });
    });

    it('leaves every other page sliding as before', () => {
      const view = render(<EnhancedPageTransition currentPage="main" pages={WITH_ISLAND} duration={800} instant={INSTANT} prewarm={['stories']} prewarmAfterMs={10} />);
      act(() => {
        jest.advanceTimersByTime(10);
      });

      view.rerender(<EnhancedPageTransition currentPage="stories" pages={WITH_ISLAND} duration={800} instant={INSTANT} prewarm={['stories']} prewarmAfterMs={10} />);

      expect(offset(view, 'stories')).toEqual({ slidesTo: 0 });
      expect(guard(view).props.pointerEvents).toBe('auto');
    });
  });

  describe('Grown-ups below the library', () => {
    const HEIGHT = slideTravel(getScreenDimensions().width, getScreenDimensions().height);

    beforeEach(() => {
      (useSharedValue as jest.Mock).mockImplementation((initial: number) => React.useRef({ value: initial }).current);
    });

    afterEach(() => {
      (useSharedValue as jest.Mock).mockImplementation((initial = 0) => ({ value: initial }));
    });

    function offset(view: ReturnType<typeof render>, pageKey: string): unknown {
      return view.UNSAFE_root.findAll((node: any) => node.props.pageKey === pageKey && node.props.animationValue)[0]
        .props.animationValue.value;
    }

    it('rests below until it is opened', () => {
      const view = render(<EnhancedPageTransition currentPage="stories" pages={PAGES} duration={800} prewarm={['account']} prewarmAfterMs={10} />);
      act(() => {
        jest.advanceTimersByTime(10);
      });

      expect(offset(view, 'account')).toBe(HEIGHT);
    });

    it('rises into view as the library lifts away above it', () => {
      const view = render(<EnhancedPageTransition currentPage="stories" pages={PAGES} duration={800} />);

      view.rerender(<EnhancedPageTransition currentPage="account" pages={PAGES} duration={800} />);
      act(() => {
        jest.advanceTimersByTime(16 * COLD_PAGE_FRAMES + 16);
      });

      expect(offset(view, 'account')).toBe(0);
      expect(offset(view, 'stories')).toBe(-HEIGHT);
      expect(offset(view, 'main')).toBe(-HEIGHT);
    });

    it('lets a page built for the slide be built before it moves, then moves it', () => {
      const view = render(<EnhancedPageTransition currentPage="stories" pages={PAGES} duration={800} />);

      view.rerender(<EnhancedPageTransition currentPage="account" pages={PAGES} duration={800} />);

      expect(offset(view, 'account')).toBe(HEIGHT);
      act(() => {
        jest.advanceTimersByTime(16 * COLD_PAGE_FRAMES + 16);
      });
      expect(offset(view, 'account')).toBe(0);
    });

    it('moves an already mounted page at once', () => {
      const view = render(<EnhancedPageTransition currentPage="stories" pages={PAGES} duration={800} prewarm={['account']} prewarmAfterMs={10} />);
      act(() => {
        jest.advanceTimersByTime(10);
      });

      view.rerender(<EnhancedPageTransition currentPage="account" pages={PAGES} duration={800} prewarm={['account']} prewarmAfterMs={10} />);

      expect(offset(view, 'account')).toBe(0);
    });

    it('sinks away again as the library comes back down', () => {
      const view = render(<EnhancedPageTransition currentPage="stories" pages={PAGES} duration={800} />);
      view.rerender(<EnhancedPageTransition currentPage="account" pages={PAGES} duration={800} />);

      view.rerender(<EnhancedPageTransition currentPage="stories" pages={PAGES} duration={800} />);

      expect(offset(view, 'stories')).toBe(0);
      expect(offset(view, 'account')).toBe(HEIGHT);
    });

    it('opens from below when it starts out showing', () => {
      const view = render(<EnhancedPageTransition currentPage="account" pages={PAGES} duration={800} />);

      expect(offset(view, 'account')).toBe(0);
      expect(offset(view, 'main')).toBe(-HEIGHT);
    });

    describe('a page moving from above the screen to below it', () => {
      beforeEach(() => {
        (withTiming as jest.Mock).mockImplementation((to: number) => ({ slidesTo: to }));
      });

      afterEach(() => {
        (withTiming as jest.Mock).mockImplementation((value: number, _config: unknown, callback?: (done: boolean) => void) => {
          if (typeof callback === 'function') callback(true);
          return value;
        });
      });

      it('jumps straight across rather than sweeping through the view', () => {
        const view = render(<EnhancedPageTransition currentPage="stories" pages={PAGES} duration={800} prewarm={['stories']} prewarmAfterMs={10} />);
        act(() => {
          jest.advanceTimersByTime(10);
        });
        view.rerender(<EnhancedPageTransition currentPage="account" pages={PAGES} duration={800} prewarm={['stories']} prewarmAfterMs={10} />);
        act(() => {
          jest.advanceTimersByTime(800);
        });
        (view.UNSAFE_root.findAll((node: any) => node.props.pageKey === 'stories' && node.props.animationValue)[0]
          .props.animationValue).value = -HEIGHT;

        view.rerender(<EnhancedPageTransition currentPage="main" pages={PAGES} duration={800} prewarm={['stories']} prewarmAfterMs={10} />);

        expect(offset(view, 'stories')).toBe(HEIGHT);
        expect(offset(view, 'account')).toEqual({ slidesTo: HEIGHT });
        expect(offset(view, 'main')).toEqual({ slidesTo: 0 });
      });
    });
  });
});
