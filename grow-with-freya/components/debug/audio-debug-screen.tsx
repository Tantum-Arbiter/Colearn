import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useBackgroundMusic } from '@/hooks/use-background-music';
import { useGlobalSound } from '@/contexts/global-sound-context';
import { backgroundMusic } from '@/services/background-music';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { BackButtonText } from '@/constants/theme';

interface AudioDebugScreenProps {
  onBack: () => void;
}

export function AudioDebugScreen({ onBack }: AudioDebugScreenProps) {
  const [audioInfo, setAudioInfo] = useState<any>({});
  const [testResults, setTestResults] = useState<string[]>([]);
  const { isLoaded, isPlaying, volume } = useBackgroundMusic();
  const { isMuted } = useGlobalSound();
  const testPlayerRef = useRef<AudioPlayer | null>(null);

  const addTestResult = useCallback((result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  }, []);

  const testAudioMode = async () => {
    try {
      addTestResult('Testing audio mode configuration...');
      await setAudioModeAsync({
        allowsRecording: false,
        shouldPlayInBackground: true,
        playsInSilentMode: true,
      });
      addTestResult('[OK] Audio mode set successfully');
    } catch (error) {
      addTestResult(`[ERROR] Audio mode failed: ${error}`);
    }
  };

  const testAudioFile = async () => {
    try {
      addTestResult('Testing audio file loading...');

      // Release previous test player if exists
      if (testPlayerRef.current) {
        testPlayerRef.current.release();
      }

      const audioSource = require('../../assets/audio/background-soundtrack.wav');
      const player = createAudioPlayer(audioSource);
      player.volume = 0.1;
      testPlayerRef.current = player;
      addTestResult('[OK] Audio file loaded successfully');

      // Test play
      player.play();
      addTestResult('[OK] Audio playback started');

      // Stop after 2 seconds
      setTimeout(() => {
        if (testPlayerRef.current) {
          testPlayerRef.current.release();
          testPlayerRef.current = null;
          addTestResult('[OK] Audio stopped and released');
        }
      }, 2000);

    } catch (error) {
      addTestResult(`[ERROR] Audio file test failed: ${error}`);
    }
  };

  const testBackgroundMusic = async () => {
    try {
      addTestResult('Testing background music service...');
      if (!backgroundMusic.getIsLoaded()) {
        addTestResult('Background music not loaded, initializing...');
        await backgroundMusic.initialize();
      }

      if (backgroundMusic.getIsLoaded()) {
        addTestResult('[OK] Background music service loaded');
        await backgroundMusic.play();
        addTestResult('[OK] Background music play attempted');
      } else {
        addTestResult('[ERROR] Background music service failed to load');
      }
    } catch (error) {
      addTestResult(`[ERROR] Background music test failed: ${error}`);
    }
  };

  const getSystemInfo = useCallback(async () => {
    try {
      const info = {
        isLoaded,
        isPlaying,
        volume,
        isMuted,
        serviceLoaded: backgroundMusic.getIsLoaded(),
        servicePlaying: backgroundMusic.getIsPlaying(),
        serviceVolume: backgroundMusic.getVolume(),
      };
      setAudioInfo(info);
      addTestResult(`System info updated: ${JSON.stringify(info)}`);
    } catch (error) {
      addTestResult(`[ERROR] Failed to get system info: ${error}`);
    }
  }, [isLoaded, isPlaying, volume, isMuted, addTestResult]);

  useEffect(() => {
    getSystemInfo();
  }, [getSystemInfo, isLoaded, isPlaying, volume, isMuted]);

  return (
    <LinearGradient
      colors={['#4ECDC4', '#3B82F6', '#1E3A8A']}
      style={styles.container}
    >
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>{BackButtonText}</Text>
        </Pressable>
        <Text style={styles.title}>Audio Debug</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Status</Text>
          <Text style={styles.infoText}>Loaded: {audioInfo.isLoaded ? 'Yes' : 'No'}</Text>
          <Text style={styles.infoText}>Playing: {audioInfo.isPlaying ? 'Yes' : 'No'}</Text>
          <Text style={styles.infoText}>Volume: {audioInfo.volume}</Text>
          <Text style={styles.infoText}>Muted: {audioInfo.isMuted ? 'Yes' : 'No'}</Text>
          <Text style={styles.infoText}>Service Loaded: {audioInfo.serviceLoaded ? 'Yes' : 'No'}</Text>
          <Text style={styles.infoText}>Service Playing: {audioInfo.servicePlaying ? 'Yes' : 'No'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Actions</Text>
          <Pressable style={styles.testButton} onPress={testAudioMode}>
            <Text style={styles.buttonText}>Test Audio Mode</Text>
          </Pressable>
          <Pressable style={styles.testButton} onPress={testAudioFile}>
            <Text style={styles.buttonText}>Test Audio File</Text>
          </Pressable>
          <Pressable style={styles.testButton} onPress={testBackgroundMusic}>
            <Text style={styles.buttonText}>Test Background Music</Text>
          </Pressable>
          <Pressable style={styles.testButton} onPress={getSystemInfo}>
            <Text style={styles.buttonText}>Refresh Info</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          <ScrollView style={styles.resultsContainer}>
            {testResults.map((result, index) => (
              <Text key={index} style={styles.resultText}>{result}</Text>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 16,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
  },
  infoText: {
    color: 'white',
    fontSize: 14,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  testButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  resultsContainer: {
    maxHeight: 200,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 12,
  },
  resultText: {
    color: 'white',
    fontSize: 12,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
});
