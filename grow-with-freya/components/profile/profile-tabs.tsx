import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ACCENT_CORAL, ACCENT_GOLD, TEXT_PRIMARY } from '@/constants/night-palette';
import { FilterPill } from '@/components/child-ui/filter-pill';
import { SPACE_2 } from '@/components/child-ui/tokens';

export type ProfileTab = 'saved' | 'badges' | 'manage';

interface ProfileTabSpec {
  id: ProfileTab;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  labelKey: string;
}

export const PROFILE_TABS: readonly ProfileTabSpec[] = [
  { id: 'saved', icon: 'heart', iconColor: ACCENT_CORAL, labelKey: 'profile.tabs.saved' },
  { id: 'badges', icon: 'ribbon', iconColor: ACCENT_GOLD, labelKey: 'profile.tabs.badges' },
  { id: 'manage', icon: 'cloud-download', iconColor: TEXT_PRIMARY, labelKey: 'profile.tabs.manage' },
] as const;

interface ProfileTabsProps {
  selected: ProfileTab;
  onSelect: (tab: ProfileTab) => void;
}

/**
 * Three ways into the things that are the child's own, one open at a time.
 * They wear the catalogue's theme pills so the page reads as one family.
 */
export function ProfileTabs({ selected, onSelect }: ProfileTabsProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.row} testID="profile-tabs">
      {PROFILE_TABS.map((tab) => (
        <FilterPill
          key={tab.id}
          testID={`profile-tab-${tab.id}`}
          icon={tab.icon}
          iconColor={tab.iconColor}
          label={t(tab.labelKey)}
          selected={tab.id === selected}
          onPress={() => onSelect(tab.id)}
          style={styles.pill}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: SPACE_2,
  },
  pill: {
    flex: 1,
    paddingHorizontal: SPACE_2,
  },
});
