import React from 'react';
import { View, StyleSheet, Image, Dimensions, PixelRatio } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface PngIllustrationProps {
  name: string;
  style?: any;
  maxWidth?: number;
  maxHeight?: number;
}

export function PngIllustration({ name, style, maxWidth, maxHeight }: PngIllustrationProps) {
  const getIllustrationSource = (illustrationName: string) => {
    const illustrations: { [key: string]: any } = {
      'family-reading': require('@/assets/images/illustrations/welcome-family.png'),
      'screen-time-family': require('@/assets/images/illustrations/screen-time-family.png'),
      'tina-bruno': require('@/assets/images/illustrations/tina-bruno-characters.png'),
      'voice-recording': require('@/assets/images/illustrations/voice-recording.png'),
      'research-backed': require('@/assets/images/illustrations/research-backed.png'),

      'welcome-family': require('@/assets/images/illustrations/welcome-family.png'),
      'tina-bruno-characters': require('@/assets/images/illustrations/tina-bruno-characters.png'),
    };

    return illustrations[illustrationName] || illustrations['tina-bruno'];
  };

  const getResponsiveDimensions = () => {
    const pixelRatio = PixelRatio.get();
    const isHighDPI = pixelRatio >= 2;
    const aspectRatio = 4 / 3;
    const isTablet = screenWidth >= 768;
    const isLargePhone = screenWidth >= 414;
    const isSmallPhone = screenWidth < 375;

    let baseWidth: number;

    if (isTablet) {
      baseWidth = Math.min(screenWidth * 0.6, 400);
    } else if (isLargePhone) {
      baseWidth = Math.min(screenWidth * 0.75, 320);
    } else if (isSmallPhone) {
      baseWidth = Math.min(screenWidth * 0.8, 280);
    } else {
      baseWidth = Math.min(screenWidth * 0.78, 300);
    }

    let baseHeight = baseWidth / aspectRatio;

    if (maxWidth) {
      baseWidth = Math.min(baseWidth, maxWidth);
      baseHeight = baseWidth / aspectRatio;
    }
    if (maxHeight) {
      baseHeight = Math.min(baseHeight, maxHeight);
      baseWidth = baseHeight * aspectRatio;
    }

    const minWidth = 260;
    const minHeight = minWidth / aspectRatio;

    if (baseWidth < minWidth) {
      baseWidth = minWidth;
      baseHeight = minHeight;
    }

    return {
      width: Math.round(baseWidth),
      height: Math.round(baseHeight),
      isHighDPI,
      pixelRatio,
      aspectRatio
    };
  };

  const dimensions = getResponsiveDimensions();
  const source = getIllustrationSource(name);

  return (
    <View style={[styles.container, style]} testID="png-illustration-wrapper">
      <View
        style={[styles.imageContainer, { width: dimensions.width, height: dimensions.height }]}
        testID="png-illustration-container"
      >
        <Image
          source={source}
          style={styles.image}
          resizeMode="contain"
          // Enable high-quality rendering for all devices
          fadeDuration={0}
          // Optimize for high-DPI displays
          resizeMethod="resize"
          // Ensure smooth scaling
          blurRadius={0}
          testID="png-illustration-image"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
});
