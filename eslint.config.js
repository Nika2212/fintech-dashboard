// @ts-check
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const stylistic = require('@stylistic/eslint-plugin');

module.exports = tseslint.config(
  {
    ignores: ['wasm/**', 'dist/**', '.angular/**', 'coverage/**'],
  },
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.base],
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      // { prop: 1 }, import { Foo } from '...', const { a } = b
      '@stylistic/object-curly-spacing': ['error', 'always'],
      '@typescript-eslint/no-explicit-any': 'error',
      // Every class method, field, accessor and parameter property needs public/protected/private; constructors don't
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        { accessibility: 'explicit', overrides: { constructors: 'off' } },
      ],
      // Functions and methods declare their return type; inline callbacks like .map(x => ...) are exempt
      '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended],
    rules: {},
  },
);
