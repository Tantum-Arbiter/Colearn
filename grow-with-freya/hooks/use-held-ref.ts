import { useCallback, type RefObject } from 'react';

export function useHeldRef<T>(target: RefObject<T | null>) {
  return useCallback(
    (node: T | null) => {
      if (node === null) return undefined;
      target.current = node;
      return () => {
        if (target.current === node) target.current = null;
      };
    },
    [target]
  );
}
