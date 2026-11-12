import React, { memo } from 'react';
import { StyleSheet, View, type ImageSourcePropType } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { ISLAND_ART, type IslandArt, type IslandFallArt, type IslandPoolArt } from '@/constants/island-art';
import { ISLAND_LIFE, fallShift, poolRing, sprayPose } from '@/constants/island-life';
import { artFrame, artPoint, type IslandLayout } from '@/constants/island-scene';
import { MoonlitImage } from './moonlit-image';

const RINGS = Array.from({ length: ISLAND_LIFE.poolRings }, (_, ring) => ring);
const PUFFS = [0, 1];

interface PieceProps {
  testID: string;
  source: ImageSourcePropType;
  index: number;
  left: number;
  top: number;
  width: number;
  height: number;
  clock: SharedValue<number>;
}

const Puff = memo(function Puff({ testID, source, index, left, top, width, height, clock }: PieceProps) {
  const rising = useAnimatedStyle(() => {
    const pose = sprayPose(clock.value, index);

    return { opacity: pose.opacity, transform: [{ scale: pose.scale }] };
  });

  return (
    <Animated.View testID={testID} pointerEvents="none" style={[styles.piece, { left, top, width, height }, rising]}>
      <MoonlitImage testID={`${testID}-art`} source={source} frame={{ left: 0, top: 0, width, height }} night={false} />
    </Animated.View>
  );
});

const Ring = memo(function Ring({ testID, source, index, left, top, width, height, clock }: PieceProps) {
  const spreading = useAnimatedStyle(() => {
    const pose = poolRing(clock.value, index);

    return { opacity: pose.opacity, transform: [{ scale: pose.scale }] };
  });

  return (
    <Animated.View testID={testID} style={[styles.piece, { left, top, width, height }, spreading]}>
      <MoonlitImage testID={`${testID}-art`} source={source} frame={{ left: 0, top: 0, width, height }} night={false} />
    </Animated.View>
  );
});

interface FallProps {
  fall: IslandFallArt;
  layout: IslandLayout;
  clock: SharedValue<number>;
}

const FallStreaks = memo(function FallStreaks({ fall, layout, clock }: FallProps) {
  const frame = artFrame(fall.frame, layout);
  const tile = fall.tile;
  const scale = layout.scale;

  const running = useAnimatedStyle(() => ({
    transform: [{ translateY: fallShift(clock.value, tile) * scale }],
  }));

  return (
    <View testID={`${fall.id}-window`} pointerEvents="none" style={[styles.piece, styles.window, frame]}>
      <Animated.View testID={`${fall.id}-streaks`} style={[styles.piece, styles.inside, running]}>
        <MoonlitImage
          testID={`${fall.id}-streaks-art`}
          source={fall.streaks}
          frame={{ left: 0, top: 0, width: frame.width, height: (fall.frame.height + tile) * scale }}
          night={false}
        />
      </Animated.View>
    </View>
  );
});

interface PoolProps {
  pool: IslandPoolArt;
  ring: ImageSourcePropType;
  ringAspect: number;
  layout: IslandLayout;
  clock: SharedValue<number>;
}

const PoolRings = memo(function PoolRings({ pool, ring: ringSource, ringAspect, layout, clock }: PoolProps) {
  const frame = artFrame(pool.frame, layout);
  const centre = artPoint(pool.ringX, pool.ringY, layout);
  const width = pool.ringWidth * layout.scale;
  const height = width / ringAspect;

  return (
    <View testID={`${pool.id}-window`} pointerEvents="none" style={[styles.piece, styles.window, frame]}>
      {RINGS.map((ring) => (
        <Ring
          key={ring}
          testID={`${pool.id}-ring-${ring}`}
          source={ringSource}
          index={ring}
          left={centre.x - frame.left - width / 2}
          top={centre.y - frame.top - height / 2}
          width={width}
          height={height}
          clock={clock}
        />
      ))}
    </View>
  );
});

export interface IslandWaterfallsProps {
  art?: IslandArt;
  layout: IslandLayout;
  clock: SharedValue<number>;
}

export const IslandWaterfalls = memo(function IslandWaterfalls({ art = ISLAND_ART, layout, clock }: IslandWaterfallsProps) {
  const { falls, pools, spray, ring, ringAspect } = art;

  return (
    <>
      {falls.map((fall) => (
        <FallStreaks key={fall.id} fall={fall} layout={layout} clock={clock} />
      ))}
      {pools.map((pool) => (
        <PoolRings key={pool.id} pool={pool} ring={ring} ringAspect={ringAspect} layout={layout} clock={clock} />
      ))}
      {falls.map((fall) => (
        <MoonlitImage key={fall.id} testID={`${fall.id}-cover`} source={fall.cover} frame={artFrame(fall.frame, layout)} night={false} />
      ))}
      {pools.map((pool) => (
        <MoonlitImage key={pool.id} testID={`${pool.id}-cover`} source={pool.cover} frame={artFrame(pool.frame, layout)} night={false} />
      ))}
      {falls.map((fall) => {
        const foot = artPoint(fall.sprayX, fall.sprayY, layout);
        const size = fall.spraySize * layout.scale;

        return PUFFS.map((puff) => (
          <Puff
            key={`${fall.id}-${puff}`}
            testID={`${fall.id}-spray-${puff}`}
            source={spray}
            index={puff}
            left={foot.x - size / 2}
            top={foot.y - size / 2}
            width={size}
            height={size}
            clock={clock}
          />
        ));
      })}
    </>
  );
});

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
  },
  window: {
    overflow: 'hidden',
  },
  inside: {
    left: 0,
    top: 0,
  },
});
