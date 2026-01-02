import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSpring, useAnimatedScrollHandler } from 'react-native-reanimated';
import { useAppStore } from '../../store/app-store';
import { MoonBottomImage } from '../main-menu/animated-components';
import { mainMenuStyles } from '../main-menu/styles';
import { PageHeader } from '../ui/page-header';
import { TermsConditionsContent } from './terms-conditions-screen';
import { PrivacyPolicyContent } from './privacy-policy-screen';
import { ScreenTimeContent } from '../screen-time/screen-time-screen';
import { CustomRemindersContent, CreateReminderContent } from '../reminders';
import { NotificationDebugScreen } from '../debug/notification-debug-screen';
import { AudioDebugScreen } from '../debug/audio-debug-screen';
import ScreenTimeService from '../../services/screen-time-service';
import { useScreenTime } from '../screen-time/screen-time-provider';
import { formatDurationCompact } from '../../utils/time-formatting';
import { EditProfileContent } from './edit-profile-screen';
import { ApiClient } from '../../services/api-client';
import { reminderService } from '../../services/reminder-service';
import * as Sentry from '@sentry/react-native';
import { TEXT_SIZE_OPTIONS, useAccessibility } from '../../hooks/use-accessibility';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type SlideView = 'main' | 'screen-time' | 'custom-reminders' | 'create-reminder' | 'edit-profile' | 'terms' | 'privacy';

// Animation duration for slide transitions
const SLIDE_DURATION = 300;


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

type Language = 'en' | 'pl' | 'es' | 'de';

const LANGUAGES: { code: Language; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
];

