import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated from 'react-native-reanimated';
import { Fonts } from '@/constants/theme';
import { HOME_CARDS, HOME_CARD_TINTS, HOME_CARD_TYPE } from '@/constants/home-journey';
import { HomeCard, useArrowNudge } from './home-card';
import { CardArrowButton } from './card-arrow-button';
import { StatIcon } from './stat-icons';

export interface ContinueLearningCardProps {
  width: number;
  animated: boolean;
  onPress: () => void;
  testID?: string;
}

/**
 * The way on from the home scene into the library.
 *
 * It replaces a small text pill that sat under the cards and read as an
 * afterthought. Leaving the home scene is the second thing a child does here
 * -- after carrying on with the story they were in -- so it is a panel like
 * the others rather than a link beneath them.
 */
export const ContinueLearningCard = memo(function ContinueLearningCard({
  width,
  animated,
  onPress,
  testID = 'continue-learning-card',
}: ContinueLearningCardProps) {
  const { t } = useTranslation();
  const arrow = useArrowNudge();

  return (
    <HomeCard
      testID={testID}
      width={width}
      onPress={onPress}
      onPressed={arrow.play}
      accessibilityLabel={t('home.continueLearning.title')}
      accessibilityHint={t('home.continueLearning.hint')}
    >
      <View style={styles.row}>
        <View style={styles.glyph}>
          <StatIcon kind="book" size={HOME_CARDS.tileIcon} animated={animated} testID="continue-learning-glyph" />
        </View>

        <View style={styles.words}>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {t('home.continueLearning.title')}
          </Text>
          <Text style={styles.body} numberOfLines={1}>{t('home.continueLearning.body')}</Text>
        </View>

        <Animated.View style={arrow.style}>
          <CardArrowButton size={HOME_CARDS.arrowSize} pressed={false} testID="continue-learning-arrow" />
        </Animated.View>
      </View>
    </HomeCard>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: HOME_CARDS.padding,
    paddingLeft: HOME_CARDS.padding + 2,
    paddingRight: HOME_CARDS.padding + 4,
  },
  glyph: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  words: {
    flex: 1,
    marginLeft: 14,
    marginRight: 12,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: HOME_CARD_TYPE.title,
    fontWeight: '800',
    color: HOME_CARD_TINTS.title,
  },
  body: {
    fontFamily: Fonts.rounded,
    fontSize: HOME_CARD_TYPE.body,
    fontWeight: '500',
    color: HOME_CARD_TINTS.body,
    marginTop: 2,
  },
});
