/**
 * Tests for the page slider.
 *
 * Every page stays mounted while another slides over it, so the slider must
 * not make the hidden pages do work: a slide blocks touches through one
 * overlay rather than by re-rendering every page twice.
 */

import React from 'react';
import { Text } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { EnhancedPageTransition } from '@/components/ui/enhanced-page-transition';

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
});
