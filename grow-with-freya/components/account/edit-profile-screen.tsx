import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
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

  const handleSave = async () => {
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

    // Navigate back immediately - no waiting for API
    onBack();
  };

  const handleAvatarTypeChange = (type: 'boy' | 'girl') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAvatarType(type);
    setAvatarId(type === 'boy' ? 'boy_1' : 'girl_1');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 50) }]}>
        <Pressable style={[styles.backButton, { minHeight: scaledButtonSize(40) }]} onPress={onBack}>
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
          <View style={styles.avatarTypeContainer}>
            <Pressable
              style={[
                styles.avatarTypeButton,
                { minHeight: scaledButtonSize(50), paddingHorizontal: scaledPadding(20) },
                avatarType === 'boy' && styles.avatarTypeButtonActive
              ]}
              onPress={() => handleAvatarTypeChange('boy')}
            >
              <Text style={[
                styles.avatarTypeText,
                { fontSize: scaledFontSize(16) },
                avatarType === 'boy' && styles.avatarTypeTextActive
              ]}>
                {t('profile.boy')}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.avatarTypeButton,
                { minHeight: scaledButtonSize(50), paddingHorizontal: scaledPadding(20) },
                avatarType === 'girl' && styles.avatarTypeButtonActive
              ]}
              onPress={() => handleAvatarTypeChange('girl')}
            >
              <Text style={[
                styles.avatarTypeText,
                { fontSize: scaledFontSize(16) },
                avatarType === 'girl' && styles.avatarTypeTextActive
              ]}>
                {t('profile.girl')}
              </Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          style={[styles.saveButton, { minHeight: scaledButtonSize(50), padding: scaledPadding(15) }]}
          onPress={handleSave}
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
  avatarTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  avatarTypeButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarTypeButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderColor: '#FFFFFF',
  },
  avatarTypeText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontWeight: '600',
  },
  avatarTypeTextActive: {
    color: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
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

  const handleSave = async () => {
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
          <View style={styles.avatarTypeContainer}>
            <Pressable
              style={[
                styles.avatarTypeButton,
                { minHeight: scaledButtonSize(50), paddingHorizontal: scaledPadding(20) },
                avatarType === 'boy' && styles.avatarTypeButtonActive
              ]}
              onPress={() => handleAvatarTypeChange('boy')}
            >
              <Text style={[
                styles.avatarTypeText,
                { fontSize: scaledFontSize(16) },
                avatarType === 'boy' && styles.avatarTypeTextActive
              ]}>
                {t('profile.boy')}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.avatarTypeButton,
                { minHeight: scaledButtonSize(50), paddingHorizontal: scaledPadding(20) },
                avatarType === 'girl' && styles.avatarTypeButtonActive
              ]}
              onPress={() => handleAvatarTypeChange('girl')}
            >
              <Text style={[
                styles.avatarTypeText,
                { fontSize: scaledFontSize(16) },
                avatarType === 'girl' && styles.avatarTypeTextActive
              ]}>
                {t('profile.girl')}
              </Text>
            </Pressable>
          </View>
        </View>

          <Pressable
            style={[styles.saveButton, { minHeight: scaledButtonSize(50), padding: scaledPadding(15) }]}
            onPress={handleSave}
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

