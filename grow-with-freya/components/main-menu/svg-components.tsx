import React from 'react';
import { SvgProps } from 'react-native-svg';

import StoriesIcon from '../../assets/images/menu-icons/stories-icon.svg';
import SensoryIcon from '../../assets/images/menu-icons/sensory-icon.svg';
import EmotionsIcon from '../../assets/images/menu-icons/emotions-icon.svg';
import BedtimeIcon from '../../assets/images/menu-icons/bedtime-icon.svg';
import ScreentimeIcon from '../../assets/images/menu-icons/screentime-icon.svg';
import Cloud1Icon from '../../assets/images/ui-elements/background-cloud-1.svg';
import Cloud2Icon from '../../assets/images/ui-elements/background-cloud-2.svg';
import FreyaRocketIcon from '../../assets/images/ui-elements/freya-rocket.svg';
import FreyaRocketRightIcon from '../../assets/images/ui-elements/freya-rocket-right.svg';
const ICON_DIMENSIONS = {
  small: { width: 48, height: 48 },
  medium: { width: 58, height: 58 },
  large: { width: 70, height: 70 },
};

interface SvgComponentProps {
  width?: number | string;
  height?: number | string;
  opacity?: number;
}

const SVG_COMPONENTS: Record<string, React.ComponentType<SvgProps>> = {
  'menu-icons/stories-icon.svg': StoriesIcon,
  'menu-icons/sensory-icon.svg': SensoryIcon,
  'menu-icons/emotions-icon.svg': EmotionsIcon,
  'menu-icons/bedtime-icon.svg': BedtimeIcon,
  'menu-icons/screentime-icon.svg': ScreentimeIcon,
  'ui-elements/background-cloud-1.svg': Cloud1Icon,
  'ui-elements/background-cloud-2.svg': Cloud2Icon,
  'ui-elements/freya-rocket.svg': FreyaRocketIcon,
  'ui-elements/freya-rocket-right.svg': FreyaRocketRightIcon,
};
export const ActualSvgComponent = React.memo(function ActualSvgComponent({
  svgPath,
  width = ICON_DIMENSIONS.medium.width,
  height = ICON_DIMENSIONS.medium.height,
  opacity = 1
}: SvgComponentProps & { svgPath: string }) {
  const Component = SVG_COMPONENTS[svgPath];

  if (!Component) {
    console.warn(`SVG asset not found: ${svgPath}`);
    return null;
  }

  return (
    <Component
      width={width}
      height={height}
      opacity={opacity}
    />
  );
});


export const CloudSvg = React.memo(function CloudSvg({
  width = 120,
  height = 60,
  opacity = 0.8
}: SvgComponentProps) {
  return (
    <Cloud1Icon width={width} height={height} opacity={opacity} />
  );
});

export const StoriesSvg = React.memo(function StoriesSvg({
  width = ICON_DIMENSIONS.medium.width,
  height = ICON_DIMENSIONS.medium.height,
  opacity = 1
}: SvgComponentProps) {
  return (
    <StoriesIcon width={width} height={height} opacity={opacity} />
  );
});

export const EmotionsSvg = React.memo(function EmotionsSvg({
  width = ICON_DIMENSIONS.medium.width,
  height = ICON_DIMENSIONS.medium.height,
  opacity = 1
}: SvgComponentProps) {
  return (
    <EmotionsIcon width={width} height={height} opacity={opacity} />
  );
});

export const SensorySvg = React.memo(function SensorySvg({
  width = ICON_DIMENSIONS.medium.width,
  height = ICON_DIMENSIONS.medium.height,
  opacity = 1
}: SvgComponentProps) {
  return (
    <SensoryIcon width={width} height={height} opacity={opacity} />
  );
});

export const BedtimeSvg = React.memo(function BedtimeSvg({
  width = ICON_DIMENSIONS.medium.width,
  height = ICON_DIMENSIONS.medium.height,
  opacity = 1
}: SvgComponentProps) {
  return (
    <BedtimeIcon width={width} height={height} opacity={opacity} />
  );
});

export const ScreentimeSvg = React.memo(function ScreentimeSvg({
  width = ICON_DIMENSIONS.medium.width,
  height = ICON_DIMENSIONS.medium.height,
  opacity = 1
}: SvgComponentProps) {
  return (
    <ScreentimeIcon width={width} height={height} opacity={opacity} />
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
