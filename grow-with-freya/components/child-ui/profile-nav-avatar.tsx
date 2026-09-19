import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { BORDER_DEFAULT, TEXT_PRIMARY } from '@/constants/night-palette';
import { AVATAR_OPTIONS } from '@/components/onboarding/onboarding-pages';
import { useAppStore } from '@/store/app-store';

/** As big as the Screensafe ring in the same bar: the child's own face is the bar's other landmark. */
export const PROFILE_NAV_AVATAR_SIZE = 58;

interface ProfileNavAvatarProps {
  selected: boolean;
  size?: number;
  testID?: string;
}

export function ProfileNavAvatar({
  selected,
  size = PROFILE_NAV_AVATAR_SIZE,
  testID = 'profile-nav-avatar',
}: ProfileNavAvatarProps) {
  const userAvatarId = useAppStore((state) => state.userAvatarId);
  const avatar = AVATAR_OPTIONS.find((option) => option.key === userAvatarId) ?? AVATAR_OPTIONS[0];

  return (
    <View
      testID={testID}
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: selected ? TEXT_PRIMARY : BORDER_DEFAULT,
        },
      ]}
    >
      <Image
        testID={`${testID}-image`}
        source={avatar.art}
        style={styles.image}
        contentFit="cover"
        transition={0}
        cachePolicy="memory-disk"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(4, 16, 47, 0.55)',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
