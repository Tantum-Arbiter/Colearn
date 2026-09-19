/**
 * Tests for the section cross-fade.
 *
 * Switching between Home, Library and Progress should feel like one page
 * changing its mind, not a hard cut: the incoming section mounts at once,
 * hidden, so its cost overlaps the outgoing section fading away, and the
 * outgoing section keeps its own instance -- it never remounts, resets or
 * pops back -- until it has gone.
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { PinnedInSection, SECTION_CROSSFADE, SectionCrossfade } from '@/components/child-ui/section-crossfade';

const mounts: Record<string, number> = {};

function Section({ name, label }: { name: string; label?: string }) {
  useEffect(() => {
    mounts[name] = (mounts[name] ?? 0) + 1;
  }, [name]);

  return <Text>{label ?? name}</Text>;
}

function texts(view: ReturnType<typeof render>): string[] {
  return view.UNSAFE_queryAllByType(Text).map((node) => String(node.props.children));
}

function layer(view: ReturnType<typeof render>, which: 'current' | 'leaving') {
  const matches = view.UNSAFE_root.findAll((node: any) => node.props.testID === `section-crossfade-${which}`);

  return matches[matches.length - 1];
}

function show(sectionKey: string, label?: string) {
  return (
    <SectionCrossfade sectionKey={sectionKey}>
      <Section name={sectionKey} label={label} />
    </SectionCrossfade>
  );
}

describe('SectionCrossfade', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    Object.keys(mounts).forEach((key) => delete mounts[key]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should show the section it is given', () => {
    const view = render(show('home', 'Stories'));

    const underTest = texts(view);

    expect(underTest).toEqual(['Stories']);
  });

  it('should mount the incoming section straight away, underneath the one leaving', () => {
    const view = render(show('home', 'Stories'));

    view.rerender(show('progress', 'Progress'));

    const underTest = texts(view);

    expect(underTest).toEqual(['Progress', 'Stories']);
    expect(layer(view, 'leaving')).toBeTruthy();
  });

  it('should swap at once, with nothing left fading, when told the change is instant', () => {
    const view = render(show('home', 'Stories'));

    view.rerender(
      <SectionCrossfade sectionKey="search" instant>
        <Section name="search" label="Search" />
      </SectionCrossfade>
    );

    expect(texts(view)).toEqual(['Search']);
    expect(layer(view, 'leaving')).toBeUndefined();
  });

  it('should go back to crossfading once changes are no longer instant', () => {
    const view = render(show('home', 'Stories'));
    view.rerender(
      <SectionCrossfade sectionKey="search" instant>
        <Section name="search" label="Search" />
      </SectionCrossfade>
    );

    view.rerender(show('profile', 'Profile'));

    expect(texts(view)).toEqual(['Profile', 'Search']);
    expect(layer(view, 'leaving')).toBeTruthy();
  });

  it('should keep the outgoing section on its own instance rather than remounting it', () => {
    const view = render(show('home', 'Stories'));

    view.rerender(show('progress', 'Progress'));

    const underTest = mounts;

    expect(underTest.home).toBe(1);
    expect(underTest.progress).toBe(1);
  });

  it('should refuse taps on the section that is leaving but take them on the new one', () => {
    const view = render(show('home', 'Stories'));

    view.rerender(show('progress', 'Progress'));

    expect(layer(view, 'leaving').props.pointerEvents).toBe('none');
    expect(layer(view, 'current').props.pointerEvents).toBe('auto');
  });

  it('should let the outgoing section go once it has faded', () => {
    const view = render(show('home', 'Stories'));
    view.rerender(show('progress', 'Progress'));

    act(() => {
      jest.advanceTimersByTime(SECTION_CROSSFADE.outMs);
    });

    expect(texts(view)).toEqual(['Progress']);
    expect(layer(view, 'leaving')).toBeUndefined();
  });

  it('should follow content changes within the same section immediately', () => {
    const view = render(show('home', 'Stories'));

    view.rerender(show('home', 'Bedtime Stories'));

    const underTest = texts(view);

    expect(underTest).toEqual(['Bedtime Stories']);
  });

  it('should fade out the section as it last looked, not as it first appeared', () => {
    const view = render(show('home', 'Stories'));
    view.rerender(show('home', 'Bedtime Stories'));

    view.rerender(show('progress', 'Progress'));

    const underTest = texts(view);

    expect(underTest).toEqual(['Progress', 'Bedtime Stories']);
  });

  it('should keep the outgoing section steady even if the parent re-renders mid-fade', () => {
    const view = render(show('home', 'Stories'));
    view.rerender(show('progress', 'Progress'));

    view.rerender(show('progress', 'Progress with badges'));

    expect(texts(view)).toEqual(['Progress with badges', 'Stories']);
    expect(mounts.home).toBe(1);
  });

  it('should land on the last section asked for when taps come quickly', () => {
    const view = render(show('home', 'Stories'));
    view.rerender(show('search', 'Search'));
    view.rerender(show('progress', 'Progress'));

    act(() => {
      jest.advanceTimersByTime(SECTION_CROSSFADE.outMs);
    });

    const underTest = texts(view);

    expect(underTest).toEqual(['Progress']);
  });

  it('should welcome a section back without remounting it if the child changes their mind mid-fade', () => {
    const view = render(show('home', 'Stories'));
    view.rerender(show('progress', 'Progress'));

    view.rerender(show('home', 'Stories'));

    expect(texts(view)).toEqual(['Stories', 'Progress']);
    expect(mounts.home).toBe(1);
  });
});

/**
 * A section lifts a little as it fades. Artwork that has to stay exactly where
 * the same artwork sits behind the sections -- the planet the shelves slide
 * under -- is pinned against that lift, so the two copies never part and the
 * fade between identical pictures cannot be seen.
 */
