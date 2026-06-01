/**
 * LearningScreen
 *
 * Activity library for spelling and number activities, matching the
 * visual style of the StorySelectionScreen. Uses age-range filter chips,
 * a carousel / grid view toggle, and thumbnail activity cards.
 */

import React, { useState, useMemo, useCallback, memo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ScrollView,
  Dimensions,
  type ListRenderItem,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Rect } from 'react-native-svg';

import { type AgeRange } from '@/components/learning/age-range-carousel';
import { PageHeader } from '@/components/ui/page-header';
import { BearTopImage } from '@/components/main-menu/animated-components';
import { VISUAL_EFFECTS } from '@/components/main-menu/constants';
import { generateStarPositions } from '@/components/main-menu/utils';
import { mainMenuStyles } from '@/components/main-menu/styles';
import { useAccessibility } from '@/hooks/use-accessibility';
import { Fonts } from '@/constants/theme';
import { SubscriptionOverlay } from '@/components/ui/subscription-overlay';
import { StoryAccessService } from '@/services/story-access-service';
import { LearningTipsOverlay } from '@/components/tutorial';
import { TutorialId } from '@/contexts/tutorial-context';
import { useAppStore, type StoryViewMode } from '@/store/app-store';
import { useActivityTransition, type TransitionActivity } from '@/contexts/ActivityTransitionContext';

const STAR_POSITIONS = generateStarPositions(VISUAL_EFFECTS.STAR_COUNT);

// ── Card sizing (matching story-selection-screen) ────────────────────
const CARD_WIDTH = 176;
const CARD_HEIGHT = 132;
const CARD_MARGIN = 15;
const ITEM_WIDTH = CARD_WIDTH + CARD_MARGIN;
const GRID_PADDING = 16;
const GRID_GAP = 12;
const GRID_CARD_WIDTH = Math.floor((Dimensions.get('window').width - GRID_PADDING * 2 - GRID_GAP) / 2);
const GRID_CARD_HEIGHT = Math.floor(GRID_CARD_WIDTH * 0.75);

// ── Age filter definitions ───────────────────────────────────────────
interface AgeFilter {
  id: AgeRange;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const AGE_FILTERS: AgeFilter[] = [
  { id: 'all', labelKey: 'learning.ageAll', icon: 'apps-outline', color: '#8B5CF6' },
  { id: '1-2', labelKey: 'learning.age12', icon: 'happy-outline', color: '#F59E0B' },
  { id: '2-4', labelKey: 'learning.age24', icon: 'star-outline', color: '#10B981' },
  { id: '4+',  labelKey: 'learning.age4plus', icon: 'rocket-outline', color: '#3B82F6' },
];

/** 3-card carousel icon — centre card raised */
const CarouselIcon = memo(function CarouselIcon({ size = 18, color = '#FFFFFF' }: { size?: number; color?: string }) {
  const w = size;
  const h = size;
  const cardW = w * 0.24;
  const cardH = h * 0.55;
  const r = 1.5;
  const gap = w * 0.06;
  const groupH = cardH;
  const yOffset = (h - groupH) / 2;
  const cx = (w - cardW) / 2;
  const cy = yOffset;
  const sideH = cardH * 0.78;
  const sideY = cy + (cardH - sideH);
  const lx = cx - cardW - gap;
  const rx = cx + cardW + gap;
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Rect x={lx} y={sideY} width={cardW} height={sideH} rx={r} fill={color} opacity={0.5} />
      <Rect x={cx} y={cy} width={cardW} height={cardH} rx={r} fill={color} />
      <Rect x={rx} y={sideY} width={cardW} height={sideH} rx={r} fill={color} opacity={0.5} />
    </Svg>
  );
});

export type LearningMode = 'spelling' | 'numbers' | 'feelings';

/** Game mechanic type for routing to the correct game screen */
export type GameType = 'spelling' | 'choice' | 'sorting' | 'story';

interface LearningActivity {
  id: string;
  nameKey: string;
  descKey: string;
  ageKey: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  /** Which game screen to open */
  gameType: GameType;
  /** Fallback story ID for 'story' game type */
  storyId?: string;
  /** Which age ranges this activity supports */
  ageRanges: AgeRange[];
}

/** Number of free activities per age group (first N are free, rest locked) */
const FREE_PER_AGE_GROUP = 3;

