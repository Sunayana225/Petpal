module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  // NOTE: `**/__tests__/**/*.ts` also matched `setup.ts`, which Jest then ran as
  // a test suite and failed with "Your test suite must contain at least one
  // test." Scope this to actual spec files only.
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts',
    '**/?(*.)+(spec|test).ts',
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  // Was misspelled `moduleNameMapping`, which Jest silently ignored.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/server.ts', // process entry point, not unit-testable as written
    '!src/scripts/**', // one-off data generation scripts
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testTimeout: 10000,
  verbose: true,
};
