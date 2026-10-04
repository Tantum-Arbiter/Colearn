import { useCallback, useRef } from 'react';
import type { LayoutChangeEvent, ScrollView } from 'react-native';

export function useScrollToEndOnce(active: boolean) {
  const ref = useRef<ScrollView | null>(null);
  const done = useRef(false);
  const shown = useRef(0);
  const content = useRef(0);

  const decide = useCallback(() => {
    if (!active || done.current || shown.current <= 0 || content.current <= 0) return;
    if (content.current <= shown.current) return;
    done.current = true;
    ref.current?.scrollToEnd({ animated: false });
  }, [active]);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      shown.current = event.nativeEvent.layout.height;
      decide();
    },
    [decide]
  );

  const onContentSizeChange = useCallback(
    (_width: number, height: number) => {
      content.current = height;
      decide();
    },
    [decide]
  );

  return { ref, onLayout, onContentSizeChange };
}
