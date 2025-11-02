// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['jest.setup.js', 'jest.setup-after-env.js', '**/*.test.{js,ts,tsx}', '**/__tests__/**/*.{js,ts,tsx}'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        test: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'react/no-children-prop': 'off',
    },
  },
]);
