import React from 'react';
import { View, StyleSheet, Image } from 'react-native';

interface AssetIconProps {
  source: any;
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


