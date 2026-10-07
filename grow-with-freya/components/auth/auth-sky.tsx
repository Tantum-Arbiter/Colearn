import React from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AUTH_GRADIENT, type AuthStar } from './auth-theme';

// RN ignores aspectRatio on Image (the intrinsic height wins and `contain`
// letterboxes the art mid-box), so the cloud boxes are sized explicitly.
// The art is 531x616 with a dense bottom edge.
const SCREEN_WIDTH = Dimensions.get('window').width;
const CLOUD_WIDTH = Math.round(SCREEN_WIDTH * 0.52);
const CLOUD_HEIGHT = Math.round(CLOUD_WIDTH * (616 / 531));

interface AuthSkyProps {
  stars: AuthStar[];
  children: React.ReactNode;
}

/**
 * The night sky shared by the login screen and the guest overlay: gradient,
 * starfield and the cloud bank along the bottom.
 */
export function AuthSky({ stars, children }: AuthSkyProps) {
  return (
    <LinearGradient colors={AUTH_GRADIENT} style={styles.gradient}>
      <View style={styles.starsContainer} pointerEvents="none" testID="auth-sky-stars">
        {stars.map((star) => (
          <View
            key={`star-${star.id}`}
            style={[
              styles.star,
              {
                left: star.left,
                top: star.top,
                width: star.size,
                height: star.size,
                borderRadius: star.size / 2,
                opacity: star.opacity,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.cloudContainer} pointerEvents="none" testID="auth-sky-clouds">
        {/* mist floor: the art's base fades out, so this grounds the banks in a
            haze that reaches the screen edge */}
        <LinearGradient
          colors={['transparent', 'rgba(139, 129, 196, 0.35)', 'rgba(168, 158, 222, 0.62)']}
          locations={[0, 0.55, 1]}
          style={styles.mistFloor}
        />
        <Image
          source={require('@/assets/images/ui-elements/night-cloud-left.webp')}
          style={styles.cloudLeft}
          resizeMode="contain"
        />
        <Image
          source={require('@/assets/images/ui-elements/night-cloud-right.webp')}
          style={styles.cloudRight}
          resizeMode="contain"
        />
      </View>

      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    // the card caps its height on a tablet; centring puts the spare space
    // above and below it rather than all at the bottom. A phone's card fills
    // the screen, so there is no spare space and this does nothing.
    justifyContent: 'center',
  },
  starsContainer: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
  },
  cloudContainer: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
  },
  mistFloor: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '24%',
  },
  // the pair frames the bottom corners; sized by width with the arts' own
  // aspect so nothing crops
  cloudLeft: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: CLOUD_WIDTH,
    height: CLOUD_HEIGHT,
  },
  cloudRight: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: CLOUD_WIDTH,
    height: CLOUD_HEIGHT,
  },
});
