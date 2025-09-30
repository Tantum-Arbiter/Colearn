import { StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function StoriesScreen() {
  const handleBackToMenu = () => {
    // Navigate back to main menu
    if (router.canGoBack()) {
      router.back();
    } else {
      // Fallback: navigate to root
      router.replace('/');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBackToMenu}>
          <ThemedText style={styles.backButtonText}>← Back to Menu</ThemedText>
        </Pressable>
      </ThemedView>

      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Stories</ThemedText>
      </ThemedView>
      <ThemedView style={styles.content}>
        <ThemedText>Welcome to Grow with Freya!</ThemedText>
        <ThemedText>Your personalized storytelling experience will be built here.</ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 10,
  },
  backButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  titleContainer: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  content: {
    flex: 1,
    gap: 16,
  },
});
