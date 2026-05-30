/**
 * LearningScreen
 *
 * Activity library for spelling and number activities, matching the
 * visual style of the PractiseScreen song library. Uses an age-range
 * carousel instead of an instrument carousel for filtering.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { AgeRangeCarousel, AgeRange } from '@/components/learning/age-range-carousel';
import { PageHeader } from '@/components/ui/page-header';
import { BearTopImage } from '@/components/main-menu/animated-components';
import { VISUAL_EFFECTS } from '@/components/main-menu/constants';
import { generateStarPositions } from '@/components/main-menu/utils';
import { mainMenuStyles } from '@/components/main-menu/styles';
import { useAccessibility } from '@/hooks/use-accessibility';
import { Fonts } from '@/constants/theme';
import { SubscriptionOverlay } from '@/components/ui/subscription-overlay';
import { StoryAccessService } from '@/services/story-access-service';

const STAR_POSITIONS = generateStarPositions(VISUAL_EFFECTS.STAR_COUNT);

export type LearningMode = 'spelling' | 'numbers' | 'feelings';

interface LearningActivity {
  id: string;
  nameKey: string;
  descKey: string;
  ageKey: string;
  emoji: string;
  color: string;
  /** Story ID to open when tapped (local bundled) */
  storyId: string;
  /** Which age ranges this activity supports */
  ageRanges: AgeRange[];
}

/** Number of free activities per age group (first N are free, rest locked) */
const FREE_PER_AGE_GROUP = 3;

const SPELLING_ACTIVITIES: LearningActivity[] = [
  // Ages 1-2 (5 activities — first 3 free, last 2 locked)
  { id: 'abc-animals', nameKey: 'learning.abcAnimals', descKey: 'learning.abcAnimalsDesc', ageKey: 'learning.abcAnimalsAge', emoji: '🦁', color: '#F59E0B', storyId: 'wombat-spelling', ageRanges: ['1-2'] },
  { id: 'first-words', nameKey: 'learning.firstWords', descKey: 'learning.firstWordsDesc', ageKey: 'learning.firstWordsAge', emoji: '🌟', color: '#EC4899', storyId: 'wombat-spelling', ageRanges: ['1-2'] },
  { id: 'colour-spelling', nameKey: 'learning.colourSpelling', descKey: 'learning.colourSpellingDesc', ageKey: 'learning.colourSpellingAge', emoji: '🎨', color: '#EF4444', storyId: 'wombat-spelling', ageRanges: ['1-2'] },
  { id: 'shape-names', nameKey: 'learning.shapeNames', descKey: 'learning.shapeNamesDesc', ageKey: 'learning.shapeNamesAge', emoji: '🔷', color: '#06B6D4', storyId: 'wombat-spelling', ageRanges: ['1-2'] },
  { id: 'my-name', nameKey: 'learning.myName', descKey: 'learning.myNameDesc', ageKey: 'learning.myNameAge', emoji: '👶', color: '#A855F7', storyId: 'wombat-spelling', ageRanges: ['1-2'] },
  // Ages 2-4 (5 activities — first 3 free, last 2 locked)
  { id: 'wombat-spelling', nameKey: 'learning.wombatSpelling', descKey: 'learning.wombatSpellingDesc', ageKey: 'learning.wombatSpellingAge', emoji: '🐻', color: '#8B5CF6', storyId: 'wombat-spelling', ageRanges: ['2-4'] },
  { id: 'animal-spelling', nameKey: 'learning.animalSpelling', descKey: 'learning.animalSpellingDesc', ageKey: 'learning.animalSpellingAge', emoji: '🐾', color: '#10B981', storyId: 'wombat-spelling', ageRanges: ['2-4'] },
  { id: 'food-spelling', nameKey: 'learning.foodSpelling', descKey: 'learning.foodSpellingDesc', ageKey: 'learning.foodSpellingAge', emoji: '🍎', color: '#EF4444', storyId: 'wombat-spelling', ageRanges: ['2-4'] },
  { id: 'nature-words', nameKey: 'learning.natureWords', descKey: 'learning.natureWordsDesc', ageKey: 'learning.natureWordsAge', emoji: '🌿', color: '#06B6D4', storyId: 'wombat-spelling', ageRanges: ['2-4'] },
  { id: 'garden-words', nameKey: 'learning.gardenWords', descKey: 'learning.gardenWordsDesc', ageKey: 'learning.gardenWordsAge', emoji: '🌻', color: '#F59E0B', storyId: 'wombat-spelling', ageRanges: ['2-4'] },
  // Ages 4+ (5 activities — first 3 free, last 2 locked)
  { id: 'word-builder', nameKey: 'learning.wordBuilder', descKey: 'learning.wordBuilderDesc', ageKey: 'learning.wordBuilderAge', emoji: '🧩', color: '#14B8A6', storyId: 'wombat-spelling', ageRanges: ['4+'] },
  { id: 'sentence-speller', nameKey: 'learning.sentenceSpeller', descKey: 'learning.sentenceSpellerDesc', ageKey: 'learning.sentenceSpellerAge', emoji: '📝', color: '#6366F1', storyId: 'wombat-spelling', ageRanges: ['4+'] },
  { id: 'tricky-words', nameKey: 'learning.trickyWords', descKey: 'learning.trickyWordsDesc', ageKey: 'learning.trickyWordsAge', emoji: '🎯', color: '#F97316', storyId: 'wombat-spelling', ageRanges: ['4+'] },
  { id: 'rhyme-time', nameKey: 'learning.rhymeTime', descKey: 'learning.rhymeTimeDesc', ageKey: 'learning.rhymeTimeAge', emoji: '🎵', color: '#EC4899', storyId: 'wombat-spelling', ageRanges: ['4+'] },
  { id: 'story-spelling', nameKey: 'learning.storySpelling', descKey: 'learning.storySpellingDesc', ageKey: 'learning.storySpellingAge', emoji: '📖', color: '#8B5CF6', storyId: 'wombat-spelling', ageRanges: ['4+'] },
];

