import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DevelopmentNoticeProps {
  visible?: boolean;
}

export function DevelopmentNotice({ visible = true }: DevelopmentNoticeProps) {
  if (!visible || process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <View style={styles.container}>
      <Ionicons name="warning" size={16} color="#FF9500" />
      <Text style={styles.text}>
        Development Mode: OAuth not configured
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEAA7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  text: {
    marginLeft: 8,
    fontSize: 14,
    color: '#856404',
    fontWeight: '500',
  },
});
