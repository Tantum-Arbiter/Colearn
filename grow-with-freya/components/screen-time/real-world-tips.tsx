import React, { memo, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useAccessibility, TABLET_CONTENT_MAX_WIDTH } from '@/hooks/use-accessibility';
import { Fonts } from '@/constants/theme';
import type { RealWorldAdventure } from '@/types/real-world-bridge';

/** Shared with the warning modal's bridge cards, so the two read as one idea. */
const CATEGORY_CONFIG: Record<RealWorldAdventure['category'], {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  labelKey: string;
  colour: string;
}> = {
  'at-home': { icon: 'home-outline', labelKey: 'bridge.atHome', colour: '#D4626E' },
  'outdoors': { icon: 'leaf-outline', labelKey: 'bridge.outdoors', colour: '#5AAF8C' },
  'creative': { icon: 'color-palette-outline', labelKey: 'bridge.creative', colour: '#B070B8' },
};

/**
 * One card per category, in the order a tired parent can actually act on
 * them: the thing you can do right now in this room, then the thing for the
 * next time you are outside, then the thing that needs paper.
 */
const CATEGORIES: RealWorldAdventure['category'][] = ['at-home', 'outdoors', 'creative'];

const KEY_BY_CATEGORY: Record<RealWorldAdventure['category'], string> = {
  'at-home': 'atHome',
  'outdoors': 'outdoors',
  'creative': 'creative',
};

export interface RealWorldTipsProps {
  onClose: () => void;
  testID?: string;
}

/**
 * Ways to carry the story off the screen and into the day.
 *
 * The content is generic to stories rather than tied to the book that was
 * just read: `setLastCompletedActivityId` is only ever called by the emotions
 * game, so there is no story id to look a bridge up by. The card shape is
 * deliberately the same as `RealWorldAdventure` -- one entry per category,
 * title and body -- so per-story bridges can be swapped in later without
 * touching this layout.
 */
export const RealWorldTips = memo(function RealWorldTips({
  onClose,
  testID = 'real-world-tips',
}: RealWorldTipsProps) {
  const { t } = useTranslation();
  const { scaledFontSize, isTablet, contentMaxWidth } = useAccessibility();

  const tips = useMemo(
    () =>
      CATEGORIES.map((category) => {
        const key = KEY_BY_CATEGORY[category];
        return {
          category,
          title: t(`screenTime.tips.${key}.title`),
          body: t(`screenTime.tips.${key}.body`),
        };
      }),
    [t]
  );

  return (
    <View style={styles.root} testID={testID}>
      <ScrollView
        contentContainerStyle={[styles.scroll, isTablet && styles.scrollTablet]}
        showsVerticalScrollIndicator={false}
      >
        <View style={isTablet ? { maxWidth: contentMaxWidth, width: '100%' } : undefined}>
        <Text style={[styles.title, { fontSize: scaledFontSize(24) }]} testID="real-world-tips-title">
          {t('screenTime.tips.title')}
        </Text>
        <Text style={[styles.intro, { fontSize: scaledFontSize(14) }]}>
          {t('screenTime.tips.intro')}
        </Text>

        {tips.map((tip, index) => {
          const config = CATEGORY_CONFIG[tip.category];

          return (
            <View key={tip.category} style={styles.card} testID={`real-world-tip-${index}`}>
              <View style={[styles.cardHeader, { backgroundColor: config.colour }]}>
                <Ionicons name={config.icon} size={15} color="#FFFFFF" />
                <Text style={[styles.cardCategory, { fontSize: scaledFontSize(12) }]}>
                  {t(config.labelKey)}
                </Text>
              </View>
              <Text style={[styles.cardTitle, { fontSize: scaledFontSize(15) }]}>{tip.title}</Text>
              <Text style={[styles.cardBody, { fontSize: scaledFontSize(13) }]}>{tip.body}</Text>
            </View>
          );
        })}

        <Text style={[styles.closing, { fontSize: scaledFontSize(13) }]} testID="real-world-tips-closing">
          {t('screenTime.tips.closing')}
        </Text>
        </View>
      </ScrollView>

      {/* the inset lives on the wrapper so the button itself can be a plain
          full-width child -- combining width:100% with its own horizontal
          margin overflows the panel */}
      <View style={styles.doneRow}>
        <Pressable
          testID="real-world-tips-done"
          accessibilityRole="button"
          accessibilityLabel={t('screenTime.tips.done')}
          onPress={onClose}
          style={styles.done}
        >
          <Text style={[styles.doneLabel, { fontSize: scaledFontSize(16) }]}>
            {t('screenTime.tips.done')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 18,
    // clears the panel's close button, which floats over this surface at
    // top-right -- without it the centred title runs under the X
    paddingTop: 54,
    paddingBottom: 12,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  intro: {
    fontFamily: Fonts.rounded,
    color: 'rgba(255, 255, 255, 0.72)',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 20,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 10,
  },
  cardCategory: {
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardTitle: {
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardBody: {
    fontFamily: Fonts.rounded,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 19,
  },
  closing: {
    fontFamily: Fonts.rounded,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 2,
  },
  scrollTablet: {
    alignItems: 'center',
  },
  doneRow: {
    paddingHorizontal: 18,
    paddingTop: 4,
    alignItems: 'center',
  },
  done: {
    width: '100%',
    maxWidth: TABLET_CONTENT_MAX_WIDTH,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneLabel: {
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
