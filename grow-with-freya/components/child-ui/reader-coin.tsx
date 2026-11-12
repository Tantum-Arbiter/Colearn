import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image, type ImageSource } from 'expo-image';

export type ReaderCoinName = 'exit' | 'menu' | 'sound' | 'back' | 'next' | 'done';

export const COIN_CANVAS = 1.25;
export const COIN_DIM_OPACITY = 0.5;
export const COIN_RIM = 0.06;
const SLASH_COLOUR = '#792B02';
const SLASH_EDGE = '#FFF4DA';

const COINS: Record<ReaderCoinName, ImageSource> = {
  exit: require('@/assets/images/reader-coins/coin-exit.webp'),
  menu: require('@/assets/images/reader-coins/coin-menu.webp'),
  sound: require('@/assets/images/reader-coins/coin-sound.webp'),
  back: require('@/assets/images/reader-coins/coin-back.webp'),
  next: require('@/assets/images/reader-coins/coin-next.webp'),
  done: require('@/assets/images/reader-coins/coin-done.webp'),
};

export function coinFrame(size: number): { art: number; offset: number } {
  const art = Math.round(size * COIN_CANVAS);
  return { art, offset: (size - art) / 2 };
}

interface ReaderCoinProps {
  coin: ReaderCoinName;
  size: number;
  dimmed?: boolean;
  slashed?: boolean;
}

export const ReaderCoin = memo(function ReaderCoin({ coin, size, dimmed = false, slashed = false }: ReaderCoinProps) {
  const { art, offset } = coinFrame(size);
  const thickness = Math.max(3, Math.round(size * 0.09));
  const length = size * 0.78;

  return (
    <View
      testID={`reader-coin-${coin}`}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size }}
    >
      <Image
        source={COINS[coin]}
        contentFit="contain"
        transition={0}
        style={[{ position: 'absolute', width: art, height: art, left: offset, top: offset }, dimmed ? { opacity: COIN_DIM_OPACITY } : null]}
      />
      {slashed ? (
        <View
          testID="reader-coin-slash"
          style={[
            styles.slash,
            {
              width: length,
              height: thickness,
              borderRadius: thickness / 2,
              left: (size - length) / 2,
              top: (size - thickness) / 2,
            },
          ]}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  slash: {
    position: 'absolute',
    backgroundColor: SLASH_COLOUR,
    borderWidth: 1.5,
    borderColor: SLASH_EDGE,
    transform: [{ rotate: '-45deg' }],
  },
});
