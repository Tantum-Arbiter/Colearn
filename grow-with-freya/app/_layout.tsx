import React, { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppStore } from '@/store/app-store';
import { AppSplashScreen } from '@/components/splash-screen';
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow';
import { MainMenu } from '@/components/main-menu';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isAppReady, hasCompletedOnboarding, setCurrentScreen } = useAppStore();
  const [currentView, setCurrentView] = useState<'splash' | 'onboarding' | 'main' | 'tabs'>('splash');
  const [mainMenuKey, setMainMenuKey] = useState(0); // Force remount when returning from tabs

  useEffect(() => {
    if (!isAppReady) {
      setCurrentView('splash');
    } else if (!hasCompletedOnboarding) {
      setCurrentView('onboarding');
    } else {
      setCurrentView('main');
    }
  }, [isAppReady, hasCompletedOnboarding]);

  const handleOnboardingComplete = () => {
    setCurrentView('main');
  };

  const handleMainMenuNavigate = (destination: string) => {
    if (destination === 'stories') {
      setCurrentView('tabs');
      setCurrentScreen('stories');
    }
    // Handle other destinations as needed
  };

  const handleBackToMainMenu = () => {
    // Force remount of MainMenu to ensure clean state
    setMainMenuKey(prev => prev + 1);
    setCurrentView('main');
  };

  // Show splash screen while app is loading
  if (currentView === 'splash') {
    return <AppSplashScreen />;
  }

  // Show onboarding flow if not completed
  if (currentView === 'onboarding') {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  // Show main menu
  if (currentView === 'main') {
    return <MainMenu key={mainMenuKey} onNavigate={handleMainMenuNavigate} />;
  }

  // Show tab navigation for specific features
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
            // Add back button functionality
            gestureEnabled: true,
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
