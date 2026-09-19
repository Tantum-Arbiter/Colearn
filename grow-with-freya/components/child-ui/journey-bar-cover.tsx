import React, { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

type Cover = (delta: 1 | -1) => void;

const CoverContext = createContext<Cover | null>(null);
const CoveredContext = createContext(false);

export function JourneyBarCoverProvider({ children }: { children: ReactNode }) {
  const [covers, setCovers] = useState(0);
  const cover = useCallback<Cover>((delta) => setCovers((count) => Math.max(count + delta, 0)), []);

  return (
    <CoverContext.Provider value={cover}>
      <CoveredContext.Provider value={covers > 0}>{children}</CoveredContext.Provider>
    </CoverContext.Provider>
  );
}

/** An overlay drawn inside a page that covers the whole screen takes the bar away while it is up. */
export function useCoversJourneyBar(active: boolean): void {
  const cover = useContext(CoverContext);

  useEffect(() => {
    if (!active || !cover) return undefined;
    cover(1);
    return () => cover(-1);
  }, [active, cover]);
}

export function useJourneyBarCovered(): boolean {
  return useContext(CoveredContext);
}
