const React = require('react');
const { View } = require('react-native');

// Mock Slider component
const MockSlider = React.forwardRef((props, ref) => {
  const { 
    value, 
    minimumValue, 
    maximumValue, 
    onValueChange, 
    onSlidingStart, 
    onSlidingComplete,
    ...viewProps 
  } = props;
  
  return React.createElement(View, {
    ...viewProps,
    ref,
    testID: props.testID || 'slider-mock',
  });
});

MockSlider.displayName = 'MockSlider';

module.exports = MockSlider;
module.exports.default = MockSlider;

