/**
 * User Profile Component
 * Display and edit user profile information
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withSpring,
} from 'react-native-reanimated';

import { useAuth } from '../../store/auth-store';
import { UserProfile, UserPreferences } from '../../types/auth';

interface UserProfileComponentProps {
  onClose?: () => void;
  showCloseButton?: boolean;
}

export function UserProfileComponent({ 
  onClose, 
  showCloseButton = true 
}: UserProfileComponentProps) {
  const insets = useSafeAreaInsets();
  const { user, updateProfile, signOut, isLoading } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>(user || {});
  const [isSaving, setIsSaving] = useState(false);

  // Animation values
  const editButtonScale = useSharedValue(1);
  const profileImageScale = useSharedValue(1);

  const editButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: editButtonScale.value }],
  }));

  const profileImageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: profileImageScale.value }],
  }));

  const handleEditPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    editButtonScale.value = withSpring(0.95, {}, () => {
      editButtonScale.value = withSpring(1);
    });
    
    setIsEditing(!isEditing);
    if (!isEditing) {
      setEditedProfile(user || {});
    }
  };

  const handleSave = async () => {
    if (!editedProfile.name?.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    try {
      setIsSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      await updateProfile(editedProfile);
      setIsEditing(false);
      
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Profile update failed:', error);
      Alert.alert(
        'Update Failed', 
        error instanceof Error ? error.message : 'Please try again'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              await signOut();
            } catch (error) {
              console.error('Sign out failed:', error);
            }
          },
        },
      ]
    );
  };

  const handleProfileImagePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    profileImageScale.value = withSpring(0.9, {}, () => {
      profileImageScale.value = withSpring(1);
    });
    
    // TODO: Implement image picker
    Alert.alert('Coming Soon', 'Profile picture editing will be available soon');
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No user data available</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top + 20, 60) }
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        {showCloseButton && (
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
        )}
        <Text style={styles.title}>Profile</Text>
        <Animated.View style={editButtonAnimatedStyle}>
          <Pressable style={styles.editButton} onPress={handleEditPress}>
            <Text style={styles.editButtonText}>
              {isEditing ? 'Cancel' : 'Edit'}
            </Text>
          </Pressable>
        </Animated.View>
      </View>

      {/* Profile Image */}
      <Animated.View style={[styles.profileImageContainer, profileImageAnimatedStyle]}>
        <Pressable onPress={handleProfileImagePress}>
          {user.picture ? (
            <Image source={{ uri: user.picture }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Text style={styles.profileImagePlaceholderText}>
                {user.name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
        </Pressable>
      </Animated.View>

      {/* Profile Information */}
      <View style={styles.infoContainer}>
        {/* Name */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Name</Text>
          {isEditing ? (
            <TextInput
              style={styles.textInput}
              value={editedProfile.name || ''}
              onChangeText={(text) => setEditedProfile({ ...editedProfile, name: text })}
              placeholder="Enter your name"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          ) : (
            <Text style={styles.fieldValue}>{user.name}</Text>
          )}
        </View>

        {/* Email */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Email</Text>
          <Text style={styles.fieldValue}>{user.email}</Text>
          <Text style={styles.fieldNote}>Email cannot be changed</Text>
        </View>

        {/* Provider */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Sign-in Method</Text>
          <View style={styles.providerContainer}>
            <Text style={styles.providerIcon}>
              {user.provider === 'google' ? 'G' : ''}
            </Text>
            <Text style={styles.fieldValue}>
              {user.provider === 'google' ? 'Google' : 'Apple'}
            </Text>
          </View>
        </View>

        {/* Account Created */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Member Since</Text>
          <Text style={styles.fieldValue}>
            {new Date(user.createdAt).toLocaleDateString()}
          </Text>
        </View>

        {/* Preferences */}
        {user.preferences && (
          <View style={styles.preferencesContainer}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            
            {user.preferences.childName && (
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Child's Name</Text>
                <Text style={styles.fieldValue}>{user.preferences.childName}</Text>
              </View>
            )}
            
            {user.preferences.childAge && (
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Child's Age</Text>
                <Text style={styles.fieldValue}>{user.preferences.childAge} months</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {isEditing && (
          <Pressable
            style={[styles.actionButton, styles.saveButton]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.actionButtonText}>Save Changes</Text>
            )}
          </Pressable>
        )}

        <Pressable
          style={[styles.actionButton, styles.signOutButton]}
          onPress={handleSignOut}
          disabled={isLoading}
        >
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImagePlaceholderText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  infoContainer: {
    marginBottom: 32,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  fieldNote: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  textInput: {
    fontSize: 16,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  providerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 8,
    width: 20,
    textAlign: 'center',
  },
  preferencesContainer: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  signOutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 100,
  },
});
