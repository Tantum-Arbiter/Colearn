import React, { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChildBottomNavigationBar, type ChildBottomNavigationBarProps } from './child-bottom-navigation';
import { JourneyBarCoverProvider, useJourneyBarCovered } from './journey-bar-cover';
import { JourneyBarPublishProvider, useJourneyBars } from './journey-bar-publish';
import { navClearance } from './nav-metrics';

export { useJourneyBarPublisher } from './journey-bar-publish';

export const JOURNEY_BAR_LAYER_Z = 1500;

export function JourneyBarProvider({ children }: { children: ReactNode }) {
  return (
    <JourneyBarPublishProvider>
      <JourneyBarCoverProvider>{children}</JourneyBarCoverProvider>
    </JourneyBarPublishProvider>
  );
}

interface JourneyBarOutletProps {
  pageKey: string;
  /** How long the pages take to slide. The bar of the page being left stays up for this long
   *  while the next page mounts and sends its own, so the bar never blinks out mid-slide. */
  holdMs?: number;
}

export function JourneyBarOutlet({ pageKey, holdMs = 0 }: JourneyBarOutletProps) {
  const bars = useJourneyBars();
  const current = bars?.[pageKey];
  const [held, setHeld] = useState<{ page: string; bar: ChildBottomNavigationBarProps } | undefined>(
    current ? { page: pageKey, bar: current } : undefined
  );

  useEffect(() => {
    if (current) {
      setHeld({ page: pageKey, bar: current });
      return undefined;
    }
    // only a slide is bridged: a page taking its own bar away, as the profile
    // does under its edit sheet, loses it at once rather than having it drawn
    // over whatever rose in its place
    if (holdMs <= 0 || held?.page === pageKey) {
      setHeld(undefined);
      return undefined;
    }
    const timer = setTimeout(() => setHeld(undefined), holdMs);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `held` is read, not watched: it is what this effect sets
  }, [current, holdMs, pageKey]);

  const covered = useJourneyBarCovered();
  const insets = useSafeAreaInsets();
  const props = current ?? held?.bar;
  if (!props || covered) return null;

  return (
    <View
      style={[styles.layer, { height: navClearance(insets.bottom) }]}
      pointerEvents="box-none"
      testID="journey-bar-outlet"
    >
      <ChildBottomNavigationBar {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: JOURNEY_BAR_LAYER_Z,
  },
});
