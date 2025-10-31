import React from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '../themed-text';
import { useAppStore } from '@/store/app-store';

interface SettingsScreenProps {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const insets = useSafeAreaInsets();
  const { setOnboardingComplete, setAppReady } = useAppStore();

  // Debug logging for settings screen
  React.useEffect(() => {
    const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
    if (isDev) {
      console.log('SettingsScreen mounted');
    }

    return () => {
      if (isDev) {
        console.log('SettingsScreen unmounted');
      }
    };
  }, []);

  const handleResetApp = () => {
    const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
    if (isDev) {
      console.log('Settings: Reset app button pressed');
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setOnboardingComplete(false);
    setAppReady(false);
    // This will trigger the app to restart from splash screen
    setTimeout(() => {
      setAppReady(true);
    }, 100);
  };

  const handleBack = () => {
    const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
    if (isDev) {
      console.log('Settings: Back button pressed');
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E8F5E8', '#F0F8FF', '#E6F3FF']}
        style={styles.gradient}
      >
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <ThemedText style={styles.backButtonText}>← Back</ThemedText>
          </Pressable>
          
          <ThemedText type="title" style={styles.title}>
            Settings
          </ThemedText>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>App Settings</ThemedText>
            
            <View style={styles.settingItem}>
              <ThemedText style={styles.settingLabel}>Version</ThemedText>
              <ThemedText style={styles.settingValue}>1.0.0</ThemedText>
            </View>
            
            <View style={styles.settingItem}>
              <ThemedText style={styles.settingLabel}>Child-Friendly Mode</ThemedText>
              <ThemedText style={styles.settingValue}>Enabled</ThemedText>
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Account</ThemedText>
            
            <View style={styles.settingItem}>
              <ThemedText style={styles.settingLabel}>Sign In Status</ThemedText>
              <ThemedText style={styles.settingValue}>Not Signed In</ThemedText>
            </View>
            
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.signInButton,
                pressed && styles.actionButtonPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                // TODO: Navigate to login screen when OAuth is ready
              }}
            >
              <ThemedText style={styles.actionButtonText}>
                Sign In (Coming Soon)
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Developer Options</ThemedText>
            
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.resetButton,
                pressed && styles.actionButtonPressed,
              ]}
              onPress={handleResetApp}
            >
              <ThemedText style={styles.resetButtonText}>
                Reset App (Show Splash & Onboarding)
              </ThemedText>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E8B8B',
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 16,
    color: '#5A5A5A',
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 16,
    color: '#2E8B8B',
    fontWeight: '600',
  },
  actionButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  signInButton: {
    backgroundColor: '#4ECDC4',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: '#FF6B6B',
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