const SPELLING_ACTIVITIES: LearningActivity[] = [
  // Ages 1-2 (5 activities — first 3 free, last 2 locked)
  { id: 'abc-animals', nameKey: 'learning.abcAnimals', descKey: 'learning.abcAnimalsDesc', ageKey: 'learning.abcAnimalsAge', icon: 'paw-outline', color: '#F59E0B', gameType: 'spelling', ageRanges: ['1-2'] },
  { id: 'first-words', nameKey: 'learning.firstWords', descKey: 'learning.firstWordsDesc', ageKey: 'learning.firstWordsAge', icon: 'star-outline', color: '#EC4899', gameType: 'spelling', ageRanges: ['1-2'] },
  { id: 'colour-spelling', nameKey: 'learning.colourSpelling', descKey: 'learning.colourSpellingDesc', ageKey: 'learning.colourSpellingAge', icon: 'color-palette-outline', color: '#EF4444', gameType: 'spelling', ageRanges: ['1-2'] },
  { id: 'shape-names', nameKey: 'learning.shapeNames', descKey: 'learning.shapeNamesDesc', ageKey: 'learning.shapeNamesAge', icon: 'shapes-outline', color: '#06B6D4', gameType: 'spelling', ageRanges: ['1-2'] },
  { id: 'my-name', nameKey: 'learning.myName', descKey: 'learning.myNameDesc', ageKey: 'learning.myNameAge', icon: 'happy-outline', color: '#A855F7', gameType: 'spelling', ageRanges: ['1-2'] },
  // Ages 2-4 (5 activities — first 3 free, last 2 locked)
  { id: 'wombat-spelling', nameKey: 'learning.wombatSpelling', descKey: 'learning.wombatSpellingDesc', ageKey: 'learning.wombatSpellingAge', icon: 'paw-outline', color: '#8B5CF6', gameType: 'spelling', ageRanges: ['2-4'] },
  { id: 'animal-spelling', nameKey: 'learning.animalSpelling', descKey: 'learning.animalSpellingDesc', ageKey: 'learning.animalSpellingAge', icon: 'bug-outline', color: '#10B981', gameType: 'spelling', ageRanges: ['2-4'] },
  { id: 'food-spelling', nameKey: 'learning.foodSpelling', descKey: 'learning.foodSpellingDesc', ageKey: 'learning.foodSpellingAge', icon: 'nutrition-outline', color: '#EF4444', gameType: 'spelling', ageRanges: ['2-4'] },
  { id: 'nature-words', nameKey: 'learning.natureWords', descKey: 'learning.natureWordsDesc', ageKey: 'learning.natureWordsAge', icon: 'leaf-outline', color: '#06B6D4', gameType: 'spelling', ageRanges: ['2-4'] },
  { id: 'garden-words', nameKey: 'learning.gardenWords', descKey: 'learning.gardenWordsDesc', ageKey: 'learning.gardenWordsAge', icon: 'flower-outline', color: '#F59E0B', gameType: 'spelling', ageRanges: ['2-4'] },
  // Ages 4+ (5 activities — first 3 free, last 2 locked)
  { id: 'word-builder', nameKey: 'learning.wordBuilder', descKey: 'learning.wordBuilderDesc', ageKey: 'learning.wordBuilderAge', icon: 'extension-puzzle-outline', color: '#14B8A6', gameType: 'spelling', ageRanges: ['4+'] },
  { id: 'sentence-speller', nameKey: 'learning.sentenceSpeller', descKey: 'learning.sentenceSpellerDesc', ageKey: 'learning.sentenceSpellerAge', icon: 'create-outline', color: '#6366F1', gameType: 'spelling', ageRanges: ['4+'] },
  { id: 'tricky-words', nameKey: 'learning.trickyWords', descKey: 'learning.trickyWordsDesc', ageKey: 'learning.trickyWordsAge', icon: 'flag-outline', color: '#F97316', gameType: 'spelling', ageRanges: ['4+'] },

  { id: 'story-spelling', nameKey: 'learning.storySpelling', descKey: 'learning.storySpellingDesc', ageKey: 'learning.storySpellingAge', icon: 'book-outline', color: '#8B5CF6', gameType: 'spelling', ageRanges: ['4+'] },
];

