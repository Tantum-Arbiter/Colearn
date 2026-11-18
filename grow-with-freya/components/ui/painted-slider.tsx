import React, { useRef } from 'react';
import { StyleSheet, View, type AccessibilityActionEvent, type GestureResponderEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PANEL_COLOURS } from '@/components/stories/language-panel';

export const PAINTED_SLIDER = {
  fill: PANEL_COLOURS.done.fill[0],
  rest: '#E8D3B0',
  restRim: '#D9BC8F',
  knob: PANEL_COLOURS.close.rim,
  knobFace: ['#FFD553', '#F5A60C'],
  knobRim: '#D98A06',
  step: 0.1,
} as const;

interface PaintedSliderProps {
  testID: string;
  accessibilityLabel: string;
  value: number;
  onValueChange: (value: number) => void;
  width: number;
  height: number;
  track: number;
  knob: { width: number; height: number };
}

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const tenths = (value: number) => Math.round(value * 10) / 10;

export function PaintedSlider({ testID, accessibilityLabel, value, onValueChange, width, height, track, knob }: PaintedSliderProps) {
  const start = useRef({ x: 0, page: 0 });
  const travel = Math.max(1, width - knob.width);
  const level = clamp(value);
  const valueAt = (x: number) => clamp((x - knob.width / 2) / travel);

  const grant = (event: GestureResponderEvent) => {
    start.current = { x: event.nativeEvent.locationX, page: event.nativeEvent.pageX };
    onValueChange(valueAt(start.current.x));
  };
  const move = (event: GestureResponderEvent) => {
    onValueChange(valueAt(start.current.x + event.nativeEvent.pageX - start.current.page));
  };
  const act = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'increment') onValueChange(clamp(tenths(level + PAINTED_SLIDER.step)));
    if (event.nativeEvent.actionName === 'decrement') onValueChange(clamp(tenths(level - PAINTED_SLIDER.step)));
  };

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(level * 100) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={act}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={grant}
      onResponderMove={move}
      style={{ width, height, justifyContent: 'center' }}
    >
      <View pointerEvents="none" style={[styles.rest, { height: track, borderRadius: track / 2, marginHorizontal: knob.width / 4 }]} />
      <View
        testID={`${testID}-fill`}
        pointerEvents="none"
        style={[styles.fill, { width: knob.width / 2 + level * travel, height: track, borderRadius: track / 2, top: (height - track) / 2 }]}
      />
      <View
        testID={`${testID}-knob`}
        pointerEvents="none"
        style={[styles.knob, { left: level * travel, top: (height - knob.height) / 2, width: knob.width, height: knob.height, borderRadius: knob.height / 2 }]}
      >
        <LinearGradient colors={PAINTED_SLIDER.knobFace} style={[styles.knobFace, { borderRadius: knob.height / 2 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rest: {
    backgroundColor: PAINTED_SLIDER.rest,
    borderWidth: 1,
    borderColor: PAINTED_SLIDER.restRim,
  },
  fill: {
    position: 'absolute',
    left: 0,
    backgroundColor: PAINTED_SLIDER.fill,
  },
  knob: {
    position: 'absolute',
    backgroundColor: PAINTED_SLIDER.knob,
    borderWidth: 2,
    borderColor: PAINTED_SLIDER.knobRim,
    overflow: 'hidden',
    shadowColor: '#7A4A00',
    shadowOpacity: 0.35,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  knobFace: {
    flex: 1,
  },
});
