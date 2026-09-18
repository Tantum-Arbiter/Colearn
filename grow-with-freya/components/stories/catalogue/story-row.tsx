import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SectionHeading } from '@/components/child-ui/section-heading';
import { COVER_GRID_GAP, SPACE_2, SPACE_3 } from '@/components/child-ui/tokens';
import { CatalogueStory } from './catalogue-story';

interface StoryRowProps {
  heading: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  stories: CatalogueStory[];
  /** Each book is this wide; the row snaps from one to the next. */
  cardWidth: number;
  /** The shelf's side margin, so the row runs out to the screen's edge and back. */
  edgeInset: number;
  renderCard: (story: CatalogueStory, width: number) => React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}

/**
 * One shelf of books to swipe along, headed like any section, with a way to
 * see all of them at the row's end. The books run out past the content margin
 * to the screen's edge, so the next one shows and the row reads as a shelf
 * rather than a box.
 */
export function StoryRow({
  heading,
  icon,
  iconColor,
  stories,
  cardWidth,
  edgeInset,
  renderCard,
  actionLabel,
  onAction,
  testID = 'story-row',
}: StoryRowProps) {
  return (
    <View testID={testID}>
      <View style={styles.heading}>
        <SectionHeading
          label={heading}
          icon={icon}
          iconColor={iconColor}
          actionLabel={actionLabel}
          onAction={onAction}
          testID={`${testID}-heading`}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={cardWidth + COVER_GRID_GAP}
        snapToAlignment="start"
        style={{ marginHorizontal: -edgeInset }}
        contentContainerStyle={[styles.shelf, { paddingHorizontal: edgeInset }]}
        testID={`${testID}-shelf`}
      >
        {stories.map((story) => (
          <View key={story.id} style={{ width: cardWidth }}>
            {renderCard(story, cardWidth)}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginBottom: SPACE_3,
    marginTop: SPACE_2,
  },
  shelf: {
    flexDirection: 'row',
    gap: COVER_GRID_GAP,
    paddingBottom: SPACE_3,
  },
});
