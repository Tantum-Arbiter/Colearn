import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { useAppStore } from '../../store/app-store';
import { MoonBottomImage } from '../main-menu/animated-components';
import { mainMenuStyles } from '../main-menu/styles';
import { MusicControl } from '../ui/music-control';
import { TermsConditionsScreen } from './terms-conditions-screen';
import { PrivacyPolicyScreen } from './privacy-policy-screen';
import { ScreenTimeScreen } from '../screen-time/screen-time-screen';
import { NotificationDebugScreen } from '../debug/notification-debug-screen';
import { AudioDebugScreen } from '../debug/audio-debug-screen';
import ScreenTimeService from '../../services/screen-time-service';
import { useScreenTime } from '../screen-time/screen-time-provider';
import { formatDurationCompact } from '../../utils/time-formatting';
import { EditProfileScreen } from './edit-profile-screen';
import { ApiClient } from '../../services/api-client';
import { Alert } from 'react-native';


interface AccountScreenProps {
  onBack: () => void;
}

// Generate star positions for background
const generateStarPositions = () => {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const stars = [];
  const starCount = 15;

  for (let i = 0; i < starCount; i++) {
    stars.push({
      id: i,
      left: Math.random() * screenWidth,
      top: Math.random() * (screenHeight * 0.6), // Only in top 60% of screen
      opacity: 0.3 + Math.random() * 0.4, // Random opacity between 0.3-0.7
    });
  }
  return stars;
};

