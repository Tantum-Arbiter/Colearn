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
    const afterMount = { ...renders };

    view.rerender(<EnhancedPageTransition currentPage="stories" pages={PAGES} duration={800} />);
    act(() => {
      jest.advanceTimersByTime(800);
    });

    const underTest = renders;

    expect(underTest).toEqual(afterMount);
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
