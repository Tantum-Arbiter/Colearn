import React, { memo, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, FeGaussianBlur, Filter, Path, Text as SvgText, TextPath } from 'react-native-svg';
import { ARCHED_GREETING, archedGreetingLayout, fitToArc, planGreetingTitle, textAdvance } from '@/constants/arched-greeting';
import { Fonts } from '@/constants/theme';

export interface ArchedGreetingProps {
  title: string;
  subtitle: string;
  width: number;
  titleSize: number;
  subtitleSize: number;
  titleColor: string;
  subtitleColor: string;
  glowColor: string;
  testID?: string;
}

export const ArchedGreeting = memo(function ArchedGreeting({
  title,
  subtitle,
  width,
  titleSize,
  subtitleSize,
  titleColor,
  subtitleColor,
  glowColor,
  testID = 'home-welcome',
}: ArchedGreetingProps) {
  const id = useId().replace(/:/g, '');
  const plan = planGreetingTitle(title, titleSize, width);
  const fittedTitle = plan.size;
  const fittedSubtitle = fitToArc(subtitle, subtitleSize, width, ARCHED_GREETING.subtitleChordRatio, 'medium');
  const layout = archedGreetingLayout(width, fittedTitle, fittedSubtitle, plan.lines.length, {
    title: plan.lines.map((line) => textAdvance(line, fittedTitle, 'heavy')),
    subtitle: textAdvance(subtitle, fittedSubtitle, 'medium'),
  });
  const titleArc = (index: number) => `${id}-title-${index}`;
  const subtitleArc = `${id}-subtitle`;
  const glow = `${id}-glow`;

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="header"
      accessibilityLabel={`${title} ${subtitle}`}
      style={[styles.greeting, { width, height: layout.height }]}
    >
      <Svg width={width} height={layout.height}>
        <Defs>
          {layout.titlePaths.map((d, index) => (
            <Path key={d} id={titleArc(index)} d={d} />
          ))}
          <Path id={subtitleArc} d={layout.subtitlePath} />
          <Filter id={glow} x="-10%" y="-40%" width="120%" height="180%">
            <FeGaussianBlur stdDeviation={ARCHED_GREETING.glowBlur} />
          </Filter>
        </Defs>
        {plan.lines.map((line, index) => (
          <SvgText
            key={`glow-${index}`}
            fill={glowColor}
            filter={`url(#${glow})`}
            fontSize={fittedTitle}
            fontWeight="800"
            fontFamily={Fonts.rounded}
            textAnchor="middle"
          >
            <TextPath href={`#${titleArc(index)}`} startOffset="50%">
              {line}
            </TextPath>
          </SvgText>
        ))}
        {plan.lines.map((line, index) => (
          <SvgText
            key={`title-${index}`}
            testID="home-welcome-title"
            fill={titleColor}
            fontSize={fittedTitle}
            fontWeight="800"
            fontFamily={Fonts.rounded}
            textAnchor="middle"
          >
            <TextPath href={`#${titleArc(index)}`} startOffset="50%">
              {line}
            </TextPath>
          </SvgText>
        ))}
        <SvgText
          testID="home-welcome-subtitle"
          fill={subtitleColor}
          fontSize={fittedSubtitle}
          fontWeight="500"
          fontFamily={Fonts.rounded}
          textAnchor="middle"
        >
          <TextPath href={`#${subtitleArc}`} startOffset="50%">
            {subtitle}
          </TextPath>
        </SvgText>
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  greeting: {
    alignSelf: 'center',
  },
});
