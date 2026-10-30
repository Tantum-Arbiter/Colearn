import React, { ReactNode, useState, type RefObject } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import type { Story } from '@/types/story';
import type { SupportedLanguage } from '@/services/i18n';
import { ACCENT_GOLD, TEXT_PRIMARY, TEXT_SECONDARY } from '@/constants/night-palette';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useAppStore } from '@/store/app-store';
import { AVATAR_OPTIONS } from '@/components/onboarding/onboarding-pages';
import { COVER_GRID_GAP, SPACE_2, SPACE_3, SPACE_4, SPACE_5 } from '@/components/child-ui/tokens';
import type { Badge } from '@/components/progress/progress-model';
import { BadgeWall } from './badge-wall';
import { DownloadRow, type DownloadOpenHandler } from './download-row';
import { ProfileTabs, type ProfileTab } from './profile-tabs';
import { ProfileSessionCard } from './profile-session-card';

const HERO_AVATAR_SIZE = 96;

interface ProfileViewProps {
  /** The saved shelves, built by the catalogue that owns them. */
  favourites: ReactNode;
  downloads: readonly Story[];
  /** How many books the current plan allows. Infinite plans say nothing. */
  downloadLimit: number;
  badges: readonly Badge[];
  language: SupportedLanguage;
  /** The content width the badge wall lays itself out across. */
  width: number;
  onOpenDownload: DownloadOpenHandler;
  onDeleteDownload: (story: Story) => void;
  onSelectBadge: (badge: Badge) => void;
  /** The face and name are the way to change them. */
  onEditProfile: () => void;
  /** Whoever needs to sign in is offered the login page here; a signed-in family, the way out. */
  needsSignIn: boolean;
  onLogin: () => void;
  /** So the profile tour can point the owl at the hero and the tabs. */
  guideTargets?: {
    hero?: RefObject<View | null>;
    tabs?: RefObject<View | null>;
    login?: RefObject<View | null>;
  };
}

export function ProfileView({
  favourites,
  downloads,
  downloadLimit,
  badges,
  language,
  width,
  onOpenDownload,
  onDeleteDownload,
  onSelectBadge,
  onEditProfile,
  needsSignIn,
  onLogin,
  guideTargets,
}: ProfileViewProps) {
  const { t } = useTranslation();
  const { scaledFontSize } = useAccessibility();
  const userAvatarId = useAppStore((state) => state.userAvatarId);
  const userNickname = useAppStore((state) => state.userNickname);
  const [tab, setTab] = useState<ProfileTab>('saved');

  const avatar = AVATAR_OPTIONS.find((option) => option.key === userAvatarId) ?? AVATAR_OPTIONS[0];
  const name = userNickname?.trim() || t('profile.noName');
  // Bundled books ship with the app and count toward the plan's allowance, so
  // a device can legitimately hold more than the plan nominally allows. "4 of
  // 2" reads as a bug; past the limit the plain count says the same thing.
  const showsAllowance = Number.isFinite(downloadLimit) && downloads.length <= downloadLimit;
  const showsCount = Number.isFinite(downloadLimit) && !showsAllowance;

  return (
    <View testID="profile-view" style={styles.page}>
      <Pressable
        testID="profile-hero"
        accessibilityRole="button"
        accessibilityLabel={t('common.editProfile')}
        onPress={onEditProfile}
        style={styles.hero}
      >
        <View
          testID="profile-hero-focus"
          ref={guideTargets?.hero}
          collapsable={false}
          style={styles.heroFocus}
        >
          <View style={styles.heroRing}>
            <Image
              testID="profile-hero-avatar-image"
              source={avatar.art}
              style={styles.heroAvatar}
              contentFit="cover"
              transition={0}
              cachePolicy="memory-disk"
            />
          </View>
          <View style={styles.heroNameRow}>
            <Text style={[styles.heroName, { fontSize: scaledFontSize(22) }]} numberOfLines={1}>
              {name}
            </Text>
            <Ionicons testID="profile-hero-chevron" name="chevron-down" size={20} color={TEXT_SECONDARY} />
          </View>
        </View>
      </Pressable>

      <ProfileSessionCard
        needsSignIn={needsSignIn}
        width={width}
        onLogin={onLogin}
        guideRef={guideTargets?.login}
      />

      <View ref={guideTargets?.tabs} collapsable={false}>
        <ProfileTabs selected={tab} onSelect={setTab} />
      </View>

      {tab === 'saved' && <View style={styles.section}>{favourites}</View>}

      {tab === 'manage' && (
        <View style={styles.section}>
          {showsAllowance && (
            <Text
              testID="profile-downloads-used"
              style={[styles.note, { fontSize: scaledFontSize(13) }]}
            >
              {t('profile.downloadsUsed', { used: downloads.length, limit: downloadLimit })}
            </Text>
          )}
          {showsCount && (
            <Text
              testID="profile-downloads-count"
              style={[styles.note, { fontSize: scaledFontSize(13) }]}
            >
              {t('profile.downloadsCount', { count: downloads.length })}
            </Text>
          )}
          {downloads.length === 0 ? (
            <Text
              testID="profile-downloads-empty"
              style={[styles.empty, { fontSize: scaledFontSize(15) }]}
            >
              {t('profile.downloadsEmpty')}
            </Text>
          ) : (
            <View testID="profile-downloads-list" style={styles.downloadList}>
              {downloads.map((story) => (
                <DownloadRow
                  key={story.id}
                  story={story}
                  language={language}
                  onOpen={onOpenDownload}
                  onDelete={onDeleteDownload}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {tab === 'badges' && (
        <View style={styles.section}>
          <BadgeWall badges={badges} width={width} onPress={onSelectBadge} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: SPACE_4,
  },
  hero: {
    alignItems: 'center',
  },
  // The tour rings this block, so it hugs the face and the name rather than
  // stretching the width of the page the way the tappable row does.
  heroFocus: {
    alignItems: 'center',
    gap: SPACE_2,
  },
  heroRing: {
    width: HERO_AVATAR_SIZE,
    height: HERO_AVATAR_SIZE,
    borderRadius: HERO_AVATAR_SIZE / 2,
    borderWidth: 2.5,
    borderColor: ACCENT_GOLD,
    overflow: 'hidden',
    backgroundColor: 'rgba(4, 16, 47, 0.55)',
  },
  heroAvatar: {
    width: '100%',
    height: '100%',
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE_2,
  },
  heroName: {
    color: TEXT_PRIMARY,
    fontFamily: Fonts.primary,
    fontWeight: '800',
  },
  section: {
    gap: SPACE_3,
  },
  note: {
    color: TEXT_SECONDARY,
    fontFamily: Fonts.primary,
    fontWeight: '600',
  },
  empty: {
    color: TEXT_SECONDARY,
    fontFamily: Fonts.primary,
    textAlign: 'center',
    paddingVertical: SPACE_5,
  },
  downloadList: {
    gap: COVER_GRID_GAP,
  },
});
