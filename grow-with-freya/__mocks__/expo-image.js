const React = require('react');
const { View, Image } = require('react-native');

// Mock Image component that uses React Native's Image
const MockImage = React.forwardRef((props, ref) => {
  // Filter out props that Image doesn't accept
  const { contentFit, ...imageProps } = props;
  
  // Convert contentFit to resizeMode
  const resizeMode = contentFit === 'cover' ? 'cover' : 
                     contentFit === 'contain' ? 'contain' : 
                     contentFit === 'fill' ? 'stretch' : 'cover';
  
  return React.createElement(Image, {
    ...imageProps,
    resizeMode,
    ref,
  });
});

MockImage.displayName = 'MockExpoImage';

module.exports = {
  Image: MockImage,
};

