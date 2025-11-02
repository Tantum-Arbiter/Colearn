const React = require('react');
const { View } = require('react-native');

const BlurView = React.forwardRef((props, ref) => {
  return React.createElement(View, { ...props, ref, testID: 'blur-view' });
});

module.exports = { BlurView };
