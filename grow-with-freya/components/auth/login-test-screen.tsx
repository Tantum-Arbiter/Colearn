import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '../themed-text';
import { LoginScreen } from './login-screen';
import { useAppStore } from '@/store/app-store';

interface LoginTestScreenProps {
  onBack: () => void;
}

export function LoginTestScreen({ onBack }: LoginTestScreenProps) {
  const insets = useSafeAreaInsets();
  const [showLogin, setShowLogin] = React.useState(false);
  const { setOnboardingComplete, setAppReady } = useAppStore();

  const handleShowLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowLogin(true);
  };

  const handleLoginSuccess = () => {
    setShowLogin(false);
    onBack();
  };

  const handleLoginSkip = () => {
    setShowLogin(false);
  };

  const handleResetApp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setOnboardingComplete(false);
    setAppReady(false);
    // This will trigger the app to restart from splash screen
    setTimeout(() => {
      setAppReady(true);
    }, 100);
  };

  if (showLogin) {
    return <LoginScreen onSuccess={handleLoginSuccess} onSkip={handleLoginSkip} />;
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E8F5E8', '#F0F8FF', '#E6F3FF']}
        style={styles.gradient}
      >
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Pressable style={styles.backButton} onPress={onBack}>
            <ThemedText style={styles.backButtonText}>← Back</ThemedText>
          </Pressable>
          
          <ThemedText type="title" style={styles.title}>
            Login Test
          </ThemedText>
        </View>

        <View style={styles.content}>
          <ThemedText style={styles.description}>
            Test the login screen that will be used for OAuth integration in the future.
          </ThemedText>

          <Pressable
            style={({ pressed }) => [
              styles.testButton,
              pressed && styles.testButtonPressed,
            ]}
            onPress={handleShowLogin}
          >
            <ThemedText style={styles.testButtonText}>
              Show Login Screen
            </ThemedText>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.resetButton,
              pressed && styles.resetButtonPressed,
            ]}
            onPress={handleResetApp}
          >
            <ThemedText style={styles.resetButtonText}>
              Reset App (Show Splash & Onboarding)
            </ThemedText>
          </Pressable>
        </View>
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
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2E8B8B',
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#2E8B8B',
    marginBottom: 12,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 30,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#5A5A5A',
    lineHeight: 22,
    maxWidth: '90%',
  },
  testButton: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  testButtonPressed: {
    backgroundColor: '#44A08D',
    transform: [{ scale: 0.98 }],
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  resetButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginTop: 20,
  },
  resetButtonPressed: {
    backgroundColor: '#E55555',
    transform: [{ scale: 0.98 }],
  },
  resetButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
