module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxRuntime: 'automatic', unstable_transformImportMeta: true }]
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
          ['babel-preset-expo', { jsxRuntime: 'automatic', unstable_transformImportMeta: true }]
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
