import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

interface AuthLoadingProps {
  message?: string;
}

export function AuthLoading({ message = 'Signing you in...' }: AuthLoadingProps) {
  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={['#4ECDC4', '#44A08D']}
        style={styles.backgroundGradient}
      />
      
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#fff" />
        <ThemedText style={styles.message}>{message}</ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  message: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
  },
});
