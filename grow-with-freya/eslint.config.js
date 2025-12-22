// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.eslintrc.quality.js', 'scripts/*'],
  },
  {
    files: ['jest.setup.js', 'jest.setup-after-env.js', '**/*.test.{js,ts,tsx}', '**/__tests__/**/*.{js,ts,tsx}', '__mocks__/**/*.{js,ts,tsx}', '*.config.js'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        test: 'readonly',
        __dirname: 'readonly',
        module: 'readonly',
        require: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'react/no-children-prop': 'off',
      'react/display-name': 'off',
      'react-hooks/rules-of-hooks': 'off',
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'react/jsx-key': 'off',
      'import/no-duplicates': 'off',
      '@typescript-eslint/array-type': 'off',
    },
  },
]);
