import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ProfilesScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Profiles</ThemedText>
      </ThemedView>
      <ThemedView style={styles.content}>
        <ThemedText>Manage your children's profiles here.</ThemedText>
        <ThemedText>Create avatars, record voices, and personalize their experience.</ThemedText>
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