const NUMBERS_ACTIVITIES: LearningActivity[] = [
  // Ages 1-2 (5 activities — first 3 free, last 2 locked)
  { id: 'counting-fun', nameKey: 'learning.countingFun', descKey: 'learning.countingFunDesc', ageKey: 'learning.countingFunAge', icon: 'calculator-outline', color: '#F59E0B', gameType: 'spelling', ageRanges: ['1-2'] },
  { id: 'number-friends', nameKey: 'learning.numberFriends', descKey: 'learning.numberFriendsDesc', ageKey: 'learning.numberFriendsAge', icon: 'heart-outline', color: '#EC4899', gameType: 'spelling', ageRanges: ['1-2'] },
  { id: 'colour-counting', nameKey: 'learning.colourCounting', descKey: 'learning.colourCountingDesc', ageKey: 'learning.colourCountingAge', icon: 'color-palette-outline', color: '#EF4444', gameType: 'spelling', ageRanges: ['1-2'] },
  { id: 'shape-counting', nameKey: 'learning.shapeCounting', descKey: 'learning.shapeCountingDesc', ageKey: 'learning.shapeCountingAge', icon: 'shapes-outline', color: '#06B6D4', gameType: 'spelling', ageRanges: ['1-2'] },
  { id: 'one-two-three', nameKey: 'learning.oneTwoThree', descKey: 'learning.oneTwoThreeDesc', ageKey: 'learning.oneTwoThreeAge', icon: 'balloon-outline', color: '#A855F7', gameType: 'spelling', ageRanges: ['1-2'] },
  // Ages 2-4 (5 activities — first 3 free, last 2 locked)
  { id: 'wombat-word-placing', nameKey: 'learning.wombatWordPlacing', descKey: 'learning.wombatWordPlacingDesc', ageKey: 'learning.wombatWordPlacingAge', icon: 'paw-outline', color: '#6366F1', gameType: 'spelling', ageRanges: ['2-4'] },
  { id: 'animal-counting', nameKey: 'learning.animalCounting', descKey: 'learning.animalCountingDesc', ageKey: 'learning.animalCountingAge', icon: 'bug-outline', color: '#14B8A6', gameType: 'spelling', ageRanges: ['2-4'] },
  { id: 'fruit-counting', nameKey: 'learning.fruitCounting', descKey: 'learning.fruitCountingDesc', ageKey: 'learning.fruitCountingAge', icon: 'nutrition-outline', color: '#EF4444', gameType: 'spelling', ageRanges: ['2-4'] },
  { id: 'toy-counting', nameKey: 'learning.toyCounting', descKey: 'learning.toyCountingDesc', ageKey: 'learning.toyCountingAge', icon: 'cube-outline', color: '#F59E0B', gameType: 'spelling', ageRanges: ['2-4'] },
  { id: 'garden-counting', nameKey: 'learning.gardenCounting', descKey: 'learning.gardenCountingDesc', ageKey: 'learning.gardenCountingAge', icon: 'flower-outline', color: '#10B981', gameType: 'spelling', ageRanges: ['2-4'] },
  // Ages 4+ (5 activities — first 3 free, last 2 locked)
  { id: 'number-puzzles', nameKey: 'learning.numberPuzzles', descKey: 'learning.numberPuzzlesDesc', ageKey: 'learning.numberPuzzlesAge', icon: 'grid-outline', color: '#14B8A6', gameType: 'spelling', ageRanges: ['4+'] },
  { id: 'adding-fun', nameKey: 'learning.addingFun', descKey: 'learning.addingFunDesc', ageKey: 'learning.addingFunAge', icon: 'add-circle-outline', color: '#6366F1', gameType: 'spelling', ageRanges: ['4+'] },
  { id: 'number-stories', nameKey: 'learning.numberStories', descKey: 'learning.numberStoriesDesc', ageKey: 'learning.numberStoriesAge', icon: 'book-outline', color: '#F97316', gameType: 'spelling', ageRanges: ['4+'] },
  { id: 'number-patterns', nameKey: 'learning.numberPatterns', descKey: 'learning.numberPatternsDesc', ageKey: 'learning.numberPatternsAge', icon: 'sparkles-outline', color: '#EC4899', gameType: 'spelling', ageRanges: ['4+'] },
  { id: 'subtraction-fun', nameKey: 'learning.subtractionFun', descKey: 'learning.subtractionFunDesc', ageKey: 'learning.subtractionFunAge', icon: 'remove-circle-outline', color: '#8B5CF6', gameType: 'spelling', ageRanges: ['4+'] },
];