const NUMBERS_ACTIVITIES: LearningActivity[] = [
  // Ages 1-2 (5 activities — first 3 free, last 2 locked)
  { id: 'counting-fun', nameKey: 'learning.countingFun', descKey: 'learning.countingFunDesc', ageKey: 'learning.countingFunAge', emoji: '🔢', color: '#F59E0B', storyId: 'wombat-word-placing', ageRanges: ['1-2'] },
  { id: 'number-friends', nameKey: 'learning.numberFriends', descKey: 'learning.numberFriendsDesc', ageKey: 'learning.numberFriendsAge', emoji: '🧸', color: '#EC4899', storyId: 'wombat-word-placing', ageRanges: ['1-2'] },
  { id: 'colour-counting', nameKey: 'learning.colourCounting', descKey: 'learning.colourCountingDesc', ageKey: 'learning.colourCountingAge', emoji: '🌈', color: '#EF4444', storyId: 'wombat-word-placing', ageRanges: ['1-2'] },
  { id: 'shape-counting', nameKey: 'learning.shapeCounting', descKey: 'learning.shapeCountingDesc', ageKey: 'learning.shapeCountingAge', emoji: '⬟', color: '#06B6D4', storyId: 'wombat-word-placing', ageRanges: ['1-2'] },
  { id: 'one-two-three', nameKey: 'learning.oneTwoThree', descKey: 'learning.oneTwoThreeDesc', ageKey: 'learning.oneTwoThreeAge', emoji: '🎈', color: '#A855F7', storyId: 'wombat-word-placing', ageRanges: ['1-2'] },
  // Ages 2-4 (5 activities — first 3 free, last 2 locked)
  { id: 'wombat-word-placing', nameKey: 'learning.wombatWordPlacing', descKey: 'learning.wombatWordPlacingDesc', ageKey: 'learning.wombatWordPlacingAge', emoji: '🐻', color: '#6366F1', storyId: 'wombat-word-placing', ageRanges: ['2-4'] },
  { id: 'animal-counting', nameKey: 'learning.animalCounting', descKey: 'learning.animalCountingDesc', ageKey: 'learning.animalCountingAge', emoji: '🐸', color: '#14B8A6', storyId: 'wombat-word-placing', ageRanges: ['2-4'] },
  { id: 'fruit-counting', nameKey: 'learning.fruitCounting', descKey: 'learning.fruitCountingDesc', ageKey: 'learning.fruitCountingAge', emoji: '🍇', color: '#EF4444', storyId: 'wombat-word-placing', ageRanges: ['2-4'] },
  { id: 'toy-counting', nameKey: 'learning.toyCounting', descKey: 'learning.toyCountingDesc', ageKey: 'learning.toyCountingAge', emoji: '🧸', color: '#F59E0B', storyId: 'wombat-word-placing', ageRanges: ['2-4'] },
  { id: 'garden-counting', nameKey: 'learning.gardenCounting', descKey: 'learning.gardenCountingDesc', ageKey: 'learning.gardenCountingAge', emoji: '🌻', color: '#10B981', storyId: 'wombat-word-placing', ageRanges: ['2-4'] },
  // Ages 4+ (5 activities — first 3 free, last 2 locked)
  { id: 'number-puzzles', nameKey: 'learning.numberPuzzles', descKey: 'learning.numberPuzzlesDesc', ageKey: 'learning.numberPuzzlesAge', emoji: '🧮', color: '#14B8A6', storyId: 'wombat-word-placing', ageRanges: ['4+'] },
  { id: 'adding-fun', nameKey: 'learning.addingFun', descKey: 'learning.addingFunDesc', ageKey: 'learning.addingFunAge', emoji: '➕', color: '#6366F1', storyId: 'wombat-word-placing', ageRanges: ['4+'] },
  { id: 'number-stories', nameKey: 'learning.numberStories', descKey: 'learning.numberStoriesDesc', ageKey: 'learning.numberStoriesAge', emoji: '📖', color: '#F97316', storyId: 'wombat-word-placing', ageRanges: ['4+'] },
  { id: 'number-patterns', nameKey: 'learning.numberPatterns', descKey: 'learning.numberPatternsDesc', ageKey: 'learning.numberPatternsAge', emoji: '🔮', color: '#EC4899', storyId: 'wombat-word-placing', ageRanges: ['4+'] },
  { id: 'subtraction-fun', nameKey: 'learning.subtractionFun', descKey: 'learning.subtractionFunDesc', ageKey: 'learning.subtractionFunAge', emoji: '➖', color: '#8B5CF6', storyId: 'wombat-word-placing', ageRanges: ['4+'] },
];

