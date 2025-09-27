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
  // Map icon names to their file paths
  const getIconPath = (iconName: string) => {
    const iconPaths: { [key: string]: any } = {
      // Menu icons
      'stories': require('@/assets/images/menu-icons/stories.svg'),
      'sensory': require('@/assets/images/menu-icons/sensory.svg'),
      'emotions': require('@/assets/images/menu-icons/emotions.svg'),
      'bedtime-music': require('@/assets/images/menu-icons/bedtime-music.svg'),
      'screen-time': require('@/assets/images/menu-icons/screen-time.svg'),
      'parents': require('@/assets/images/menu-icons/parents.svg'),
      'settings': require('@/assets/images/menu-icons/settings.svg'),
      'home': require('@/assets/images/menu-icons/home.svg'),
      
      // UI elements
      'play': require('@/assets/images/ui-elements/buttons/play-button.svg'),
      'pause': require('@/assets/images/ui-elements/buttons/pause-button.svg'),
      'next': require('@/assets/images/ui-elements/buttons/next-button.svg'),
      'microphone': require('@/assets/images/ui-elements/functional/microphone.svg'),
      'volume': require('@/assets/images/ui-elements/functional/volume.svg'),
      'close': require('@/assets/images/ui-elements/functional/close.svg'),
      
      // Characters
      'blue-monster': require('@/assets/images/characters/blue-monster.svg'),
      'tina-avatar': require('@/assets/images/characters/tina-avatar.svg'),
      'bruno-avatar': require('@/assets/images/characters/bruno-avatar.svg'),
      'freya-mascot': require('@/assets/images/characters/freya-mascot.svg'),
      
      // Decorative
      'star': require('@/assets/images/ui-elements/decorative/stars.svg'),
      'heart': require('@/assets/images/ui-elements/decorative/hearts.svg'),
      'sparkle': require('@/assets/images/ui-elements/decorative/sparkles.svg'),
    };

    return iconPaths[iconName];
  };

  // For SVG strings (if you want to embed SVG code directly)
  const getSvgString = (iconName: string): string | null => {
    const svgStrings: { [key: string]: string } = {
      // Add SVG strings here if needed
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

  // If we have an SVG string, use SvgXml
  if (svgString) {
    return (
      <View style={[styles.container, style]}>
        <SvgXml xml={svgString} width={size} height={size} />
      </View>
    );
  }

  // If we have a file path, determine if it's SVG or PNG
  if (iconPath) {
    const isImage = type === 'png' || (type === 'auto' && typeof iconPath === 'number');
    
    if (isImage) {
      // Use Image component for PNG/JPG files
      return (
        <View style={[styles.container, style]}>
          <Image 
            source={iconPath} 
            style={[
              { width: size, height: size },
              color && { tintColor: color }
            ]} 
            resizeMode="contain"
          />
        </View>
      );
    } else {
      // Use SvgXml for SVG files
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
