const path = require('path');

/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: [require.resolve('@pickle-play/config/eslint')],
  parserOptions: {
    // Use standalone tsconfig that doesn't use workspace path extends
    project: './tsconfig.eslint.json',
    tsconfigRootDir: __dirname,
  },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        // Use standalone tsconfig for import resolution
        project: path.join(__dirname, 'tsconfig.eslint.json'),
      },
    },
  },
  // Ignore test files - they use ESM .js imports that ESLint can't resolve
  ignorePatterns: ['src/test/**', '*.test.ts'],
};
