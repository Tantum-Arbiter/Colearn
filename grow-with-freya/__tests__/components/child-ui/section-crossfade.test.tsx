/**
 * Tests for the section cross-fade.
 *
 * Switching between Home, Library and Progress should feel like one page
 * changing its mind, not a hard cut: the old content fades away, then the
 * new content settles in. While the old content is on its way out, it must
 * not take taps.
 */

import React from 'react';
import { Text } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { SECTION_CROSSFADE, SectionCrossfade } from '@/components/child-ui/section-crossfade';

function texts(view: ReturnType<typeof render>): string[] {
  return view.UNSAFE_queryAllByType(Text).map((node) => String(node.props.children));
}

function host(view: ReturnType<typeof render>) {
  const matches = view.UNSAFE_root.findAll((node: any) => node.props.testID === 'section-crossfade');

  return matches[matches.length - 1];
}

describe('SectionCrossfade', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should show the section it is given', () => {
    const view = render(
      <SectionCrossfade sectionKey="home">
        <Text>Stories</Text>
      </SectionCrossfade>
    );

    const underTest = texts(view);

    expect(underTest).toEqual(['Stories']);
  });

  it('should keep the old section on screen while it fades out', () => {
    const view = render(
      <SectionCrossfade sectionKey="home">
        <Text>Stories</Text>
      </SectionCrossfade>
    );

    view.rerender(
      <SectionCrossfade sectionKey="progress">
        <Text>Progress</Text>
      </SectionCrossfade>
    );

    const underTest = texts(view);

    expect(underTest).toEqual(['Stories']);
  });

  it('should refuse taps on a section that is leaving', () => {
    const view = render(
      <SectionCrossfade sectionKey="home">
        <Text>Stories</Text>
      </SectionCrossfade>
    );

    view.rerender(
      <SectionCrossfade sectionKey="progress">
        <Text>Progress</Text>
      </SectionCrossfade>
    );

    const underTest = host(view).props.pointerEvents;

    expect(underTest).toBe('none');
  });

  it('should bring the new section in once the old one has gone', () => {
    const view = render(
      <SectionCrossfade sectionKey="home">
        <Text>Stories</Text>
      </SectionCrossfade>
    );
    view.rerender(
      <SectionCrossfade sectionKey="progress">
        <Text>Progress</Text>
      </SectionCrossfade>
    );

    act(() => {
      jest.advanceTimersByTime(SECTION_CROSSFADE.outMs);
    });

    expect(texts(view)).toEqual(['Progress']);
    expect(host(view).props.pointerEvents).toBe('auto');
  });

  it('should follow content changes within the same section immediately', () => {
    const view = render(
      <SectionCrossfade sectionKey="home">
        <Text>Stories</Text>
      </SectionCrossfade>
    );

    view.rerender(
      <SectionCrossfade sectionKey="home">
        <Text>Bedtime Stories</Text>
      </SectionCrossfade>
    );

    const underTest = texts(view);

    expect(underTest).toEqual(['Bedtime Stories']);
  });

  it('should land on the last section asked for when taps come quickly', () => {
    const view = render(
      <SectionCrossfade sectionKey="home">
        <Text>Stories</Text>
      </SectionCrossfade>
    );
    view.rerender(
      <SectionCrossfade sectionKey="library">
        <Text>Library</Text>
      </SectionCrossfade>
    );
    view.rerender(
      <SectionCrossfade sectionKey="progress">
        <Text>Progress</Text>
      </SectionCrossfade>
    );

    act(() => {
      jest.advanceTimersByTime(SECTION_CROSSFADE.outMs);
    });

    const underTest = texts(view);

    expect(underTest).toEqual(['Progress']);
  });
});
