import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../store/app-store';
import { ApiClient } from '../../services/api-client';
import { useAccessibility } from '@/hooks/use-accessibility';

interface EditProfileScreenProps {
  onBack: () => void;
}

export function EditProfileScreen({ onBack }: EditProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const { userNickname, userAvatarType, userAvatarId, setUserProfile } = useAppStore();
  const { scaledFontSize, scaledButtonSize, scaledPadding } = useAccessibility();

  const [nickname, setNickname] = useState(userNickname || '');
  const [avatarType, setAvatarType] = useState<'boy' | 'girl'>(userAvatarType || 'girl');
  const [avatarId, setAvatarId] = useState(userAvatarId || 'girl_1');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!nickname.trim()) {
      Alert.alert('Error', 'Please enter a nickname');
      return;
    }

    if (nickname.length > 20) {
      Alert.alert('Error', 'Nickname must be 20 characters or less');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaving(true);

    try {
      const profile = await ApiClient.updateProfile({
        nickname: nickname.trim(),
        avatarType,
        avatarId,
      });

      setUserProfile(profile.nickname, profile.avatarType, profile.avatarId);

      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: onBack }
      ]);
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
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
        <Pressable style={[styles.backButton, { minHeight: scaledButtonSize(40) }]} onPress={onBack}>
          <Text style={[styles.backButtonText, { fontSize: scaledFontSize(16) }]}>← Back</Text>
        </Pressable>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { fontSize: scaledFontSize(20) }]}>Edit Profile</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(16) }]}>Nickname</Text>
          <TextInput
            style={[styles.textInput, { fontSize: scaledFontSize(16), padding: scaledPadding(15) }]}
            value={nickname}
            onChangeText={setNickname}
            placeholder="Enter your nickname..."
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            maxLength={20}
          />
          <Text style={[styles.helperText, { fontSize: scaledFontSize(12) }]}>{nickname.length}/20 characters</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(16) }]}>Avatar Type</Text>
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
                👦 Boy
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
                👧 Girl
              </Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          style={[styles.saveButton, { minHeight: scaledButtonSize(50), padding: scaledPadding(15) }, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={[styles.saveButtonText, { fontSize: scaledFontSize(18) }]}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Text>
        </Pressable>
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
});

