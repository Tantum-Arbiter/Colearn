// Mock for @expo/vector-icons
import React from 'react';

const createIconComponent = (name) => {
  const IconComponent = ({ name: iconName, size = 24, color = '#000', testID, ...props }) => {
    return React.createElement('div', {
      ...props,
      testID: testID || `icon-${name}-${iconName}`,
      children: iconName || name,
      style: { fontSize: size, color },
      size,
      color
    });
  };

  IconComponent.displayName = `${name}Icon`;
  return IconComponent;
};

export const Ionicons = createIconComponent('Ionicons');
export const AntDesign = createIconComponent('AntDesign');
export const MaterialIcons = createIconComponent('MaterialIcons');
export const FontAwesome = createIconComponent('FontAwesome');
export const Entypo = createIconComponent('Entypo');
export const Feather = createIconComponent('Feather');
export const MaterialCommunityIcons = createIconComponent('MaterialCommunityIcons');

export default {
  Ionicons,
  AntDesign,
  MaterialIcons,
  FontAwesome,
  Entypo,
  Feather,
  MaterialCommunityIcons,
};