describe('PinnedInSection', () => {
  const animatedStyle = useAnimatedStyle as unknown as jest.Mock;
  const sharedValue = useSharedValue as unknown as jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    animatedStyle.mockImplementation((worklet: () => unknown) => worklet());
    sharedValue.mockImplementation((initial: number = 0) => React.useRef({ value: initial }).current);
  });

  afterEach(() => {
    animatedStyle.mockImplementation(() => ({}));
    sharedValue.mockImplementation((initial: number = 0) => ({ value: initial }));
    jest.useRealTimers();
  });

  function shiftOf(view: ReturnType<typeof render>, testID: string): number {
    const node = view.UNSAFE_queryAllByProps({ testID }).filter((n) => n.props.style)[0];
    const flat = StyleSheet.flatten(node.props.style) as { transform?: { translateY?: number }[] };

    return flat.transform?.find((entry) => 'translateY' in entry)?.translateY ?? 0;
  }

  it('should cancel the lift of the section it is in, exactly', () => {
    const view = render(
      <SectionCrossfade sectionKey="home">
        <PinnedInSection testID="pinned">
          <Text>planet</Text>
        </PinnedInSection>
      </SectionCrossfade>
    );

    view.rerender(
      <SectionCrossfade sectionKey="library">
        <PinnedInSection testID="pinned">
          <Text>planet</Text>
        </PinnedInSection>
      </SectionCrossfade>
    );

    const lifted = shiftOf(view, 'section-crossfade-current');
    const pinned = view.UNSAFE_queryAllByProps({ testID: 'pinned' }).filter((n) => n.props.style);
    const enteringPin = StyleSheet.flatten(pinned[0].props.style) as { transform: { translateY: number }[] };

    expect(lifted).toBe(SECTION_CROSSFADE.lift);
    expect(enteringPin.transform[0].translateY).toBe(-SECTION_CROSSFADE.lift);
  });

  it('should stay put, and never take a touch, outside a crossfade', () => {
    const view = render(
      <PinnedInSection testID="pinned">
        <Text>planet</Text>
      </PinnedInSection>
    );

    const node = view.UNSAFE_queryAllByProps({ testID: 'pinned' }).filter((n) => n.props.style)[0];

    expect(shiftOf(view, 'pinned')).toBe(0);
    expect(node.props.pointerEvents).toBe('none');
  });
});
