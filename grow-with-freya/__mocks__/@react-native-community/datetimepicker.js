const React = require('react');
const { View } = require('react-native');

// Mock DateTimePicker component for Jest tests
const DateTimePicker = React.forwardRef((props, ref) => {
  const { testID, value, onChange, mode, display, ...otherProps } = props;

  // Mock the onChange callback when needed in tests
  const handleMockChange = () => {
    if (onChange) {
      const mockEvent = {
        type: 'set',
        nativeEvent: {
          timestamp: value ? value.getTime() : Date.now(),
        },
      };
      const mockDate = value || new Date();
      onChange(mockEvent, mockDate);
    }
  };

  return React.createElement(View, {
    ref: ref,
    testID: testID || 'date-time-picker-mock',
    accessibilityLabel: `DateTimePicker ${mode || 'date'} ${display || 'default'}`,
    ...otherProps
  });
});

DateTimePicker.displayName = 'DateTimePicker';

module.exports = DateTimePicker;
