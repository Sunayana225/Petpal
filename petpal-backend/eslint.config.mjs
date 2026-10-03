import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/** Globals available in a Node.js CommonJS process. */
const nodeGlobals = {
  process: 'readonly',
  console: 'readonly',
  Buffer: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  module: 'readonly',
  require: 'readonly',
  exports: 'writable',
  globalThis: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  setImmediate: 'readonly',
  fetch: 'readonly',
  AbortController: 'readonly',
  AbortSignal: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
};

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', '**/*.d.ts'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      ecmaVersion: 2022,
      globals: nodeGlobals,
    },
    rules: {
      // These rules police TypeScript specifically; they only produce noise in
      // the plain-JS helper scripts.
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },

  {
    files: ['eslint.config.mjs'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 2022,
      globals: nodeGlobals,
    },
  },

  {
    files: ['**/*.ts'],
    rules: {
      // A few integration seams (express `any`, JSON blobs) are deliberate.
      // Warnings keep them visible without failing the build.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-empty-object-type': 'off',
      'no-console': 'off',
    },
  },
);
