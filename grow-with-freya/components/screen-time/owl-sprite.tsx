import React, { memo, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import {
  OWL_CLIPS,
  OWL_SHEET,
  OWL_SHEET_HEIGHT,
  OWL_SHEET_SOURCE,
  OWL_SHEET_WIDTH,
  owlFrameOffset,
  type OwlClipName,
} from '@/constants/owl-companion';

export interface OwlSpriteProps {
  clip: OwlClipName;
  width: number;
  onClipEnd?: () => void;
  testID?: string;
}

export const OwlSprite = memo(function OwlSprite({
  clip,
  width,
  onClipEnd,
  testID = 'owl-sprite',
}: OwlSpriteProps) {
  const reduceMotion = useReducedMotion();
  const [stepIndex, setStepIndex] = useState(0);

  const onClipEndRef = useRef(onClipEnd);
  onClipEndRef.current = onClipEnd;

  const { steps, loop } = OWL_CLIPS[clip];

  useEffect(() => {
    setStepIndex(0);
  }, [clip]);

  useEffect(() => {
    if (reduceMotion) {
      if (loop) return;
      const settle = setTimeout(() => onClipEndRef.current?.(), 0);
      return () => clearTimeout(settle);
    }

    let index = 0;
    let timer: ReturnType<typeof setTimeout>;

    const schedule = () => {
      timer = setTimeout(() => {
        const next = index + 1;

        if (next < steps.length) {
          index = next;
          setStepIndex(index);
          schedule();
          return;
        }

        if (loop) {
          index = 0;
          setStepIndex(index);
          schedule();
          return;
        }

        onClipEndRef.current?.();
      }, steps[index].ms);
    };

    schedule();

    return () => clearTimeout(timer);
  }, [clip, loop, reduceMotion, steps]);

  const scale = width / OWL_SHEET.frameWidth;
  const height = width * (OWL_SHEET.frameHeight / OWL_SHEET.frameWidth);
  const frame = steps[Math.min(stepIndex, steps.length - 1)].frame;
  const offset = owlFrameOffset(frame);

  return (
    <View style={[styles.window, { width, height }]} testID={testID} pointerEvents="none">
      <Image
        testID="owl-sprite-sheet"
        source={OWL_SHEET_SOURCE}
        contentFit="fill"
        style={{
          position: 'absolute',
          width: OWL_SHEET_WIDTH * scale,
          height: OWL_SHEET_HEIGHT * scale,
          left: offset.left * scale,
          top: offset.top * scale,
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  window: {
    overflow: 'hidden',
  },
});
