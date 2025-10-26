import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { EmotionsGameScreen } from './emotions-game-screen';
import { EmotionsUnifiedScreen } from './emotions-unified-screen';
import { EmotionTheme } from '@/types/emotion';

interface EmotionsScreenProps {
  onBack: () => void;
}

export function EmotionsScreen({ onBack }: EmotionsScreenProps) {
  const [currentView, setCurrentView] = useState<'menu' | 'game'>('menu');
  const [selectedTheme, setSelectedTheme] = useState<EmotionTheme>('emoji');

  const handleStartGame = (theme: EmotionTheme) => {
    setSelectedTheme(theme);
    setCurrentView('game');
  };

  const handleBackToMenu = () => {
    setCurrentView('menu');
  };

  const handleGameComplete = () => {
    setCurrentView('menu');
  };



  const renderCurrentView = () => {
    switch (currentView) {
      case 'menu':
        return (
          <EmotionsUnifiedScreen
            onStartGame={handleStartGame}
            onBack={onBack}
          />
        );
      case 'game':
        return (
          <EmotionsGameScreen
            onBack={handleBackToMenu}
            onGameComplete={handleGameComplete}
            selectedTheme={selectedTheme}
          />
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Current view content */}
      {renderCurrentView()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerBackButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  headerBackButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 30,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
