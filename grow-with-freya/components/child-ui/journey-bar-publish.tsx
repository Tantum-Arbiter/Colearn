import React, { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { ChildBottomNavigationBarProps } from './child-bottom-navigation';

type Publish = (key: string, props: ChildBottomNavigationBarProps | null) => void;

const PublishContext = createContext<Publish | null>(null);
const BarsContext = createContext<Record<string, ChildBottomNavigationBarProps> | null>(null);

export function JourneyBarPublishProvider({ children }: { children: ReactNode }) {
  const [bars, setBars] = useState<Record<string, ChildBottomNavigationBarProps>>({});
  const publish = useCallback<Publish>((key, props) => {
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

export function useJourneyBars(): Record<string, ChildBottomNavigationBarProps> | null {
  return useContext(BarsContext);
}
