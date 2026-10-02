import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { ISLAND_ART, type IslandSheetArt } from '@/constants/island-art';
import { beamReach, lampFlare, pulseRing, villageGlow } from '@/constants/island-life';
import { artFrame, artPoint, type IslandLayout } from '@/constants/island-scene';
import { MoonlitImage } from './moonlit-image';

interface LampSheetProps {
  sheet: IslandSheetArt;
  index: number;
  layout: IslandLayout;
  lamp: SharedValue<number>;
}

const LampSheet = memo(function LampSheet({ sheet, index, layout, lamp }: LampSheetProps) {
  const frame = artFrame(sheet.frame, layout);
  const glimmer = useAnimatedStyle(() => ({ opacity: villageGlow(lamp.value, index) }));

  return (
    <Animated.View testID={sheet.id} style={[styles.piece, frame, glimmer]}>
      <MoonlitImage
        testID={`${sheet.id}-art`}
        source={sheet.source}
        frame={{ left: 0, top: 0, width: frame.width, height: frame.height }}
        night={false}
      />
    </Animated.View>
  );
});

export interface IslandLightsProps {
  layout: IslandLayout;
  lamp: SharedValue<number>;
}

export const IslandLights = memo(function IslandLights({ layout, lamp }: IslandLightsProps) {
  const { lighthouse, litWindows, villageLamps } = ISLAND_ART;
  const at = artPoint(lighthouse.x, lighthouse.y, layout);
  const glow = lighthouse.glowSize * layout.scale;
  const length = lighthouse.beamLength * layout.scale;
  const height = lighthouse.beamHeight * layout.scale;

  const pulse = lighthouse.pulseSize * layout.scale;

  const flare = useAnimatedStyle(() => ({ opacity: lampFlare(lamp.value) }));
  const turning = useAnimatedStyle(() => ({ transform: [{ scaleX: beamReach(lamp.value) }] }));
  const spreading = useAnimatedStyle(() => {
    const ring = pulseRing(lamp.value);

    return { opacity: ring.opacity, transform: [{ scale: ring.scale }] };
  });

  return (
    <View
      testID="island-lights"
      style={styles.lights}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <MoonlitImage testID={litWindows.id} source={litWindows.source} frame={artFrame(litWindows.frame, layout)} night={false} />
      {villageLamps.map((sheet, index) => (
        <LampSheet key={sheet.id} sheet={sheet} index={index} layout={layout} lamp={lamp} />
      ))}
      <Animated.View
        testID="lighthouse-pulse"
        style={[styles.piece, { left: at.x - pulse / 2, top: at.y - pulse / 2, width: pulse, height: pulse }, spreading]}
      >
        <MoonlitImage
          testID="lighthouse-pulse-art"
          source={lighthouse.pulse}
          frame={{ left: 0, top: 0, width: pulse, height: pulse }}
          night={false}
        />
      </Animated.View>
      <Animated.View
        testID="lighthouse-beam"
        style={[styles.piece, { left: at.x - length / 2, top: at.y - height / 2, width: length, height }, turning]}
      >
        <MoonlitImage
          testID="lighthouse-beam-art"
          source={lighthouse.beam}
          frame={{ left: 0, top: 0, width: length, height }}
          night={false}
        />
      </Animated.View>
      <Animated.View
        testID="lighthouse-glow"
        style={[styles.piece, { left: at.x - glow / 2, top: at.y - glow / 2, width: glow, height: glow }, flare]}
      >
        <MoonlitImage
          testID="lighthouse-glow-art"
          source={lighthouse.glow}
          frame={{ left: 0, top: 0, width: glow, height: glow }}
          night={false}
        />
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  lights: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  piece: {
    position: 'absolute',
  },
});
