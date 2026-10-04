import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/app-store';
import { useAccessibility } from '@/hooks/use-accessibility';
import { StarBackground } from '@/components/ui/star-background';
import { useBackButtonText } from '@/hooks/use-back-button-text';
import { ProfilePage, AVATAR_OPTIONS } from '@/components/onboarding/onboarding-pages';
import { MIN_NICKNAME_LENGTH } from '@/constants/profile';

interface EditProfileScreenProps {
  onBack: () => void;
}

interface EditProfileContentProps {
  paddingTop?: number;
  onSaveComplete?: () => void;
}

const DEFAULT_AVATAR_KEY = 'bear';
const DEFAULT_AGE_MONTHS = 36;

/** Profiles created before the animal avatars -- and any unknown id -- fall
 *  back to the first animal rather than saving a stale id straight back. */
function toAvatarKey(avatarId: string | null) {
  return AVATAR_OPTIONS.some((option) => option.key === avatarId)
    ? (avatarId as string)
    : DEFAULT_AVATAR_KEY;
}

/**
 * Editing a profile shows the same page onboarding uses, so the avatar, name,
 * age and language controls behave identically in both places.
 */
export function EditProfileContent({ paddingTop = 0, onSaveComplete }: EditProfileContentProps) {
  const { t } = useTranslation();
  const {
    userNickname,
    userAvatarType,
    userAvatarId,
    childAgeInMonths,
    setUserProfile,
    setChildAge,
  } = useAppStore();
  const { scaledFontSize, scaledButtonSize, scaledPadding, isTablet, contentMaxWidth } =
    useAccessibility();

  const [nickname, setNickname] = useState(userNickname || '');
  const [avatarKey, setAvatarKey] = useState(() => toAvatarKey(userAvatarId));
  const [ageMonths, setAgeMonths] = useState(childAgeInMonths || DEFAULT_AGE_MONTHS);

  // same rule as onboarding: no saving a profile without a usable name
  const canSave = nickname.trim().length >= MIN_NICKNAME_LENGTH;

  const handleSave = () => {
    if (!canSave) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const avatarType = userAvatarType || 'girl';
    setUserProfile(nickname.trim(), avatarType, avatarKey);
    setChildAge(ageMonths);


    onSaveComplete?.();
  };

  return (
    <View style={{ flex: 1 }}>
      <StarBackground />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingTop },
          isTablet && { alignItems: 'center' },
        ]}
      >
        <View style={isTablet ? { maxWidth: contentMaxWidth, width: '100%' } : undefined}>
          <ProfilePage
            nickname={nickname}
            onNicknameChange={setNickname}
            avatarKey={avatarKey}
            onAvatarKeyChange={setAvatarKey}
            ageMonths={ageMonths}
            onAgeChange={setAgeMonths}
          />

          <Pressable
            testID="profile-save"
            style={[
              styles.saveButton,
              !canSave && styles.saveButtonDisabled,
              { minHeight: scaledButtonSize(50), padding: scaledPadding(15) },
            ]}
            onPress={handleSave}
            disabled={!canSave}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave }}
          >
            <Text style={[styles.saveButtonText, { fontSize: scaledFontSize(18) }]}>
              {t('profile.saveChanges')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

/** Standalone framing for the same content, with its own header and back. */
export function EditProfileScreen({ onBack }: EditProfileScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { scaledFontSize, scaledButtonSize } = useAccessibility();
  const backButtonText = useBackButtonText();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 50) }]}>
        <Pressable
          style={[styles.backButton, { minHeight: scaledButtonSize(40) }]}
          onPress={onBack}
        >
          <Text style={[styles.backButtonText, { fontSize: scaledFontSize(16) }]}>
            {backButtonText}
          </Text>
        </Pressable>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { fontSize: scaledFontSize(20) }]}>
            {t('profile.editTitle')}
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <EditProfileContent onSaveComplete={onBack} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1030',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  saveButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  saveButtonDisabled: {
    opacity: 0.45,
  },
  saveButtonText: {
    color: '#4A90E2',
    fontWeight: 'bold',
  },
});
