import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useNoteSwell, SWELL_RELEASE_MS } from '@/hooks/use-note-swell';
import type { InstrumentBell as InstrumentBellDefinition } from '@/services/music-asset-registry';
import type { BellPlacement } from '@/services/instrument-surface-layout';
import type { NoteEventBus } from '@/services/note-event-bus';

export const BELL_RELEASE_MS = SWELL_RELEASE_MS;

interface InstrumentBellProps {
  bell: InstrumentBellDefinition;
  placement: BellPlacement;
  noteEvents: NoteEventBus;
}

export const InstrumentBell = React.memo(function InstrumentBell({ bell, placement, noteEvents }: InstrumentBellProps) {
  const swell = useNoteSwell(noteEvents);

  const scaleX = bell.scale.x - 1;
  const scaleY = bell.scale.y - 1;
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleX: 1 + scaleX * swell.value },
      { scaleY: 1 + scaleY * swell.value },
    ],
  }), [scaleX, scaleY]);

  const frameStyle = useMemo(() => ({
    left: placement.left,
    top: placement.top,
    width: placement.width,
    height: placement.height,
    transformOrigin: `${Math.round(placement.originX)}px ${Math.round(placement.originY)}px`,
  }), [placement]);

  return (
    <Animated.Image
      source={bell.image}
      style={[styles.bell, frameStyle, animatedStyle]}
      resizeMode="stretch"
      testID="instrument-bell"
    />
  );
});

const styles = StyleSheet.create({
  bell: {
    position: 'absolute',
    pointerEvents: 'none',
  },
});
