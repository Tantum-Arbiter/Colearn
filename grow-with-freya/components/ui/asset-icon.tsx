import React from 'react';
import { View, StyleSheet, Image } from 'react-native';

interface AssetIconProps {
  source: any; // The require() path to your asset
  size?: number;
  color?: string;
  style?: any;
}

export function AssetIcon({ source, size = 24, color, style }: AssetIconProps) {
  return (
    <View style={[styles.container, style]}>
      <Image 
        source={source} 
        style={[
          { width: size, height: size },
          color && { tintColor: color }
        ]} 
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Usage examples:
// <AssetIcon source={require('@/assets/images/menu-icons/stories.png')} size={32} />
// <AssetIcon source={require('@/assets/images/menu-icons/stories.svg')} size={32} color="#4A90E2" />