export function AccountScreen({ onBack }: AccountScreenProps) {
  const [currentView, setCurrentView] = useState<'main' | 'terms' | 'privacy' | 'screen-time' | 'notification-debug' | 'audio-debug' | 'edit-profile'>('main');

  const insets = useSafeAreaInsets();
  const {
    userNickname,
    userAvatarType,
    setOnboardingComplete,
    setLoginComplete,
    setAppReady,
    setShowLoginAfterOnboarding,
    clearPersistedStorage
  } = useAppStore();

  // Screen time context for resetting today's usage
  const { todayUsage, refreshUsage } = useScreenTime();

  // Star animation
  const starOpacity = useSharedValue(0.4);
  const stars = useMemo(() => generateStarPositions(), []);

  // Animate stars with a gentle pulsing effect
  React.useEffect(() => {
    starOpacity.value = withRepeat(
      withTiming(0.8, { duration: 2000 }),
      -1,
      true
    );
  }, [starOpacity]);

  const starAnimatedStyle = useAnimatedStyle(() => ({
    opacity: starOpacity.value,
  }));

  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Logout',
      'Are you sure you want to logout? You will need to sign in again.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear authentication tokens
              await ApiClient.logout();

              // Reset login state
              setLoginComplete(false);
              setShowLoginAfterOnboarding(true);

              // Go back to main menu (which will redirect to login)
              onBack();
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleResetApp = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Reset App',
      'This will clear ALL app data including your login, character, and settings. Are you sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            // Clear authentication tokens
            await ApiClient.logout();

            // Clear persisted storage completely to ensure fresh start
            await clearPersistedStorage();

            // Reset all state to initial values
            setOnboardingComplete(false);
            setLoginComplete(false);
            setShowLoginAfterOnboarding(false);
            setAppReady(false);

            // Give a moment for state to update and persist
            setTimeout(() => {
              setAppReady(true);
            }, 500);
          },
        },
      ]
    );
  };

  const handleResetTodayUsage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const screenTimeService = ScreenTimeService.getInstance();
      await screenTimeService.resetTodayUsage();

      // Refresh the usage in the context to update the UI immediately
      await refreshUsage();

      console.log('Today\'s screen time usage has been reset');
    } catch (error) {
      console.error('Failed to reset today\'s usage:', error);
    }
  };

  // Handle navigation between views
  if (currentView === 'terms') {
    return <TermsConditionsScreen onBack={() => setCurrentView('main')} />;
  }

  if (currentView === 'privacy') {
    return <PrivacyPolicyScreen onBack={() => setCurrentView('main')} />;
  }

  if (currentView === 'screen-time') {
    return <ScreenTimeScreen onBack={() => setCurrentView('main')} />;
  }

  if (currentView === 'notification-debug') {
    return <NotificationDebugScreen onBack={() => setCurrentView('main')} />;
  }

  if (currentView === 'audio-debug') {
    return <AudioDebugScreen onBack={() => setCurrentView('main')} />;
  }

  if (currentView === 'edit-profile') {
    return <EditProfileScreen onBack={() => setCurrentView('main')} />;
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1E3A8A', '#1E3A8A', '#1E3A8A']} // Darkest color from main menu gradient
        style={styles.gradient}
      >
        {/* Animated stars background */}
        {stars.map((star) => (
          <Animated.View
            key={`star-${star.id}`}
            style={[
              starAnimatedStyle,
              {
                position: 'absolute',
                width: 3,
                height: 3,
                backgroundColor: '#FFFFFF',
                borderRadius: 1.5,
                opacity: star.opacity,
                left: star.left,
                top: star.top,
                zIndex: 1,
              },
            ]}
          />
        ))}

        {/* Moon bottom background image - behind all other components */}
        <View style={mainMenuStyles.bearContainer} pointerEvents="none">
          <MoonBottomImage />
        </View>

        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 50), zIndex: 50 }]}>
          <Pressable style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>
              ← Back
            </Text>
          </Pressable>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>
              Account
            </Text>
          </View>
          <MusicControl
            size={24}
            color="#FFFFFF"
          />
        </View>

        {/* Content */}
        <ScrollView
          style={[styles.scrollView, { zIndex: 10 }]}
          contentContainerStyle={[styles.content, { paddingBottom: Dimensions.get('window').height * 0.2 }]} // Add space for moon image
        >
          {/* App Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              App Settings
            </Text>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>
                Version
              </Text>
              <Text style={styles.settingValue}>
                1.0.0
              </Text>
            </View>

            <Pressable
              style={styles.button}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCurrentView('screen-time');
              }}
            >
              <Text style={styles.buttonText}>
                Screen Time Controls
              </Text>
            </Pressable>
          </View>

          {/* Profile Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Profile
            </Text>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>
                Nickname
              </Text>
              <Text style={styles.settingValue}>
                {userNickname || 'Not set'}
              </Text>
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>
                Avatar Type
              </Text>
              <Text style={styles.settingValue}>
                {userAvatarType ? (userAvatarType === 'boy' ? '👦 Boy' : '👧 Girl') : 'Not set'}
              </Text>
            </View>

            <Pressable
              style={styles.button}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCurrentView('edit-profile');
              }}
            >
              <Text style={styles.buttonText}>
                Edit Profile
              </Text>
            </Pressable>
          </View>

          {/* Privacy & Legal */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Privacy & Legal
            </Text>

            <Pressable
              style={styles.button}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCurrentView('terms');
              }}
            >
              <Text style={styles.buttonText}>
                Terms & Conditions
              </Text>
            </Pressable>

            <Pressable
              style={styles.button}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCurrentView('privacy');
              }}
            >
              <Text style={styles.buttonText}>
                Privacy Policy
              </Text>
            </Pressable>
          </View>

          {/* Account Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Account Actions
            </Text>

            <Pressable
              style={[styles.button, styles.logoutButton]}
              onPress={handleLogout}
            >
              <Text style={[styles.buttonText, styles.logoutButtonText]}>
                Logout
              </Text>
            </Pressable>
          </View>

          {/* Developer Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Developer Options
            </Text>

            <Pressable
              style={styles.button}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCurrentView('notification-debug');
              }}
            >
              <Text style={styles.buttonText}>
                Notification Debug
              </Text>
            </Pressable>

            <Pressable
              style={styles.button}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCurrentView('audio-debug');
              }}
            >
              <Text style={styles.buttonText}>
                Audio Debug
              </Text>
            </Pressable>

            <Pressable
              style={styles.button}
              onPress={handleResetTodayUsage}
            >
              <Text style={styles.buttonText}>
                Reset Today&apos;s Screen Time ({formatDurationCompact(todayUsage)})
              </Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.resetButton]}
              onPress={handleResetApp}
            >
              <Text style={[styles.buttonText, styles.resetButtonText]}>
                Reset App
              </Text>
            </Pressable>
          </View>
        </ScrollView>



      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 100,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  settingLabel: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  settingValue: {
    color: '#E0E0E0',
  },
  button: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 152, 0, 0.8)',
  },
  logoutButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  resetButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.8)',
  },
  resetButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

});
