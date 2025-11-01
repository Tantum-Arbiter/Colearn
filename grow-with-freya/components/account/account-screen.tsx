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
  const [currentView, setCurrentView] = useState<'main' | 'terms' | 'privacy'>('main');
  const insets = useSafeAreaInsets();
  const { setOnboardingComplete, setAppReady } = useAppStore();

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
  }, []);

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
        <View style={[mainMenuStyles.bearContainer, { zIndex: 1 }]} pointerEvents="none">
          <MoonBottomImage />
        </View>

        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 50), zIndex: 50 }]}>
          <Pressable style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Account</Text>
          </View>
          <MusicControl
            size={24}
            color="#FFFFFF"
          />
        </View>

        {/* Content */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* App Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>App Settings</Text>
            
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Version</Text>
              <Text style={styles.settingValue}>1.0.0</Text>
            </View>
            
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Child-Friendly Mode</Text>
              <Text style={styles.settingValue}>Enabled</Text>
            </View>
          </View>

          {/* Character Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Character</Text>

            <View style={styles.characterContainer}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>👤</Text>
              </View>
              <View style={styles.characterInfo}>
                <Text style={styles.characterLabel}>Name</Text>
                <Text style={styles.characterName}>Your Child's Name</Text>
              </View>
            </View>

            <Pressable style={styles.button}>
              <Text style={styles.buttonText}>Edit Character (Coming Soon)</Text>
            </Pressable>
          </View>

          {/* Privacy & Legal */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Privacy & Legal</Text>

            <Pressable
              style={styles.button}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCurrentView('terms');
              }}
            >
              <Text style={styles.buttonText}>Terms & Conditions</Text>
            </Pressable>

            <Pressable
              style={styles.button}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCurrentView('privacy');
              }}
            >
              <Text style={styles.buttonText}>Privacy Policy</Text>
            </Pressable>
          </View>

          {/* Developer Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Developer Options</Text>

            <Pressable
              style={[styles.button, styles.resetButton]}
              onPress={handleResetApp}
            >
              <Text style={[styles.buttonText, styles.resetButtonText]}>Reset App</Text>
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
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
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
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
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
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 16,
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
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  characterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  characterInfo: {
    flex: 1,
  },
  characterLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  characterName: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },

});
