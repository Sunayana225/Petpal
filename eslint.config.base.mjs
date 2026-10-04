/**
 * Shared ESLint settings for every PetPal app.
 *
 * Each app keeps its own environment (Node vs browser globals, React hooks,
 * module source type) and spreads these in, so the rules that should never
 * drift are defined exactly once.
 */

/** Paths no app ever lints. */
export const sharedIgnores = [
  'dist/**',
  'coverage/**',
  'node_modules/**',
  '**/*.d.ts',
];

/** Rules every app applies to its TypeScript. */
export const sharedTsRules = {
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/no-unused-vars': [
    'error',
    { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
  ],
};
