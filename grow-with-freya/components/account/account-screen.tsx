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
import { LanguageSelectionModal } from './language-selection-modal';
import { TextSizeSelectionModal } from './text-size-selection-modal';
import { useTranslation } from '../../localization/translations';
import { scaleText, getLanguageDisplayName, getTextSizeDisplayName } from '../../utils/text-scaling';

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
  const [currentView, setCurrentView] = useState<'main' | 'terms' | 'privacy' | 'screen-time' | 'notification-debug' | 'audio-debug'>('main');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showTextSizeModal, setShowTextSizeModal] = useState(false);
  const insets = useSafeAreaInsets();
  const {
    setOnboardingComplete,
    setAppReady,
    language,
    textSize,
    setLanguage,
    setTextSize
  } = useAppStore();

  const t = useTranslation(language);

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

  const handleResetApp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setOnboardingComplete(false);
    setAppReady(false);
    setTimeout(() => {
      setAppReady(true);
    }, 100);
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
            <Text style={[styles.backButtonText, { fontSize: scaleText(16, textSize) }]}>
              {t.back}
            </Text>
          </Pressable>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { fontSize: scaleText(28, textSize) }]}>
              {t.account}
            </Text>
          </View>
          <MusicControl
            size={24}
            color="#FFFFFF"
          />
        </View>

        {/* Content */}
        <ScrollView style={[styles.scrollView, { zIndex: 10 }]} contentContainerStyle={styles.content}>
          {/* App Settings Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaleText(22, textSize) }]}>
              {t.appSettings}
            </Text>

            <View style={styles.settingItem}>
              <Text style={[styles.settingLabel, { fontSize: scaleText(16, textSize) }]}>
                {t.version}
              </Text>
              <Text style={[styles.settingValue, { fontSize: scaleText(16, textSize) }]}>
                1.0.0
              </Text>
            </View>

            <Pressable
              style={styles.settingItem}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowLanguageModal(true);
              }}
            >
              <Text style={[styles.settingLabel, { fontSize: scaleText(16, textSize) }]}>
                {t.language}
              </Text>
              <Text style={[styles.settingValue, { fontSize: scaleText(16, textSize) }]}>
                {getLanguageDisplayName(language)} →
              </Text>
            </Pressable>

            <Pressable
              style={styles.settingItem}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowTextSizeModal(true);
              }}
            >
              <Text style={[styles.settingLabel, { fontSize: scaleText(16, textSize) }]}>
                {t.textSize}
              </Text>
              <Text style={[styles.settingValue, { fontSize: scaleText(16, textSize) }]}>
                {getTextSizeDisplayName(textSize)} →
              </Text>
            </Pressable>

            <View style={styles.settingItem}>
              <Text style={[styles.settingLabel, { fontSize: scaleText(16, textSize) }]}>
                {t.iconSize}
              </Text>
              <Text style={[styles.settingValue, { fontSize: scaleText(16, textSize) }]}>
                {t.large}
              </Text>
            </View>

            <View style={styles.settingItem}>
              <Text style={[styles.settingLabel, { fontSize: scaleText(16, textSize) }]}>
                {t.blackWhiteMode}
              </Text>
              <Text style={[styles.settingValue, { fontSize: scaleText(16, textSize) }]}>
                {t.disabled}
              </Text>
            </View>

            <Pressable
              style={styles.button}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCurrentView('screen-time');
              }}
            >
              <Text style={[styles.buttonText, { fontSize: scaleText(16, textSize) }]}>
                {t.screenTimeControls}
              </Text>
            </Pressable>
          </View>

          {/* Character Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaleText(22, textSize) }]}>
              {t.character}
            </Text>

            <View style={styles.settingItem}>
              <Text style={[styles.settingLabel, { fontSize: scaleText(16, textSize) }]}>
                {t.characterName}
              </Text>
              <Text style={[styles.settingValue, { fontSize: scaleText(16, textSize) }]}>
                {t.yourChildsName}
              </Text>
            </View>

            <Pressable style={styles.button}>
              <Text style={[styles.buttonText, { fontSize: scaleText(16, textSize) }]}>
                {t.editCharacter}
              </Text>
            </Pressable>
          </View>

          {/* Privacy & Legal */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaleText(22, textSize) }]}>
              {t.privacyLegal}
            </Text>

            <Pressable
              style={styles.button}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCurrentView('terms');
              }}
            >
              <Text style={[styles.buttonText, { fontSize: scaleText(16, textSize) }]}>
                {t.termsConditions}
              </Text>
            </Pressable>

            <Pressable
              style={styles.button}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCurrentView('privacy');
              }}
            >
              <Text style={[styles.buttonText, { fontSize: scaleText(16, textSize) }]}>
                {t.privacyPolicy}
              </Text>
            </Pressable>
          </View>

          {/* Developer Options */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaleText(22, textSize) }]}>
              {t.developerOptions}
            </Text>

            <Pressable
              style={styles.button}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCurrentView('notification-debug');
              }}
            >
              <Text style={[styles.buttonText, { fontSize: scaleText(16, textSize) }]}>
                {t.notificationDebug}
              </Text>
            </Pressable>

            <Pressable
              style={styles.button}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCurrentView('audio-debug');
              }}
            >
              <Text style={[styles.buttonText, { fontSize: scaleText(16, textSize) }]}>
                {t.audioDebug}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.resetButton]}
              onPress={handleResetApp}
            >
              <Text style={[styles.buttonText, styles.resetButtonText, { fontSize: scaleText(16, textSize) }]}>
                {t.resetApp}
              </Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* Language Selection Modal */}
        <LanguageSelectionModal
          visible={showLanguageModal}
          currentLanguage={language}
          currentTextSize={textSize}
          onSelect={setLanguage}
          onClose={() => setShowLanguageModal(false)}
        />

        {/* Text Size Selection Modal */}
        <TextSizeSelectionModal
          visible={showTextSizeModal}
          currentTextSize={textSize}
          currentLanguage={language}
          onSelect={setTextSize}
          onClose={() => setShowTextSizeModal(false)}
        />

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
