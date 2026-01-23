module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxRuntime: 'automatic' }]
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
    env: {
      test: {
        presets: [
          ['babel-preset-expo', { jsxRuntime: 'automatic' }]
        ],
        plugins: [
          [
            'module-resolver',
            {
              root: ['./'],
              alias: {
                '@': './',
              },
            },
          ],
          'react-native-reanimated/plugin',
        ],
      },
    },
  };
};
