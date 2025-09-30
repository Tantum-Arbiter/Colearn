import React from 'react';
import { Image, View } from 'react-native';
import { ASSET_DIMENSIONS } from './assets';
import { CloudSvg, FreyaRocketSvg, FreyaRocketRightSvg } from './svg-components';

export const Cloud1 = React.memo(function Cloud1({
  width = ASSET_DIMENSIONS.cloud1.width,
  height = ASSET_DIMENSIONS.cloud1.height
}: {
  width?: number;
  height?: number;
}) {
  return (
    <CloudSvg
      width={width}
      height={height}
      opacity={0.8}
    />
  );
});

export const Cloud2 = React.memo(function Cloud2({
  width = ASSET_DIMENSIONS.cloud2.width,
  height = ASSET_DIMENSIONS.cloud2.height
}: {
  width?: number;
  height?: number;
}) {
  return (
    <CloudSvg
      width={width}
      height={height}
      opacity={0.6}
    />
  );
});

export const FreyaRocket = React.memo(function FreyaRocket({
  width = ASSET_DIMENSIONS.rocket.width,
  height = ASSET_DIMENSIONS.rocket.height
}: {
  width?: number;
  height?: number;
}) {
  return (
    <FreyaRocketSvg
      width={width}
      height={height}
      opacity={0.9}
    />
  );
});

export const FreyaRocketRight = React.memo(function FreyaRocketRight({
  width = ASSET_DIMENSIONS.rocket.width,
  height = ASSET_DIMENSIONS.rocket.height
}: {
  width?: number;
  height?: number;
}) {
  return (
    <FreyaRocketRightSvg
      width={width}
      height={height}
      opacity={0.9}
    />
  );
});

export const BearImage = React.memo(function BearImage() {
  return (
    <View style={{
      width: '100%',
      height: '100%',
      justifyContent: 'flex-end',
      alignItems: 'center',
    }}>
      <Image
        source={require('../../assets/images/ui-elements/bear-bottom-screen.png')}
        style={{
          width: 286, // 10% bigger than 260 (260 * 1.1 = 286)
          height: 286, // 10% bigger than 260 (260 * 1.1 = 286)
          opacity: 0.8,
        }}
        resizeMode="contain"
        fadeDuration={200}
        resizeMethod="resize"
      />
    </View>
  );
});
