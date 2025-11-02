import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { useBackgroundMusic } from '@/hooks/use-background-music';
import { useGlobalSound } from '@/contexts/global-sound-context';
import { backgroundMusic } from '@/services/background-music';

interface AudioDebugScreenProps {
  onBack: () => void;
}

export function AudioDebugScreen({ onBack }: AudioDebugScreenProps) {
  const [audioInfo, setAudioInfo] = useState<any>({});
  const [testResults, setTestResults] = useState<string[]>([]);
  const { isLoaded, isPlaying, volume } = useBackgroundMusic();
  const { isMuted } = useGlobalSound();

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testAudioMode = async () => {
    try {
      addTestResult('Testing audio mode configuration...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: 1,
        interruptionModeAndroid: 2,
      });
      addTestResult('✅ Audio mode set successfully');
    } catch (error) {
      addTestResult(`❌ Audio mode failed: ${error}`);
    }
  };

  const testAudioFile = async () => {
    try {
      addTestResult('Testing audio file loading...');
      const audioSource = require('../../assets/audio/background-soundtrack.wav');
      const { sound } = await Audio.Sound.createAsync(
        audioSource,
        {
          shouldPlay: false,
          isLooping: false,
          volume: 0.1,
        }
      );
      addTestResult('✅ Audio file loaded successfully');
      
      // Test play
      await sound.playAsync();
      addTestResult('✅ Audio playback started');
      
      // Stop after 2 seconds
      setTimeout(async () => {
        await sound.stopAsync();
        await sound.unloadAsync();
        addTestResult('✅ Audio stopped and unloaded');
      }, 2000);
      
    } catch (error) {
      addTestResult(`❌ Audio file test failed: ${error}`);
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
        addTestResult('✅ Background music service loaded');
        await backgroundMusic.play();
        addTestResult('✅ Background music play attempted');
      } else {
        addTestResult('❌ Background music service failed to load');
      }
    } catch (error) {
      addTestResult(`❌ Background music test failed: ${error}`);
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
      addTestResult(`❌ Failed to get system info: ${error}`);
    }
  }, [isLoaded, isPlaying, volume, isMuted, backgroundMusic, addTestResult]);

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
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Audio Debug</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Status</Text>
          <Text style={styles.infoText}>Loaded: {audioInfo.isLoaded ? '✅' : '❌'}</Text>
          <Text style={styles.infoText}>Playing: {audioInfo.isPlaying ? '✅' : '❌'}</Text>
          <Text style={styles.infoText}>Volume: {audioInfo.volume}</Text>
          <Text style={styles.infoText}>Muted: {audioInfo.isMuted ? '✅' : '❌'}</Text>
          <Text style={styles.infoText}>Service Loaded: {audioInfo.serviceLoaded ? '✅' : '❌'}</Text>
          <Text style={styles.infoText}>Service Playing: {audioInfo.servicePlaying ? '✅' : '❌'}</Text>
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
