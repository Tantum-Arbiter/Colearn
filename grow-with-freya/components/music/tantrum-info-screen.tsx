import React, { useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  Dimensions 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { VISUAL_EFFECTS } from '@/components/main-menu/constants';
import { generateStarPositions } from '@/components/main-menu/utils';
import { Fonts } from '@/constants/theme';
import { MusicControl } from '@/components/ui/music-control';

interface TantrumInfoScreenProps {
  onContinue: () => void;
  onBack: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

export function TantrumInfoScreen({ onContinue, onBack }: TantrumInfoScreenProps) {
  const insets = useSafeAreaInsets();

  // Generate star positions for background
  const starPositions = useMemo(() => generateStarPositions(VISUAL_EFFECTS.STAR_COUNT), []);

  // Star rotation animation
  const starRotation = useSharedValue(0);

  useEffect(() => {
    starRotation.value = withRepeat(
      withTiming(360, {
        duration: 20000,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, []);

  const getStarAnimatedStyle = (star: any) => {
    return useAnimatedStyle(() => ({
      transform: [{ rotate: `${starRotation.value}deg` }],
    }));
  };

  return (
    <LinearGradient
      colors={['#FF6B6B', '#FF8E8E', '#FFB3B3']}
      style={styles.container}
    >
      {/* Animated stars background */}
      {starPositions.map((star) => (
        <Animated.View
          key={`star-${star.id}`}
          style={[
            getStarAnimatedStyle(star),
            {
              position: 'absolute',
              width: star.size,
              height: star.size,
              backgroundColor: 'white',
              borderRadius: star.size / 2,
              opacity: star.opacity * 0.7, // Slightly dimmed for readability
              left: star.x,
              top: star.y,
            },
          ]}
        />
      ))}

      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 50) }]}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Tantrum Calming</Text>
        <MusicControl
          size={24}
          color="#FFFFFF"
        />
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.emoji}>🌊</Text>
          
          <Text style={styles.title}>Binaural Beats for Tantrums</Text>
          
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>How It Helps</Text>
            <Text style={styles.description}>
              Our 10Hz alpha wave binaural beats help calm the nervous system during emotional overwhelm. 
              These gentle frequencies encourage relaxation and can help reduce the intensity of tantrum episodes.
            </Text>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Safe Usage Guidelines</Text>
            <View style={styles.guidelinesList}>
              <Text style={styles.guideline}>🎧 Always use stereo headphones or earbuds</Text>
              <Text style={styles.guideline}>🔊 Keep volume at a comfortable, low level</Text>
              <Text style={styles.guideline}>⏰ Use for 10-15 minutes maximum per session</Text>
              <Text style={styles.guideline}>👶 Suitable for ages 3 and up</Text>
              <Text style={styles.guideline}>👨‍⚕️ Consult your pediatrician if you have concerns</Text>
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Best Practices</Text>
            <Text style={styles.description}>
              • Create a calm environment before starting{'\n'}
              • Sit or lie down comfortably{'\n'}
              • Breathe slowly and deeply{'\n'}
              • Stay with your child during the session{'\n'}
              • Stop if any discomfort occurs
            </Text>
          </View>

          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>⚠️ Important</Text>
            <Text style={styles.warningText}>
              Binaural beats are not a substitute for professional medical advice. 
              If tantrums are frequent or severe, please consult your child's healthcare provider.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.buttonContainer}>
        <Pressable style={styles.continueButton} onPress={onContinue}>
          <Text style={styles.continueButtonText}>Continue to Music</Text>
        </Pressable>
      </View>

      {/* Bottom spacing */}
      <View style={{ height: Math.max(insets.bottom + 20, 40) }} />
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
    fontFamily: Fonts.primary,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: Fonts.primary,
  },
  volumeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  volumeButtonText: {
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  content: {
    paddingHorizontal: 20,
  },
  emoji: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 30,
    fontFamily: Fonts.primary,
  },
  infoSection: {
    marginBottom: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
    fontFamily: Fonts.primary,
  },
  description: {
    fontSize: 16,
    color: 'white',
    lineHeight: 24,
    fontFamily: Fonts.primary,
    opacity: 0.95,
  },
  guidelinesList: {
    gap: 8,
  },
  guideline: {
    fontSize: 16,
    color: 'white',
    fontFamily: Fonts.primary,
    opacity: 0.95,
  },
  warningBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 15,
    padding: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    fontFamily: Fonts.primary,
  },
  warningText: {
    fontSize: 14,
    color: 'white',
    lineHeight: 20,
    fontFamily: Fonts.primary,
    opacity: 0.9,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  continueButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: Fonts.primary,
  },
});
