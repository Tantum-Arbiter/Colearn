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
  
  // Kept alongside resizeMode so a test can assert how the caller asked for the
  // image to be fitted, which is the thing the component actually chose.
  return React.createElement(Image, {
    ...imageProps,
    contentFit,
    resizeMode,
    ref,
  });
});

MockImage.displayName = 'MockExpoImage';

MockImage.prefetch = jest.fn(() => Promise.resolve(true));
MockImage.clearMemoryCache = jest.fn(() => Promise.resolve(true));
MockImage.clearDiskCache = jest.fn(() => Promise.resolve(true));

module.exports = {
  Image: MockImage,
};

