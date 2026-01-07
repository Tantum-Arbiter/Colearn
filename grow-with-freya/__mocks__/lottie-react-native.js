const React = require('react');
const { View } = require('react-native');

const LottieView = React.forwardRef((props, ref) => {
  return React.createElement(View, { ref, style: props.style });
});

LottieView.displayName = 'LottieView';

module.exports = LottieView;

