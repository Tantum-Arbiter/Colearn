import React, { useCallback } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { STORY_FILTER_TAGS, StoryFilterTag } from '@/types/story';
import { ACCENT_GOLD, ACCENT_GREEN, ACCENT_PURPLE } from '@/constants/night-palette';
import { FilterPill } from '@/components/child-ui/filter-pill';

interface PillIconSpec {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

export const FILTER_PILL_ICONS: Record<StoryFilterTag, PillIconSpec> = {
  calming: { icon: 'leaf', color: ACCENT_GREEN },
  bedtime: { icon: 'moon', color: ACCENT_GOLD },
  adventure: { icon: 'rocket', color: ACCENT_PURPLE },
  learning: { icon: 'book', color: '#FFD98E' },
  music: { icon: 'musical-notes', color: '#F2A65A' },
  family: { icon: 'people', color: '#7EC8E3' },
  creativity: { icon: 'color-palette', color: '#D8A7E8' },
  animals: { icon: 'paw', color: '#D9A066' },
  friendship: { icon: 'heart', color: '#F4A6B8' },
  nature: { icon: 'flower', color: ACCENT_GREEN },
  fantasy: { icon: 'sparkles', color: ACCENT_GOLD },
  counting: { icon: 'calculator', color: '#8ED1C6' },
  emotions: { icon: 'happy', color: '#F4A6B8' },
  silly: { icon: 'happy-outline', color: ACCENT_GOLD },
  rhymes: { icon: 'chatbubble-ellipses', color: '#7EC8E3' },
};

interface StoryFilterPillProps {
  tag: StoryFilterTag;
  selected: boolean;
  onToggle: (tag: StoryFilterTag) => void;
  style?: StyleProp<ViewStyle>;
}

export function StoryFilterPill({ tag, selected, onToggle, style }: StoryFilterPillProps) {
  const { t } = useTranslation();
  const spec = FILTER_PILL_ICONS[tag];

  const handlePress = useCallback(() => {
    onToggle(tag);
  }, [onToggle, tag]);

  return (
    <FilterPill
      testID={`story-filter-pill-${tag}`}
      icon={spec.icon}
      iconColor={spec.color}
      label={t(STORY_FILTER_TAGS[tag].labelKey)}
      selected={selected}
      onPress={handlePress}
      style={style}
    />
  );
}
