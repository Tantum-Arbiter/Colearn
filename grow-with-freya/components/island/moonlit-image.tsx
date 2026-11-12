import React, { memo } from 'react';
import { StyleSheet, type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import { ISLAND_NIGHT, type IslandFrame } from '@/constants/island-scene';

export interface MoonlitImageProps {
  testID: string;
  source: ImageSourcePropType;
  frame: IslandFrame;
  night: boolean;
}

export const MoonlitImage = memo(function MoonlitImage({ testID, source, frame, night }: MoonlitImageProps) {
  return (
    <>
      <Image
        testID={testID}
        source={source}
        style={[styles.piece, frame]}
        contentFit="fill"
        transition={0}
        pointerEvents="none"
        alt=""
      />
      {night ? (
        <Image
          testID={`${testID}-night`}
          source={source}
          tintColor={ISLAND_NIGHT.tint}
          style={[styles.piece, frame, styles.shade]}
          contentFit="fill"
          transition={0}
          pointerEvents="none"
          alt=""
        />
      ) : null}
    </>
  );
});

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
  },
  shade: {
    opacity: ISLAND_NIGHT.strength,
  },
});
