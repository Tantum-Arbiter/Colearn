/**
 * One bar for the whole journey. The home page and the library each describe
 * the bar they want, and a single bar at the foot of the screen shows whichever
 * page is current -- so when the pages slide, the bar stays put and only its
 * highlight moves. Without a slot to send to, a bar simply draws itself where
 * it is, which is how every screen test sees it.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, act } from '@testing-library/react-native';
import { ChildBottomNavigation, navClearance } from '@/components/child-ui/child-bottom-navigation';
import { JourneyBarProvider, JourneyBarOutlet } from '@/components/child-ui/journey-bar-slot';
import { useCoversJourneyBar } from '@/components/child-ui/journey-bar-cover';


function bars(tree: ReturnType<typeof render>) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'child-bottom-navigation' && n.props.accessibilityRole === 'tablist');
}

function tablist(tree: ReturnType<typeof render>) {
  return bars(tree)[0];
}

function has(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID).length > 0;
}

function selectedItem(tree: ReturnType<typeof render>) {
  return Array.from(new Set(tree.UNSAFE_root
    .findAll((n: any) => n.props.accessibilityRole === 'tab' && n.props.accessibilityState?.selected)
    .map((n: any) => n.props.testID as string)));
}

describe('the journey bar slot', () => {
  it('draws a bar in place when there is no slot to send it to', () => {
    const tree = render(<ChildBottomNavigation selected="home" onSelect={jest.fn()} slotKey="main" />);

    expect(bars(tree)).toHaveLength(1);
  });

  it('shows one bar, at the outlet, for the page that is current', () => {
    const tree = render(
      <JourneyBarProvider>
        <ChildBottomNavigation selected="home" onSelect={jest.fn()} slotKey="main" />
        <ChildBottomNavigation selected="search" onSelect={jest.fn()} slotKey="stories" />
        <JourneyBarOutlet pageKey="main" />
      </JourneyBarProvider>
    );

    expect(bars(tree)).toHaveLength(1);
    expect(selectedItem(tree)).toEqual(['navigation-item-home']);
  });

  describe('while the pages slide', () => {
    const lazy = (pageKey: string, storiesMounted: boolean) => (
      <JourneyBarProvider>
        <ChildBottomNavigation selected="home" onSelect={jest.fn()} slotKey="main" />
        {storiesMounted && <ChildBottomNavigation selected="search" onSelect={jest.fn()} slotKey="stories" />}
        <JourneyBarOutlet pageKey={pageKey} holdMs={800} />
      </JourneyBarProvider>
    );

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should keep the bar up, unchanged, while the next page is still mounting', () => {
      const tree = render(lazy('main', false));

      tree.rerender(lazy('stories', false));

      expect(bars(tree)).toHaveLength(1);
      expect(selectedItem(tree)).toEqual(['navigation-item-home']);
      expect(tablist(tree).props.pointerEvents).toBe('auto');
    });

    it('should take up the next page\'s bar the moment it arrives, in the same place', () => {
      const tree = render(lazy('main', false));
      tree.rerender(lazy('stories', false));

      tree.rerender(lazy('stories', true));

      expect(bars(tree)).toHaveLength(1);
      expect(selectedItem(tree)).toEqual(['navigation-item-search']);
    });

    it('should let the bar go once the slide is over, when the page it slid to has none', () => {
      const tree = render(lazy('main', false));

      tree.rerender(lazy('account', false));
      expect(bars(tree)).toHaveLength(1);

      act(() => {
        jest.advanceTimersByTime(800);
      });
      expect(bars(tree)).toHaveLength(0);
      expect(jest.getTimerCount()).toBe(0);
    });

    /**
     * The hold is for a page change: the old page's bar bridges the slide
     * until the new one mounts its own. A page that takes its own bar away --
     * the profile's edit sheet rising over it -- is not a slide, and holding
     * the bar there left it drawn over the sheet for the length of a slide.
     */
    it('should let the bar go at once when the current page takes it away, with no slide to bridge', () => {
      const page = (withBar: boolean) => (
        <JourneyBarProvider>
          {withBar && <ChildBottomNavigation selected="profile" onSelect={jest.fn()} slotKey="stories" />}
          <JourneyBarOutlet pageKey="stories" holdMs={800} />
        </JourneyBarProvider>
      );
      const tree = render(page(true));

      tree.rerender(page(false));

      expect(bars(tree)).toHaveLength(0);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('should still hold the bar across a slide after the page it came from had hidden and shown it again', () => {
      const page = (pageKey: string, withBar: boolean) => (
        <JourneyBarProvider>
          {withBar && <ChildBottomNavigation selected="home" onSelect={jest.fn()} slotKey="main" />}
          <JourneyBarOutlet pageKey={pageKey} holdMs={800} />
        </JourneyBarProvider>
      );
      const tree = render(page('main', true));
      tree.rerender(page('main', false));
      tree.rerender(page('main', true));

      tree.rerender(page('stories', true));

      expect(bars(tree)).toHaveLength(1);
      expect(selectedItem(tree)).toEqual(['navigation-item-home']);
    });

    it('should never draw a teardrop or a splash: the bar simply stays where it is', () => {
      const tree = render(lazy('main', false));

      tree.rerender(lazy('stories', true));
      act(() => {
        jest.advanceTimersByTime(400);
      });

      expect(has(tree, 'journey-bar-drop')).toBe(false);
      expect(has(tree, 'journey-bar-splash')).toBe(false);
      expect(tablist(tree).props.pointerEvents).toBe('auto');
    });
  });

  it('keeps the same bar and moves its highlight when the current page changes', () => {
    const onSelectStories = jest.fn();
    const scene = (pageKey: string) => (
      <JourneyBarProvider>
        <ChildBottomNavigation selected="home" onSelect={jest.fn()} slotKey="main" />
        <ChildBottomNavigation selected="search" onSelect={onSelectStories} slotKey="stories" />
        <JourneyBarOutlet pageKey={pageKey} />
      </JourneyBarProvider>
    );
    const tree = render(scene('main'));

    tree.rerender(scene('stories'));

    expect(bars(tree)).toHaveLength(1);
    expect(selectedItem(tree)).toEqual(['navigation-item-search']);
    const tab = tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'navigation-item-profile' && n.props.accessibilityRole === 'tab')[0];
    act(() => tab.props.onPress());
    expect(onSelectStories).toHaveBeenCalledWith('profile');
  });

  it('shows nothing for a page that has no bar, and nothing once a page takes its bar away', () => {
    const scene = (withBar: boolean, pageKey: string) => (
      <JourneyBarProvider>
        {withBar && <ChildBottomNavigation selected="home" onSelect={jest.fn()} slotKey="main" />}
        <JourneyBarOutlet pageKey={pageKey} />
      </JourneyBarProvider>
    );
    const tree = render(scene(true, 'account'));
    expect(bars(tree)).toHaveLength(0);

    tree.rerender(scene(true, 'main'));
    expect(bars(tree)).toHaveLength(1);

    tree.rerender(scene(false, 'main'));
    expect(bars(tree)).toHaveLength(0);
  });
});