const FEELINGS_ACTIVITIES: LearningActivity[] = [
  // Ages 1-2 (5 activities — first 3 free, last 2 locked)
  { id: 'happy-faces', nameKey: 'learning.happyFaces', descKey: 'learning.happyFacesDesc', ageKey: 'learning.happyFacesAge', icon: 'happy-outline', color: '#F59E0B', gameType: 'story', storyId: 'wombat-spelling', ageRanges: ['1-2'] },
  { id: 'feeling-colours', nameKey: 'learning.feelingColours', descKey: 'learning.feelingColoursDesc', ageKey: 'learning.feelingColoursAge', icon: 'color-palette-outline', color: '#EC4899', gameType: 'story', storyId: 'wombat-spelling', ageRanges: ['1-2'] },
  { id: 'mood-music', nameKey: 'learning.moodMusic', descKey: 'learning.moodMusicDesc', ageKey: 'learning.moodMusicAge', icon: 'musical-notes-outline', color: '#EF4444', gameType: 'story', storyId: 'wombat-spelling', ageRanges: ['1-2'] },
  { id: 'animal-feelings', nameKey: 'learning.animalFeelings', descKey: 'learning.animalFeelingsDesc', ageKey: 'learning.animalFeelingsAge', icon: 'paw-outline', color: '#06B6D4', gameType: 'story', storyId: 'wombat-spelling', ageRanges: ['1-2'] },
  { id: 'my-feelings', nameKey: 'learning.myFeelings', descKey: 'learning.myFeelingsDesc', ageKey: 'learning.myFeelingsAge', icon: 'heart-outline', color: '#A855F7', gameType: 'story', storyId: 'wombat-spelling', ageRanges: ['1-2'] },
  // Ages 2-4 (5 activities — first 3 free, last 2 locked)
  { id: 'emotion-faces', nameKey: 'learning.emotionFaces', descKey: 'learning.emotionFacesDesc', ageKey: 'learning.emotionFacesAge', icon: 'heart-circle-outline', color: '#8B5CF6', gameType: 'story', storyId: 'wombat-spelling', ageRanges: ['2-4'] },
  { id: 'calm-breathing', nameKey: 'learning.calmBreathing', descKey: 'learning.calmBreathingDesc', ageKey: 'learning.calmBreathingAge', icon: 'cloud-outline', color: '#10B981', gameType: 'story', storyId: 'wombat-spelling', ageRanges: ['2-4'] },
  { id: 'kindness-quest', nameKey: 'learning.kindnessQuest', descKey: 'learning.kindnessQuestDesc', ageKey: 'learning.kindnessQuestAge', icon: 'gift-outline', color: '#EF4444', gameType: 'story', storyId: 'wombat-spelling', ageRanges: ['2-4'] },
  { id: 'friendship-stories', nameKey: 'learning.friendshipStories', descKey: 'learning.friendshipStoriesDesc', ageKey: 'learning.friendshipStoriesAge', icon: 'people-outline', color: '#06B6D4', gameType: 'story', storyId: 'wombat-spelling', ageRanges: ['2-4'] },
  { id: 'worry-monster', nameKey: 'learning.worryMonster', descKey: 'learning.worryMonsterDesc', ageKey: 'learning.worryMonsterAge', icon: 'shield-outline', color: '#F59E0B', gameType: 'story', storyId: 'wombat-spelling', ageRanges: ['2-4'] },
  // Ages 4+ (5 activities — first 3 free, last 2 locked)
  { id: 'empathy-explorer', nameKey: 'learning.empathyExplorer', descKey: 'learning.empathyExplorerDesc', ageKey: 'learning.empathyExplorerAge', icon: 'compass-outline', color: '#14B8A6', gameType: 'story', storyId: 'wombat-spelling', ageRanges: ['4+'] },
  { id: 'feeling-journal', nameKey: 'learning.feelingJournal', descKey: 'learning.feelingJournalDesc', ageKey: 'learning.feelingJournalAge', icon: 'journal-outline', color: '#6366F1', gameType: 'story', storyId: 'wombat-spelling', ageRanges: ['4+'] },
  { id: 'conflict-solver', nameKey: 'learning.conflictSolver', descKey: 'learning.conflictSolverDesc', ageKey: 'learning.conflictSolverAge', icon: 'hand-left-outline', color: '#F97316', gameType: 'story', storyId: 'wombat-spelling', ageRanges: ['4+'] },
  { id: 'gratitude-garden', nameKey: 'learning.gratitudeGarden', descKey: 'learning.gratitudeGardenDesc', ageKey: 'learning.gratitudeGardenAge', icon: 'rose-outline', color: '#EC4899', gameType: 'story', storyId: 'wombat-spelling', ageRanges: ['4+'] },
  { id: 'self-esteem-stars', nameKey: 'learning.selfEsteemStars', descKey: 'learning.selfEsteemStarsDesc', ageKey: 'learning.selfEsteemStarsAge', icon: 'star-outline', color: '#8B5CF6', gameType: 'story', storyId: 'wombat-spelling', ageRanges: ['4+'] },
];

// ── Activity Card (thumbnail style matching story cards) ──────────────
interface ActivityCardProps {
  activity: LearningActivity;
  cardWidth: number;
  cardHeight: number;
  borderRadius: number;
  isLocked: boolean;
  onPress: (activity: LearningActivity, ref: React.RefObject<View | null>) => void;
  onLongPress?: (activity: LearningActivity, ref: React.RefObject<View | null>) => void;
  isHidden?: boolean;
}

const ActivityCard = memo(function ActivityCard({
  activity, cardWidth, cardHeight, borderRadius, isLocked, onPress, onLongPress, isHidden,
}: ActivityCardProps) {
  const { t } = useTranslation();
  const cardRef = useRef<View>(null);

  const handlePress = useCallback(() => {
    onPress(activity, cardRef);
  }, [activity, onPress]);

  const handleLongPress = useCallback(() => {
    if (onLongPress) onLongPress(activity, cardRef);
  }, [activity, onLongPress]);

  return (
    <View ref={cardRef} collapsable={false} style={isHidden ? { opacity: 0 } : undefined}>
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={400}
        style={({ pressed }) => [
          styles.cardPressable,
          pressed && !isLocked && { opacity: 0.85, transform: [{ scale: 0.97 }] },
        ]}
      >
        <View style={[styles.card, { width: cardWidth, height: cardHeight, borderRadius }]}>
          {/* Gradient cover with centred icon */}
          <LinearGradient
            colors={isLocked ? ['#555', '#333'] : [activity.color, shiftColor(activity.color, -30)]}
            style={[StyleSheet.absoluteFill, { borderRadius }]}
          />
          <View style={styles.cardIconContainer}>
            <Ionicons name={activity.icon} size={cardWidth * 0.32} color="rgba(255,255,255,0.9)" />
          </View>

          {/* Age badge (top-right) */}
          <View style={styles.ageBadge}>
            <Text style={styles.ageBadgeText}>{t(activity.ageKey)}</Text>
          </View>

          {/* Lock overlay */}
          {isLocked && (
            <View style={[StyleSheet.absoluteFill, styles.lockOverlay, { borderRadius }]}>
              <Ionicons name="lock-closed" size={22} color="#FFFFFF" />
            </View>
          )}
        </View>

        {/* Title below the thumbnail */}
        <View style={[styles.cardTitleContainer, { width: cardWidth }]}>
          <Text style={styles.cardTitle} numberOfLines={2}>{t(activity.nameKey)}</Text>
        </View>
      </Pressable>
    </View>
  );
});

