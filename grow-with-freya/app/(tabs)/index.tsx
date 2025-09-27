import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function StoriesScreen() {
  return (
    <ThemedView style={styles.container}>
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
  titleContainer: {
    paddingTop: 40,
    paddingBottom: 20,
  },
  content: {
    flex: 1,
    gap: 16,
  },
});
