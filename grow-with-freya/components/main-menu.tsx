import React from 'react';
import { View, StyleSheet, Dimensions, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat,
  withSequence,
  Easing 
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { ThemedText } from './themed-text';
import { IconSymbol } from './ui/icon-symbol';

const { width, height } = Dimensions.get('window');

interface MenuIconProps {
  icon: string;
  label: string;
  status: 'animated_interactive' | 'inactive';
  position: string;
  onPress: () => void;
}

interface MainMenuProps {
  onNavigate: (destination: string) => void;
}

function MenuIcon({ icon, label, status, position, onPress }: MenuIconProps) {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    if (status === 'animated_interactive') {
      // Gentle pulsing animation for active items
      scale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      );
    }
  }, [status]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` }
    ],
  }));

  const handlePress = () => {
    if (status === 'animated_interactive') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const getIconName = (iconType: string) => {
    const iconMap: { [key: string]: string } = {
      'storybook': 'book.fill',
      'sparkle_hand': 'hand.raised.fill',
      'smiley_face': 'face.smiling.fill',
      'music_note': 'music.note',
      'clock': 'clock.fill',
    };
    return iconMap[iconType] || 'star.fill';
  };

  return (
    <Animated.View style={[styles.menuIconContainer, animatedStyle]}>
      <Pressable
        style={({ pressed }) => [
          styles.menuIcon,
          status === 'inactive' && styles.menuIconInactive,
          pressed && styles.menuIconPressed,
        ]}
        onPress={handlePress}
      >
        <IconSymbol
          name={getIconName(icon)}
          size={40}
          color={status === 'animated_interactive' ? '#FFD700' : '#CCCCCC'}
        />
        <ThemedText style={[
          styles.menuIconLabel,
          status === 'inactive' && styles.menuIconLabelInactive,
        ]}>
          {label}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

export function MainMenu({ onNavigate }: MainMenuProps) {
  const starRotation = useSharedValue(0);
  const cloudFloat = useSharedValue(0);

  React.useEffect(() => {
    // Gentle star twinkling
    starRotation.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
      -1
    );

    // Gentle cloud floating
    cloudFloat.value = withRepeat(
      withSequence(
        withTiming(10, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-10, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
  }, []);

  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${starRotation.value}deg` }],
  }));

  const cloudAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: cloudFloat.value }],
  }));

  const menuItems = [
    { icon: 'storybook', label: 'Stories', status: 'animated_interactive' as const, destination: 'stories' },
    { icon: 'sparkle_hand', label: 'Sensory', status: 'inactive' as const, destination: 'sensory' },
    { icon: 'smiley_face', label: 'Emotions', status: 'inactive' as const, destination: 'emotions' },
    { icon: 'music_note', label: 'Bedtime Music', status: 'inactive' as const, destination: 'bedtime' },
    { icon: 'clock', label: 'Screen Time', status: 'inactive' as const, destination: 'screen_time' },
  ];

  return (
    <LinearGradient
      colors={['#1E3A8A', '#3B82F6', '#4ECDC4']}
      style={styles.container}
    >
      {/* Background elements */}
      <View style={styles.backgroundElements}>
        {/* Stars */}
        {[...Array(15)].map((_, i) => (
          <Animated.View
            key={`star-${i}`}
            style={[
              styles.star,
              starAnimatedStyle,
              {
                left: Math.random() * width,
                top: Math.random() * (height * 0.6),
                opacity: 0.4 + Math.random() * 0.6,
              }
            ]}
          />
        ))}

        {/* Moon */}
        <View style={styles.moon}>
          <ThemedText style={styles.moonEmoji}>🌙</ThemedText>
        </View>

        {/* Clouds */}
        <Animated.View style={[styles.cloud, cloudAnimatedStyle, { top: height * 0.15, left: width * 0.1 }]}>
          <ThemedText style={styles.cloudEmoji}>☁️</ThemedText>
        </Animated.View>
        <Animated.View style={[styles.cloud, cloudAnimatedStyle, { top: height * 0.25, right: width * 0.1 }]}>
          <ThemedText style={styles.cloudEmoji}>☁️</ThemedText>
        </Animated.View>
      </View>

      {/* Top buttons */}
      <View style={styles.topButtons}>
        <Pressable
          style={styles.parentsButton}
          onPress={() => onNavigate('parent_dashboard')}
        >
          <ThemedText style={styles.parentsButtonText}>PARENTS</ThemedText>
        </Pressable>

        <Pressable
          style={styles.settingsButton}
          onPress={() => onNavigate('settings')}
        >
          <IconSymbol name="gearshape.fill" size={24} color="#666" />
        </Pressable>
      </View>

      {/* Menu icons */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <MenuIcon
            key={item.destination}
            icon={item.icon}
            label={item.label}
            status={item.status}
            position={`position-${index}`}
            onPress={() => onNavigate(item.destination)}
          />
        ))}
      </View>

      {/* Blue monster character */}
      <View style={styles.characterContainer}>
        <View style={styles.character}>
          <ThemedText style={styles.characterEmoji}>👹</ThemedText>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundElements: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  star: {
    position: 'absolute',
    width: 3,
    height: 3,
    backgroundColor: 'white',
    borderRadius: 1.5,
  },
  moon: {
    position: 'absolute',
    top: height * 0.08,
    right: width * 0.1,
  },
  moonEmoji: {
    fontSize: 40,
  },
  cloud: {
    position: 'absolute',
  },
  cloudEmoji: {
    fontSize: 30,
    opacity: 0.8,
  },
  topButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  parentsButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#32CD32',
  },
  parentsButtonText: {
    color: '#2E8B8B',
    fontWeight: 'bold',
    fontSize: 14,
  },
  settingsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 12,
    borderRadius: 20,
  },
  menuContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 20,
  },
  menuIconContainer: {
    alignItems: 'center',
  },
  menuIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  menuIconInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  menuIconPressed: {
    transform: [{ scale: 0.95 }],
  },
  menuIconLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  menuIconLabelInactive: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  characterContainer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  character: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  characterEmoji: {
    fontSize: 60,
  },
});