const FEELINGS_ACTIVITIES: LearningActivity[] = [
  // Ages 1-2 (5 activities — first 3 free, last 2 locked)
  { id: 'happy-faces', nameKey: 'learning.happyFaces', descKey: 'learning.happyFacesDesc', ageKey: 'learning.happyFacesAge', emoji: '😊', color: '#F59E0B', storyId: 'wombat-spelling', ageRanges: ['1-2'] },
  { id: 'feeling-colours', nameKey: 'learning.feelingColours', descKey: 'learning.feelingColoursDesc', ageKey: 'learning.feelingColoursAge', emoji: '🌈', color: '#EC4899', storyId: 'wombat-spelling', ageRanges: ['1-2'] },
  { id: 'mood-music', nameKey: 'learning.moodMusic', descKey: 'learning.moodMusicDesc', ageKey: 'learning.moodMusicAge', emoji: '🎶', color: '#EF4444', storyId: 'wombat-spelling', ageRanges: ['1-2'] },
  { id: 'animal-feelings', nameKey: 'learning.animalFeelings', descKey: 'learning.animalFeelingsDesc', ageKey: 'learning.animalFeelingsAge', emoji: '🐻', color: '#06B6D4', storyId: 'wombat-spelling', ageRanges: ['1-2'] },
  { id: 'my-feelings', nameKey: 'learning.myFeelings', descKey: 'learning.myFeelingsDesc', ageKey: 'learning.myFeelingsAge', emoji: '💛', color: '#A855F7', storyId: 'wombat-spelling', ageRanges: ['1-2'] },
  // Ages 2-4 (5 activities — first 3 free, last 2 locked)
  { id: 'emotion-faces', nameKey: 'learning.emotionFaces', descKey: 'learning.emotionFacesDesc', ageKey: 'learning.emotionFacesAge', emoji: '🎭', color: '#8B5CF6', storyId: 'wombat-spelling', ageRanges: ['2-4'] },
  { id: 'calm-breathing', nameKey: 'learning.calmBreathing', descKey: 'learning.calmBreathingDesc', ageKey: 'learning.calmBreathingAge', emoji: '🌬️', color: '#10B981', storyId: 'wombat-spelling', ageRanges: ['2-4'] },
  { id: 'kindness-quest', nameKey: 'learning.kindnessQuest', descKey: 'learning.kindnessQuestDesc', ageKey: 'learning.kindnessQuestAge', emoji: '💝', color: '#EF4444', storyId: 'wombat-spelling', ageRanges: ['2-4'] },
  { id: 'friendship-stories', nameKey: 'learning.friendshipStories', descKey: 'learning.friendshipStoriesDesc', ageKey: 'learning.friendshipStoriesAge', emoji: '🤝', color: '#06B6D4', storyId: 'wombat-spelling', ageRanges: ['2-4'] },
  { id: 'worry-monster', nameKey: 'learning.worryMonster', descKey: 'learning.worryMonsterDesc', ageKey: 'learning.worryMonsterAge', emoji: '👾', color: '#F59E0B', storyId: 'wombat-spelling', ageRanges: ['2-4'] },
  // Ages 4+ (5 activities — first 3 free, last 2 locked)
  { id: 'empathy-explorer', nameKey: 'learning.empathyExplorer', descKey: 'learning.empathyExplorerDesc', ageKey: 'learning.empathyExplorerAge', emoji: '🧭', color: '#14B8A6', storyId: 'wombat-spelling', ageRanges: ['4+'] },
  { id: 'feeling-journal', nameKey: 'learning.feelingJournal', descKey: 'learning.feelingJournalDesc', ageKey: 'learning.feelingJournalAge', emoji: '📔', color: '#6366F1', storyId: 'wombat-spelling', ageRanges: ['4+'] },
  { id: 'conflict-solver', nameKey: 'learning.conflictSolver', descKey: 'learning.conflictSolverDesc', ageKey: 'learning.conflictSolverAge', emoji: '🕊️', color: '#F97316', storyId: 'wombat-spelling', ageRanges: ['4+'] },
  { id: 'gratitude-garden', nameKey: 'learning.gratitudeGarden', descKey: 'learning.gratitudeGardenDesc', ageKey: 'learning.gratitudeGardenAge', emoji: '🌸', color: '#EC4899', storyId: 'wombat-spelling', ageRanges: ['4+'] },
  { id: 'self-esteem-stars', nameKey: 'learning.selfEsteemStars', descKey: 'learning.selfEsteemStarsDesc', ageKey: 'learning.selfEsteemStarsAge', emoji: '⭐', color: '#8B5CF6', storyId: 'wombat-spelling', ageRanges: ['4+'] },
];