/**
 * A full-screen overlay opened from inside a page -- the plans, the trial's
 * end -- is drawn within that page, and the bar is drawn above every page. So
 * an overlay says it is covering the screen, and while any overlay does, the
 * bar steps out: hidden behind it, and out of reach of a tap.
 */
describe('an overlay covering the bar', () => {
  function Cover({ active }: { active: boolean }) {
    useCoversJourneyBar(active);
    return null;
  }

  function renderWith(active: boolean) {
    return render(
      <JourneyBarProvider>
        <ChildBottomNavigation selected="home" onSelect={jest.fn()} slotKey="main" />
        <Cover active={active} />
        <JourneyBarOutlet pageKey="main" />
      </JourneyBarProvider>
    );
  }

  it('takes the bar away while it is up', () => {
    const tree = renderWith(true);

    expect(bars(tree)).toHaveLength(0);
  });

  it('gives the bar back once it has gone', () => {
    const tree = renderWith(true);

    tree.rerender(
      <JourneyBarProvider>
        <ChildBottomNavigation selected="home" onSelect={jest.fn()} slotKey="main" />
        <Cover active={false} />
        <JourneyBarOutlet pageKey="main" />
      </JourneyBarProvider>
    );

    expect(bars(tree)).toHaveLength(1);
  });

  it('keeps the bar away until every overlay has gone', () => {
    const tree = render(
      <JourneyBarProvider>
        <ChildBottomNavigation selected="home" onSelect={jest.fn()} slotKey="main" />
        <Cover active />
        <Cover active />
        <JourneyBarOutlet pageKey="main" />
      </JourneyBarProvider>
    );

    tree.rerender(
      <JourneyBarProvider>
        <ChildBottomNavigation selected="home" onSelect={jest.fn()} slotKey="main" />
        <Cover active />
        <Cover active={false} />
        <JourneyBarOutlet pageKey="main" />
      </JourneyBarProvider>
    );

    expect(bars(tree)).toHaveLength(0);
  });

  it('does nothing without a bar to cover, as on every screen test', () => {
    expect(() => render(<Cover active />)).not.toThrow();
  });

  it('covers only the foot of the screen, so the page above it stays reachable', () => {
    const view = render(
      <JourneyBarProvider>
        <ChildBottomNavigation selected="home" onSelect={jest.fn()} slotKey="main" />
        <JourneyBarOutlet pageKey="main" />
      </JourneyBarProvider>
    );

    const layer = view.UNSAFE_root.findAll((node: any) => node.props.testID === 'journey-bar-outlet')[0];
    const style = StyleSheet.flatten(layer.props.style);

    expect(style.position).toBe('absolute');
    expect(style.bottom).toBe(0);
    expect(style.top).toBeUndefined();
    expect(style.height).toBe(navClearance(34));
  });
});
