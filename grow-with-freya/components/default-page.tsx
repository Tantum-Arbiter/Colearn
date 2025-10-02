import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from './themed-text';
import { getSvgComponentFromSvg } from './main-menu/assets';

interface DefaultPageProps {
  icon: string;
  title: string;
  onBack: () => void;
}

// Map icon names from menu items to SVG component types
const mapIconNameToSvgType = (iconName: string): string => {
  switch (iconName) {
    case 'stories-icon':
      return 'stories';
    case 'sensory-icon':
      return 'sensory';
    case 'emotions-icon':
      return 'emotions';
    case 'bedtime-icon':
      return 'bedtime';
    case 'screentime-icon':
      return 'screentime';
    default:
      return 'stories'; // fallback
  }
};

// Content data for each page
const pageContent: { [key: string]: { emoji: string; message: string; subtitle: string; color: string } } = {
  'Stories': {
    emoji: '📚',
    message: 'Story Time!',
    subtitle: 'Magical tales and adventures await you here. Let your imagination soar!',
    color: '#FF6B6B'
  },
  'Sensory': {
    emoji: '✨',
    message: 'Feel & Explore!',
    subtitle: 'Touch, see, hear, and discover the world around you through your senses.',
    color: '#4ECDC4'
  },
  'Emotions': {
    emoji: '😊',
    message: 'Happy Feelings!',
    subtitle: 'Learn about emotions and how to express your feelings in healthy ways.',
    color: '#45B7D1'
  },
  'Bedtime': {
    emoji: '🎵',
    message: 'Sweet Dreams!',
    subtitle: 'Gentle melodies and soothing sounds to help you drift off to sleep.',
    color: '#96CEB4'
  },
  'Screen Time': {
    emoji: '⏰',
    message: 'Time to Play!',
    subtitle: 'Balance your screen time with fun activities and healthy habits.',
    color: '#FFEAA7'
  }
};

export function DefaultPage({ icon, title, onBack }: DefaultPageProps) {
  const content = pageContent[title] || pageContent['Stories'];
  const svgType = mapIconNameToSvgType(icon);
  const SvgComponent = getSvgComponentFromSvg(svgType as any);

  return (
    <LinearGradient
      colors={['#1E3A8A', '#3B82F6', '#4ECDC4']}
      style={styles.container}
    >
      {/* Back button */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <ThemedText style={styles.backButtonText}>← Back</ThemedText>
        </Pressable>
      </View>

      {/* Main content */}
      <View style={styles.content}>
        <ThemedText style={styles.title}>{title}</ThemedText>

        {/* SVG Icon */}
        <View style={styles.iconContainer}>
          <SvgComponent width={120} height={120} />
        </View>

        {/* Large emoji */}
        <ThemedText style={styles.emoji}>{content.emoji}</ThemedText>

        <ThemedText style={[styles.message, { color: content.color }]}>
          {content.message}
        </ThemedText>

        <ThemedText style={styles.subtitle}>
          {content.subtitle}
        </ThemedText>

        {/* Fun interactive element */}
        <Pressable style={[styles.actionButton, { backgroundColor: content.color }]} onPress={() => {}}>
          <ThemedText style={styles.actionButtonText}>Coming Soon! 🚀</ThemedText>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
  iconContainer: {
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 60,
    textAlign: 'center',
    marginBottom: 15,
  },
  message: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  actionButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
