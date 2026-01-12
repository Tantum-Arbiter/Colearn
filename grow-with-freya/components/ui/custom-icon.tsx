import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { SvgXml } from 'react-native-svg';

interface CustomIconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
  type?: 'svg' | 'png' | 'auto';
}

export function CustomIcon({ name, size = 24, color, style, type = 'auto' }: CustomIconProps) {

  const getIconPath = (iconName: string) => {
    const iconPaths: { [key: string]: any } = {

      'stories': require('@/assets/images/menu-icons/stories.svg'),
      'storybook': require('@/assets/images/menu-icons/storybook.svg'),
      'sparkle-hand': require('@/assets/images/menu-icons/sparkle-hand.svg'),
      'smiley-face': require('@/assets/images/menu-icons/smiley-face.svg'),
      'music-note': require('@/assets/images/menu-icons/music-note.svg'),
      'clock': require('@/assets/images/menu-icons/clock.svg'),
      'gear': require('@/assets/images/menu-icons/gear.svg'),
      'home': require('@/assets/images/menu-icons/home.svg'),
      'activities': require('@/assets/images/menu-icons/activities.svg'),
      'profile': require('@/assets/images/menu-icons/profile.svg'),

      // Menu icons (SVG format)
      'stories-icon': require('@/assets/images/menu-icons/stories-icon.svg'),
      'sensory-icon': require('@/assets/images/menu-icons/sensory-icon.svg'),
      'emotions-icon': require('@/assets/images/menu-icons/emotions-icon.svg'),
      'bedtime-icon': require('@/assets/images/menu-icons/bedtime-icon.svg'),
      'screentime-icon': require('@/assets/images/menu-icons/screentime-icon.svg'),

      // Characters - Only existing files
      'blue-monster-mascot': require('@/assets/images/characters/blue-monster-mascot.svg'),
    };

    return iconPaths[iconName];
  };


  const getSvgString = (iconName: string): string | null => {
    const svgStrings: { [key: string]: string } = {

      'default-star': `
        <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="${color || '#4A90E2'}"/>
        </svg>
      `,
    };

    return svgStrings[iconName] || null;
  };

  const iconPath = getIconPath(name);
  const svgString = getSvgString(name);


  if (svgString) {
    return (
      <View style={[styles.container, style]}>
        <SvgXml xml={svgString} width={size} height={size} />
      </View>
    );
  }


  if (iconPath) {
    const isImage = type === 'png' || (type === 'auto' && typeof iconPath === 'number');
    
    if (isImage) {

      return (
        <View style={[styles.container, style]}>
          <Image
            source={iconPath}
            style={[
              { width: size, height: size },
              color && { tintColor: color }
            ]}
            resizeMode="contain"
            fadeDuration={0}
          />
        </View>
      );
    } else {

      return (
        <View style={[styles.container, style]}>
          <SvgXml xml={iconPath} width={size} height={size} />
        </View>
      );
    }
  }

  // Fallback: return a placeholder
  return (
    <View style={[styles.container, styles.placeholder, { width: size, height: size }, style]}>
      <View style={[styles.placeholderInner, { backgroundColor: color || '#CCCCCC' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderInner: {
    width: '60%',
    height: '60%',
    borderRadius: 2,
  },
});
