import React from 'react';

import Cloud1Icon from '../../assets/images/ui-elements/background-cloud-1.svg';
import Cloud2Icon from '../../assets/images/ui-elements/background-cloud-2.svg';
import FreyaRocketIcon from '../../assets/images/ui-elements/freya-rocket.svg';
import FreyaRocketRightIcon from '../../assets/images/ui-elements/freya-rocket-right.svg';

interface SvgComponentProps {
  width?: number | string;
  height?: number | string;
  opacity?: number;
}

export const CloudSvg = React.memo(function CloudSvg({
  width = 120,
  height = 60,
  opacity = 0.8
}: SvgComponentProps) {
  return (
    <Cloud1Icon width={width} height={height} opacity={opacity} />
  );
});



export const FreyaRocketSvg = React.memo(function FreyaRocketSvg({
  width = 80,
  height = 80,
  opacity = 1
}: SvgComponentProps) {
  return (
    <FreyaRocketIcon width={width} height={height} opacity={opacity} />
  );
});

export const FreyaRocketRightSvg = React.memo(function FreyaRocketRightSvg({
  width = 80,
  height = 80,
  opacity = 1
}: SvgComponentProps) {
  return (
    <FreyaRocketRightIcon width={width} height={height} opacity={opacity} />
  );
});


export const Cloud1Svg = React.memo(function Cloud1Svg({
  width = 120,
  height = 60,
  opacity = 0.8
}: SvgComponentProps) {
  return (
    <Cloud1Icon width={width} height={height} opacity={opacity} />
  );
});

export const Cloud2Svg = React.memo(function Cloud2Svg({
  width = 120,
  height = 60,
  opacity = 0.6
}: SvgComponentProps) {
  return (
    <Cloud2Icon width={width} height={height} opacity={opacity} />
  );
});


export const Cloud1 = Cloud1Svg;
export const Cloud2 = Cloud2Svg;
