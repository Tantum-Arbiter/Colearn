import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/app-store';
import { backgroundSaveService } from '../../services/background-save-service';
import { useAccessibility } from '@/hooks/use-accessibility';
import { StarBackground } from '@/components/ui/star-background';
import { useBackButtonText } from '@/hooks/use-back-button-text';

interface EditProfileScreenProps {
  onBack: () => void;
}

interface EditProfileContentProps {
  paddingTop?: number;
  onSaveComplete?: () => void;
}

export function EditProfileScreen({ onBack }: EditProfileScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { userNickname, userAvatarType, userAvatarId, isGuestMode, setUserProfile } = useAppStore();
  const { scaledFontSize, scaledButtonSize, scaledPadding, isTablet, contentMaxWidth } = useAccessibility();
  const backButtonText = useBackButtonText();

  const [nickname, setNickname] = useState(userNickname || '');
  const [avatarType, setAvatarType] = useState<'boy' | 'girl'>(userAvatarType || 'girl');
  const [avatarId, setAvatarId] = useState(userAvatarId || 'girl_1');

  const handleSave = (shouldNavigateBack: boolean = true) => {
    if (!nickname.trim()) {
      Alert.alert(t('common.error'), t('profile.enterNickname'));
      return;
    }

    if (nickname.length > 20) {
      Alert.alert(t('common.error'), t('profile.nicknameTooLong'));
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Save locally immediately for instant feedback
    setUserProfile(nickname.trim(), avatarType, avatarId);

    if (!isGuestMode) {
      // Queue the API call to run in the background with retry
      // Queue the profile save in background
      backgroundSaveService.queueProfileSave({
        nickname: nickname.trim(),
        avatarType,
        avatarId,
      });
    }

    // Navigate back immediately - no waiting for API
    if (shouldNavigateBack) {
      onBack();
    }
  };

  const handleBack = () => {
    // Check if there are any unsaved changes
    const hasChanges =
      nickname !== (userNickname || '') ||
      avatarType !== (userAvatarType || 'girl') ||
      avatarId !== (userAvatarId || 'girl_1');



    if (hasChanges) {
      // Save changes before going back (pass true to navigate back)
      handleSave(true);
    } else {
      // No changes, just go back
      onBack();
    }
  };

  const handleAvatarTypeChange = (type: 'boy' | 'girl') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAvatarType(type);
    setAvatarId(type === 'boy' ? 'boy_1' : 'girl_1');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 50) }]}>
        <Pressable style={[styles.backButton, { minHeight: scaledButtonSize(40) }]} onPress={handleBack}>
          <Text style={[styles.backButtonText, { fontSize: scaledFontSize(16) }]}>{backButtonText}</Text>
        </Pressable>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { fontSize: scaledFontSize(20) }]}>{t('profile.editTitle')}</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, isTablet && { alignItems: 'center' }]}>
        <View style={isTablet ? { maxWidth: contentMaxWidth, width: '100%' } : undefined}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(16) }]}>{t('profile.nickname')}</Text>
          <TextInput
            style={[styles.textInput, { fontSize: scaledFontSize(16), padding: scaledPadding(15) }]}
            value={nickname}
            onChangeText={setNickname}
            placeholder={t('profile.nicknamePlaceholder')}
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            maxLength={20}
          />
          <Text style={[styles.helperText, { fontSize: scaledFontSize(12) }]}>{t('profile.nicknameCharacters', { count: nickname.length })}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(16) }]}>{t('profile.avatarType')}</Text>
          <View style={styles.avatarCardsRow}>
            <Pressable
              style={[
                styles.avatarCard,
                styles.avatarCardBoy,
                avatarType === 'boy' && styles.avatarCardSelected,
              ]}
              onPress={() => handleAvatarTypeChange('boy')}
            >
              <Image source={require('../../assets/images/ui-elements/boy-avatar.webp')} style={styles.avatarImage} resizeMode="contain" />
              <View style={[styles.radioOuter, avatarType === 'boy' && styles.radioOuterSelected]}>
                {avatarType === 'boy' && <View style={styles.radioInner} />}
              </View>
            </Pressable>

            <Pressable
              style={[
                styles.avatarCard,
                styles.avatarCardGirl,
                avatarType === 'girl' && styles.avatarCardSelected,
              ]}
              onPress={() => handleAvatarTypeChange('girl')}
            >
              <Image source={require('../../assets/images/ui-elements/girl-avatar.webp')} style={styles.avatarImage} resizeMode="contain" />
              <View style={[styles.radioOuter, avatarType === 'girl' && styles.radioOuterSelected]}>
                {avatarType === 'girl' && <View style={styles.radioInner} />}
              </View>
            </Pressable>
          </View>
        </View>

        <Pressable
          style={[styles.saveButton, { minHeight: scaledButtonSize(50), padding: scaledPadding(15) }]}
          onPress={() => handleSave()}
        >
          <Text style={[styles.saveButtonText, { fontSize: scaledFontSize(18) }]}>
            {t('profile.saveChanges')}
          </Text>
        </Pressable>

        <View style={[styles.comingSoonContainer, { marginTop: scaledPadding(30) }]}>
          <Text style={[styles.comingSoonText, { fontSize: scaledFontSize(14) }]}>
            {t('profile.comingSoon')}
          </Text>
        </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4A90E2',
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
    fontSize: 16,
    fontWeight: '600',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  helperText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginTop: 8,
  },
  // Avatar card selector (boy / girl)
  avatarCardsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 30,
  },
  avatarCard: {
    flex: 1,
    aspectRatio: 0.9,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarCardBoy: {
    backgroundColor: '#B3D4FC',
  },
  avatarCardGirl: {
    backgroundColor: '#F8C8DC',
  },
  avatarCardSelected: {
    borderColor: '#FFFFFF',
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  avatarImage: {
    width: '80%',
    height: undefined,
    aspectRatio: 1.5,
    marginBottom: 8,
  },
  avatarCardLabel: {
    color: '#333',
    fontWeight: '700',
    marginBottom: 12,
  },
  radioOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: 'rgba(0, 0, 0, 0.2)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#4A90E2',
  },
  radioInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4A90E2',
  },
  saveButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
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
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#4A90E2',
    fontSize: 18,
    fontWeight: 'bold',
  },
  comingSoonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  comingSoonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

