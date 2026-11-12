import React, { createContext, useCallback, useContext, useEffect, useId, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { JOURNEY_BAR_LAYER_Z } from '@/components/child-ui/journey-bar-slot';

type Show = (key: string, content: ReactNode | null) => void;

const ShowContext = createContext<Show | null>(null);
const LayersContext = createContext<Record<string, ReactNode>>({});
const PageShownContext = createContext(true);

export function OwlGuideLayerProvider({ children }: { children: ReactNode }) {
  const [layers, setLayers] = useState<Record<string, ReactNode>>({});
  const show = useCallback<Show>((key, content) => {
    setLayers((current) => {
      if (content === null) {
        if (!(key in current)) return current;
        const { [key]: _removed, ...rest } = current;
        return rest;
      }
      return { ...current, [key]: content };
    });
  }, []);

  return (
    <ShowContext.Provider value={show}>
      <LayersContext.Provider value={layers}>{children}</LayersContext.Provider>
    </ShowContext.Provider>
  );
}

/**
 * Marks whether the page around it is the one on screen. Pages are mounted
 * ahead of being shown; a guide in one that is not showing draws nothing.
 */
export function OwlGuidePage({ current, children }: { current: boolean; children: ReactNode }) {
  return <PageShownContext.Provider value={current}>{children}</PageShownContext.Provider>;
}

/** Wraps each page in a map of pages so its guide knows whether it is on screen. */
export function guidePages<K extends string>(pages: Record<K, ReactNode>, currentPage: string): Record<K, ReactNode> {
  const wrapped = {} as Record<K, ReactNode>;
  (Object.keys(pages) as K[]).forEach((key) => {
    const page = pages[key];
    wrapped[key] =
      page === null ? null : (
        <OwlGuidePage key={key} current={key === currentPage}>
          {page}
        </OwlGuidePage>
      );
  });
  return wrapped;
}

/**
 * Pages sit under the shared journey bar, so a guide drawn in its page is
 * covered by the bar it may be pointing at. With a layer mounted, the guide is
 * drawn there and this returns nothing to draw in place; without one, the
 * guide is returned to draw where it stands.
 */
export function useGuideOnTop(content: ReactNode): ReactNode {
  const show = useContext(ShowContext);
  const pageShown = useContext(PageShownContext);
  const key = useId();

  useEffect(() => {
    show?.(key, pageShown ? content ?? null : null);
  });

  useEffect(() => () => show?.(key, null), [show, key]);

  return show ? null : content;
}

export function OwlGuideLayer() {
  const layers = useContext(LayersContext);
  const entries = Object.entries(layers);
  if (entries.length === 0) return null;

  return (
    <View style={styles.layer} pointerEvents="box-none" testID="owl-guide-layer">
      {entries.map(([key, content]) => (
        <React.Fragment key={key}>{content}</React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
    zIndex: JOURNEY_BAR_LAYER_Z + 100,
  },
});
