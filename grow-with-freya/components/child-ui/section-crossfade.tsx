import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withTiming, Easing } from 'react-native-reanimated';

export const SECTION_CROSSFADE = {
  outMs: 180,
  inMs: 260,
  overlapMs: 180,
  lift: 10,
} as const;

type Phase = 'current' | 'entering' | 'leaving';

interface SectionCrossfadeProps {
  sectionKey: string;
  children: ReactNode;
  testID?: string;
}

interface LayerProps {
  phase: Phase;
  testID: string;
  children: ReactNode;
}

interface ViewState {
  key: string;
  leaving: { key: string; node: ReactNode } | null;
  generation: number;
}

function Layer({ phase, testID, children }: LayerProps) {
  const opacity = useSharedValue(phase === 'entering' ? 0 : 1);
  const lift = useSharedValue(phase === 'entering' ? SECTION_CROSSFADE.lift : 0);

  useEffect(() => {
    if (phase === 'leaving') {
      opacity.value = withTiming(0, { duration: SECTION_CROSSFADE.outMs, easing: Easing.in(Easing.quad) });
      lift.value = withTiming(-SECTION_CROSSFADE.lift, { duration: SECTION_CROSSFADE.outMs, easing: Easing.in(Easing.quad) });
      return;
    }
    if (phase === 'entering') {
      const wait = SECTION_CROSSFADE.outMs - SECTION_CROSSFADE.overlapMs;
      opacity.value = withDelay(wait, withTiming(1, { duration: SECTION_CROSSFADE.inMs, easing: Easing.out(Easing.cubic) }));
      lift.value = withDelay(wait, withTiming(0, { duration: SECTION_CROSSFADE.inMs, easing: Easing.out(Easing.cubic) }));
      return;
    }
    opacity.value = withTiming(1, { duration: SECTION_CROSSFADE.inMs, easing: Easing.out(Easing.cubic) });
    lift.value = withTiming(0, { duration: SECTION_CROSSFADE.inMs, easing: Easing.out(Easing.cubic) });
  }, [phase, opacity, lift]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: lift.value }],
  }));

  return (
    <Animated.View
      testID={testID}
      style={[phase === 'leaving' ? StyleSheet.absoluteFill : styles.fill, style]}
      pointerEvents={phase === 'leaving' ? 'none' : 'auto'}
    >
      {children}
    </Animated.View>
  );
}

export function SectionCrossfade({ sectionKey, children, testID = 'section-crossfade' }: SectionCrossfadeProps) {
  const [view, setView] = useState<ViewState>({ key: sectionKey, leaving: null, generation: 0 });
  const latest = useRef<ReactNode>(children);

  useEffect(() => {
    latest.current = children;
  });

  if (view.key !== sectionKey) {
    setView({
      key: sectionKey,
      leaving: { key: view.key, node: latest.current },
      generation: view.generation + 1,
    });
  }

  const leavingKey = view.leaving?.key ?? null;

  useEffect(() => {
    if (leavingKey === null) {
      return;
    }
    const clear = setTimeout(() => {
      setView((current) => (current.leaving?.key === leavingKey ? { ...current, leaving: null } : current));
    }, SECTION_CROSSFADE.outMs);

    return () => clearTimeout(clear);
  }, [leavingKey, view.generation]);

  const settled = view.key === sectionKey;
  const leaving = settled && view.leaving && view.leaving.key !== sectionKey ? view.leaving : null;

  return (
    <View testID={testID} style={styles.fill}>
      <Layer key={sectionKey} phase={view.generation === 0 || !settled ? 'current' : leaving ? 'entering' : 'current'} testID={`${testID}-current`}>
        {children}
      </Layer>
      {leaving ? (
        <Layer key={leaving.key} phase="leaving" testID={`${testID}-leaving`}>
          {leaving.node}
        </Layer>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