interface LearningScreenProps {
  mode: LearningMode;
  onBack: () => void;
  onActivitySelect: (storyId: string) => void;
}

export function LearningScreen({ mode, onBack, onActivitySelect }: LearningScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { scaledFontSize, textSizeScale } = useAccessibility();
  const [selectedRange, setSelectedRange] = useState<AgeRange>('all');
  const [showSubscription, setShowSubscription] = useState(false);

  // Star rotation
  const starRotation = useSharedValue(0);
  React.useEffect(() => {
    starRotation.value = withRepeat(withTiming(360, { duration: 120000, easing: Easing.linear }), -1, false);
  }, [starRotation]);
  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${starRotation.value}deg` }],
  }));

  const allActivities = mode === 'spelling'
    ? SPELLING_ACTIVITIES
    : mode === 'numbers'
    ? NUMBERS_ACTIVITIES
    : FEELINGS_ACTIVITIES;

  const filteredActivities = useMemo(() => {
    const list = selectedRange === 'all'
      ? allActivities
      : allActivities.filter(a => a.ageRanges.includes(selectedRange));

    // When showing all ages, sort so free activities appear first (grouped by age),
    // then locked activities follow at the bottom.
    if (selectedRange === 'all') {
      const free: LearningActivity[] = [];
      const locked: LearningActivity[] = [];
      for (const item of list) {
        const ageGroup = item.ageRanges[0];
        const groupItems = allActivities.filter(a => a.ageRanges[0] === ageGroup);
        const posInGroup = groupItems.findIndex(a => a.id === item.id);
        if (posInGroup < FREE_PER_AGE_GROUP || StoryAccessService.isLearningActivityUnlocked(posInGroup)) {
          free.push(item);
        } else {
          locked.push(item);
        }
      }
      return [...free, ...locked];
    }

    return list;
  }, [selectedRange, allActivities]);

  const handleActivityPress = useCallback((activity: LearningActivity) => {
    onActivitySelect(activity.storyId);
  }, [onActivitySelect]);

  const title = mode === 'spelling'
    ? t('learning.spellingTitle')
    : mode === 'numbers'
    ? t('learning.numbersTitle')
    : t('learning.feelingsTitle');
  const cardFontSize = scaledFontSize(18);
  const descFontSize = scaledFontSize(14);
  const ageBadgeFontSize = scaledFontSize(11);

  const renderBackground = () => (
    <>
      <LinearGradient colors={['#4ECDC4', '#3B82F6', '#1E3A8A']} style={StyleSheet.absoluteFill} />
      <View style={mainMenuStyles.moonContainer} pointerEvents="none">
        <BearTopImage />
      </View>
      {STAR_POSITIONS.map((star) => (
        <Animated.View
          key={`star-${star.id}`}
          style={[{
            position: 'absolute', width: VISUAL_EFFECTS.STAR_SIZE, height: VISUAL_EFFECTS.STAR_SIZE,
            backgroundColor: 'white', borderRadius: VISUAL_EFFECTS.STAR_BORDER_RADIUS,
            opacity: star.opacity, left: star.left, top: star.top, zIndex: 2,
          }, starAnimatedStyle]}
        />
      ))}
    </>
  );

  return (
    <View style={styles.container}>
      {renderBackground()}

      <PageHeader title={title} onBack={onBack} useBackArrow />

      <View style={{ flex: 1, paddingTop: insets.top + 90 + (textSizeScale - 1) * 40, zIndex: 10 }}>
        <AgeRangeCarousel selectedRange={selectedRange} onSelect={setSelectedRange} />

        <FlatList
          data={filteredActivities}
          keyExtractor={(item) => item.id}
          style={{ zIndex: 10 }}
          contentContainerStyle={[styles.activityList, { paddingBottom: insets.bottom + 20 }]}
          renderItem={({ item }) => {
            // Determine position within the activity's age group to decide lock state.
            // First 3 per age group are free; last 2 require Basic+ subscription.
            const ageGroup = item.ageRanges[0];
            const groupActivities = allActivities.filter(a => a.ageRanges[0] === ageGroup);
            const posInGroup = groupActivities.findIndex(a => a.id === item.id);
            const isLocked = posInGroup >= FREE_PER_AGE_GROUP && !StoryAccessService.isLearningActivityUnlocked(posInGroup);
            return (
              <Pressable
                style={({ pressed }) => [
                  styles.activityCard,
                  isLocked && styles.activityCardLocked,
                  pressed && !isLocked && styles.activityCardPressed,
                ]}
                onPress={() => {
                  if (isLocked) {
                    setShowSubscription(true);
                  } else {
                    handleActivityPress(item);
                  }
                }}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.emojiCircle, { backgroundColor: item.color }, isLocked && { opacity: 0.45 }]}>
                    <Text style={styles.emoji}>{item.emoji}</Text>
                  </View>
                  <View style={[styles.cardTextContainer, isLocked && { opacity: 0.45 }]}>
                    <Text style={[styles.cardTitle, { fontSize: cardFontSize }]}>{t(item.nameKey)}</Text>
                    <Text style={[styles.cardDesc, { fontSize: descFontSize }]}>{t(item.descKey)}</Text>
                  </View>
                  {isLocked ? (
                    <View style={styles.lockBadge}>
                      <Ionicons name="lock-closed" size={14} color="#FFFFFF" />
                    </View>
                  ) : (
                    <View style={styles.ageBadge}>
                      <Text style={[styles.ageBadgeText, { fontSize: ageBadgeFontSize }]}>{t(item.ageKey)}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { fontSize: cardFontSize }]}>
              {t('learning.noActivities')}
            </Text>
          }
        />
      </View>

      {/* Subscription Overlay — triggered from locked activity tap */}
      <SubscriptionOverlay
        visible={showSubscription}
        onClose={() => setShowSubscription(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E3A8A',
  },
  activityList: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
    zIndex: 10,
  },
  activityCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  activityCardPressed: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    transform: [{ scale: 0.98 }],
  },
  activityCardLocked: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.05)',
  },
  lockBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  emojiCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 24,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    color: '#fff',
    fontFamily: Fonts.rounded,
    fontWeight: '600',
  },
  cardDesc: {
    color: 'rgba(255,255,255,0.65)',
    fontFamily: Fonts.sans,
    fontWeight: '400',
    marginTop: 3,
  },
  ageBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  ageBadgeText: {
    color: 'rgba(255,255,255,0.8)',
    fontFamily: Fonts.rounded,
    fontWeight: '600',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: Fonts.primary,
    textAlign: 'center',
    marginTop: 40,
  },
});
