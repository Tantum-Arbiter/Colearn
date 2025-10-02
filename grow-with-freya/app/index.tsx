import React from 'react';
import { View, Text } from 'react-native';

// This is a placeholder index route that should never be reached
// The app navigation is handled in _layout.tsx
export default function IndexScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Index Route - This should not be visible</Text>
    </View>
  );
}
