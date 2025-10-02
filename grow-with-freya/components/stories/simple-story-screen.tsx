import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ALL_STORIES, getRandomStory } from '@/data/stories';
import { Story } from '@/types/story';
import { Fonts } from '@/constants/theme';
import { useAppStore } from '@/store/app-store';

interface SimpleStoryScreenProps {
  onStorySelect?: (story: Story) => void;
  onBack?: () => void;
}

export function SimpleStoryScreen({ onStorySelect, onBack }: SimpleStoryScreenProps) {
  const insets = useSafeAreaInsets();
  const { requestReturnToMainMenu } = useAppStore();

  const handleStoryPress = (story: Story) => {
    if (story.isAvailable && onStorySelect) {
      onStorySelect(story);
    }
  };

  const handleSurpriseMe = () => {
    const randomStory = getRandomStory();
    if (randomStory && onStorySelect) {
      onStorySelect(randomStory);
    }
  };

  const handleBackToMenu = () => {
    if (onBack) {
      onBack();
    } else {
      requestReturnToMainMenu();
    }
  };

  return (
    <LinearGradient
      colors={['#FFF8F0', '#F0F8FF', '#F5F0FF']}
      style={styles.container}
    >
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        {/* Back Button Area */}
        <View style={styles.backButtonArea}>
          <Pressable style={styles.backButton} onPress={handleBackToMenu}>
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Choose a Story!</Text>
          <Text style={styles.subtitle}>Tap a book to start your adventure.</Text>
        </View>

        {/* Stories Grid */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.grid}>
            {ALL_STORIES.map((story, index) => (
              <Pressable
                key={story.id}
                style={[
                  styles.card,
                  { backgroundColor: story.isAvailable ? '#E3F2FD' : '#F5F5F5' }
                ]}
                onPress={() => handleStoryPress(story)}
                disabled={!story.isAvailable}
              >
                <View style={styles.cardContent}>
                  <Text style={styles.emoji}>
                    {story.isAvailable ? story.emoji : '📚'}
                  </Text>
                  <Text style={[
                    styles.cardTitle,
                    { color: story.isAvailable ? '#2C3E50' : '#95A5A6' }
                  ]}>
                    {story.title}
                  </Text>
                  {story.isAvailable && story.tag && (
                    <Text style={styles.tag}>{story.tag}</Text>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Surprise Me Button */}
        <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 20 }]}>
          <Pressable style={styles.surpriseButton} onPress={handleSurpriseMe}>
            <Text style={styles.surpriseButtonText}>✨ Surprise Me! ✨</Text>
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  backButtonArea: {
    height: 60,
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    fontFamily: Fonts.rounded,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2C3E50',
    fontFamily: Fonts.rounded,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    fontFamily: Fonts.rounded,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 120, // More space for the button without tab bar
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  card: {
    width: '47%',
    borderRadius: 16,
    padding: 16,
    minHeight: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: Fonts.rounded,
    marginBottom: 8,
  },
  tag: {
    fontSize: 12,
    color: '#666',
    fontFamily: Fonts.rounded,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  surpriseButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  surpriseButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    fontFamily: Fonts.rounded,
  },
});