export function AccountScreen({ onBack }: AccountScreenProps) {
  const [currentView, setCurrentView] = useState<SlideView>('main');
  const [showGrayscaleInfo, setShowGrayscaleInfo] = useState(false);
  const [showLanguageOverlay, setShowLanguageOverlay] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en');

  // For debug screens that still use conditional rendering
  const [debugView, setDebugView] = useState<'none' | 'notification-debug' | 'audio-debug'>('none');

  // Track reminder changes for the screen time content
  const [reminderChangeCounter, setReminderChangeCounter] = useState(0);

  // Track unsaved changes across all screens (currently mainly for reminders)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Re-check for unsaved changes when reminder counter changes
  useEffect(() => {
    const remindersChanged = reminderService.hasUnsavedChanges();
    setHasUnsavedChanges(remindersChanged);
  }, [reminderChangeCounter]);

  // Slide animation values for each sub-page (0 = off-screen right, 1 = visible)
  const screenTimeSlide = useSharedValue(0);
  const customRemindersSlide = useSharedValue(0);
  const createReminderSlide = useSharedValue(0);
  const editProfileSlide = useSharedValue(0);
  const termsSlide = useSharedValue(0);
  const privacySlide = useSharedValue(0);

  // Animated styles for each sub-page overlay
  const screenTimeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - screenTimeSlide.value) * SCREEN_WIDTH }],
  }));
  const customRemindersStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - customRemindersSlide.value) * SCREEN_WIDTH }],
  }));
  const createReminderStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - createReminderSlide.value) * SCREEN_WIDTH }],
  }));
  const editProfileStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - editProfileSlide.value) * SCREEN_WIDTH }],
  }));
  const termsStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - termsSlide.value) * SCREEN_WIDTH }],
  }));
  const privacyStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - privacySlide.value) * SCREEN_WIDTH }],
  }));



  const insets = useSafeAreaInsets();
  const {
    userNickname,
    userAvatarType,
    textSizeScale,
    isGuestMode,
    setTextSizeScale,
    setOnboardingComplete,
    setLoginComplete,
    setAppReady,
    setShowLoginAfterOnboarding,
    setGuestMode,
    clearPersistedStorage,
    clearUserProfile
  } = useAppStore();

  // Screen time context for resetting today's usage
  const { todayUsage, refreshUsage } = useScreenTime();

  // Get the slide animation value for a view
  const getSlideValue = useCallback((view: SlideView) => {
    switch (view) {
      case 'screen-time': return screenTimeSlide;
      case 'custom-reminders': return customRemindersSlide;
      case 'create-reminder': return createReminderSlide;
      case 'edit-profile': return editProfileSlide;
      case 'terms': return termsSlide;
      case 'privacy': return privacySlide;
      default: return null;
    }
  }, [screenTimeSlide, customRemindersSlide, createReminderSlide, editProfileSlide, termsSlide, privacySlide]);

  // Navigate to a sub-page (slides in from right)
  const navigateToSlide = useCallback((view: SlideView) => {
    console.log(`[AccountScreen] Navigate to ${view}`);

    const slideValue = getSlideValue(view);
    if (slideValue) {
      slideValue.value = withTiming(1, { duration: SLIDE_DURATION });
    }
    setCurrentView(view);
  }, [getSlideValue]);

  // Navigate back (slides out to right)
  const navigateBack = useCallback((fromView: SlideView, toView: SlideView) => {
    console.log(`[AccountScreen] Navigate back from ${fromView} to ${toView}`);

    const slideValue = getSlideValue(fromView);
    if (slideValue) {
      slideValue.value = withTiming(0, { duration: SLIDE_DURATION });
    }
    // Update current view after animation starts
    setTimeout(() => setCurrentView(toView), SLIDE_DURATION);
  }, [getSlideValue]);

  // Navigate back to main (closes all overlays)
  const navigateToMain = useCallback(() => {
    console.log(`[AccountScreen] Navigate to main`);

    // Slide out the current view
    const slideValue = getSlideValue(currentView);
    if (slideValue) {
      slideValue.value = withTiming(0, { duration: SLIDE_DURATION });
    }
    setTimeout(() => setCurrentView('main'), SLIDE_DURATION);
  }, [currentView, getSlideValue]);

  // Get the title for the current slide view
  const getSlideTitle = useCallback((view: SlideView): string => {
    switch (view) {
      case 'screen-time': return 'Screen Time';
      case 'edit-profile': return 'Edit Profile';
      case 'terms': return 'Terms & Conditions';
      case 'privacy': return 'Privacy Policy';
      case 'custom-reminders': return 'Custom Reminders';
      case 'create-reminder': return 'Create Reminder';
      default: return 'Account';
    }
  }, []);

  // Accessibility scaling (textSizeScale already from useAppStore above)
  const { scaledFontSize, scaledButtonSize, scaledPadding, isTablet, contentMaxWidth } = useAccessibility();

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

  const handleLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Clear guest mode and show login screen
    setGuestMode(false);
    setShowLoginAfterOnboarding(true);
    onBack();
  };

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

              // Clear user profile data from store
              clearUserProfile();

              // Clear reminders
              await reminderService.clearAllReminders();

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

  // Handle navigation for debug views (still use conditional rendering)
  if (debugView === 'notification-debug') {
    return <NotificationDebugScreen onBack={() => setDebugView('none')} />;
  }

  if (debugView === 'audio-debug') {
    return <AudioDebugScreen onBack={() => setDebugView('none')} />;
  }

  // Handle back based on current view - respects navigation hierarchy
  const handleBack = async () => {
    // If leaving the account screen entirely (from main) and have unsaved changes, auto-save
    if (currentView === 'main' && hasUnsavedChanges) {
      try {
        // Auto-save: commit reminder changes locally
        if (reminderService.hasUnsavedChanges()) {
          await reminderService.commitChanges();
        }

        // Sync to backend if signed in
        const isAuthenticated = await ApiClient.isAuthenticated();
        if (isAuthenticated) {
          try {
            await reminderService.syncToBackend();
            console.log('[AccountScreen] Auto-saved reminders to backend');
          } catch (syncError) {
            console.log('[AccountScreen] Failed to sync to backend (saved locally):', syncError);
          }
        }

        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('[AccountScreen] Failed to auto-save:', error);
        // Still exit even if save fails - data is preserved locally
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onBack();
      return;
    }

    if (currentView === 'main') {
      onBack();
    } else if (currentView === 'create-reminder') {
      // Create reminder goes back to custom reminders
      navigateBack('create-reminder', 'custom-reminders');
    } else if (currentView === 'custom-reminders') {
      // Custom reminders goes back to screen time
      navigateBack('custom-reminders', 'screen-time');
    } else if (currentView === 'screen-time') {
      // Screen time goes back to main
      navigateBack('screen-time', 'main');
    } else {
      // Other views (edit-profile, terms, privacy) go back to main
      navigateToMain();
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1E3A8A', '#1E3A8A', '#1E3A8A']} // Darkest color from main menu gradient
        style={styles.gradient}
      >
        {/* Animated stars background - pointerEvents none to allow scrolling through */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
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
                },
              ]}
            />
          ))}
        </View>

        {/* Moon bottom background image - behind all other components */}
        <View style={mainMenuStyles.bearContainer} pointerEvents="none">
          <MoonBottomImage />
        </View>

        {/* Shared page header component - title changes based on current view */}
        <PageHeader
          title={getSlideTitle(currentView)}
          onBack={handleBack}
          rightActionIcon={currentView === 'custom-reminders' ? 'add' : undefined}
          onRightAction={currentView === 'custom-reminders' ? () => navigateToSlide('create-reminder') : undefined}
          headerBackgroundColor="#1E3A8A"
        />

        {/* Content container - z-index 10 to be above moon (z-index 1) */}
        <View style={{ flex: 1, paddingTop: insets.top + 140 + (textSizeScale - 1) * 60, zIndex: 10 }}>
          {/* Main Account Page - always rendered as base layer */}
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.content, { paddingBottom: Dimensions.get('window').height * 0.2 }, isTablet && { alignItems: 'center' }]}
              >
                <View style={isTablet ? { maxWidth: contentMaxWidth, width: '100%' } : undefined}>
          {/* App Settings Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>
              App Settings
            </Text>

            <View style={[styles.settingItem, { paddingVertical: scaledPadding(12) }]}>
              <Text style={[styles.settingLabel, { fontSize: scaledFontSize(16) }]}>
                Version
              </Text>
              <Text style={[styles.settingValue, { fontSize: scaledFontSize(16) }]}>
                1.0.0
              </Text>
            </View>

            <Pressable
              style={[styles.settingItem, { paddingVertical: scaledPadding(12) }]}
              onPress={isGuestMode ? handleLogin : handleLogout}
            >
              <Text style={[styles.settingLabel, { fontSize: scaledFontSize(16) }]}>
                {isGuestMode ? 'Login' : 'Logout'}
              </Text>
              <Text style={[styles.settingValue, { fontSize: scaledFontSize(16) }]}>
                {isGuestMode ? '→' : '→'}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.settingItem, { paddingVertical: scaledPadding(12) }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowLanguageOverlay(true);
              }}
            >
              <Text style={[styles.settingLabel, { fontSize: scaledFontSize(16) }]}>
                Language
              </Text>
              <Text style={[styles.settingValue, { fontSize: scaledFontSize(16) }]}>
                {LANGUAGES.find(l => l.code === selectedLanguage)?.flag} {LANGUAGES.find(l => l.code === selectedLanguage)?.name} →
              </Text>
            </Pressable>

            <Pressable
              style={[styles.button, { paddingVertical: scaledPadding(12), minHeight: scaledButtonSize(44) }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigateToSlide('screen-time');
              }}
            >
              <Text style={[styles.buttonText, { fontSize: scaledFontSize(16) }]}>
                Screen Time Controls
              </Text>
            </Pressable>
          </View>

          {/* Profile Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>
              Profile
            </Text>

            <View style={[styles.settingItem, { paddingVertical: scaledPadding(12) }]}>
              <Text style={[styles.settingLabel, { fontSize: scaledFontSize(16) }]}>
                Nickname
              </Text>
              <Text style={[styles.settingValue, { fontSize: scaledFontSize(16) }]}>
                {userNickname || 'Not set'}
              </Text>
            </View>

            <View style={[styles.settingItem, { paddingVertical: scaledPadding(12) }]}>
              <Text style={[styles.settingLabel, { fontSize: scaledFontSize(16) }]}>
                Avatar Type
              </Text>
              <Text style={[styles.settingValue, { fontSize: scaledFontSize(16) }]}>
                {userAvatarType ? (userAvatarType === 'boy' ? '👦 Boy' : '👧 Girl') : 'Not set'}
              </Text>
            </View>

            <Pressable
              style={[styles.button, { paddingVertical: scaledPadding(12), minHeight: scaledButtonSize(44) }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigateToSlide('edit-profile');
              }}
            >
              <Text style={[styles.buttonText, { fontSize: scaledFontSize(16) }]}>
                Edit Profile
              </Text>
            </Pressable>
          </View>

          {/* Accessibility */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>
              Accessibility
            </Text>

            <View style={[styles.settingItem, { paddingVertical: scaledPadding(12) }]}>
              <Text style={[styles.settingLabel, { fontSize: scaledFontSize(16) }]}>
                Text Size
              </Text>
              <Text style={[styles.settingValue, { fontSize: scaledFontSize(16) }]}>
                {TEXT_SIZE_OPTIONS.find(opt => opt.value === textSizeScale)?.label || 'Default'}
              </Text>
            </View>

            <View style={styles.textSizeOptions}>
              {TEXT_SIZE_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.textSizeButton,
                    { minHeight: scaledButtonSize(40), paddingHorizontal: scaledPadding(12), paddingVertical: scaledPadding(8) },
                    textSizeScale === option.value && styles.textSizeButtonSelected,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setTextSizeScale(option.value);
                  }}
                >
                  <Text
                    style={[
                      styles.textSizeButtonText,
                      textSizeScale === option.value && styles.textSizeButtonTextSelected,
                      { fontSize: scaledFontSize(14) * option.value },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.accessibilityHint, { fontSize: scaledFontSize(12) }]} numberOfLines={2} adjustsFontSizeToFit>
              Adjust text and button sizes for better visibility
            </Text>

            <Pressable
              style={styles.grayscaleInfoBox}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowGrayscaleInfo(!showGrayscaleInfo);
              }}
            >
              <Text style={[
                styles.grayscaleInfoTitle,
                showGrayscaleInfo && styles.grayscaleInfoTitleExpanded,
                { fontSize: scaledFontSize(14) }
              ]}>
                Grayscale / High Contrast {showGrayscaleInfo ? '▼' : '▶'}
              </Text>
              {showGrayscaleInfo && (
                <>
                  <Text style={[styles.grayscaleInfoText, { fontSize: scaledFontSize(12) }]}>
                    For black &amp; white mode, use your device&apos;s built-in accessibility settings:
                  </Text>
                  <Text style={[styles.grayscaleInfoPath, { fontSize: scaledFontSize(11) }]}>
                    <Text style={styles.platformBold}>iOS:</Text> Settings → Accessibility → Display & Text Size → Color Filters → Grayscale
                  </Text>
                  <Text style={[styles.grayscaleInfoPath, { fontSize: scaledFontSize(11) }]}>
                    <Text style={styles.platformBold}>Android:</Text> Settings → Accessibility → Color adjustment → Grayscale
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Privacy & Legal */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>
              Privacy & Legal
            </Text>

            <Pressable
              style={[styles.button, { paddingVertical: scaledPadding(12), minHeight: scaledButtonSize(44) }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigateToSlide('terms');
              }}
            >
              <Text style={[styles.buttonText, { fontSize: scaledFontSize(16) }]}>
                Terms & Conditions
              </Text>
            </Pressable>

            <Pressable
              style={[styles.button, { paddingVertical: scaledPadding(12), minHeight: scaledButtonSize(44) }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigateToSlide('privacy');
              }}
            >
              <Text style={[styles.buttonText, { fontSize: scaledFontSize(16) }]}>
                Privacy Policy
              </Text>
            </Pressable>
          </View>

          {/* Developer Options */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>
              Developer Options
            </Text>

            <Pressable
              style={[styles.button, { paddingVertical: scaledPadding(12), minHeight: scaledButtonSize(44) }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setDebugView('notification-debug');
              }}
            >
              <Text style={[styles.buttonText, { fontSize: scaledFontSize(16) }]}>
                Notification Debug
              </Text>
            </Pressable>

            <Pressable
              style={[styles.button, { paddingVertical: scaledPadding(12), minHeight: scaledButtonSize(44) }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setDebugView('audio-debug');
              }}
            >
              <Text style={[styles.buttonText, { fontSize: scaledFontSize(16) }]}>
                Audio Debug
              </Text>
            </Pressable>

            <Pressable
              style={[styles.button, { paddingVertical: scaledPadding(12), minHeight: scaledButtonSize(44) }]}
              onPress={handleResetTodayUsage}
            >
              <Text style={[styles.buttonText, { fontSize: scaledFontSize(16) }]}>
                Reset Today&apos;s Screen Time ({formatDurationCompact(todayUsage)})
              </Text>
            </Pressable>

            <Pressable
              style={[styles.button, { paddingVertical: scaledPadding(12), minHeight: scaledButtonSize(44) }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Sentry.captureException(new Error('Test crash from Developer Options'));
                Alert.alert('Sentry Test', 'Test error sent to Sentry!');
              }}
            >
              <Text style={[styles.buttonText, { fontSize: scaledFontSize(16) }]}>
                Test Sentry Crash
              </Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.resetButton, { paddingVertical: scaledPadding(12), minHeight: scaledButtonSize(44) }]}
              onPress={handleResetApp}
            >
              <Text style={[styles.buttonText, styles.resetButtonText, { fontSize: scaledFontSize(16) }]}>
                Reset App
              </Text>
            </Pressable>
          </View>
                </View>
              </ScrollView>
        </View>

        {/* Sub-page overlays - slide in from right, same positioning as main content */}
        {/* Screen Time Page */}
        <Animated.View style={[styles.overlayPage, screenTimeStyle]}>
          <ScreenTimeContent
            paddingTop={insets.top + 140 + (textSizeScale - 1) * 60 + 10}
            onNavigateToReminders={() => navigateToSlide('custom-reminders')}
          />
        </Animated.View>

        {/* Custom Reminders Page */}
        <Animated.View style={[styles.overlayPage, customRemindersStyle]}>
          <CustomRemindersContent
            paddingTop={insets.top + 140 + (textSizeScale - 1) * 60 + 10}
            onCreateNew={() => navigateToSlide('create-reminder')}
            onReminderChange={() => setReminderChangeCounter(prev => prev + 1)}
            refreshTrigger={reminderChangeCounter}
            isActive={currentView === 'custom-reminders'}
          />
        </Animated.View>

        {/* Create Reminder Page */}
        <Animated.View style={[styles.overlayPage, createReminderStyle]}>
          <CreateReminderContent
            paddingTop={insets.top + 140 + (textSizeScale - 1) * 60 + 10}
            onBack={() => navigateBack('create-reminder', 'custom-reminders')}
            onSuccess={() => {
              setReminderChangeCounter(prev => prev + 1);
              navigateBack('create-reminder', 'custom-reminders');
            }}
            refreshTrigger={reminderChangeCounter}
            isActive={currentView === 'create-reminder'}
          />
        </Animated.View>

        {/* Edit Profile Page */}
        <Animated.View style={[styles.overlayPage, editProfileStyle]}>
          <EditProfileContent paddingTop={insets.top + 140 + (textSizeScale - 1) * 60 + 10} onSaveComplete={navigateToMain} />
        </Animated.View>

        {/* Terms & Conditions Page */}
        <Animated.View style={[styles.overlayPage, termsStyle]}>
          <TermsConditionsContent paddingTop={insets.top + 140 + (textSizeScale - 1) * 60 + 10} />
        </Animated.View>

        {/* Privacy Policy Page */}
        <Animated.View style={[styles.overlayPage, privacyStyle]}>
          <PrivacyPolicyContent paddingTop={insets.top + 140 + (textSizeScale - 1) * 60 + 10} />
        </Animated.View>

        {/* Language Selection Overlay */}
        {showLanguageOverlay && (
          <Pressable
            style={styles.languageOverlay}
            onPress={() => setShowLanguageOverlay(false)}
          >
            <Pressable
              style={styles.languageModal}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={[styles.languageModalTitle, { fontSize: scaledFontSize(18) }]}>
                Select Language
              </Text>
              {LANGUAGES.map((lang) => (
                <Pressable
                  key={lang.code}
                  style={[
                    styles.languageOption,
                    selectedLanguage === lang.code && styles.languageOptionSelected,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedLanguage(lang.code);
                    setShowLanguageOverlay(false);
                  }}
                >
                  <Text style={[styles.languageFlag, { fontSize: scaledFontSize(24) }]}>
                    {lang.flag}
                  </Text>
                  <Text style={[styles.languageName, { fontSize: scaledFontSize(16) }]}>
                    {lang.name}
                  </Text>
                  {selectedLanguage === lang.code && (
                    <Text style={[styles.languageCheck, { fontSize: scaledFontSize(18) }]}>✓</Text>
                  )}
                </Pressable>
              ))}
            </Pressable>
          </Pressable>
        )}

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
  overlayPage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1E3A8A', // Match the main gradient background
    zIndex: 10,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
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
  loginButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
  },
  loginButtonText: {
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
  textSizeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  textSizeButton: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textSizeButtonSelected: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
    borderColor: 'rgba(76, 175, 80, 1)',
  },
  textSizeButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    textAlign: 'center',
  },
  textSizeButtonTextSelected: {
    fontWeight: 'bold',
  },
  accessibilityHint: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  grayscaleInfoBox: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
  },
  grayscaleInfoTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'left',
  },
  grayscaleInfoTitleExpanded: {
    marginBottom: 8,
  },
  grayscaleInfoText: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
    lineHeight: 18,
  },
  grayscaleInfoPath: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontStyle: 'italic',
    marginBottom: 4,
    lineHeight: 16,
  },
  platformBold: {
    fontWeight: 'bold',
    fontStyle: 'normal',
    color: '#FFFFFF',
  },
  languageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  languageModal: {
    backgroundColor: 'rgba(30, 30, 60, 0.95)',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    maxWidth: 300,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  languageModalTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  languageOptionSelected: {
    backgroundColor: 'rgba(100, 150, 255, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(100, 150, 255, 0.5)',
  },
  languageFlag: {
    marginRight: 12,
  },
  languageName: {
    color: '#FFFFFF',
    flex: 1,
  },
  languageCheck: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
});
