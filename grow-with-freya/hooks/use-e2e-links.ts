import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { applyE2eState, parseE2eLink } from '@/services/e2e-state';
import { useAppStore } from '@/store/app-store';

export function useE2eLinks(allowed: boolean): void {
  const hydrated = useAppStore((state) => state.hasHydrated);

  useEffect(() => {
    if (!allowed || !hydrated) return undefined;

    let live = true;

    const seed = (url: string | null) => {
      if (!live || !url) return;
      const state = parseE2eLink(url);
      if (state) void applyE2eState(state, allowed);
    };

    void Linking.getInitialURL().then(seed).catch(() => undefined);
    const subscription = Linking.addEventListener('url', (event) => seed(event.url));

    return () => {
      live = false;
      subscription.remove();
    };
  }, [allowed, hydrated]);
}