/** Darken a hex colour by `amount` (negative = darker) */
function shiftColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// ── Main component ───────────────────────────────────────────────────

interface LearningScreenProps {
  mode: LearningMode;
  onBack: () => void;
  onActivitySelect: (activityId: string, gameType: GameType, storyId?: string, nameKey?: string) => void;
  /** Whether this screen is the currently active page (controls tutorial visibility) */
  isActive?: boolean;
}

export function LearningScreen({ mode, onBack, onActivitySelect, isActive = false }: LearningScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { scaledFontSize, scaledButtonSize, textSizeScale } = useAccessibility();
  const { learningViewMode, setLearningViewMode } = useAppStore();
  const favoriteActivityIds = useAppStore((s) => s.favoriteActivityIds);
  const toggleFavoriteActivity = useAppStore((s) => s.toggleFavoriteActivity);
  const [selectedRange, setSelectedRange] = useState<AgeRange>('all');
  const [showSubscription, setShowSubscription] = useState(false);
  const { startTransition, isTransitioning, selectedActivity: transActivity } = useActivityTransition();

  // Preview modal state (shown on long press — no transition, just a popup)
  const [previewActivity, setPreviewActivity] = useState<LearningActivity | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const heartScale = useSharedValue(1);
  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));
  const modalOpacity = useSharedValue(0);
  const modalTranslateY = useSharedValue(50);
  const backdropOpacity = useSharedValue(0);
  const modalAnimatedStyle = useAnimatedStyle(() => ({
    opacity: modalOpacity.value,
    transform: [{ translateY: modalTranslateY.value }],
  }));
  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  // Star rotation
  const starRotation = useSharedValue(0);
  React.useEffect(() => {
    starRotation.value = withRepeat(withTiming(360, { duration: 120000, easing: Easing.linear }), -1, false);
  }, [starRotation]);
  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${starRotation.value}deg` }],
  }));

  // View mode toggle (carousel ↔ grid) — instant swap with fade-in
  const viewFadeOpacity = useSharedValue(1);
  const viewFadeStyle = useAnimatedStyle(() => ({ opacity: viewFadeOpacity.value }));
  const handleViewModeToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    viewFadeOpacity.value = 0;
    setLearningViewMode(learningViewMode === 'carousel' ? 'grid' : 'carousel');
    requestAnimationFrame(() => {
      viewFadeOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
    });
  }, [learningViewMode, setLearningViewMode, viewFadeOpacity]);

  // Map learning mode to tutorial ID
  const tutorialId: TutorialId = mode === 'spelling'
    ? 'spelling_tips'
    : mode === 'numbers'
    ? 'numbers_tips'
    : 'feelings_tips';

  const allActivities = mode === 'spelling'
    ? SPELLING_ACTIVITIES
    : mode === 'numbers'
    ? NUMBERS_ACTIVITIES
    : FEELINGS_ACTIVITIES;

  // Group activities by age range
  const AGE_GROUPS: AgeRange[] = ['1-2', '2-4', '4+'];

  const ageGroupActivities = useMemo(() => {
    const groups: Record<string, LearningActivity[]> = {};
    for (const age of AGE_GROUPS) {
      groups[age] = allActivities.filter(a => a.ageRanges.includes(age));
    }
    return groups;
  }, [allActivities]);

  // Visible age groups based on filter
  const visibleAgeGroups = useMemo(() => {
    if (selectedRange === 'all') return AGE_GROUPS;
    return AGE_GROUPS.filter(g => g === selectedRange);
  }, [selectedRange]);

  // Favourite activities from the current mode
  const favoriteActivities = useMemo(() => {
    return allActivities.filter(a => favoriteActivityIds.includes(a.id));
  }, [allActivities, favoriteActivityIds]);

  // Lock state helper
  const isActivityLocked = useCallback((activity: LearningActivity) => {
    const ageGroup = activity.ageRanges[0];
    const groupItems = allActivities.filter(a => a.ageRanges[0] === ageGroup);
    const posInGroup = groupItems.findIndex(a => a.id === activity.id);
    return posInGroup >= FREE_PER_AGE_GROUP && !StoryAccessService.isLearningActivityUnlocked(posInGroup);
  }, [allActivities]);

  const handleActivityPress = useCallback((activity: LearningActivity, cardRef: React.RefObject<View | null>) => {
    if (isActivityLocked(activity)) {
      setShowSubscription(true);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Prepare the activity data for onActivitySelect (called when transition completes)
    onActivitySelect(activity.id, activity.gameType, activity.storyId, activity.nameKey);

    // Measure card and start the transition animation
    if (cardRef && cardRef.current) {
      cardRef.current.measure((_x: number, _y: number, width: number, height: number, pageX: number, pageY: number) => {
        const transAct: TransitionActivity = {
          id: activity.id,
          nameKey: activity.nameKey,
          descKey: activity.descKey,
          ageKey: activity.ageKey,
          icon: activity.icon,
          color: activity.color,
        };
        startTransition(transAct, { x: pageX, y: pageY, width, height });
      });
    }
  }, [onActivitySelect, isActivityLocked, startTransition]);

  const handleActivityLongPress = useCallback((activity: LearningActivity, _cardRef: React.RefObject<View | null>) => {
    if (isActivityLocked(activity)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPreviewActivity(activity);
    setIsPreviewVisible(true);
    modalOpacity.value = withTiming(1, { duration: 250 });
    modalTranslateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
    backdropOpacity.value = withTiming(1, { duration: 250 });
  }, [isActivityLocked, modalOpacity, modalTranslateY, backdropOpacity]);

  const handleClosePreview = useCallback(() => {
    modalOpacity.value = withTiming(0, { duration: 200 });
    modalTranslateY.value = withTiming(50, { duration: 200 });
    backdropOpacity.value = withTiming(0, { duration: 200 });
    setTimeout(() => {
      setIsPreviewVisible(false);
      setPreviewActivity(null);
    }, 220);
  }, [modalOpacity, modalTranslateY, backdropOpacity]);

  const handlePreviewPlay = useCallback(() => {
    if (!previewActivity) return;
    handleClosePreview();
    // Small delay to let modal close, then trigger normal activity flow
    setTimeout(() => {
      onActivitySelect(previewActivity.id, previewActivity.gameType, previewActivity.storyId, previewActivity.nameKey);
      // Start the card transition from screen center so mode selection overlay appears
      const { width: sw, height: sh } = Dimensions.get('window');
      const transAct: TransitionActivity = {
        id: previewActivity.id,
        nameKey: previewActivity.nameKey,
        descKey: previewActivity.descKey,
        ageKey: previewActivity.ageKey,
        icon: previewActivity.icon,
        color: previewActivity.color,
      };
      startTransition(transAct, { x: sw / 2 - 40, y: sh / 2 - 40, width: 80, height: 80 });
    }, 250);
  }, [previewActivity, handleClosePreview, onActivitySelect, startTransition]);

  const handlePreviewFavorite = useCallback(() => {
    if (!previewActivity) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    heartScale.value = withSequence(
      withSpring(1.3, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 400 })
    );
    toggleFavoriteActivity(previewActivity.id);
  }, [previewActivity, heartScale, toggleFavoriteActivity]);

  const handleFilterPress = useCallback((id: AgeRange) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRange(prev => prev === id ? 'all' : id);
  }, []);

  const title = mode === 'spelling'
    ? t('learning.spellingTitle')
    : mode === 'numbers'
    ? t('learning.numbersTitle')
    : t('learning.feelingsTitle');

  // Scaled card sizes
  const scaledCardW = scaledButtonSize(CARD_WIDTH);
  const scaledCardH = scaledButtonSize(CARD_HEIGHT);
  const scaledBorderRadius = scaledButtonSize(15);
  const gridCardW = GRID_CARD_WIDTH;
  const gridCardH = GRID_CARD_HEIGHT;

  // Age group headings
  const ageHeading = (age: AgeRange) => {
    if (age === '1-2') return t('learning.age12');
    if (age === '2-4') return t('learning.age24');
    return t('learning.age4plus');
  };

  // Carousel item layout for snap
  const getItemLayout = useCallback((_: any, index: number) => ({
    length: ITEM_WIDTH,
    offset: ITEM_WIDTH * index,
    index,
  }), []);

  // Render activity card for carousel
  const renderCarouselItem: ListRenderItem<LearningActivity> = useCallback(({ item }) => (
    <ActivityCard
      activity={item}
      cardWidth={scaledCardW}
      cardHeight={scaledCardH}
      borderRadius={scaledBorderRadius}
      isLocked={isActivityLocked(item)}
      onPress={handleActivityPress}
      onLongPress={handleActivityLongPress}
      isHidden={isTransitioning && transActivity?.id === item.id}
    />
  ), [scaledCardW, scaledCardH, scaledBorderRadius, isActivityLocked, handleActivityPress, handleActivityLongPress, isTransitioning, transActivity]);

  return (
    <View style={styles.container}>
      {/* Background */}
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

      <PageHeader title={title} onBack={onBack} useBackArrow />

      <View style={{ flex: 1, paddingTop: insets.top + 90 + (textSizeScale - 1) * 40, zIndex: 10 }}>

        {/* ── Filter bar: age chips + grid/carousel toggle ── */}
        <View style={styles.filterBarRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBarScroll} contentContainerStyle={styles.filterBarScrollContent}>
            {AGE_FILTERS.filter(f => f.id !== 'all').map((filter) => {
              const isSelected = selectedRange === filter.id;
              return (
                <Pressable
                  key={filter.id}
                  style={[styles.tagButton, isSelected && { backgroundColor: filter.color }]}
                  onPress={() => handleFilterPress(filter.id)}
                >
                  <Ionicons name={filter.icon} size={14} color="#FFFFFF" style={styles.tagIcon} />
                  <Text style={[styles.tagLabel, { fontSize: scaledFontSize(12) }]} numberOfLines={1}>
                    {t(filter.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable onPress={handleViewModeToggle} hitSlop={10} style={styles.viewModeToggle}>
            {learningViewMode === 'grid'
              ? <Ionicons name="grid-outline" size={18} color="#FFFFFF" />
              : <CarouselIcon size={20} color="#FFFFFF" />
            }
          </Pressable>
        </View>

        {/* ── Activities: Carousel or Grid ── */}
        <ScrollView style={{ flex: 1 }}>
          {visibleAgeGroups.length === 0 && (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>{t('learning.noActivities')}</Text>
            </View>
          )}

          <Animated.View style={viewFadeStyle}>
          {learningViewMode === 'carousel' ? (
            <>
              {/* Your Favorites Carousel */}
              {favoriteActivities.length > 0 && (
                <View style={{ marginBottom: 40 }}>
                  <Text style={styles.genreHeadingText}>
                    <Ionicons name="heart" size={16} color="#FF6B6B" />{' '}{t('stories.yourFavorites', { defaultValue: 'Your Favorites' })}
                  </Text>
                  <FlatList
                    data={favoriteActivities}
                    renderItem={renderCarouselItem}
                    keyExtractor={(item) => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    getItemLayout={getItemLayout}
                    removeClippedSubviews={false}
                    maxToRenderPerBatch={4}
                    windowSize={5}
                    initialNumToRender={4}
                    decelerationRate="fast"
                    snapToInterval={ITEM_WIDTH}
                    snapToAlignment="start"
                    contentContainerStyle={styles.carouselContent}
                  />
                </View>
              )}
              {visibleAgeGroups.map((age) => {
                const items = ageGroupActivities[age] || [];
                if (items.length === 0) return null;
                return (
                  <View key={age} style={{ marginBottom: 40 }}>
                    <Text style={styles.genreHeadingText}>{ageHeading(age)}</Text>
                    <FlatList
                      data={items}
                      renderItem={renderCarouselItem}
                      keyExtractor={(item) => item.id}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      getItemLayout={getItemLayout}
                      removeClippedSubviews={false}
                      maxToRenderPerBatch={4}
                      windowSize={5}
                      initialNumToRender={4}
                      decelerationRate="fast"
                      snapToInterval={ITEM_WIDTH}
                      snapToAlignment="start"
                      contentContainerStyle={styles.carouselContent}
                    />
                  </View>
                );
              })}
            </>
          ) : (
            /* ── GRID VIEW ── */
            <View style={styles.gridContainer}>
              {/* Your Favorites Grid */}
              {favoriteActivities.length > 0 && (
                <View>
                  <Text style={styles.gridGenreHeading}>
                    <Ionicons name="heart" size={16} color="#FF6B6B" />{' '}{t('stories.yourFavorites', { defaultValue: 'Your Favorites' })}
                  </Text>
                  <View style={styles.gridRow}>
                    {favoriteActivities.map((item) => (
                      <View key={item.id} style={styles.gridCell}>
                        <ActivityCard
                          activity={item}
                          cardWidth={gridCardW}
                          cardHeight={gridCardH}
                          borderRadius={scaledBorderRadius}
                          isLocked={isActivityLocked(item)}
                          onPress={handleActivityPress}
                          onLongPress={handleActivityLongPress}
                          isHidden={isTransitioning && transActivity?.id === item.id}
                        />
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {visibleAgeGroups.map((age) => {
                const items = ageGroupActivities[age] || [];
                if (items.length === 0) return null;
                return (
                  <View key={age}>
                    <Text style={styles.gridGenreHeading}>{ageHeading(age)}</Text>
                    <View style={styles.gridRow}>
                      {items.map((item) => (
                        <View key={item.id} style={styles.gridCell}>
                          <ActivityCard
                            activity={item}
                            cardWidth={gridCardW}
                            cardHeight={gridCardH}
                            borderRadius={scaledBorderRadius}
                            isLocked={isActivityLocked(item)}
                            onPress={handleActivityPress}
                            onLongPress={handleActivityLongPress}
                            isHidden={isTransitioning && transActivity?.id === item.id}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
          </Animated.View>
        </ScrollView>
      </View>

      {/* Activity Preview Modal — shown on long press */}
      {isPreviewVisible && previewActivity && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]} pointerEvents="auto">
          <Animated.View style={[StyleSheet.absoluteFill, backdropAnimatedStyle]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={handleClosePreview}>
              <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
            </Pressable>
          </Animated.View>
          <Animated.View style={[previewStyles.modalWrapper, modalAnimatedStyle]} pointerEvents="box-none">
            <View style={previewStyles.modalContent}>
              {/* Close button */}
              <Pressable style={previewStyles.closeBtn} onPress={handleClosePreview}>
                <Ionicons name="close" size={18} color="#666" />
              </Pressable>
              {/* Favourite button */}
              <Pressable style={previewStyles.favBtn} onPress={handlePreviewFavorite}>
                <Animated.View style={heartAnimatedStyle}>
                  <Ionicons
                    name={favoriteActivityIds.includes(previewActivity.id) ? 'heart' : 'heart-outline'}
                    size={24}
                    color={favoriteActivityIds.includes(previewActivity.id) ? '#FF6B6B' : '#999'}
                  />
                </Animated.View>
              </Pressable>
              {/* Activity icon header */}
              <LinearGradient
                colors={[previewActivity.color, shiftColor(previewActivity.color, -30)]}
                style={previewStyles.iconHeader}
              >
                <Ionicons name={previewActivity.icon} size={48} color="rgba(255,255,255,0.9)" />
              </LinearGradient>
              {/* Title */}
              <Text style={previewStyles.title}>{t(previewActivity.nameKey)}</Text>
              {/* Metadata */}
              <View style={previewStyles.metaRow}>
                <View style={previewStyles.metaItem}>
                  <Text style={previewStyles.metaLabel}>{t('learning.activityPreview.ageRange')}</Text>
                  <Text style={previewStyles.metaValue}>{t(previewActivity.ageKey)}</Text>
                </View>
              </View>
              {/* Description */}
              <Text style={previewStyles.description}>{t(previewActivity.descKey)}</Text>
              {/* Play button */}
              <Pressable style={previewStyles.playBtn} onPress={handlePreviewPlay}>
                <Text style={previewStyles.playBtnTxt}>{t('learning.activityPreview.playActivity')}</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      )}

      {/* Subscription Overlay — triggered from locked activity tap */}
      <SubscriptionOverlay
        visible={showSubscription}
        onClose={() => setShowSubscription(false)}
      />

      {/* Learning section tutorial — shown on first visit, only when page is active */}
      <LearningTipsOverlay tutorialId={tutorialId} isActive={isActive} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E3A8A',
  },
  // ── Filter bar ──
  filterBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
    marginBottom: 12,
  },
  filterBarScroll: {
    flex: 1,
    overflow: 'hidden',
  },
  filterBarScrollContent: {
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 6,
  },
  tagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tagIcon: {
    marginRight: 2,
  },
  tagLabel: {
    color: 'white',
    fontFamily: Fonts.rounded,
    fontWeight: '600',
  },
  viewModeToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  // ── Card ──
  cardPressable: {
    marginRight: CARD_MARGIN,
  },
  card: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cardIconContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitleContainer: {
    paddingTop: 6,
    paddingHorizontal: 2,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    fontSize: 13,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  ageBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ageBadgeText: {
    color: '#FFFFFF',
    fontFamily: Fonts.rounded,
    fontWeight: '600',
    fontSize: 10,
  },
  lockOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ── Carousel view ──
  carouselContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  genreHeadingText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  // ── Grid view ──
  gridContainer: {
    paddingHorizontal: GRID_PADDING,
    paddingBottom: 40,
  },
  gridGenreHeading: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: Fonts.rounded,
    marginTop: 20,
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  gridCell: {
    width: GRID_CARD_WIDTH,
    marginBottom: 8,
  },
  // ── Empty state ──
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    color: 'white',
    fontFamily: Fonts.rounded,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
});

const previewStyles = StyleSheet.create({
  modalWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '85%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute', top: 12, left: 12, width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.06)', justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
  favBtn: {
    position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.06)', justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
  iconHeader: {
    width: '100%', height: 140, justifyContent: 'center', alignItems: 'center',
  },
  title: {
    fontSize: 22, fontWeight: 'bold', color: '#333', textAlign: 'center',
    marginTop: 16, marginBottom: 8, paddingHorizontal: 24, fontFamily: Fonts.primary,
  },
  metaRow: {
    flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 24, marginBottom: 8,
  },
  metaItem: { alignItems: 'center' },
  metaLabel: {
    fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 2, fontFamily: Fonts.sans,
  },
  metaValue: {
    fontSize: 14, color: '#333', fontFamily: Fonts.sans,
  },
  description: {
    fontSize: 14, color: '#666', textAlign: 'center', paddingHorizontal: 24,
    marginBottom: 16, fontFamily: Fonts.sans, lineHeight: 20,
  },
  playBtn: {
    backgroundColor: '#4ECDC4', borderRadius: 12, padding: 14, alignItems: 'center',
    marginHorizontal: 24, marginBottom: 24,
  },
  playBtnTxt: {
    fontSize: 16, fontWeight: '600', color: 'white', fontFamily: Fonts.sans,
  },
});