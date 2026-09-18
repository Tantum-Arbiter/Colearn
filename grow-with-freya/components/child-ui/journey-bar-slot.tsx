import React, { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { ChildBottomNavigationBar, type ChildBottomNavigationBarProps } from './child-bottom-navigation';

export const JOURNEY_BAR_LAYER_Z = 1500;

type Publish = (key: string, props: ChildBottomNavigationBarProps | null) => void;

const PublishContext = createContext<Publish | null>(null);
const BarsContext = createContext<Record<string, ChildBottomNavigationBarProps> | null>(null);

export function JourneyBarProvider({ children }: { children: ReactNode }) {
  const [bars, setBars] = useState<Record<string, ChildBottomNavigationBarProps>>({});
  const publish = useCallback((key: string, props: ChildBottomNavigationBarProps | null) => {
    setBars((current) => {
      if (props === null) {
        if (!(key in current)) return current;
        const { [key]: _removed, ...rest } = current;
        return rest;
      }
      return { ...current, [key]: props };
    });
  }, []);

  return (
    <PublishContext.Provider value={publish}>
      <BarsContext.Provider value={bars}>{children}</BarsContext.Provider>
    </PublishContext.Provider>
  );
}

export function useJourneyBarPublisher(): Publish | null {
  return useContext(PublishContext);
}

interface JourneyBarOutletProps {
  pageKey: string;
  /** How long the pages take to slide. The bar of the page being left stays up for this long
   *  while the next page mounts and sends its own, so the bar never blinks out mid-slide. */
  holdMs?: number;
}

export function JourneyBarOutlet({ pageKey, holdMs = 0 }: JourneyBarOutletProps) {
  const bars = useContext(BarsContext);
  const current = bars?.[pageKey];
  const [held, setHeld] = useState<ChildBottomNavigationBarProps | undefined>(current);

  useEffect(() => {
    if (current) {
      setHeld(current);
      return undefined;
    }
    if (holdMs <= 0) {
      setHeld(undefined);
      return undefined;
    }
    const timer = setTimeout(() => setHeld(undefined), holdMs);
    return () => clearTimeout(timer);
  }, [current, holdMs, pageKey]);

  const props = current ?? held;
  if (!props) return null;

  return (
    <View style={styles.layer} pointerEvents="box-none" testID="journey-bar-outlet">
      <ChildBottomNavigationBar {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: JOURNEY_BAR_LAYER_Z,
  },
});