// Content-only component for embedding in horizontal scroll
export function EditProfileContent({ paddingTop = 0, onSaveComplete }: EditProfileContentProps) {
  const { t } = useTranslation();
  const { userNickname, userAvatarType, userAvatarId, isGuestMode, setUserProfile } = useAppStore();
  const { scaledFontSize, scaledButtonSize, scaledPadding, isTablet, contentMaxWidth } = useAccessibility();

  const [nickname, setNickname] = useState(userNickname || '');
  const [avatarType, setAvatarType] = useState<'boy' | 'girl'>(userAvatarType || 'girl');
  const [avatarId, setAvatarId] = useState(userAvatarId || 'girl_1');

  const handleSave = () => {
    if (!nickname.trim()) {
      Alert.alert(t('common.error'), t('profile.enterNickname'));
      return;
    }

    if (nickname.length > 20) {
      Alert.alert(t('common.error'), t('profile.nicknameTooLong'));
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Save locally immediately for instant feedback
    setUserProfile(nickname.trim(), avatarType, avatarId);

    if (!isGuestMode) {
      // Queue the API call to run in the background with retry
      backgroundSaveService.queueProfileSave({
        nickname: nickname.trim(),
        avatarType,
        avatarId,
      });
    }

    // Call completion handler immediately - no waiting for API
    onSaveComplete?.();
  };

  const handleAvatarTypeChange = (type: 'boy' | 'girl') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAvatarType(type);
    setAvatarId(type === 'boy' ? 'boy_1' : 'girl_1');
  };

  return (
    <View style={{ flex: 1 }}>
      <StarBackground />
      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, { paddingTop }, isTablet && { alignItems: 'center' }]}>
        <View style={isTablet ? { maxWidth: contentMaxWidth, width: '100%' } : undefined}>

          {/* Boy / Girl avatar cards */}
          <View style={styles.avatarCardsRow}>
            <Pressable
              style={[
                styles.avatarCard,
                styles.avatarCardBoy,
                avatarType === 'boy' && styles.avatarCardSelected,
              ]}
              onPress={() => handleAvatarTypeChange('boy')}
            >
              <Image source={require('../../assets/images/ui-elements/boy-avatar.webp')} style={styles.avatarImage} resizeMode="contain" />
              <View style={[styles.radioOuter, avatarType === 'boy' && styles.radioOuterSelected]}>
                {avatarType === 'boy' && <View style={styles.radioInner} />}
              </View>
            </Pressable>

            <Pressable
              style={[
                styles.avatarCard,
                styles.avatarCardGirl,
                avatarType === 'girl' && styles.avatarCardSelected,
              ]}
              onPress={() => handleAvatarTypeChange('girl')}
            >
              <Image source={require('../../assets/images/ui-elements/girl-avatar.webp')} style={styles.avatarImage} resizeMode="contain" />
              <View style={[styles.radioOuter, avatarType === 'girl' && styles.radioOuterSelected]}>
                {avatarType === 'girl' && <View style={styles.radioInner} />}
              </View>
            </Pressable>
          </View>

          {/* Nickname input */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(16) }]}>{t('profile.nickname')}</Text>
            <TextInput
              style={[styles.textInput, { fontSize: scaledFontSize(16), padding: scaledPadding(15) }]}
              value={nickname}
              onChangeText={setNickname}
              placeholder={t('profile.nicknamePlaceholder')}
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              maxLength={20}
            />
            <Text style={[styles.helperText, { fontSize: scaledFontSize(12) }]}>{t('profile.nicknameCharacters', { count: nickname.length })}</Text>
          </View>

          {/* Save button */}
          <Pressable
            style={[styles.saveButton, { minHeight: scaledButtonSize(50), padding: scaledPadding(15) }]}
            onPress={handleSave}
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

